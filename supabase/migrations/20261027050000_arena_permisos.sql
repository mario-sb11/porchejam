-- Las funciones del servidor de la Arena solo las llama Vercel con la clave publicable (rol anon).
-- Supabase concede por defecto EXECUTE a "authenticated" en las funciones nuevas: se retira para
-- que la superficie expuesta sea la mínima (aunque sin el secreto no harían nada).
revoke execute on function public.arena_server_claim(text, text, text) from authenticated;
revoke execute on function public.arena_server_load(text, text, jsonb) from authenticated;
revoke execute on function public.arena_server_abort(text, text) from authenticated;
revoke execute on function public.arena_server_track(text, text, integer) from authenticated;
