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

Mit NEM csinál ez a lépcső: nem vesz el jogot senkitől, nem szűkíti a
láthatóságot, nem nyúl az RLS-hez. Ha valamiért nincs `profiles` sor, a
`FALLBACK_WORKFLOW_ROLE = "project_manager"` a korábbi viselkedést tartja meg –
szándékosan nem `viewer`, mert egy hiányzó sor nem zárhatja ki a saját
felhasználóinkat.

Nyitott apróság: ha egy szerep nem léphetne az adott állapotba, a mentés ma
csendben a régi állapotot tartja meg. A 2. lépcsőben ez látható hibaüzenet lesz.

## 2. lépcső – szerep szerinti tiltás az appban

- Szerveroldali ellenőrzés az API route-okban (nem csak elrejtett gomb – az
  elrejtett gomb nem védelem).
- A dashboard pénzügyi blokkjai szerepfüggő változatot kapnak (alvállalkozó a
  saját számait látja, a többiekét nem).
- Írási műveletek (hiba/akadály létrehozás, TIG csomag, dokumentum-feltöltés,
  törlés) szerephez kötése.
- Elutasított művelet esetén értelmes hibaüzenet.

## 3. lépcső – projekt-hatókör (`project_members`)

- Csak azokat a projekteket látod, amelyeknek tagja vagy.
- Itt változnak a lekérdezések: a `repository.ts` lista-függvényei a tagsági
  táblára szűrnek, a projektváltó is csak a saját projekteket kínálja.

## 4. lépcső – RLS a Postgresben

- A valódi fal: akkor is tart, ha az appban hiba van, és a publishable kulccsal
  közvetlenül a REST API-t hívja valaki.
- Táblánkénti policy-k a `visibility-rls-plan.md` "Recommended RLS policy order"
  szakasza szerint, plusz a Storage bucketek átgondolása (ma publikus olvasás).
- **Ennek készen kell lennie az első külsős fiók előtt.**

## Sorrend és költség

Az 1-2. lépcső kicsi és önmagában is hasznos (a workflow-szabályok végre
valódiak). A 3. közepes. A 4. a nagy falat, és ez a kritikus út a külsős
hozzáférés felé.
