-- RLS 4. lepcso, 6. lepes: tig_packages (projekt+ceg) es tig_package_issues.
--
-- KULONLEGESSEG (az audit alapjan): ezeken a tablakon NEM kulon SELECT policy
-- van, hanem egy "write ..." policy `for ALL` using(true). Egy ALL policy USING
-- feltetele a SELECT-re IS ervenyes! Ezert ha csak a "read ..." policy-t
-- cserelnenk, az ALL policy using(true)-ja OR-ral tovabbra is permissziv SELECT-et
-- adna. Emiatt az ALL policy-t is el kell dobni, es az irast (insert/update/delete)
-- kulon, VALTOZATLAN (permissziv) policy-kkent visszaadni - az iras-szigoritas
-- kulon, kesobbi kor. Igy a jelenlegi iras-viselkedes megmarad, csak az OLVASAS
-- valik hatokor-tudatossa.
--
-- tig_packages ceg-szurt (van subcontractor_id, az app szur ra - listTigPackages
-- 1347. sor). tig_package_issues a szulotol orokli a hatokort (projekt+ceg egyben).

-- ── tig_packages ─────────────────────────────────────────────────────────────
drop policy if exists "read tig packages" on tig_packages;
drop policy if exists "write tig packages" on tig_packages;

create policy "read tig packages" on tig_packages
  for select
  to authenticated
  using (
    public.current_user_is_portfolio()
    or (
      project_id in (select public.current_user_project_ids())
      and (
        not public.current_user_is_company_filtered()
        or subcontractor_id = public.current_user_subcontractor_id()
      )
    )
  );

-- Iras valtozatlan (authenticated, permissziv) - a szerep-ellenorzest az app
-- vegzi (checkPermission "tig.*"). A DB-szintu iras-szigoritas kesobbi kor.
create policy "insert tig packages" on tig_packages
  for insert to authenticated with check (true);
create policy "update tig packages" on tig_packages
  for update to authenticated using (true) with check (true);
create policy "delete tig packages" on tig_packages
  for delete to authenticated using (true);

-- ── tig_package_issues (a szulo lathatosagat orokli) ─────────────────────────
drop policy if exists "read tig package issues" on tig_package_issues;
drop policy if exists "write tig package issues" on tig_package_issues;

create policy "read tig package issues" on tig_package_issues
  for select
  to authenticated
  using ( tig_package_id in (select id from public.tig_packages) );

create policy "insert tig package issues" on tig_package_issues
  for insert to authenticated with check (true);
create policy "update tig package issues" on tig_package_issues
  for update to authenticated using (true) with check (true);
create policy "delete tig package issues" on tig_package_issues
  for delete to authenticated using (true);

-- ── Visszavonas ──────────────────────────────────────────────────────────────
--   drop policy if exists "read tig packages" on tig_packages;
--   drop policy if exists "insert tig packages" on tig_packages;
--   drop policy if exists "update tig packages" on tig_packages;
--   drop policy if exists "delete tig packages" on tig_packages;
--   create policy "read tig packages"  on tig_packages for select to anon, authenticated using (true);
--   create policy "write tig packages" on tig_packages for all    to authenticated using (true) with check (true);
--   (ugyanigy tig_package_issues-ra)
