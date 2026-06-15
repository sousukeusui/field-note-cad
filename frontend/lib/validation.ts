import type { Drawing } from "../types/drawing";
import { OPTIONAL_ARRAY_LAYER_KEYS } from "./layers";

type JsonParseSuccess = {
  data: unknown;
  error: null;
};

type JsonParseFailure = {
  data: null;
  error: string;
};

export type JsonParseResult = JsonParseSuccess | JsonParseFailure;

export function parseDrawingJson(rawText: string): JsonParseResult {
  try {
    return { data: JSON.parse(rawText), error: null };
  } catch (error) {
    return { data: null, error: getJsonParseErrorMessage(error) };
  }
}

export function getJsonParseErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError && error.message) {
    return error.message;
  }

  return "JSONの構文に問題があります。";
}

export function validateDrawingSchema(data: unknown): string | null {
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
    const value = drawing.layers[key];
    if (value !== undefined && !Array.isArray(value)) {
      return `layersの要素 '${key}' は配列形式にしてください。`;
    }
  }

  if (
    drawing.layers.directionMarker !== undefined &&
    (typeof drawing.layers.directionMarker !== "object" ||
      drawing.layers.directionMarker === null ||
      Array.isArray(drawing.layers.directionMarker))
  ) {
    return "layersの要素 'directionMarker' は単一オブジェクト形式にしてください。";
  }

  return null;
}
