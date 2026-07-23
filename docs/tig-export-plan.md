# TIG PDF / Excel export – koncepció

Cél: a kész TIG-csomagból **kézzelfogható, kiadható dokumentum** és **elszámolható adat** készüljön — a teljesítésigazolás mint küldhető PDF, és a tételek mint táblázat (Excel/CSV).

## 1. A két formátum szerepe (miért mind a kettő)

- **PDF = maga a teljesítésigazolás dokumentum.** Ezt küldi/adja a fővállalkozó az alvállalkozónak; ez a számla kiállításának alapja, aláírható, archiválható, e-mailben csatolható. Emberi olvasásra, nyomtatásra.
- **Excel/CSV = az adat.** A tételek gépi feldolgozásra: könyveléshez, saját táblázatba emeléshez, összesítéshez, szűréshez. Nem „dokumentum", hanem strukturált sorok.

Ugyanabból a csomagból, ugyanabból az adatból készül mindkettő.

## 2. Mikor exportálható (státusz-kapu)

- **Elfogadva / Kiküldve:** végleges dokumentum, vízjel nélkül.
- **Piszkozat / Ellenőrzésre vár:** exportálható, de a PDF **„PISZKOZAT – nem végleges"** vízjelet kap (hogy ne menjen ki véletlenül félkész igazolás). Így már a folyamat közben is lehet előnézetet nyomtatni, de a végleges csak jóváhagyás után „tiszta".

## 3. A PDF tartalma és felépítése

A magyar teljesítésigazolási gyakorlathoz igazodva:

1. **Fejléc / felek**
   - Kiállító (Megrendelő/Fővállalkozó) neve, adatai — *lásd nyitott kérdés: honnan jön a cégadat.*
   - Teljesítő (Alvállalkozó): a csomag alvállalkozója (név, szakág, kapcsolattartó, telefon).
   - Dokumentum azonosító: a csomag `TIG-00X` public id, kiállítás dátuma.
2. **Projekt hivatkozás:** projekt neve, címe, (megrendelő/építtető), szerződés/megjegyzés mező tartalma.
3. **Igazolt tételek táblázata:** hibánként egy sor — azonosító (HIB-…), megnevezés, helyszín/terület, szakág, **nettó érték**, bizonyítékok száma.
4. **Összesítés:** nettó összérték (a tételek összege), teljesítési dátum, elszámolási időszak (kezdete–vége). (ÁFA/bruttó most nincs modellezve — lásd nyitott kérdés.)
5. **Fotós bizonyíték-melléklet:** tételenként a kapcsolt fotók (thumbnaillel, felirattal: before/after, HIB-azonosító). Ez adja a TIG „bizonyító" súlyát — ez a termék lényege.
6. **Aláírás-blokk:** két aláírásmező (Kiállító / Teljesítő), név + dátum + aláírás vonal (fizikai aláíráshoz; digitális aláírás későbbi kör).
7. **Lábléc:** oldalszám, generálás dátuma, a csomag azonosítója.

## 4. Az Excel/CSV tartalma

- **„Összesítő" munkalap:** csomag azonosító, alvállalkozó, státusz, teljesítési dátum, időszak, nettó összérték, tételszám, bizonyítékszám, projekt.
- **„Tételek" munkalap:** soronként egy hiba — HIB-azonosító, megnevezés, helyszín, terület, szakág, státusz, nettó érték, before-fotók száma, after-fotók száma, (fotó-URL-ek opcionálisan).
- CSV esetén csak a „Tételek" tábla (egy lap), a fejléc-adatok a fájlnévbe / első sorokba.

## 5. Adatforrás

Kell egy **részletes csomag-lekérdezés** a repository-ban (a mostani `getTigPackageByPublicId` bővítése/exportálása), ami visszaadja:
- a csomag mezőit (net érték, teljesítési dátum, időszak, megjegyzés, státusz),
- az alvállalkozót (név, szakág, kapcsolattartó, telefon),
- a projektet (név, cím, megrendelő),
- a kapcsolt hibákat: azonosító, megnevezés, helyszín/terület/szakág, nettó érték, és a hibákhoz tartozó bizonyítékok (típus + publikus fotó-URL).

