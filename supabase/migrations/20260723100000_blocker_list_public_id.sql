-- Add a short, human-readable public identifier to blocker_list (AKA-001
-- style, akadaly), mirroring the issues.public_id / HIB-104 pattern.
-- Backfill existing rows in creation order.

alter table blocker_list add column if not exists public_id text;

with ordered as (
  select id, row_number() over (order by created_at asc) as rn
  from blocker_list
  where public_id is null
)
update blocker_list
set public_id = 'AKA-' || lpad(ordered.rn::text, 3, '0')
from ordered
where blocker_list.id = ordered.id;

alter table blocker_list alter column public_id set not null;
alter table blocker_list add constraint blocker_list_public_id_key unique (public_id);
