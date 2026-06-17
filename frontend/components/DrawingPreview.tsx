"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

import { buildArrowHeadPoints } from "@/lib/svg-helpers";
import { getLayerDefinition } from "@/lib/layers";
import type { Drawing, FixedWindow, Point } from "@/types/drawing";
import { cn } from "@/lib/utils";

type DrawingPreviewProps = {
  /** 描画する図面データ。null のときは空のプレースホルダーを表示する */
  drawing: Drawing | null;
  /** ラッパー div に追加する CSS クラス */
  className?: string;
};

/** React key の衝突を防ぐためのプレフィックス付きキー生成ヘルパー */
function makeLineKey(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

/** 図面の境界から SVG viewBox 文字列を生成する */
function getViewBox(drawing: Drawing | null): string {
  if (!drawing) {
    return "-500 -500 4000 3000";
  }

  const { min, max } = drawing.drawingBounds;
  // SVG は y 軸が下向きなので、図面座標をそのまま見せるために反転する。
  return `${min.x} ${-max.y} ${max.x - min.x} ${max.y - min.y}`;
}

/** 図面境界の中心点を返す */
function getCenter(drawing: Drawing | null): Point {
  if (!drawing) {
    return { x: 1500, y: 1000 };
  }

  const { min, max } = drawing.drawingBounds;
  return { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 };
}

/** 矢印シンボル（線 + 塗りつぶし矢頭）を描画するコンポーネント */
function ArrowGlyph({
  from,
  to,
  stroke,
  strokeWidth,
}: {
  from: Point;
  to: Point;
  stroke: string;
  strokeWidth: number;
}) {
  const [headLeft, headRight] = buildArrowHeadPoints(from, to);
  return (
    <>
      <line
        x1={from.x}
        y1={-from.y}
        x2={to.x}
        y2={-to.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <polygon
        points={`${to.x},${-to.y} ${headLeft.x},${-headLeft.y} ${headRight.x},${-headRight.y}`}
        fill={stroke}
      />
    </>
  );
}

/** 外部から zoomIn / zoomOut / resetViewport を呼び出すためのハンドル */
export type DrawingPreviewHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetViewport: () => void;
};

/** 図面データをズーム・パン操作付きの SVG でプレビューするコンポーネント */
export const DrawingPreview = forwardRef<DrawingPreviewHandle, DrawingPreviewProps>(
  function DrawingPreview({ drawing, className }, ref) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [pointerOrigin, setPointerOrigin] = useState({ x: 0, y: 0 });

  const viewBox = useMemo(() => getViewBox(drawing), [drawing]);
  const center = useMemo(() => getCenter(drawing), [drawing]);

  useEffect(() => {
    function handleMove(event: PointerEvent) {
      if (!dragging) return;
      // ポインタが SVG から外れても追従できるよう、window でパンを更新する。
      setPan({
        x: event.clientX - pointerOrigin.x,
        y: event.clientY - pointerOrigin.y,
      });
    }

    function handleUp() {
      setDragging(false);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, pointerOrigin]);

  function clampZoom(value: number) {
    return Math.max(0.2, Math.min(value, 5));
  }

  function zoomBy(factor: number) {
    setZoom((current) => clampZoom(current * factor));
  }

  function resetViewport() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  useImperativeHandle(ref, () => ({
    zoomIn: () => setZoom((z) => clampZoom(z * 1.2)),
    zoomOut: () => setZoom((z) => clampZoom(z * 0.83)),
    resetViewport,
  }));

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    setDragging(true);
    setPointerOrigin({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  }

  /** FIX窓の両端を SVG 座標（y 軸反転済み）で返す */
  function getFixedWindowEdges(window: FixedWindow): [Point, Point] {
    // SVG の描画方向に合わせて、ここでも y 座標を反転して返す。
    return [
      { x: window.start.x, y: -window.start.y },
      { x: window.end.x, y: -window.end.y },
    ];
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>

      <svg
        viewBox={viewBox}
        className="h-full w-full cursor-grab bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        role="img"
        aria-label="drawing preview"
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {!drawing ? (
            <text
              x={center.x}
              y={-center.y}
              textAnchor="middle"
              fontSize="100"
              fill="#94a3b8"
              fontWeight="500"
            >
              JSONデータを左エディタに入力すると、風除室の図面が描画されます。
            </text>
          ) : (
            <>
              {drawing.layers.existingBuildingLines?.map((line, index) => (
                <line
                  key={makeLineKey("existing", index)}
                  x1={line.start.x}
                  y1={-line.start.y}
                  x2={line.end.x}
                  y2={-line.end.y}
                  stroke={getLayerDefinition("existingBuildingLines").svgStroke}
                  strokeWidth={8}
                  strokeDasharray={line.lineType === "solid" ? undefined : "15, 10"}
                />
              ))}

              {drawing.layers.vestibuleOutline?.map((outline, index) => {
                if (outline.points.length < 2) return null;
                const d = outline.points
                  .map((point, pointIndex) => `${pointIndex === 0 ? "M" : "L"} ${point.x} ${-point.y}`)
                  .join(" ");
                return (
                  <path
                    key={makeLineKey("outline", index)}
                    d={`${d}${outline.closed ? " Z" : ""}`}
                    stroke={getLayerDefinition("vestibuleOutline").svgStroke}
                    strokeWidth={4}
                    fill="none"
                    strokeDasharray="6, 6"
                  />
                );
              })}

              {drawing.layers.frames?.map((frame, index) => (
                <line
                  key={makeLineKey("frame", index)}
                  x1={frame.start.x}
                  y1={-frame.start.y}
                  x2={frame.end.x}
                  y2={-frame.end.y}
                  stroke={getLayerDefinition("frames").svgStroke}
                  strokeWidth={frame.thickness || 10}
                  strokeLinecap="square"
                />
              ))}

              {drawing.layers.glassPanels?.map((panel, index) =>
                (panel.points?.length ?? 0) >= 2 ? (
                  <line
                    key={makeLineKey("glass", index)}
                    x1={panel.points[0].x}
                    y1={-panel.points[0].y}
                    x2={panel.points[1].x}
                    y2={-panel.points[1].y}
                    stroke={getLayerDefinition("glassPanels").svgStroke}
                    strokeWidth={4}
                  />
                ) : null,
              )}

              {drawing.layers.mullions?.map((mullion, index) => (
                <line
                  key={makeLineKey("mullion", index)}
                  x1={mullion.start.x}
                  y1={-mullion.start.y}
                  x2={mullion.end.x}
                  y2={-mullion.end.y}
                  stroke={getLayerDefinition("mullions").svgStroke}
                  strokeWidth={mullion.thickness || 6}
                />
              ))}

              {drawing.layers.fixedWindows?.map((window, index) => {
                // FIX窓は外枠・内枠の2本線で表現するため、両端を±20mm オフセットする
                const [start, end] = getFixedWindowEdges(window);
                return (
                  <g key={makeLineKey("window", index)}>
                    <line
                      x1={start.x - 20}
                      y1={start.y}
                      x2={end.x - 20}
                      y2={end.y}
                      stroke={getLayerDefinition("fixedWindows").svgStroke}
                      strokeWidth={2}
                    />
                    <line
                      x1={start.x + 20}
                      y1={start.y}
                      x2={end.x + 20}
                      y2={end.y}
                      stroke={getLayerDefinition("fixedWindows").svgStroke}
                      strokeWidth={2}
                    />
                  </g>
                );
              })}

              {drawing.layers.slidingDoors?.map((door, index) => {
                const mid = {
                  x: (door.start.x + door.end.x) / 2,
                  y: (door.start.y + door.end.y) / 2,
                };
                const arrowRight = door.direction === "right" || door.direction === "both";
                const arrowLeft = door.direction === "left" || door.direction === "both";

                return (
                  <g key={makeLineKey("sliding", index)}>
                    <line
                      x1={door.start.x}
                      y1={-door.start.y - 15}
                      x2={mid.x + 25}
                      y2={-mid.y - 15}
                      stroke={getLayerDefinition("slidingDoors").svgStroke}
                      strokeWidth={8}
                    />
                    <line
                      x1={mid.x - 25}
                      y1={-mid.y + 15}
                      x2={door.end.x}
                      y2={-door.end.y + 15}
                      stroke={getLayerDefinition("slidingDoors").svgStroke}
                      strokeWidth={8}
                    />
                    {arrowRight ? (
                      <ArrowGlyph
                        from={{ x: mid.x + 100, y: mid.y - 40 }}
                        to={{ x: mid.x + 300, y: mid.y - 40 }}
                        stroke={getLayerDefinition("slidingDoors").svgStroke}
                        strokeWidth={4}
                      />
                    ) : null}
                    {arrowLeft ? (
                      <ArrowGlyph
                        from={{ x: mid.x - 100, y: mid.y + 40 }}
                        to={{ x: mid.x - 300, y: mid.y + 40 }}
                        stroke={getLayerDefinition("slidingDoors").svgStroke}
                        strokeWidth={4}
                      />
                    ) : null}
                  </g>
                );
              })}

              {drawing.layers.hingedDoors?.map((door, index) => {
                const radius = door.width;
                const isOutward = door.swing !== "inward";
                const startY = door.position.y + (isOutward ? radius : -radius);
                // sweep-flag: 外開きは反時計回り(0)、内開きは時計回り(1)で扉軌跡を描く
                const arcPath = `M ${door.position.x} ${-startY} A ${radius} ${radius} 0 0 ${
                  isOutward ? "0" : "1"
                } ${door.position.x + radius} ${-door.position.y}`;

                return (
                  <g key={makeLineKey("hinged", index)}>
                    <line
                      x1={door.position.x}
                      y1={-door.position.y}
                      x2={door.position.x}
                      y2={-startY}
                      stroke={getLayerDefinition("hingedDoors").svgStroke}
                      strokeWidth={8}
                    />
                    <path
                      d={arcPath}
                      stroke="#a78bfa"
                      strokeWidth={3}
                      strokeDasharray="8, 6"
                      fill="none"
                    />
                  </g>
                );
              })}

              {drawing.layers.posts?.map((post, index) => (
                <rect
                  key={makeLineKey("post", index)}
                  x={post.position.x - post.width / 2}
                  y={-post.position.y - post.depth / 2}
                  width={post.width}
                  height={post.depth}
                  stroke={getLayerDefinition("posts").svgStroke}
                  strokeWidth={3}
                  fill={getLayerDefinition("posts").svgFill}
                />
              ))}

              {drawing.layers.dimensions?.map((dimension, index) => {
                const dx = dimension.end.x - dimension.start.x;
                const dy = dimension.end.y - dimension.start.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                if (!length) return null;
                // 寸法補助線は、元の線分に対する法線ベクトルで外側に出す。
                const nx = -dy / length;
                const ny = dx / length;
                const extendedStart = {
                  x: dimension.start.x + nx * dimension.offset,
                  y: dimension.start.y + ny * dimension.offset,
                };
                const extendedEnd = {
                  x: dimension.end.x + nx * dimension.offset,
                  y: dimension.end.y + ny * dimension.offset,
                };
                return (
                  <g key={makeLineKey("dimension", index)}>
                    <line
                      x1={dimension.start.x}
                      y1={-dimension.start.y}
                      x2={extendedStart.x + nx * (dimension.offset > 0 ? 50 : -50)}
                      y2={-(extendedStart.y + ny * (dimension.offset > 0 ? 50 : -50))}
                      stroke={getLayerDefinition("dimensions").svgStroke}
                      strokeWidth={2}
                    />
                    <line
                      x1={dimension.end.x}
                      y1={-dimension.end.y}
                      x2={extendedEnd.x + nx * (dimension.offset > 0 ? 50 : -50)}
                      y2={-(extendedEnd.y + ny * (dimension.offset > 0 ? 50 : -50))}
                      stroke={getLayerDefinition("dimensions").svgStroke}
                      strokeWidth={2}
                    />
                    <line
                      x1={extendedStart.x}
                      y1={-extendedStart.y}
                      x2={extendedEnd.x}
                      y2={-extendedEnd.y}
                      stroke={getLayerDefinition("dimensions").svgStroke}
                      strokeWidth={2}
                    />
                    <text
                      x={(extendedStart.x + extendedEnd.x) / 2}
                      y={-((extendedStart.y + extendedEnd.y) / 2 - 20)}
                      fill={getLayerDefinition("dimensions").svgText}
                      fontSize={50}
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {dimension.text}
                    </text>
                  </g>
                );
              })}

              {drawing.layers.labels?.map((label, index) => (
                <text
                  key={makeLineKey("label", index)}
                  x={label.position.x}
                  y={-label.position.y}
                  fill={getLayerDefinition("labels").svgText}
                  fontSize={(label.height || 60) * 1.2}
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {label.text}
                </text>
              ))}

              {drawing.layers.notes?.map((note, index) => (
                <text
                  key={makeLineKey("note", index)}
                  x={note.position.x}
                  y={-note.position.y}
                  fill={getLayerDefinition("notes").svgText}
                  fontSize={note.height || 45}
                >
                  {note.text}
                </text>
              ))}

              {drawing.layers.directionMarker ? (
                <g>
                  <circle
                    cx={drawing.layers.directionMarker.position.x}
                    cy={-drawing.layers.directionMarker.position.y}
                    r="80"
                    stroke={getLayerDefinition("directionMarker").svgStroke}
                    strokeWidth="4"
                    fill={getLayerDefinition("directionMarker").svgFill}
                  />
                  <ArrowGlyph
                    from={{
                      x: drawing.layers.directionMarker.position.x,
                      y: drawing.layers.directionMarker.position.y + 50,
                    }}
                    to={{
                      x: drawing.layers.directionMarker.position.x,
                      y: drawing.layers.directionMarker.position.y - 50,
                    }}
                    stroke={getLayerDefinition("directionMarker").svgStroke}
                    strokeWidth={6}
                  />
                  <text
                    x={drawing.layers.directionMarker.position.x}
                    y={-(drawing.layers.directionMarker.position.y + 120)}
                    fill="#0891b2"
                    fontSize={45}
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {drawing.layers.directionMarker.label}
                  </text>
                </g>
              ) : null}
            </>
          )}
        </g>
      </svg>
    </div>
  );
});
