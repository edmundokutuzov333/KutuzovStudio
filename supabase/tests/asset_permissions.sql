begin;
-- Transaction-local fixture only; no real account or password is created.
insert into auth.users(id,raw_app_meta_data) values('00000000-0000-4000-8000-000000000099','{"studio_role":"editor"}');
insert into studio_private.editor_members(user_id) values('00000000-0000-4000-8000-000000000099');
set local role anon;
do $$ begin
 if has_table_privilege(current_user,'public.studio_asset_candidates','SELECT') then raise exception 'Stock metadata leak';end if;
 if (select count(*) from public.studio_releases)<>1 then raise exception 'Public release count';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","aal":"aal1","app_metadata":{"studio_role":"editor"}}',true);
do $$ begin if (select count(*) from public.studio_asset_candidates)<>0 then raise exception 'MFA bypass';end if;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","aal":"aal2","app_metadata":{"studio_role":"editor"}}',true);
do $$ begin if (select count(*) from public.studio_asset_candidates where external_id in ('415727487','416040483','38601710'))<>3 then raise exception 'Candidate count';end if;if (select jsonb_array_length(manifest->'assets') from public.studio_releases where status='published')<>12 then raise exception 'Original asset count';end if;end $$;
rollback;