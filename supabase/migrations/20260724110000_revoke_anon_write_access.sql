-- Biztonsági javítás: az anon szerep írási jogának elvétele.
--
-- Előzmény: az "anon" szerep (a böngészőbe szállított publishable kulcs) eddig
-- valós írási joggal rendelkezett minden táblán (a policy-k `with check (true)`
-- feltétellel), mert az app a DB-műveleteit az anon kulccsal, session nélkül
-- futtatta. Éles (nyilvános) URL-en ez azt jelenti, hogy BÁRKI, aki a publishable
-- kulcsot birtokolja (azaz minden látogató), közvetlenül a Supabase REST API-n
-- keresztül írhatott/törölhetett adatot – az app login-fala ezt nem védte, mert az
-- csak a Next útvonalakat őrzi, a DB-t nem.
--
-- A javítás app-oldali fele: a repository.ts mostantól a bejelentkezett felhasználó
-- session-cookie-ját továbbító szerver-klienssel (getServerSupabaseClient →
-- createAuthServerClient) ír, tehát a műveletek az "authenticated" szerepben futnak.
-- Ezért az anon írási jogát biztonságosan elvehetjük.
--
-- Megjegyzés: az OLVASÁS (select) egyelőre változatlan (az anon-nak marad select
-- joga). Az app most már authenticated-ként olvas, így az anon select is elvehető
-- lenne – ezt szándékosan külön, következő lépésben tesszük, hogy ez a migráció
-- szűken csak a bejelentett kockázatot (írás) zárja, kisebb regressziós felülettel.

-- 1) Írási jog (insert/update/delete) elvétele az anon szereptől MINDEN public
--    táblán. A revoke nem hibázik olyan jogon, ami nem volt megadva.
revoke insert, update, delete on all tables in schema public from anon;

-- 2) Jövőbeli (később létrehozott) public táblák se kapjanak automatikusan anon
--    írási jogot.
alter default privileges in schema public revoke insert, update, delete on tables from anon;

-- 3) Storage: a fájl-feltöltő és -törlő policy-k csak "authenticated" szerepnek
--    szóljanak (eddig "anon, authenticated" volt). Az olvasó policy-k publikusak
--    maradnak, mert a bucketek publikus olvasásúak (a getPublicUrl ezekre épül).
alter policy "insert issue evidence images" on storage.objects to authenticated;
alter policy "delete issue evidence images" on storage.objects to authenticated;
alter policy "insert project document files" on storage.objects to authenticated;
alter policy "delete project document files" on storage.objects to authenticated;

-- Visszavonás (ha valami elromlana), CSAK vészhelyzetre:
--   grant insert, update, delete on all tables in schema public to anon;
--   alter policy "insert issue evidence images" on storage.objects to anon, authenticated;
--   ... (a többi storage policy hasonlóan)
-- De a helyes megoldás nem a visszaállítás, hanem hogy az app authenticated-ként írjon.
