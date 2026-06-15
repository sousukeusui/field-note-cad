export type LayerKey =
  | "existingBuildingLines"
  | "vestibuleOutline"
  | "frames"
  | "posts"
  | "mullions"
  | "glassPanels"
  | "slidingDoors"
  | "hingedDoors"
  | "fixedWindows"
  | "dimensions"
  | "labels"
  | "notes"
  | "directionMarker";

export interface LayerDefinition {
  key: LayerKey;
  displayName: string;
  dxfName: string;
  aciColor: number;
  svgStroke: string;
  svgFill?: string;
  svgText?: string;
  lineType: "SOLID" | "DASHED" | "TEXT";
  elementKind: "array" | "object";
}

export const LAYER_DEFINITIONS: Record<LayerKey, LayerDefinition> = {
  existingBuildingLines: {
    key: "existingBuildingLines",
    displayName: "既存建物ライン",
    dxfName: "EXISTING_BUILDING",
    aciColor: 3,
    svgStroke: "#22c55e",
    lineType: "SOLID",
    elementKind: "array",
  },
  vestibuleOutline: {
    key: "vestibuleOutline",
    displayName: "風除室外形線",
    dxfName: "VESTIBULE_OUTLINE",
    aciColor: 2,
    svgStroke: "#f59e0b",
    lineType: "SOLID",
    elementKind: "array",
  },
  frames: {
    key: "frames",
    displayName: "サッシ枠",
    dxfName: "FRAME",
    aciColor: 7,
    svgStroke: "#1e293b",
    lineType: "SOLID",
    elementKind: "array",
  },
  posts: {
    key: "posts",
    displayName: "柱",
    dxfName: "POST",
    aciColor: 1,
    svgStroke: "#ef4444",
    svgFill: "#fee2e2",
    lineType: "SOLID",
    elementKind: "array",
  },
  mullions: {
    key: "mullions",
    displayName: "方立",
    dxfName: "MULLION",
    aciColor: 1,
    svgStroke: "#ef4444",
    lineType: "SOLID",
    elementKind: "array",
  },
  glassPanels: {
    key: "glassPanels",
    displayName: "ガラス",
    dxfName: "GLASS",
    aciColor: 4,
    svgStroke: "#22d3ee",
    lineType: "SOLID",
    elementKind: "array",
  },
  slidingDoors: {
    key: "slidingDoors",
    displayName: "引き戸",
    dxfName: "SLIDING_DOOR",
    aciColor: 6,
    svgStroke: "#8b5cf6",
    lineType: "SOLID",
    elementKind: "array",
  },
  hingedDoors: {
    key: "hingedDoors",
    displayName: "開き戸",
    dxfName: "HINGED_DOOR",
    aciColor: 6,
    svgStroke: "#8b5cf6",
    lineType: "DASHED",
    elementKind: "array",
  },
  fixedWindows: {
    key: "fixedWindows",
    displayName: "FIX窓",
    dxfName: "FIXED_WINDOW",
    aciColor: 7,
    svgStroke: "#64748b",
    lineType: "SOLID",
    elementKind: "array",
  },
  dimensions: {
    key: "dimensions",
    displayName: "寸法",
    dxfName: "DIMENSION",
    aciColor: 1,
    svgStroke: "#f87171",
    svgText: "#dc2626",
    lineType: "SOLID",
    elementKind: "array",
  },
  labels: {
    key: "labels",
    displayName: "ラベル",
    dxfName: "LABEL",
    aciColor: 3,
    svgStroke: "#0f172a",
    svgText: "#0f172a",
    lineType: "TEXT",
    elementKind: "array",
  },
  notes: {
    key: "notes",
    displayName: "注記",
    dxfName: "NOTE",
    aciColor: 2,
    svgStroke: "#475569",
    svgText: "#475569",
    lineType: "TEXT",
    elementKind: "array",
  },
  directionMarker: {
    key: "directionMarker",
    displayName: "正面方向",
    dxfName: "DIRECTION",
    aciColor: 4,
    svgStroke: "#06b6d4",
    svgFill: "#ecfeff",
    lineType: "SOLID",
    elementKind: "object",
  },
};

export const DRAWING_LAYER_ORDER: LayerKey[] = [
  "existingBuildingLines",
  "vestibuleOutline",
  "frames",
  "posts",
  "mullions",
  "glassPanels",
  "slidingDoors",
  "hingedDoors",
  "fixedWindows",
  "dimensions",
  "labels",
  "notes",
  "directionMarker",
];

export const OPTIONAL_ARRAY_LAYER_KEYS = DRAWING_LAYER_ORDER.filter(
  (key) => key !== "directionMarker",
) as Exclude<LayerKey, "directionMarker">[];

export function getLayerDefinition(key: LayerKey): LayerDefinition {
  return LAYER_DEFINITIONS[key];
}
