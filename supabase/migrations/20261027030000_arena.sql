-- Arena Online: salas multijugador en tiempo real (primera versión).
--
-- Principios de seguridad:
--   * Todas las tablas viven en el esquema privado `arena_private`, que la API pública no expone.
--     El navegador solo puede usar las funciones `public.arena_*`, que validan cada dato.
--   * Se puede jugar sin cuenta. Cada jugador tiene un token aleatorio (32 bytes) que solo conoce
--     su navegador; en la base de datos se guarda su hash SHA-256.
--   * Las canciones y las respuestas correctas nunca llegan al navegador antes de tiempo: las
--     elige el servidor (Vercel) y las guarda con un secreto que solo él conoce. Los móviles
--     solo reciben el audio y, en el modo fácil, las 4 opciones.
--   * El servidor de base de datos decide si una respuesta es correcta y cuántos puntos vale,
--     con su propio reloj.
--   * La partida avanza sola: cada consulta de estado comprueba si toca pasar de fase, así no
--     depende de que el anfitrión siga conectado.

create schema if not exists arena_private;
revoke all on schema arena_private from public, anon, authenticated;

-- Secreto compartido con el servidor de Vercel (solo su hash).
create table arena_private.config (
  id boolean primary key default true check (id),
  server_secret_hash bytea not null
);

create table arena_private.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  creator_hash bytea not null,
  host_player uuid,
  status text not null default 'lobby' check (status in ('lobby', 'loading', 'playing', 'finished')),
  -- {"rounds": 5..20, "seconds": 5..30, "answer": "facil"|"medio"|"dificil"}
  settings jsonb not null,
  -- {"sources": [{"id": "123", "type": "playlist"}], "label": "...", "cover": "https://..."}
  source jsonb not null,
  current_round integer not null default 0,
  phase text not null default 'question' check (phase in ('question', 'reveal')),
  phase_ends_at timestamptz,
  loading_since timestamptz,
  created_at timestamptz not null default now(),
  last_activity timestamptz not null default now()
);
create index rooms_last_activity_idx on arena_private.rooms (last_activity);

create table arena_private.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references arena_private.rooms (id) on delete cascade,
  token_hash bytea not null,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (name ~ '^[A-Za-z0-9_ÁÉÍÓÚáéíóúÑñÜü .-]{2,20}$'),
  avatar text not null default 'default' check (char_length(avatar) between 1 and 40 and avatar !~ '[<>"''`\\]'),
  score integer not null default 0,
  correct integer not null default 0,
  joined_at timestamptz not null default clock_timestamp(),
  last_seen timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, token_hash)
);
create index players_room_idx on arena_private.players (room_id);

-- Lo que ven los jugadores de cada ronda.
create table arena_private.rounds (
  room_id uuid not null references arena_private.rooms (id) on delete cascade,
  number integer not null check (number between 1 and 20),
  preview_url text not null check (preview_url ~ '^https://[a-z0-9-]+\.dzcdn\.net/'),
  options jsonb, -- modo fácil: [{"title": "...", "artist": "..."}] x4
  starts_at timestamptz,
  ends_at timestamptz,
  reveal jsonb, -- {"title", "artist", "cover", "option"} cuando termina la ronda
  primary key (room_id, number)
);

-- La solución de cada ronda: solo la leen las funciones.
create table arena_private.round_keys (
  room_id uuid not null references arena_private.rooms (id) on delete cascade,
  number integer not null,
  track_id bigint not null,
  title text not null,
  artist text not null,
  cover text not null default '',
  correct_option integer check (correct_option between 0 and 3),
  primary key (room_id, number)
);

create table arena_private.answers (
  room_id uuid not null references arena_private.rooms (id) on delete cascade,
  number integer not null,
  player_id uuid not null references arena_private.players (id) on delete cascade,
  attempts integer not null default 0,
  correct boolean not null default false,
  points integer not null default 0,
  answered_at timestamptz,
  primary key (room_id, number, player_id)
);

