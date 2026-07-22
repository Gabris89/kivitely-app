# Kivitely chapter demo felkészülés

Lokális munkadokumentum egy későbbi angol chapter presentation előkészítéséhez.

## Cél

Bemutatni, hogyan indult egy valós, domain-specifikus MVP fejlesztése AI segítséggel:

- hogyan alakult ki a termékötlet és a domain modell
- hogyan bontottuk kezelhető fejlesztési lépésekre
- hogyan használtuk a mock adatokat, Supabase-t, migrációkat és UI iterációkat
- hogyan dokumentáltuk az elágazó ötleteket és későbbi terveket
- hogyan teszteltünk, commitoltunk, pusholtunk
- milyen tanulságokat vihet magával egy kezdő fejlesztő vagy csapat

## Rövid történetív

1. Egy építőipari workflow problémából indultunk: hibák, fotós bizonyítás, alvállalkozók, teljesítésigazolás.
2. Először nem a teljes rendszert akartuk megépíteni, hanem egy működő MVP vázat.
3. Mock adatokkal indultunk, hogy gyorsan lehessen UI-t és flow-t ellenőrizni.
4. Ezután fokozatosan kötöttünk be Supabase read/write útvonalakat.
5. Minden nagyobb domain irány előtt külön schema baseline, seed és read-only UI készült.
6. A részleteket nem próbáltuk egyszerre véglegesíteni: amit még nem tudtunk, docs fájlba tettük.
7. A fejlesztés kis, ellenőrizhető egységekben haladt: implementáció, lint/build, kézi teszt, commit, push.
8. A mobil UX közben valós használati tapasztalatok alapján alakult.

## Lehetséges előadás címe

**Building a Domain-Specific MVP with AI Assistance**

Magyar munkacím:

**Hogyan indítottunk el egy építőipari MVP-t AI segítséggel**

## Slide vázlat

### 1. Kiinduló probléma

- Építőipari terepi folyamatok nehezen követhetők.
- Hibák, fotók, alvállalkozói státuszok és teljesítésigazolás sokszor szétszórt csatornákon futnak.
- Cél: mobil-first, egyszerű, terepen is használható workflow.

### 2. Mi a Kivitely?

- Mobil-first construction workflow MVP.
- Fő modulok:
  - Hibalista
  - Hiba részletező
  - Fotós bizonyítás
  - Akadálylista
  - Teljesítménynapló
  - Dokumentumok / Tervek
  - TIG előkészítés

### 3. Hogyan indultunk?

- Nem teljes specifikációból, hanem domain inputokból és iterációkból.
- Első cél: működő, kattintható MVP mock adatokkal.
- A mock fallback végig fontos maradt, hogy Supabase hiba vagy hiányzó config mellett is tesztelhető legyen az app.

### 4. Architektúra vázlat

- Next.js app router frontend és API route-ok.
- Repository réteg Supabase read + mock fallback mintával.
- Supabase PostgreSQL:
  - projects
  - issues
  - issue_events
  - issue_evidence
  - profiles
  - project_members
  - work_logs
  - blocker_list
  - project_documents
- Supabase Storage:
  - issue evidence képek
- Auth és teljes RLS még későbbi scope.

### 5. Fejlesztési stratégia

- Először schema baseline.
- Utána idempotens seed.
- Utána read-only UI.
- Csak ezután kontrollált write útvonal.
- Minden új írásnál:
  - minimális API route
  - minimális grant / policy
  - mock fallback
  - lint/build
  - kézi teszt

### 6. Példa iteráció: issue evidence

Lépések:

1. Metadata-only evidence rekordok.
2. Read-only megjelenítés.
3. Supabase Storage bucket és policy.
4. Mobil képfeltöltés.
5. In-app képnézegető.
6. Törlés.
7. Mobil / desktop viewer finomítás.

Tanulság:

