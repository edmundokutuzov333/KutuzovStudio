create index if not exists studio_asset_audit_candidate_idx on studio_private.asset_audit(provider,external_id);
create index if not exists studio_editorial_audit_release_idx on studio_private.editorial_audit(release_id);
drop policy studio_release_editor_read on public.studio_releases;
alter policy studio_release_public_read on public.studio_releases to anon;
create policy studio_release_authenticated_read on public.studio_releases for select to authenticated using(status='published' or (select studio_private.is_editor()));
