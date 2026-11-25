-- Explicit allowlist of public metadata keys, preventing accidental private fields in a release.
create function studio_private.strict_manifest_keys(m jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare k text; item jsonb; allowed text[];
begin
 if not studio_private.valid_manifest(m) or m-array['version','products','collections','templates','palettes','fonts','assets'] <> '{}'::jsonb then return false;end if;
 foreach k in array array['products','collections','palettes','fonts','assets'] loop
  allowed:=case k when 'collections' then array['id','label','families'] when 'palettes' then array['id','label','color'] when 'fonts' then array['id','label','license'] when 'assets' then array['id','label','license','kind'] else array['id','label'] end;
  for item in select value from jsonb_array_elements(m->k) loop
   if item-allowed <> '{}'::jsonb then return false;end if;
  end loop;
 end loop;return true;
end $$;
revoke all on function studio_private.strict_manifest_keys(jsonb) from public,anon,authenticated;
grant execute on function studio_private.strict_manifest_keys(jsonb) to authenticated;
alter table public.studio_releases add constraint studio_release_public_metadata_keys check(studio_private.strict_manifest_keys(manifest));
create policy studio_audit_no_visitor_access on studio_private.editorial_audit as restrictive for all to anon,authenticated using(false) with check(false);
