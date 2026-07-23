# TIG write flow – terv (design)

Cél: a teljesítésigazolási (TIG) csomag **írhatóvá** tétele — létrehozás, tételek kezelése, állapotátmenetek, származtatott érték/bizonyíték —, logikusan és a magyar építőipari gyakorlathoz igazodva, a most bevezetett biztonsági (authenticated) mintára építve.

## 1. Domain-alap (miért így)

A **teljesítésigazolás** (TIG) az a dokumentum, amellyel a megrendelő/fővállalkozó igazolja, hogy a (al)vállalkozó a szerződött munkát (vagy annak egy részét/mérföldkövét) elvégezte, megadva az igazolt mennyiséget/értéket. Gyakorlati jelentősége:

- Ez a **számla kiállításának alapja** — TIG nélkül nincs jogszerű számla a munkáról.
- A rajta szereplő **teljesítési dátum** köti az ÁFA teljesítési időpontját.
- Vita esetén az építőiparban a Teljesítésigazolási Szakértői Szerv (TSZSZ) jár el (191/2009. Korm. rendelet kontextus).

Tartalmi minimum a gyakorlatban: felek (megrendelő + teljesítő/alvállalkozó), szerződés/projekt hivatkozás, az igazolt munka (megnevezés/mennyiség), elszámolási időszak, **nettó érték**, **teljesítési dátum**, aláírás(ok).

**Kivitelyre lefordítva:** egy TIG-csomag = *egy alvállalkozó elfogadott, bizonyított munkatételeinek igazolt csomagja*. A „tétel" a meglévő modellben a **`tig_ready` állapotú hiba** (elvégzett + fotóval bizonyított + elfogadott munka), amelynek `valueHuf` az értéke. Nem vezetünk be új számviteli „igazságot" — a TIG marad *előkészítő/bizonyító* réteg, ahogy a domain-baseline is kéri.

## 2. Jelenlegi állapot (amire építünk)

- Séma: `tig_packages(id, project_id, subcontractor_id, public_id, status='draft', gross_value_huf, created_at, updated_at)` + `tig_package_issues(tig_package_id, issue_id)` join.
- `listTigPackages(projectId)` már **valósan olvas** (authenticated kliens). `mapTigPackage` a `proofCount`-ot fixen **0**-ra teszi.
- `listTigItems()` **mock** adatot ad — a TIG-oldal „TIG-be kerülő tételek" listája nem valós.
- **Nincs** create/update/delete TIG függvény, nincs `api/tig` route.
- A TIG-oldal teljesen read-only, a PDF „később".

## 3. Adatmodell-változások

Új migráció (`authenticated`-only jogokkal, sosem anon — a mostani biztonsági minta szerint):

`tig_packages` – új, opcionális mezők (MVP-minimum, számvitel túl-modellezése nélkül):

- `performance_date date` – teljesítési dátum (ÁFA-időpont alapja).
- `period_start date`, `period_end date` – elszámolási időszak (opcionális).
- `note text` – megjegyzés/hivatkozás (szerződés, mérföldkő).
- (a `subcontractor_id` mostantól gyakorlatilag kötelező a csomaghoz — a TIG mindig egy alvállalkozóhoz szól.)

`gross_value_huf`: **draftban származtatott** (a kapcsolt hibák `valueHuf` összege, élőben), **jóváhagyáskor befagyasztva** (snapshot a `tig_packages`-be), hogy az elfogadott érték ne változzon utólag.

`proofCount`: **származtatott**, nem tárolt fix érték — a kapcsolt hibákhoz tartozó `issue_evidence` sorok (ill. `photosBefore + photosAfter`) száma. A `mapTigPackage` ezt a join-adatból számolja.

## 4. Állapotgép (lifecycle) és átmenetek

Megtartjuk a 4 meglévő állapotot, egyértelmű átmenetekkel és kapukkal:

- **draft (Piszkozat)** – szerkeszthető: tételek hozzáadása/elvétele, metaadat (teljesítési dátum, időszak, megjegyzés). Érték/proof élőben számolt.
- **ready_for_review (Ellenőrzésre vár)** – beküldve ellenőrzésre. **Validációs kapu**: minden kapcsolt hibának legyen meg a kötelező bizonyítéka (`requiredProof`), értéke (`valueHuf > 0`) és műszaki leírása; a csomagban legyen legalább 1 tétel és kiválasztott alvállalkozó.
- **approved (Elfogadva)** – az ellenőrző elfogadta: az **érték és a proofCount befagy** (snapshot), a tétel-lista zárolódik.
- **sent (Kiküldve)** – a TIG kiállítva/kiküldve az alvállalkozónak (ez lesz a számla alapja).

Visszalépés: `ready_for_review → draft` engedélyezett (javításhoz). `approved`/`sent` után csak explicit „újranyitás" (audit-megjegyzéssel) — MVP-ben elég a `draft`-ra visszaengedni approved előtt. (Egy későbbi `settled/paid` állapot most szándékosan kimarad.)

## 5. Írási műveletek (repository + API)

Új repository függvények (mind `getServerSupabaseClient()`-en, authenticated):

