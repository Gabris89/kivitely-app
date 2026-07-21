import type { BlockerStatus } from "@/types";

export const blockerStatusLabels: Record<BlockerStatus, string> = {
  open: "Nyitott",
  in_progress: "Folyamatban",
  waiting_external: "Külsőre vár",
  resolved: "Megoldva",
  closed: "Lezárva",
  cancelled: "Tárgytalan"
};

export const blockerStatusOrder: BlockerStatus[] = [
  "open",
  "in_progress",
  "waiting_external",
  "resolved",
  "closed",
  "cancelled"
];

const transitions: Record<BlockerStatus, BlockerStatus[]> = {
  open: ["in_progress", "waiting_external", "cancelled"],
  in_progress: ["waiting_external", "resolved", "cancelled"],
  waiting_external: ["in_progress", "resolved", "cancelled"],
  resolved: ["in_progress", "closed"],
  closed: [],
  cancelled: []
};

export function getNextBlockerStatuses(status: BlockerStatus) {
  return transitions[status];
}

export function getBlockerWorkflowHint(status: BlockerStatus) {
  switch (status) {
    case "open":
      return "Nyitott akadály. Következő lépés: felelős kijelölése és a folyamatba helyezés.";
    case "in_progress":
      return "Folyamatban. Ha külső félre vár (pl. tervező, beszállító), jelöld külsőre várónak.";
    case "waiting_external":
      return "Külső félre vár. Amint megérkezik a válasz/anyag, léptesd tovább.";
    case "resolved":
      return "Megoldva. Ha nincs több teendő, zárható; ha visszatér a probléma, visszanyitható folyamatban státuszba.";
    case "closed":
      return "Lezárva. Nincs további terepi teendő ezzel az akadállyal.";
    case "cancelled":
      return "Tárgytalanná nyilvánítva.";
  }
}
