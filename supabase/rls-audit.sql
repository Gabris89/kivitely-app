-- RLS 4. lepcso, 0. LEPES: a DB valos allapotanak felmerese.
--
-- MIERT KELL: nehany tablan (projects, issues, subcontractors, blocker_list)
-- az RLS a Supabase dashboardbol lett bekapcsolva, nem tracked migraciobol.
-- Ezert a repobol NEM tudhato, mely tablakon van egyaltalan RLS, es milyen
-- policy-k vannak rajtuk. Ez a lekerdezes ezt deriti fel - NEM modosit semmit.
--
-- HASZNALAT: futtasd a Supabase SQL editorban, es kuldd vissza a TELJES
-- eredmenytablat. Egyetlen lekerdezes, egyetlen eredmeny - igy a Supabase
-- editor biztosan megmutatja (tobb kulon utasitasnal csak az utolso latszana).
--
-- Amit az eredmenybol kiolvasok:
--   rls_on            = be van-e kapcsolva az RLS az adott tablan
--   policy / cmd      = milyen policy-k vannak most (r=SELECT, a=INSERT, w=UPDATE, d=DELETE, *=ALL)
--   using_feltetel    = a SELECT policy feltetele; a "true" a permissziv (ezt csereljuk)
--
-- A "(nincs policy)" sor + rls_on=true azt jelenti: RLS be van kapcsolva, de
-- nincs engedelyezo policy -> a tabla jelenleg URES mindenkinek (ezt is tudni kell).

select
  c.relname                              as tabla,
  c.relrowsecurity                       as rls_on,
  c.relforcerowsecurity                  as rls_forced,
  coalesce(p.policyname, '(nincs policy)') as policy,
  p.cmd                                  as muvelet,
  p.roles                                as szerepek,
  p.qual                                 as using_feltetel
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policies p
  on p.schemaname = 'public' and p.tablename = c.relname
where c.relkind = 'r'
  and c.relname in (
    'projects','issues','issue_evidence','issue_events',
    'blocker_list','work_logs','project_documents',
    'tig_packages','tig_package_issues',
    'plan_measurements','plan_calibrations','subcontractors'
  )
order by c.relname, p.cmd nulls first, p.policyname;