alter table arena_private.config enable row level security;
alter table arena_private.rooms enable row level security;
alter table arena_private.players enable row level security;
alter table arena_private.rounds enable row level security;
alter table arena_private.round_keys enable row level security;
alter table arena_private.answers enable row level security;

-- ---------------------------------------------------------------------------
-- Utilidades internas
-- ---------------------------------------------------------------------------

create or replace function arena_private.hash_token(p_token text)
returns bytea
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32,128}$' then
    raise exception 'Token no válido' using errcode = '22023';
  end if;
  return pg_catalog.sha256(convert_to(p_token, 'UTF8'));
end;
$$;

create or replace function arena_private.check_secret(p_secret text)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_secret is null or char_length(p_secret) < 32 or not exists (
    select 1 from arena_private.config c
    where c.server_secret_hash = pg_catalog.sha256(convert_to(p_secret, 'UTF8'))
  ) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
end;
$$;

-- Normaliza un título para comparar respuestas: minúsculas, sin tildes, sin "(Remastered)",
-- sin " - Live", sin "feat." y solo letras, números y espacios.
create or replace function arena_private.norm(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(
      regexp_replace(
        split_part(
          regexp_replace(
            translate(lower(coalesce(t, '')), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
            '\s*[\(\[][^\)\]]*[\)\]]', '', 'g'),
          ' - ', 1),
        '\s(feat|ft)\.?\s.*$', ''),
      '[^a-z0-9 ]', '', 'g'),
    '\s+', ' ', 'g'));
$$;

