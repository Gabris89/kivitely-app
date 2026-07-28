-- Projekt-hatokor lekerdezese a bejelentkezett felhasznalohoz (3. lepcso).
--
-- Miert fuggveny es nem tabla-jog:
-- A 20260727140000 migracio szandekosan szuk oszlopjogokat hagyott a profiles
-- tablan, es a sajat profil elereset egy security definer fuggvenyre bizta
-- (current_user_profile). Ugyanez az elv itt is: ha a project_members tablara
-- adnank select jogot az authenticated szerepnek, akkor barmely belepett
-- felhasznalo kiolvashatna a TELJES tagsagi listat - kinek melyik projekthez
-- van hozzaferese. Ez maga is uzleti informacio (ki dolgozik kinek).
--
-- A fuggveny definicio szerint csak a HIVO sajat tagsagat adja vissza, tehat a
-- tabla olvashatatlan maradhat, es megis van projekt-hatokorunk.
--
-- A can_view_project = false sor tudatosan kimarad: az a "tag, de nem lathatja"
-- eset (pl. felfuggesztett hozzaferes), amit a tagsag torlese nelkul akarunk.

create or replace function public.current_user_project_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pm.project_id
  from public.project_members pm
  join public.profiles p on p.id = pm.profile_id
  where p.auth_user_id = auth.uid()
    and p.is_active
    and pm.can_view_project;
$$;

comment on function public.current_user_project_ids() is
  'A hivo sajat projekt-tagsaga (project_members.project_id). Csak sajat sorokat ad vissza.';

-- Alapertelmezetten a public szerep is kapna execute jogot, ezert vissza kell
-- vonni, es csak a belepett felhasznaloknak megadni. Az anon (kijelentkezett)
-- szerep szandekosan nem kap: neki nincs auth.uid()-ja, ures listat kapna, de
-- a fuggveny letezeset sem kell latnia.
revoke execute on function public.current_user_project_ids() from public;
grant execute on function public.current_user_project_ids() to authenticated;
