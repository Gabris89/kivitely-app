// Shared between PlanMeasurementTool.tsx and PlanMeasurementCanvas.tsx so a
// saved measurement's list row and its polygon on the plan use the same
// color. Deliberately has zero dependencies (no react-konva) - PlanMeasurementTool
// must be able to import this as a normal (non-type) import without dragging
// Konva into a bundle path that could get evaluated during SSR.
export const MEASUREMENT_COLORS = ["#68e1fd", "#ffd166", "#c9a4ff", "#ff9f6b", "#8af0bd", "#ff8fc6"];

// Keyed off the measurement's own id (not its position in some array) so the
// color stays the same everywhere it's shown, even though the list and the
// canvas each filter/exclude items differently (e.g. the canvas hides
// whichever one is currently being edited).
export function colorForMeasurementId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return MEASUREMENT_COLORS[hash % MEASUREMENT_COLORS.length];
}
