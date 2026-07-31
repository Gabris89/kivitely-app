-- RLS 4. lepcso, 8. lepes: subcontractors (cegek torzsadata).
--
-- Elozmeny: "read subcontractors" using(true) - ma mindenki minden ceget lat.
--
-- A cegnevek listaja onmagaban uzleti informacio (ki dolgozik a megrendelonek),
-- ezert az alvallalkozo csak a SAJAT ceget lathatja. A tobbi szerep (portfolio,
-- site_manager, viewer) minden ceget lat - nekik ez a dolguk. Ez a repository.ts
-- listSubcontractors (1139. sor) parja.
--
-- A ceg-nelkuli alvallalkozo: company_filtered=true, subcontractor_id=null ->
-- "id = null" sosem igaz -> egy ceget sem lat (fail-closed, mint az app DENY_ALL).

drop policy if exists "read subcontractors" on subcontractors;

create policy "read subcontractors" on subcontractors
  for select
  to authenticated
  using (
    not public.current_user_is_company_filtered()
    or id = public.current_user_subcontractor_id()
  );

-- ── Visszavonas ──────────────────────────────────────────────────────────────
--   drop policy if exists "read subcontractors" on subcontractors;
--   create policy "read subcontractors" on subcontractors
--     for select to anon, authenticated using (true);