- Nem egyszerre építettünk “tökéletes fotómodult”.
- Minden lépés működő, visszatesztelhető állapot volt.

### 7. Példa iteráció: mobil UX

- Először működött, de nem volt elég kényelmes mobilon.
- Alsó navigáció túlzsúfolt volt.
- Külön branch készült mobil navigáció refaktorra.
- Desktop sidebar megmaradt, mobilon 4 fő elem + Menu drawer lett.
- Később az issue detail nézetet is többször finomítottuk valós telefonos visszajelzések alapján.

### 8. Példa iteráció: dokumentum-megnyitás, hydration hiba és PDF-nézegető

**Gyakorlati tipp — valódi telefonos tesztelés helyi hálózaton.** Az egész iteráció alatt a fejlesztői szervert így indítottuk, hogy telefonról is elérhető legyen ugyanazon a Wi-Fi-n:

```
npm run dev -- -H 0.0.0.0
```

Amit ez jelent: a `--` választja el az `npm run dev` saját argumentumait attól, amit ő maga tovább ad a mögötte futó `next dev` parancsnak. A `-H 0.0.0.0` (hostname) mondja meg a Next.js dev szervernek, hogy ne csak a saját gépről (`localhost`) fogadjon kapcsolatot, hanem a gép **összes** hálózati interfészéről — vagyis a helyi Wi-Fi-n lévő más eszközök (pl. egy telefon) is elérik a gép LAN IP-címén (pl. `192.168.0.136:3000`). Enélkül a dev szerver alapból csak `localhost`-ról érhető el, egy telefon nem tudna csatlakozni hozzá. Ez tette lehetővé, hogy minden mobil-specifikus hibát (hydration, iframe PDF-korlát, CSS-elrendezés) valós telefonon, élőben lehessen tesztelni és screenshotolni, nem csak a böngésző asztali eszköz-emulációjával.

Ez az iteráció jó demópélda arra, hogy az AI-asszisztált munka nem "egyből eltalálja" a megoldást, hanem strukturáltan diagnosztizál, valós rendszerállapotot ellenőriz, és több körben, valós eszközös visszajelzésre iterál.

Kiinduló panasz: a `/documents` oldalon feltöltött dokumentumoknál nem jelent meg a "Fájl megnyitása" gomb, és mobilon React hydration hiba jelentkezett.

**Mi az a hydration hiba?** Next.js (és React SSR általában) egy oldalt kétszer épít fel: először a szerver renderel kész HTML-t (gyors, azonnal látható tartalom), majd a böngészőben a React "hidratálja" ezt a HTML-t — rákapcsolja az interaktivitást (eseménykezelők, állapot). Ehhez a React feltételezi, hogy amit a böngészőben újraszámol, pontosan egyezik azzal, amit a szerver küldött. Ha eltérés van — más szöveg, más attribútum, más elemsorrend —, a React hydration hibát/figyelmeztetést ad, mert nem biztos benne, hogy rá tudja-e biztonságosan kapcsolni a logikát a meglévő HTML-re. Leggyakoribb okok: a kód másképp viselkedik szerveren és böngészőben (pl. aktuális idő, `window` ellenőrzés, időzóna-függő formázás), vagy — mint itt — egy böngésző-kiegészítő módosítja a HTML-t még hidratálás előtt, amit a React nem tud megkülönböztetni egy valódi kódhibától.

Lépések:

