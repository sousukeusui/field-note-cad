import { DRAWING_LAYER_ORDER, getLayerDefinition } from "./layers";
import type { Drawing, Point } from "../types/drawing";

/** DXF コード番号と値を1行ずつのペア配列に変換する */
function dxfPair(code: number, value: string | number): string[] {
  // DXF はコード番号と値を 1 行ずつ並べる形式なので、共通化しておく。
  return [String(code).padStart(3, " "), String(value)];
}

/** DXF に LINE エンティティを追加する */
function pushLine(
  dxf: string[],
  start: Point,
  end: Point,
  /** DXF レイヤー名（LAYER テーブルに登録済みであること） */
  layer: string,
): void {
  dxf.push(
    ...dxfPair(0, "LINE"),
    ...dxfPair(8, layer),
    ...dxfPair(10, start.x),
    ...dxfPair(20, start.y),
    ...dxfPair(11, end.x),
    ...dxfPair(21, end.y),
  );
}

/**
 * DXF に TEXT エンティティを追加する
 * @param height スケール適用済みのテキスト高さ
 */
function pushText(
  dxf: string[],
  text: string,
  position: Point,
  height: number,
  layer: string,
): void {
  dxf.push(
    ...dxfPair(0, "TEXT"),
    ...dxfPair(8, layer),
    ...dxfPair(10, position.x),
    ...dxfPair(20, position.y),
    ...dxfPair(40, height),
    ...dxfPair(1, text),
    ...dxfPair(50, 0),
  );
}

/** DXF に CIRCLE エンティティを追加する */
function pushCircle(
  dxf: string[],
  center: Point,
  radius: number,
  layer: string,
): void {
  dxf.push(
    ...dxfPair(0, "CIRCLE"),
    ...dxfPair(8, layer),
    ...dxfPair(10, center.x),
    ...dxfPair(20, center.y),
    ...dxfPair(40, radius),
  );
}

/**
 * Drawing オブジェクトから R12 DXF 文字列を生成して返す
 * @param scaleFactor 縮尺（テキスト高さをスケールに合わせて逆数補正するために使う）
 */
