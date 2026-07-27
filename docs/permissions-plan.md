# Kivitely jogosultsági terv (4 lépcső)

Last reviewed: 2026-07-27

Ez a dokumentum azt írja le, MIKOR és MILYEN SORRENDBEN vezetjük be a valódi
jogosultságkezelést, és hogy az egyes lépcsők mit vállalnak be – illetve mit
szándékosan nem. A szerepek szándékolt tartalma (ki mit lásson) nem itt van,
hanem a `visibility-rls-plan.md`-ben; ez a fájl a végrehajtási sorrend.

## Miért most

Az akut biztonsági rés már zárva: a `20260724110000_revoke_anon_write_access.sql`
elvette az `anon` szerep írási jogát, az app a bejelentkezett felhasználó
session-jével, `authenticated` szerepben ír. Ami maradt, az nem lyuk, hanem
hiányzó képesség: **az app nem tudja, ki használja.**

Az időzítést egyetlen esemény szabja meg: **az első belépés, amit nem a saját
cégünkből kap valaki.** Amíg minden fióktulajdonos belsős, addig az "mindenki
mindent lát" fegyelmi kérdés. Amint egy alvállalkozó vagy egy megrendelő
(viewer) belép, üzleti problémává válik.

Az aggregált dashboard (2026-07-27) ezt közelebb hozta: a belépés utáni első
képernyő alvállalkozónkénti és projektenkénti pénzügyi adatot mutat
(leigazolatlan érték, kinél mennyi hiba áll). Egy alvállalkozó ma azonnal látná
a többi alvállalkozó számait. Vagyis a jogosultság mostantól az alvállalkozói
szerep bevezetésének **előfeltétele**, nem opció.

Enyhítő körülmény: minden DB-hívás egyetlen rétegen (`repository.ts`) megy át,
ezért a szűrés utólagos bevezetése egy helyen történik, nem húsz komponensben.
A halogatás ára itt lineáris, nem exponenciális.

## 1. lépcső – "ki vagyok én" (kész: 2026-07-27)

Azonosság, korlátozás nélkül.

- `supabase/migrations/20260727090000_profiles_auth_link.sql`
  - oszlopjog: `authenticated` olvashatja a saját `role` / `auth_user_id` mezőjét
  - meglévő `profiles` sorok összekötése `auth.users`-szel e-mail alapján
  - akinek van belépése, de nincs profilja, kap egyet `admin` szereppel – ez a
    **jelenlegi állapot rögzítése**, nem jogkiterjesztés: ma minden létező fiók
    belsős, és ma is teljes joggal használja az appot
  - trigger: új Auth-felhasználóhoz automatikusan születik profil, `viewer`
    szereppel (least privilege alapállás – a szerepet tudatosan kell megemelni)
- `src/lib/currentUser.ts`: az EGYETLEN hely, ahol eldől, ki a felhasználó és
  milyen szerepben van. `getCurrentUser()` (kérésenként cache-elve) és
  `getCurrentWorkflowRole()`.
- A hardkódolt `"project_manager"` eltűnt: a hiba állapotmozgatását szerveroldalon
  (`repository.ts` → `canMoveIssue`) és a UI-ban (`IssueDetailPanel` állapot-legördülő)
  is a valódi szerep dönti el.
- A menü alján látszik a bejelentkezett név és a szerep – ez a visszajelzés
  arról, hogy az app tényleg felismeri a szerepet.

Mit NEM csinál ez a lépcső: nem szűkíti a láthatóságot és nem nyúl az RLS-hez.

Nyitott apróság: ha egy szerep nem léphetne az adott állapotba, a mentés ma
csendben a régi állapotot tartja meg. A 2. lépcsőben ez látható hibaüzenet lesz.

### 1b. lépcső – megkeményítés (kész: 2026-07-27)

