# Kivitely – navigációs rendszer újratervezéséhez háttéranyag

## Az app röviden

Kivitely: magyar kivitelezés/site-management app (Next.js App Router + Supabase). Fő modulok: Hibalista (issues), Akadálylista (blockers), Projektek, Alvállalkozók, Dokumentumok, Teljesítménynapló, TIG csomag, Workflow tábla. A tulajdonos elsősorban **telefonon, élesben teszteli** (LAN-on, saját eszközön), a navigáció ezért mobil-elsőként kell hogy működjön, a desktop másodlagos.

## A jelenlegi navigációs architektúra

A teljes nav rendszer **két, egymástól strukturálisan eltérő "kontextusra" épül**, és minden nav-elem (desktop sidebar, mobil alsó sáv, mobil "Több" lap) ettől függően teljesen más tartalmat mutat:

- **Globális kontextus**: bármely oldal, ami NEM egy adott projekten belül van (`/`, `/projects`, `/issues`, `/blockers`, `/subcontractors`, `/workflow`).
- **Projekt kontextus**: `/projects/{projectId}/...` alatti minden oldal.

Az, hogy melyik kontextusban vagy, kizárólag az URL-ből derül ki (`pathname.match(/^\/projects\/([^/]+)/)`), nincs explicit "válts projektet" UI.

### Desktop sidebar (mindig látható, `src/components/AppShell.tsx`)

**Globális:**
- Projektek szekció: Dashboard (`/`), Projektek (`/projects`), Új projekt
- Admin szekció: Összes hiba, Összes akadály, Workflow tábla (összes), Alvállalkozók

**Projekt kontextusban:**
- Projektek szekció: Projektek (vissza a listához)
- Munka szekció: Dashboard (a projekt saját "modul-menü" oldala), Hibalista, Új hiba, Akadálylista, Workflow tábla (**csak ennek a projektnek** a hibái)
- Dokumentáció szekció: Dokumentumok, Teljesítménynapló, TIG csomag
- Admin szekció: ugyanaz a 4 elem, mint globálisban (Összes hiba/akadály **az ÖSSZES projektből**, Workflow tábla (összes), Alvállalkozók)

Vagyis project kontextusban **egyszerre két "hibalista"-szerű dolog** van a menüben: a projekt saját Hibalistája (Munka szekció) és a globális, minden projektet összesítő "Összes hiba" (Admin szekció) - ugyanez igaz Akadálylistára és Workflow táblára.

### Mobil alsó sáv (4 hely, `bottom-nav`, mindig fixen a képernyő alján)

**Globális:** Dashboard, Projektek, + "Több" gomb → csak 2 valódi elem + Több, a 4 helyből 2 üresen marad.
**Projekt kontextusban:** Dashboard, Hibalista, Új hiba, + "Több" gomb → 3 elem + Több, pont kitölti a 4 helyet.

### Mobil "Több" lap (felugró lista, flat, csoportok között elválasztóval)

**Globális csoport:** Új projekt, Összes hiba, Összes akadály, Workflow tábla (összes), Alvállalkozók
**Projekt kontextusban, 2 csoport:**
1. Akadálylista, Workflow tábla (a projekté), Dokumentumok, Teljesítménynapló, TIG csomag
2. Összes hiba, Összes akadály, Workflow tábla (összes), Alvállalkozók, Projektek

(A csoportosítás logikája: ami már szerepel az alsó sávban, az nem ismétlődik meg a Több lapon.)

## Eddig felmerült, konkrét felhasználói panaszok (a jelenlegi munkamenetekből)