1. **Root cause a kódnál kezdődött, de nem ott ért véget.** A `repository.ts` write/read logikája elsőre helyesnek tűnt kódolvasásra. Ahelyett, hogy ebből indultunk volna ki, közvetlen `curl` hívással teszteltük az élő Supabase REST API-t az anon kulccsal — ez derítette ki, hogy a `project_documents` táblán be volt kapcsolva a Row Level Security, de select policy nem tartozott hozzá, ezért minden olvasás csendben 0 sort adott vissza (nem hibát), és az app mindig a mock adatra esett vissza. Ez sosem derült volna ki pusztán a TypeScript-kód átolvasásából.
2. **A hydration hibát sem találgatással próbáltuk eltüntetni.** Ahelyett hogy azonnal `suppressHydrationWarning`-ot tettünk volna mindenhová, elolvastuk a dev szerver tényleges log fájlját (`.next/dev/logs/next-development.log`), ami megmutatta a pontos attribútum-eltérést: egy `__gcruniqueid` nevű attribútumot egy böngésző-kiegészítő szúrt be minden form-mezőbe, még React hidratálás előtt. Ez alapján a `suppressHydrationWarning` célzott, indokolt használata volt a helyes válasz — nem "elrejtés", hanem egy azonosított, külső okra adott szabványos React-válasz.
3. **A PDF-megnyitás több kör alatt konvergált a jó megoldáshoz, valódi telefonos teszteléssel:**
   - v1: egyszerű "Új fülön" link — működött, de nem érződött app-élménynek.
   - v2: kép- és PDF-nézegető modal épült, PDF-nél iframe + `#zoom=page-width` paraméterrel — elméletben jó ötlet, de élő iPhone-on kiderült, hogy a mobil Safari iframe-be ágyazott, több oldalas PDF-nél csak az első oldalt mutatja, és nem lehet benne görgetni. Ezt sem lehetett volna build/lint/curl teszttel felfedezni, csak valódi eszközön.
   - Mivel a valódi javításnak (saját, canvas-alapú PDF-renderelő) érdemi effort- és megbízhatóság-trade-offja volt (új dependency, worker-beállítás), ezt nem eldöntöttük az AI helyett, hanem explicit megkérdeztük: natív böngésző-megnyitás maradjon, vagy épüljön saját PDF.js-alapú nézegető. A döntés a felhasználóé volt.
   - v3: saját `pdfjs-dist`-alapú, canvas-ra rajzoló nézegető épült — az első verzió telefonos screenshot alapján derült ki, hogy CSS-hibás (a gombsor egymás alá torlódott, nagy üres sáv keletkezett). Ez is csak valós eszközképernyőn látszott, nem a kódban.
   - v4: a beágyazott flex-struktúra helyett egy lapos, egyszerűbb elrendezés, és a canvas igazítás `fit-content` helyett `align-items: flex-start`-ra cserélve.
   - v5: két további valós visszajelzés — rossz felbontás (hiányzott a `devicePixelRatio`-alapú élesítés) és hogy csak gombbal lehetett lapozni, nem függőleges pöccintéssel/görgetéssel, ahogy egy mobil PDF-nézegetőtől megszokott. Mindkettőt megoldottuk: retina-éles renderelés, és az oldalak folyamatos, görgethető oszlopba rendezése, automatikusan frissülő oldalszámlálóval.

Tanulság:

- Root cause-t rendszerállapot-ellenőrzéssel (élő API-hívás, tényleges log fájl) derítettünk ki, nem találgatással vagy a legkézenfekvőbb "biztos ez a hiba" feltételezéssel.
- Böngésző-/eszközspecifikus hibák (hydration, iframe PDF-korlátok, CSS-elrendezés, felbontás) gyakran csak valódi eszközön derülnek ki — build, lint és `curl` teszt ezekhez nem elég, ez explicit korlátja volt az AI-nak ebben a körben, amit végig kommunikáltunk.
- Amikor egy javításnak valódi effort/megbízhatóság-trade-offja van, jobb megkérdezni a döntéshozót, mint találgatni a helyette hozott döntést.
- Több kis, egymásra épülő, valós visszajelzésen alapuló kör gyorsabban konvergált a jó megoldáshoz, mint egy nagy, egyszerre "tökéletesre" tervezett próbálkozás lett volna.

### 9. Példa iteráció: terv-mérő eszköz (Konva) és valós eszközös hibavadászat

