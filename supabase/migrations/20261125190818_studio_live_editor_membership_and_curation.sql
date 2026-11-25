-- Database-owned membership, checked on every request, prevents stale JWT roles
-- from retaining access after an operator revokes the membership.
create table studio_private.editor_members(
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
alter table studio_private.editor_members enable row level security;
revoke all on studio_private.editor_members from public,anon,authenticated;
create policy editor_members_deny_client on studio_private.editor_members as restrictive for all to anon,authenticated using(false) with check(false);
-- Preserve existing expressly authorized users if upgrading an installed Studio.
insert into studio_private.editor_members(user_id) select id from auth.users where raw_app_meta_data->>'studio_role'='editor' on conflict do nothing;
create function studio_private.has_editor_membership() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(auth.jwt()->'app_metadata'->>'studio_role'='editor',false)
 and exists(select 1 from studio_private.editor_members m join auth.users u on u.id=m.user_id where m.user_id=auth.uid() and u.raw_app_meta_data->>'studio_role'='editor' and not u.is_anonymous and (u.banned_until is null or u.banned_until<=now()))
$$;
revoke all on function studio_private.has_editor_membership() from public,anon,authenticated;
grant execute on function studio_private.has_editor_membership() to authenticated;
create or replace function studio_private.is_editor() returns boolean language sql stable security invoker set search_path='' as $$
 select studio_private.has_editor_membership() and coalesce(auth.jwt()->>'aal'='aal2',false)
$$;
create function public.studio_editor_status() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('member',studio_private.has_editor_membership(),'mfa',studio_private.is_editor())
$$;
revoke all on function public.studio_editor_status() from public,anon,authenticated;
grant execute on function public.studio_editor_status() to authenticated;
-- Metadata only: the curator cannot grant a stock license or publish a stock file.
grant insert(provider,external_id,title,author,source_url,quoted_credits),update(status) on public.studio_asset_candidates to authenticated;
create policy studio_candidate_editor_insert on public.studio_asset_candidates for insert to authenticated with check((select studio_private.is_editor()) and status='review');
create policy studio_candidate_editor_update on public.studio_asset_candidates for update to authenticated using((select studio_private.is_editor())) with check((select studio_private.is_editor()));
alter table public.studio_asset_candidates add constraint studio_candidate_origin_id check(right(source_url,char_length(external_id)+5)='_'||external_id||'.htm');
create table studio_private.asset_audit(
 id bigint generated always as identity primary key,provider text not null,external_id text not null,
 action text not null check(action in ('review','rejected')),actor uuid,created_at timestamptz not null default now(),
 foreign key(provider,external_id) references public.studio_asset_candidates(provider,external_id)
);
alter table studio_private.asset_audit enable row level security;
revoke all on studio_private.asset_audit from public,anon,authenticated;
create policy asset_audit_deny_client on studio_private.asset_audit as restrictive for all to anon,authenticated using(false) with check(false);
create function studio_private.audit_asset() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or old.status is distinct from new.status then insert into studio_private.asset_audit(provider,external_id,action,actor) values(new.provider,new.external_id,new.status,auth.uid());end if;return new;
end $$;
revoke all on function studio_private.audit_asset() from public,anon,authenticated;
create trigger studio_asset_audit after insert or update of status on public.studio_asset_candidates for each row execute function studio_private.audit_asset();
create function public.studio_curate_asset(asset_id text,asset_title text,asset_author text,asset_url text,asset_credits integer) returns text language plpgsql security invoker set search_path='' as $$
begin
 if not studio_private.is_editor() then raise exception 'Editor MFA required' using errcode='42501';end if;
 insert into public.studio_asset_candidates(provider,external_id,title,author,source_url,quoted_credits) values('magnific',asset_id,asset_title,asset_author,asset_url,asset_credits) on conflict(provider,external_id) do nothing;
 return asset_id;
end $$;
revoke all on function public.studio_curate_asset(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.studio_curate_asset(text,text,text,text,integer) to authenticated;
