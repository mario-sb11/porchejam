-- Arena: límites contra abusos al crear salas.
--
-- * Máximo 10 salas cada 10 minutos desde la misma conexión. La IP la pone Cloudflare
--   (cabecera cf-connecting-ip, que el cliente no puede falsear) y solo se guarda su HMAC con el
--   secreto del servidor: no se puede recuperar la IP y desaparece al borrarse la sala (≤ 3 h).
-- * Las salas en las que nadie aparece durante 30 minutos se borran antes, y el tope global
--   sube a 5000 para que llenarlo no sea una forma barata de bloquear la Arena.

alter table arena_private.rooms add column if not exists creator_ip_hash bytea;
create index if not exists rooms_creator_ip_idx on arena_private.rooms (creator_ip_hash, created_at);

create or replace function arena_private.client_ip_hash()
returns bytea
language plpgsql
stable
set search_path = ''
as $$
declare
  headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
  ip text;
  key bytea;
begin
  ip := coalesce(headers ->> 'cf-connecting-ip', split_part(headers ->> 'x-forwarded-for', ',', 1));
  if ip is null or btrim(ip) = '' then
    return null;
  end if;
  select c.server_secret_hash into key from arena_private.config c;
  return extensions.hmac(convert_to(btrim(ip), 'UTF8'), coalesce(key, '\x00'::bytea), 'sha256');
end;
$$;

revoke all on function arena_private.client_ip_hash() from public, anon, authenticated;

create or replace function public.arena_create(
  p_token text, p_name text, p_avatar text, p_settings jsonb, p_source jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  h bytea := arena_private.hash_token(p_token);
  ip_hash bytea := arena_private.client_ip_hash();
  clean_settings jsonb;
  clean_sources jsonb := '[]'::jsonb;
  item jsonb;
  label text;
  cover text;
  new_code text;
  room_id uuid;
  player_id uuid;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  i integer;
begin
  -- Limpieza: salas sin actividad en 3 h o en las que nadie ha aparecido en 30 min.
  delete from arena_private.rooms r
  where r.last_activity < now() - interval '3 hours'
     or (r.created_at < now() - interval '30 minutes' and not exists (
           select 1 from arena_private.players p where p.room_id = r.id and p.last_seen > now() - interval '30 minutes'));

  if (select count(*) from arena_private.rooms r where r.creator_hash = h and r.created_at > now() - interval '1 minute') >= 3 then
    raise exception 'Has creado demasiadas salas seguidas. Espera un momento.' using errcode = 'P0001';
  end if;
  if ip_hash is not null and (
       select count(*) from arena_private.rooms r where r.creator_ip_hash = ip_hash and r.created_at > now() - interval '10 minutes'
     ) >= 10 then
    raise exception 'Demasiadas salas desde esta conexión. Espera unos minutos.' using errcode = 'P0001';
  end if;
  if (select count(*) from arena_private.rooms) >= 5000 then
    raise exception 'La Arena está llena ahora mismo. Inténtalo en unos minutos.' using errcode = 'P0001';
  end if;

  -- Ajustes: solo valores permitidos.
  if jsonb_typeof(p_settings) <> 'object'
     or (p_settings ->> 'rounds') not in ('5', '10', '15', '20')
     or (p_settings ->> 'seconds') not in ('5', '10', '15', '30')
     or (p_settings ->> 'answer') not in ('facil', 'medio', 'dificil') then
    raise exception 'Ajustes no válidos' using errcode = '22023';
  end if;
  clean_settings := jsonb_build_object(
    'rounds', (p_settings ->> 'rounds')::int,
    'seconds', (p_settings ->> 'seconds')::int,
    'answer', p_settings ->> 'answer');

  -- Música: de 1 a 10 fuentes de Deezer (playlist, artista o álbum).
  if jsonb_typeof(p_source) <> 'object' or jsonb_typeof(p_source -> 'sources') <> 'array' then
    raise exception 'Música no válida' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_source -> 'sources') limit 10 loop
    if (item ->> 'id') ~ '^\d{1,20}$' and (item ->> 'type') in ('playlist', 'artist', 'album') then
      clean_sources := clean_sources || jsonb_build_array(jsonb_build_object('id', item ->> 'id', 'type', item ->> 'type'));
    end if;
  end loop;
  if jsonb_array_length(clean_sources) = 0 then
    raise exception 'Música no válida' using errcode = '22023';
  end if;
  label := left(regexp_replace(coalesce(p_source ->> 'label', 'Mezcla'), '[<>]', '', 'g'), 80);
  cover := coalesce(p_source ->> 'cover', '');
  if char_length(cover) > 400 or cover !~ '^https://[a-z0-9.-]+\.dzcdn\.net/[^\s"<>]+$' then
    cover := '';
  end if;

  -- Código de 6 caracteres sin letras confusas (0/O, 1/I).
  loop
    bytes := extensions.gen_random_bytes(6);
    new_code := '';
    for i in 0..5 loop
      new_code := new_code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from arena_private.rooms r where r.code = new_code);
  end loop;

  insert into arena_private.rooms (code, creator_hash, creator_ip_hash, settings, source)
    values (new_code, h, ip_hash, clean_settings, jsonb_build_object('sources', clean_sources, 'label', label, 'cover', cover))
    returning id into room_id;
  insert into arena_private.players (room_id, token_hash, user_id, name, avatar)
    values (room_id, h, auth.uid(), arena_private.clean_name(p_name), arena_private.clean_avatar(p_avatar))
    returning id into player_id;
  update arena_private.rooms set host_player = player_id where id = room_id;

  return new_code;
end;
$$;
