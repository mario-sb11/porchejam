-- Pruebas de la Arena Online. Se ejecutan con:  npm run test:db  (PostgreSQL local)
-- Cada bloque usa "assert": si algo falla, psql se detiene con el mensaje.
\set ON_ERROR_STOP 1

begin;

-- Secreto de pruebas
delete from arena_private.config;
insert into arena_private.config values (true, sha256(convert_to('secreto-de-pruebas-0123456789abcdef', 'UTF8')));

create temp table ctx (k text primary key, v text);
grant all on ctx to anon, authenticated;

set local role anon;

-- 1. Crear sala con datos limpios
do $$
declare code text;
begin
  code := public.arena_create(
    'tokenAnfitrion_aaaaaaaaaaaaaaaaaaaaaaaaaaaa', ' Mario ', 'persona:Leo',
    '{"rounds": 5, "seconds": 10, "answer": "facil", "hack": true}',
    '{"sources": [{"id": "123", "type": "playlist"}, {"id": "x", "type": "evil"}], "label": "<b>Éxitos</b>", "cover": "javascript:alert(1)"}');
  assert code ~ '^[A-HJ-NP-Z2-9]{6}$', 'código con formato';
  insert into ctx values ('code', code);
end $$;

-- 2. Ajustes o música no válidos se rechazan
do $$
begin
  begin
    perform public.arena_create('tokenOtro_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Ana', 'default', '{"rounds": 999, "seconds": 10, "answer": "facil"}', '{"sources": [{"id": "1", "type": "playlist"}]}');
    assert false, 'debería rechazar rondas raras';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.arena_create('tokenOtro_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Ana', 'default', '{"rounds": 5, "seconds": 10, "answer": "facil"}', '{"sources": []}');
    assert false, 'debería rechazar sin música';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.arena_create('corto', 'Ana', 'default', '{"rounds": 5, "seconds": 10, "answer": "facil"}', '{"sources": [{"id": "1", "type": "playlist"}]}');
    assert false, 'debería rechazar tokens cortos';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.arena_create('tokenOtro_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', '<script>', 'default', '{"rounds": 5, "seconds": 10, "answer": "facil"}', '{"sources": [{"id": "1", "type": "playlist"}]}');
    assert false, 'debería rechazar nombres con código';
  exception when sqlstate '22023' then null; end;
end $$;

-- 3. No se puede leer nada directamente
do $$
begin
  begin
    perform 1 from arena_private.rooms;
    assert false, 'anon no debe leer las tablas';
  exception when insufficient_privilege then null; end;
  begin
    perform arena_private.norm('x');
    assert false, 'anon no debe usar funciones internas';
  exception when insufficient_privilege then null; end;
end $$;

