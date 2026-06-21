import type { Point } from "../types/drawing";

/**
 * 矢印の矢頭を構成する2点（左翼・右翼）を返す
 * @param headLength 矢頭の長さ（デフォルト 45）
 * @returns [左翼先端, 右翼先端]
 */
export function buildArrowHeadPoints(
  from: Point,
  to: Point,
  headLength = 45,
): [Point, Point] {
  // 進行方向の角度から、矢印の両翼を 30 度ずつ開いて計算する。
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return [
    {
      x: to.x - headLength * Math.cos(angle - Math.PI / 6),
      y: to.y - headLength * Math.sin(angle - Math.PI / 6),
    },
    {
      x: to.x - headLength * Math.cos(angle + Math.PI / 6),
      y: to.y - headLength * Math.sin(angle + Math.PI / 6),
    },
  ];
}
