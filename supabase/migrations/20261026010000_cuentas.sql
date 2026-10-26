-- =============================================================================
-- Fase 2: cuentas de usuario y estadísticas en la nube
--
-- Principios de seguridad:
--  * RLS activado en todas las tablas: cada jugador solo lee sus datos privados.
--  * El cliente NUNCA escribe directamente en estadísticas ni historial: lo hace a
--    través de funciones (RPC) que validan los datos y limitan la frecuencia.
--  * Las funciones SECURITY DEFINER fijan search_path vacío y usan nombres completos.
-- =============================================================================

-- Perfil público de cada cuenta (nombre y avatar visibles para otros jugadores).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar text not null default 'default',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_ÁÉÍÓÚáéíóúÑñÜü .-]{2,20}$'),
  constraint profiles_avatar_format check (char_length(avatar) between 1 and 40)
);
create unique index profiles_username_unique on public.profiles (lower(username));

-- Estadísticas acumuladas (privadas).
create table public.player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  high_score integer not null default 0 check (high_score between 0 and 10000000),
  solo_games integer not null default 0 check (solo_games >= 0),
  party_games integer not null default 0 check (party_games >= 0),
  total_correct integer not null default 0 check (total_correct >= 0),
  total_rounds integer not null default 0 check (total_rounds >= 0),
  mode_tally jsonb not null default '{}'::jsonb check (jsonb_typeof(mode_tally) = 'object'),
  guest_imported_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Historial de partidas (privado).
create table public.matches (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('solo', 'party')),
  mode_key text not null check (mode_key ~ '^[a-z0-9_]+(-[a-z0-9_]+){0,3}$'),
  score integer not null default 0 check (score between 0 and 1000000),
  correct integer not null default 0 check (correct >= 0),
  rounds integer not null default 0 check (rounds between 0 and 500),
  record jsonb not null default '{}'::jsonb check (jsonb_typeof(record) = 'object' and pg_column_size(record) < 4096),
  played_at timestamptz not null default now(),
  constraint matches_correct_le_rounds check (correct <= rounds)
);
create index matches_user_played_idx on public.matches (user_id, played_at desc);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.matches enable row level security;

create policy "Perfiles visibles para todos"
  on public.profiles for select to anon, authenticated using (true);

create policy "Cada uno edita su perfil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Cada uno ve sus estadísticas"
  on public.player_stats for select to authenticated using ((select auth.uid()) = user_id);

create policy "Cada uno ve su historial"
  on public.matches for select to authenticated using ((select auth.uid()) = user_id);

-- Solo se pueden modificar nombre y avatar del propio perfil; nada más se escribe desde el cliente.
revoke all on public.profiles, public.player_stats, public.matches from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, avatar) on public.profiles to authenticated;
grant select on public.player_stats, public.matches to authenticated;

-- -----------------------------------------------------------------------------
-- Alta automática de perfil al registrarse
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_name text;
  candidate text;
  attempt integer := 0;
