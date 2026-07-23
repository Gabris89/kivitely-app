import path from "path";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { TigPackageDetail } from "@/lib/repository";
import { issuerCompany, tigStatusLabels } from "@/lib/company";

// Magyar ékezetekhez (ő, ű) saját betűkészlet – a beépített Helvetica nem fedi le.
// A font-fájlokat a next.config outputFileTracingIncludes húzza a Vercel-bundle-be.
Font.register({
  family: "DejaVu",
  fonts: [
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/DejaVuSans.ttf") },
    { src: path.join(process.cwd(), "src/lib/pdf/fonts/DejaVuSans-Bold.ttf"), fontWeight: "bold" }
  ]
});

const INK = "#1b2430";
const MUTED = "#6b7686";
const LINE = "#d9e0ea";
const ACCENT = "#0e7490";

function huf(value: number): string {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} Ft`;
}

const styles = StyleSheet.create({
  page: { fontFamily: "DejaVu", fontSize: 9, color: INK, padding: 36, lineHeight: 1.4 },
  watermark: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 84,
    color: "#f2d2d2",
    transform: "rotate(-28deg)"
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  issuer: { fontSize: 14, fontWeight: "bold", color: INK },
  docTitle: { fontSize: 16, fontWeight: "bold", color: ACCENT, marginTop: 8 },
  docSub: { color: MUTED, marginTop: 2 },
  statusPill: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: ACCENT,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4
  },
  rule: { borderBottomWidth: 1, borderBottomColor: LINE, marginVertical: 10 },
  partiesRow: { flexDirection: "row", gap: 16 },
  party: { flex: 1 },
  label: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  strong: { fontWeight: "bold" },
  metaRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  metaItem: { flex: 1 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: INK, marginTop: 16, marginBottom: 6 },
  th: { flexDirection: "row", backgroundColor: "#eef2f7", borderBottomWidth: 1, borderBottomColor: LINE },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE },
  cell: { paddingVertical: 5, paddingHorizontal: 6 },
  cId: { width: 58 },
  cTitle: { flex: 1 },
  cLoc: { width: 110 },
  cProof: { width: 46, textAlign: "center" },
  cVal: { width: 74, textAlign: "right" },
  thText: { fontWeight: "bold", fontSize: 8, color: MUTED },
  totalRow: { flexDirection: "row", marginTop: 6 },
  totalLabel: { flex: 1, textAlign: "right", paddingRight: 8, fontWeight: "bold" },
  totalValue: { width: 100, textAlign: "right", fontWeight: "bold", fontSize: 11, color: ACCENT },
  signRow: { flexDirection: "row", gap: 40, marginTop: 40 },
  signBox: { flex: 1, alignItems: "center" },
  signLine: { borderTopWidth: 1, borderTopColor: INK, width: "100%", marginBottom: 4, marginTop: 24 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, textAlign: "center", fontSize: 7.5, color: MUTED },
  appendixIssue: { marginTop: 12 },
  appendixIssueTitle: { fontWeight: "bold", marginBottom: 6 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoBox: { width: 232 },
  photo: { width: 232, height: 165, objectFit: "cover", borderWidth: 1, borderColor: LINE, borderRadius: 3 },
  photoCaption: { fontSize: 7.5, color: MUTED, marginTop: 3 }
});

function labelForPhoto(type: string): string {
  if (type === "before_photo") return "Előtte";
  if (type === "after_photo") return "Utána";
  return "Bizonyíték";
}

export function TigPdfDocument({ detail }: { detail: TigPackageDetail }) {
  const isDraft = detail.status === "draft" || detail.status === "ready_for_review";
  const period = [detail.periodStart, detail.periodEnd].filter(Boolean).join(" – ");
  const issuesWithPhotos = detail.issues.filter((issue) => issue.photos.length > 0);

  return (
    <Document title={`Teljesítésigazolás ${detail.id}`} author={issuerCompany.name}>
      <Page size="A4" style={styles.page}>
        {isDraft ? (
          <Text style={styles.watermark} fixed>
            PISZKOZAT
          </Text>
        ) : null}

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.issuer}>{issuerCompany.name}</Text>
            {issuerCompany.address ? <Text style={styles.docSub}>{issuerCompany.address}</Text> : null}
          </View>
          <Text style={styles.statusPill}>{tigStatusLabels[detail.status] || detail.status}</Text>
        </View>

        <Text style={styles.docTitle}>Teljesítésigazolás</Text>
        <Text style={styles.docSub}>
          {detail.id} · Kiállítva: {detail.createdAt}
        </Text>

        <View style={styles.rule} />

        <View style={styles.partiesRow}>
          <View style={styles.party}>
            <Text style={styles.label}>Kiállító (Megrendelő)</Text>
            <Text style={styles.strong}>{issuerCompany.name}</Text>
            {issuerCompany.address ? <Text>{issuerCompany.address}</Text> : null}
            {issuerCompany.taxNumber ? <Text>Adószám: {issuerCompany.taxNumber}</Text> : null}
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>Teljesítő (Alvállalkozó)</Text>
            <Text style={styles.strong}>{detail.subcontractor.name}</Text>
            {detail.subcontractor.trade ? <Text>{detail.subcontractor.trade}</Text> : null}
            {detail.subcontractor.contact ? <Text>{detail.subcontractor.contact}</Text> : null}
            {detail.subcontractor.phone ? <Text>{detail.subcontractor.phone}</Text> : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Projekt</Text>
            <Text style={styles.strong}>{detail.project.name || "-"}</Text>
            {detail.project.address ? <Text>{detail.project.address}</Text> : null}
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Teljesítési dátum</Text>
            <Text>{detail.performanceDate || "-"}</Text>
            {period ? (
              <>
                <Text style={[styles.label, { marginTop: 6 }]}>Elszámolási időszak</Text>
                <Text>{period}</Text>
              </>
            ) : null}
          </View>
        </View>

        {detail.note ? (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Megjegyzés</Text>
            <Text>{detail.note}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Igazolt tételek</Text>
        <View style={styles.th}>
          <Text style={[styles.cell, styles.cId, styles.thText]}>Azonosító</Text>
          <Text style={[styles.cell, styles.cTitle, styles.thText]}>Megnevezés</Text>
          <Text style={[styles.cell, styles.cLoc, styles.thText]}>Helyszín</Text>
          <Text style={[styles.cell, styles.cProof, styles.thText]}>Bizonyíték</Text>
          <Text style={[styles.cell, styles.cVal, styles.thText]}>Nettó érték</Text>
        </View>
        {detail.issues.map((issue) => (
          <View style={styles.tr} key={issue.id} wrap={false}>
            <Text style={[styles.cell, styles.cId]}>{issue.id}</Text>
            <Text style={[styles.cell, styles.cTitle]}>{issue.title}</Text>
            <Text style={[styles.cell, styles.cLoc]}>{[issue.location, issue.area].filter(Boolean).join(" · ")}</Text>
            <Text style={[styles.cell, styles.cProof]}>{issue.photos.length}</Text>
            <Text style={[styles.cell, styles.cVal]}>{huf(issue.valueHuf)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Nettó összérték</Text>
          <Text style={styles.totalValue}>{huf(detail.netValueHuf)}</Text>
        </View>

        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text>Kiállító (Megrendelő)</Text>
            <Text style={styles.docSub}>Dátum: ______________</Text>
          </View>
          <View style={styles.signBox}>
            <View style={styles.signLine} />
            <Text>Teljesítő (Alvállalkozó)</Text>
            <Text style={styles.docSub}>Dátum: ______________</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${detail.id} · ${pageNumber}/${totalPages}`}
        />
      </Page>

      {issuesWithPhotos.length > 0 ? (
        <Page size="A4" style={styles.page}>
          {isDraft ? (
            <Text style={styles.watermark} fixed>
              PISZKOZAT
            </Text>
          ) : null}
          <Text style={styles.sectionTitle}>Fotós bizonyíték-melléklet</Text>
          {issuesWithPhotos.map((issue) => (
            <View style={styles.appendixIssue} key={issue.id} wrap={false}>
              <Text style={styles.appendixIssueTitle}>
                {issue.id} · {issue.title}
              </Text>
              <View style={styles.photoGrid}>
                {issue.photos.map((photo, index) => (
                  <View style={styles.photoBox} key={`${issue.id}-${index}`}>
                    <Image style={styles.photo} src={photo.url} />
                    <Text style={styles.photoCaption}>
                      {labelForPhoto(photo.type)} · {issue.id}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
          <Text
            style={styles.footer}
            fixed
            render={({ pageNumber, totalPages }) => `${detail.id} · ${pageNumber}/${totalPages}`}
          />
        </Page>
      ) : null}
    </Document>
  );
}
