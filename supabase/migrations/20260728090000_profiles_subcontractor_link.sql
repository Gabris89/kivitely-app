-- Jogosultsagi munka 3. lepcso, 1. szakasz: KI KINEK DOLGOZIK.
--
-- A 3. lepcso (docs/permissions-plan.md) azt igeri, hogy az alvallalkozo csak a
-- SAJAT hibajat szerkesztheti. Ez ma nem kifejezheto. A profiles tabla a
-- belepest irja le, a subcontractors tabla a torzsadatban levo ceget, es a ketto
-- kozott nincs kapcsolat. Az issues.subcontractor_id a cegre mutat, de a
-- bejelentkezett felhasznalorol nem tudjuk megmondani, melyik ceghez tartozik,
-- ezert a "sajat hiba" fogalmanak nincs adatalapja.
--
-- Ez a migracio CSAK az adatalapot teremti meg. Jogot nem bovit es nem szukit:
-- egyetlen policy sem valtozik, es amig az app nem szur, addig a viselkedes is
-- valtozatlan. A szures a kovetkezo szakaszban, az app oldalan kapcsol be.

-- ---------------------------------------------------------------------------
-- A) profiles -> subcontractors kapcsolat
-- ---------------------------------------------------------------------------

-- Szandekosan "on delete set null", nem cascade: ha egy alvallalkozo ceg kikerul
-- a torzsadatbol, a hozza tartozo belepes maradjon meg (ugyanaz az elv, mint a
-- profiles.auth_user_id-nal a 20260727140000-ben: a munka tortenete tullep az
-- egyes rekordokon). A kapcsolat elvesztese fail-closed hatasu: cegkapcsolat
-- nelkul egyetlen hiba sem szamit sajatnak, tehat kevesebb jogot jelent, nem
-- tobbet.
alter table profiles
  add column if not exists subcontractor_id uuid references subcontractors(id) on delete set null;

comment on column profiles.subcontractor_id is
  'Melyik alvallalkozo ceghez tartozik ez a belepes. A subcontractor/worker szerepnel ertelmezett; ez donti el, hogy egy hiba sajat-e (egyezes az issues.subcontractor_id-val).';

-- A visszafele iranyu kerdeshez kell ("melyik belepesek tartoznak ehhez a
-- ceghez"), amit a kesobbi tagsag-kezelo felulet hasznal.
create index if not exists idx_profiles_subcontractor on profiles(subcontractor_id);

-- ---------------------------------------------------------------------------
-- B) A sajat profil lekerdezese lassa az uj mezot
-- ---------------------------------------------------------------------------
-- A profiles oszlopjogai a 20260727140000 ota vissza vannak szukitve, ezert az
-- app a sajat profiljat ezen a security definer fuggvenyen keresztul kapja meg.
-- Az uj oszlop csak akkor jut el az apphoz, ha a fuggveny is visszaadja.
--
-- A "returns table" szerkezete valtozik, es a Postgres a visszateresi tipust nem
-- engedi "create or replace"-szel modositani, ezert eloszor el kell dobni. A
-- drop a jogokat is elviszi, igy a revoke/grant part meg kell ismetelni.
drop function if exists public.current_user_profile();

create function public.current_user_profile()
returns table (
  id uuid,
  display_name text,
  role public.app_role,
  is_active boolean,
  email text,
  subcontractor_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.role, p.is_active, p.email, p.subcontractor_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

revoke execute on function public.current_user_profile() from public;
grant execute on function public.current_user_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- C) issues.created_by: letezett, de senki nem toltotte
-- ---------------------------------------------------------------------------
-- Az oszlop a 20260706210901 ota megvan, hivatkozas nelkuli uuid-kent, es az app
-- soha nem irt bele: minden sorban null. A blocker_list-nek van
-- created_by_profile_id mezoje, a hibaknak nem volt megfeleloje, igy meg az sem
-- volt megallapithato, ki rogzitette a hibat. Mostantol az app tolti; itt csak a
-- hivatkozast tesszuk a helyere, hogy ne kerulhessen bele nem letezo profilra
-- mutato ertek.

-- Ovintezkedes: ha barmi keznel keszult adat maradt volna az oszlopban, azt
-- nullazzuk, kulonben a foreign key felvetele elszallna. Uzemszeruen ez nulla
-- sort erint.
update issues
set created_by = null
where created_by is not null
  and not exists (select 1 from profiles p where p.id = issues.created_by);

alter table issues
  drop constraint if exists issues_created_by_fkey;

alter table issues
  add constraint issues_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

comment on column issues.created_by is
  'Melyik profil vette fel a hibat. A 20260728090000 ota tolti az app; a korabbi sorokban null marad (visszamenoleg nem allapithato meg).';

-- ---------------------------------------------------------------------------
-- Ellenorzo lekerdezesek
-- ---------------------------------------------------------------------------
-- 1) A sajat profil visszaadja-e az uj mezot (bejelentkezett felhasznalokent):
--      select * from public.current_user_profile();
--
-- 2) A ket foreign key a helyen van-e, es "set null"-lal ('n' a confdeltype):
--      select conname, confdeltype from pg_constraint
--      where conname in ('profiles_subcontractor_id_fkey', 'issues_created_by_fkey');
--
-- 3) Masok adata tovabbra sem latszik-e (permission denied kell):
--      select email, role from profiles;

-- Visszavonas, CSAK veszhelyzetre:
--   alter table issues drop constraint if exists issues_created_by_fkey;
--   drop index if exists idx_profiles_subcontractor;
--   alter table profiles drop column if exists subcontractor_id;
--   -- majd a 20260727140000-beli current_user_profile() ujra letrehozasa.