Feladat: Attila ötlete (AI-alapú mennyiségszámítás tervekből) első, kockázatmentes lépéseként egy kalibrálható terv-mérő eszköz épült a dokumentum-nézegetőbe — két pont kijelölésével kalibrálható a méretarány, utána terület/hossz mérhető a feltöltött terven, `react-konva`-val rajzolva, AI nélkül.

Tanulság (egyik sem derült volna ki `npm run build`/`npm run lint`-ből, mindegyiket valódi eszközön végzett kézi teszt hozta felszínre, ugyanúgy több körben, mint a 8. szakasz PDF-nézegető iterációjánál):

- **Konva + Next.js `dynamic` import csapda.** Ha a Stage/Layer/Line/Circle Konva-elemeket egyenként töltjük be `next/dynamic`-kal (hogy elkerüljük az SSR-t), Konva saját React-motorja ("reconciler") nem ismeri fel rendesen a gyerek-komponenseket, és kriptikus hibát dob ("mod is not an Object", "Cannot use 'in' operator to search for 'default' in Layer"). A helyes megoldás: az egész rajzoló komponenst egyben kell dinamikusan betölteni, azon belül pedig sima, statikus importtal hivatkozni Konva elemeire — nem lehet Konva-elemenként darabolni a lusta betöltést.
- **Konva `click` eseménye bármelyik egérgombra lefut, ha nem szűröd.** Amikor középső-gombos húzást (pan) építettünk a rajzoló körüli `div`-re, az ottani `preventDefault()` nem állította meg Konva saját, natív eseménykezelőjét a belső canvas-on — ezért a középső gomb is új mérési pontot rakott le. Kellett egy explicit `event.evt.button !== 0` ellenőrzés Konva oldalán is, mert egy külső handler nem tudja lenémítani egy másik, tőle független (nem React-szintézise) natív listenerét.
- **A böngésző natív "scroll anchoring"-ja versenyezhet a saját görgetés-logikáddal.** Amikor a kurzor/csippentés alá akartunk nagyítani (a nézetet úgy görgetni, hogy ugyanaz a pont maradjon a kurzor alatt), a böngésző automatikus scroll-megtartó heurisztikája (ami tartalom-átméreteződéskor próbálja "kitalálni", mit kell látni) folyamatosan közbeszólt, és máshova húzta a nézetet — pontosan olyan tünetet adva, mintha a saját matek lenne hibás, holott az csak versenyzett egy tőle független böngésző-funkcióval. Az `overflow-anchor: none` CSS tulajdonság kikapcsolja ezt.
- **A CSS `touch-action` finomhangolása kritikus egyedi érintés-gesztusoknál.** `touch-action: pinch-zoom` önmagában NEM engedi az egyujjas pásztázást (csak a felsorolt gesztusokat engedélyezi) — `pan-x pan-y`-ra kellett váltani, hogy az egyujjas görgetés natívan működjön, miközben a kétujjas csippentést saját JS-ben implementáltuk, a natív pinch-zoom-ot kikapcsolva, hogy a kettő ne versenyezzen egymással.
- **Az érintési célterület mérete külön kezelendő a vizuális jelöléstől.** Egy nagy, láthatatlan koppintási/húzási zóna (kb. 16px sugár) egy kis, pontos célkereszt köré rajzolva megoldja a "tompa ujjal nehéz pontosan pontot lerakni/kijelölni" problémát anélkül, hogy a vizuális jelölés túl nagynak/pontatlannak tűnne.
- Kalibrálás per dokumentum (nem per munkamenet) mentése apró, de sokat számító UX-döntés volt — enélkül minden megnyitásnál újra kellett volna kalibrálni ugyanazt a tervet.

### 10. Hogyan dokumentáltuk a bizonytalanságot?

Lokális tervezési dokumentumok:

- `docs/product-domain-baseline.md`
- `docs/visibility-rls-plan.md`
- `docs/documents-plans-baseline.md`
- `docs/mobile-ux-redesign-plan.md`
- `docs/progress-log.md`

