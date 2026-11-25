begin;
-- Transaction-local fixture only; no real account or password is created.
insert into auth.users(id,raw_app_meta_data) values('00000000-0000-4000-8000-000000000098','{"studio_role":"editor"}');
insert into studio_private.editor_members(user_id) values('00000000-0000-4000-8000-000000000098');
set local role anon;
do $$ begin if has_function_privilege(current_user,'public.studio_audit_feed()','execute') or has_function_privilege(current_user,'public.studio_create_draft(text,jsonb)','execute') then raise exception 'Anonymous editorial access';end if;end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000098","role":"authenticated","aal":"aal1","app_metadata":{"studio_role":"editor"}}',true);
do $$ begin
 begin perform public.studio_audit_feed();raise exception 'Audit MFA bypass';exception when insufficient_privilege then null;end;
 begin perform public.studio_create_draft('Denied','{}');raise exception 'Draft MFA bypass';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000098","role":"authenticated","aal":"aal2","app_metadata":{"studio_role":"editor"}}',true);
do $$ declare m jsonb; a uuid; b uuid; begin
 select manifest into m from public.studio_releases where status='published';
 a:=public.studio_create_draft('Idempotency test',m); b:=public.studio_create_draft('Idempotency test',m);
 if a is null or a is distinct from b then raise exception 'Draft retry failed';end if;
 if (select count(*) from public.studio_audit_feed() f where f.release_id=a and f.action='draft')<>1 then raise exception 'Audit duplication';end if;
 begin perform public.studio_create_draft('Invalid asset',jsonb_set(m,'{assets,0,id}','"not-in-renderer"'));raise exception 'Unknown asset accepted';exception when check_violation then null;end;
end $$;
rollback;