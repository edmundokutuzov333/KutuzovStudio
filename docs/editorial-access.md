# Editorial access (operator-only)
1. In the dedicated Supabase project, create/invite the real administrator through Authentication > Users. Use an email the operator controls, finish confirmation and set a strong password. Do not send passwords to ChatGPT or place them in the repo.
2. Copy the confirmed user's UUID. In SQL Editor, execute the following transaction, replacing the UUID twice. Never use an arbitrary email or grant the role to a public signup.
```sql
begin;
update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||'{"studio_role":"editor"}'::jsonb
where id='YOUR_CONFIRMED_USER_UUID'::uuid and email_confirmed_at is not null and not is_anonymous;
insert into studio_private.editor_members(user_id)
select id from auth.users where id='YOUR_CONFIRMED_USER_UUID'::uuid and email_confirmed_at is not null and not is_anonymous and raw_app_meta_data->>'studio_role'='editor'
on conflict do nothing;
commit;
```
3. Sign in to admin.html, configure TOTP with your authenticator and verify the code. Reloading signs out locally by design.
4. To revoke access immediately, delete the membership by the actual UUID in SQL Editor and remove studio_role from raw_app_meta_data. Revoke Auth sessions as well. All editorial policies check membership on every call, even if a JWT has not expired.
No default admin, password, TOTP seed, or public role assignment endpoint exists.
