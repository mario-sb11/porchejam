-- Progreso de invitado al iniciar sesión en una cuenta que ya existe.
--
-- Antes, lo jugado como invitado solo se sumaba la primera vez que se entraba en la cuenta: si
-- alguien jugaba como invitado en otro dispositivo y luego iniciaba sesión, esas partidas se
-- perdían. Ahora se suman siempre que el navegador traiga progreso de invitado (la app solo lo
-- envía cuando ese progreso no pertenece ya a ninguna cuenta), con límites para que no sirva
-- para inflar estadísticas:
--   * como mucho una fusión cada 30 segundos por cuenta;
--   * topes por fusión (500 partidas de cada tipo, 20 000 rondas, récord máximo igual que record_match,
--     20 partidas de historial);
--   * el historial de la cuenta se recorta a las 50 partidas más recientes, igual que record_match.
-- `guest_imported_at` pasa a ser la fecha de la última fusión. La firma no cambia.
create or replace function public.import_guest_stats(
  p_high_score integer,
  p_solo_games integer,
  p_party_games integer,
  p_total_correct integer,
  p_total_rounds integer,
  p_mode_tally jsonb,
  p_matches jsonb default '[]'::jsonb
)
returns public.player_stats
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  stats public.player_stats;
  clean_tally jsonb := '{}'::jsonb;
  tally_key text;
  tally_value jsonb;
  item jsonb;
  rounds integer := least(greatest(coalesce(p_total_rounds, 0), 0), 20000);
begin
  if uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into stats from public.player_stats s where s.user_id = uid for update;
  if not found then
    raise exception 'Cuenta sin estadísticas' using errcode = 'P0002';
  end if;
  if stats.guest_imported_at is not null and stats.guest_imported_at > now() - interval '30 seconds' then
    return stats; -- fusión muy reciente: se ignora sin error
  end if;

  -- Solo claves con formato válido y valores numéricos razonables.
  if jsonb_typeof(p_mode_tally) = 'object' then
    for tally_key, tally_value in select * from jsonb_each(p_mode_tally) limit 50 loop
      if tally_key ~ '^[a-z0-9_]+(-[a-z0-9_]+){0,3}$' and jsonb_typeof(tally_value) = 'number' then
        clean_tally := clean_tally || jsonb_build_object(tally_key, least(greatest(tally_value::int, 0), 500));
      end if;
    end loop;
  end if;

  update public.player_stats s set
    high_score    = greatest(s.high_score, least(greatest(coalesce(p_high_score, 0), 0), 1000000)),
    solo_games    = s.solo_games + least(greatest(coalesce(p_solo_games, 0), 0), 500),
    party_games   = s.party_games + least(greatest(coalesce(p_party_games, 0), 0), 500),
    total_rounds  = s.total_rounds + rounds,
    total_correct = s.total_correct + least(greatest(coalesce(p_total_correct, 0), 0), rounds),
    mode_tally    = (
      select coalesce(jsonb_object_agg(k, coalesce((s.mode_tally ->> k)::int, 0) + coalesce((clean_tally ->> k)::int, 0)), '{}'::jsonb)
      from (select jsonb_object_keys(s.mode_tally) as k union select jsonb_object_keys(clean_tally)) keys
    ),
    guest_imported_at = now(),
    updated_at = now()
  where s.user_id = uid
  returning * into stats;

  -- Historial de invitado (como máximo 20 partidas), por detrás de las ya guardadas.
  if jsonb_typeof(p_matches) = 'array' then
    for item in select value from jsonb_array_elements(p_matches) limit 20 loop
      if jsonb_typeof(item) = 'object' and pg_column_size(item) < 4096 and (item ->> 'mode') in ('solo', 'party') then
        insert into public.matches (user_id, mode, mode_key, record, played_at)
        values (uid, item ->> 'mode', 'importada', item, now() - interval '1 hour');
      end if;
    end loop;

    delete from public.matches m
    where m.user_id = uid
      and m.id not in (
        select m2.id from public.matches m2 where m2.user_id = uid order by m2.played_at desc, m2.id desc limit 50
      );
  end if;

  return stats;
end;
$$;

revoke all on function public.import_guest_stats(integer, integer, integer, integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.import_guest_stats(integer, integer, integer, integer, integer, jsonb, jsonb) to authenticated;
