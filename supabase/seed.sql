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
  'Budapest XIII. tarsashaz felujitas',
  'Budapest XIII., Vaci ut 112.',
  'Duna Invest Zrt.',
  'Belso befejezo munkak',
  68,
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
  'Burkolo Kft.',
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
  'Burkolat serult a lepcsohaznal',
  'A foldszinti lepcsohaz bejaratanal 3 db jarolap sarka serult. Javitas utan uj foto szukseges, mert a terulet TIG bizonyitekba kerul.',
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
  'Fuga hiany ellenorzese a furdoszobaban',
  'A B epulet 2. emeleti furdoszobajaban tobb helyen hianyzik vagy serult a fuga, javitas elott teljes koru ellenorzes szukseges.',
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

insert into profiles (
  id,
  display_name,
  role,
  company_name,
  trade,
  phone,
  email,
  is_active,
  created_at,
  updated_at
) values
(
  '99999999-9999-4999-8999-999999999999',
  'Kivitely Admin',
  'admin',
  'Duna Invest Zrt.',
  null,
  '+36 20 111 0001',
  'admin@example.invalid',
  true,
  '2026-07-06 10:00:00+00',
  '2026-07-06 10:00:00+00'
),
(
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Projektvezeto Teszt Elek',
  'project_manager',
  'Duna Invest Zrt.',
  null,
  '+36 20 111 0002',
  'projektvezeto@example.invalid',
  true,
  '2026-07-06 10:05:00+00',
  '2026-07-06 10:05:00+00'
),
(
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Munkavallalo Teszt Anna',
  'worker',
  'Duna Invest Zrt.',
  'Burkolas',
  '+36 20 111 0003',
  'munkavallalo@example.invalid',
  true,
  '2026-07-06 10:10:00+00',
  '2026-07-06 10:10:00+00'
),
(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'Supabase Burkolo Kft.',
  'subcontractor',
  'Supabase Burkolo Kft.',
  'Burkolas',
  '+36 20 444 7788',
  'burkolo@example.invalid',
  true,
  '2026-07-06 10:15:00+00',
  '2026-07-06 10:15:00+00'
),
(
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'Viewer Teszt Nora',
  'viewer',
  'Duna Invest Zrt.',
  null,
  '+36 20 111 0005',
  'viewer@example.invalid',
  true,
  '2026-07-06 10:20:00+00',
  '2026-07-06 10:20:00+00'
) on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  company_name = excluded.company_name,
  trade = excluded.trade,
  phone = excluded.phone,
  email = excluded.email,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at;

insert into project_members (
  id,
  project_id,
  profile_id,
  role,
  can_view_project,
  can_manage_project,
  notes,
  created_at,
  updated_at
) values
(
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '11111111-1111-4111-8111-111111111111',
  '99999999-9999-4999-8999-999999999999',
  'admin',
  true,
  true,
  'Seed admin / munkaltato teljes projekt hozzaferessel.',
  '2026-07-06 10:30:00+00',
  '2026-07-06 10:30:00+00'
),
(
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'project_manager',
  true,
  true,
  'Seed projektvezeto / muvezeto projekt kezeloi hozzaferessel.',
  '2026-07-06 10:35:00+00',
  '2026-07-06 10:35:00+00'
),
(
  'abababab-abab-4bab-8bab-abababababab',
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'worker',
  true,
  false,
  'Seed munkavallalo sajat projekt lathatosaghoz.',
  '2026-07-06 10:40:00+00',
  '2026-07-06 10:40:00+00'
),
(
  'bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc',
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'subcontractor',
  true,
  false,
  'Seed alvallalkozo sajat szakagi lathatosaghoz.',
  '2026-07-06 10:45:00+00',
  '2026-07-06 10:45:00+00'
),
(
  'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd',
  '11111111-1111-4111-8111-111111111111',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'viewer',
  true,
  false,
  'Seed viewer csak olvasasi hozzaferessel.',
  '2026-07-06 10:50:00+00',
  '2026-07-06 10:50:00+00'
) on conflict (project_id, profile_id) do update set
  role = excluded.role,
  can_view_project = excluded.can_view_project,
  can_manage_project = excluded.can_manage_project,
  notes = excluded.notes,
  updated_at = excluded.updated_at;

insert into work_logs (
  id,
  project_id,
  profile_id,
  trade,
  work_date,
  description,
  quantity,
  unit,
  status,
  created_at,
  updated_at
) values
(
  'dededede-dede-4ede-8ede-dededededede',
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Burkolas',
  '2026-07-06',
  'Foldszinti lepcsohaz burkolasi elokeszites es feluletellenorzes.',
  18.50,
  'm2',
  'submitted',
  '2026-07-06 15:30:00+00',
  '2026-07-06 15:30:00+00'
),
(
  'efefefef-efef-4fef-8fef-efefefefefef',
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'Burkolas',
  '2026-07-07',
  'Javitasi munka folytatasa, fuga hianyok ellenorzese es dokumentalasa.',
  7.00,
  'ora',
  'accepted',
  '2026-07-07 14:45:00+00',
  '2026-07-07 16:00:00+00'
) on conflict (id) do update set
  project_id = excluded.project_id,
  profile_id = excluded.profile_id,
  trade = excluded.trade,
  work_date = excluded.work_date,
  description = excluded.description,
  quantity = excluded.quantity,
  unit = excluded.unit,
  status = excluded.status,
  updated_at = excluded.updated_at;

