-- Jogosultsagi munka 1. lepcso, megkemenyites (hardening).
-- A 20260727090000 migracio kiegeszitese. Az elozo migracio mukodik, de harom
-- ponton eltert a Supabase / Postgres ajanlott gyakorlatatol:
--
--   A) TUL SOK OSZLOPJOG. Az elozo migracio a role / email / company_name /
--      trade / auth_user_id / is_active oszlopokra is adott select jogot az
--      "authenticated" szerepnek. A profiles tablan viszont a
--      20260711080917 migracio ota van egy sor-szintu policy, ami MINDEN aktiv
--      profilt olvashatova tesz mindenkinek. A ketto egyutt azt jelentette,
--      hogy barmely bejelentkezett felhasznalo kiolvashatja az OSSZES tobbi
--      felhasznalo e-mail cimet, szerepet es ceget. Ez nem volt szandekos.
--
--   B) A TRIGGER MEGALLITHATTA A REGISZTRACIOT. A Supabase dokumentacio
--      kifejezetten figyelmeztet erre. Ha a display_name nem all elo (pl.
--      e-mail nelkuli belepes: telefon, egyes OAuth flow-k), a "not null"
--      megszoritas miatt a trigger hibara fut, es a hiba a signup tranzakciot
--      is megbuktatja: a felhasznalo NEM tud regisztralni.
--
--   C) NEM VOLT FOREIGN KEY. A profiles.auth_user_id csak egy uuid oszlop volt,
--      hivatkozas nelkul. Egy Auth-fiok torlese arva profilsort hagyott, amire
--      utana barmelyik uj fiok ravehette magat e-mail egyezes alapjan.
--
-- Ez a migracio ezt a harmat javitja. Uj funkciot nem ad, jogot nem bovit.

-- ---------------------------------------------------------------------------
-- A) Oszlopjogok visszaszukitese + sajat profil biztonsagos elerese
-- ---------------------------------------------------------------------------

-- Vissza a 20260711080917 allapotara: masok profiljabol csak az azonosito es a
-- nev lathato (ez kell a "felelos" cimkekhez a hibalistan). Se e-mail, se
-- szerep, se ceg.
revoke select (role, auth_user_id, is_active, email, company_name, trade)
  on table profiles from authenticated;

-- A sajat profilt viszont teljes egeszeben latnia kell a felhasznalonak. Mivel
-- az oszlopjog Postgresben nem tud sorfuggo lenni, erre a bevett megoldas egy
-- security definer fuggveny, ami definicio szerint CSAK a hivo sajat sorat adja
-- vissza. Igy nincs olyan lekerdezes, amivel valaki mas adatat el lehetne erni.
create or replace function public.current_user_profile()
returns table (
  id uuid,
  display_name text,
  role public.app_role,
  is_active boolean,
  email text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.display_name, p.role, p.is_active, p.email
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

-- Csak bejelentkezett felhasznalo hivhatja. A "public"-tol elvesszuk, hogy az
-- anon szerep se erje el.
revoke execute on function public.current_user_profile() from public;
grant execute on function public.current_user_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- B) A regisztracios trigger megkemenyitese
-- ---------------------------------------------------------------------------

-- Harom valtozas az elozo verziohoz kepest:
--   1. set search_path = ''  (ures, teljes minositessel) - ez a Supabase mostani
--      ajanlasa security definer fuggvenyekre, mert igy egy hamis sema nem tud
--      a fuggveny ala hamisitani sajat "profiles" tablat.
--   2. display_name fallback lanc, hogy e-mail nelkuli fioknal is legyen ertek.
--   3. exception handler: a profil letrehozasanak hibaja SOHA nem buktathatja
--      meg a regisztraciot. Ha megsem sikerul, a felhasznalo profil nelkul jon
--      letre - az app ezt mar kezeli (fail-closed: viewer jogok + lathato
--      "Nincs profil" jelzes a menuben), es a warning a Postgres logban lesz.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (auth_user_id, display_name, email, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      nullif(new.phone, ''),
      'Nevtelen felhasznalo'
    ),
    new.email,
    'viewer'
  )
  on conflict (auth_user_id) do nothing;
  return new;
exception
  when others then
    raise warning 'handle_new_auth_user() sikertelen (auth user %): %', new.id, sqlerrm;
    return new;
end;
$$;

-- A trigger definicioja valtozatlan, csak a fuggveny torzse cserelodott.

-- ---------------------------------------------------------------------------
-- C) Foreign key a profiles.auth_user_id oszlopra
-- ---------------------------------------------------------------------------

-- Elobb az arva hivatkozasok nullazasa, kulonben az FK letrehozasa elszallna.
update profiles p
set auth_user_id = null,
    updated_at = now()
where p.auth_user_id is not null
  and not exists (select 1 from auth.users u where u.id = p.auth_user_id);

alter table profiles drop constraint if exists profiles_auth_user_id_fkey;

-- "on delete set null", NEM cascade. Indoklas: a profiles sorra hivatkoznak a
-- work_logs, blocker_list, project_documents, plan_measurements es a
-- project_members tablak. Egy Auth-fiok torlesenel a MUNKA TORTENETENEK meg
-- kell maradnia (ki vette fel a hibat, ki igazolta a teljesitest) - csak a
-- belepesi lehetoseg szunik meg. A profil ilyenkor "belepes nelkuli
-- nevjegykent" el tovabb, pontosan ugy, mint egy alvallalkozoi kapcsolattarto.
alter table profiles
  add constraint profiles_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Ellenorzo lekerdezesek futtatas utan
-- ---------------------------------------------------------------------------
-- 1) A sajat profil latszik-e:
--      select * from public.current_user_profile();
--
-- 2) Masok adata NEM latszik-e (hibat kell dobnia "permission denied"-dal,
--    bejelentkezett felhasznalokent futtatva):
--      select email, role from profiles;
--
-- 3) Az FK a helyen van-e:
--      select conname, confdeltype from pg_constraint
--      where conrelid = 'profiles'::regclass and contype = 'f';
--    A confdeltype ertekenek 'n' (set null) kell lennie.

-- Visszavonas, CSAK veszhelyzetre:
--   alter table profiles drop constraint if exists profiles_auth_user_id_fkey;
--   drop function if exists public.current_user_profile();
--   grant select (role, auth_user_id, is_active, email, company_name, trade)
--     on table profiles to authenticated;
