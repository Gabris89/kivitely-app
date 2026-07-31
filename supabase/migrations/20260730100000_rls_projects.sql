-- RLS 4. lepcso, 2. lepes: projects SELECT hatokorre szukitese.
--
-- Elozmeny (rls-audit.sql alapjan): a projects tablan RLS BE VAN kapcsolva, a
-- SELECT policy "read projects" using(true) - vagyis ma mindenki minden
-- projektet lat DB-szinten. Ezt csereljuk hatokor-tudatosra.
--
-- Fugg: 20260730090000 (current_user_is_portfolio / _is_company_filtered /
-- _subcontractor_id) es 20260728120000 (current_user_project_ids).
--
-- A predikatum a src/lib/visibility.ts parja:
--   - portfolio szerep (admin/employer/pm)  -> minden projekt
--   - site_manager / viewer                 -> tagsagi projektjei
--   - subcontractor (ceggel)                -> tagsagi projektjei
--   - subcontractor ceg NELKUL              -> egy sem (fail-closed, mint az app DENY_ALL)
-- A projects-nel a projekt SAJAT id-je a kulcs (nem project_id).
--
-- Az uj policy szandekosan CSAK authenticated: az anon (kijelentkezett) szerep
-- igy policy nelkul marad -> default deny -> ures. Az app amugy is csak
-- authenticated szerver-klienssel olvas.

drop policy if exists "read projects" on projects;

create policy "read projects" on projects
  for select
  to authenticated
  using (
    public.current_user_is_portfolio()
    or (
      id in (select public.current_user_project_ids())
      and (
        not public.current_user_is_company_filtered()
        or public.current_user_subcontractor_id() is not null
      )
    )
  );

-- ── Ellenorzes a tabla-migracio utan ─────────────────────────────────────────
--   npm run test:e2e:permissions   (az app tovabbra is a helyes hatokort mutatja)
--   npm run test:e2e -- rls-direct  (a DB MAGA szur - ha be van allitva az env)
--
-- ── Visszavonas (ha kizar valakit) ───────────────────────────────────────────
--   drop policy if exists "read projects" on projects;
--   create policy "read projects" on projects
--     for select to anon, authenticated using (true);
