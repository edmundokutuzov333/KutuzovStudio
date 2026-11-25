begin;
insert into auth.users(id,raw_app_meta_data) values('00000000-0000-4000-8000-000000000097','{"studio_role":"editor"}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000097","role":"authenticated","aal":"aal2","app_metadata":{"studio_role":"editor"}}',true);
do $$ begin
 if public.studio_editor_status()->>'member'<>'false' then raise exception 'JWT-only membership bypass';end if;
 begin perform public.studio_curate_asset('999999999','Test','Author','https://www.magnific.com/free-vector/test_999999999.htm',0);raise exception 'Unauthorized curate';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into studio_private.editor_members(user_id) values('00000000-0000-4000-8000-000000000097');
set local role authenticated;
do $$ begin
 if public.studio_editor_status()->>'mfa'<>'true' then raise exception 'Authorized membership failed';end if;
 perform public.studio_curate_asset('999999999','Test','Author','https://www.magnific.com/free-vector/test_999999999.htm',0);
 perform public.studio_curate_asset('999999999','Test','Author','https://www.magnific.com/free-vector/test_999999999.htm',0);
 if (select count(*) from public.studio_asset_candidates where external_id='999999999')<>1 then raise exception 'Duplicate metadata';end if;
 update public.studio_asset_candidates set status='rejected' where external_id='999999999';
 update public.studio_asset_candidates set status='rejected' where external_id='999999999';
 begin perform public.studio_curate_asset('999999998','Test','Author','https://www.magnific.com/free-vector/test_999999999.htm',0);raise exception 'Mismatched ID';exception when check_violation then null;end;
 if has_table_privilege(current_user,'studio_private.asset_audit','SELECT') then raise exception 'Audit exposure';end if;
end $$;
reset role;
do $$ begin if (select count(*) from studio_private.asset_audit where external_id='999999999')<>2 then raise exception 'Audit idempotency';end if;end $$;
delete from studio_private.editor_members where user_id='00000000-0000-4000-8000-000000000097';
set local role authenticated;
do $$ begin
 if public.studio_editor_status()->>'member'<>'false' or (select count(*) from public.studio_asset_candidates)<>0 then raise exception 'Revocation failed';end if;
 begin perform public.studio_audit_feed();raise exception 'Stale token retained audit access';exception when insufficient_privilege then null;end;
end $$;
rollback;