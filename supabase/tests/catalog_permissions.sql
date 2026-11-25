-- Run after the migration in a dedicated Studio database. No persistent mutations.
begin;
insert into public.studio_formats(id,product,label,width_mm,height_mm,bleed_mm,safe_mm,position,published) values ('rls-test-draft','card','Unpublished test',85,55,3,3,999,false);
set local role anon;
do $$ begin
 if (select count(id) from public.studio_formats where id in ('eu-card','vertical-badge')) <> 2 then raise exception 'Published catalog missing'; end if;
 if exists(select id from public.studio_formats where id='rls-test-draft') then raise exception 'Draft leaked'; end if;
 if has_table_privilege(current_user,'public.studio_formats','INSERT') or has_table_privilege(current_user,'public.studio_formats','UPDATE') or has_table_privilege(current_user,'public.studio_formats','DELETE') then raise exception 'Anonymous write privilege'; end if;
 if has_column_privilege(current_user,'public.studio_formats','published','SELECT') then raise exception 'Internal column exposed'; end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
 if (select count(id) from public.studio_formats where id in ('eu-card','vertical-badge')) <> 2 then raise exception 'Published catalog missing'; end if;
 if exists(select id from public.studio_formats where id='rls-test-draft') then raise exception 'Draft leaked'; end if;
 if has_table_privilege(current_user,'public.studio_formats','INSERT') or has_table_privilege(current_user,'public.studio_formats','UPDATE') or has_table_privilege(current_user,'public.studio_formats','DELETE') then raise exception 'Authenticated write privilege'; end if;
end $$;
rollback;
