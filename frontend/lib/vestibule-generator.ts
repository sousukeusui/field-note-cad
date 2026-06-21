import type { Drawing } from "../types/drawing";

export type DoorPosition = "center" | "left" | "right";
export type DoorType = "sliding2" | "sliding1" | "hinged";

export interface VestibuleParams {
  widthMm: number;
  depthMm: number;
  doorPosition: DoorPosition;
  frameThicknessMm: number;
  doorType: DoorType;
  glassType: string;
}

const BOUNDARY_OFFSET = 50; // 土間境界から内側への固定オフセット (mm)
const POST_HALF = 45;        // 90x90 柱の中心から端まで

/** 引き戸タイプに対応する標準開口幅 */
const DOOR_WIDTH: Record<DoorType, number> = {
  sliding2: 1200,
  sliding1:  900,
  hinged:    900,
};

/** 引き戸の開始・終了 x 座標を返す */
function calcDoorRange(
  W: number,
  doorPosition: DoorPosition,
  doorWidth: number
): { doorStart: number; doorEnd: number } {
  const o = BOUNDARY_OFFSET;
  if (doorPosition === "left") {
    return { doorStart: o, doorEnd: o + doorWidth };
  }
  if (doorPosition === "right") {
    return { doorStart: W - o - doorWidth, doorEnd: W - o };
  }
  // center
  return { doorStart: W / 2 - doorWidth / 2, doorEnd: W / 2 + doorWidth / 2 };
}

