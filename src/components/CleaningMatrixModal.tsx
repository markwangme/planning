import React from "react";
import { TableProperties, ShieldAlert, Sparkles, Droplets, Info } from "lucide-react";
import { CLEANING_RULES } from "../data/initialData.ts";
import { FORMULA_META } from "./GanttChart.tsx";

interface CleaningMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CleaningMatrixModal: React.FC<CleaningMatrixModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">配制釜换产洗釜与清场标准矩阵</h2>
              <p className="text-xs text-slate-400">
                严格防止锂盐/钠盐及特种成膜添加剂交叉污染的硬性工艺约束矩阵
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          {/* Explanation Alert */}
          <div className="bg-slate-850 p-3.5 rounded-xl border border-cyan-800/50 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">
                智能APS换产优化算法原理：
              </span>
              电解液制造对微量水、金属离子及交叉添加剂极其敏感。若在同台釜中频繁进行高镍NCM与特种钠电交替排产，单次必须进行耗时达
              <strong className="text-rose-400"> 4.5~5.0小时</strong> 的超声碱洗与超高纯氮气干燥烘扫。
              系统开启 <strong className="text-cyan-300">“换产洗釜最小化”</strong> 或 <strong className="text-cyan-300">“综合平衡排程”</strong> 后，内核将运用批次同构聚集算法（Batch Clustering），使相同配方连续排产（换产耗时仅需0.5h），平均为产线释放
              <strong className="text-emerald-400"> 12~18小时/周</strong> 的净有效产能！
            </div>
          </div>

          {/* Matrix Rules Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-850 text-slate-300 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">前序配方体系</th>
                  <th className="p-3">后序切换配方</th>
                  <th className="p-3">清洗耗时</th>
                  <th className="p-3">工艺清洗等级</th>
                  <th className="p-3">标准作业要求</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {CLEANING_RULES.map((rule, idx) => {
                  const fromMeta = FORMULA_META[rule.from];
                  const toMeta = FORMULA_META[rule.to];
                  const isDeep = rule.durationHours >= 3.5;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-850/50 transition-colors ${
                        isDeep ? "bg-rose-950/10" : ""
                      }`}
                    >
                      <td className="p-3">
                        <span className="font-medium text-slate-200">
                          {fromMeta?.short || rule.from}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-200">
                          {toMeta?.short || rule.to}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <span
                          className={`font-bold ${
                            rule.durationHours <= 0.5
                              ? "text-emerald-400"
                              : rule.durationHours <= 2.5
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {rule.durationHours} 小时
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            rule.cleanType === "SAME_FLUSH"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                              : rule.cleanType === "SOLVENT_RINSE"
                              ? "bg-blue-950 text-blue-300 border-blue-800"
                              : "bg-rose-950 text-rose-300 border-rose-800"
                          }`}
                        >
                          {rule.cleanType === "SAME_FLUSH"
                            ? "同配方轻冲"
                            : rule.cleanType === "SOLVENT_RINSE"
                            ? "溶剂循环置换"
                            : "超声碱洗除残留"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{rule.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            确认并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
