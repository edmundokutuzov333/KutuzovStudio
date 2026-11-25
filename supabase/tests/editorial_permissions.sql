begin;
set local role anon;
do $$ begin
 if (select count(*) from public.studio_releases)<>1 then raise exception 'public count';end if;
 if has_function_privilege(current_user,'public.studio_publish_release(uuid,uuid)','execute') then raise exception 'anon publish';end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","aal":"aal1","app_metadata":{"studio_role":"editor"}}',true);
do $$ begin
 begin
 insert into public.studio_releases(title,manifest) select 'Denied',manifest from public.studio_releases where status='published';
 raise exception 'MFA bypass';
 exception when insufficient_privilege then null;end;
 begin
 perform public.studio_publish_release('00000000-0000-4000-8000-000000000001',null);
 raise exception 'MFA publish bypass';
 exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","aal":"aal2","user_metadata":{"studio_role":"editor"}}',true);
do $$ begin
 begin insert into public.studio_releases(title,manifest) select 'Denied',manifest from public.studio_releases where status='published';raise exception 'User metadata bypass';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","aal":"aal2","app_metadata":{"studio_role":"editor"}}',true);
do $$ begin
 begin insert into public.studio_releases(title,manifest) select 'Invalid',manifest||'{"private_note":"must reject"}'::jsonb from public.studio_releases where status='published';raise exception 'Unexpected field allowed';exception when check_violation then null;end;
 if has_table_privilege(current_user,'studio_private.editorial_audit','SELECT') then raise exception 'Audit access leaked';end if;
end $$;
do $$ declare current_id uuid; draft_id uuid; begin
 select id into current_id from public.studio_releases where status='published';
 insert into public.studio_releases(title,manifest) select 'Rollback test',manifest from public.studio_releases where id=current_id returning id into draft_id;
 begin perform public.studio_publish_release(draft_id,null);raise exception 'Conflict bypass';exception when serialization_failure then null;end;
 if public.studio_publish_release(draft_id,current_id)<>draft_id then raise exception 'Publish failed';end if;
 if public.studio_publish_release(draft_id,current_id)<>draft_id then raise exception 'Idempotency failed';end if;
 if (select count(*) from public.studio_releases where status='published')<>1 then raise exception 'Multiple published';end if;
 if (select status from public.studio_releases where id=current_id)<>'archived' then raise exception 'Old release not archived';end if;
end $$;
reset role;
set local role anon;
do $$ begin if (select count(*) from public.studio_releases)<>1 then raise exception 'Archived data leak';end if;end $$;
reset role;
do $$ begin if (select count(*) from studio_private.editorial_audit where actor='00000000-0000-4000-8000-000000000099')<>3 then raise exception 'Audit count';end if;end $$;
rollback;