/** 土間寸法・建具条件から風除室の平面図 Drawing オブジェクトを生成する */
export function generateVestibuleJson(params: VestibuleParams): Drawing {
  const {
    widthMm: W,
    depthMm: D,
    doorPosition,
    frameThicknessMm: frameT,
    doorType,
    glassType,
  } = params;

  const o = BOUNDARY_OFFSET;
  const doorWidth = DOOR_WIDTH[doorType];
  const { doorStart, doorEnd } = calcDoorRange(W, doorPosition, doorWidth);

  // 両端にFIX窓が入る範囲を計算
  const fixRanges: { start: number; end: number }[] = [];
  if (doorStart > o) {
    fixRanges.push({ start: o, end: doorStart });
  }
  if (doorEnd < W - o) {
    fixRanges.push({ start: doorEnd, end: W - o });
  }

  const doorCenterX = (doorStart + doorEnd) / 2;
  const frontY = o;         // 正面フレームの y 座標
  const backY = D - o;      // 奥フレームの y 座標

  return {
    version: "1.0",
    unit: "mm",
    drawingBounds: {
      min: { x: -500, y: -500 },
      max: { x: W + 500, y: D + 500 },
    },
    layers: {
      existingBuildingLines: [
        { id: "ebl1", start: { x: 0, y: D }, end: { x: W, y: D }, lineType: "solid" },
        { id: "ebl2", start: { x: 0, y: 0 }, end: { x: W, y: 0 }, lineType: "solid" },
        { id: "ebl3", start: { x: 0, y: 0 }, end: { x: 0, y: D }, lineType: "solid" },
        { id: "ebl4", start: { x: W, y: 0 }, end: { x: W, y: D }, lineType: "solid" },
      ],

      vestibuleOutline: [
        {
          id: "vo1",
          points: [
            { x: o, y: frontY },
            { x: W - o, y: frontY },
            { x: W - o, y: backY },
            { x: o, y: backY },
          ],
          closed: true,
        },
      ],

      frames: [
        { id: "fr1", start: { x: o, y: frontY }, end: { x: W - o, y: frontY }, thickness: frameT },
        { id: "fr2", start: { x: o, y: frontY }, end: { x: o, y: backY },      thickness: frameT },
        { id: "fr3", start: { x: W - o, y: frontY }, end: { x: W - o, y: backY }, thickness: frameT },
        { id: "fr4", start: { x: o, y: backY }, end: { x: W - o, y: backY },   thickness: frameT },
      ],

      posts: [
        { id: "p1", position: { x: o + POST_HALF,     y: frontY + POST_HALF }, width: 90, depth: 90 },
        { id: "p2", position: { x: W - o - POST_HALF, y: frontY + POST_HALF }, width: 90, depth: 90 },
        { id: "p3", position: { x: W - o - POST_HALF, y: backY - POST_HALF },  width: 90, depth: 90 },
        { id: "p4", position: { x: o + POST_HALF,     y: backY - POST_HALF },  width: 90, depth: 90 },
      ],

      mullions: [
        { id: "m1", start: { x: doorStart,    y: frontY }, end: { x: doorStart,    y: frontY + frameT }, thickness: frameT },
        { id: "m2", start: { x: doorEnd,      y: frontY }, end: { x: doorEnd,      y: frontY + frameT }, thickness: frameT },
        // 召合せ（引違いのみ）
        ...(doorType === "sliding2"
          ? [{ id: "m3", start: { x: doorCenterX, y: frontY }, end: { x: doorCenterX, y: frontY + frameT }, thickness: frameT }]
          : []),
      ],

      slidingDoors: doorType === "sliding2" || doorType === "sliding1"
        ? [
            {
              id: "sd1",
              start: { x: doorStart, y: frontY },
              end:   { x: doorEnd,   y: frontY },
              width: doorWidth,
              direction: doorType === "sliding2" ? "both" : "right",
              panelCount: doorType === "sliding2" ? 2 : 1,
            },
          ]
        : [],

      hingedDoors: doorType === "hinged"
        ? [
            {
              id: "hd1",
              position: { x: doorStart, y: frontY },
              width: doorWidth,
              angle: 90,
              swing: "outward",
            },
          ]
        : [],

      fixedWindows: fixRanges.map((r, i) => ({
        id: `fw${i + 1}`,
        start: { x: r.start, y: frontY },
        end:   { x: r.end,   y: frontY },
        width: r.end - r.start,
      })),

      glassPanels: [
        // 引き戸パネルのガラス（パネル数に応じて分割）
        ...(doorType !== "hinged"
          ? doorType === "sliding2"
            ? [
                { id: "gp1", points: [{ x: doorStart + frameT, y: frontY }, { x: doorCenterX - frameT / 2, y: frontY }], glassType },
                { id: "gp2", points: [{ x: doorCenterX + frameT / 2, y: frontY }, { x: doorEnd - frameT, y: frontY }], glassType },
              ]
            : [
                { id: "gp1", points: [{ x: doorStart + frameT, y: frontY }, { x: doorEnd - frameT, y: frontY }], glassType },
              ]
          : []),
        // FIX窓のガラス
        ...fixRanges.map((r, i) => ({
          id: `gp${i + 3}`,
          points: [{ x: r.start + frameT, y: frontY }, { x: r.end - frameT, y: frontY }],
          glassType,
        })),
      ],

      dimensions: [
        // 土間外寸（境界ライン付近）
        {
          id: "dim1",
          start: { x: 0, y: 0 },
          end:   { x: W, y: 0 },
          text:   `土間間口 ${W}`,
          offset: -200,
        },
        {
          id: "dim2",
          start: { x: 0, y: 0 },
          end:   { x: 0, y: D },
          text:   `土間奥行 ${D}`,
          // 左壁の法線は (-1, 0) なので正の offset で左側に出る
          offset: 200,
        },
        // 風除室仕上がり間口
        {
          id: "dim3",
          start: { x: o, y: frontY },
          end:   { x: W - o, y: frontY },
          text:   `風除室 ${W - 2 * o}`,
          offset: -100,
        },
        // 引き戸開口
        {
          id: "dim4",
          start: { x: doorStart, y: frontY },
          end:   { x: doorEnd,   y: frontY },
          text:   `引き戸 ${doorWidth}`,
          offset: 250,
        },
        // FIX窓幅
        ...fixRanges.map((r, i) => ({
          id: `dim${i + 5}`,
          start: { x: r.start, y: frontY },
          end:   { x: r.end,   y: frontY },
          text:   `FIX ${r.end - r.start}`,
          offset: 250,
        })),
      ],

      labels: [
        {
          id: "lb1",
          text: `風除室 ${W - 2 * o} × ${D - 2 * o}`,
          position: { x: W / 2, y: D / 2 },
          height: 60,
        },
      ],

      notes: [],

      directionMarker: {
        id: "dir1",
        position: { x: W / 2, y: -600 },
        direction: 90,
        label: "正面方向",
      },
    },
  };
}
