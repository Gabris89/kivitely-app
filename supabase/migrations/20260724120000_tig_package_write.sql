-- TIG csomag írási út: új mezők + KIZÁRÓLAG authenticated írási jogok/policy-k.
-- (Az anon írási lyuk lezárása után ezt a mintát követjük: új írható tábla is
--  csak authenticated szerepnek enged írni, sosem anon.)

-- 1) Új mezők a tig_packages-en (számlázás-közeli, de MVP-minimum).
alter table tig_packages
  add column if not exists net_value_huf numeric(14, 2) default 0,
  add column if not exists performance_date date,
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists note text;

-- 2) Jogok: írás CSAK authenticated. (A select grant anon+authenticated-re már
--    korábban megvolt mindkét táblán.)
grant insert, update, delete on table tig_packages to authenticated;
grant insert, delete on table tig_package_issues to authenticated;

-- 3) RLS + policy-k (idempotens: az enable no-op, ha már be volt kapcsolva; a
--    policy-kat előbb eldobjuk, hogy újrafuttatható legyen). Olvasás marad
--    anon+authenticated (mint a többi tábla), írás csak authenticated.
alter table tig_packages enable row level security;
alter table tig_package_issues enable row level security;

drop policy if exists "read tig packages" on tig_packages;
create policy "read tig packages" on tig_packages
  for select to anon, authenticated using (true);

drop policy if exists "write tig packages" on tig_packages;
create policy "write tig packages" on tig_packages
  for all to authenticated using (true) with check (true);

drop policy if exists "read tig package issues" on tig_package_issues;
create policy "read tig package issues" on tig_package_issues
  for select to anon, authenticated using (true);

drop policy if exists "write tig package issues" on tig_package_issues;
create policy "write tig package issues" on tig_package_issues
  for all to authenticated using (true) with check (true);