Elv:

- Ami még üzletileg nem biztos, nem kerül rögtön kódba.
- Előbb terv, kérdéslista, domain baseline.
- Így nem “beégetett” rossz döntések születnek.

### 11. Commit / push / tesztelési ritmus

Tipikus egység:

1. Kis scope meghatározása.
2. Implementáció.
3. `npm run lint`.
4. `npm run build`.
5. Build mellékhatások ellenőrzése.
6. `git status --short`.
7. Kézi teszt checklist.
8. Commit.
9. Push csak jóváhagyás után.
10. Következő lehetséges lépések priorizálása.

### 12. Miért volt fontos a kis scope?

- Kevesebb regresszió.
- Könnyebb visszanézni gitben.
- Könnyebb kézzel tesztelni.
- AI-val is stabilabb, mert nem keverednek túl nagy célok.
- A domain döntések nem csúsznak bele véletlenül UI vagy infra változtatásokba.

### 13. Mit tanulhat ebből egy kezdő?

- Ne a teljes appot akard egyszerre megépíteni.
- Először legyen működő vertical slice.
- Használj mock adatot, de tervezz valódi backend felé.
- Írd le a kérdéseket, ne kódold le a bizonytalanságot.
- Commitolj kis, értelmes egységekben.
- Tesztelj kézzel is, főleg mobil UX-nél.
- Ha valami furán viselkedik, ellenőrizd az élő rendszert (API-hívás, log fájl, valódi eszköz) — ne csak a kódot olvasd újra, a hiba gyakran a rendszerállapotban van, nem a kódban.
- Az AI-t ne csak kódírásra használd, hanem:
  - tervezésre
  - refaktor bontásra
  - kérdéslistákra
  - dokumentációra
  - release / PR összefoglalóra

### 14. Jelenlegi állapot

Működik:

- Hibalista és hiba részletező
- Új hiba rögzítés kontrollált Supabase write fallbackkel
- Státuszváltás és státuszesemény rögzítés
- Fotó feltöltés Supabase Storage-ba
- Kép előnézet és törlés
- Akadálylista read/write alapok
- Teljesítménynapló read-only
- Dokumentumok / Tervek: valódi fájlfeltöltés Supabase Storage-ba, in-app kép- és PDF-nézegető (nagyítás, folyamatos görgetős lapozás, retina-éles renderelés), kereséssel és típus-szűréssel
- Terv-mérő eszköz: kalibrálás (tervenként elmentve), terület/hossz mérés, szerkeszthető mentett mérések, teljes képernyős mód, kurzor/csippentés-alapú zoom
- Mobil navigáció refaktor, dashboard modul-menüvé alakítva

Későbbi fő irányok:

- Auth és szerepkörök
- RLS policy-k (a `project_documents`, `plan_measurements`, `plan_calibrations` és a többi MVP tábla is még nyitott anon write-tal fut)
- Teljesítménynapló valódi workflow
- Akadályok és hibák kapcsolatának tisztázása
- TIG folyamat pontosítása
- Felmérési napló / AI-alapú mennyiségszámítás (l. Attilának szóló kérdésblokk) — a mérő eszköz ennek első, AI nélküli építőköve
- Mobil app / PWA irány (offline mód, telepíthetőség)

## Előadói narratíva

Nem az volt a cél, hogy az AI “egy promptból megírja az appot”. Inkább úgy használtuk, mint egy folyamatos fejlesztőtársat:

- segített a scope bontásban
- javasolt adatmodellt
- implementált kis lépéseket
- ellenőrzött lint/build alapján
- segített visszafogni a túl nagy scope-ot
- dokumentálta a későbbi kérdéseket

A legfontosabb munka továbbra is emberi döntés volt:

- mi legyen most scope-ban
- mi maradjon későbbre
- mi zavaró mobilon
- mit kell Attilától megkérdezni
- mikor elég jó egy állapot commitra

