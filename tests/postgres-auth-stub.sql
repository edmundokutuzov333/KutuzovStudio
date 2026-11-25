-- Local PostgreSQL CI only. Real Supabase provides auth.jwt()/auth.uid().
create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.jwt(),auth.uid() to anon,authenticated;
create table auth.users(id uuid primary key,raw_app_meta_data jsonb,is_anonymous boolean not null default false,banned_until timestamptz);