create or replace function arena_private.title_matches(p_guess text, p_title text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with v as (select arena_private.norm(p_guess) g, arena_private.norm(p_title) t)
  select g <> '' and (g = t or (char_length(g) >= 3 and char_length(g) * 2 >= char_length(t) and position(g in t) > 0))
  from v;
$$;

create or replace function arena_private.find_player(p_code text, p_token text)
returns arena_private.players
language plpgsql
set search_path = ''
as $$
declare
  me arena_private.players;
begin
  select p.* into me
  from arena_private.players p
  join arena_private.rooms r on r.id = p.room_id
  where r.code = upper(btrim(p_code))
    and p.token_hash = arena_private.hash_token(p_token)
    and p.left_at is null;
  if not found then
    raise exception 'No estás en esta sala' using errcode = 'P0002';
  end if;
  return me;
end;
$$;

-- Activos: han consultado el estado en los últimos 20 s.
create or replace function arena_private.is_active(p arena_private.players)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p.left_at is null and p.last_seen > now() - interval '20 seconds';
$$;

-- Hace avanzar la partida si ha vencido la fase actual. Idempotente.
create or replace function arena_private.advance(p_room uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  room arena_private.rooms;
  rnd arena_private.rounds;
  total integer;
  seconds integer;
  pending integer;
  answer_mode text;
begin
  select * into room from arena_private.rooms where id = p_room for update;
  if not found or room.status <> 'playing' then
    return;
  end if;

  total := (room.settings ->> 'rounds')::int;
  seconds := (room.settings ->> 'seconds')::int;
  answer_mode := room.settings ->> 'answer';
  select * into rnd from arena_private.rounds where room_id = p_room and number = room.current_round;

  if room.phase = 'question' then
    -- ¿Quedan jugadores activos sin respuesta definitiva?
    select count(*) into pending
    from arena_private.players p
    where p.room_id = p_room and arena_private.is_active(p)
      and not exists (
        select 1 from arena_private.answers a
        where a.room_id = p_room and a.number = room.current_round and a.player_id = p.id
          and (a.correct or answer_mode = 'facil' or a.attempts >= 3)
      );

    if now() >= rnd.ends_at or (pending = 0 and now() >= rnd.starts_at) then
      update arena_private.rounds r set reveal = jsonb_build_object(
          'title', k.title, 'artist', k.artist, 'cover', k.cover, 'option', k.correct_option)
        from arena_private.round_keys k
        where r.room_id = p_room and r.number = room.current_round
          and k.room_id = r.room_id and k.number = r.number;
      update arena_private.rooms set phase = 'reveal', phase_ends_at = now() + interval '6 seconds', last_activity = now()
        where id = p_room;
    end if;
  elsif room.phase = 'reveal' and now() >= room.phase_ends_at then
    if room.current_round >= total then
      update arena_private.rooms set status = 'finished', phase_ends_at = null, last_activity = now() where id = p_room;
    else
      update arena_private.rounds
        set starts_at = now() + interval '3 seconds',
            ends_at = now() + interval '3 seconds' + make_interval(secs => seconds)
        where room_id = p_room and number = room.current_round + 1
        returning * into rnd;
      update arena_private.rooms
        set current_round = room.current_round + 1, phase = 'question', phase_ends_at = rnd.ends_at, last_activity = now()
        where id = p_room;
    end if;
  end if;
end;
$$;

-- Si el anfitrión se ha ido, pasa a serlo el jugador activo que lleve más tiempo.
create or replace function arena_private.ensure_host(p_room uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  room arena_private.rooms;
  host arena_private.players;
  heir uuid;
begin
  select * into room from arena_private.rooms where id = p_room;
  select * into host from arena_private.players where id = room.host_player;
  if host.id is not null and arena_private.is_active(host) then
    return;
  end if;
  select p.id into heir from arena_private.players p
    where p.room_id = p_room and arena_private.is_active(p)
    order by p.joined_at limit 1;
  if heir is not null then
    update arena_private.rooms set host_player = heir where id = p_room;
  end if;
end;
$$;

create or replace function arena_private.clean_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  n text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if n !~ '^[A-Za-z0-9_ÁÉÍÓÚáéíóúÑñÜü .-]{2,20}$' then
    raise exception 'Nombre no válido (2-20 letras, números, espacios, . _ -)' using errcode = '22023';
  end if;
  return n;
end;
$$;

create or replace function arena_private.clean_avatar(p_avatar text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_avatar is null or char_length(p_avatar) not between 1 and 40 or p_avatar ~ '[<>"''`\\]' then 'default'
    else p_avatar
  end;
$$;

-- Nombre único dentro de la sala: "Mario", "Mario 2"...
create or replace function arena_private.unique_name(p_room uuid, p_name text, p_except uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  candidate text := p_name;
  n integer := 1;
begin
  while exists (
    select 1 from arena_private.players p
    where p.room_id = p_room and p.left_at is null and lower(p.name) = lower(candidate)
      and p.id is distinct from p_except
  ) loop
    n := n + 1;
    candidate := left(p_name, 17) || ' ' || n;
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- Funciones para los jugadores (navegador)
-- ---------------------------------------------------------------------------

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
  -- Limpieza de salas abandonadas (más de 3 h sin actividad).
  delete from arena_private.rooms where last_activity < now() - interval '3 hours';

  if (select count(*) from arena_private.rooms r where r.creator_hash = h and r.created_at > now() - interval '1 minute') >= 3 then
    raise exception 'Has creado demasiadas salas seguidas. Espera un momento.' using errcode = 'P0001';
  end if;
  if (select count(*) from arena_private.rooms) >= 2000 then
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

  insert into arena_private.rooms (code, creator_hash, settings, source)
    values (new_code, h, clean_settings, jsonb_build_object('sources', clean_sources, 'label', label, 'cover', cover))
    returning id into room_id;
  insert into arena_private.players (room_id, token_hash, user_id, name, avatar)
    values (room_id, h, auth.uid(), arena_private.clean_name(p_name), arena_private.clean_avatar(p_avatar))
    returning id into player_id;
  update arena_private.rooms set host_player = player_id where id = room_id;

  return new_code;
end;
$$;

-- Información pública mínima para la pantalla de "unirse".
create or replace function public.arena_peek(p_code text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  room arena_private.rooms;
begin
  if p_code is null or upper(btrim(p_code)) !~ '^[A-HJ-NP-Z2-9]{6}$' then
    return jsonb_build_object('exists', false);
  end if;
  select * into room from arena_private.rooms r where r.code = upper(btrim(p_code));
  if not found then
    return jsonb_build_object('exists', false);
  end if;
  return jsonb_build_object(
    'exists', true,
    'status', room.status,
    'label', room.source ->> 'label',
    'cover', room.source ->> 'cover',
    'host', (select p.name from arena_private.players p where p.id = room.host_player),
    'players', (select count(*) from arena_private.players p where p.room_id = room.id and arena_private.is_active(p)),
    'full', (select count(*) from arena_private.players p where p.room_id = room.id and arena_private.is_active(p)) >= 12
  );
end;
$$;

create or replace function public.arena_join(p_code text, p_token text, p_name text, p_avatar text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  h bytea := arena_private.hash_token(p_token);
  room arena_private.rooms;
  me arena_private.players;
  clean text := arena_private.clean_name(p_name);
begin
  select * into room from arena_private.rooms r where r.code = upper(btrim(p_code)) for update;
  if not found then
    raise exception 'Esa sala no existe o ya ha caducado' using errcode = 'P0002';
  end if;

  select * into me from arena_private.players p where p.room_id = room.id and p.token_hash = h;
  if found then
    -- Vuelve a entrar (recarga, cambio de nombre o tras haber salido).
    update arena_private.players set
      name = arena_private.unique_name(room.id, clean, me.id),
      avatar = arena_private.clean_avatar(p_avatar),
      left_at = null, last_seen = now()
    where id = me.id;
  else
    if room.status = 'finished' then
      raise exception 'Esta partida ya ha terminado' using errcode = 'P0001';
    end if;
    if (select count(*) from arena_private.players p where p.room_id = room.id and arena_private.is_active(p)) >= 12 then
      raise exception 'La sala está llena (máximo 12 jugadores)' using errcode = 'P0001';
    end if;
    insert into arena_private.players (room_id, token_hash, user_id, name, avatar)
      values (room.id, h, auth.uid(), arena_private.unique_name(room.id, clean, null), arena_private.clean_avatar(p_avatar));
  end if;

  update arena_private.rooms set last_activity = now() where id = room.id;
  return jsonb_build_object('code', room.code);
end;
$$;

create or replace function public.arena_state(p_code text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me arena_private.players := arena_private.find_player(p_code, p_token);
  room arena_private.rooms;
  rnd arena_private.rounds;
  mine arena_private.answers;
begin
  update arena_private.players set last_seen = now() where id = me.id;

  select * into room from arena_private.rooms where id = me.room_id;
  -- Avanzar solo si toca (evita bloquear la fila en cada consulta).
  if room.status = 'playing' and room.phase_ends_at is not null and now() >= room.phase_ends_at then
    perform arena_private.advance(room.id);
  end if;
  perform arena_private.ensure_host(room.id);
  select * into room from arena_private.rooms where id = me.room_id;

  select * into rnd from arena_private.rounds r where r.room_id = room.id and r.number = room.current_round;
  select * into mine from arena_private.answers a
    where a.room_id = room.id and a.number = room.current_round and a.player_id = me.id;

  return jsonb_build_object(
    'now', now(),
    'me', me.id,
    'room', jsonb_build_object(
      'code', room.code,
      'status', room.status,
      'host', room.host_player,
      'settings', room.settings,
      'label', room.source ->> 'label',
      'cover', room.source ->> 'cover',
      'round', room.current_round,
      'phase', room.phase,
      'phaseEndsAt', room.phase_ends_at
    ),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'avatar', p.avatar,
          'score', p.score,
          'correct', p.correct,
          'online', arena_private.is_active(p),
          'answered', a.player_id is not null and (a.correct or room.settings ->> 'answer' = 'facil' or a.attempts >= 3),
          -- El resultado de los demás solo se ve al revelar la ronda.
          'roundCorrect', case when room.phase = 'reveal' or p.id = me.id then a.correct end,
          'roundPoints', case when room.phase = 'reveal' or p.id = me.id then coalesce(a.points, 0) end
        ) order by p.score desc, p.joined_at)
      from arena_private.players p
      left join arena_private.answers a
        on a.room_id = room.id and a.number = room.current_round and a.player_id = p.id
      where p.room_id = room.id and p.left_at is null
        and (room.status <> 'lobby' or p.last_seen > now() - interval '60 seconds')
    ), '[]'::jsonb),
    'current', case when rnd.room_id is null or room.status <> 'playing' then null else jsonb_build_object(
      'number', rnd.number,
      'previewUrl', rnd.preview_url,
      'options', rnd.options,
      'startsAt', rnd.starts_at,
      'endsAt', rnd.ends_at,
      'reveal', case when room.phase = 'reveal' then rnd.reveal end
    ) end,
    'mine', case when mine.player_id is null then null else jsonb_build_object(
      'attempts', mine.attempts, 'correct', mine.correct, 'points', mine.points
    ) end,
    'history', case when room.status = 'finished' then (
      select coalesce(jsonb_agg(r.reveal order by r.number), '[]'::jsonb)
      from arena_private.rounds r where r.room_id = room.id and r.reveal is not null
    ) end
  );
end;
$$;

create or replace function public.arena_answer(p_code text, p_token text, p_option integer default null, p_text text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me arena_private.players := arena_private.find_player(p_code, p_token);
  room arena_private.rooms;
  rnd arena_private.rounds;
  k arena_private.round_keys;
  prev arena_private.answers;
  answer_mode text;
  is_correct boolean;
  wrong integer;
  remaining numeric;
  total numeric;
  earned integer := 0;
begin
  select * into room from arena_private.rooms where id = me.room_id;
  if room.status <> 'playing' or room.phase <> 'question' then
    raise exception 'La ronda ya ha terminado' using errcode = 'P0001';
  end if;
  select * into rnd from arena_private.rounds where room_id = room.id and number = room.current_round;
  -- Margen de 1 s por la latencia de la red.
  if now() < rnd.starts_at - interval '300 milliseconds' or now() > rnd.ends_at + interval '1 second' then
    raise exception 'Fuera de tiempo' using errcode = 'P0001';
  end if;

  answer_mode := room.settings ->> 'answer';
  select * into prev from arena_private.answers a
    where a.room_id = room.id and a.number = rnd.number and a.player_id = me.id for update;
  if found and (prev.correct or answer_mode = 'facil' or prev.attempts >= 3) then
    raise exception 'Ya has respondido' using errcode = 'P0001';
  end if;

  select * into k from arena_private.round_keys where room_id = room.id and number = rnd.number;
  if answer_mode = 'facil' then
    if p_option is null or p_option not between 0 and 3 then
      raise exception 'Respuesta no válida' using errcode = '22023';
    end if;
    is_correct := p_option = k.correct_option;
  else
    if p_text is null or char_length(p_text) > 200 then
      raise exception 'Respuesta no válida' using errcode = '22023';
    end if;
    is_correct := arena_private.title_matches(p_text, k.title);
  end if;

  wrong := coalesce(prev.attempts, 0) - case when coalesce(prev.correct, false) then 1 else 0 end;
  if is_correct then
    total := (room.settings ->> 'seconds')::numeric;
    remaining := greatest(0, least(total, extract(epoch from (rnd.ends_at - now()))));
    earned := greatest(50, 100 + round(900 * remaining / total)::int - 150 * wrong);
  end if;

  insert into arena_private.answers (room_id, number, player_id, attempts, correct, points, answered_at)
    values (room.id, rnd.number, me.id, 1, is_correct, earned, now())
  on conflict (room_id, number, player_id) do update
    set attempts = arena_private.answers.attempts + 1,
        correct = excluded.correct,
        points = excluded.points,
        answered_at = excluded.answered_at;

  if is_correct then
    update arena_private.players set score = score + earned, correct = correct + 1 where id = me.id;
  end if;
  update arena_private.rooms set last_activity = now() where id = room.id;

  -- Si ya han respondido todos, se revela sin esperar al reloj.
  perform arena_private.advance(room.id);

  return jsonb_build_object(
    'correct', is_correct,
    'points', earned,
    'attemptsLeft', case when answer_mode = 'facil' or is_correct then 0 else 3 - coalesce(prev.attempts, 0) - 1 end
  );
end;
$$;

create or replace function public.arena_leave(p_code text, p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me arena_private.players := arena_private.find_player(p_code, p_token);
begin
  update arena_private.players set left_at = now() where id = me.id;
  update arena_private.rooms set last_activity = now() where id = me.room_id;
  perform arena_private.ensure_host(me.room_id);
end;
$$;

-- Revancha: el anfitrión vuelve a la sala de espera con los mismos jugadores.
create or replace function public.arena_rematch(p_code text, p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me arena_private.players := arena_private.find_player(p_code, p_token);
  room arena_private.rooms;
begin
  select * into room from arena_private.rooms where id = me.room_id for update;
  if room.host_player <> me.id then
    raise exception 'Solo el anfitrión puede pedir la revancha' using errcode = '42501';
  end if;
  if room.status <> 'finished' then
    return;
  end if;
  delete from arena_private.rounds where room_id = room.id;
  delete from arena_private.round_keys where room_id = room.id;
  delete from arena_private.answers where room_id = room.id;
  update arena_private.players set score = 0, correct = 0 where room_id = room.id;
  update arena_private.rooms
    set status = 'lobby', current_round = 0, phase = 'question', phase_ends_at = null, last_activity = now()
    where id = room.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Funciones del servidor (Vercel). Exigen el secreto del servidor.
-- ---------------------------------------------------------------------------

-- El anfitrión pide empezar: se bloquea la sala y se devuelve qué música cargar.
create or replace function public.arena_server_claim(p_secret text, p_code text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me arena_private.players;
  room arena_private.rooms;
begin
  perform arena_private.check_secret(p_secret);
  me := arena_private.find_player(p_code, p_token);
  select * into room from arena_private.rooms where id = me.room_id for update;
  if room.host_player <> me.id then
    raise exception 'Solo el anfitrión puede empezar la partida' using errcode = '42501';
  end if;
  if room.status = 'loading' and room.loading_since > now() - interval '30 seconds' then
    raise exception 'La partida ya se está preparando' using errcode = 'P0001';
  end if;
  if room.status not in ('lobby', 'loading') then
    raise exception 'La partida ya ha empezado' using errcode = 'P0001';
  end if;
  update arena_private.rooms set status = 'loading', loading_since = now(), last_activity = now() where id = room.id;
  return jsonb_build_object('settings', room.settings, 'sources', room.source -> 'sources');
end;
$$;

-- Carga las rondas elegidas por el servidor y arranca la partida.
-- p_rounds: [{"trackId", "title", "artist", "cover", "previewUrl", "options": [{"title","artist"}]x4|null, "correct": 0..3|null}]
create or replace function public.arena_server_load(p_secret text, p_code text, p_rounds jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  room arena_private.rooms;
  item jsonb;
  n integer := 0;
  seconds integer;
begin
  perform arena_private.check_secret(p_secret);
  select * into room from arena_private.rooms where code = upper(btrim(p_code)) for update;
  if not found or room.status <> 'loading' then
    raise exception 'La sala no está preparándose' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_rounds) <> 'array' or jsonb_array_length(p_rounds) <> (room.settings ->> 'rounds')::int then
    raise exception 'Rondas no válidas' using errcode = '22023';
  end if;

  delete from arena_private.rounds where room_id = room.id;
  delete from arena_private.round_keys where room_id = room.id;
  delete from arena_private.answers where room_id = room.id;

  for item in select value from jsonb_array_elements(p_rounds) loop
    n := n + 1;
    insert into arena_private.rounds (room_id, number, preview_url, options)
      values (room.id, n, item ->> 'previewUrl', case when room.settings ->> 'answer' = 'facil' then item -> 'options' end);
    insert into arena_private.round_keys (room_id, number, track_id, title, artist, cover, correct_option)
      values (room.id, n, (item ->> 'trackId')::bigint, left(item ->> 'title', 200), left(item ->> 'artist', 200),
              left(coalesce(item ->> 'cover', ''), 300), (item ->> 'correct')::int);
  end loop;

  seconds := (room.settings ->> 'seconds')::int;
  update arena_private.rounds
    set starts_at = now() + interval '4 seconds', ends_at = now() + interval '4 seconds' + make_interval(secs => seconds)
    where room_id = room.id and number = 1;
  update arena_private.players set score = 0, correct = 0 where room_id = room.id;
  update arena_private.rooms
    set status = 'playing', current_round = 1, phase = 'question',
        phase_ends_at = now() + interval '4 seconds' + make_interval(secs => seconds),
        loading_since = null, last_activity = now()
    where id = room.id;
end;
$$;

-- Si el servidor no consigue preparar la partida, la sala vuelve a la espera.
create or replace function public.arena_server_abort(p_secret text, p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform arena_private.check_secret(p_secret);
  update arena_private.rooms set status = 'lobby', loading_since = null
    where code = upper(btrim(p_code)) and status = 'loading';
end;
$$;

-- Canción de la ronda en juego, para renovar su audio si ha caducado.
create or replace function public.arena_server_track(p_secret text, p_code text, p_round integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  room arena_private.rooms;
  track bigint;
begin
  perform arena_private.check_secret(p_secret);
  select * into room from arena_private.rooms where code = upper(btrim(p_code));
  if not found or room.status <> 'playing' or room.current_round <> p_round or room.phase <> 'question' then
    return null;
  end if;
  select k.track_id into track from arena_private.round_keys k where k.room_id = room.id and k.number = p_round;
  return track;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos: nada directo sobre las tablas; solo estas funciones.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema arena_private from public, anon, authenticated;
revoke all on all functions in schema arena_private from public, anon, authenticated;

revoke all on function public.arena_create(text, text, text, jsonb, jsonb) from public;
revoke all on function public.arena_peek(text) from public;
revoke all on function public.arena_join(text, text, text, text) from public;
revoke all on function public.arena_state(text, text) from public;
revoke all on function public.arena_answer(text, text, integer, text) from public;
revoke all on function public.arena_leave(text, text) from public;
revoke all on function public.arena_rematch(text, text) from public;
revoke all on function public.arena_server_claim(text, text, text) from public;
revoke all on function public.arena_server_load(text, text, jsonb) from public;
revoke all on function public.arena_server_abort(text, text) from public;
revoke all on function public.arena_server_track(text, text, integer) from public;

grant execute on function public.arena_create(text, text, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.arena_peek(text) to anon, authenticated;
grant execute on function public.arena_join(text, text, text, text) to anon, authenticated;
grant execute on function public.arena_state(text, text) to anon, authenticated;
grant execute on function public.arena_answer(text, text, integer, text) to anon, authenticated;
grant execute on function public.arena_leave(text, text) to anon, authenticated;
grant execute on function public.arena_rematch(text, text) to anon, authenticated;
-- Las del servidor también se llaman con la clave publicable, pero sin el secreto no hacen nada.
grant execute on function public.arena_server_claim(text, text, text) to anon;
grant execute on function public.arena_server_load(text, text, jsonb) to anon;
grant execute on function public.arena_server_abort(text, text) to anon;
grant execute on function public.arena_server_track(text, text, integer) to anon;
