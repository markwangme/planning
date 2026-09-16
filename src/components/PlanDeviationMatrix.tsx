import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  Download,
  Edit3,
  Calendar,
  Layers,
  ArrowUpDown,
  Building,
  User,
  ShieldAlert,
  Zap,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Info
} from 'lucide-react';
import {
  BatchTask,
  DeviationCategory,
  DEVIATION_CATEGORIES,
  DeviationType,
  WorkshopDef,
  WORKSHOP_DEFINITIONS
} from '../types/aps';
import {
  calculateBatchDeviation,
  exportPlanDeviationsToCsv
} from '../utils/apsEngine';

interface PlanDeviationMatrixProps {
  batches: BatchTask[];
  workshops?: WorkshopDef[];
  onOpenReasonModal: (batch: BatchTask) => void;
  onSimulateActuals?: () => void;
}

export const PlanDeviationMatrix: React.FC<PlanDeviationMatrixProps> = ({
  batches,
  workshops = WORKSHOP_DEFINITIONS,
  onOpenReasonModal,
  onSimulateActuals
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'ANOMALY_ONLY' | 'PENDING_REASON' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('ALL');

  // Calculate deviation stats
  const deviationStats = useMemo(() => {
    let delayedCount = 0;
    let overrunCount = 0;
    let pendingReasonCount = 0;
    let resolvedCount = 0;
    let onTimeCount = 0;
    let totalDelayMinutes = 0;

    batches.forEach((b) => {
      const dev = calculateBatchDeviation(b);
      if (dev.deviationMinutes > 15) {
        totalDelayMinutes += dev.deviationMinutes;
        if (dev.deviationType === 'DELAY_START' || dev.deviationType === 'DELAY_FINISH') {
          delayedCount++;
        } else if (dev.deviationType === 'OVERRUN') {
          overrunCount++;
        }

        if (dev.requiresReason) {
          pendingReasonCount++;
        } else if (b.is_reason_submitted) {
          resolvedCount++;
        }
      } else {
        onTimeCount++;
      }
    });

    return {
      totalBatches: batches.length,
      delayedCount,
      overrunCount,
      pendingReasonCount,
      resolvedCount,
      onTimeCount,
      totalDelayHours: (totalDelayMinutes / 60).toFixed(1)
    };
  }, [batches]);

  // Filtered rows
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const dev = calculateBatchDeviation(b);
      const isAnomaly = dev.deviationMinutes > 15;

      if (filterType === 'ANOMALY_ONLY' && !isAnomaly) return false;
      if (filterType === 'PENDING_REASON' && !dev.requiresReason) return false;
      if (filterType === 'RESOLVED' && (!isAnomaly || !b.is_reason_submitted)) return false;

      const bWs = b.workshop_id || (b.assigned_reactor_id === 'R-6000-02' || b.assigned_reactor_id === 'R-6000-03' ? 'WS-02' : 'WS-01');
      if (selectedWorkshop !== 'ALL' && bWs !== selectedWorkshop) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBatch = b.batch_id.toLowerCase().includes(q);
        const matchOrder = b.order_no.toLowerCase().includes(q);
        const matchModel = b.product_model.toLowerCase().includes(q);
        const matchName = b.product_name.toLowerCase().includes(q);
        const matchCustomer = b.customer_name.toLowerCase().includes(q);
        const matchReason = (b.deviation_reason || '').toLowerCase().includes(q);
        const matchPerson = (b.responsible_person || '').toLowerCase().includes(q);
        if (!matchBatch && !matchOrder && !matchModel && !matchName && !matchCustomer && !matchReason && !matchPerson) {
          return false;
        }
      }

      return true;
    });
  }, [batches, filterType, selectedWorkshop, searchQuery]);

  // Handle Export to CSV
  const handleExportCsv = () => {
    const csvContent = exportPlanDeviationsToCsv(batches);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `电解液生产计划与实际工时偏差异常归因清单_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
      {/* 1. Header & Metric Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>生产计划 vs 实际工时偏差与异常原因全景清单</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                  {filteredBatches.length} / {batches.length} 批次
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                计划基准录入后恒定不变 · 实际时间获得后自动偏差报警并归因归档
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onSimulateActuals && (
            <button
              onClick={onSimulateActuals}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-2xs"
              title="模拟接收现场 MES 批次回传实际时间并触发偏差预警"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>模拟现场 MES 回传实际时间</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all flex items-center gap-1.5 shadow-xs"
            title="导出为标准 Excel / CSV 表格 (带 UTF-8 BOM 绝无乱码)"
          >
            <Download className="w-4 h-4" />
            <span>导出异常与原因清单 (Excel/CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. Statistical KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
          <div className="text-[11px] font-medium text-slate-500">计划批次总量</div>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {deviationStats.totalBatches} <span className="text-xs font-normal text-slate-400">批</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">基准计划全部锁死</div>
        </div>

        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/70">
          <div className="text-[11px] font-medium text-rose-700 flex items-center justify-between">
            <span>开工/完工延期</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">
            {deviationStats.delayedCount} <span className="text-xs font-normal text-rose-800">批 ({deviationStats.totalDelayHours}h 累计)</span>
          </div>
          <div className="text-[10px] text-rose-600/80 mt-0.5">实际开工晚于计划 &gt;15m</div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/70">
          <div className="text-[11px] font-medium text-amber-800 flex items-center justify-between">
            <span>⚠️ 待填报原因 (异常)</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          </div>
          <div className="text-xl font-black text-amber-700 font-mono mt-1">
            {deviationStats.pendingReasonCount} <span className="text-xs font-normal text-amber-900">批待闭环</span>
          </div>
          <div className="text-[10px] text-amber-700/80 mt-0.5">需输入异常分类及措施</div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/70">
          <div className="text-[11px] font-medium text-emerald-800 flex items-center justify-between">
            <span>已归因闭环 / 正常</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1">
            {deviationStats.resolvedCount + deviationStats.onTimeCount} <span className="text-xs font-normal text-emerald-900">批</span>
          </div>
          <div className="text-[10px] text-emerald-700/80 mt-0.5">原因与措施记录完备</div>
        </div>
      </div>

      {/* 3. Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                filterType === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部 ({batches.length})
            </button>
            <button
              onClick={() => setFilterType('ANOMALY_ONLY')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                filterType === 'ANOMALY_ONLY'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              仅看异常/延误 ({deviationStats.delayedCount + deviationStats.overrunCount})
            </button>
            <button
              onClick={() => setFilterType('PENDING_REASON')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                filterType === 'PENDING_REASON'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              待填报原因 ({deviationStats.pendingReasonCount})
            </button>
            <button
              onClick={() => setFilterType('RESOLVED')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                filterType === 'RESOLVED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              已归因归档 ({deviationStats.resolvedCount})
            </button>
          </div>

          {/* Workshop select */}
          <select
            value={selectedWorkshop}
            onChange={(e) => setSelectedWorkshop(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden text-xs"
          >
            <option value="ALL">全部车间</option>
            {workshops.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name} ({ws.shortName || ws.id})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜索批次号 / 型号 / 原因 / 责任人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-56"
          />
        </div>
      </div>

      {/* 4. Full Table View */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-800 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">批次 / 工单</th>
                <th className="py-2.5 px-3 whitespace-nowrap">产品型号 / 釜号</th>
                <th className="py-2.5 px-3 whitespace-nowrap">🔒 计划时间 (基准)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">⚡ 现场实际时间</th>
                <th className="py-2.5 px-3 whitespace-nowrap">偏差状态</th>
                <th className="py-2.5 px-3 whitespace-nowrap">异常归因分类</th>
                <th className="py-2.5 px-3 min-w-[200px]">详细原因与纠偏措施</th>
                <th className="py-2.5 px-3 whitespace-nowrap">责任部门 / 人</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    未找到符合条件的批次工时记录
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  const dev = calculateBatchDeviation(batch);
                  const isAnomaly = dev.deviationMinutes > 15;

                  const catDef = DEVIATION_CATEGORIES.find((c) => c.id === batch.deviation_category);

                  return (
                    <tr
                      key={batch.batch_id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        dev.requiresReason ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Batch & Order */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900">{batch.batch_id}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{batch.order_no}</div>
                      </td>

                      {/* Model & Reactor */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 truncate max-w-[140px]" title={batch.product_name}>
                          {batch.product_model}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {batch.assigned_reactor_id}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {batch.batch_qty_kg}kg
                          </span>
                        </div>
                      </td>

                      {/* Plan Baseline Times */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        <div className="text-slate-800 flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-sans">起:</span>
                          <span>{batch.plan_start_time}</span>
                        </div>
                        <div className="text-slate-800 flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-sans">止:</span>
                          <span>{batch.plan_end_time}</span>
                        </div>
                      </td>

                      {/* Actual Execution Times */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                        {batch.actual_start_time ? (
                          <>
                            <div className="text-slate-900 font-bold flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-sans">起:</span>
                              <span>{batch.actual_start_time}</span>
                            </div>
                            <div className="text-slate-700 flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-sans">止:</span>
                              <span>{batch.actual_end_time || (batch.is_actual ? '在制中' : '未完工')}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">待现场回传</span>
                        )}
                      </td>

                      {/* Deviation Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {dev.deviationType === 'NORMAL' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>正常</span>
                          </span>
                        )}

                        {dev.deviationType === 'DELAY_START' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>开工延期 +{dev.deviationMinutes}m</span>
                          </span>
                        )}

                        {dev.deviationType === 'DELAY_FINISH' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>完工延期 +{dev.deviationMinutes}m</span>
                          </span>
                        )}

                        {dev.deviationType === 'OVERRUN' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>工时超耗 +{dev.deviationMinutes}m</span>
                          </span>
                        )}

                        {dev.deviationType === 'EARLY' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Zap className="w-3 h-3" />
                            <span>提前 {Math.abs(dev.deviationMinutes)}m</span>
                          </span>
                        )}

                        {dev.deviationType === 'PENDING_INPUT' && (
                          <span className="text-slate-400 text-[10px]">待回传</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {batch.deviation_category ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {catDef?.label.split('/')[0] || batch.deviation_category}
                          </span>
                        ) : isAnomaly ? (
                          <span className="text-amber-600 font-bold text-[10px] flex items-center gap-1 animate-pulse">
                            <ShieldAlert className="w-3 h-3" />
                            <span>未归因</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Reason Description & Corrective Action */}
                      <td className="py-2.5 px-3 text-xs">
                        {batch.deviation_reason ? (
                          <div className="space-y-0.5">
                            <div className="text-slate-900 font-medium leading-relaxed">
                              {batch.deviation_reason}
                            </div>
                            {batch.corrective_action && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <span className="font-semibold text-emerald-700 shrink-0">措施:</span>
                                <span className="truncate">{batch.corrective_action}</span>
                              </div>
                            )}
                          </div>
                        ) : isAnomaly ? (
                          <div className="text-amber-700 font-semibold text-[11px] flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            <span>⚠️ 实际已延期，需点击右侧填报异常原因</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">按生产计划规范执行</span>
                        )}
                      </td>

                      {/* Dept & Person */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                        <div className="font-medium text-slate-800">{batch.responsible_dept || '-'}</div>
                        <div className="text-slate-500 font-mono text-[10px]">{batch.responsible_person || '-'}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenReasonModal(batch)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ml-auto ${
                            dev.requiresReason
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs animate-bounce'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{dev.requiresReason ? '填报原因' : '修改原因'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
