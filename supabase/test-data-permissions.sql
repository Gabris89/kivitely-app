-- Jogosultsagi teszt-adatkeszlet (3. lepcso).
--
-- Cel: tobb KULONBOZO alvallalkozo ceg, es hozzajuk kotott, elteroszerepu
-- belepesek. Enelkul a "sajat hiba" fogalma nem tesztelheto: eddig egyetlen
-- ceg es egyetlen projekt letezett, igy minden hiba mindenkie volt.
--
-- A nevezektan szandekosan buta es szamozott: "Test ceg 1" es "Test ceg 2",
-- hozzajuk "Teszt 1" es "Teszt 2" nevu belepes. A szambol egybol latszik ki
-- melyik ceghez tartozik, igy a kepernyon ranezesre eldontheto, hogy amit
-- latsz az sajat vagy idegen.
--
-- Ez a fajl NEM migracio, es szandekosan nincs a supabase/migrations/ alatt.
-- Teszt-adat, ujrafuttathato, es eles adatbazison nem kell lefutnia.
--
-- ---------------------------------------------------------------------------
-- ELOFELTETEL: eloszor a belepeseket kell letrehozni, kezzel
-- ---------------------------------------------------------------------------
-- Auth-felhasznalot SQL-bol nem hozunk letre (jelszo, e-mail visszaigazolas),
-- ezert a Supabase Dashboardon kell felvenni oket:
--   Authentication -> Users -> Add user -> e-mail + jelszo, "Auto Confirm User"
--
-- A hat teszt-fiok (a jelszo mindegy, csak jegyezd fel valahova):
--   admin@example.com        -> admin           (mindent lat, semmi nem szukiti)
--   pm@example.com           -> project_manager (teljes portfolio, tag nelkul is)
--   muvezeto@example.com     -> site_manager    (CSAK a sajat projektjei)
--   teszt1@example.com       -> subcontractor   (Test ceg 1)
--   teszt2@example.com       -> subcontractor   (Test ceg 2)
--   megrendelo@example.com   -> viewer          (csak olvas)
--
-- Amint egy fiok letrejon, a 20260727140000 migracio triggere automatikusan
-- keszit hozza egy 'viewer' profilt. Ez a fajl azt a profilt emeli a helyes
-- szerepre es koti a ceghez - vagyis EZUTAN kell lefuttatni.
--
-- Ha mar van sajat teszt-fiokod, csak ird at a 4) es 5) resz e-mail-listajat.
--
-- A regi @example.invalid seed-profilokat NEM bantjuk: azokra hivatkoznak a
-- seed munkanaplo- es akadaly-rekordok, es belepes nelkuli "nevjegykent"
-- ervenyesek maradnak.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- 1) Alvallalkozo cegek
-- ---------------------------------------------------------------------------
-- Ket uj, szamozott ceg. A seedbol jovo Burkolo Kft. marad ahol van, de a
-- jogosultsagi teszt nem hasznalja: igy a "sajat vagy idegen" kerdes mindig
-- ket egyforma sulyu teszt-ceg kozott dol el.
-- A public_id (ALV-xxx) nem fix ertek: az app max+1 alapjan general, ezert itt is
-- a kovetkezo szabad sorszamot vesszuk. Ujrafuttatasnal nem valtozik, mert az
-- "on conflict do update" listajabol szandekosan kimarad.
with base as (
  select coalesce(max(nullif(regexp_replace(public_id, '\D', '', 'g'), ''))::int, 0) as maxnum
  from subcontractors
),
newrows as (
  select * from (values
    (
      '2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a'::uuid, 1,
      'Test ceg 1', 'Test szakma 1', 'Teszt 1',
      '+36 30 111 1111', 'teszt1@example.com', '2026-07-28 08:00:00+00'::timestamptz
    ),
    (
      '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b2b'::uuid, 2,
      'Test ceg 2', 'Test szakma 2', 'Teszt 2',
      '+36 30 222 2222', 'teszt2@example.com', '2026-07-28 08:05:00+00'::timestamptz
    )
  ) as t(id, ord, name, trade, contact_name, phone, email, created_at)
)
insert into subcontractors (id, public_id, name, trade, contact_name, phone, email, created_at)
select n.id, 'ALV-' || lpad((b.maxnum + n.ord)::text, 3, '0'),
       n.name, n.trade, n.contact_name, n.phone, n.email, n.created_at
