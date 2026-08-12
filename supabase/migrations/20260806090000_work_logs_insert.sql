-- Teljesitmenynaplo: BESZURAS engedelyezese (eddig csak olvasas volt).
--
-- A "Mai munka rogzitese" (munkas kezdokepernyo) flow-hoz kell: a terepi
-- munkavallalo (worker -> subcontractor jogszint) es a projekt csapata beir egy
-- napi bejegyzest. A hatokor ugyanaz, mint a SELECT policy-nal (20260730130000):
-- csak olyan projektbe irhat, amelynek tagja - a DB-szintu parja az app
-- getSupabaseProjectDbId() fojtopontjanak.
--
-- Nem hasznal service-role/secret kulcsot: kontrollalt authenticated policy.

grant insert on table work_logs to authenticated;

drop policy if exists "insert work logs" on work_logs;

create policy "insert work logs" on work_logs
  for insert
  to authenticated
  with check (
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
--   drop policy if exists "insert work logs" on work_logs;
--   revoke insert on table work_logs from authenticated;
