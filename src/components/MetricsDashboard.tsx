import React from "react";
import {
  CheckCircle2,
  Clock,
  Zap,
  Flame,
  AlertTriangle,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { APSKpis } from "../types.ts";

interface MetricsDashboardProps {
  kpis: APSKpis;
  previousKpis?: APSKpis | null;
  selectedStrategyName: string;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  kpis,
  previousKpis,
  selectedStrategyName,
}) => {
  // Compute diffs if previousKpis exists
  const otdDiff = previousKpis ? kpis.otdRate - previousKpis.otdRate : 0;
  const setupDiff = previousKpis ? kpis.totalSetupHours - previousKpis.totalSetupHours : 0;
  const makespanDiff = previousKpis ? kpis.makespanHours - previousKpis.makespanHours : 0;

  return (
    <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. 准时交付率 OTD */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">准时交付率 (OTD)</span>
              <CheckCircle2
                className={`w-3.5 h-3.5 ${
                  kpis.otdRate >= 95
                    ? "text-emerald-400"
                    : kpis.otdRate >= 85
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-xl font-bold tracking-tight ${
                    kpis.otdRate >= 95
                      ? "text-emerald-400"
                      : kpis.otdRate >= 85
                      ? "text-amber-300"
                      : "text-rose-400"
                  }`}
                >
                  {kpis.otdRate}%
                </span>
                <span className="text-[10px] text-slate-400">基准 ≥95%</span>
              </div>
              {previousKpis && otdDiff !== 0 && (
                <span
                  className={`text-[11px] font-semibold flex items-center ${
                    otdDiff > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {otdDiff > 0 ? `+${otdDiff}%` : `${otdDiff}%`}
                </span>
              )}
            </div>
          </div>

          {/* 2. 设备综合利用率 OEE */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">设备综合利用率</span>
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tight text-cyan-300">
                  {kpis.avgUtilization}%
                </span>
                <span className="text-[10px] text-slate-400">主线均衡</span>
              </div>
              <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden self-center">
                <div
                  className="h-full bg-cyan-400 rounded-full"
                  style={{ width: `${Math.min(100, kpis.avgUtilization)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. 洗釜换产总耗时 */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">换产与洗釜损耗</span>
              <Flame className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tight text-orange-400">
                  {kpis.totalSetupHours}
                </span>
                <span className="text-xs text-slate-400">小时</span>
              </div>
              {previousKpis && setupDiff !== 0 && (
                <span
                  className={`text-[11px] font-semibold flex items-center ${
                    setupDiff < 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                  title="洗釜时间越少越节能环保"
                >
                  {setupDiff < 0 ? `${setupDiff}h` : `+${setupDiff}h`}
                </span>
              )}
            </div>
          </div>

          {/* 4. 生产总周期 (Makespan) */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">完工总跨度 (Makespan)</span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tight text-blue-300">
                  {kpis.makespanHours}
                </span>
                <span className="text-xs text-slate-400">小时</span>
              </div>
              <span className="text-[10px] text-slate-400">
                约 {(kpis.makespanHours / 24).toFixed(1)} 天
              </span>
            </div>
          </div>

          {/* 5. 延误工单数 */}
          <div
            className={`rounded-xl p-3 border flex flex-col justify-between ${
              kpis.delayedOrdersCount > 0
                ? "bg-rose-950/40 border-rose-800/60"
                : "bg-slate-800/60 border-slate-700/60"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">延期预警工单</span>
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  kpis.delayedOrdersCount > 0 ? "text-rose-400" : "text-slate-500"
                }`}
              />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-xl font-bold tracking-tight ${
                    kpis.delayedOrdersCount > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {kpis.delayedOrdersCount}
                </span>
                <span className="text-xs text-slate-400">单</span>
              </div>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  kpis.delayedOrdersCount === 0
                    ? "bg-emerald-950 text-emerald-400"
                    : "bg-rose-950 text-rose-300"
                }`}
              >
                {kpis.delayedOrdersCount === 0 ? "全部受控" : "需调整"}
              </span>
            </div>
          </div>

          {/* 6. 在制批次 (WIP) */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium">在制批次 (WIP)</span>
              <Layers className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tight text-purple-300">
                  {kpis.totalWipBatches}
                </span>
                <span className="text-xs text-slate-400">批次</span>
              </div>
              <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                {selectedStrategyName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
