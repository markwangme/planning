import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  User,
  Activity,
  AlertTriangle,
  Send,
  Droplet,
  FlaskConical,
  ShieldCheck,
  RefreshCw,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  Printer,
  Download,
  FileText,
  X
} from 'lucide-react';
import {
  Reactor,
  BatchTask,
  ProcessNodeId,
  PROCESS_NODES,
  ShiftReportEvent,
  QcReleaseStatus,
  StepProgressStatus,
  LanguageCode
} from '../types/aps';
import { getTranslations } from '../i18n';

interface ShiftReportingViewProps {
  reactors: Reactor[];
  batches: BatchTask[];
  lang?: LanguageCode;
  onReportProgress: (
    batchId: string,
    stepId: ProcessNodeId,
    newStatus: StepProgressStatus,
    payload: {
      actual_at: string;
      forecast_end_at?: string;
      pause_reason?: string;
      qc_status?: QcReleaseStatus;
      filled_good_kg?: number;
      operator_name: string;
      notes?: string;
    }
  ) => { success: boolean; message?: string };
}

export const ShiftReportingView: React.FC<ShiftReportingViewProps> = ({
  reactors,
  batches,
  lang = 'zh',
  onReportProgress
}) => {
  const tr = getTranslations(lang as LanguageCode);

  const STEP_CODE_MAP: Record<ProcessNodeId, { name: string; code: string; label: string; short: string; desc: string }> = {
    1: tr.reporting.ops.SOLVENT,
    2: tr.reporting.ops.SALT,
    3: tr.reporting.ops.MIX,
    4: tr.reporting.ops.QC,
    5: tr.reporting.ops.FILL,
    6: tr.reporting.ops.CLEAN,
  };
  // Select active batch to report
  const inProgressBatches = batches.filter((b) => b.is_actual || b.assigned_reactor_id === 'R-6000-01');
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    batches[0]?.batch_id || 'SIM-B001'
  );

  const selectedBatch = batches.find((b) => b.batch_id === selectedBatchId) || batches[0];

  // Active step selected in left list
  const [activeStepId, setActiveStepId] = useState<ProcessNodeId>(3); // 默认工序 3 (混合搅拌 MIX)

  // Form states for right side (Page 11 Prototype)
  const [formStatus, setFormStatus] = useState<StepProgressStatus>('PROCESSING');
  const [estimatedEndTime, setEstimatedEndTime] = useState('2026-09-14 13:00');
  const [pauseReason, setPauseReason] = useState('无');
  const [reportingPeriod, setReportingPeriod] = useState('09-14 上午');
  const [operatorName, setOperatorName] = useState('张建军 (甲班工段长)');
  const [qcStatusInput, setQcStatusInput] = useState<QcReleaseStatus>('TESTING');
  const [qcMoisturePpm, setQcMoisturePpm] = useState<number>(12); // 卡尔费休水分
  const [filledGoodKg, setFilledGoodKg] = useState<number>(selectedBatch?.good_filled_kg || 0);
  const [reportNotes, setReportNotes] = useState('');

  // Print/Export Shift Report Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Interlock Block Message & API Receipt
  const [interlockBlockMessage, setInterlockBlockMessage] = useState<string | null>(null);
  const [submitSuccessNotice, setSubmitSuccessNotice] = useState<string | null>(null);
  const [lastApiReceipt, setLastApiReceipt] = useState<{
    client_event_id: string;
    operation_code: string;
    event_type: string;
    idempotent: boolean;
    recorded_at: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Six process nodes state mock for selected batch
  const getStepState = (stepId: ProcessNodeId) => {
    if (stepId === 6) {
      if (selectedBatch.preceding_wash_min === 0) {
        return { statusText: tr.reporting.statusMap.NOT_APPLICABLE, timeText: lang === 'zh' ? '下一批同型号' : lang === 'en' ? 'Same Model (0m)' : 'Model Sama (0m)', color: 'text-slate-400 bg-slate-100' };
      }
      return { statusText: tr.reporting.ops.CLEAN.name, timeText: `${selectedBatch.preceding_wash_min}${tr.common.minutes}`, color: 'text-amber-700 bg-amber-50' };
    }

    if (selectedBatch.current_step > stepId) {
      return { statusText: tr.reporting.statusMap.FINISHED, timeText: '08:00-10:00', color: 'text-emerald-700 bg-emerald-50' };
    }
    if (selectedBatch.current_step === stepId) {
      return { statusText: tr.reporting.statusMap.PROCESSING, timeText: lang === 'zh' ? '10:00 开始' : lang === 'en' ? '10:00 Start' : '10:00 Mula', color: 'text-blue-700 bg-blue-50 font-semibold' };
    }
    return { statusText: tr.reporting.statusMap.PENDING, timeText: '-', color: 'text-slate-400 bg-slate-50' };
  };

  // Submit report handler with Page 11 interlock checks & Page 8 POST /api/v1/operations/events
  const handleSubmitReport = async (e?: React.FormEvent, directAction?: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE') => {
    if (e) e.preventDefault();
    setInterlockBlockMessage(null);
    setSubmitSuccessNotice(null);

    // Rule Interlock Check: 开始灌装前检查人工放行状态！(Page 11)
    if (activeStepId === 5) {
      if (selectedBatch.qc_status !== 'RELEASED' && qcStatusInput !== 'RELEASED') {
        setInterlockBlockMessage(tr.reporting.interlockQcHold);
        return;
      }
    }

    const currentOp = STEP_CODE_MAP[activeStepId];
    const eventType = directAction || (formStatus === 'FINISHED' ? 'COMPLETE' : formStatus === 'PAUSED' ? 'PAUSE' : 'START');
    const clientEventId = `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    setIsSubmitting(true);
    try {
      // 1. Call RESTful API (POST /api/v1/operations/events) with idempotency key
      const resp = await fetch('/api/v1/operations/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_no: selectedBatch.batch_id,
          operation_code: currentOp.code,
          client_event_id: clientEventId,
          event_type: eventType,
          actual_at: new Date().toISOString(),
          filled_good_kg: currentOp.code === 'FILL' ? filledGoodKg : undefined
        })
      });

      const json = await resp.json();

      setLastApiReceipt({
        client_event_id: clientEventId,
        operation_code: currentOp.code,
        event_type: eventType,
        idempotent: json.idempotent || false,
        recorded_at: json.recorded_at || new Date().toISOString()
      });

      // 2. Update local state
      let mappedStatus: StepProgressStatus = formStatus;
      if (directAction === 'START' || directAction === 'RESUME') mappedStatus = 'PROCESSING';
      if (directAction === 'PAUSE') mappedStatus = 'PAUSED';
      if (directAction === 'COMPLETE') mappedStatus = 'FINISHED';

      const res = onReportProgress(selectedBatch.batch_id, activeStepId, mappedStatus, {
        actual_at: '2026-09-14 12:00',
        forecast_end_at: estimatedEndTime,
        pause_reason: pauseReason === '无' ? undefined : pauseReason,
        qc_status: qcStatusInput,
        filled_good_kg: activeStepId === 5 ? filledGoodKg : undefined,
        operator_name: operatorName,
        notes: reportNotes
      });

      if (res.success) {
        setSubmitSuccessNotice(
          `工序报工事件提交成功！[${selectedBatch.batch_id} - ${currentOp.code} (${currentOp.label})] 幂等凭据: ${clientEventId}`
        );
        setTimeout(() => setSubmitSuccessNotice(null), 5000);
      } else {
        setInterlockBlockMessage(res.message || '报工保存失败');
      }
    } catch (err: any) {
      setInterlockBlockMessage(`网络通信异常: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to export current shift report as printable HTML / Simulated PDF / CSV
  const handleExportShiftReport = (format: 'print' | 'csv') => {
    if (format === 'csv') {
      const headers = ['Batch ID', 'Order No', 'Product', 'Reactor', 'Qty (kg)', 'Current Step', 'QC Status'];
      const rows = batches.map(b => [
        b.batch_id,
        b.order_no,
        b.product_model,
        b.assigned_reactor_id,
        b.batch_qty_kg,
        b.current_step,
        b.qc_status
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `novolyte_shift_report_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setShowPrintModal(true);
    }
  };

  return (
    <div id="shift-reporting-view" className="space-y-4 font-sans text-slate-800">
      {/* 1. View Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {tr.reporting.title}
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {tr.reporting.tag}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {tr.reporting.subtitle}
          </p>
        </div>

        {/* Batch Picker & Export Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">{tr.reporting.batchSelect}</span>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setInterlockBlockMessage(null);
              }}
              className="bg-transparent text-slate-800 font-bold focus:outline-hidden"
            >
              {batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_id} | {b.product_model} ({b.assigned_reactor_id})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleExportShiftReport('print')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '打印当前班次工序追踪卡 (PDF)' : 'Print Shift Tracking Sheet'}</span>
          </button>

          <button
            onClick={() => handleExportShiftReport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-300"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{lang === 'zh' ? '导出班次 Excel 明细' : 'Export Shift Excel'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Page 11 Prototype Grid: Left (6 Steps) + Right (Report Form) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column: 6 Processes State Cards (Page 11 图 2 左侧) */}
        <div className="md:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-900 text-sm">
                {selectedBatch.batch_id} | {selectedBatch.product_model.replace('SIM-MODEL-', '')}
              </span>
              <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {selectedBatch.assigned_reactor_id} · {selectedBatch.batch_qty_kg.toLocaleString()} kg
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {lang === 'zh'
                ? '实际时点与录入时点分别记录；可一次补录上午已经完成的多个工序。'
                : lang === 'en'
                ? 'Actual event times and system logging times are recorded independently.'
                : 'Masa peristiwa sebenar dan masa log direkodkan secara bebas.'}
            </div>
          </div>

          {/* 6 Steps List */}
          <div className="space-y-2">
            {PROCESS_NODES.map((node) => {
              const op = STEP_CODE_MAP[node.id];
              const state = getStepState(node.id);
              const isSelected = activeStepId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => {
                    setActiveStepId(node.id);
                    setInterlockBlockMessage(null);
                  }}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-400 text-xs w-6">
                      0{node.id}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>{op.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-bold">
                          {op.code}
                        </span>
                        {node.requires_release && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            {lang === 'zh' ? '需放行' : lang === 'en' ? 'Hold QC' : 'Perlu Pelepasan'}
                          </span>
                        )}
                        {op.code === 'FILL' && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {lang === 'zh' ? '订单结算' : lang === 'en' ? 'Fulfills Order' : 'Selesai Pesanan'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                        <span>{state.timeText}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-400 text-[10px]">{op.desc}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-xs font-medium ${state.color}`}>
                    {state.statusText}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">
              {lang === 'zh' ? '数量口径与资源占用规则:' : lang === 'en' ? 'Quantity Rules & Resource Constraints:' : 'Peraturan Kuantiti & Kekangan Sumber:'}
            </div>
            <div>• {tr.reporting.quantityRuleSummary}</div>
          </div>
        </div>

        {/* Right Column: Single Operation Reporting Form (Page 11 图 2 右侧) */}
        <div className="md:col-span-6 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">
                  {lang === 'zh' ? '当前上报工序:' : lang === 'en' ? 'Reporting Step:' : 'Operasi Semasa:'}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-sm font-bold text-slate-900">
                    0{activeStepId} {STEP_CODE_MAP[activeStepId].name}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    {STEP_CODE_MAP[activeStepId].code}
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {tr.reporting.operator} {operatorName.split(' ')[0]}
              </span>
            </div>

            {/* Quick State Machine Transition Action Buttons */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center justify-between">
                <span>
                  {lang === 'zh' ? '工序状态机快捷驱动' : lang === 'en' ? 'State Machine Shortcuts' : 'Pintas Mesin Status'}
                </span>
                <span className="font-mono text-[10px] text-slate-400">client_event_id 幂等</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmitReport(undefined, 'START')}
                  className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                >
                  {tr.reporting.btnStart}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmitReport(undefined, 'PAUSE')}
                  className="px-2 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                >
                  {tr.reporting.btnPause}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmitReport(undefined, 'RESUME')}
                  className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                >
                  {tr.reporting.btnResume}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmitReport(undefined, 'COMPLETE')}
                  className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1 shadow-2xs"
                >
                  {tr.reporting.btnFinish}
                </button>
              </div>
            </div>

            {/* RESTful API Receipt with Idempotency Status (Page 8 Section 1(3)) */}
            {lastApiReceipt && (
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-lg p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    {tr.reporting.receiptTitle}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800 font-mono">
                    {lastApiReceipt.idempotent ? tr.reporting.receiptIdempotent : tr.reporting.receiptRealtime}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-emerald-800 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>ID: <strong>{lastApiReceipt.client_event_id}</strong></span>
                  <span>OP: <strong>{lastApiReceipt.operation_code}</strong></span>
                  <span>ACT: <strong>{lastApiReceipt.event_type}</strong></span>
                  <span>Time: {new Date(lastApiReceipt.recorded_at).toLocaleTimeString()}</span>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">{tr.reporting.stepStatus}</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as StepProgressStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  <option value="PROCESSING">{tr.reporting.statusMap.PROCESSING}</option>
                  <option value="FINISHED">{tr.reporting.statusMap.FINISHED}</option>
                  <option value="PAUSED">{tr.reporting.statusMap.PAUSED}</option>
                  <option value="PENDING">{tr.reporting.statusMap.PENDING}</option>
                  <option value="NOT_APPLICABLE">{tr.reporting.statusMap.NOT_APPLICABLE}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{tr.reporting.shiftPeriod}</label>
                  <input
                    type="text"
                    value={reportingPeriod}
                    onChange={(e) => setReportingPeriod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{tr.reporting.estEndTime}</label>
                  <input
                    type="text"
                    value={estimatedEndTime}
                    onChange={(e) => setEstimatedEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">{tr.reporting.pauseReason}</label>
                <input
                  type="text"
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder={lang === 'zh' ? '无，或填写如：冷水机温度超温26℃暂停...' : 'None, or enter reason...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Conditional Field: QC Testing (工序 4) */}
              {activeStepId === 4 && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    {tr.reporting.qcSection}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-amber-800">{tr.reporting.qcReleaseStatus}</span>
                      <select
                        value={qcStatusInput}
                        onChange={(e) => setQcStatusInput(e.target.value as QcReleaseStatus)}
                        className="w-full mt-0.5 bg-white border border-amber-300 rounded p-1.5 font-bold text-amber-900"
                      >
                        <option value="TESTING">TESTING</option>
                        <option value="WAITING">WAITING</option>
                        <option value="HOLD">HOLD</option>
                        <option value="RELEASED">RELEASED (OK)</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[11px] text-amber-800">{tr.reporting.qcMoisture}</span>
                      <input
                        type="number"
                        value={qcMoisturePpm}
                        onChange={(e) => setQcMoisturePpm(Number(e.target.value))}
                        className="w-full mt-0.5 bg-white border border-amber-300 rounded p-1.5 font-mono font-bold text-amber-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Field: Filling Operation (工序 5) */}
              {activeStepId === 5 && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                  <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Droplet className="w-4 h-4 text-blue-600" />
                    {tr.reporting.fillSection}
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">
                      {tr.reporting.fillCumulativeGood}
                    </label>
                    <input
                      type="number"
                      value={filledGoodKg}
                      onChange={(e) => setFilledGoodKg(Number(e.target.value))}
                      className="w-full bg-white border border-blue-300 rounded-lg p-2 font-mono font-bold text-blue-700 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Notice Banner */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                {activeStepId === 5 ? (
                  <span className="text-blue-700 font-medium">{tr.reporting.ruleNoticeOrderSettlement}</span>
                ) : (
                  <span>{tr.reporting.ruleNoticeStepRun}</span>
                )}
              </div>
            </div>

            {/* Error / Interlock Warning */}
            {interlockBlockMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{interlockBlockMessage}</span>
              </div>
            )}

            {/* Success Toast */}
            {submitSuccessNotice && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{submitSuccessNotice}</span>
              </div>
            )}

            {/* Submit Button (Page 11: 提交报工) */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {tr.reporting.btnSubmit}
            </button>
          </form>
        </div>
      </div>

      {/* Printable Shift Report / PDF Tracking Sheet Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  {lang === 'zh' ? '车间班次工序追踪卡与离线填报表 (PDF)' : 'Shift Tracking Sheet & Offline Form'}
                </h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0">
              <div className="text-center border-b border-slate-200 pb-4">
                <h1 className="text-lg font-bold text-slate-900">
                  {lang === 'zh' ? 'NOVOLYTE 诺莱特电池材料 · 反应釜车间班次工序追踪与离线填报卡' : 'NOVOLYTE Reactor Shift Tracking & Offline Form'}
                </h1>
                <div className="flex justify-center gap-6 text-xs text-slate-500 mt-2 font-mono">
                  <span>{lang === 'zh' ? '班次' : 'Shift'}: 甲班 (08:00 - 20:00)</span>
                  <span>{lang === 'zh' ? '打印日期' : 'Date'}: {new Date().toISOString().slice(0, 10)}</span>
                  <span>{lang === 'zh' ? '当前批次' : 'Batch'}: {selectedBatch.batch_id}</span>
                </div>
              </div>

              {/* Batch Info Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">{lang === 'zh' ? '订单号' : 'Order No'}</span>
                  <strong className="font-mono text-slate-800">{selectedBatch.order_no}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">{lang === 'zh' ? '产品型号' : 'Product'}</span>
                  <strong className="text-slate-800">{selectedBatch.product_model}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">{lang === 'zh' ? '反应釜' : 'Reactor'}</span>
                  <strong className="font-mono text-blue-600">{selectedBatch.assigned_reactor_id}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">{lang === 'zh' ? '批量 (kg)' : 'Qty (kg)'}</span>
                  <strong className="font-mono text-slate-900">{selectedBatch.batch_qty_kg.toLocaleString()} kg</strong>
                </div>
              </div>

              {/* 6 Steps Table for Offline Filling */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === 'zh' ? '六工序离线填报与签字确认栏' : '6-Step Offline Filling & Sign-off Table'}
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="p-2 border-r border-slate-300">#</th>
                      <th className="p-2 border-r border-slate-300">{lang === 'zh' ? '工序名称' : 'Operation'}</th>
                      <th className="p-2 border-r border-slate-300">{lang === 'zh' ? '标准工时' : 'Std Time'}</th>
                      <th className="p-2 border-r border-slate-300">{lang === 'zh' ? '实际开始/完成时间' : 'Actual Start/End'}</th>
                      <th className="p-2 border-r border-slate-300">{lang === 'zh' ? '过程参数记录' : 'Parameter Log'}</th>
                      <th className="p-2">{lang === 'zh' ? '操作工签字' : 'Operator Sign'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROCESS_NODES.map((node) => {
                      const op = STEP_CODE_MAP[node.id];
                      return (
                        <tr key={node.id} className="border-b border-slate-200 h-10">
                          <td className="p-2 border-r border-slate-200 font-mono text-center">0{node.id}</td>
                          <td className="p-2 border-r border-slate-200 font-semibold">{op.name} ({op.code})</td>
                          <td className="p-2 border-r border-slate-200 font-mono">1.5h</td>
                          <td className="p-2 border-r border-slate-200 font-mono text-slate-400">____-____</td>
                          <td className="p-2 border-r border-slate-200 text-slate-400">{op.code === 'QC' ? '水分: ___ ppm' : op.code === 'FILL' ? '灌装量: ___ kg' : '温度/压力: ____'}</td>
                          <td className="p-2 text-slate-400">________</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sign-off footer */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  <span>{lang === 'zh' ? '生产主管签字' : 'Supervisor Sign'}:</span>
                  <div className="h-8 border-b border-slate-400 mt-2"></div>
                </div>
                <div>
                  <span>{lang === 'zh' ? '质量放行签字 (QC)' : 'QC Sign'}:</span>
                  <div className="h-8 border-b border-slate-400 mt-2"></div>
                </div>
                <div>
                  <span>{lang === 'zh' ? '当班操作工签字' : 'Operator Sign'}:</span>
                  <div className="h-8 border-b border-slate-400 mt-2"></div>
                </div>
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                {lang === 'zh' ? '关闭' : 'Close'}
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'zh' ? '直接打印 / 保存为 PDF' : 'Print / Save PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
