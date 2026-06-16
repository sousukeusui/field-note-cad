"use client";

import { useState } from "react";
import { Download, FileJson, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DrawingPreview } from "@/components/DrawingPreview";
import { generateDxf } from "@/lib/dxf-generator";
import { VESTIBULE_JSON_SAMPLE } from "@/lib/sample-data";
import { validateDrawingSchema } from "@/lib/validation";
import type { Drawing } from "@/types/drawing";

export default function Home() {
  const [drawing, setDrawing] = useState<Drawing>(VESTIBULE_JSON_SAMPLE);
  const [scaleFactor, setScaleFactor] = useState(1);

  const validationMessage = validateDrawingSchema(drawing);

  function handleDownloadDxf() {
    // 入力が不正なまま DXF を作らない。
    if (validationMessage !== null) return;
    const dxf = generateDxf(drawing, scaleFactor);
    downloadTextFile(
      dxf,
      `vestibule_${Date.now()}.dxf`,
      "application/dxf;charset=utf-8",
    );
  }

  function handleLoadSample() {
    setDrawing(VESTIBULE_JSON_SAMPLE);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <PageHeader
          isValid={validationMessage === null}
          onDownloadDxf={handleDownloadDxf}
          onLoadSample={handleLoadSample}
        />
        <section className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <StatusPanel
            drawing={drawing}
            scaleFactor={scaleFactor}
            onScaleChange={setScaleFactor}
            validationMessage={validationMessage}
          />
          <DrawingPreview drawing={drawing} className="min-h-[680px]" />
        </section>
      </div>
    </main>
  );
}

/**
 * テキストコンテンツをブラウザのダウンロードとして保存する
 * @param mimeType レスポンスの MIME タイプ（例: "application/dxf;charset=utf-8"）
 */
function downloadTextFile(content: string, filename: string, mimeType: string) {
  // Blob にしておくと、ブラウザ標準の保存処理をそのまま使える。
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type PageHeaderProps = {
  isValid: boolean;
  onDownloadDxf: () => void;
  onLoadSample: () => void;
};

/** ページ上部のタイトル・バッジ・アクションボタン群 */
function PageHeader({ isValid, onDownloadDxf, onLoadSample }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
          <ZoomIn className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              風除室 DXF プレビュー
            </h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              バッチ3
            </span>
          </div>
          <p className="text-sm text-slate-500">
            サンプルJSONのSVG表示とR12 DXF書き出しを確認するための最小実装です。
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onLoadSample}>
          <FileJson className="size-4" />
          サンプル読込
        </Button>
        <Button
          size="sm"
          className="bg-slate-900 text-white hover:bg-slate-800"
          onClick={onDownloadDxf}
          disabled={!isValid}
        >
          <Download className="size-4" />
          DXF保存
        </Button>
      </div>
    </header>
  );
}

type StatusPanelProps = {
  drawing: Drawing;
  scaleFactor: number;
  onScaleChange: (value: number) => void;
  validationMessage: string | null;
};

/** 検証結果・スケール選択・出力情報を表示するサイドパネル */
function StatusPanel({ drawing, scaleFactor, onScaleChange, validationMessage }: StatusPanelProps) {
  return (
    <Card className="h-fit">
      <CardHeader className="border-b border-slate-100">
        <CardTitle>生成状態</CardTitle>
        <CardDescription>バッチ3ではサンプル図面をそのまま表示しています。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="font-semibold">検証結果</div>
          <div className="mt-1">{validationMessage ?? "サンプルJSONは有効です。"}</div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            CADスケール
          </label>
          <select
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-900"
            value={scaleFactor}
            onChange={(event) => onScaleChange(Number(event.target.value))}
          >
            <option value={1}>実寸 (1:1)</option>
            <option value={20}>1:20 推奨</option>
            <option value={50}>1:50</option>
          </select>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-medium text-slate-900">現在の出力</div>
          <div className="mt-2 space-y-1">
            <div>外形: {drawing.drawingBounds.max.x} × {drawing.drawingBounds.max.y} mm</div>
            <div>レイヤー数: {Object.keys(drawing.layers).length}</div>
            <div>方向マーカー: {drawing.layers.directionMarker ? "あり" : "なし"}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
