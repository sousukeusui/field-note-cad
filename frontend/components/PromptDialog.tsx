"use client";

import { useState, useMemo } from "react";
import { LayoutTemplate, X, TextCursorInput, Terminal, ArrowRight } from "lucide-react";
import { generateVestibuleJson, type DoorPosition, type DoorType } from "@/lib/vestibule-generator";

type JsonGeneratorDialogProps = {
  open: boolean;
  onClose: () => void;
  /** JSON生成時に呼ばれる。引数は JSON.stringify 済みの文字列 */
  onApply: (json: string) => void;
};

const DOOR_POSITIONS: { value: DoorPosition; label: string }[] = [
  { value: "center", label: "中央配置 (標準)" },
  { value: "left",   label: "左寄せ" },
  { value: "right",  label: "右寄せ" },
];

const DOOR_TYPES: { value: DoorType; label: string }[] = [
  { value: "sliding2", label: "2枚引違いサッシ戸" },
  { value: "sliding1", label: "スライド片引き戸" },
  { value: "hinged",   label: "親子開きドア (丁番スイング)" },
];

const GLASS_TYPES = [
  "透明5mm単板ガラス",
  "飛散防止・菱形網入りガラス",
  "かすみ複層ペアガラス",
];

/** 寸法フォームから風除室 JSON を生成し、左パネルに反映するダイアログ */
export function JsonGeneratorDialog({ open, onClose, onApply }: JsonGeneratorDialogProps) {
  const [widthMm, setWidthMm]         = useState("3000");
  const [depthMm, setDepthMm]         = useState("1800");
  const [doorPosition, setDoorPosition] = useState<string>(DOOR_POSITIONS[0].value);
  const [frameThickness, setFrameThickness] = useState("70");
  const [doorType, setDoorType]       = useState<string>(DOOR_TYPES[0].value);
  const [glassType, setGlassType]     = useState<string>(GLASS_TYPES[0]);

  const jsonPreview = useMemo(() => {
    const w = Number(widthMm);
    const d = Number(depthMm);
    const f = Number(frameThickness);
    if (!w || !d || !f || w < 1000 || d < 500) return null;
    try {
      const drawing = generateVestibuleJson({
        widthMm: w,
        depthMm: d,
        doorPosition: doorPosition as DoorPosition,
        frameThicknessMm: f,
        doorType: doorType as DoorType,
        glassType,
      });
      return JSON.stringify(drawing, null, 2);
    } catch {
      return null;
    }
  }, [widthMm, depthMm, doorPosition, frameThickness, doorType, glassType]);

  function handleApply() {
    if (!jsonPreview) return;
    onApply(jsonPreview);
    onClose();
  }

  if (!open) return null;

  const inputClass =
    "w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-slate-50/30";
  const labelClass = "block text-[11px] font-semibold text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl border border-indigo-100">
              <LayoutTemplate className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">寸法入力でJSON生成</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                土間の寸法と建具条件を入力すると、図面JSONを自動で算出します
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Input fields */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <TextCursorInput className="w-3.5 h-3.5 text-slate-400" />
              <span>現調測定情報を入力</span>
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>既存土間間口 W (mm)</label>
                <input
                  type="number"
                  value={widthMm}
                  min={1000}
                  onChange={(e) => setWidthMm(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>既存土間奥行 D (mm)</label>
                <input
                  type="number"
                  value={depthMm}
                  min={500}
                  onChange={(e) => setDepthMm(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>引き戸設置の希望箇所</label>
                <select
                  value={doorPosition}
                  onChange={(e) => setDoorPosition(e.target.value)}
                  className={inputClass}
                >
                  {DOOR_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>フレーム見込み厚 (mm)</label>
                <input
                  type="number"
                  value={frameThickness}
                  min={40}
                  onChange={(e) => setFrameThickness(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>引き戸の種類</label>
                <select
                  value={doorType}
                  onChange={(e) => setDoorType(e.target.value)}
                  className={inputClass}
                >
                  {DOOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>ガラス種</label>
                <select
                  value={glassType}
                  onChange={(e) => setGlassType(e.target.value)}
                  className={inputClass}
                >
                  {GLASS_TYPES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* JSON Preview */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-500" />
              <span>生成される図面JSON（プレビュー）</span>
            </h4>
            <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-950 shadow-inner">
              {jsonPreview ? (
                <textarea
                  readOnly
                  value={jsonPreview}
                  className="w-full h-44 p-4 font-mono text-[10px] leading-relaxed text-emerald-400 bg-transparent outline-none resize-none"
                />
              ) : (
                <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
                  有効な寸法値を入力してください（W ≥ 1000mm、D ≥ 500mm）
                </div>
              )}
              <div className="absolute top-2 right-2 text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold tracking-widest">
                JSON PREVIEW
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={handleApply}
            disabled={!jsonPreview}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-100"
          >
            <ArrowRight className="w-4 h-4" />
            <span>左パネルに反映して閉じる</span>
          </button>
        </div>
      </div>
    </div>
  );
}
