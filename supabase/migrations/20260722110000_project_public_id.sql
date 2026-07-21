-- Add a short, human-readable public identifier to projects (PRJ-001 style,
-- mirrors the issues.public_id / KIV-104 pattern) so project URLs don't
-- expose the raw internal uuid. Backfill existing rows in creation order.

alter table projects add column if not exists public_id text;

with ordered as (
  select id, row_number() over (order by created_at asc) as rn
  from projects
  where public_id is null
)
update projects
set public_id = 'PRJ-' || lpad(ordered.rn::text, 3, '0')
from ordered
where projects.id = ordered.id;

alter table projects alter column public_id set not null;
alter table projects add constraint projects_public_id_key unique (public_id);
