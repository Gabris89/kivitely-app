# Aggregált dashboard – terv

Készült: 2026-07-27
Státusz: elfogadva, implementáció ezzel a dokumentummal együtt indul

Kapcsolódó dokumentumok:

- [navigation-redesign-brief.md](navigation-redesign-brief.md) – a "Dashboard/Áttekintés" fogalom túlterheltsége (ez a terv erre reagál)
- [improvement-backlog.md](improvement-backlog.md) – "Aggregate dashboard reporting" use case ötlet, ez a tétel
- [tig-write-flow-plan.md](tig-write-flow-plan.md) – a TIG csomag státuszgép, amire a pénzügyi blokk épül
- [progress-log.md](progress-log.md) – ide kerül a kész tétel bejegyzése

## 1. Miért

A Kivitely ma **rögzítő** alkalmazás: hibát viszünk fel, fotózunk, státuszt
mozgatunk, TIG csomagot állítunk össze. Ez a terepi szereplőnek (művezető,
alvállalkozó) elég ok arra, hogy naponta megnyissa. A **megrendelőnek és a
projektvezetőnek viszont nincs napi oka rá** – nekik nem az egyedi hiba
érdekes, hanem az összkép: mennyi pénz áll leigazolatlanul, ki csúszik, hol
áll a projekt.

A cél tehát nem "még egy riportoldal", hanem: **az áttekintő oldalak
válaszoljanak arra a négy kérdésre, amit egy vezető reggel feltesz.**

1. Mennyi pénz áll bent leigazolatlanul? (pénz)
2. Ki csúszik a legjobban? (alvállalkozó)
3. Hol tart a hibalista? (folyamat)
4. Mi akadályoz? (kockázat)

## 2. Hol jelenjen meg – nem lesz új menüpont

**Döntés: nem hozunk létre új route-ot.** A navigációs brief kifejezetten
problémának jelölte, hogy a "dashboard" szó több, egymástól eltérő dolgot
takar az appban. Egy külön `/projects/[projectId]/dashboard` oldal pontosan
ezt a hibát ismételné meg: lenne "Áttekintés" ÉS "Dashboard" ugyanabban a
menüben, és a felhasználónak kellene kitalálnia, melyikben mi van.

Helyette a **két, már létező "Áttekintés" oldalt töltjük fel tartalommal**:

| Útvonal | Ma | Ezután |
| --- | --- | --- |
| `/` (Minden projekt) | 4 db számláló + 2 sáv-diagram | Portfólió-szintű aggregált dashboard, projektenkénti bontással |
| `/projects/[projectId]` | Modul-indító linklista + projekt adatlap | Projekt-szintű aggregált dashboard; a modul-lista alá kerül |

Így a menü szerkezete **nem változik**, viszont az "Áttekintés" végre azt
jelenti, amit a neve ígér. A projekt oldalon a modul-linklista megmarad
(mobilon ez a leggyorsabb belépő a modulokba), csak a dashboard alá csúszik.

## 3. Tartalom – négy blokk

A blokkok sorrendje szándékosan a fenti négy kérdés sorrendje. Ami pénz,
az van felül.

### 3.1 KPI sor (mind a két scope)

Négy szám, a meglévő `.dashboard-stats` / `.stat-card` primitívekkel:

- **Nyitott hibák** – minden, ami nem `closed`
- **Lejárt hibák** – `dueDate < ma` és még nincs lezárva/elfogadva
- **Aktív akadályok** – `open` / `in_progress` / `waiting_external`
- **Leigazolatlan érték** – TIG-ready, de még jóváhagyott csomagba nem került nettó érték

A negyedik a lényeg: ez az a szám, amit ma senki nem lát az appban, pedig
ez a modul üzleti értelme.

### 3.2 Pénz / TIG csatorna

A TIG csomagok **státusz szerinti értéke** (`draft` → `ready_for_review` →
`approved` → `sent`), csomagszámmal és összeggel, vízszintes sávként.
Mellette egy külön sor: **"TIG-ready, csomagba nem tett"** – azok a hibák,
amik készen állnak az elszámolásra, de senki nem tette be őket csomagba.
Ez a tétel a leggyakoribb valós pénzvesztés a kivitelezésben: elvégzett,
igazolható munka, ami soha nem lesz kiszámlázva.

### 3.3 Alvállalkozói teljesítmény

Alvállalkozónként egy sor, csökkenő "csúszás" szerint rendezve:

- nyitott hibák száma
- ebből lejárt
- átlagos átfutás nyitástól lezárásig (nap)
- leigazolatlan (TIG-ready, csomagon kívüli) érték

