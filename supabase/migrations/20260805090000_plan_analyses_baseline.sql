-- AI-alapu tervelemzes (tervfeldolgozas MVP, 1. iteracio).
--
-- Egy plan_analyses sor = a felhasznalo kijelolt egy teglalapot egy tervlapon
-- (project_documents), es strukturalt helyiseg-adatot (kod/nev/alapterulet/
-- belmagassag/burkolat) nyert belole, forras- es biztonsagi jelolessel. A
-- kijeloles es az eredmeny normalizalt/strukturalt JSON - reprodukalhato barmely
-- render-felbontasnal, ugyanugy mint a plan_measurements.
--
-- Az eredeti feltoltott fajlt nem erinti. A matematika (szarmaztatott mennyiseg)
-- a Kivitely backendjen tortenik, itt csak a strukturalt bemenetet taroljuk.
--
-- FONTOS: a plan_measurements baseline hibajat NEM ismeteljuk - itt mar az elso
-- migracioban a SCOPED policy-mintat hasznaljuk (document_id in (select id from
-- public.project_documents)), a 20260730150000_rls_measurements.sql szerint. Ez a
-- getScopedDocumentId() fojtopont DB-szintu parja.

create table if not exists plan_analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references project_documents(id) on delete cascade,
  page_number integer not null default 1 check (page_number >= 1),
  selection jsonb not null,
  calculation_type text not null default 'room_info',
  result jsonb not null,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  user_verified boolean not null default false,
  created_by_profile_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plan_analyses_document on plan_analyses(document_id, page_number);

grant select, insert, update, delete on table plan_analyses to authenticated;

alter table plan_analyses enable row level security;

drop policy if exists "read plan analyses" on plan_analyses;
drop policy if exists "insert plan analyses" on plan_analyses;
drop policy if exists "update plan analyses" on plan_analyses;
drop policy if exists "delete plan analyses" on plan_analyses;

-- Olvasas: csak a lathato dokumentumok elemzesei (a szulo hatokoret orokli).
create policy "read plan analyses"
on plan_analyses for select
to authenticated
using ( document_id in (select id from public.project_documents) );

-- Beszuras: csak lathato dokumentumhoz, ervenyes JSON kijelolessel/eredmennyel.
create policy "insert plan analyses"
on plan_analyses for insert
to authenticated
with check (
  document_id in (select id from public.project_documents)
  and jsonb_typeof(selection) = 'object'
  and jsonb_typeof(result) = 'object'
);

-- Frissites (verifikalas/szerkesztes): csak lathato dokumentum elemzesen.
create policy "update plan analyses"
on plan_analyses for update
to authenticated
using ( document_id in (select id from public.project_documents) )
with check ( document_id in (select id from public.project_documents) );

-- Torles: csak lathato dokumentum elemzesen.
create policy "delete plan analyses"
on plan_analyses for delete
to authenticated
using ( document_id in (select id from public.project_documents) );

-- ── Visszavonas ──────────────────────────────────────────────────────────────
--   drop table if exists plan_analyses;
