export interface Point {
  x: number;
  y: number;
}

export interface DrawingBounds {
  min: Point;
  max: Point;
}

export type LineType = "solid" | "dashed" | "dotted";
export type SlidingDirection = "left" | "right" | "both";
export type SwingDirection = "inward" | "outward";

export interface ExistingBuildingLine {
  id: string;
  start: Point;
  end: Point;
  lineType: LineType;
}

export interface VestibuleOutline {
  id: string;
  points: Point[];
  closed: boolean;
}

export interface Frame {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  material?: string;
}

export interface Post {
  id: string;
  position: Point;
  width: number;
  depth: number;
}

export interface Mullion {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
}

export interface GlassPanel {
  id: string;
  points: Point[];
  glassType: string;
}

export interface SlidingDoor {
  id: string;
  start: Point;
  end: Point;
  width: number;
  direction: SlidingDirection;
  panelCount: number;
}

export interface HingedDoor {
  id: string;
  position: Point;
  width: number;
  angle: number;
  swing: SwingDirection;
}

export interface FixedWindow {
  id: string;
  start: Point;
  end: Point;
  width: number;
}

export interface Dimension {
  id: string;
  start: Point;
  end: Point;
  text: string;
  offset: number;
}

export interface TextLabel {
  id: string;
  text: string;
  position: Point;
  height: number;
}

export interface DirectionMarker {
  id: string;
  position: Point;
  direction: number;
  label: string;
}

export interface DrawingLayers {
  existingBuildingLines?: ExistingBuildingLine[];
  vestibuleOutline?: VestibuleOutline[];
  frames?: Frame[];
  posts?: Post[];
  mullions?: Mullion[];
  glassPanels?: GlassPanel[];
  slidingDoors?: SlidingDoor[];
  hingedDoors?: HingedDoor[];
  fixedWindows?: FixedWindow[];
  dimensions?: Dimension[];
  labels?: TextLabel[];
  notes?: TextLabel[];
  directionMarker?: DirectionMarker;
}

export interface Drawing {
  version: string;
  unit: "mm";
  drawingBounds: DrawingBounds;
  layers: DrawingLayers;
}

export interface PromptCommonParams {
  widthMm: string | number;
  depthMm: string | number;
  doorPosition: string;
  frameThicknessMm: string | number;
}

export interface PromptAParams extends PromptCommonParams {
  sashType: string;
  glassType: string;
}

export interface PromptBParams extends PromptCommonParams {
  structureType: string;
  glassType: string;
}
