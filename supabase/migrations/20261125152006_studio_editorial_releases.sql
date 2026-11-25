-- Editorial releases contain public design metadata only; no visitor or project data.
create schema if not exists studio_private;
revoke all on schema studio_private from public, anon, authenticated;
grant usage on schema studio_private to authenticated;
create function studio_private.is_editor() returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((auth.jwt()->'app_metadata'->>'studio_role')='editor' and (auth.jwt()->>'aal')='aal2',false)
$$;
revoke all on function studio_private.is_editor() from public, anon, authenticated;
grant execute on function studio_private.is_editor() to authenticated;
create function studio_private.valid_manifest(m jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare k text; item jsonb; ids text[]; v text; known text[]:=array['swiss','luxury','corporate','brutal','editorial','tech','organic','mono','geo','creative','afro','future']; layouts text[]:=array['stack','split','center','rail','editorial'];
begin
 if jsonb_typeof(m) is distinct from 'object' or octet_length(m::text)>65536 or m->'version' is distinct from '1'::jsonb then return false; end if;
 foreach k in array array['products','collections','templates','palettes','fonts','assets'] loop
  if jsonb_typeof(m->k) is distinct from 'array' or jsonb_array_length(m->k)<1 or jsonb_array_length(m->k)>120 then return false; end if;
  ids:=array[]::text[];
  for item in select value from jsonb_array_elements(m->k) loop
   if k='templates' then
    if jsonb_typeof(item) is distinct from 'string' then return false; end if;
    v:=item#>>'{}';if not (split_part(v,'-',1)=any(known) and split_part(v,'-',2)=any(layouts) and v=split_part(v,'-',1)||'-'||split_part(v,'-',2)) then return false; end if;
   else
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'id') is distinct from 'string' or jsonb_typeof(item->'label') is distinct from 'string' then return false; end if;
    v:=item->>'id';if v !~ '^[a-z0-9-]{1,50}$' or char_length(item->>'label') not between 1 and 100 then return false; end if;
    if k='products' and v not in ('card','badge') then return false; end if;
    if k='collections' then
     if jsonb_typeof(item->'families') is distinct from 'array' or jsonb_array_length(item->'families')<>5 then return false; end if;
     if exists(select 1 from jsonb_array_elements_text(item->'families') f where not(f=any(known))) or (select count(distinct f) from jsonb_array_elements_text(item->'families') f)<>5 then return false; end if;
    end if;
    if k='palettes' and (jsonb_typeof(item->'color') is distinct from 'string' or item->>'color' !~ '^#[0-9a-fA-F]{6}$') then return false; end if;
    if k='fonts' and (v not in ('sans-serif','serif','monospace') or item->>'license' is distinct from 'system') then return false; end if;
    if k='assets' and (item->>'kind' is distinct from 'procedural' or item->>'license' is distinct from 'original') then return false; end if;
   end if;
   if v=any(ids) then return false; end if;ids:=array_append(ids,v);
  end loop;
  if k='products' and cardinality(ids)<>2 then return false; end if;
  if k='templates' and cardinality(ids)<>60 then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function studio_private.valid_manifest(jsonb) from public, anon, authenticated;
grant execute on function studio_private.valid_manifest(jsonb) to authenticated;
create table public.studio_releases(
 id uuid primary key default gen_random_uuid(),
 title text not null check(char_length(title) between 1 and 100),
 manifest jsonb not null check(studio_private.valid_manifest(manifest)),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(),
 published_at timestamptz,
 check((status='draft' and published_at is null) or (status<>'draft' and published_at is not null))
);
create unique index studio_single_published on public.studio_releases(status) where status='published';
alter table public.studio_releases enable row level security;
revoke all on public.studio_releases from public,anon,authenticated;
grant select on public.studio_releases to anon,authenticated;
grant insert(title,manifest) on public.studio_releases to authenticated;
create policy studio_release_public_read on public.studio_releases for select to anon,authenticated using(status='published');
create policy studio_release_editor_read on public.studio_releases for select to authenticated using((select studio_private.is_editor()));
create policy studio_release_editor_draft on public.studio_releases for insert to authenticated with check(status='draft' and (select studio_private.is_editor()));
create table studio_private.editorial_audit(id bigint generated always as identity primary key,release_id uuid not null references public.studio_releases(id),action text not null check(action in ('draft','published','archived')),actor uuid,created_at timestamptz not null default now());
alter table studio_private.editorial_audit enable row level security;
revoke all on studio_private.editorial_audit from public,anon,authenticated;
create function studio_private.audit_release() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or old.status is distinct from new.status then
 insert into studio_private.editorial_audit(release_id,action,actor) values(new.id,new.status,auth.uid());
 end if;return new;
