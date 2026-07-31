-- RLS 4. lepcso, 5. lepes: projekt-scope-olt tablak, ceg-szures NELKUL.
--   blocker_list, work_logs, project_documents
--
-- Ezeknek van project_id-juk, de NINCS subcontractor_id-juk, es az app sem szur
-- rajuk cegre (listBlockers / listWorkLogs / listProjectDocuments csak
-- scope.projectIds-t hasznal). Ezert egy alvallalkozo a tagsagi projektjeiben
-- MINDEN akadalyt / naplot / dokumentumot lat - a ceg csak a hibaknal szamit.
-- A ceg-nelkuli alvallalkozot viszont itt is ki kell zarni (app DENY_ALL), ezert
-- a "has company" orzo-feltetel.
--
-- Harom kulonlegesseg az audit alapjan:
--   - blocker_list-en KET SELECT policy van ("read active..." es "read all...");
--     MINDKETTOT eldobjuk, kulonben az OR-kapcsolas miatt permissziv maradna.
--   - work_logs-on RLS be van kapcsolva, de NINCS SELECT policy -> ma mindenkinek
--     URES. Az uj policy ezt egyben javitja is: a tagsagi naplok lathatova valnak.
--   - a "read active blocker list" statusz-szurest is levesszuk: az app ma minden
--     statuszu akadalyt olvas (reszletezo oldal, teljes lista).

-- ── blocker_list ─────────────────────────────────────────────────────────────
drop policy if exists "read all blocker list" on blocker_list;
drop policy if exists "read active blocker list" on blocker_list;

create policy "read blocker list" on blocker_list
  for select
  to authenticated
  using (
    public.current_user_is_portfolio()
    or (
      project_id in (select public.current_user_project_ids())
      and (
        not public.current_user_is_company_filtered()
        or public.current_user_subcontractor_id() is not null
      )
    )
  );

-- ── work_logs (eddig nem volt SELECT policy) ─────────────────────────────────
drop policy if exists "read work logs" on work_logs;

create policy "read work logs" on work_logs
  for select
  to authenticated
  using (
    public.current_user_is_portfolio()
    or (
      project_id in (select public.current_user_project_ids())
      and (
        not public.current_user_is_company_filtered()
        or public.current_user_subcontractor_id() is not null
      )
    )
  );

-- ── project_documents ────────────────────────────────────────────────────────
drop policy if exists "read project documents" on project_documents;

create policy "read project documents" on project_documents
  for select
  to authenticated
  using (
    public.current_user_is_portfolio()
    or (
      project_id in (select public.current_user_project_ids())
      and (
        not public.current_user_is_company_filtered()
        or public.current_user_subcontractor_id() is not null
      )
    )
  );

-- ── Visszavonas ──────────────────────────────────────────────────────────────
--   drop policy if exists "read blocker list" on blocker_list;
--   create policy "read all blocker list" on blocker_list
--     for select to anon, authenticated using (true);
--   drop policy if exists "read work logs" on work_logs;   -- (eredetileg nem volt)
--   drop policy if exists "read project documents" on project_documents;
--   create policy "read project documents" on project_documents
--     for select to anon, authenticated using (true);
