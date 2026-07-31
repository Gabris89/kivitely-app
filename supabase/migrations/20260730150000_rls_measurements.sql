-- RLS 4. lepcso, 7. lepes: terv-meresek es kalibraciok.
--   plan_measurements, plan_calibrations
--
-- Elozmeny: "read plan measurements" es "read plan calibrations" using(true).
--
-- Ezek a project_documents gyerekei (document_id-n keresztul), sajat project_id
-- nelkul. A dokumentumon mar van RLS (5. lepes), ezert egy "document_id in
-- (select id from public.project_documents)" subquery a szulo hatokoret orokli.
-- Ez a DB-szintu parja a getScopedDocumentId() fojtopontnak (repository.ts).

drop policy if exists "read plan measurements" on plan_measurements;

create policy "read plan measurements" on plan_measurements
  for select
  to authenticated
  using ( document_id in (select id from public.project_documents) );

drop policy if exists "read plan calibrations" on plan_calibrations;

create policy "read plan calibrations" on plan_calibrations
  for select
  to authenticated
  using ( document_id in (select id from public.project_documents) );

-- ── Visszavonas ──────────────────────────────────────────────────────────────
--   drop policy if exists "read plan measurements" on plan_measurements;
--   create policy "read plan measurements" on plan_measurements
--     for select to anon, authenticated using (true);
--   drop policy if exists "read plan calibrations" on plan_calibrations;
--   create policy "read plan calibrations" on plan_calibrations
--     for select to anon, authenticated using (true);
