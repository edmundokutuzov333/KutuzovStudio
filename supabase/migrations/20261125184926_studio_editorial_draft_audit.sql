-- Idempotent draft creation and safe, read-only editorial audit projection.
create unique index studio_release_unique_draft on public.studio_releases(title,md5(manifest::text)) where status='draft';
create function public.studio_create_draft(draft_title text,draft_manifest jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare result_id uuid;
begin
 if not studio_private.is_editor() or auth.uid() is null then raise exception 'Editor MFA required' using errcode='42501';end if;
 if char_length(draft_title) not between 1 and 100 or not studio_private.strict_manifest_keys(draft_manifest) then raise exception 'Invalid draft' using errcode='22023';end if;
 insert into public.studio_releases(title,manifest) values(draft_title,draft_manifest) on conflict(title,md5(manifest::text)) where status='draft' do nothing returning id into result_id;
 if result_id is null then select id into result_id from public.studio_releases where status='draft' and title=draft_title and manifest=draft_manifest;end if;
 if result_id is null then raise exception 'Draft conflict' using errcode='40001';end if;
 return result_id;
end $$;
revoke all on function public.studio_create_draft(text,jsonb) from public,anon,authenticated;
grant execute on function public.studio_create_draft(text,jsonb) to authenticated;
create function studio_private.audit_feed() returns table(release_id uuid,title text,action text,created_at timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
 if not studio_private.is_editor() or auth.uid() is null then raise exception 'Editor MFA required' using errcode='42501';end if;
 return query select a.release_id,r.title,a.action,a.created_at from studio_private.editorial_audit a join public.studio_releases r on r.id=a.release_id order by a.id desc limit 100;
end $$;
revoke all on function studio_private.audit_feed() from public,anon,authenticated;
grant execute on function studio_private.audit_feed() to authenticated;
create function public.studio_audit_feed() returns table(release_id uuid,title text,action text,created_at timestamptz) language sql stable security invoker set search_path='' as $$ select * from studio_private.audit_feed() $$;
revoke all on function public.studio_audit_feed() from public,anon,authenticated;
grant execute on function public.studio_audit_feed() to authenticated;
create function studio_private.known_backgrounds(m jsonb) returns boolean language sql immutable security invoker set search_path='' as $$
 select not exists(select 1 from jsonb_array_elements(m->'assets') a where a->>'id' not in ('geometric','lines','orbit','grid','paper','diagonal','waves','dots','steps','rings','stripes','arch'))
$$;
revoke all on function studio_private.known_backgrounds(jsonb) from public,anon,authenticated;
grant execute on function studio_private.known_backgrounds(jsonb) to authenticated;
alter table public.studio_releases add constraint studio_release_known_backgrounds check(studio_private.known_backgrounds(manifest));
