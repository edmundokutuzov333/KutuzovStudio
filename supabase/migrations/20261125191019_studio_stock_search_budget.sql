-- Daily global guard for optional, metadata-only stock searches. No download RPC.
create table studio_private.stock_search_budget(
 day date primary key, requests integer not null check(requests between 1 and 20)
);
alter table studio_private.stock_search_budget enable row level security;
revoke all on studio_private.stock_search_budget from public,anon,authenticated;
create policy stock_budget_deny_client on studio_private.stock_search_budget as restrictive for all to anon,authenticated using(false) with check(false);
create function studio_private.reserve_stock_search() returns integer language plpgsql security definer set search_path='' as $$
declare used integer;
begin
 if not studio_private.is_editor() or auth.uid() is null then raise exception 'Editor MFA required' using errcode='42501';end if;
 insert into studio_private.stock_search_budget(day,requests) values((now() at time zone 'UTC')::date,1)
 on conflict(day) do update set requests=studio_private.stock_search_budget.requests+1
 where studio_private.stock_search_budget.requests<20 returning requests into used;
 if used is null then return -1;end if;
 return 20-used;
end $$;
revoke all on function studio_private.reserve_stock_search() from public,anon,authenticated;
grant execute on function studio_private.reserve_stock_search() to authenticated;
create function public.studio_reserve_stock_search() returns integer language sql volatile security invoker set search_path='' as $$ select studio_private.reserve_stock_search() $$;
revoke all on function public.studio_reserve_stock_search() from public,anon,authenticated;
grant execute on function public.studio_reserve_stock_search() to authenticated;