- `createTigPackage({ projectId, subcontractorId, issueIds[], performanceDate?, note? })` → beszúrás `tig_packages`-be (status='draft', public_id generálás a meglévő mintára), majd `tig_package_issues` sorok. Visszaadja a csomagot.
- `setTigPackageIssues(packageId, issueIds[])` → a join-sorok szinkronizálása (draft állapotban).
- `updateTigPackageMeta(packageId, { performanceDate, periodStart, periodEnd, note })`.
- `moveTigPackageStatus(packageId, nextStatus)` → átmenet-validációval; `approved`-nál a `gross_value_huf` és (opcionálisan) egy proof-snapshot beírása.
- `deleteTigPackage(packageId)` → csak draftban.
- `listTigCandidateIssues(projectId, subcontractorId)` → a **mock `listTigItems` helyett**: a projekt adott alvállalkozójához tartozó `tig_ready` hibák, amelyek még nincsenek aktív csomagban. Ez adja a kiválasztható tételeket.

Új API route-ok (RESTes, a meglévő mintára), pl.:

- `POST /api/projects/{projectId}/tig` – csomag létrehozása.
- `PATCH /api/tig/{packageId}` – metaadat / tétel-lista / állapot.
- `DELETE /api/tig/{packageId}`.
- `GET /api/projects/{projectId}/tig/candidates?subcontractor=…` – jelölt hibák.

## 6. Readiness / validációs szabályok (a „TIG-ready" jel)

A `tig_ready` **származtatott készültségi jel** marad (nem kőbe vésett státusz), a domain-baseline szerint. Egy hiba akkor jelölt egy TIG-csomagba, ha:

- állapota `tig_ready` (vagy `tigReady` flag igaz),
- megvan a `requiredProof` szerinti bizonyíték (pl. before/after fotó),
- van `valueHuf` és műszaki leírás.

A csomag `ready_for_review`-ba lépéséhez minden benne lévő tételnek teljesítenie kell ezeket — a hiányzókat a UI jelzi (nem néma tiltás).

## 7. UI-folyamat (mobil-first)

A TIG-oldalon:

1. **„➕ Új TIG csomag"** → alvállalkozó kiválasztása → megjelennek a `tig_ready` jelölt hibák (valós lista) → pipálás → *Létrehoz* (draft).
2. **Draft nézet**: tételek hozzáadása/elvétele, teljesítési dátum + megjegyzés, élő összérték és proof-szám.
3. **„Ellenőrzésre beküld"** → validációs kapu; hiányok listázva.
4. **„Elfogad"** → érték/proof befagy, tétel-lista zárol.
5. **„Kiküldve"** → állapot lezárása; innen jön később a PDF/Excel export (külön lépés).

A meglévő read-only lista és PDF-előnézet ehhez igazodik (a checkbox-ok élővé válnak draftban).

## 8. Biztonság (kötelező, a mostani mintára)

- Minden új írás **`authenticated`** szerepben fut (repository → `getServerSupabaseClient`), soha nem anon.
- A migráció a `tig_packages` és `tig_package_issues` insert/update/delete jogát **kizárólag `authenticated`**-nek adja, `to anon` nélkül — nem nyitjuk vissza a most bezárt lyukat.
- RLS policy-k `to authenticated`, `with check` a projekt-hovatartozásra szűkíthető később (MVP-ben `true`, de authenticated-only).

## 9. Javasolt megvalósítási sorrend (kis, tesztelhető körök)

1. **Migráció**: új mezők + `authenticated`-only write grantok/policy-k a TIG-táblákra.
2. **Read valósítás**: `listTigCandidateIssues` + `proofCount` származtatás (a mock `listTigItems` kiváltása). Ettől már valós adatot lát a felület, írás nélkül is.
3. **Create + tétel-kezelés** (draft): repository + API + UI „Új csomag".
4. **Állapotátmenetek + validáció** (ready_for_review → approved → sent).
5. **(Külön) Export**: PDF/Excel — a backlog önálló tétele, a write flow után.

## 10. Nyitott döntések (ezeket kérdezem tőled)

- **Mezők köre:** elég az MVP-minimum (teljesítési dátum + megjegyzés), vagy kell rögtön nettó érték + elszámolási időszak is?
- **Export a scope-ban:** most csak a write flow-t építjük (export később), vagy egy minimális **nyomtatható HTML/PDF** kerüljön bele a végére?
- **Érték forrása:** a csomag értéke a kapcsolt hibák `valueHuf` összege legyen (ezt javaslom), vagy tételenként kézzel felülírható?

## Források

- 191/2009. (IX. 15.) Korm. rendelet az építőipari kivitelezési tevékenységről — https://net.jogtar.hu/jogszabaly?docid=a0900191.kor
- Teljesítési igazolás: mikor kötelező, mit tartalmaz (CashMan) — https://www.cmfx.hu/2025/05/21/teljesitesi-igazolas-mikor-kotelezo-mit-tartalmaz-hogyan-hasznaljuk/
- Teljesítésigazolással kapcsolatos követelmények (Számviteli Levelek) — https://szamvitelilevelek.hu/levelek/2025/06/12/9940/