from newrows n cross join base b
on conflict (id) do update set
  name = excluded.name,
  trade = excluded.trade,
  contact_name = excluded.contact_name,
  phone = excluded.phone,
  email = excluded.email;
  -- public_id szandekosan kimarad


-- ---------------------------------------------------------------------------
-- 2) Masodik projekt
-- ---------------------------------------------------------------------------
-- Projekt-szintu szukites csak ket projekttel tesztelheto. A public_id-t nem
-- rogzitjuk fixen: az app max+1 alapjan general, igy a kovetkezo szabad
-- sorszamot vesszuk, es ujrafuttatasnal nem lepteti tovabb.
insert into projects (id, name, address, client, phase, progress, public_id, created_at, updated_at)
select
  '1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a',
  'Test projekt 2',
  'Debrecen, Piac utca 42.',
  'Alfold Office Kft.',
  'Szerkezetkesz utani szakipar',
  31,
  'PRJ-' || lpad((coalesce(max(nullif(regexp_replace(public_id, '\D', '', 'g'), ''))::int, 0) + 1)::text, 3, '0'),
  '2026-07-28 08:10:00+00',
  '2026-07-28 08:10:00+00'
from projects
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address,
  client = excluded.client,
  phase = excluded.phase,
  progress = excluded.progress,
  updated_at = excluded.updated_at;
  -- public_id szandekosan kimarad: ujrafuttatasnal nem valtozhat


-- ---------------------------------------------------------------------------
-- 3) Hibak
-- ---------------------------------------------------------------------------
-- Harom hiba, hogy mind a negy eset eloalljon:
--   Test hiba 1: Test ceg 2 munkaja, 1. projekt
--     -> Teszt 1-nek IDEGEN ceg, de kozos projekt  (tulajdon-szukites bukja el)
--     -> Teszt 2-nek SAJAT, es tagja is           (ennek szerkesztehetonek kell lennie)
--   Test hiba 2: Test ceg 1 munkaja, 1. projekt
--     -> Teszt 1-nek SAJAT, es tagja is           (pozitiv kontroll)
--   Test hiba 3: Test ceg 1 munkaja, 2. projekt
--     -> Teszt 1-nek SAJAT ceg, de NEM tagja a projektnek
--        (projekt-szukites bukja el - ez a ket szabaly utkozese)
--     -> Teszt 2-nek idegen ceg, de tagja a projektnek
--        (ugyanaz forditva)
with base as (
  select coalesce(max(nullif(regexp_replace(public_id, '\D', '', 'g'), ''))::int, 100) as maxnum
  from issues
),
newrows as (
  select * from (values
    (
      '3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a'::uuid, 1,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b2b'::uuid,
      'Test hiba 1 - Test ceg 2, 1. projekt',
      'Teszt-adat. Test ceg 2 munkaja az 1. projektben. Teszt 1 felhasznalonak idegen ceg hibaja, Teszt 2 felhasznalonak sajat.',
      'B epulet - 2. emelet', 'Folyoso', 'Test szakma 2', 'Teszt 2',
      '2026-08-05'::date, 'open'::issue_status, 'high'::issue_priority, 95000
    ),
    (
      '3b3b3b3b-3b3b-4b3b-8b3b-3b3b3b3b3b3b'::uuid, 2,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a'::uuid,
      'Test hiba 2 - Test ceg 1, 1. projekt',
      'Teszt-adat. Test ceg 1 munkaja az 1. projektben. Teszt 1 felhasznalonak sajat ceg, es tagja is a projektnek - ennek szerkesztehetonek kell maradnia.',
      'A epulet - Foldszint', 'Lepcsohaz', 'Test szakma 1', 'Teszt 1',
      '2026-08-08'::date, 'assigned', 'normal', 140000
    ),
    (
      '3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c3c'::uuid, 3,
      '1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a'::uuid,
      '2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a'::uuid,
      'Test hiba 3 - Test ceg 1, 2. projekt',
      'Teszt-adat. Test ceg 1 munkaja a 2. projektben. Teszt 1 felhasznalonak sajat ceg, de nem tagja a projektnek - itt utkozik a ket szukites.',
      '3. emelet', 'Targyalo', 'Test szakma 1', 'Teszt 1',
      '2026-08-12'::date, 'assigned', 'high', 260000
    )
  ) as t(
    id, ord, project_id, subcontractor_id, title, description,
    location, area, trade, assignee_name, due_date, status, priority, value_huf
  )
)
insert into issues (
  id, public_id, project_id, subcontractor_id, title, description,
  location, area, trade, assignee_name, due_date, status, priority, value_huf,
  created_at, updated_at
)
select
  n.id,
  'HIB-' || (b.maxnum + n.ord)::text,
  n.project_id, n.subcontractor_id, n.title, n.description,
  n.location, n.area, n.trade, n.assignee_name, n.due_date, n.status, n.priority, n.value_huf,
  '2026-07-28 08:20:00+00', '2026-07-28 08:20:00+00'