begin
  base_name := coalesce(
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );
  base_name := left(btrim(regexp_replace(coalesce(base_name, ''), '[^A-Za-z0-9_ÁÉÍÓÚáéíóúÑñÜü .-]', '', 'g')), 15);
  if char_length(base_name) < 2 then
    base_name := 'Jugador';
  end if;

  candidate := base_name;
  while exists (select 1 from public.profiles p where lower(p.username) = lower(candidate)) loop
    attempt := attempt + 1;
    candidate := left(base_name, 15) || (floor(random() * 9000) + 1000)::int::text;
    exit when attempt > 20;
  end loop;

  insert into public.profiles (id, username) values (new.id, candidate);
  insert into public.player_stats (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- RPC: registrar una partida
-- -----------------------------------------------------------------------------
create or replace function public.record_match(
  p_mode text,
  p_mode_key text,
  p_score integer,
  p_correct integer,
  p_rounds integer,
  p_record jsonb default '{}'::jsonb
)
returns public.player_stats
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  stats public.player_stats;
begin
  if uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  -- Una partida real dura bastante más de 5 segundos: frena envíos masivos.
  if exists (
    select 1 from public.matches m
    where m.user_id = uid and m.played_at > now() - interval '5 seconds'
  ) then
    raise exception 'Demasiadas partidas seguidas' using errcode = 'P0001';
  end if;

  insert into public.matches (user_id, mode, mode_key, score, correct, rounds, record)
  values (uid, p_mode, p_mode_key, least(greatest(p_score, 0), 1000000), least(greatest(p_correct, 0), least(greatest(p_rounds, 0), 500)), least(greatest(p_rounds, 0), 500), coalesce(p_record, '{}'::jsonb));

  update public.player_stats s set
    high_score    = case when p_mode = 'solo' then greatest(s.high_score, least(greatest(p_score, 0), 1000000)) else s.high_score end,
    solo_games    = s.solo_games + (p_mode = 'solo')::int,
    party_games   = s.party_games + (p_mode = 'party')::int,
    total_correct = s.total_correct + case when p_mode = 'solo' then least(greatest(p_correct, 0), least(greatest(p_rounds, 0), 500)) else 0 end,
    total_rounds  = s.total_rounds + case when p_mode = 'solo' then least(greatest(p_rounds, 0), 500) else 0 end,
    mode_tally    = jsonb_set(s.mode_tally, array[p_mode_key], to_jsonb(coalesce((s.mode_tally ->> p_mode_key)::int, 0) + 1)),
    updated_at    = now()
  where s.user_id = uid
  returning * into stats;

  -- Solo se conservan las 50 partidas más recientes por jugador.
  delete from public.matches m
  where m.user_id = uid
    and m.id not in (select m2.id from public.matches m2 where m2.user_id = uid order by m2.played_at desc, m2.id desc limit 50);

  return stats;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: importar una única vez el progreso que el jugador tenía como invitado
-- -----------------------------------------------------------------------------
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
begin
  if uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into stats from public.player_stats s where s.user_id = uid for update;
  if stats.guest_imported_at is not null then
    return stats; -- ya importado: no se suma dos veces
  end if;

  -- Solo claves con formato válido y valores numéricos razonables.
  if jsonb_typeof(p_mode_tally) = 'object' then
    for tally_key, tally_value in select * from jsonb_each(p_mode_tally) limit 50 loop
      if tally_key ~ '^[a-z0-9_]+(-[a-z0-9_]+){0,3}$' and jsonb_typeof(tally_value) = 'number' then
        clean_tally := clean_tally || jsonb_build_object(tally_key, least(greatest(tally_value::int, 0), 100000));
      end if;
    end loop;
  end if;

  update public.player_stats s set
    high_score    = greatest(s.high_score, least(greatest(coalesce(p_high_score, 0), 0), 10000000)),
    solo_games    = s.solo_games + least(greatest(coalesce(p_solo_games, 0), 0), 100000),
    party_games   = s.party_games + least(greatest(coalesce(p_party_games, 0), 0), 100000),
    total_rounds  = s.total_rounds + least(greatest(coalesce(p_total_rounds, 0), 0), 10000000),
    total_correct = s.total_correct + least(greatest(coalesce(p_total_correct, 0), 0), least(greatest(coalesce(p_total_rounds, 0), 0), 10000000)),
    mode_tally    = (
      select coalesce(jsonb_object_agg(k, coalesce((s.mode_tally ->> k)::int, 0) + coalesce((clean_tally ->> k)::int, 0)), '{}'::jsonb)
      from (select jsonb_object_keys(s.mode_tally) as k union select jsonb_object_keys(clean_tally)) keys
    ),
    guest_imported_at = now(),
    updated_at = now()
  where s.user_id = uid
  returning * into stats;

  -- Historial de invitado (como máximo 20 partidas).
  if jsonb_typeof(p_matches) = 'array' then
    for item in select value from jsonb_array_elements(p_matches) limit 20 loop
      if jsonb_typeof(item) = 'object' and pg_column_size(item) < 4096 and (item ->> 'mode') in ('solo', 'party') then
        insert into public.matches (user_id, mode, mode_key, record, played_at)
        values (uid, item ->> 'mode', 'importada', item, now() - interval '1 hour');
      end if;
    end loop;
  end if;

  return stats;
end;
$$;

revoke all on function public.record_match(text, text, integer, integer, integer, jsonb) from public, anon;
revoke all on function public.import_guest_stats(integer, integer, integer, integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.record_match(text, text, integer, integer, integer, jsonb) to authenticated;
grant execute on function public.import_guest_stats(integer, integer, integer, integer, integer, jsonb, jsonb) to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
