-- Add a short, human-readable public identifier to subcontractors (ALV-001
-- style, alvallalkozo), mirroring the issues.public_id / HIB-104 pattern.
-- Backfill existing rows in creation order.

alter table subcontractors add column if not exists public_id text;

with ordered as (
  select id, row_number() over (order by created_at asc) as rn
  from subcontractors
  where public_id is null
)
update subcontractors
set public_id = 'ALV-' || lpad(ordered.rn::text, 3, '0')
from ordered
where subcontractors.id = ordered.id;

alter table subcontractors alter column public_id set not null;
alter table subcontractors add constraint subcontractors_public_id_key unique (public_id);