1. **"Két főmenü van"** érzés mobilon - az alsó sáv és a "Több" lap két külön navigációs rendszernek tűnt (ezen már dolgoztunk: egységesített ikon-nyelv, "Menü"→"Több" átnevezés, lapos lista dobozok helyett - de az alapprobléma, hogy két külön UI-elem szolgálja ugyanazt a célt, megmaradt).
2. **Nincs projektváltó.** Ha az egyik projekten belül vagy, és másik projektre lenne szükséged, vissza kell menni a `/projects` listára, onnan be a másikba - nincs dropdown/gyors váltó.
3. **Kettős hierarchia**: a projekt-szintű és a globális (összesített) modulok (Hibalista vs Összes hiba, Akadálylista vs Összes akadály, projekt Workflow tábla vs Workflow tábla (összes)) egyszerre vannak jelen a menüben, amikor egy projekten belül vagy - ez kognitív terhelés, nem egyértelmű mikor melyiket kell használni.
4. **A "Dashboard" szó túlterhelt**: van egy globális Dashboard (`/`, statisztikák, diagramok) ÉS minden projektnek van saját "Dashboard"-ja (a projekt modul-menüje, `/projects/{id}`) - ugyanaz a szó két különböző dolgot jelent attól függően, hol vagy.
5. **Az alsó sáv kitöltöttsége inkonzisztens** a két kontextus között (2 vs 3 valós elem a 4 helyből), ami vizuálisan másképp néz ki attól függően, hol jársz.
6. Általános visszajelzés korábban: *"Az egészet használhatatlannak érzem még"* - ez nem csak a navigációra vonatkozott, de a navigáció volt az egyik konkrétan megnevezett ok.

## Amit a felhasználó most kifejezetten kért

> "A menürendszer áttervezéséhez adj támpontot [...] hogy ez nem jó felhasználói élmény szempontjából, nehéz a navigáció. Projekt alapú menü és projekten kívül menürendszer probléma - tegnap beszéltünk róla h nem tetszik."

Vagyis: a **projekt-alapú vs. projekten-kívüli menürendszer kettőssége maga a probléma** - nem egy-egy elrendezési részlet, hanem az alapkoncepció, hogy a teljes navigáció gyökeresen átalakul aszerint, hogy "bent vagy-e" egy projektben vagy sem.

## Nyitott kérdések az újratervezéshez

- Kell-e egyáltalán ilyen éles kontextusváltás, vagy legyen egy **egységes, mindig ugyanúgy kinéző nav**, ami csak azt jelzi valahogy (pl. egy fejléc-chip vagy dropdown), hogy melyik projektben vagy éppen - a menüpontok listája ne változzon drasztikusan?
- Kellene-e egy **globális projektváltó** (pl. a fejlécben egy dropdown/gomb, ami bármikor, bárhonnan enged váltani projektet anélkül, hogy vissza kellene menni a listára)?
- Meg lehetne-e szüntetni a duplikációt a projekt-szintű és globális-összesített modulok között - pl. a projekt Hibalistája legyen csak egy **szűrt nézete** a globális Hibalistának (ugyanaz az oldal, `?project=` szűrővel), ne külön menüpont?
- Az alsó sávnak (mobil) muszáj-e 4 fix helyet tartania, vagy lehetne dinamikus (annyi elem, amennyi ténylegesen kell, konzisztensen mindkét kontextusban)?
- Éri-e meg megtartani a "Több" felugró lapot külön UI-elemként, vagy be lehetne olvasztani máshova (pl. egy oldalsó fiók/drawer, vagy a fejléc egy menügombja)?

## Technikai keretek

- Next.js App Router, kliens-oldali navigációs komponens: `src/components/AppShell.tsx` (a teljes sidebar/bottom-nav/Több logika itt van, ~290 sor).
- Az URL-struktúra (`/projects/{id}/...` vs. globális útvonalak) valószínűleg megmarad, ez az adatmodell/routing alapja - a navigáció UI-ja alakítható át e köré, nem feltétlenül kell az URL-eket átépíteni.
- Dark theme, meglévő CSS-token rendszer (`--bg`, `--panel`, `--brand`, `--brand-2` stb. a `globals.css`-ben) - az újratervezésnek illeszkednie kell ehhez a vizuális nyelvhez.
