-- RLS 4. lepcso, 3. lepes: issues SELECT hatokorre szukitese (projekt ES ceg).
--
-- Elozmeny: "read issues" using(true) - ma mindenki minden hibat lat DB-szinten.
-- Ez a legfontosabb tabla: itt van a ket dimenzios szures (projekt + ceg).
--
-- A predikatum a src/lib/visibility.ts + repository.ts (listSupabaseIssues, 695.
-- sor) parja:
--   - portfolio                 -> minden hiba
--   - site_manager / viewer     -> a tagsagi projektek MINDEN hibaja
--   - subcontractor (ceggel)    -> a tagsagi projektek, csak a SAJAT cege hibai
--   - subcontractor ceg nelkul  -> egy sem (a "= null" egyenloseg sosem igaz)
--
-- A ceg-nelkuli alvallalkozot itt kulon orzo-feltetel nelkul is kizarja: ha
-- current_user_subcontractor_id() null, a "subcontractor_id = null" sosem igaz.

drop policy if exists "read issues" on issues;

create policy "read issues" on issues
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

-- ── Visszavonas ──────────────────────────────────────────────────────────────
--   drop policy if exists "read issues" on issues;
--   create policy "read issues" on issues
--     for select to anon, authenticated using (true);
