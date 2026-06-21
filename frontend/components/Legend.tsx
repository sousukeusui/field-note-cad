/** 右パネル下部に表示するレイヤー凡例バー */
export function Legend() {
  return (
    <div className="bg-white/95 border-t border-slate-200 py-3.5 px-4 flex flex-wrap gap-4 text-[10px] text-slate-500 justify-center shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-1.5 block rounded-sm bg-green-500" />
        <span className="font-semibold">既存躯体/壁</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-1.5 block rounded-sm bg-amber-500" />
        <span className="font-semibold">設置外枠</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-1.5 block rounded-sm bg-slate-800" />
        <span className="font-semibold">アルミ枠 (Frame)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 block rounded-sm border border-red-500 bg-red-50" />
        <span className="font-semibold">柱・方立 (Post)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-1.5 block rounded-sm bg-cyan-400" />
        <span className="font-semibold">ガラス面</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 block border-t border-dashed border-purple-500" />
        <span className="font-semibold">建具シンボル</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-0.5 block bg-red-400" />
        <span className="font-semibold">寸法線 (Dimension)</span>
      </div>
    </div>
  );
}
