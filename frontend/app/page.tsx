"use client";

import { useMemo, useRef, useState } from "react";
import { Layers, Wand2, FileJson, ZoomIn, ZoomOut, Maximize, Download, CheckCircle, AlertOctagon } from "lucide-react";

import { DrawingPreview, type DrawingPreviewHandle } from "@/components/DrawingPreview";
import { JsonEditorPanel, type ValidationState } from "@/components/JsonEditorPanel";
import { Legend } from "@/components/Legend";
import { JsonGeneratorDialog } from "@/components/PromptDialog";
import { generateDxf } from "@/lib/dxf-generator";
import { VESTIBULE_JSON_SAMPLE } from "@/lib/sample-data";
import { parseDrawingJson, validateDrawingSchema } from "@/lib/validation";
import type { Drawing } from "@/types/drawing";

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

type ToastState = {
  visible: boolean;
  title: string;
  desc: string;
  isError: boolean;
};

/** LEDステータスの表示設定 */
const LED_CONFIG: Record<ValidationState, { dotClass: string; label: string }> = {
  waiting:        { dotClass: "bg-slate-400", label: "データ未読込" },
  syntax_error:   { dotClass: "bg-red-500 animate-pulse", label: "描画エラー" },
  invalid_schema: { dotClass: "bg-amber-500 animate-pulse", label: "描画エラー" },
  valid:          { dotClass: "bg-emerald-500 shadow-md shadow-emerald-100", label: "描画中 (正常)" },
};

