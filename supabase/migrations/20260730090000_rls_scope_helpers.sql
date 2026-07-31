-- RLS 4. lepcso, 1. lepes: scope-segedfuggvenyek.
--
-- Ez a migracio VISELKEDEST MEG NEM VALTOZTAT: csak harom security definer
-- fuggvenyt vezet be, amikre a kesobbi tabla-policy-k epulnek. Ugyanaz a minta,
-- mint a current_user_project_ids() / current_user_profile() eseteben
-- (20260728120000, 20260727140000): security definer + ures search_path, es a
-- vegrehajtas joga csak az authenticated szerepnek.
--
-- A harom fuggveny a src/lib/visibility.ts logikajanak SQL-parja. A cel, hogy
-- az RLS PONTOSAN azt a hatokort kenyszeritse ki, amit ma az app szur - a
-- ket oldal ne csusszon szet.
--
-- A szerep-terkep (lasd src/lib/currentUser.ts workflowRoleByAppRole):
--   admin, employer, project_manager  -> portfolio (mindent lat)
--   site_manager, viewer              -> tagsagi projekt, minden ceg
--   worker, subcontractor             -> tagsagi projekt, csak sajat ceg
--
-- Az employer szandekosan portfolio: a workflow szempontjabol admin-ekvivalens.
-- A worker ES a subcontractor is ceg-szurt: a folyamatban ugyanaz a ket szerep.

-- ── Portfolio szerep-e a hivo? (mindent lat, tagsag nelkul is) ───────────────
create or replace function public.current_user_is_portfolio()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active
      and p.role in ('admin', 'employer', 'project_manager')
  );
$$;

-- ── Ceg-szurt szerep-e a hivo? (worker vagy subcontractor) ───────────────────
-- Ezt kulon jelezzuk, mert a "van-e cege" es a "ceg-szurt-e" ket kulon kerdes:
-- egy ceghez meg nem rendelt alvallalkozo ceg-szurt, de nincs cege -> semmit
-- sem lathat (fail-closed, ugyanugy mint az appban a DENY_ALL).
create or replace function public.current_user_is_company_filtered()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.is_active
      and p.role in ('worker', 'subcontractor')
  );
$$;

-- ── A hivo cege (profiles.subcontractor_id), vagy null ───────────────────────
-- null lehet azert, mert (a) nem ceg-szurt szerep, vagy (b) ceg-szurt, de nincs
-- ceghez kotve. A policy-k a current_user_is_company_filtered()-el egyutt
-- ertelmezik: ha ceg-szurt es a ceg null, a "= null" egyenloseg SOHA nem igaz,
-- tehat egyetlen sor sem lathato - pontosan a kivant fail-closed viselkedes.
create or replace function public.current_user_subcontractor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.subcontractor_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.is_active
  limit 1;
$$;

-- A public (igy az anon) szerep ne erje el oket; csak a belepett felhasznalo.
revoke execute on function public.current_user_is_portfolio() from public;
revoke execute on function public.current_user_is_company_filtered() from public;
revoke execute on function public.current_user_subcontractor_id() from public;

grant execute on function public.current_user_is_portfolio() to authenticated;
grant execute on function public.current_user_is_company_filtered() to authenticated;
grant execute on function public.current_user_subcontractor_id() to authenticated;

-- ── Ellenorzes (belepett felhasznalokent futtatva) ───────────────────────────
--   select public.current_user_is_portfolio(),
--          public.current_user_is_company_filtered(),
--          public.current_user_subcontractor_id();
--
-- Vart ertekek a teszt-fiokoknal:
--   admin/pm          -> true,  false, null
--   epitesvezeto/megt.-> false, false, null
--   teszt1/teszt2     -> false, true,  <a ceg uuid-ja>

-- ── Visszavonas (vesz eseten) ────────────────────────────────────────────────
--   drop function if exists public.current_user_is_portfolio();
--   drop function if exists public.current_user_is_company_filtered();
--   drop function if exists public.current_user_subcontractor_id();
