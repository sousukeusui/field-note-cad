import type { PromptAParams, PromptBParams } from "../types/drawing";

function formatMm(value: string | number): string {
  return `${value}`;
}

export function buildPromptA(params: PromptAParams): string {
  const width = formatMm(params.widthMm);
  const depth = formatMm(params.depthMm);
  const frame = formatMm(params.frameThicknessMm);

  return `# 命令
あなたは優秀なサッシおよび外構（エクステリア）の図面作成アシスタントです。
提示された「土間（ポーチ）や既存壁の寸法が描かれた平面図・採寸メモ」の画像を極めて精密に解析し、以下の【設計ルール】に従って計算・設計した、風除室（ふうじょしつ）の平面図JSONのみを出力してください。
マークダウン箇所（前後の日本語の挨拶、説明等）は一切不要です。純粋なJSONのみを返してください。

# 単位
- すべてミリメートル（mm）単位とします。

# 設計ルール（土間・壁からの逆算）
1. 【風除室外郭（vestibuleOutline）の決定】:
- 風除室は、土間の端（境界ライン）より一律 50mm 内側（オフセット）に設置するものと仮定し、外郭座標を決定してください。
2. 【既存壁との結合（existingBuildingLines）】:
- 既存の建物壁面および玄関枠のラインを正確に抽出し、風除室が突き当たる位置に直線を配置してください。
3. 【柱（posts）の自動配置】:
- 外郭の出隅（コーナー角）の内側に、90mm x 90mm のアルミコーナー柱を自動で配置してください（postsレイヤーに中心座標・幅・奥行きを指定）。
4. 【建具・FIXの配置割り出し】:
- 正面（土間先端）の間口寸法に基づき、中央部に「幅1200mmの2枚引き違い引戸（slidingDoors）」を配置し、残った左右の隙間に「FIX窓（fixedWindows）」を等幅で自動配置してください。
- アルミフレーム（frames）の標準見込み（厚み）は ${frame} mm とします。
5. 【寸法線（dimensions）】:
- 土間の外寸、および風除室の仕上がり外寸、引き戸開口幅を示す寸法線を自動算出してプロットしてください。

# 入力条件
- 土間間口 W: ${width} mm
- 土間奥行 D: ${depth} mm
- 引き戸設置の希望箇所: ${params.doorPosition}
- サッシ/建具種: ${params.sashType}
- ガラス種: ${params.glassType}

# JSON Schema
{
"version": "1.0",
"unit": "mm",
"drawingBounds": {
"min": {"x": -500, "y": -500},
"max": {"x": 3500, "y": 3000}
},
"layers": {
"existingBuildingLines": [],
"vestibuleOutline": [],
"frames": [],
"posts": [],
"mullions": [],
"glassPanels": [],
"slidingDoors": [],
"hingedDoors": [],
"fixedWindows": [],
"dimensions": [],
"labels": [],
"notes": [],
"directionMarker": {
  "id": "dir1",
  "position": {"x": 1500, "y": -600},
  "direction": 90,
  "label": "正面方向"
}
}
}
`;
}

export function buildPromptB(params: PromptBParams): string {
  const width = formatMm(params.widthMm);
  const depth = formatMm(params.depthMm);
  const frame = formatMm(params.frameThicknessMm);

  return `# 命令
あなたは優秀なサッシおよび外構（エクステリア）の図面作成アシスタントです。
提示された「手書きの風除室完成平面図・ラフスケッチ（寸法入り）」の画像を極めて精密に解析し、描かれている風除室の形状、柱位置、ドア種類、ガラス、寸法情報をすべて抽出し、以下の【JSON Schema】に完全に適合する平面図JSONのみを出力してください。
マークダウン箇所（前後の日本語の挨拶、説明等）は一切不要です。純粋なJSONのみを返してください。

# 単位
- すべてミリメートル（mm）単位とします。

# 抽出ルール（忠実なトレース）
1. 【外壁・既存物（existingBuildingLines）】:
- スケッチに記述された「既存サッシ枠」「既存建物壁（タイル面等）」を識別し、実座標にマッピングして直線を描画してください。
2. 【サッシ枠・柱の抽出（frames / posts）】:
- スケッチ上に描かれた枠線およびコーナー柱（「柱」「90角」などのメモがある部分）を検出し、その座標とサイズ（幅・奥行）を忠実に変換してください。
3. 【ドアの開閉方式の識別（slidingDoors / hingedDoors）】:
- 「引違い戸」「片引き戸」「開き戸（スイング）」を記号から正確に分類し、適切な平面記号配列に代入してください。
4. 【寸法値・注記（dimensions / notes）】:
- スケッチ内に手書きで引き出されている「W=3000」「D=1500」などの寸法線と、余白に書かれている現場の注意書きメモ（例：「土間ハツリ要す」など）をテキストとして余さずJSONに格納してください。

# 入力条件
- 土間間口 W: ${width} mm
- 土間奥行 D: ${depth} mm
- 引き戸設置の希望箇所: ${params.doorPosition}
- サッシ/建具種: ${params.structureType}
- ガラス種: ${params.glassType}
- 標準フレーム厚み: ${frame} mm

# JSON Schema
※プロンプトAで指定されたスキーマと同一形式で、抽出した風除室データを格納して出力すること。

*仕様書 完.*`;
}