export default function Home() {
  const [jsonText, setJsonText] = useState("");
  const [scaleFactor, setScaleFactor] = useState(20); // デフォルト 1:20
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ visible: false, title: "", desc: "", isError: false });

  const previewRef = useRef<DrawingPreviewHandle>(null);

  /** JSON入力の変化を受けてバリデーション状態と図面データを一括導出 */
  const { validationState, errorMessage, drawing } = useMemo((): {
    validationState: ValidationState;
    errorMessage: string;
    drawing: Drawing | null;
  } => {
    if (!jsonText.trim()) {
      return { validationState: "waiting", errorMessage: "", drawing: null };
    }
    const parseResult = parseDrawingJson(jsonText);
    if (parseResult.error !== null) {
      return { validationState: "syntax_error", errorMessage: parseResult.error, drawing: null };
    }
    const schemaError = validateDrawingSchema(parseResult.data);
    if (schemaError !== null) {
      return { validationState: "invalid_schema", errorMessage: schemaError, drawing: null };
    }
    return { validationState: "valid", errorMessage: "", drawing: parseResult.data as Drawing };
  }, [jsonText]);

  function showToast(title: string, desc: string, isError = false) {
    setToast({ visible: true, title, desc, isError });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }

  function handleLoadSample() {
    setJsonText(JSON.stringify(VESTIBULE_JSON_SAMPLE, null, 2));
    showToast("サンプル読み込み完了", "風除室のサンプル図面JSONデータを展開しました。");
  }

  function handleDownloadDxf() {
    if (!drawing) return;
    const dxf = generateDxf(drawing, scaleFactor);
    downloadTextFile(dxf, `vestibule_${Date.now()}.dxf`, "application/dxf;charset=utf-8");
    showToast(
      "DXFエクスポート成功",
      `${scaleFactor === 1 ? "実寸大" : `1/${scaleFactor}`}スケール用フォント調整を施して書き出しました！`,
    );
  }

  function handleCopyErrorFix() {
    const prompt = `# 命令\nあなたが生成したJSONオブジェクトを読み込ませたところ、以下のスキーマ検証エラーが発生しました。\n\n## エラー検知ログ\n${errorMessage}\n\n## 再出力の要請\n上記のエラーの原因を正確に修正し、スキーマの条件を完全に満たす valid な JSON コードブロックのみを再生成してください。\nマークダウン以外の日本語の説明や余計な解説文は一切不要です。`;
    navigator.clipboard
      .writeText(prompt)
      .then(() => showToast("コピー成功", "再デバッグ用の命令プロンプトをクリップボードにコピーしました。"))
      .catch(() => showToast("コピー失敗", "クリップボードへの書き込みに失敗しました。", true));
  }

  const led = LED_CONFIG[validationState];

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-800 select-none">
      {/* ===== HEADER ===== */}
      <PageHeader
        onOpenPrompt={() => setIsPromptOpen(true)}
        onLoadSample={handleLoadSample}
      />

      {/* ===== MAIN ===== */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left panel — JSON editor */}
        <JsonEditorPanel
          jsonText={jsonText}
          onJsonChange={setJsonText}
          validationState={validationState}
          errorMessage={errorMessage}
          onCopyErrorFix={handleCopyErrorFix}
        />

        {/* Right panel — canvas */}
        <section className="w-full lg:w-2/3 bg-slate-100 flex flex-col relative overflow-hidden">
          {/* Top-left: LED + zoom controls */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 items-center">
            <div className="bg-white/95 backdrop-blur border border-slate-200 shadow-sm px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 text-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full ${led.dotClass}`} />
              <span>{led.label}</span>
            </div>
            <div className="bg-white/95 backdrop-blur border border-slate-200 shadow-sm rounded-lg flex overflow-hidden">
              <button
                type="button"
                className="p-2 hover:bg-slate-50 text-slate-600 border-r border-slate-200 transition-colors"
                onClick={() => previewRef.current?.zoomIn()}
                title="拡大"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-slate-50 text-slate-600 border-r border-slate-200 transition-colors"
                onClick={() => previewRef.current?.zoomOut()}
                title="縮小"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-slate-50 text-slate-600 transition-colors"
                onClick={() => previewRef.current?.resetViewport()}
                title="全体表示リセット"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Top-right: scale + DXF */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="bg-white/95 backdrop-blur border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">CAD出力縮尺</label>
              <select
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                value={scaleFactor}
                onChange={(e) => setScaleFactor(Number(e.target.value))}
              >
                <option value={1}>実寸 (1:1)</option>
                <option value={20}>S = 1/20 (推奨)</option>
                <option value={50}>S = 1/50</option>
              </select>
            </div>
            <button
              type="button"
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95 border border-slate-950"
              disabled={validationState !== "valid"}
              onClick={handleDownloadDxf}
            >
              <Download className="w-4 h-4" />
              <span>DXF保存</span>
            </button>
          </div>

          {/* Drawing canvas */}
          <div className="flex-1 min-h-0 relative">
            <DrawingPreview
              ref={previewRef}
              drawing={drawing}
              className="absolute inset-0"
            />
          </div>

          {/* Legend */}
          <Legend />
        </section>
      </main>

      {/* ===== JSON GENERATOR DIALOG ===== */}
      <JsonGeneratorDialog
        open={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        onApply={(json) => {
          setJsonText(json);
          showToast("JSON生成完了", "寸法から算出した図面データを左パネルに反映しました。");
        }}
      />

      {/* ===== TOAST ===== */}
      <div
        className={`fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white text-xs font-semibold px-4 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 ${
          toast.visible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"
        } ${toast.isError ? "bg-red-950 border-red-800" : ""}`}
      >
        <div className={`p-1 rounded-full ${toast.isError ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
          {toast.isError ? <AlertOctagon className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        </div>
        <div>
          <p className="font-bold">{toast.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-relaxed">{toast.desc}</p>
        </div>
      </div>
    </div>
  );
}

type PageHeaderProps = {
  onOpenPrompt: () => void;
  onLoadSample: () => void;
};

/** ページ上部のタイトル・バッジ・アクションボタン群 */
function PageHeader({ onOpenPrompt, onLoadSample }: PageHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap justify-between items-center shadow-sm z-20">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 text-white p-2 rounded-xl shadow-md">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>MemoToDXF</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
              v1.0-風除室版
            </span>
          </h1>
          <p className="text-xs text-slate-500">現場メモ・手書き図面をAI経由でCAD互換DXFに一発変換</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 sm:mt-0">
        <button
          type="button"
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-100 transition-all"
          onClick={onOpenPrompt}
        >
          <Wand2 className="w-4 h-4" />
          <span>寸法入力でJSON生成</span>
        </button>
        <button
          type="button"
          className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          onClick={onLoadSample}
        >
          <FileJson className="w-4 h-4" />
          <span>サンプルJSON読込</span>
        </button>
      </div>
    </header>
  );
}
