import type { Drawing } from "../types/drawing";
import { OPTIONAL_ARRAY_LAYER_KEYS } from "./layers";

/** JSON.parse が成功した場合の結果 */
type JsonParseSuccess = {
  data: unknown;
  error: null;
};

/** JSON.parse が失敗した場合の結果 */
type JsonParseFailure = {
  data: null;
  /** ユーザーに見せるエラーメッセージ */
  error: string;
};

/** parseDrawingJson の戻り値。成功・失敗をディスクリミネートする */
export type JsonParseResult = JsonParseSuccess | JsonParseFailure;

/** JSON 文字列をパースして Drawing データか失敗情報を返す */
export function parseDrawingJson(rawText: string): JsonParseResult {
  try {
    return { data: JSON.parse(rawText), error: null };
  } catch (error) {
    return { data: null, error: getJsonParseErrorMessage(error) };
  }
}

/** JSON.parse が投げたエラーから表示用メッセージを取り出す */
export function getJsonParseErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError && error.message) {
    return error.message;
  }

  return "JSONの構文に問題があります。";
}

/**
 * レイヤー内の各要素に必須フィールドが揃っているか確認する。
 * @param hints 正しいフィールド名 → AIがよく使う誤ったフィールド名のマッピング
 */
function checkItems(
  layerName: string,
  items: unknown[],
  requiredFields: string[],
  hints: Partial<Record<string, string>> = {}
): string | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (typeof item !== "object" || item === null) {
      return `layers.${layerName}[${i}]: 各要素はオブジェクト形式にしてください。`;
    }
    const obj = item as Record<string, unknown>;

    for (const field of requiredFields) {
      if (obj[field] === undefined) {
        const wrongField = hints[field];
        if (wrongField && obj[wrongField] !== undefined) {
          return `layers.${layerName}[${i}]: '${field}' フィールドが必要です（'${wrongField}' は不正なフィールド名です）`;
        }
        return `layers.${layerName}[${i}]: '${field}' フィールドが必要です`;
      }
    }

    // points フィールドが存在する場合、配列であることを確認する。
    if ("points" in obj && !Array.isArray(obj.points)) {
      return `layers.${layerName}[${i}]: 'points' は座標配列 [{x, y}, ...] にしてください（'{min, max}' 形式は不正です）`;
    }
  }
  return null;
}

/** 図面スキーマの必須フィールドと型を検証し、問題があればエラー文字列を返す */
export function validateDrawingSchema(data: unknown): string | null {
  // まずは JSON オブジェクトとして扱える形かを確認する。
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return "JSON構造はオブジェクト形式で指定する必要があります。";
  }

  const drawing = data as Partial<Drawing> & {
    layers?: Record<string, unknown>;
    drawingBounds?: { min?: unknown; max?: unknown };
  };

  if (!drawing.version) {
    return "ルートの 'version' フィールドが必要です.";
  }

  // この実装は mm 単位のみを前提にしている。
  if (drawing.unit !== "mm") {
    return "サポートする単位 'unit' は 'mm' 限定です。";
  }

  if (
    !drawing.drawingBounds ||
    !drawing.drawingBounds.min ||
    !drawing.drawingBounds.max
  ) {
    return "描画領域境界 'drawingBounds' が不足しています。";
  }

  if (!drawing.layers) {
    return "図面要素画層 'layers' が定義されていません。";
  }

  for (const key of OPTIONAL_ARRAY_LAYER_KEYS) {
    // 配列レイヤーは、定義されたとおり配列か未定義である必要がある。
    const value = drawing.layers[key];
    if (value !== undefined && !Array.isArray(value)) {
      return `layersの要素 '${key}' は配列形式にしてください。`;
    }
  }

  // directionMarker だけは単一オブジェクトなので、他の配列レイヤーと分けて検証する。
  if (
    drawing.layers.directionMarker !== undefined &&
    (typeof drawing.layers.directionMarker !== "object" ||
      drawing.layers.directionMarker === null ||
      Array.isArray(drawing.layers.directionMarker))
  ) {
    return "layersの要素 'directionMarker' は単一オブジェクト形式にしてください。";
  }

  // --- 各レイヤー要素のフィールドレベル検証 ---
  // [レイヤー名, 必須フィールド, ヒント(正フィールド名 → 誤フィールド名)] の順に定義する。
  const layerChecks: [string, string[], Partial<Record<string, string>>?][] = [
    ["existingBuildingLines", ["id", "start", "end", "lineType"]],
    ["vestibuleOutline",      ["id", "points", "closed"]],
    ["frames",                ["id", "start", "end", "thickness"]],
    ["posts",                 ["id", "position", "width", "depth"],  { position: "center" }],
    ["mullions",              ["id", "start", "end", "thickness"],   { start: "center" }],
    ["glassPanels",           ["id", "points", "glassType"],         { points: "bounds" }],
    ["slidingDoors",          ["id", "start", "end", "width", "direction", "panelCount"]],
    ["hingedDoors",           ["id", "position", "width", "angle", "swing"]],
    ["fixedWindows",          ["id", "start", "end", "width"]],
    ["dimensions",            ["id", "start", "end", "text", "offset"], { text: "label" }],
    ["labels",                ["id", "text", "position", "height"]],
    ["notes",                 ["id", "text", "position", "height"]],
  ];

  for (const [layerName, requiredFields, hints] of layerChecks) {
    const items = drawing.layers[layerName];
    if (!Array.isArray(items)) continue;
    const error = checkItems(layerName, items, requiredFields, hints ?? {});
    if (error) return error;
  }

  // directionMarker のフィールドチェック
  if (drawing.layers.directionMarker !== undefined) {
    const dm = drawing.layers.directionMarker as unknown as Record<string, unknown>;
    for (const field of ["id", "position", "direction", "label"]) {
      if (dm[field] === undefined) {
        return `layers.directionMarker: '${field}' フィールドが必要です`;
      }
    }
  }

  return null;
}
