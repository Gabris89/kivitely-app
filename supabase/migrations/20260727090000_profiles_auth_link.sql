-- Jogosultsagi munka 1. lepcso: "ki vagyok en".
-- A bejelentkezett Auth-felhasznalo osszekotese a profiles sorral, hogy az app
-- vegre a VALODI szerepet ismerje.
--
-- Elozmeny: a profiles / project_members tablak 2026-07-10 ota leteznek, de soha
-- nem lettek Auth-hoz kotve. Emiatt az app minden muveletnel a hardkodolt
-- "project_manager" szerepet hasznalta (workflow.ts / repository.ts), vagyis a
-- workflow-szabalyok tesztelese ertelmetlen volt: mindenki a legmagasabb jogu
-- szerepkent viselkedett.
--
-- Ez a migracio NEM korlatoz semmit. Csak azonossagot teremt:
--   1) oszlopjog, hogy a bejelentkezett felhasznalo kiolvashassa a sajat szerepet
--   2) a meglevo auth.users sorok osszekotese / hianyzo profil letrehozasa
--   3) trigger, hogy uj Auth-felhasznalohoz automatikusan szulessen profil
--
-- A tenyleges korlatozas (mit lathat / mit irhat egy szerep) a 2-4. lepcso,
-- lasd docs/permissions-plan.md.

-- 1) Oszlopjogok. Eddig csak (id, display_name) volt olvashato, ezert a role /
--    auth_user_id lekerdezese jogosultsagi hibara futott volna. Szandekosan csak
--    az "authenticated" szerep kapja meg, az "anon" nem.
grant select (id, display_name, role, auth_user_id, is_active, email, company_name, trade)
  on table profiles to authenticated;

-- 2a) Meglevo profilok osszekotese azonos e-mail alapjan.
update profiles p
set auth_user_id = u.id,
    updated_at = now()
from auth.users u
where p.auth_user_id is null
  and p.email is not null
  and lower(p.email) = lower(u.email);

-- 2b) Akinek van belepese, de nincs profilja, kapjon egyet.
--     Szerep: 'admin'. Indoklas: ma minden letezo fiok belsos, megbizhato
--     felhasznalo, es jelenleg is a legmagasabb jogokkal hasznalja az appot,
--     tehat ez NEM jogkiterjesztes, hanem a jelenlegi allapot rogzitese.
--     A kulsos (alvallalkozo / megrendelo) fiokok mar szukebb szereppel jonnek.
insert into profiles (auth_user_id, display_name, email, role)
select u.id,
       coalesce(nullif(u.raw_user_meta_data ->> 'display_name', ''), split_part(u.email, '@', 1)),
       u.email,
       'admin'
from auth.users u
where not exists (select 1 from profiles p where p.auth_user_id = u.id);

-- 3) Uj Auth-felhasznalohoz automatikusan profil, a LEGSZUKEBB szereppel.
--    Uj fiok tehat alapbol 'viewer' - a szerepet tudatosan kell megemelni a
--    profiles tablaban. Ez a "least privilege" alapallas.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, display_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    new.email,
    'viewer'
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Ellenorzo lekerdezes futtatas utan:
--   select p.display_name, p.email, p.role, p.auth_user_id is not null as linked
--   from profiles p order by p.role;

-- Visszavonas, CSAK veszhelyzetre:
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_auth_user();
--   revoke select (role, auth_user_id, is_active, email, company_name, trade)
--     on table profiles from authenticated;