export function generateDxf(drawing: Drawing, scaleFactor = 1): string {
  const dxf: string[] = [];

  // 最小構成の R12 DXF を順番に組み立てる。
  dxf.push(...dxfPair(0, "SECTION"), ...dxfPair(2, "HEADER"), ...dxfPair(0, "ENDSEC"));
  dxf.push(...dxfPair(0, "SECTION"), ...dxfPair(2, "TABLES"));
  dxf.push(...dxfPair(0, "TABLE"), ...dxfPair(2, "LTYPE"));
  dxf.push(
    ...dxfPair(0, "LTYPE"),
    ...dxfPair(2, "SOLID"),
    ...dxfPair(70, 0),
    ...dxfPair(3, "Solid line"),
    ...dxfPair(72, 65),
    ...dxfPair(73, 0),
    ...dxfPair(40, 0.0),
  );
  dxf.push(...dxfPair(0, "ENDTAB"));

  dxf.push(...dxfPair(0, "TABLE"), ...dxfPair(2, "LAYER"));
  for (const key of DRAWING_LAYER_ORDER) {
    const layer = getLayerDefinition(key);
    dxf.push(
      ...dxfPair(0, "LAYER"),
      ...dxfPair(2, layer.dxfName),
      ...dxfPair(70, 0),
      ...dxfPair(62, layer.aciColor),
      ...dxfPair(6, "SOLID"),
    );
  }
  dxf.push(...dxfPair(0, "ENDTAB"), ...dxfPair(0, "ENDSEC"));
  dxf.push(...dxfPair(0, "SECTION"), ...dxfPair(2, "BLOCKS"), ...dxfPair(0, "ENDSEC"));
  dxf.push(...dxfPair(0, "SECTION"), ...dxfPair(2, "ENTITIES"));

  const l = drawing.layers;
  // 画面表示と同じ部材を、DXF の各エンティティへ変換する。
  const textHeight = (height: number) => height / scaleFactor;

  l.existingBuildingLines?.forEach((line) => {
    pushLine(dxf, line.start, line.end, "EXISTING_BUILDING");
  });

  l.vestibuleOutline?.forEach((outline) => {
    if (outline.points.length < 2) return;
    for (let index = 0; index < outline.points.length - 1; index += 1) {
      pushLine(dxf, outline.points[index], outline.points[index + 1], "VESTIBULE_OUTLINE");
    }
    if (outline.closed) {
      pushLine(
        dxf,
        outline.points[outline.points.length - 1],
        outline.points[0],
        "VESTIBULE_OUTLINE",
      );
    }
  });

  l.frames?.forEach((frame) => {
    pushLine(dxf, frame.start, frame.end, "FRAME");
  });

  l.posts?.forEach((post) => {
    const left = post.position.x - post.width / 2;
    const top = post.position.y - post.depth / 2;
    pushLine(dxf, { x: left, y: top }, { x: left + post.width, y: top }, "POST");
    pushLine(
      dxf,
      { x: left + post.width, y: top },
      { x: left + post.width, y: top + post.depth },
      "POST",
    );
    pushLine(
      dxf,
      { x: left + post.width, y: top + post.depth },
      { x: left, y: top + post.depth },
      "POST",
    );
    pushLine(dxf, { x: left, y: top + post.depth }, { x: left, y: top }, "POST");
  });

  l.mullions?.forEach((mullion) => {
    pushLine(dxf, mullion.start, mullion.end, "MULLION");
  });

  l.glassPanels?.forEach((panel) => {
    if (panel.points.length >= 2) {
      pushLine(dxf, panel.points[0], panel.points[1], "GLASS");
    }
  });

  l.slidingDoors?.forEach((door) => {
    const mid = {
      x: (door.start.x + door.end.x) / 2,
      y: (door.start.y + door.end.y) / 2,
    };
    pushLine(
      dxf,
      { x: door.start.x, y: door.start.y - 15 },
      { x: mid.x + 25, y: mid.y - 15 },
      "SLIDING_DOOR",
    );
    pushLine(
      dxf,
      { x: mid.x - 25, y: mid.y + 15 },
      { x: door.end.x, y: door.end.y + 15 },
      "SLIDING_DOOR",
    );
    pushLine(
      dxf,
      { x: mid.x - 100, y: mid.y + 40 },
      { x: mid.x - 300, y: mid.y + 40 },
      "SLIDING_DOOR",
    );
    pushLine(
      dxf,
      { x: mid.x + 100, y: mid.y - 40 },
      { x: mid.x + 300, y: mid.y - 40 },
      "SLIDING_DOOR",
    );
  });

  l.hingedDoors?.forEach((door) => {
    const radius = door.width;
    const isOutward = door.swing !== "inward";
    // 開き戸は、丁番位置から扉の開き軌跡を近似線分で描く。
    pushLine(
      dxf,
      door.position,
      {
        x: door.position.x,
        y: door.position.y + (isOutward ? radius : -radius),
      },
      "HINGED_DOOR",
    );
    let lastPoint = {
      x: door.position.x,
      y: door.position.y + (isOutward ? radius : -radius),
    };
    for (let index = 1; index <= 6; index += 1) {
      const rad = (Math.PI / 2) * (1 - index / 6);
      const nextPoint = {
        x: door.position.x + radius * Math.cos(rad),
        y: door.position.y + (isOutward ? radius : -radius) * Math.sin(rad),
      };
      pushLine(dxf, lastPoint, nextPoint, "HINGED_DOOR");
      lastPoint = nextPoint;
    }
  });

  l.fixedWindows?.forEach((window) => {
    pushLine(dxf, window.start, window.end, "FIXED_WINDOW");
  });

  l.dimensions?.forEach((dimension) => {
    // 寸法線は、元線から法線方向へオフセットして配置する。
    const dx = dimension.end.x - dimension.start.x;
    const dy = dimension.end.y - dimension.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (!length) return;
    const nx = -dy / length;
    const ny = dx / length;
    const startOffset = {
      x: dimension.start.x + nx * dimension.offset,
      y: dimension.start.y + ny * dimension.offset,
    };
    const endOffset = {
      x: dimension.end.x + nx * dimension.offset,
      y: dimension.end.y + ny * dimension.offset,
    };
    pushLine(
      dxf,
      dimension.start,
      {
        x: startOffset.x + nx * (dimension.offset > 0 ? 50 : -50),
        y: startOffset.y + ny * (dimension.offset > 0 ? 50 : -50),
      },
      "DIMENSION",
    );
    pushLine(
      dxf,
      dimension.end,
      {
        x: endOffset.x + nx * (dimension.offset > 0 ? 50 : -50),
        y: endOffset.y + ny * (dimension.offset > 0 ? 50 : -50),
      },
      "DIMENSION",
    );
    pushLine(dxf, startOffset, endOffset, "DIMENSION");
    pushText(
      dxf,
      dimension.text,
      {
        x: (startOffset.x + endOffset.x) / 2 - 100,
        y: (startOffset.y + endOffset.y) / 2 + 20,
      },
      textHeight(50),
      "DIMENSION",
    );
  });

  l.labels?.forEach((label) => {
    pushText(
      dxf,
      label.text,
      { x: label.position.x - 150, y: label.position.y },
      textHeight(label.height || 60),
      "LABEL",
    );
  });

  l.notes?.forEach((note) => {
    pushText(
      dxf,
      note.text,
      note.position,
      textHeight(note.height || 45),
      "NOTE",
    );
  });

  if (l.directionMarker) {
    // 正面方向は円と矢印で表現する。
    pushCircle(dxf, l.directionMarker.position, 80, "DIRECTION");
    pushText(
      dxf,
      l.directionMarker.label,
      { x: l.directionMarker.position.x - 100, y: l.directionMarker.position.y - 150 },
      textHeight(45),
      "DIRECTION",
    );
    pushLine(
      dxf,
      {
        x: l.directionMarker.position.x,
        y: l.directionMarker.position.y - 50,
      },
      {
        x: l.directionMarker.position.x,
        y: l.directionMarker.position.y + 50,
      },
      "DIRECTION",
    );
    pushLine(
      dxf,
      {
        x: l.directionMarker.position.x,
        y: l.directionMarker.position.y + 50,
      },
      {
        x: l.directionMarker.position.x - 20,
        y: l.directionMarker.position.y + 20,
      },
      "DIRECTION",
    );
    pushLine(
      dxf,
      {
        x: l.directionMarker.position.x,
        y: l.directionMarker.position.y + 50,
      },
      {
        x: l.directionMarker.position.x + 20,
        y: l.directionMarker.position.y + 20,
      },
      "DIRECTION",
    );
  }

  dxf.push(...dxfPair(0, "ENDSEC"), ...dxfPair(0, "EOF"));
  return dxf.join("\n");
}
