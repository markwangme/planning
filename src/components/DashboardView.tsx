import React, { useState } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  Droplet,
  ChevronRight,
  Calendar,
  Building2,
  Flame,
  PlusCircle,
  X,
  FileSpreadsheet,
  Info,
  Tv,
  LayoutDashboard
} from 'lucide-react';
import {
  ProductionOrder,
  BatchTask,
  Reactor,
  ProductModelDef,
  PROCESS_NODES,
  LanguageCode
} from '../types/aps';
import { WorkshopLiveScreen } from './WorkshopLiveScreen';
import { getTranslations } from '../i18n';

interface DashboardViewProps {
  orders: ProductionOrder[];
  batches: BatchTask[];
  reactors: Reactor[];
  productModels: ProductModelDef[];
  lang?: LanguageCode;
  onAddNewOrder: (order: ProductionOrder) => void;
  onNavigateToGantt: () => void;
  onNavigateToShiftReport: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  batches,
  reactors,
  productModels,
  lang = 'zh',
  onAddNewOrder,
  onNavigateToGantt,
  onNavigateToShiftReport
}) => {
  const tr = getTranslations(lang as LanguageCode);
  const [dashboardMode, setDashboardMode] = useState<'STANDARD' | 'WORKSHOP_LIVE'>('WORKSHOP_LIVE');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);

  // New Order Form States (Page 13: 人工录入订单)
  const [newCustomer, setNewCustomer] = useState(lang === 'zh' ? '客户 E (中创新航动力)' : lang === 'en' ? 'Client E (CALB Energy)' : 'Pelanggan E (CALB)');
  const [newOrderNo, setNewOrderNo] = useState(`SIM-SO-00${orders.length + 1}`);
  const [newProductModel, setNewProductModel] = useState('SIM-MODEL-A');
  const [newQtyKg, setNewQtyKg] = useState<number>(10000); // 10,000 kg
  const [newCustomerDue, setNewCustomerDue] = useState('2026-09-18 18:00');
  const [newProductionDue, setNewProductionDue] = useState('2026-09-18 08:00');
  const [newPriority, setNewPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL'>('HIGH');
  const [newAllowParallel, setNewAllowParallel] = useState(true);

  // Check active batches with overdue/pause risk
  const riskBatchesCount = batches.filter(
    (b) => b.step_status === 'PAUSED' || (b.current_step === 4 && b.qc_status === 'HOLD') || b.batch_id === 'SIM-B002'
  ).length;

  const filteredOrders = orders.filter((order) => {
    return (
      order.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_model.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const modelDef = productModels.find((p) => p.model_code === newProductModel);

    const created: ProductionOrder = {
      order_no: newOrderNo,
      customer_name: newCustomer,
      product_model: newProductModel,
      product_name: modelDef?.name || '特种锂电池电解液',
      qty_kg: newQtyKg,
      received_at: '2026-09-14 12:00',
      customer_due_at: newCustomerDue,
      production_due_at: newProductionDue,
      priority: newPriority,
      urgent: newPriority === 'URGENT',
      status: 'PENDING_SCHEDULE',
      allow_split: true,
      allow_parallel: newAllowParallel,
      split_batches: [],
      completed_good_kg: 0,
      notes: '新录入订单，待生成试算草稿排产'
    };

    onAddNewOrder(created);
    setShowAddOrderModal(false);
  };

  return (
    <div id="order-progress-dashboard" className="space-y-4 font-sans text-slate-800">
      {/* 1. Mode Switcher & Top Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setDashboardMode('WORKSHOP_LIVE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                dashboardMode === 'WORKSHOP_LIVE'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tv className="w-3.5 h-3.5 text-blue-400" />
              <span>{lang === 'zh' ? '实时车间大屏' : lang === 'en' ? 'Live Screen' : 'Skrin Langsung'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {riskBatchesCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {riskBatchesCount} {lang === 'zh' ? '预警' : lang === 'en' ? 'Alerts' : 'Amaran'}
                </span>
              )}
            </button>

            <button
              onClick={() => setDashboardMode('STANDARD')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                dashboardMode === 'STANDARD'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '标准订单进度看板' : lang === 'en' ? 'Order Board' : 'Papan Pesanan'}</span>
            </button>
          </div>

          <div className="hidden sm:block text-xs text-slate-400">|</div>

          <p className="text-xs text-slate-500 hidden md:block">
            {dashboardMode === 'WORKSHOP_LIVE'
              ? (lang === 'zh'
                  ? '实时监控活跃批次进度条、六工序流转与逾期红色闪烁预警'
                  : lang === 'en'
                  ? 'Live monitoring of active batches, 6-step progress and overdue alerts'
                  : 'Pemantauan kelompok aktif, kemajuan 6 langkah dan amaran kelewatan')
              : (lang === 'zh'
                  ? '以订单为入口聚合全部拆解批次与六工序完成明细'
                  : lang === 'en'
                  ? 'Aggregate split batches and 6-step progress by order'
                  : 'Kumpul kelompok terpecah dan butiran 6 langkah mengikut pesanan')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {dashboardMode === 'STANDARD' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'zh' ? '搜索订单号 / 客户 / 型号...' : lang === 'en' ? 'Search Order / Client / Model...' : 'Cari Pesanan / Pelanggan / Model...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden"
              />
            </div>
          )}

          <button
            onClick={() => setShowAddOrderModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {tr.dashboard.btnNewOrder}
          </button>

          <button
            onClick={() => {
              const headers = ['Order No', 'Customer', 'Product', 'Qty (kg)', 'Completed (kg)', 'Due Date', 'Status', 'Urgent'];
              const rows = orders.map(o => [
                o.order_no,
                `"${o.customer_name}"`,
                o.product_model,
                o.qty_kg,
                o.completed_good_kg,
                o.customer_due_at,
                o.status,
                o.urgent ? 'YES' : 'NO'
              ]);
              const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `novolyte_schedule_orders_${new Date().toISOString().slice(0,10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '导出排产计划清单 (Excel)' : 'Export Schedule List'}</span>
          </button>
        </div>
      </div>

      {/* 2. Conditional View: Live Workshop Screen vs Standard Orders Board */}
      {dashboardMode === 'WORKSHOP_LIVE' ? (
        <WorkshopLiveScreen
          orders={orders}
          batches={batches}
          reactors={reactors}
          productModels={productModels}
          onNavigateToGantt={onNavigateToGantt}
          onNavigateToShiftReport={onNavigateToShiftReport}
          onExitScreenMode={() => setDashboardMode('STANDARD')}
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const completionPercent = order.qty_kg > 0
              ? Math.min(100, Math.round((order.completed_good_kg / order.qty_kg) * 100))
              : 0;

            // Find associated batches for this order
            const orderBatches = batches.filter((b) => b.order_no === order.order_no);

            return (
              <div
                key={order.order_no}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4"
              >
                {/* Card Header (Page 13 Prototype Top Bar) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {order.order_no}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-semibold text-slate-800">
                      {order.customer_name}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {order.product_model.replace('SIM-MODEL-', 'MODEL-')}
                    </span>
                    {order.urgent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {lang === 'zh' ? 'VIP 紧急' : lang === 'en' ? 'VIP Urgent' : 'VIP Cemas'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-slate-500">
                      {lang === 'zh' ? '客户交期' : lang === 'en' ? 'Due' : 'Janji'}: <strong className="text-slate-800 font-mono">{order.customer_due_at}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">
                      {lang === 'zh' ? '订单总量' : lang === 'en' ? 'Total' : 'Jumlah'}: <strong className="text-slate-900 font-mono">{order.qty_kg.toLocaleString()} kg</strong> ({(order.qty_kg / 1000).toFixed(1)}t)
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">
                      {lang === 'zh' ? '合格灌装' : lang === 'en' ? 'Good Output' : 'Isi Baik'}: <strong className="text-emerald-700 font-mono">{order.completed_good_kg.toLocaleString()} kg</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200 font-mono">
                      {lang === 'zh' ? '完成' : lang === 'en' ? 'Done' : 'Siap'} {completionPercent}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>

                {/* Batches & Process Operations Table (Page 13 图 4 下方明细表格) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="p-2.5 font-mono">{tr.common.batch}</th>
                        <th className="p-2.5">{lang === 'zh' ? '批量 (kg / t)' : lang === 'en' ? 'Batch Qty (kg / t)' : 'Kuantiti (kg / t)'}</th>
                        <th className="p-2.5">{lang === 'zh' ? '指派设备' : lang === 'en' ? 'Assigned Unit' : 'Unit Reaktor'}</th>
                        <th className="p-2.5">{lang === 'zh' ? '当前工序' : lang === 'en' ? 'Current Step' : 'Langkah Semasa'}</th>
                        <th className="p-2.5">{lang === 'zh' ? '最后报工' : lang === 'en' ? 'Last Reported' : 'Laporan Terakhir'}</th>
                        <th className="p-2.5">{lang === 'zh' ? '预计灌装完成' : lang === 'en' ? 'Est. Finish' : 'Jangka Selesai'}</th>
                        <th className="p-2.5">{lang === 'zh' ? '清洗占用' : lang === 'en' ? 'Wash Cost' : 'Masa Cuci'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderBatches.length > 0 ? (
                        orderBatches.map((batch) => {
                          const stepDef = PROCESS_NODES.find((n) => n.id === batch.current_step);
                          const isFinished = batch.step_status === 'FINISHED' && batch.current_step === 5;

                          return (
                            <tr key={batch.batch_id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="p-2.5 font-mono font-bold text-blue-600">
                                {batch.batch_id}
                              </td>
                              <td className="p-2.5 font-mono font-medium text-slate-800">
                                {batch.batch_qty_kg.toLocaleString()} kg ({(batch.batch_qty_kg / 1000).toFixed(1)}t)
                              </td>
                              <td className="p-2.5">
                                <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {batch.assigned_reactor_id}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded font-medium ${
                                  isFinished
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {isFinished ? (lang === 'zh' ? '灌装已完成' : lang === 'en' ? 'Fill Done' : 'Pengisian Siap') : stepDef?.name || 'MIX'}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono text-slate-600">
                                09-14 12:00
                              </td>
                              <td className="p-2.5 font-mono text-slate-800 font-medium">
                                {isFinished ? (
                                  <span className="text-emerald-700 font-bold">{lang === 'zh' ? '已完成' : lang === 'en' ? 'Done' : 'Selesai'}</span>
                                ) : (
                                  batch.plan_end_time.split(' ')[1] || '20:00'
                                )}
                              </td>
                              <td className="p-2.5">
                                {batch.preceding_wash_min > 0 ? (
                                  <span className="text-amber-700 font-medium text-[11px]">
                                    {lang === 'zh' ? '洗' : lang === 'en' ? 'Wash' : 'Cuci'} {batch.preceding_wash_min / 60}h
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">{lang === 'zh' ? '同型免洗' : lang === 'en' ? 'Same Model' : 'Model Sama'}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-3 text-center text-slate-400">
                            {lang === 'zh'
                              ? '该订单尚未在当前计划中生成批次，请点击顶部【生成试算草稿】执行向下分批排程。'
                              : lang === 'en'
                              ? 'No batches generated yet. Click [Reschedule] at the top to split and assign batches.'
                              : 'Tiada kelompok dijana lagi. Klik [Jadual Semula] di atas untuk memecah dan memperuntukkan.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Card Footer Notes (Page 13 Prototype Text) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>
                      {lang === 'zh'
                        ? '计划进度与实际报工分别显示；灌装前不把投料数量计为完成数量。'
                        : lang === 'en'
                        ? 'Plan and actual shown separately. Solvent/salt dosing does not count as order completion.'
                        : 'Jadual dan sebenar dipapar berasingan. Suapan pelarut/garam tidak dikira sebagai pesanan selesai.'}
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono">
                    {lang === 'zh' ? '最后更新' : lang === 'en' ? 'Last Updated' : 'Kemas Kini Terakhir'}: 2026-09-14 12:00
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Order Modal (Page 13: 人工录入订单) */}
      {showAddOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                {lang === 'zh' ? '人工录入新销售订单 (Sales Order Entry)' : lang === 'en' ? 'Manual Sales Order Entry' : 'Kemasukan Pesanan Jualan Baharu'}
              </h3>
              <button
                onClick={() => setShowAddOrderModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">{tr.ctpModal.customer}</label>
                <input
                  type="text"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{tr.dashboard.orderNo}</label>
                  <input
                    type="text"
                    value={newOrderNo}
                    onChange={(e) => setNewOrderNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{tr.dashboard.targetModel}</label>
                  <select
                    value={newProductModel}
                    onChange={(e) => setNewProductModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    {productModels.map((p) => (
                      <option key={p.model_code} value={p.model_code}>
                        {p.model_code} ({p.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{tr.dashboard.orderQty}</label>
                  <input
                    type="number"
                    value={newQtyKg}
                    onChange={(e) => setNewQtyKg(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono font-bold text-blue-700 focus:bg-white focus:outline-hidden"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {lang === 'zh' ? `折合 ${(newQtyKg / 1000).toFixed(1)} 吨 · 系统按可用批量向下拆分` : lang === 'en' ? `Equiv. ${(newQtyKg / 1000).toFixed(1)} t · Auto downward split` : `Kira-kira ${(newQtyKg / 1000).toFixed(1)} t · Pecah ke bawah`}
                  </span>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{tr.ctpModal.priority}</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:bg-white focus:outline-hidden"
                  >
                    <option value="NORMAL">{tr.dashboard.priorityNormal}</option>
                    <option value="HIGH">{tr.dashboard.priorityHigh}</option>
                    <option value="URGENT">{tr.dashboard.priorityUrgent}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{tr.dashboard.dueDate}</label>
                  <input
                    type="text"
                    value={newCustomerDue}
                    onChange={(e) => setNewCustomerDue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">{lang === 'zh' ? '生产期限 (含发运准备)' : lang === 'en' ? 'Prod. Due Date' : 'Tarikh Siap Pengeluaran'}</label>
                  <input
                    type="text"
                    value={newProductionDue}
                    onChange={(e) => setNewProductionDue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allowParallel"
                  checked={newAllowParallel}
                  onChange={(e) => setNewAllowParallel(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="allowParallel" className="text-slate-700 font-medium">
                  {lang === 'zh' ? '允许跨釜并行配釜 (根据交期和可用时段评估)' : lang === 'en' ? 'Allow parallel multi-reactor allocation' : 'Benarkan peruntukan pelbagai reaktor selari'}
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"
                >
                  {tr.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold shadow-xs"
                >
                  {lang === 'zh' ? '保存订单并预览拆批' : lang === 'en' ? 'Save & Split Batches' : 'Simpan & Pecah Kelompok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
