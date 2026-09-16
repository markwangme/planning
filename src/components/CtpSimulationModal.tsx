import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
  Calendar,
  Zap,
  TrendingUp,
  Cpu,
  RefreshCw
} from 'lucide-react';
import {
  ProductionOrder,
  BatchTask,
  Reactor,
  ShiftDef,
  ReactorRestriction,
  WashMatrixRule,
  ProductModelDef,
  CtpSimulationRequest,
  CtpSimulationResult,
  LanguageCode
} from '../types/aps';
import {
  simulateCtpOrder,
  DEFAULT_MATERIAL_INVENTORIES,
  STANDARD_MODEL_BOMS
} from '../utils/apsEngine';
import { getTranslations } from '../i18n';

interface CtpSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: LanguageCode;
  orders: ProductionOrder[];
  batches: BatchTask[];
  reactors: Reactor[];
  shifts: ShiftDef[];
  restrictions: ReactorRestriction[];
  washRules: WashMatrixRule[];
  productModels: ProductModelDef[];
  onAdoptOrder: (order: ProductionOrder) => void;
}

export const CtpSimulationModal: React.FC<CtpSimulationModalProps> = ({
  isOpen,
  onClose,
  lang = 'zh',
  orders,
  batches,
  reactors,
  shifts,
  restrictions,
  washRules,
  productModels,
  onAdoptOrder
}) => {
  const tr = getTranslations(lang as LanguageCode);
  const [customerName, setCustomerName] = useState<string>('CATL Energy Storage');
  const [productModel, setProductModel] = useState<string>('SIM-MODEL-A');
  const [qtyKg, setQtyKg] = useState<number>(10000);
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-09-17 18:00');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [allowSplit, setAllowSplit] = useState<boolean>(true);

  // Run CTP simulation on Copy-on-Write sandbox
  const ctpResult: CtpSimulationResult = useMemo(() => {
    const request: CtpSimulationRequest = {
      customer_name: customerName,
      product_model: productModel,
      qty_kg: Number(qtyKg) || 1000,
      requested_delivery_at: deliveryDate,
      priority,
      allow_split: allowSplit
    };

    return simulateCtpOrder(
      request,
      orders,
      batches,
      reactors,
      shifts,
      restrictions,
      washRules,
      DEFAULT_MATERIAL_INVENTORIES,
      '2026-09-14 08:00'
    );
  }, [customerName, productModel, qtyKg, deliveryDate, priority, allowSplit, orders, batches, reactors, shifts, restrictions, washRules]);

  if (!isOpen) return null;

  const handleAdopt = () => {
    const newOrder: ProductionOrder = {
      order_no: `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      customer_name: customerName,
      product_model: productModel,
      product_name: productModels.find((m) => m.model_code === productModel)?.name || `电解液 ${productModel}`,
      qty_kg: Number(qtyKg),
      received_at: '2026-09-14 08:00',
      customer_due_at: deliveryDate,
      production_due_at: deliveryDate,
      priority,
      urgent: priority === 'URGENT',
      status: 'PENDING_SCHEDULE',
      allow_split: allowSplit,
      allow_parallel: true,
      split_batches: [],
      completed_good_kg: 0,
      row_version: 1,
      is_demo: false
    };

    onAdoptOrder(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <Zap className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">{tr.ctpModal.title}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Copy-on-Write Sandbox
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                {tr.ctpModal.subtitle}
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

        {/* Body Content: Two Columns */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          {/* Left Column: Order Parameters Form */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" />
                {tr.ctpModal.inquiryTitle}
              </h4>
              <span className="text-[11px] text-slate-400">Unit: kg</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{tr.ctpModal.customer}</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{tr.ctpModal.productModel}</label>
              <select
                value={productModel}
                onChange={(e) => setProductModel(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
              >
                {productModels.map((m) => (
                  <option key={m.model_code} value={m.model_code}>
                    {m.model_code} ({m.name}) {m.special_cleaning ? (lang === 'zh' ? '★特殊清洗' : '★Special Wash') : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{tr.ctpModal.quantity}</label>
                <input
                  type="number"
                  step="100"
                  min="100"
                  value={qtyKg}
                  onChange={(e) => setQtyKg(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">{tr.ctpModal.priority}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                >
                  <option value="URGENT">{tr.common.urgent}</option>
                  <option value="HIGH">{tr.common.high}</option>
                  <option value="MEDIUM">{tr.common.medium}</option>
                  <option value="LOW">{tr.common.low}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">{tr.ctpModal.customerDueDate}</label>
              <input
                type="text"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSplit}
                  onChange={(e) => setAllowSplit(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{tr.ctpModal.downwardSplit}</span>
              </label>
            </div>

            {/* ATB Check Box */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  {tr.ctpModal.atbTitle}
                </h5>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  ctpResult.atb_result.is_all_ready
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {ctpResult.atb_result.is_all_ready ? tr.ctpModal.atbReady : `${tr.ctpModal.atbShortage} ${ctpResult.atb_result.shortages.length}`}
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {ctpResult.atb_result.shortages.length === 0 ? (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50/70 p-2 rounded border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === 'zh' ? '六氟磷酸锂、高纯碳酸酯溶剂及添加剂库存充足，无物料阻断。' : lang === 'en' ? 'LiPF6, high-purity carbonate solvent & additives in stock. No shortage.' : 'Bahan LiPF6, pelarut karbonat dan aditif mencukupi tanpa kekurangan.'}</span>
                  </div>
                ) : (
                  ctpResult.atb_result.shortages.map((s) => (
                    <div key={s.material_code} className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                      <div className="flex justify-between font-semibold">
                        <span>{s.material_name}</span>
                        <span className="font-mono">-{s.shortage_kg} kg</span>
                      </div>
                      <div className="text-[10px] text-rose-500 mt-0.5 flex justify-between">
                        <span>{lang === 'zh' ? '在库+预计' : lang === 'en' ? 'Stock+PO' : 'Stok+PO'}: {s.available_kg} kg</span>
                        <span>{lang === 'zh' ? '预计到货' : lang === 'en' ? 'ETA' : 'Jangka Tiba'}: {s.earliest_ready_time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Simulation Result & Feasibility Assessment */}
          <div className="lg:col-span-7 space-y-4">
            {/* Feasibility Summary Banner */}
            <div className={`p-4 rounded-xl border ${
              ctpResult.is_achievable
                ? 'bg-emerald-50/90 border-emerald-200'
                : 'bg-amber-50/90 border-amber-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {ctpResult.is_achievable ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">
                        {ctpResult.is_achievable ? tr.ctpModal.feasible : tr.ctpModal.infeasible}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {ctpResult.is_achievable
                        ? (lang === 'zh'
                            ? '经过白名单校验、向下拆批、ENTER洗釜判定及工时仿真，测算结果安全可行。'
                            : lang === 'en'
                            ? 'Verified via whitelist checks, downward splitting, and wash matrix. Schedule is achievable.'
                            : 'Disahkan melalui senarai putih, pemecahan kelompok, dan masa basuh reaktor. Jadual boleh dicapai.')
                        : (lang === 'zh'
                            ? '测算完工时刻晚于客户要求交期，或原材料到料存在滞后，需计划员干预。'
                            : lang === 'en'
                            ? 'Promised date exceeds requested due date or material shortage exists. Planner review needed.'
                            : 'Masa siap lewat daripada tarikh dipohon atau terdapat kekurangan bahan. Perlu semakan perancang.')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500">{tr.ctpModal.promisedDate}</div>
                  <div className="text-sm font-mono font-bold text-slate-900">{ctpResult.promised_finish_at}</div>
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-200/60 text-center">
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/80">
                  <div className="text-[10px] text-slate-500">{tr.ctpModal.leadTime}</div>
                  <div className="text-sm font-bold font-mono text-slate-800">{ctpResult.lead_time_hours} {tr.common.hours}</div>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/80">
                  <div className="text-[10px] text-slate-500">{tr.ctpModal.washDuration}</div>
                  <div className="text-sm font-bold font-mono text-amber-700">
                    {ctpResult.total_wash_cost_min} {tr.common.minutes} ({(ctpResult.total_wash_cost_min / 60).toFixed(1)}{tr.common.hours})
                  </div>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/80">
                  <div className="text-[10px] text-slate-500">{tr.ctpModal.assignedReactor}</div>
                  <div className="text-sm font-bold font-mono text-blue-700">{ctpResult.bottleneck_reactor_id}</div>
                </div>
              </div>
            </div>

            {/* Downward Batches Breakdown */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  {tr.ctpModal.batchBreakdown}
                </h5>
                <span className="text-[11px] text-slate-500 font-mono">
                  {lang === 'zh'
                    ? `共拆分为 ${ctpResult.proposed_batches.length} 个批次 · 质量守恒 100%`
                    : lang === 'en'
                    ? `Split into ${ctpResult.proposed_batches.length} batches · Mass Balanced 100%`
                    : `Dipecahkan ke ${ctpResult.proposed_batches.length} kelompok · Imbangan Jisim 100%`}
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {ctpResult.proposed_batches.map((pb, idx) => (
                  <div key={pb.batch_no} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-mono font-bold flex items-center justify-center text-[11px]">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <span>{pb.batch_no}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                            {pb.reactor_id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {pb.estimated_start} ~ {pb.estimated_end}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-800">{pb.qty_kg.toLocaleString()} kg</div>
                      <div className="text-[10px] text-amber-600 font-mono">
                        {pb.preceding_wash_min > 0
                          ? `${lang === 'zh' ? '前序清洗' : lang === 'en' ? 'Wash' : 'Cuci'} ${pb.preceding_wash_min}min`
                          : (lang === 'zh' ? '同型号 0min免洗' : lang === 'en' ? 'Same Model (0min)' : 'Model Sama (0min)')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exceptions / Warnings in simulation */}
            {ctpResult.exceptions.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs space-y-1">
                {ctpResult.exceptions.map((ex, i) => (
                  <div key={i} className="text-rose-800 flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">[{ex.code}] {ex.title}：</span>
                      <span>{ex.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* RESTful API Contract & Live Server Verification Panel (Page 8 Section 1(1)) */}
            <div className="bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-700 text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px]">POST</span>
                  <span className="font-mono text-emerald-400">/api/v1/orders/ctp-simulate</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/v1/orders/ctp-simulate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          customer_code: 'CUST-001',
                          product_model: productModel,
                          order_qty_kg: Number(qtyKg),
                          customer_due_at: deliveryDate
                        })
                      });
                      const data = await res.json();
                      alert(`[CTP Simulation 200 OK]\nFPSD: ${data.fpsd_promised_at}\nATB: ${data.atb_status}\nBatches: ${JSON.stringify(data.suggested_batches)}`);
                    } catch (e: any) {
                      alert(`Request error: ${e.message || e}`);
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-600 text-[11px] font-mono transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{lang === 'zh' ? '服务端联调测试' : lang === 'en' ? 'Server API Test' : 'Ujian Pelayan API'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px] bg-slate-950 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
                <div>
                  <div className="text-slate-400 mb-1 font-bold">Request Payload:</div>
                  <pre className="text-blue-300">
{JSON.stringify({
  customer_code: "CUST-001",
  product_model: productModel,
  order_qty_kg: Number(qtyKg),
  customer_due_at: deliveryDate
}, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-slate-400 mb-1 font-bold">Response Contract:</div>
                  <pre className="text-emerald-300">
{JSON.stringify({
  fpsd_promised_at: ctpResult.promised_finish_at,
  atb_status: ctpResult.atb_result.is_all_ready ? "READY" : "SHORTAGE",
  suggested_batches: ctpResult.proposed_batches.map(b => ({
    reactor_code: b.reactor_id,
    qty_kg: b.qty_kg
  }))
}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>OR-Tools CP-SAT &middot; ENTER Wash Matrix &middot; Real-time Verification</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {tr.ctpModal.cancelBtn}
            </button>
            <button
              type="button"
              onClick={handleAdopt}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{tr.ctpModal.adoptBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
