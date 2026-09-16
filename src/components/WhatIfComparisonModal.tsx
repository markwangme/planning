import React, { useState, useMemo } from 'react';
import {
  X,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  TrendingUp,
  Sliders,
  Layers,
  Award,
  Zap,
  RotateCcw,
  Check
} from 'lucide-react';
import {
  ProductionOrder,
  Reactor,
  ReactorRestriction,
  WashMatrixRule,
  ShiftDef,
  SchedulingStrategy,
  WhatIfScenario,
  WhatIfComparisonMatrix
} from '../types/aps';
import { generateWhatIfScenarios } from '../utils/apsEngine';

interface WhatIfComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: ProductionOrder[];
  reactors: Reactor[];
  restrictions: ReactorRestriction[];
  washRules: WashMatrixRule[];
  shifts: ShiftDef[];
  onApplyScenario: (scenario: WhatIfScenario) => void;
}

export const WhatIfComparisonModal: React.FC<WhatIfComparisonModalProps> = ({
  isOpen,
  onClose,
  orders,
  reactors,
  restrictions,
  washRules,
  shifts,
  onApplyScenario
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SCENARIO-SETUP_MINIMIZE');

  // Compute 3 scenarios dynamically
  const matrix: WhatIfComparisonMatrix = useMemo(() => {
    return generateWhatIfScenarios(orders, reactors, restrictions, washRules, shifts, '2026-09-14 08:00');
  }, [orders, reactors, restrictions, washRules, shifts]);

  if (!isOpen) return null;

  const activeScenario = matrix.scenarios.find((s) => s.scenario_id === selectedScenarioId) || matrix.scenarios[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <GitCompare className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">What-If 多方案排程场景仿真对比中心</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  NSGA-II & Pareto 前沿面
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                同时推演交期优先、洗釜耗时最短、设备负荷均衡三套算法，科学辅助计划决策
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Scenario Cards */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {matrix.scenarios.map((sc) => {
              const isSelected = sc.scenario_id === selectedScenarioId;
              return (
                <div
                  key={sc.scenario_id}
                  onClick={() => setSelectedScenarioId(sc.scenario_id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative ${
                    isSelected
                      ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                      : 'bg-white/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {sc.is_recommended && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white shadow-xs flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      推荐方案
                    </span>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      sc.pareto_rank === 'A+'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sc.pareto_rank === 'A'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      Pareto 评级: {sc.pareto_rank}
                    </span>

                    <div className="text-xs font-mono font-bold text-slate-400">
                      {sc.strategy}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 mb-1">{sc.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{sc.description}</p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">生产跨度 (Makespan):</span>
                      <span className="font-mono font-bold text-slate-800">{sc.makespan_hours} h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">累计洗釜时长:</span>
                      <span className="font-mono font-bold text-amber-600">{sc.total_wash_hours} h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">综合稼动率 (OEE):</span>
                      <span className="font-mono font-bold text-indigo-600">{sc.avg_oee_percent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">逾期订单数:</span>
                      <span className={`font-mono font-bold ${sc.delayed_orders_count === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {sc.delayed_orders_count} 笔
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      isSelected ? 'text-indigo-600 font-bold' : 'text-slate-400'
                    }`}>
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          当前已选中
                        </>
                      ) : (
                        '点击对比明细'
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              关键指标三方案多目标对比矩阵 (Multi-Objective Matrix)
            </h4>
            <span className="text-xs text-slate-400">
              数据源：已加载 {orders.length} 笔订单与 {reactors.length} 台物理反应釜
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">优化指标评估项</th>
                  <th className="px-4 py-2.5">【交期优先 EDD】</th>
                  <th className="px-4 py-2.5 bg-indigo-50/50 text-indigo-950 font-bold">
                    【洗釜时长最短 (推荐)】
                  </th>
                  <th className="px-4 py-2.5">【负荷最均衡】</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-900">总完工工期 (Makespan)</td>
                  <td className="px-4 py-2.5 font-mono">{matrix.scenarios[0]?.makespan_hours} 小时</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-indigo-700 bg-indigo-50/20">{matrix.scenarios[1]?.makespan_hours} 小时</td>
                  <td className="px-4 py-2.5 font-mono">{matrix.scenarios[2]?.makespan_hours} 小时</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-900">换产洗釜总时间 (CIP Total)</td>
                  <td className="px-4 py-2.5 font-mono text-amber-600">{matrix.scenarios[0]?.total_wash_hours} 小时</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-emerald-700 bg-indigo-50/20">
                    {matrix.scenarios[1]?.total_wash_hours} 小时 (↓最低)
                  </td>
                  <td className="px-4 py-2.5 font-mono text-amber-600">{matrix.scenarios[2]?.total_wash_hours} 小时</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-900">同配方 0 分钟免洗批次数</td>
                  <td className="px-4 py-2.5 font-mono">{matrix.scenarios[0]?.zero_wash_batches_count} 批</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-emerald-700 bg-indigo-50/20">
                    {matrix.scenarios[1]?.zero_wash_batches_count} 批 (最大化免洗)
                  </td>
                  <td className="px-4 py-2.5 font-mono">{matrix.scenarios[2]?.zero_wash_batches_count} 批</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-900">综合平均负荷率 (OEE)</td>
                  <td className="px-4 py-2.5 font-mono">{matrix.scenarios[0]?.avg_oee_percent}%</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-indigo-700 bg-indigo-50/20">{matrix.scenarios[1]?.avg_oee_percent}%</td>
                  <td className="px-4 py-2.5 font-mono">{matrix.scenarios[2]?.avg_oee_percent}%</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-900">设备负荷方差 (机台不平衡度)</td>
                  <td className="px-4 py-2.5 font-mono">{matrix.scenarios[0]?.load_balance_variance}</td>
                  <td className="px-4 py-2.5 font-mono bg-indigo-50/20">{matrix.scenarios[1]?.load_balance_variance}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">
                    {matrix.scenarios[2]?.load_balance_variance} (最均衡)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-slate-900">交期逾期工单数</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-emerald-700">
                    {matrix.scenarios[0]?.delayed_orders_count} 笔 (0逾期保障)
                  </td>
                  <td className="px-4 py-2.5 font-mono bg-indigo-50/20">{matrix.scenarios[1]?.delayed_orders_count} 笔</td>
                  <td className="px-4 py-2.5 font-mono">{matrix.scenarios[2]?.delayed_orders_count} 笔</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="font-semibold">当前拟应用方案：</span>
            <span className="font-bold text-indigo-700">{activeScenario.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyScenario(activeScenario);
                onClose();
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>应用此方案排程至甘特图 (Apply Schedule)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
