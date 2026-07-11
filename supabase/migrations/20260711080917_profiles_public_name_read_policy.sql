-- Allow public API roles to resolve profile display names for controlled MVP views/forms.
-- Current app scope: read profile ids and display names only for responsible person labels.
-- Auth, profile writes and full profile visibility remain out of scope.

grant select (id, display_name) on table profiles to anon, authenticated;

drop policy if exists "read active profile names" on profiles;

create policy "read active profile names"
on profiles for select
to anon, authenticated
using (is_active = true);