Az átlagos átfutás **közelítés**: az `updatedAt - createdAt` különbség a
lezárt hibákon. Az app ma nem tárol külön `closed_at` mezőt, és nem akarunk
emiatt migrációt – a kód kommentben jelölve van, hogy ez proxy, és hogy hol
kell javítani, ha egyszer lesz státuszváltás-napló.

### 3.4 Folyamat és akadályok

- **Hibák állapot szerint** – a meglévő sáv-diagram, változatlanul
- **Akadályok** – aktív darabszám, ebből kritikus, átlagos kor napban, és a
  3 legrégebben nyitott akadály címe. Az "X napja áll" mindig többet mond,
  mint a puszta darabszám.

### 3.5 Csak a globális nézetben: projektenkénti bontás

Projektenként egy sor: nyitott hibák, lejárt hibák, aktív akadályok,
leigazolatlan érték – a projekt nevére kattintva át lehet ugrani a projekt
saját áttekintőjére. Ez adja a "melyik projektemmel van baj" választ.

## 4. Technikai megvalósítás

### 4.1 Nincs migráció, nincs új tábla

Minden szám a már meglévő adatokból származtatható (`issues`, `blocker_list`,
`tig_packages`, `tig_package_issues`, `projects`, `subcontractors`). Ez
szándékos: a dashboard **olvasási réteg**, nem új adatmodell. Ha később
kiderül, hogy egy szám lassú, akkor jöhet materializált nézet – de nem
előre.

### 4.2 Új fájl: `src/lib/dashboard.ts` – tiszta függvények

Az aggregáció **nem** a repository-ba kerül, hanem külön modulba, és
kizárólag **már betöltött tömbökön** dolgozik (`Issue[]`, `BlockerItem[]`,
`TigPackage[]`, `Project[]`). Két oka van:

1. `repository.ts` már 2300+ sor, és az I/O réteg maradjon I/O réteg.
2. Tiszta függvény = **tesztelhető I/O nélkül**. A backlogban külön tétel,
   hogy nulla teszt van a repóban; ez az első modul, ami olcsón tesztelhető
   lesz, amikor sorra kerül.

Fő belépési pont: `buildDashboardData({ projects, issues, blockers, tigPackages })`.

### 4.3 Repository: egyetlen additív változás

`listTigPackages(projectId)` → `listTigPackages(projectId?)`. Ha nincs
projectId, minden projekt csomagját adja vissza (a globális nézethez), és a
select kiegészül a `projects(public_id, name)` join-nal, hogy a csomagot
projekthez lehessen kötni. A `TigPackage.projectId` mezőt eddig egyetlen
komponens sem használta, így az ott lévő nyers UUID → publikus azonosító
csere nem tör el semmit.

### 4.4 Megjelenítés: `src/components/DashboardView.tsx`

Szerver komponens (nincs interaktivitás, nincs `"use client"`), egyetlen
`scope: "global" | "project"` propon dől el, mit rajzol. **Nincs új
diagram-könyvtár** – a meglévő `.bar-chart` / `.bar-track` / `.bar-fill`
CSS primitívekkel dolgozunk, plusz egy szűk, új osztálykészlet a
metrikatáblához. Egy chart-lib (recharts/chart.js) 100+ kB kliens JS lenne
azért, amit itt három `div` megold – terepi mobilneten ez nem mindegy.

## 5. Amit szándékosan NEM csinálunk meg most

- **Trend / idősor** ("az elmúlt 30 nap nyitott vs. lezárt hibái"). Ehhez
  státuszváltás-történet kellene, ami ma nincs (az `issue_events` tábla
  csak részben töltött). Külön tétel lesz, ha kell.
- **Export.** A dashboard képernyőre való; a TIG csomag exportja már megvan.
- **Szűrők** (időszak, szakma). Először legyen tartalom, aztán szűrő.
- **Szerepkör szerinti eltérő nézet.** Amíg a jogosultsági réteg hardkódolt
  (`canMoveIssue(..., "project_manager")`), addig a szerepfüggő dashboard
  csak látszatfunkció lenne.

## 6. Kész állapot – ellenőrzőlista

- [ ] `/` és `/projects/[projectId]` mindkettő valódi aggregált tartalmat mutat
- [ ] Nincs új menüpont, a navigáció szerkezete változatlan
- [ ] Nincs új npm függőség
- [ ] Mobilon (≤720px) egyoszlopos, nem lóg ki, a sávok olvashatók
- [ ] Üres állapot (nulla hiba / nulla csomag) is értelmes mondatot ad, nem 0-kat és NaN-t
- [ ] `tsc --noEmit` tiszta