from newrows n cross join base b
on conflict (id) do nothing;
-- "do nothing", nem "do update": ujrafuttatasnal a public_id nem szamozodhat ujra


-- ---------------------------------------------------------------------------
-- 4) A belepesek szerepe es ceghez kotese
-- ---------------------------------------------------------------------------
-- Csak azt a profilt modositjuk, amelyik VALODI Auth-fiokhoz tartozik
-- (auth_user_id egyezik). Amelyik fiok meg nincs letrehozva a Dashboardon,
-- arrol a fajl vegen NOTICE figyelmeztet - nem hiba, csak elmaradt lepes.
do $$
declare
  r record;
  v_profile uuid;
  v_company uuid;
  v_missing text[] := '{}';
begin
  for r in
    select * from (values
      ('admin@example.com',      'Teszt Admin',         'admin',           null),
      ('pm@example.com',         'Teszt Projektvezeto', 'project_manager', null),
      ('muvezeto@example.com',   'Teszt Muvezeto',      'site_manager',    null),
      ('teszt1@example.com',     'Teszt 1',             'subcontractor',   'Test ceg 1'),
      ('teszt2@example.com',     'Teszt 2',             'subcontractor',   'Test ceg 2'),
      ('megrendelo@example.com', 'Teszt Megrendelo',    'viewer',          null)
    ) as t(email, display_name, role, company)
  loop
    v_profile := null;
    v_company := null;

    if r.company is not null then
      select s.id into v_company from subcontractors s where s.name = r.company limit 1;
      if v_company is null then
        raise exception 'Nincs ilyen alvallalkozo ceg: %', r.company;
      end if;
    end if;

    update profiles p
    set display_name = r.display_name,
        role = r.role::app_role,
        company_name = coalesce(r.company, 'Duna Invest Zrt.'),
        subcontractor_id = v_company,
        is_active = true,
        updated_at = now()
    from auth.users u
    where u.id = p.auth_user_id
      and lower(u.email) = lower(r.email)
    returning p.id into v_profile;

    if v_profile is null then
      v_missing := v_missing || r.email;
    end if;
  end loop;

  if array_length(v_missing, 1) is not null then
    raise notice 'Ezekhez meg nincs Auth-fiok (hozd letre a Dashboardon, majd futtasd ujra): %',
      array_to_string(v_missing, ', ');
  else
    raise notice 'Mind a hat teszt-fiok beallitva.';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- 5) Projekt-tagsag
