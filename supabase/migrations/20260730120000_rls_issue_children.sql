-- RLS 4. lepcso, 4. lepes: issues gyerek-tablai (evidence, events).
--
-- Elozmeny: "read issue evidence" es "read issue events" using(true).
--
-- Ezeknek nincs sajat project_id-juk, a lathatosagot a SZULO hibatol oroklik.
-- Mivel az issues-on mar van RLS (3. lepes), egy "issue_id in (select id from
-- public.issues)" subquery automatikusan a szulo RLS-et alkalmazza: csak a
-- lathato hibak id-jai jonnek vissza. Igy a ket dimenzios szures (projekt+ceg)
-- ingyen oroklodik ide.

drop policy if exists "read issue evidence" on issue_evidence;

create policy "read issue evidence" on issue_evidence
  for select
  to authenticated
  using ( issue_id in (select id from public.issues) );

drop policy if exists "read issue events" on issue_events;

create policy "read issue events" on issue_events
  for select
  to authenticated
  using ( issue_id in (select id from public.issues) );

-- ── Visszavonas ──────────────────────────────────────────────────────────────
--   drop policy if exists "read issue evidence" on issue_evidence;
--   create policy "read issue evidence" on issue_evidence
--     for select to anon, authenticated using (true);
--   drop policy if exists "read issue events" on issue_events;
--   create policy "read issue events" on issue_events
--     for select to anon, authenticated using (true);
