-- Kivitely read-only smoke test seed.
-- Run after supabase/migrations/20260706210901_initial_kivitely_schema.sql.
-- This file is intentionally small and idempotent so it can be re-run during manual testing.

insert into projects (
  id,
  name,
  address,
  client,
  phase,
  progress,
  created_at,
  updated_at
) values (
  '11111111-1111-4111-8111-111111111111',
  'Supabase teszt projekt',
  'Budapest XIII., Vaci ut 112.',
  'Duna Invest Zrt.',
  'Burkolasi teszt szakasz',
  42,
  '2026-07-06 08:00:00+00',
  '2026-07-06 08:00:00+00'
) on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  client = excluded.client,
  phase = excluded.phase,
  progress = excluded.progress,
  updated_at = excluded.updated_at;

insert into subcontractors (
  id,
  name,
  trade,
  contact_name,
  phone,
  email,
  created_at
) values (
  '22222222-2222-4222-8222-222222222222',
  'Supabase Burkolo Kft.',
  'Burkolas',
  'Nagy Peter',
  '+36 20 444 7788',
  'burkolo@example.invalid',
  '2026-07-06 08:05:00+00'
) on conflict (id) do update set
  name = excluded.name,
  trade = excluded.trade,
  contact_name = excluded.contact_name,
  phone = excluded.phone,
  email = excluded.email;

insert into issues (
  id,
  public_id,
  project_id,
  subcontractor_id,
  title,
  description,
  location,
  area,
  trade,
  assignee_name,
  due_date,
  status,
  priority,
  value_huf,
  created_at,
  updated_at
) values
(
  '33333333-3333-4333-8333-333333333333',
  'KIV-104',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Supabase seed: burkolat javitasa',
  'Read-only teszt rekord. Ha ezt latod az appban, az adat Supabase-bol erkezik.',
  'A epulet - Foldszint',
  'Lepcsohaz',
  'Burkolas',
  'Nagy Peter',
  '2026-07-10',
  'tig_ready',
  'high',
  420000,
  '2026-07-06 08:10:00+00',
  '2026-07-06 09:30:00+00'
),
(
  '44444444-4444-4444-8444-444444444444',
  'KIV-201',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Supabase seed: fuga hiany ellenorzese',
  'Masodik read-only teszt hiba a lista es dashboard ellenorzeshez.',
  'B epulet - 2. emelet',
  'Furdoszoba',
  'Burkolas',
  'Nagy Peter',
  '2026-07-12',
  'assigned',
  'normal',
  180000,
  '2026-07-06 08:20:00+00',
  '2026-07-06 08:20:00+00'
) on conflict (public_id) do update set
  project_id = excluded.project_id,
  subcontractor_id = excluded.subcontractor_id,
  title = excluded.title,
  description = excluded.description,
  location = excluded.location,
  area = excluded.area,
  trade = excluded.trade,
  assignee_name = excluded.assignee_name,
  due_date = excluded.due_date,
  status = excluded.status,
  priority = excluded.priority,
  value_huf = excluded.value_huf,
  updated_at = excluded.updated_at;

insert into issue_evidence (
  id,
  issue_id,
  evidence_type,
  storage_path,
  label,
  uploaded_at
) values
(
  '55555555-5555-4555-8555-555555555555',
  (select id from issues where public_id = 'KIV-104'),
  'before_photo',
  'seed/kiv-104-before.jpg',
  'Seed elotte foto',
  '2026-07-06 08:30:00+00'
),
(
  '66666666-6666-4666-8666-666666666666',
  (select id from issues where public_id = 'KIV-104'),
  'after_photo',
  'seed/kiv-104-after.jpg',
  'Seed utana foto',
  '2026-07-06 09:25:00+00'
) on conflict (id) do update set
  issue_id = excluded.issue_id,
  evidence_type = excluded.evidence_type,
  storage_path = excluded.storage_path,
  label = excluded.label,
  uploaded_at = excluded.uploaded_at;

insert into issue_events (
  id,
  issue_id,
  event_type,
  from_status,
  to_status,
  title,
  description,
  created_at
) values
(
  '77777777-7777-4777-8777-777777777777',
  (select id from issues where public_id = 'KIV-104'),
  'created',
  null,
  'assigned',
  'Seed hiba rogzitve',
  'A KIV-104 seed rekord letrejott a Supabase read-only teszthez.',
  '2026-07-06 08:10:00+00'
),
(
  '88888888-8888-4888-8888-888888888888',
  (select id from issues where public_id = 'KIV-104'),
  'status_changed',
  'assigned',
  'tig_ready',
  'Seed hiba TIG-ready',
  'A bizonyitekok alapjan a seed hiba TIG-ready allapotba kerult.',
  '2026-07-06 09:30:00+00'
) on conflict (id) do update set
  issue_id = excluded.issue_id,
  event_type = excluded.event_type,
  from_status = excluded.from_status,
  to_status = excluded.to_status,
  title = excluded.title,
  description = excluded.description,
  created_at = excluded.created_at;
