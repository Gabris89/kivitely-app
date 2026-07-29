-- E2E teszt: a hianyzo projekt-tagsagok potlasa.
--
-- MIERT KELL:
-- A test-data-permissions.sql eredetileg @example.com cimeket feltetelezett, de
-- a fiokok a gyakorlatban mas cimen jottek letre (admin@gmail.com,
-- epitesvezeto@gmail.com, stb.). A SZEREPEK mar helyesek, viszont az
-- epitesvezeto es a megtekinto fioknak NINCS projekt-tagsaga.
--
-- Ez azert baj, mert a lathatosagi szabaly szerint:
--   site_manager, viewer -> CSAK a tagsagi projektjeiket latjak
-- Tagsag nelkul tehat egyikuk sem lat semmit, es igy epp az a ket szerep
-- marad merhetetlen, amelyik a projekt-szintu szukitest bizonyitana.
--
-- Ez a fajl csak tagsagot ad hozza. A szerepeket, neveket es ceg-koteseket
-- SZANDEKOSAN nem bantja: azok mar jok, es a gmail-es fiokok valodi
-- munkafiokok is egyben.
--
-- Ujrafuttathato.

insert into project_members (project_id, profile_id, role, can_view_project, can_manage_project, notes)
select pr.id, p.id, p.role, true, false, 'E2E teszt-tagsag (test-data-e2e-memberships.sql)'
from (values
  ('epitesvezeto@gmail.com', 'PRJ-001'),
  ('megtekinto@gmail.com',   'PRJ-001')
) as m(email, project_public_id)
join auth.users u on lower(u.email) = lower(m.email)
join profiles p on p.auth_user_id = u.id
join projects pr on pr.public_id = m.project_public_id
on conflict (project_id, profile_id) do update set
  can_view_project = true,
  updated_at = now();


-- ---------------------------------------------------------------------------
-- Ellenorzes: futtatas utan mind a hat E2E fioknak helyes hatokore legyen
-- ---------------------------------------------------------------------------
-- A "projektek" oszlopban:
--   admin, projektvezeto -> lehet NULL (ok tagsag nelkul is mindent latnak)
--   epitesvezeto, megtekinto -> PRJ-001
--   teszt1 -> PRJ-001
--   teszt2 -> PRJ-001 es a masodik ("Test projekt 2") projekt
--
--   select p.email, p.role::text as szerep, s.name as ceg,
--          (select string_agg(pr.public_id, ', ' order by pr.public_id)
--             from project_members pm
--             join projects pr on pr.id = pm.project_id
--            where pm.profile_id = p.id and pm.can_view_project) as projektek
--   from profiles p
--   left join subcontractors s on s.id = p.subcontractor_id
--   where p.email in (
--     'admin@gmail.com', 'projektvezeto@gmail.com', 'epitesvezeto@gmail.com',
--     'megtekinto@gmail.com', 'teszt1@example.com', 'teszt2@example.com')
--   order by p.email;