## Attilának / domain szakértőnek szóló kérdésblokkok

### Teljesítménynapló

- Mi a célja: napi munkaigazolás, elszámolás, jelenlét vagy minőségi dokumentáció?
- Ki tölti ki?
- Ki hagyja jóvá?
- Milyen mezők kötelezőek?
- Kell-e fotó hozzá?

### Akadálylista

- Mi számít akadálynak?
- Projekt szintű legyen vagy kapcsolódjon konkrét hibához?
- Milyen státuszok kellenek?
- Ki felel érte?
- Mikor tekinthető megoldottnak?

### Dokumentumok / Tervek

- Milyen dokumentumokat kell kezelni?
- Csak megtekintés vagy feltöltés/verziózás is kell?
- Ki láthatja a terveket?
- Kell-e hivatkozás hibához vagy akadályhoz?

### AI-alapú mennyiségszámítás / felmérési napló (Attila ötlete, 2026-07-20)

Cél: feltöltött terv alapján AI kiszámolná egyes területek/helyiségek mennyiségeit, ez kerülne egy felmérési naplóba, amiből automatikusan generálódna egy TIG kérelem összesítő. Egyelőre nyitott kérdéslista, nincs eldöntve, hogy és milyen mélységben valósítható meg.

- Milyen formátumú tervekkel dolgoztok valójában: vektoros PDF (szöveges méretfeliratokkal) vagy szkennelt/fotózott terv? Ez alapvetően meghatározza, mennyire lehet automatizálni.
- A "felmérési napló" új, önálló modul (előzetes felmérés/becslés, mielőtt a munka elkezdődik), vagy a meglévő Teljesítménynapló (`work_logs`, ami az elvégzett munkát rögzíti utólag) bővítése?
- Ki végzi a felmérést terepen (alvállalkozó, saját munkás, projektvezető), és milyen eszközön (telefon, tableten rajzolva a terven)?
- Elég a mennyiség (m², db) rögzítése, vagy kell hozzá egységár-adatbázis is (pl. "burkolás: X Ft/m²"), hogy a TIG összesítő forint-értéket is tudjon adni? Jelenleg nincs ilyen egységár-tábla a rendszerben.
- Mennyire kell pontos/megbízható az AI-becslés — elfogadható-e egy fél-automatikus megoldás, ahol a felhasználó jelöli ki a területet a terven és a rendszer csak a méretarány alapján számol, AI nélkül vagy AI-asszisztálva?
- Van-e kapcsolat a felmérés és egy konkrét hiba/akadály között (a hibáknál már van `location`/`area` mező)?

## Demo forgatókönyv

1. Dashboard: gyors áttekintés.
2. Hibalista: hibák listája, mobil navigáció.
3. Hiba részletező: fő adatok, állapot, TIG feltételek.
4. Fotó feltöltés: előtte/utána kép.
5. Képnézegető: mobil-first viewer.
6. Akadálylista: projektet lassító akadályok.
7. Teljesítménynapló: read-only munkanapló.
8. Dokumentumok: fájlfeltöltés, majd élőben megnyitás az in-app kép/PDF-nézegetőben (nagyítás, görgetős lapozás) — jó pillanat elmesélni a 8. szakaszban leírt diagnózis-iterációt.
9. Terv-mérő eszköz: kalibrálás, terület mérés élőben egy feltöltött terven, teljes képernyős mód — jó pillanat elmesélni a 9. szakaszban leírt Konva/scroll-anchoring iterációt.
10. Fejlesztési módszer: commitok, docs, lint/build, kézi teszt.

## Későbbi angol fordítási irány

Kulcsszavak:

- AI-assisted MVP development
- domain-driven iteration
- mobile-first field workflow
- mock fallback
- controlled Supabase writes
- incremental delivery
- documentation as decision memory
- small commits, manual testing

