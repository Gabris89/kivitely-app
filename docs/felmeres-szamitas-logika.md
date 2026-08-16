# Felmérés – mennyiség-számítási logika (állapot + nyitott kérdések)

> Utolsó frissítés: 2026-08-16. Kontextus: hidegburkolási felmérő. A tervből (PDF)
> felismerjük a helyiséget (kód/név/terület/belmagasság/burkolat), a felmérő megadja
> a kerületet (kóta-koppintás) + pár döntést, és a **szabály-motor** számolja a
> munkanem-mennyiségeket. A szabályok Attila **valós Excel-jéből** (Vasút utca,
> Sztiler) lettek visszafejtve.

## Amit megcsináltunk

- **Éles nézegető** (Konva Stage birtokolja a zoom/pan-t, base áttekintő + megállás­kor
  éles detail-render; a feliratok állandó képernyő-méretűek).
- **Helyiség-felismerés** a text-layerből (kód/név/terület/belm./burkolat), pozíció-
  tudatosan (a szomszéd/nyitott tér értéke nem keveredik be).
- **Kóta-alapú méret:** „koppints a szélességre" → a mélység a területből (egzakt);
  + közvetlen kerület-mező (nyitott/L-alak).
- **Szabály-motor** (`src/lib/ai/planCalculations.ts`): `AUTO`/`MANUAL` forrás,
  helyiség-típus szerinti ágak (fürdő/wc vs terasz), **felülírás** (bármely AUTO
  kézzel javítható → MANUAL).
- **Takeoff bemenetek** (`RoomTakeoff` a `types/index.ts`-ben): helyiség-típus,
  padló-burkolt?, mennyezetig?/burkolási magasság, kiegyenlítés-kapcsoló,
  nyílászáró-levonások, kézi/felülírás értékek. A validátor mentéskor megőrzi.
- **Excel-export** végpont (Vasút utca formátum, SUM/ár/összeg képletekkel).

## Biztos (AUTO) szabályok – Attila adatán igazolva

| Munkanem | Szabály | Igazolás |
|---|---|---|
| **Padló** | = alapterület (csak ha a padló hidegburkolt) | kiírt terület |
| **Fal** | = kerület × burkolási_magasság − nyílászárók | 15,2 / 18,9 / 16,7 m² |
| **Alapozás** | = **Fal + Padló** | 15,2+2,9=18,1 · 18,9+3,9=22,8 · 16,7+4,5=21,2 ✓ |
| **Kiegyenlítés** | = Padló (csak ha a felmérő bejelöli) | 3,9=3,9 · 4,5=4,5 · 3,4=3,4 ✓ |
| **Lábazat** | terasz: kerület − ajtók · csempés fürdő/wc: 0 | teraszon 16,7 fm; fürdőnél üres |

Terasznál más az ág: **Alapozás = Padló**, **Kiegyenl. = Padló**, **Lábazat** van,
Fal nincs.

## Nyitott kérdések a logikában (KÉZI tételek – Attila szabálya kell)

Ezek a valós adatban **szórnak**, nem a terület/kerület tiszta függvényei → jelenleg
`MANUAL` (a felmérő adja meg). Amint Attila megadja a szabályt, AUTO-síthatók:

- **Hálózás (m²):** mi a „hálózandó" felület? (12,4 / 13,4 / 18,1 – nem arányos)
- **Szigetelés (m²):** a nedves falak + padló? falhossz × magasság? (a Fal **85–99%-a**,
  nincs állandó arány)
- **Szalag (fm):** mit adunk ki folyóméterben? (14,3 / 18,7 / 8,9 – erősen szór)
- **Élvédő (fm):** a burkolat-élek hossza – melyek?
- **Tapadóhíd (m²):** néha ≈ Padló, néha nem – nincs megbízható szabály
- **Óra (egység):** munkaóra-becslés (fürdőnél jellemzően 1, wc-nél üres, folyosón 8)
- **Feszmentesítés (m²):** mikor kell + mekkora? (Attilánál **üres** volt)

## Egyéb tisztázandó

- **Nyílászáró-levonás** pontos szabálya: mekkora ablak/ajtó vonódik le a Falból (van
  határ, pl. > 0,5 m²?); az ajtók a Lábazatból.
- **Kiegyenlítés vs Feszmentesítés:** a mintában **Kiegyenl. = Padló**, a Feszment.
  oszlop **üres**. A mi korábbi „Feszment = Padló" tévedés volt → most Kiegyenl.-re
  raktuk, Feszment. kézi.
- **Terasz** részletei: az Alapozás/Kiegyenl. tényleg = Padló? A Lábazat forrása?
- **Egy soron** (B4/5 fürdő) Kiegyenl. 3,2 ≠ Padló 2,9 – miért? (kerekítés? plusz?)
- `floorTiled` **default** ismeretlen burkolatnál (most: nedves/terasz → burkolt).
- **Egységárak** véglegesek-e (a mintából: Fal 8500, Padló 8500, Lábazat 1800,
  Alapozás 500, Hálózás 1700, Szigetelés 2200, Szalag 800, Élvédő 1200, Tapadóhíd
  500, Óra 8000, Kiegyenl. 2500, Feszment. 3800).

## Kérdéslista Attilának (rövid)

1. **Szigetelés:** pontosan mit szigetelünk – padló + hány cm fel a falon, vagy a
   teljes nedves fal?
2. **Hálózás:** mi a „hálózandó" felület – teljes fal, vagy csak a burkolt zóna?
3. **Szalag / Élvédő:** mit adsz ki folyóméterben (fuga? él? sarok?)?
4. **Óra:** fix (pl. 1/fürdő), vagy egyedi becslés helyiségenként?
5. **Feszmentesítés:** mikor kell, és a mennyiség = padló?
6. **Nyílászárók:** levonjuk-e a Falból (mekkora méret felett)? A Lábazatból az
   ajtók szélességét?
7. **Egységárak** stimmelnek-e (a fenti lista)?

## Következő lépések

- **2. fázis (UI):** a mockup-képernyők – geometria/nyílászárók bevitel + munkanem-
  lista `AUTO`/`KÉZI` badge-ekkel + felülírás + helyiség/projekt összesítő.
- A KÉZI tételeket a felmérő adja meg, amíg Attila szabálya nincs; a válaszai alapján
  később AUTO-síthatók (a motor felülírás-rétege ezt támogatja).