Migráció: `supabase/migrations/20260727140000_profiles_auth_hardening.sql`.
A 20260727090000 utólagos átnézése három eltérést talált a Supabase/Postgres
ajánlott gyakorlatától:

- **Túl sok oszlopjog.** A `role`/`email`/`company_name`/`trade` oszlopokra adott
  `select` jog a `profiles` már meglévő, mindenkit olvashatóvá tevő
  sor-policy-jével együtt azt jelentette, hogy bármely bejelentkezett
  felhasználó kiolvashatja az összes többi felhasználó e-mail címét és
  szerepét. Visszavonva. A saját profil elérése mostantól a
  `public.current_user_profile()` `security definer` függvényen keresztül megy,
  ami definíció szerint csak a hívó saját sorát adja vissza.
- **A trigger megbuktathatta a regisztrációt.** A Supabase dokumentáció külön
  figyelmeztet erre. Ha nincs e-mail (telefonos vagy egyes OAuth belépések), a
  `display_name not null` miatt a trigger hibázott volna, és a hiba a signup
  tranzakciót is elbuktatta volna. Most van fallback lánc és `exception`
  kezelő: a profil hibája soha nem blokkolja a belépést, csak `warning`-ot ír a
  logba. A `search_path` `''`-ra szigorítva (Supabase mostani ajánlása).
- **Hiányzott a foreign key.** A `profiles.auth_user_id` sima uuid volt. Most
  `references auth.users(id) on delete set null` – szándékosan nem `cascade`,
  mert a profilra hivatkozik a `work_logs`, `blocker_list`,
  `project_documents`, `plan_measurements` és a `project_members`: egy fiók
  törlésénél a munka történetének meg kell maradnia, csak a belépés szűnik meg.

Az app oldalán ezzel együtt a fallback **fail-closed** lett: bejelentkezve, de
érvényes profil nélkül a felhasználó `viewer` jogokat kap, nem
`project_manager`-t. A permisszív alapállás kizárólag a Supabase nélküli
demo-módra maradt meg (`DEMO_WORKFLOW_ROLE`). A `profiles.is_active = false`
mostantól azonnali kikapcsoló gomb: a fiók viewer-re esik vissza, és a menüben
"letiltva" jelzéssel látszik.

Tudatosan elhalasztva: a **JWT custom claims** (Custom Access Token Auth Hook).
A Supabase RBAC-ajánlása azért teszi a szerepet a tokenbe, hogy az RLS-szabályok
ne csináljanak `profiles`-alkérdést soronként. Amíg egyetlen RLS-szabály sem
használja, a hook csak plusz mozgó alkatrész (és stale-claim kockázat), ezért a
4. lépcső részeként jön.

## 2. lépcső – szerep szerinti tiltás az appban (kész: 2026-07-27)

Új fájlok: `src/lib/permissions.ts` (tiszta mátrix, kliensből is importálható)
és `src/lib/permissions.server.ts` (szerveroldali ellenőrzés), valamint
`src/components/AccessDenied.tsx`.

### Két védelmi réteg

1. **API route eleje** – `checkPermission(action)` azonnali 403-at ad vissza
   magyar üzenettel. Ez adja a jó felhasználói élményt.
2. **`repository.ts` írás-függvények eleje** – `requirePermission(action)`
   dob. Ez a tényleges védelem: mind a 24 írás-függvény ezen megy át, így egy
   később hozzáadott route sem tudja véletlenül kihagyni az ellenőrzést.

Az elrejtett gomb sehol nem helyettesíti ezt – a UI-oldali `can(role, action)`
csak azt éri el, hogy ne kínáljunk fel olyat, ami úgyis elbukna.

### A mátrix (`permissions.ts`)

