"use client";

import { useRef } from "react";
import { CodeXml, Upload, X, HelpCircle, AlertTriangle, ShieldAlert, CheckCircle, Info, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type ValidationState = "waiting" | "syntax_error" | "invalid_schema" | "valid";

type JsonEditorPanelProps = {
  jsonText: string;
  onJsonChange: (text: string) => void;
  validationState: ValidationState;
  errorMessage: string;
  onCopyErrorFix: () => void;
};

/** バリデーション状態ごとの表示設定 */
const VALIDATION_CONFIG = {
  waiting: {
    cardClass: "bg-slate-50 border-slate-200",
    iconBoxClass: "p-1.5 rounded-full bg-slate-200 text-slate-600",
    Icon: HelpCircle,
    title: "データ入力待ち",
    desc: "右上の「AIプロンプト作成・コピー」からプロンプトを作成し、AIチャットに図面画像を読ませて、返ってきたJSONを入力してください。",
    showError: false,
  },
  syntax_error: {
    cardClass: "bg-red-50/50 border-red-200",
    iconBoxClass: "p-1.5 rounded-full bg-red-100 text-red-600",
    Icon: AlertTriangle,
    title: "JSON構文エラー",
    desc: "JSONの形式にミス（カンマ漏れやカッコ不一致など）があります。",
    showError: true,
  },
  invalid_schema: {
    cardClass: "bg-amber-50/50 border-amber-200",
    iconBoxClass: "p-1.5 rounded-full bg-amber-100 text-amber-600",
    Icon: ShieldAlert,
    title: "スキーマ不適合",
    desc: "JSON文法は正しいですが、共通図面スキーマの要件に適合していません。",
    showError: true,
  },
  valid: {
    cardClass: "bg-emerald-50/50 border-emerald-200",
    iconBoxClass: "p-1.5 rounded-full bg-emerald-100 text-emerald-600",
    Icon: CheckCircle,
    title: "検証成功 (Valid)",
    desc: "スキーマ検証を無事にクリアしました。CAD用のDXFファイル保存ボタンが有効になります。",
    showError: false,
  },
} as const;

/** JSON入力・バリデーション表示・スキーマ早見表をまとめた左パネル */
export function JsonEditorPanel({
  jsonText,
  onJsonChange,
  validationState,
  errorMessage,
  onCopyErrorFix,
}: JsonEditorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = VALIDATION_CONFIG[validationState];
  const { Icon } = config;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === "string") {
        onJsonChange(evt.target.result);
      }
    };
    reader.readAsText(file);
    // 同じファイルを再選択できるようにリセット
    e.target.value = "";
  }

  return (
    <section className="w-full lg:w-1/3 border-r border-slate-200 bg-white flex flex-col overflow-y-auto p-5 gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <CodeXml className="w-4 h-4" />
          <span>図面JSONデータペースト</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>ファイル選択</span>
          </button>
          <button
            type="button"
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            onClick={() => onJsonChange("")}
            title="入力内容をクリア"
          >
            <X className="w-3.5 h-3.5" />
            <span>クリア</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* JSON Textarea */}
      <div className="relative flex-1 min-h-[280px] flex flex-col border border-slate-200 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-slate-900 focus-within:border-slate-900">
        <textarea
          className="w-full flex-1 p-3.5 font-mono text-xs outline-none bg-slate-50/40 text-slate-800 resize-none leading-relaxed"
          placeholder="// AIが返したコードブロックのJSON部分をここに貼り付けるか、ファイルを読み込んでください..."
          value={jsonText}
          onChange={(e) => onJsonChange(e.target.value)}
        />
        <div className="absolute bottom-2.5 right-3 text-[9px] text-slate-400 font-mono tracking-widest">
          INPUT
        </div>
      </div>

      {/* Validation card */}
      <div className={`p-4 rounded-xl border transition-all duration-300 ${config.cardClass}`}>
        <div className="flex items-start gap-3">
          <div className={config.iconBoxClass}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-bold">{config.title}</h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{config.desc}</p>
          </div>
        </div>

        {config.showError && errorMessage && (
          <div className="mt-3 p-3 bg-red-50/80 border border-red-100 text-red-700 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto shadow-inner leading-relaxed">
            {errorMessage}
          </div>
        )}

        {config.showError && (
          <div className="mt-3">
            <Button
              variant="destructive"
              size="sm"
              className="w-full text-xs font-bold"
              onClick={onCopyErrorFix}
            >
              <Copy className="w-3.5 h-3.5" />
              AIエラー修正指示プロンプトをコピー
            </Button>
          </div>
        )}
      </div>

      {/* Schema cheat sheet */}
      <Accordion>
        <AccordionItem value="schema" className="border border-slate-200 rounded-xl bg-slate-50/50 px-3">
          <AccordionTrigger className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:no-underline py-3">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" />
              <span>共通図面JSONスキーマ構造</span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-[11px] text-slate-500 space-y-2 leading-relaxed pb-3 max-h-48 overflow-y-auto pr-1">
              <p>拡張性を担保するため、AIには常に以下の統一画層（Layers）キーで構造を出力させています。</p>
              <ul className="space-y-1 list-disc pl-4 text-slate-600 font-mono text-[10px]">
                <li>existingBuildingLines (既存壁・躯体)</li>
                <li>vestibuleOutline (設置予定外枠)</li>
                <li>frames (サッシ・アルミ主要枠)</li>
                <li>posts / mullions (角柱・方立)</li>
                <li>slidingDoors / hingedDoors (引き/開き戸)</li>
                <li>fixedWindows (FIX窓)</li>
                <li>dimensions / labels / notes (寸法・文字)</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