end $$;
revoke all on function studio_private.audit_release() from public,anon,authenticated;
create trigger studio_release_audit after insert or update of status on public.studio_releases for each row execute function studio_private.audit_release();
create function studio_private.publish_release(target uuid,expected_current uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare current_id uuid; target_status text;
begin
 if not studio_private.is_editor() then raise exception 'Editor MFA required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(780151);
 select id into current_id from public.studio_releases where status='published';
 select status into target_status from public.studio_releases where id=target;
 if target_status='published' and current_id=target then return target;end if;
 if current_id is distinct from expected_current then raise exception 'Publication conflict' using errcode='40001';end if;
 if target_status is distinct from 'draft' then raise exception 'Draft required' using errcode='22023';end if;
 update public.studio_releases set status='archived' where id=current_id;
 update public.studio_releases set status='published',published_at=now() where id=target;
 return target;
end $$;
revoke all on function studio_private.publish_release(uuid,uuid) from public,anon,authenticated;
grant execute on function studio_private.publish_release(uuid,uuid) to authenticated;
create function public.studio_publish_release(target uuid,expected_current uuid) returns uuid language sql security invoker set search_path='' as $$
 select studio_private.publish_release(target,expected_current)
$$;
revoke all on function public.studio_publish_release(uuid,uuid) from public,anon,authenticated;
grant execute on function public.studio_publish_release(uuid,uuid) to authenticated;
insert into public.studio_releases(id,title,manifest,status,published_at) values('00000000-0000-4000-8000-000000000001','Studio Essentials 1.0','{"version":1,"products":[{"id":"card","label":"Cartões de visita"},{"id":"badge","label":"Crachás privados"}],"collections":[{"id":"essentials","label":"Essentials","families":["swiss","corporate","mono","luxury","geo"]},{"id":"expression","label":"Expression","families":["creative","brutal","editorial","afro","organic"]},{"id":"future","label":"Future Forms","families":["tech","future","geo","swiss","creative"]}],"templates":["swiss-stack","swiss-split","swiss-center","swiss-rail","swiss-editorial","luxury-stack","luxury-split","luxury-center","luxury-rail","luxury-editorial","corporate-stack","corporate-split","corporate-center","corporate-rail","corporate-editorial","brutal-stack","brutal-split","brutal-center","brutal-rail","brutal-editorial","editorial-stack","editorial-split","editorial-center","editorial-rail","editorial-editorial","tech-stack","tech-split","tech-center","tech-rail","tech-editorial","organic-stack","organic-split","organic-center","organic-rail","organic-editorial","mono-stack","mono-split","mono-center","mono-rail","mono-editorial","geo-stack","geo-split","geo-center","geo-rail","geo-editorial","creative-stack","creative-split","creative-center","creative-rail","creative-editorial","afro-stack","afro-split","afro-center","afro-rail","afro-editorial","future-stack","future-split","future-center","future-rail","future-editorial"],"palettes":[{"id":"swiss","label":"Swiss Minimal","color":"#244a77"},{"id":"luxury","label":"Luxury","color":"#d4b887"},{"id":"corporate","label":"Corporate","color":"#1b426f"},{"id":"brutal","label":"Brutalism","color":"#161616"},{"id":"editorial","label":"Editorial","color":"#8c523f"},{"id":"tech","label":"Technology","color":"#64e2b6"},{"id":"organic","label":"Organic","color":"#52634a"},{"id":"mono","label":"Monochrome","color":"#424242"},{"id":"geo","label":"Geometric","color":"#cc493a"},{"id":"creative","label":"Creative","color":"#6545bd"},{"id":"afro","label":"Afro Modern","color":"#aa693e"},{"id":"future","label":"Futuristic","color":"#9baefb"}],"fonts":[{"id":"sans-serif","label":"Sans-serif do sistema","license":"system"},{"id":"serif","label":"Serif do sistema","license":"system"},{"id":"monospace","label":"Monospace do sistema","license":"system"}],"assets":[{"id":"geometric","label":"Geometria procedural","license":"original","kind":"procedural"},{"id":"lines","label":"Linhas e grelhas","license":"original","kind":"procedural"}]}'::jsonb,'published',now());