insert into blocker_list (
  id,
  project_id,
  created_by_profile_id,
  responsible_profile_id,
  title,
  description,
  trade,
  area,
  status,
  severity,
  resolution_note,
  resolved_at,
  created_at,
  updated_at
) values
(
  '12345678-1234-4234-8234-123456789abc',
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Hianyzo burkolasi tervreszlet',
  'A foldszinti lepcsohaz javitasanal nincs egyertelmu tervreszlet a szegelykiosztashoz, ez lassitja a munkat. Tervezoi egyeztetes szukseges a folytatashoz.',
  'Burkolas',
  'Lepcsohaz',
  'waiting_external',
  'high',
  null,
  null,
  '2026-07-07 08:20:00+00',
  '2026-07-07 08:20:00+00'
),
(
  '23456789-2345-4345-8345-23456789abcd',
  '11111111-1111-4111-8111-111111111111',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Anyagkeses a fuga javitasnal',
  'A javitasi munkahoz szukseges fugazoanyag kesve erkezett, emiatt a befejezes egy nappal csuszott.',
  'Burkolas',
  'Furdoszoba',
  'resolved',
  'normal',
  'Az anyag beerkezett, a javitas folytathato.',
  '2026-07-08 09:30:00+00',
  '2026-07-07 11:10:00+00',
  '2026-07-08 09:30:00+00'
) on conflict (id) do update set
  project_id = excluded.project_id,
  created_by_profile_id = excluded.created_by_profile_id,
  responsible_profile_id = excluded.responsible_profile_id,
  title = excluded.title,
  description = excluded.description,
  trade = excluded.trade,
  area = excluded.area,
  status = excluded.status,
  severity = excluded.severity,
  resolution_note = excluded.resolution_note,
  resolved_at = excluded.resolved_at,
  updated_at = excluded.updated_at;

insert into project_documents (
  id,
  project_id,
  uploaded_by_profile_id,
  document_type,
  title,
  description,
  trade,
  area,
  storage_path,
  file_name,
  mime_type,
  file_size_bytes,
  revision,
  visibility,
  is_current,
  archived_at,
  created_at,
  updated_at
) values
(
  '34567890-3456-4456-8456-3456789abcde',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'architectural_plan',
  'Foldszinti alaprajz - burkolasi zona',
  'Epitesz terv a foldszinti burkolasi zonahoz.',
  'Burkolas',
  'Foldszint',
  'seed/project-documents/foldszinti-alaprajz-v1.pdf',
  'foldszinti-alaprajz-v1.pdf',
  'application/pdf',
  2457600,
  'v1',
  'project_team',
  true,
  null,
  '2026-07-08 10:00:00+00',
  '2026-07-08 10:00:00+00'
),
(
  '45678901-4567-4567-8567-456789abcdef',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'technical_plan',
  'Lepcsohaz szegelykiosztasi reszlet',
  'Muszaki tervreszlet a lepcsohazi szegelykiosztashoz, akadaly vagy hiba mellett hivatkozhato.',
  'Burkolas',
  'Lepcsohaz',
  'seed/project-documents/lepcsohaz-szegelykiosztas-v2.pdf',
  'lepcsohaz-szegelykiosztas-v2.pdf',
  'application/pdf',
  982000,
  'v2',
  'workers',
  true,
  null,
  '2026-07-08 10:10:00+00',
  '2026-07-08 10:10:00+00'
),
(
  '56789012-5678-4678-8678-56789abcdef0',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'photo_document',
  'Helyszini referenciafoto - furdoszoba',
  'Projekt szintu fotodokumentum a furdoszoba allapotarol, issue evidence-tol elkulonitve.',
  'Burkolas',
  'Furdoszoba',
  'seed/project-documents/furdoszoba-referencia.jpg',
  'furdoszoba-referencia.jpg',
  'image/jpeg',
  734000,
  '2026-07-08',
  'project_team',
  true,
  null,
  '2026-07-08 10:20:00+00',
  '2026-07-08 10:20:00+00'
) on conflict (id) do update set
  project_id = excluded.project_id,
  uploaded_by_profile_id = excluded.uploaded_by_profile_id,
  document_type = excluded.document_type,
  title = excluded.title,
  description = excluded.description,
  trade = excluded.trade,
  area = excluded.area,
  storage_path = excluded.storage_path,
  file_name = excluded.file_name,
  mime_type = excluded.mime_type,
  file_size_bytes = excluded.file_size_bytes,
  revision = excluded.revision,
  visibility = excluded.visibility,
  is_current = excluded.is_current,
  archived_at = excluded.archived_at,
  updated_at = excluded.updated_at;
