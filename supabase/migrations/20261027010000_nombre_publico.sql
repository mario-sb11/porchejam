-- Privacidad: el nombre público ya no es el nombre completo de Google ni la parte del email.
-- Se usa el nombre de jugador indicado al registrarse o, si no hay, solo el primer nombre.
-- (La app, además, sustituye este nombre por el que el jugador ya usaba como invitado.)
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
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'given_name', ''),
    nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1), '')
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

revoke all on function public.handle_new_user() from public, anon, authenticated;