A fotó-URL-ek a már meglévő publikus storage URL-ekből jönnek (a `getPublicUrl` úgyis publikus olvasású bucketet céloz).

## 6. Technikai megközelítés (a fő döntés)

**PDF – két út:**

- **A) Nyomtatható HTML-oldal + böngésző „PDF-be nyomtatás" (ajánlott MVP).**
  Egy dedikált, print-optimalizált oldal: `/projects/{id}/tig/{packageId}/nyomtatas`, saját `@media print` CSS-sel (A4, margók, oldaltörések, fekete-fehér-barát). A felhasználó a böngésző Nyomtatás → „Mentés PDF-ként" funkciójával kap fájlt.
  Előny: nincs nehéz szerver-függőség (Vercel-barát), a fotók sima `<img>`-ként jelennek meg, WYSIWYG, könnyen csinos. Hátrány: a mentés a böngésző nyomtatóablakán át megy (egy plusz kattintás), a fájlnevet a böngésző adja.

- **B) Szerveroldali, valódi letölthető PDF (`@react-pdf/renderer`).**
  Egy API-route generálja a PDF-et és letölti (`Content-Disposition: attachment`). Serverless-kompatibilis (a Puppeteer-t szándékosan kerülöm — Vercelen nehézkes/nagy). Előny: egy kattintásos, kész fájlnévvel; nincs nyomtatóablak. Hátrány: több kód, a fotók beágyazása (byte-ok letöltése) macerásabb, a layout a react-pdf saját primitívjeivel készül (nem sima CSS).

**Excel – két út:**

- **A) `.xlsx` szerveroldali generálás (`exceljs`), több munkalappal (ajánlott).** Igazi Excel-fájl, formázással, két lappal. API-route → letöltés.
- **B) CSV (legegyszerűbb).** Egy route sima `text/csv`-t ad vissza; Excel megnyitja. Nincs függőség, de nincs formázás/több lap, és az ékezetek/elválasztó miatt figyelni kell (UTF-8 BOM, pontosvessző elválasztó a magyar Excelhez).

## 7. Biztonság

- Az export-útvonalak/oldalak **authenticated**-ek (szerveroldali, session mögött) — a mostani mintára.
- A fotók a publikus storage URL-ekből jönnek (a bucket amúgy is publikus olvasású), tehát a PDF/print-oldal gond nélkül betölti őket.

## 8. UI

- A TIG-csomag kártyáján (vagy egy csomag-részletnézetben) két akció: **„PDF"** és **„Excel"**.
- PDF (A út): új fülön megnyitja a nyomtatható oldalt. PDF (B út) / Excel: közvetlen letöltés.
- A gombok minden státusznál elérhetők; piszkozatnál a PDF vízjeles.

## 9. Fájlnév-konvenció

`TIG-001_Burkolo-Kft_2026-07-31.pdf` / `.xlsx` (csomag-id + alvállalkozó + teljesítési dátum).

## 10. Javasolt megvalósítási sorrend

1. Részletes csomag-lekérdezés a repository-ban (adat egy helyen).
2. **Excel/CSV** előbb (egyszerűbb, gyorsan értéket ad): letöltő route + gomb.
3. **PDF** a választott úton (print-HTML vagy react-pdf): oldal/route + gomb.
4. Fotó-melléklet a PDF-be.
5. Finomítás: vízjel, aláírás-blokk, fájlnevek.

## 11. Nyitott döntések (ezeket kérdezem)

- **PDF-megközelítés:** nyomtatható HTML + böngésző-print (egyszerű, csinos, MVP) — vagy szerveroldali valódi letölthető PDF (`@react-pdf`, egy kattintás, több munka)?
- **Excel-formátum:** igazi `.xlsx` (exceljs, formázott, több lap) — vagy CSV (legegyszerűbb)?
- **Fotó-melléklet a PDF-ben:** legyen benne a fotós bizonyíték (thumbnailek) — vagy első körben csak a bizonyítékok *száma* szerepeljen, a fotók később?
- **Kiállító cégadat:** honnan jöjjön a fővállalkozó/megrendelő neve-adata a fejlécbe? (env/konstans egyelőre, vagy egy egyszerű beállítás-mező — ez most nincs az adatmodellben.)
