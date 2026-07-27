/**
 * Egyszeru, szerver komponensbol is hasznalhato jelzes: a felhasznalo
 * szerepe nem engedi ezt a muveletet. A gombok elrejtese mellett ez a
 * masodik reteg - ha valaki kozvetlenul irja be az URL-t.
 */
export function AccessDenied({ message }: { message: string }) {
  return (
    <section className="card empty-list" role="status">
      <strong>Nincs jogosultságod ehhez</strong>
      <p>{message}</p>
    </section>
  );
}
