-- Allow controlled project creation through the public API role.
-- Current app scope: insert new rows into projects only, no update/delete.
-- Auth and service-role writes remain out of scope.

grant insert on table projects to anon, authenticated;