-- ---------------------------------------------------------------------------
-- A tagsag SZANDEKOSAN egyenetlen - ez maga a teszt:
--   muvezeto   -> csak az 1. projekt.   A Test projekt 2-t nem lathatja.
--   Teszt 1    -> csak az 1. projekt.   Van sajat cege hibaja a 2.-ban is
--                                       (Test hiba 3), de projekt-szinten kizart.
--   Teszt 2    -> MINDKET projekt.      A 2. projektben csak idegen ceg hibaja
--                                       van, tehat ott tulajdon-szinten zar ki.
--   megrendelo -> csak az 1. projekt.
--   admin / pm -> NINCS tagsaguk, es ez helyes: a megallapodas szerint ok
--                 atlepik a projekt-szintu szukitest (teljes portfolio).
--                 Ha megsem latjak mindket projektet, a bypass hibas.
insert into project_members (project_id, profile_id, role, can_view_project, can_manage_project, notes)
select m.project_id, p.id, p.role, true, false, 'Jogosultsagi teszt-adat (test-data-permissions.sql)'
from (values
  ('muvezeto@example.com',   '11111111-1111-4111-8111-111111111111'::uuid),
  ('teszt1@example.com',     '11111111-1111-4111-8111-111111111111'::uuid),
  ('teszt2@example.com',     '11111111-1111-4111-8111-111111111111'::uuid),
  ('teszt2@example.com',     '1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a'::uuid),
  ('megrendelo@example.com', '11111111-1111-4111-8111-111111111111'::uuid)
) as m(email, project_id)
join auth.users u on lower(u.email) = lower(m.email)
join profiles p on p.auth_user_id = u.id
on conflict (project_id, profile_id) do update set
  role = excluded.role,
  can_view_project = excluded.can_view_project,
  can_manage_project = excluded.can_manage_project,
  notes = excluded.notes,
  updated_at = now();


-- ---------------------------------------------------------------------------
-- Amit a teszt eldont
-- ---------------------------------------------------------------------------
--                      | Test hiba 1 | Test hiba 2 | Test hiba 3 | Test projekt 2
--   -------------------+-------------+-------------+-------------+---------------
--   Teszt 1 (ceg 1)    |  NEM (ceg)  |     IGEN    | NEM (proj.) |     NEM
--   Teszt 2 (ceg 2)    |     IGEN    |  NEM (ceg)  |  NEM (ceg)  |     IGEN
--   muvezeto           |     IGEN    |     IGEN    | NEM (proj.) |     NEM
--   admin / pm         |     IGEN    |     IGEN    |     IGEN    |     IGEN
--   megrendelo         |  csak olvas |  csak olvas | NEM (proj.) |     NEM
--
-- Ha barmelyik cella maskepp viselkedik az appban, ott van a hiba.


-- ---------------------------------------------------------------------------
-- Ellenorzo lekerdezesek
-- ---------------------------------------------------------------------------
-- 1) Ki milyen szerepben, melyik ceghez tartozik, es van-e belepese:
--      select p.display_name, p.email, p.role, s.name as ceg,
--             p.auth_user_id is not null as tud_belepni
--      from profiles p
--      left join subcontractors s on s.id = p.subcontractor_id
--      order by p.role, p.display_name;
--
-- 2) Melyik hiba melyik cege:
--      select i.public_id, pr.name as projekt, s.name as ceg, i.status
--      from issues i
--      join projects pr on pr.id = i.project_id
--      left join subcontractors s on s.id = i.subcontractor_id
--      order by pr.name, i.public_id;
--
-- 3) Ki melyik projekt tagja:
--      select pr.name as projekt, p.display_name, pm.role
--      from project_members pm
--      join projects pr on pr.id = pm.project_id
--      join profiles p on p.id = pm.profile_id
--      order by pr.name, p.display_name;
--
-- ---------------------------------------------------------------------------
-- Visszavonas (a teszt-adat eltavolitasa)
-- ---------------------------------------------------------------------------
--   delete from issues where id in (
--     '3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a',
--     '3b3b3b3b-3b3b-4b3b-8b3b-3b3b3b3b3b3b',
--     '3c3c3c3c-3c3c-4c3c-8c3c-3c3c3c3c3c3c');
--   delete from projects where id = '1a1a1a1a-1a1a-4a1a-8a1a-1a1a1a1a1a1a';
--   delete from subcontractors where id in (
--     '2a2a2a2a-2a2a-4a2a-8a2a-2a2a2a2a2a2a',
--     '2b2b2b2b-2b2b-4b2b-8b2b-2b2b2b2b2b2b');
--   -- a profilokat NEM toroljuk: az Auth-fiok torlese a Dashboardon tortenik
