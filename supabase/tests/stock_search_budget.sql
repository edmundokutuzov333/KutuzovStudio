begin;
insert into auth.users(id,raw_app_meta_data) values('00000000-0000-4000-8000-000000000096','{"studio_role":"editor"}');
insert into studio_private.editor_members(user_id) values('00000000-0000-4000-8000-000000000096');
delete from studio_private.stock_search_budget where day=(now() at time zone 'UTC')::date;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000096","role":"authenticated","aal":"aal1","app_metadata":{"studio_role":"editor"}}',true);
do $$ begin
 begin perform public.studio_reserve_stock_search();raise exception 'MFA bypass';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000096","role":"authenticated","aal":"aal2","app_metadata":{"studio_role":"editor"}}',true);
do $$ declare i integer; begin
 for i in 1..20 loop if public.studio_reserve_stock_search()<>20-i then raise exception 'Budget reservation mismatch';end if;end loop;
 if public.studio_reserve_stock_search()<>-1 then raise exception 'Budget exceeded';end if;
 if has_table_privilege(current_user,'studio_private.stock_search_budget','SELECT') then raise exception 'Budget table exposed';end if;
end $$;
reset role;
do $$ begin if (select requests from studio_private.stock_search_budget where day=(now() at time zone 'UTC')::date)<>20 then raise exception 'Budget counter invalid';end if;end $$;
rollback;