| Művelet | admin | projektvezető | építésvezető | alvállalkozó | megtekintő |
| --- | --- | --- | --- | --- | --- |
| projekt létrehozás/módosítás | ✔ | ✔ | – | – | – |
| **projekt törlés** | ✔ | – | – | – | – |
| hiba létrehozás | ✔ | ✔ | ✔ | – | – |
| hiba módosítás (állapotléptetés) | ✔ | ✔ | ✔ | ✔ | – |
| hiba törlés | ✔ | ✔ | – | – | – |
| fénykép/bizonyíték feltöltés | ✔ | ✔ | ✔ | ✔ | – |
| akadály bejelentés | ✔ | ✔ | ✔ | ✔ | – |
| akadály módosítás | ✔ | ✔ | ✔ | – | – |
| dokumentum feltöltés | ✔ | ✔ | ✔ | – | – |
| mérés / kalibrálás | ✔ | ✔ | ✔ | – | – |
| alvállalkozó törzsadat | ✔ | ✔ | – | – | – |
| TIG csomag | ✔ | ✔ | – | – | – |
| **pénzügyi értékek (`money.view`)** | ✔ | ✔ | – | – | – |

Törlés általában admin + projektvezető; a projekt törlése viszont admin-only,
mert az az egész hibalistát viszi.

### Pénzügyi adatok

A `money.view` jog nélkül a dashboardon a Ft-összegek helyére darabszám kerül
(a „Leigazolatlan érték" kártya „Leigazolatlan tétel"-re vált, a TIG sávok
darabszám szerint skálázódnak, az alvállalkozói pénz-chip eltűnik) – a layout
nem esik szét. A TIG modult egyben zárjuk le, mert végig pénzügyi adatot mutat.

### Az elutasított állapotváltás

Eddig a `workflow.ts` által tiltott állapotváltás **némán** visszaesett a régi
állapotra, és a felhasználó „Hiba frissítve" üzenetet látott. Most a
`repository.ts` `ForbiddenError`-t dob konkrét szöveggel (melyik állapotból
melyikbe, milyen szerepkörrel), a route 403-ként adja vissza, az
`IssueDetailPanel` pedig a szerver üzenetét írja ki az általános helyett.

### Demo mód

Ha nincs Supabase konfigurálva (`isAuthConfigured() === false`), az ellenőrzés
nem fut: nincs valódi identitás és nincs valódi adat sem, csak a mock. Ez
környezeti változó szerinti döntés, nem futásidejű hibából adódó visszaesés.

### Ami tudatosan maradt a 3. lépcsőre

- Az alvállalkozó **bármelyik** hibát szerkesztheti, nem csak a sajátját. A
  tulajdonosi szűrés a `project_members` hatókörrel együtt jön.
- A `TigWorkspace`, `PlanMeasurementTool`, `EvidencePhotoGallery` és
  `SubcontractorForm` belső törlés-gombjai még nincsenek elrejtve; a szerver
  viszont már elutasítja őket értelmes üzenettel.

## 3. lépcső – projekt-hatókör (`project_members`)

- Csak azokat a projekteket látod, amelyeknek tagja vagy.
- Itt változnak a lekérdezések: a `repository.ts` lista-függvényei a tagsági
  táblára szűrnek, a projektváltó is csak a saját projekteket kínálja.

## 4. lépcső – RLS a Postgresben

- A valódi fal: akkor is tart, ha az appban hiba van, és a publishable kulccsal
  közvetlenül a REST API-t hívja valaki.
- Táblánkénti policy-k a `visibility-rls-plan.md` "Recommended RLS policy order"
  szakasza szerint, plusz a Storage bucketek átgondolása (ma publikus olvasás).
- Custom Access Token Auth Hook: a szerep bekerül a JWT-be, hogy a policy-k ne
  soronként kérdezzék le a `profiles` táblát (lásd 1b. lépcső).
- **Ennek készen kell lennie az első külsős fiók előtt.**

## Sorrend és költség

Az 1-2. lépcső kicsi és önmagában is hasznos (a workflow-szabályok végre
valódiak). A 3. közepes. A 4. a nagy falat, és ez a kritikus út a külsős
hozzáférés felé.
