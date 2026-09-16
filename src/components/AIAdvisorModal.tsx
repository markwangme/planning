import React, { useState } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { APSKpis, ProductionOrder, WorkResource, DisruptionEvent } from "../types.ts";

interface AIAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpis: APSKpis;
  orders: ProductionOrder[];
  resources: WorkResource[];
  disruptions: DisruptionEvent[];
  selectedStrategyName: string;
}

export const AIAdvisorModal: React.FC<AIAdvisorModalProps> = ({
  isOpen,
  onClose,
  kpis,
  orders,
  resources,
  disruptions,
  selectedStrategyName,
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string>("gemini-ai");

  if (!isOpen) return null;

  const handleConsult = async (queryText?: string) => {
    const q = queryText || prompt || "请对当前排程方案进行全方位瓶颈诊断与实时优化调度建议。";
    setLoading(true);

    try {
      const response = await fetch("/api/aps/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: q,
          kpis,
          orders,
          resources,
          disruptions,
          selectedStrategy: selectedStrategyName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setReport(data.analysis);
        setAiSource(data.source);
      } else {
        setReport("生成诊断建议失败，请稍后重试。");
      }
    } catch (err: any) {
      setReport(`请求异常: ${err.message || "未能连接后端排程顾问服务"}`);
    } finally {
      setLoading(false);
    }
  };

  const PRESET_QUESTIONS = [
    "全面诊断当前排程的核心瓶颈机台与产能损耗点",
    "若宁德时代加急30吨高镍VIP订单，如何调整能使整体延误最小？",
    "分析如何减少配制釜洗釜时间，提升净有效产能",
    "如果R-201号釜发生故障停机6小时，应如何制定应急转产预案？",
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-purple-800/60 rounded-2xl max-w-3xl w-full p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/40 shadow-sm shadow-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">AI 智能排程诊断与决策顾问</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 font-mono">
                  Gemini 3.8 Flash APS Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                基于生产大数据与有限产能运筹理论，提供排程瓶颈诊断、扰动处置策略与ROI推演
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          {/* Quick Context Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-850 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-400">当前排程策略</span>
              <p className="font-bold text-cyan-300 mt-0.5">{selectedStrategyName}</p>
            </div>
            <div>
              <span className="text-slate-400">准时交付率 (OTD)</span>
              <p className="font-bold text-emerald-400 mt-0.5">{kpis.otdRate}%</p>
            </div>
            <div>
              <span className="text-slate-400">换产洗釜损耗</span>
              <p className="font-bold text-amber-400 mt-0.5">{kpis.totalSetupHours} 小时</p>
            </div>
            <div>
              <span className="text-slate-400">未处置现场扰动</span>
              <p className="font-bold text-rose-400 mt-0.5">{disruptions.length} 项</p>
            </div>
          </div>

          {/* Preset Questions */}
          <div>
            <span className="text-slate-400 font-semibold mb-1.5 block flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              工业排程典型咨询场景：
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUESTIONS.map((pq, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(pq);
                    handleConsult(pq);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-950/70 hover:text-purple-200 border border-slate-700 hover:border-purple-600 text-slate-300 text-[11px] transition-all text-left"
                >
                  {pq}
                </button>
              ))}
            </div>
          </div>

          {/* AI Output Box */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 min-h-[220px] max-h-[360px] overflow-y-auto leading-relaxed">
            {loading ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                <span className="text-xs">AI排程专家正在分析设备约束、工单流转与洗釜损耗...</span>
              </div>
            ) : report ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <span className="text-purple-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    诊断与调度优化建议
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    引擎来源: {aiSource}
                  </span>
                </div>
                <div className="text-slate-200 whitespace-pre-wrap font-sans text-xs">
                  {report}
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Sparkles className="w-8 h-8 text-slate-700" />
                <p>点击上方典型咨询场景，或输入生产调度问题，即刻生成AI诊断报告。</p>
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) handleConsult(prompt);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="向AI排程专家提问（例如：怎样排产可以将周四晚的洗釜时间压缩2小时？）..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-md shadow-purple-600/30"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              咨询AI
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
