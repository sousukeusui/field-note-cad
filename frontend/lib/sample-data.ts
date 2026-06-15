import type { Drawing } from "../types/drawing";

export const VESTIBULE_JSON_SAMPLE = {
  version: "1.0",
  unit: "mm",
  drawingBounds: {
    min: { x: -500, y: -500 },
    max: { x: 3500, y: 2500 },
  },
  layers: {
    existingBuildingLines: [
      {
        id: "eb1",
        start: { x: -300, y: 1800 },
        end: { x: 3300, y: 1800 },
        lineType: "solid",
      },
      {
        id: "eb2",
        start: { x: 800, y: 1800 },
        end: { x: 800, y: 2200 },
        lineType: "dashed",
      },
      {
        id: "eb3",
        start: { x: 2200, y: 1800 },
        end: { x: 2200, y: 2200 },
        lineType: "dashed",
      },
    ],
    vestibuleOutline: [
      {
        id: "vo1",
        points: [
          { x: 0, y: 1800 },
          { x: 0, y: 0 },
          { x: 3000, y: 0 },
          { x: 3000, y: 1800 },
        ],
        closed: false,
      },
    ],
    frames: [
      {
        id: "f1",
        start: { x: 0, y: 1800 },
        end: { x: 0, y: 0 },
        thickness: 70,
        material: "Aluminum",
      },
      {
        id: "f2",
        start: { x: 0, y: 0 },
        end: { x: 3000, y: 0 },
        thickness: 70,
        material: "Aluminum",
      },
      {
        id: "f3",
        start: { x: 3000, y: 0 },
        end: { x: 3000, y: 1800 },
        thickness: 70,
        material: "Aluminum",
      },
    ],
    posts: [
      {
        id: "p1",
        position: { x: 0, y: 0 },
        width: 90,
        depth: 90,
      },
      {
        id: "p2",
        position: { x: 3000, y: 0 },
        width: 90,
        depth: 90,
      },
      {
        id: "p3",
        position: { x: 900, y: 0 },
        width: 75,
        depth: 75,
      },
      {
        id: "p4",
        position: { x: 2100, y: 0 },
        width: 75,
        depth: 75,
      },
    ],
    mullions: [
      {
        id: "m1",
        start: { x: 0, y: 900 },
        end: { x: 90, y: 900 },
        thickness: 45,
      },
      {
        id: "m2",
        start: { x: 2910, y: 900 },
        end: { x: 3000, y: 900 },
        thickness: 45,
      },
    ],
    glassPanels: [
      {
        id: "g1",
        points: [
          { x: 35, y: 50 },
          { x: 35, y: 1750 },
        ],
        glassType: "WireGlass",
      },
      {
        id: "g2",
        points: [
          { x: 2965, y: 50 },
          { x: 2965, y: 1750 },
        ],
        glassType: "WireGlass",
      },
    ],
    slidingDoors: [
      {
        id: "sd1",
        start: { x: 900, y: 0 },
        end: { x: 2100, y: 0 },
        width: 1200,
        direction: "both",
        panelCount: 2,
      },
    ],
    hingedDoors: [],
    fixedWindows: [
      {
        id: "fw1",
        start: { x: 0, y: 0 },
        end: { x: 900, y: 0 },
        width: 900,
      },
      {
        id: "fw2",
        start: { x: 2100, y: 0 },
        end: { x: 3000, y: 0 },
        width: 900,
      },
    ],
    dimensions: [
      {
        id: "d1",
        start: { x: 0, y: -250 },
        end: { x: 3000, y: -250 },
        text: "W = 3000",
        offset: -200,
      },
      {
        id: "d2",
        start: { x: -250, y: 0 },
        end: { x: -250, y: 1800 },
        text: "D = 1800",
        offset: -200,
      },
      {
        id: "d3",
        start: { x: 900, y: -100 },
        end: { x: 2100, y: -100 },
        text: "開口 = 1200",
        offset: -100,
      },
    ],
    labels: [
      {
        id: "l1",
        text: "2枚引違い風除室 (ハンガー式)",
        position: { x: 1500, y: 300 },
        height: 80,
      },
      {
        id: "l2",
        text: "FIX窓 (単板5mm)",
        position: { x: 450, y: -150 },
        height: 50,
      },
      {
        id: "l3",
        text: "FIX窓 (単板5mm)",
        position: { x: 2550, y: -150 },
        height: 50,
      },
    ],
    notes: [
      {
        id: "n1",
        text: "※既存建物壁（タイル面）凹凸あり。現場にてコーキングによる取り合い調整要す。",
        position: { x: 0, y: 2050 },
        height: 55,
      },
      {
        id: "n2",
        text: "※土間勾配：正面に向けて 1/100 傾斜あり、アジャスター調整必要。",
        position: { x: 0, y: 2200 },
        height: 55,
      },
    ],
    directionMarker: {
      id: "dir1",
      position: { x: 1500, y: -600 },
      direction: 90,
      label: "正面方向",
    },
  },
} as const satisfies Drawing;
