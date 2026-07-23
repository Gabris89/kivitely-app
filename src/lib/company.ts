// A kiállító (fővállalkozó / megrendelő) cégadata a teljesítésigazolás fejlécéhez.
// Egyelőre env/konstans placeholder; később lehet belőle beállítás-mező.
export const issuerCompany = {
  name: process.env.NEXT_PUBLIC_ISSUER_NAME || "Kivitely Kft.",
  address: process.env.NEXT_PUBLIC_ISSUER_ADDRESS || "",
  taxNumber: process.env.NEXT_PUBLIC_ISSUER_TAX || ""
};

export const tigStatusLabels: Record<string, string> = {
  draft: "Piszkozat",
  ready_for_review: "Ellenőrzésre vár",
  approved: "Elfogadva",
  sent: "Kiküldve"
};

// Fájlnévbe illeszthető, ékezet-egyszerűsített szöveg.
export function tigFileSlug(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "alvallalkozo"
  );
}
