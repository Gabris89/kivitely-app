# Kivitely Mobile UX Redesign Plan

Lokalis tervezesi dokumentum. Nem implementacios specifikacio, hanem iranymutatas a kovetkezo UI refaktorokhoz.

## Kiindulo problema

A jelenlegi MVP funkcionalisan mar sok mindent tud, de mobilon a felulet nem eleg appszeru:

- az also nav tul sok elemet tartalmaz, ezert zsufolt es nehezen bovitheto;
- sok adat kulon mini kartyaban / buborekban jelenik meg, emiatt az osszetartozo informacio szetesik;
- a fo akciok helye nezetenkent elter;
- desktop es mobil layout ugyanazokbol a mintakbol no ki, ezert mobilon gyakran kompromisszumos.

## Navigacioi dontes

Javaslat: mobilon ne teljes also nav legyen minden modullal.

Legyen egy 4 elemes also tab sav:

1. Dashboard
2. Hibalista
3. Uj hiba
4. Menu

A Menu nyisson teljes kepernyos drawer / sheet nezetet, ahol elerheto:

- Akadalylista
- Dokumentumok
- Teljesitmenynaplo
- Workflow tabla
- Alvallalkozok
- TIG csomag
- Mobil/PWA nezet, ha meg marad demo oldal

Indoklas: az also sav igy stabil, nagy ujjal is hasznalhato, es nem kell minden uj modul miatt ujabb ikont bezsufolni.

Desktopon maradhat sidebar, de ott is erdemes csoportositani:

- Munka: Dashboard, Hibalista, Uj hiba, Akadalylista
- Dokumentacio: Dokumentumok, Teljesitmenynaplo, TIG csomag
- Admin / referencia: Alvallalkozok, Workflow tabla, Mobil/PWA nezet

## Adatmegjelenitesi alapelv

A mini kartyas `dl > div` mintat vissza kell fogni. Mobilon az osszetartozo mezok inkabb egy blokkban jelenjenek meg:

- fo sor: azonosito / cim / statusz
- masodik sor: helyszin, szakma, felelos
- meta sor: datum, prioritas, ertek, darabszam
- reszletek: leiras vagy hosszabb szoveg kulon, olvashato szakaszban

Badge csak olyan informacio legyen, amit gyorsan kell felismerni:

- statusz
- prioritas / sulyossag
- aktualis / archivalt
- TIG-ready / hianyos

## Nezetenkenti javaslat

### /issues

Cel: gyors hibalista, kevesebb zaj.

Javaslat:

- mobilon ne "kartyak a kartyaban" erzese legyen;
- datum kerulhet a kartya jobb felso sarkaba kisebb szoveggel;
- fo informacio: KIV azonosito, cim, statusz, helyszin, felelos;
- fotok/TIG/prioritas egy kompakt meta sorban;
- szurok maradjanak felul, de legyenek kevesbe magasak.

### /issues/[id]

Cel: terepen gyorsan ertheto hiba-reszletezo.

Javaslat:

- mobilon a fo statusz es fo akciok legyenek sticky vagy kozel a fejlechez;
- a hiba adatai ne 8 kulon buborekban jelenjenek meg, hanem 2-3 tematikus szakaszban:
  - Helyszin es szakma
  - Felelos es hatarido
  - Prioritas, ertek, TIG allapot
- a fotos bizonyitas legyen kulon, jol lathato szakasz;
- a jobb oldali desktop panelek mobilon accordion / tab jelleggel jelenjenek meg: Workflow, Checklist, Tortenet.

### /issues/new

Cel: gyors mobilos rogzitese egy uj hibanak.

Javaslat:

- mezo sorrend legyen terepi logika szerint:
  - cim
  - helyszin
  - szakma
  - leiras
  - felelos / alvallalkozo
  - prioritas, hatarido, ertek
- a mentes gomb legyen sticky also akcio mobilon;
- kesobb foto rogzitese keruljon be a flow-ba, de ne tegye tul hosszuva az elso MVP formot.

### /blockers

Cel: aktiv akadalyok gyors attekintese.

Javaslat:

- csak aktiv statuszok maradjanak;
- sulyossag es statusz legyen elso pillantasra felismerheto;
- felelos es terulet legyen egy sorban, nem kulon nagy kartyakban;
- kesobb lehet szuro: sajat / magas / kulso valaszra var.

### /blockers/new

Cel: gyors akadalyrogzites.

Javaslat:

- hasonlo form minta, mint uj hiba, de rovidebb;
- "Mi akadalyoz?" es "Mi kell a tovabblepeshez?" kerdesek menten strukturaltabb leiras;
- mentes gomb sticky also akcio mobilon.

### /work-logs

Cel: teljesitmenynaplo olvashato, naplo-szeru lista.

Javaslat:

- ne altalanos kartya legyen, hanem idovonal / naplo bejegyzes;
- datum legyen kiemelt, jobb felso vagy bal oldali kompakt elem;
- projekt, munkavallalo, szakma es mennyiseg egy kozos sorban;
- statusz badge maradjon.

### /documents

Cel: terv es dokumentum metadata gyors felismerese.

Javaslat:

- dokumentumtipus es aktualis statusz maradjon badge;
- fajlnev ne legyen fo vizualis elem, csak metadata;
- kesobb dokumentum megnyitas/feltoltes elott eleg read-only lista;
- tervdokumentumoknal fontos lesz: projekt, revision, aktualis-e, visibility.

## Desktop vs mobil szetvalasztas

Ne minden desktop komponenst probaljunk mobilra osszenyomni.

Javasolt mintak:

- desktop: sidebar, tobboszlopos detail, jobb oldali panelek;
- mobil: bottom tab + menu drawer, egyoszlopos tartalom, accordionok, sticky fo akcio;
- desktop table maradhat, mobil lista legyen kulon strukturalt komponens.

## Fejlesztesi sorrend

1. Navigacio refaktor
   - 4 elemes mobil bottom tab
   - Menu drawer a tobbi modulnak
   - desktop sidebar csoportositas

2. Hibalista kartya refaktor
   - legnagyobb napi hasznalat
   - kevesebb buborek, jobb datum/statusz elhelyezes

3. Hiba reszletezo mobil refaktor
   - adatblokkok tematikus atcsoportositasa
   - workflow/checklist/tortenet mobil accordion

4. Uj hiba es uj akadaly form polish
   - sticky mentes
   - terepi sorrend
   - kevesebb placeholder-szoveg

5. Naplo / Dokumentumok egységes lista stilus
   - idovonal jelleg a naplonal
   - dokumentum metadata lista a terveknel

## Kovetkezo implementacios prompt javaslat

```text
Keszits mobil navigacio refaktort a Kivitely apphoz.

Ne modosits uzleti logikat.
Ne adj dependency-t.
Ne modosits Supabase schema-t vagy API-t.

Feladat:
1. Mobilon az also navigacio csak 4 elemet mutasson: Dashboard, Hibalista, Uj hiba, Menu.
2. A Menu nyisson mobil drawer/sheet nezetet a tobbi modulhoz: Akadalylista, Dokumentumok, Teljesitmenynaplo, Workflow, Alvallalkozok, TIG, Mobil/PWA.
3. Desktopon a sidebar maradjon, de csoportositsd a menupontokat Munka / Dokumentacio / Admin szakaszokra.
4. Ne valtozzon routing vagy uzleti logika.
5. Futtasd npm run lint es npm run build.
6. Kezi mobilteszt utan commitolj, de push elott allj meg.
```