-- 4. Unirse, nombres repetidos y vistazo público
do $$
declare code text := (select v from ctx where k = 'code'); peek jsonb; st jsonb;
begin
  peek := public.arena_peek(lower(code));
  assert (peek ->> 'exists')::boolean, 'la sala existe';
  assert peek ->> 'label' = 'bÉxitos/b', 'etiqueta sin etiquetas HTML: ' || (peek ->> 'label');
  assert peek ->> 'cover' = '', 'portada no segura descartada';
  assert not (public.arena_peek('ZZZZZZ') ->> 'exists')::boolean, 'sala inexistente';

  perform public.arena_join(code, 'tokenJugadora_cccccccccccccccccccccccccccc', 'mario', '🎸');
  perform public.arena_join(code, 'tokenTercero_dddddddddddddddddddddddddddd', 'Lucía', 'default');
  st := public.arena_state(code, 'tokenAnfitrion_aaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert jsonb_array_length(st -> 'players') = 3, 'tres jugadores';
  assert exists (select 1 from jsonb_array_elements(st -> 'players') p where p ->> 'name' = 'mario 2'), 'nombre repetido renombrado';
  assert st -> 'room' ->> 'status' = 'lobby', 'en espera';
  assert st -> 'room' -> 'settings' = '{"rounds": 5, "seconds": 10, "answer": "facil"}'::jsonb, 'ajustes limpios';
  assert st -> 'room' ->> 'host' = st ->> 'me', 'el creador es anfitrión';

  begin
    perform public.arena_state(code, 'tokenIntruso_eeeeeeeeeeeeeeeeeeeeeeeeeeee');
    assert false, 'un desconocido no ve la sala';
  exception when sqlstate 'P0002' then null; end;
end $$;

-- 5. Solo el servidor (con secreto) y a petición del anfitrión puede empezar
do $$
declare code text := (select v from ctx where k = 'code'); claim jsonb;
begin
  begin
    perform public.arena_server_claim('secreto-falso-0123456789abcdef0123456789', code, 'tokenAnfitrion_aaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    assert false, 'secreto falso';
  exception when insufficient_privilege then null; end;
  begin
    perform public.arena_server_claim('secreto-de-pruebas-0123456789abcdef', code, 'tokenJugadora_cccccccccccccccccccccccccccc');
    assert false, 'solo el anfitrión';
  exception when insufficient_privilege then null; end;
  claim := public.arena_server_claim('secreto-de-pruebas-0123456789abcdef', code, 'tokenAnfitrion_aaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  assert claim -> 'sources' = '[{"id": "123", "type": "playlist"}]'::jsonb, 'fuentes limpias';

  perform public.arena_server_load('secreto-de-pruebas-0123456789abcdef', code, (
    select jsonb_agg(jsonb_build_object(
      'trackId', 1000 + n, 'title', 'Canción ' || n || ' (Remastered 2011)', 'artist', 'Artista ' || n,
      'cover', 'https://cdn-images.dzcdn.net/x.jpg', 'previewUrl', 'https://cdnt-preview.dzcdn.net/api/1/1/a.mp3',
      'options', '[{"title":"A","artist":"a"},{"title":"B","artist":"b"},{"title":"C","artist":"c"},{"title":"D","artist":"d"}]'::jsonb,
      'correct', 2))
    from generate_series(1, 5) n));
end $$;

-- 6. Durante la ronda no se filtra la solución
do $$
declare code text := (select v from ctx where k = 'code'); st jsonb;
begin
  st := public.arena_state(code, 'tokenJugadora_cccccccccccccccccccccccccccc');
  assert st -> 'room' ->> 'status' = 'playing', 'jugando';
  assert st -> 'current' ->> 'reveal' is null, 'sin revelar';
  assert st::text not like '%Canción 1%', 'el título no aparece en el estado';
  assert st::text not like '%1001%', 'el id de la canción no aparece';
  assert jsonb_array_length(st -> 'current' -> 'options') = 4, 'cuatro opciones';
end $$;

reset role;
-- Simulamos que la ronda ya ha empezado
update arena_private.rounds set starts_at = now() - interval '2 seconds', ends_at = now() + interval '8 seconds' where number = 1;
update arena_private.rooms set phase_ends_at = now() + interval '8 seconds';
set local role anon;

-- 7. Responder: acierto con puntos del servidor, un solo intento en fácil
do $$
declare code text := (select v from ctx where k = 'code'); r jsonb; st jsonb;
begin
  r := public.arena_answer(code, 'tokenJugadora_cccccccccccccccccccccccccccc', 2);
  assert (r ->> 'correct')::boolean, 'acierta';
  assert (r ->> 'points')::int between 700 and 1000, 'puntos por rapidez: ' || (r ->> 'points');
  begin
    perform public.arena_answer(code, 'tokenJugadora_cccccccccccccccccccccccccccc', 2);
    assert false, 'no se puede responder dos veces';
  exception when sqlstate 'P0001' then null; end;
  r := public.arena_answer(code, 'tokenTercero_dddddddddddddddddddddddddddd', 0);
  assert not (r ->> 'correct')::boolean, 'falla';
  -- Los demás no ven aún quién ha acertado
  st := public.arena_state(code, 'tokenTercero_dddddddddddddddddddddddddddd');
  assert (select p -> 'roundCorrect' from jsonb_array_elements(st -> 'players') p where p ->> 'name' = 'mario 2') = 'null'::jsonb,
    'el resultado ajeno se oculta hasta revelar';
  -- Responde el anfitrión: ya han respondido todos y se revela al momento
  perform public.arena_answer(code, 'tokenAnfitrion_aaaaaaaaaaaaaaaaaaaaaaaaaaaa', 1);
  st := public.arena_state(code, 'tokenTercero_dddddddddddddddddddddddddddd');
  assert st -> 'room' ->> 'phase' = 'reveal', 'revelado al responder todos';
  assert st -> 'current' -> 'reveal' ->> 'title' = 'Canción 1 (Remastered 2011)', 'se revela el título';
  assert (st -> 'current' -> 'reveal' ->> 'option')::int = 2, 'se revela la opción correcta';
  begin
    perform public.arena_answer(code, 'tokenAnfitrion_aaaaaaaaaaaaaaaaaaaaaaaaaaaa', 2);
    assert false, 'no se responde tras revelar';
  exception when sqlstate 'P0001' then null; end;
end $$;

reset role;
-- Pasa el tiempo de la revelación
update arena_private.rooms set phase_ends_at = now() - interval '1 second';
set local role anon;

-- 8. Avanza solo a la siguiente ronda al consultar el estado
do $$
declare code text := (select v from ctx where k = 'code'); st jsonb;
begin
  st := public.arena_state(code, 'tokenTercero_dddddddddddddddddddddddddddd');
  assert (st -> 'room' ->> 'round')::int = 2, 'ronda 2';
  assert st -> 'room' ->> 'phase' = 'question', 'pregunta';
  assert (st -> 'current' ->> 'startsAt')::timestamptz > now(), 'cuenta atrás antes de sonar';
  begin
    perform public.arena_answer(code, 'tokenTercero_dddddddddddddddddddddddddddd', 2);
    assert false, 'no se responde antes de que suene';
  exception when sqlstate 'P0001' then null; end;
end $$;

-- 9. Si el anfitrión se va, hereda el más antiguo; y el rematch es solo suyo
do $$
declare code text := (select v from ctx where k = 'code'); st jsonb; host_before text;
begin
  st := public.arena_state(code, 'tokenJugadora_cccccccccccccccccccccccccccc');
  host_before := st -> 'room' ->> 'host';
  perform public.arena_leave(code, 'tokenAnfitrion_aaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  st := public.arena_state(code, 'tokenJugadora_cccccccccccccccccccccccccccc');
  assert st -> 'room' ->> 'host' <> host_before, 'nuevo anfitrión';
  assert st -> 'room' ->> 'host' = st ->> 'me', 'hereda quien llegó antes';
end $$;

reset role;
-- Terminar la partida
update arena_private.rooms set current_round = 5, phase = 'reveal', phase_ends_at = now() - interval '1 second';
update arena_private.rounds set reveal = '{"title":"x","artist":"y","cover":"","option":0}' where number <= 5;
set local role anon;

do $$
declare code text := (select v from ctx where k = 'code'); st jsonb;
begin
  st := public.arena_state(code, 'tokenJugadora_cccccccccccccccccccccccccccc');
  assert st -> 'room' ->> 'status' = 'finished', 'terminada';
  assert jsonb_array_length(st -> 'history') = 5, 'historial de canciones al final';
  begin
    perform public.arena_rematch(code, 'tokenTercero_dddddddddddddddddddddddddddd');
    assert false, 'solo el anfitrión pide revancha';
  exception when insufficient_privilege then null; end;
  perform public.arena_rematch(code, 'tokenJugadora_cccccccccccccccccccccccccccc');
  st := public.arena_state(code, 'tokenJugadora_cccccccccccccccccccccccccccc');
  assert st -> 'room' ->> 'status' = 'lobby', 'vuelve a la espera';
  assert (select bool_and((p ->> 'score')::int = 0) from jsonb_array_elements(st -> 'players') p), 'puntos a cero';
end $$;

-- 10. Respuestas de texto: normalización
reset role;
do $$
begin
  assert arena_private.title_matches('despacito', 'Despacito (feat. Daddy Yankee)'), 'quita feat';
  assert arena_private.title_matches('Corazón partío', 'Corazón Partío - Remastered 2005'), 'quita sufijos y tildes';
  assert arena_private.title_matches('Bohemian Rhapsody', 'Bohemian Rhapsody (Remastered 2011)'), 'quita paréntesis';
  assert arena_private.title_matches('bohemian rhaps', 'Bohemian Rhapsody'), 'parte suficiente';
  assert not arena_private.title_matches('rhapsody', 'Bohemian Rhapsody'), 'menos de la mitad no vale';
  assert not arena_private.title_matches('a', 'A Sky Full of Stars'), 'una letra no vale';
  assert not arena_private.title_matches('love', 'I Will Always Love You'), 'una palabra suelta de un título largo no vale';
  assert not arena_private.title_matches('', 'Algo'), 'vacío no vale';
end $$;

-- 11. Límite de salas por jugador
set local role anon;
do $$
declare i int;
begin
  for i in 1..3 loop
    perform public.arena_create('tokenSpam_ffffffffffffffffffffffffffffffff', 'Spam', 'default',
      '{"rounds": 5, "seconds": 10, "answer": "medio"}', '{"sources": [{"id": "1", "type": "artist"}]}');
  end loop;
  begin
    perform public.arena_create('tokenSpam_ffffffffffffffffffffffffffffffff', 'Spam', 'default',
      '{"rounds": 5, "seconds": 10, "answer": "medio"}', '{"sources": [{"id": "1", "type": "artist"}]}');
    assert false, 'límite de creación';
  exception when sqlstate 'P0001' then null; end;
end $$;

-- 12. Modo buscador/texto: hasta 3 intentos, cada fallo resta
reset role;
do $$
declare code text;
begin
  set local role anon;
  code := public.arena_create('tokenTexto_gggggggggggggggggggggggggggggggg', 'Texto', 'default',
    '{"rounds": 5, "seconds": 10, "answer": "dificil"}', '{"sources": [{"id": "9", "type": "album"}]}');
  perform public.arena_join(code, 'tokenTexto2_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', 'Otro', 'default');
  perform public.arena_server_claim('secreto-de-pruebas-0123456789abcdef', code, 'tokenTexto_gggggggggggggggggggggggggggggggg');
  perform public.arena_server_load('secreto-de-pruebas-0123456789abcdef', code, (
    select jsonb_agg(jsonb_build_object('trackId', n, 'title', 'Corazón Partío', 'artist', 'Alejandro Sanz',
      'previewUrl', 'https://cdnt-preview.dzcdn.net/a.mp3', 'options', null, 'correct', null)) from generate_series(1, 5) n));
  insert into ctx values ('code2', code);
end $$;
reset role;
update arena_private.rounds set starts_at = now() - interval '1 second', ends_at = now() + interval '9 seconds'
  where room_id = (select id from arena_private.rooms where code = (select v from ctx where k = 'code2')) and number = 1;
set local role anon;
do $$
declare code text := (select v from ctx where k = 'code2'); r jsonb; st jsonb;
begin
  r := public.arena_answer(code, 'tokenTexto_gggggggggggggggggggggggggggggggg', null, 'Bulería');
  assert not (r ->> 'correct')::boolean and (r ->> 'attemptsLeft')::int = 2, 'primer fallo';
  r := public.arena_answer(code, 'tokenTexto_gggggggggggggggggggggggggggggggg', null, 'corazon partio');
  assert (r ->> 'correct')::boolean, 'acierta sin tildes';
  assert (r ->> 'points')::int between 700 and 800, 'resta 150 por el fallo: ' || (r ->> 'points');
  -- El otro jugador sigue pendiente: aún no se revela
  st := public.arena_state(code, 'tokenTexto2_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh');
  assert st -> 'room' ->> 'phase' = 'question', 'espera al resto';
  perform public.arena_answer(code, 'tokenTexto2_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', null, 'uno');
  perform public.arena_answer(code, 'tokenTexto2_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', null, 'dos');
  perform public.arena_answer(code, 'tokenTexto2_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', null, 'tres');
  begin
    perform public.arena_answer(code, 'tokenTexto2_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh', null, 'cuatro');
    assert false, 'máximo 3 intentos';
  exception when sqlstate 'P0001' then null; end;
  st := public.arena_state(code, 'tokenTexto2_hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh');
  assert st -> 'room' ->> 'phase' = 'reveal', 'todos terminaron: se revela';
  assert st -> 'current' ->> 'options' is null, 'sin opciones en modo texto';
end $$;

-- 13. Límite por conexión (IP de Cloudflare, guardada solo como HMAC)
reset role;
do $$ begin perform set_config('request.headers', '{"cf-connecting-ip": "203.0.113.7"}', true); end $$;
set local role anon;
do $$
declare i int;
begin
  for i in 1..10 loop
    perform public.arena_create('tokenIp' || i || '_iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii', 'Ip', 'default',
      '{"rounds": 5, "seconds": 10, "answer": "facil"}', '{"sources": [{"id": "1", "type": "artist"}]}');
  end loop;
  begin
    perform public.arena_create('tokenIpOtro_jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj', 'Ip', 'default',
      '{"rounds": 5, "seconds": 10, "answer": "facil"}', '{"sources": [{"id": "1", "type": "artist"}]}');
    assert false, 'límite por conexión';
  exception when sqlstate 'P0001' then null; end;
end $$;
reset role;
do $$
begin
  assert not exists (select 1 from arena_private.rooms where creator_ip_hash = sha256(convert_to('203.0.113.7', 'UTF8'))), 'la IP no se guarda con un hash simple';
  assert (select count(distinct creator_ip_hash) from arena_private.rooms where creator_ip_hash is not null) = 1, 'mismo HMAC para la misma IP';
end $$;

rollback;
\echo 'Arena: todas las pruebas OK'
