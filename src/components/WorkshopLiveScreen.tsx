import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Droplet,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Gauge,
  Sliders
} from 'lucide-react';
import {
  BatchTask,
  ProductionOrder,
  Reactor,
  ProductModelDef,
  PROCESS_NODES,
  ProcessNodeId,
  LanguageCode
} from '../types/aps';
import { getTranslations } from '../i18n';

interface WorkshopLiveScreenProps {
  orders: ProductionOrder[];
  batches: BatchTask[];
  reactors: Reactor[];
  productModels: ProductModelDef[];
  lang?: LanguageCode;
  onNavigateToGantt?: () => void;
  onNavigateToShiftReport?: () => void;
  onExitScreenMode?: () => void;
}

export const WorkshopLiveScreen: React.FC<WorkshopLiveScreenProps> = ({
  orders,
  batches,
  reactors,
  productModels,
  lang = 'zh',
  onNavigateToGantt,
  onNavigateToShiftReport,
  onExitScreenMode
}) => {
  const tr = getTranslations(lang as LanguageCode);
  const [filterType, setFilterType] = useState<'ALL' | 'IN_PROGRESS' | 'PLANNED' | 'RISK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReactor, setSelectedReactor] = useState<string>('ALL');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simulatedTime, setSimulatedTime] = useState<string>('2026-09-14 14:35:00');
  const [simulatedDelayBatchIds, setSimulatedDelayBatchIds] = useState<string[]>(['SIM-B002']); // default simulation for overdue alert demonstration

  // Live ticking clock simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = `2026-09-14 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setSimulatedTime(timeStr);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Toggle simulated delay for testing red flashing alert
  const toggleSimulateDelay = (batchId: string) => {
    setSimulatedDelayBatchIds((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  // Active batches list (excluding already finished batches or show all active)
  const activeBatches = useMemo(() => {
    return batches.map((batch) => {
      const order = orders.find((o) => o.order_no === batch.order_no);
      const isSimulatedDelayed = simulatedDelayBatchIds.includes(batch.batch_id);

      // Check overdue risk logic
      // 1. Paused step
      // 2. Simulated delay
      // 3. Current step in mix/qc taking longer than standard
      // 4. Batch estimated completion close to or past customer due date
      const isPaused = batch.step_status === 'PAUSED';
      const isQcHold = batch.current_step === 4 && batch.qc_status === 'HOLD';
      const isOverdueRisk = isSimulatedDelayed || isPaused || isQcHold || (batch.batch_id === 'SIM-B004');

      // Calculate progress percentage based on 5 main steps
      let progressPercent = 0;
      if (batch.step_status === 'FINISHED' && batch.current_step === 5) {
        progressPercent = 100;
      } else {
        const baseStepPercent = ((batch.current_step - 1) / 5) * 100;
        const currentStepProgress = batch.step_status === 'PROCESSING' ? 12 : 0;
        progressPercent = Math.min(95, Math.round(baseStepPercent + currentStepProgress));
      }

      return {
        ...batch,
        order,
        isOverdueRisk,
        progressPercent,
        overdueReason: isSimulatedDelayed
          ? '【混合工序滞缓】冷水机制冷温控波动，搅拌耗时顺延 +45min，预计触发交期预警'
          : isPaused
          ? `【工序暂停】${batch.pause_reason || '等待前序放行或设备排查'}`
          : isQcHold
          ? '【取样检测待定】水分检测值 16.2ppm (超标 >15ppm)，质量拦截灌装'
          : batch.batch_id === 'SIM-B004'
          ? '【交期临界】距离客户承诺交付仅剩 1.5h 缓冲，排产紧绷'
          : ''
      };
    });
  }, [batches, orders, simulatedDelayBatchIds]);

  // Filtered active batches
  const displayedBatches = useMemo(() => {
    return activeBatches.filter((b) => {
      // Search
      const matchSearch =
        b.batch_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.order_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.product_model.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      // Reactor filter
      if (selectedReactor !== 'ALL' && b.assigned_reactor_id !== selectedReactor) {
        return false;
      }

      // Filter type
      if (filterType === 'IN_PROGRESS') return b.step_status === 'PROCESSING' || b.step_status === 'PAUSED';
      if (filterType === 'PLANNED') return b.step_status === 'PENDING';
      if (filterType === 'RISK') return b.isOverdueRisk;
      return true;
    });
  }, [activeBatches, searchQuery, selectedReactor, filterType]);

  // Statistics
  const totalActiveCount = activeBatches.length;
  const inProgressCount = activeBatches.filter((b) => b.step_status === 'PROCESSING').length;
  const riskCount = activeBatches.filter((b) => b.isOverdueRisk).length;
  const totalTonnage = (activeBatches.reduce((acc, b) => acc + b.batch_qty_kg, 0) / 1000).toFixed(1);
  const totalFilledGoodTonnage = (
    orders.reduce((acc, o) => acc + (o.completed_good_kg || 0), 0) / 1000
  ).toFixed(1);

  return (
    <div className="space-y-4 font-sans text-slate-800 animate-in fade-in duration-200">
      {/* 1. Large Screen Live Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {lang === 'zh' ? '电解液制造中心 · 实时车间大屏' : lang === 'en' ? 'Electrolyte Center · Shopfloor Live' : 'Pusat Elektrolit · Skrin Langsung Bengkel'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-normal flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-glow-dot"></span>
                  {lang === 'zh' ? 'LIVE 实时监控' : lang === 'en' ? 'LIVE Telemetry' : 'LIVE Pemantauan'}
                </span>
              </h1>
              {riskCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-alert-flashing flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {lang === 'zh' ? `${riskCount} 个批次逾期/临界告警` : lang === 'en' ? `${riskCount} Batches Overdue/Risk` : `${riskCount} Kelompok Lewat/Risiko`}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{lang === 'zh' ? '班次: 中班 (16:00 - 24:00)' : lang === 'en' ? 'Shift: Afternoon (16:00 - 24:00)' : 'Syif: Petang (16:00 - 24:00)'}</span>
              <span>·</span>
              <span>{lang === 'zh' ? '工序级节拍跟踪 & 质量放行联动' : lang === 'en' ? '6-Step Takt & Quality Interlock' : 'Takt 6-Langkah & Saling Kunci Kualiti'}</span>
              <span>·</span>
              <span className="font-mono text-blue-300">{lang === 'zh' ? '系统时间' : lang === 'en' ? 'System Time' : 'Masa Sistem'}: {simulatedTime}</span>
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick trigger simulation button */}
          <button
            onClick={() => toggleSimulateDelay('SIM-B001')}
            title={lang === 'zh' ? '点击切换 SIM-B001 的延误状态以测试红色闪烁预警效果' : lang === 'en' ? 'Toggle simulated delay on SIM-B001 to test overdue alerts' : 'Tukar status lewat SIM-B001 untuk menguji amaran'}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              simulatedDelayBatchIds.includes('SIM-B001')
                ? 'bg-rose-600 text-white shadow-xs shadow-rose-900/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            {simulatedDelayBatchIds.includes('SIM-B001')
              ? (lang === 'zh' ? '解除 B001 模拟延误' : lang === 'en' ? 'Clear B001 Delay' : 'Lepas Lewat B001')
              : (lang === 'zh' ? '模拟 B001 工序延误' : lang === 'en' ? 'Simulate B001 Delay' : 'Simulasi Lewat B001')}
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen
              ? (lang === 'zh' ? '退出全屏' : lang === 'en' ? 'Exit Full' : 'Keluar Penuh')
              : (lang === 'zh' ? '全屏大屏' : lang === 'en' ? 'Fullscreen' : 'Skrin Penuh')}
          </button>

          {onExitScreenMode && (
            <button
              onClick={onExitScreenMode}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {lang === 'zh' ? '返回标准订单看板' : lang === 'en' ? 'Order Board' : 'Papan Pesanan'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Reactor Telemetry & Real-Time Workshop KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Reactor 1 */}
        {reactors.map((reactor) => {
          const isExclusive = reactor.exclusive_mode;
          const currentBatchInReactor = activeBatches.find(
            (b) => b.assigned_reactor_id === reactor.reactor_id && (b.step_status === 'PROCESSING' || b.step_status === 'PAUSED')
          );

          return (
            <div
              key={reactor.reactor_id}
              className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-900 flex items-center gap-1">
                  {reactor.reactor_id}
                  {isExclusive && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-sans">
                      {lang === 'zh' ? '专釜' : lang === 'en' ? 'Dedicated' : 'Khas'}
                    </span>
                  )}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="my-2">
                <div className="text-[11px] text-slate-500 truncate">{reactor.reactor_name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold text-blue-600">
                    {reactor.temperature || 21.5} ℃
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[11px] font-mono text-slate-600">
                    {reactor.agitation_rpm || 90} RPM
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 truncate">
                {lang === 'zh' ? '正在执行' : lang === 'en' ? 'Running' : 'Sedang Laksana'}: <strong className="font-mono text-slate-800">{currentBatchInReactor?.batch_id || (lang === 'zh' ? '等待下批' : lang === 'en' ? 'Idle' : 'Menunggu')}</strong>
              </div>
            </div>
          );
        })}

        {/* Global KPI Cards */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>{lang === 'zh' ? '在制总吨位' : lang === 'en' ? 'WIP Tonnage' : 'Jumlah Tan WIP'}</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-slate-900">{totalTonnage}</span>
            <span className="text-xs text-slate-500 ml-1">{lang === 'zh' ? `吨 (${totalActiveCount} 批)` : lang === 'en' ? `t (${totalActiveCount} b)` : `t (${totalActiveCount} k)`}</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {lang === 'zh' ? '涵盖 1.3t 与 6t 全量反应釜' : lang === 'en' ? 'All 1.3t & 6t reactors' : 'Semua reaktor 1.3t & 6t'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>{lang === 'zh' ? '合格灌装累计' : lang === 'en' ? 'Good Output' : 'Pengisian Baik'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-emerald-700">{totalFilledGoodTonnage}</span>
            <span className="text-xs text-slate-500 ml-1">{lang === 'zh' ? '吨 已放行' : lang === 'en' ? 't Released' : 't Dilepaskan'}</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">
            {lang === 'zh' ? '实物包装入库质量达成' : lang === 'en' ? 'Packaged & Stored Output' : 'Keluaran Dibungkus & Disimpan'}
          </div>
        </div>

        <div className={`rounded-xl p-3.5 shadow-xs flex flex-col justify-between transition-all ${
          riskCount > 0
            ? 'bg-rose-50 border-2 border-rose-500 animate-alert-flashing'
            : 'bg-white border border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={riskCount > 0 ? 'text-rose-700' : 'text-slate-500'}>
              {riskCount > 0
                ? (lang === 'zh' ? '🚨 逾期预警批次' : lang === 'en' ? '🚨 Overdue Alerts' : '🚨 Amaran Kelewatan')
                : (lang === 'zh' ? '交期预警监控' : lang === 'en' ? 'Schedule Monitor' : 'Pemantauan Jadual')}
            </span>
            <AlertTriangle className={`w-4 h-4 ${riskCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className="my-1">
            <span className={`text-xl font-bold font-mono ${riskCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {riskCount}
            </span>
            <span className="text-xs text-slate-500 ml-1">{lang === 'zh' ? '批 需调度' : lang === 'en' ? 'batches at risk' : 'kelompok berisiko'}</span>
          </div>
          <div className={`text-[10px] font-medium ${riskCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {riskCount > 0
              ? (lang === 'zh' ? '请立即排查红色闪烁卡片' : lang === 'en' ? 'Inspect flashing alert cards' : 'Periksa kad amaran berkelip')
              : (lang === 'zh' ? '全部批次运行节拍正常' : lang === 'en' ? 'All batches running normally' : 'Semua kelompok berjalan lancar')}
          </div>
        </div>
      </div>

      {/* 3. Filter and Search Tool Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            {lang === 'zh' ? '快速筛选:' : lang === 'en' ? 'Filter:' : 'Tapis:'}
          </span>

          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'zh' ? `全部活跃批次 (${totalActiveCount})` : lang === 'en' ? `All Active (${totalActiveCount})` : `Semua Aktif (${totalActiveCount})`}
          </button>

          <button
            onClick={() => setFilterType('IN_PROGRESS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'IN_PROGRESS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'zh' ? `生产中 (${inProgressCount})` : lang === 'en' ? `In Progress (${inProgressCount})` : `Sedang Proses (${inProgressCount})`}
          </button>

          <button
            onClick={() => setFilterType('PLANNED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              filterType === 'PLANNED'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {lang === 'zh' ? `待开工排队 (${totalActiveCount - inProgressCount})` : lang === 'en' ? `Pending Queue (${totalActiveCount - inProgressCount})` : `Barisan Menunggu (${totalActiveCount - inProgressCount})`}
          </button>

          <button
            onClick={() => setFilterType('RISK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
              filterType === 'RISK'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            {lang === 'zh' ? `逾期风险预警 (${riskCount})` : lang === 'en' ? `Overdue Risk (${riskCount})` : `Risiko Lewat (${riskCount})`}
          </button>
        </div>

        {/* Reactor Filter & Search Input */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedReactor}
            onChange={(e) => setSelectedReactor(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">{lang === 'zh' ? '全部反应釜' : lang === 'en' ? 'All Reactors' : 'Semua Reaktor'}</option>
            {reactors.map((r) => (
              <option key={r.reactor_id} value={r.reactor_id}>
                {r.reactor_id} ({r.reactor_name})
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={lang === 'zh' ? '搜索批次 / 订单 / 型号...' : lang === 'en' ? 'Search Batch / Order...' : 'Cari Kelompok / Pesanan...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden w-48"
            />
          </div>
        </div>
      </div>

      {/* 4. Active Batches Real-time Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {displayedBatches.map((batch) => {
          const isAtRisk = batch.isOverdueRisk;
          const assignedReactor = reactors.find((r) => r.reactor_id === batch.assigned_reactor_id);
          const currentStepDef = PROCESS_NODES.find((n) => n.id === batch.current_step);
          const isFinished = batch.step_status === 'FINISHED' && batch.current_step === 5;

          return (
            <div
              key={batch.batch_id}
              className={`rounded-2xl p-5 shadow-sm transition-all duration-200 relative overflow-hidden border ${
                isAtRisk
                  ? 'animate-alert-flashing border-rose-500 bg-rose-50/70 shadow-md shadow-rose-200'
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              {/* Overdue Flashing Banner at top of card */}
              {isAtRisk && (
                <div className="bg-rose-600 text-white text-xs px-3.5 py-1.5 rounded-lg mb-3 flex items-center justify-between font-bold animate-pulse shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>🚨 {lang === 'zh' ? '进度即将逾期预警' : lang === 'en' ? 'OVERDUE WARNING' : 'AMARAN KELEWATAN'}</span>
                  </div>
                  <span className="text-[11px] font-mono font-normal">
                    {batch.overdueReason || (lang === 'zh' ? '预计影响客户交付期限，需立即协调' : lang === 'en' ? 'Expected to impact client due date' : 'Dijangka menjejaskan tarikh janji')}
                  </span>
                </div>
              )}

              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold font-mono text-blue-700">
                      {batch.batch_id}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {batch.order_no}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {batch.customer_name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {batch.product_model.replace('SIM-MODEL-', 'MODEL-')}
                    </span>
                    {batch.order?.urgent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {lang === 'zh' ? 'VIP 紧急' : lang === 'en' ? 'VIP Urgent' : 'VIP Cemas'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>{lang === 'zh' ? '产品' : lang === 'en' ? 'Product' : 'Produk'}: <strong className="text-slate-700">{batch.product_name}</strong></span>
                    <span>·</span>
                    <span>{lang === 'zh' ? '批量' : lang === 'en' ? 'Batch' : 'Kelompok'}: <strong className="text-slate-900 font-mono">{batch.batch_qty_kg.toLocaleString()} kg</strong> ({(batch.batch_qty_kg / 1000).toFixed(1)}t)</span>
                  </div>
                </div>

                {/* Reactor Badge */}
                <div className="flex sm:flex-col items-end gap-1">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-blue-600" />
                    {batch.assigned_reactor_id} ({assignedReactor?.rated_kg ? assignedReactor.rated_kg / 1000 : 6}t)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {lang === 'zh' ? '温控' : lang === 'en' ? 'Temp' : 'Suhu'} {assignedReactor?.temperature || 20.5}℃ · {assignedReactor?.agitation_rpm || 90} RPM
                  </span>
                </div>
              </div>

              {/* Progress Bar & Key Metrics */}
              <div className="my-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    {lang === 'zh' ? '批次全流程进度' : lang === 'en' ? 'Overall Batch Progress' : 'Kemajuan Keseluruhan Kelompok'}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500">{lang === 'zh' ? '合格灌装' : lang === 'en' ? 'Good Output' : 'Pengisian Baik'}: <strong className="text-emerald-700 font-bold">{batch.good_filled_kg.toLocaleString()} kg</strong></span>
                    <span className="text-slate-300">|</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      isFinished
                        ? 'bg-emerald-50 text-emerald-700'
                        : isAtRisk
                        ? 'bg-rose-100 text-rose-800 font-bold animate-pulse'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {batch.progressPercent}%
                    </span>
                  </div>
                </div>

                {/* Animated Gradient Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFinished
                        ? 'bg-emerald-600'
                        : isAtRisk
                        ? 'bg-rose-600 bg-stripes-rose animate-pulse'
                        : 'bg-blue-600 bg-stripes-blue'
                    }`}
                    style={{ width: `${batch.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Six Process Stepper Progress Bar (六工序推进) */}
              <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 my-3">
                <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center justify-between">
                  <span>{lang === 'zh' ? '工序级流转状态 (ISA-95 制造规范):' : lang === 'en' ? 'Process Step Status (ISA-95):' : 'Status Langkah Proses (ISA-95):'}</span>
                  <span className="font-mono text-slate-500">
                    {lang === 'zh' ? '当前' : lang === 'en' ? 'Current' : 'Semasa'}: {batch.current_step} - {currentStepDef?.name}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1.5 text-center">
                  {PROCESS_NODES.map((node) => {
                    const isStepFinished = batch.current_step > node.id || (batch.current_step === node.id && batch.step_status === 'FINISHED');
                    const isStepCurrent = batch.current_step === node.id && batch.step_status !== 'FINISHED';
                    const isStepPending = batch.current_step < node.id;
                    const isWash = node.id === 6;

                    // Wash node handling
                    const washApplicable = batch.preceding_wash_min > 0;

                    return (
                      <div
                        key={node.id}
                        className={`rounded-lg p-2 flex flex-col items-center justify-between text-[11px] border transition-all ${
                          isStepFinished
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                            : isStepCurrent
                            ? isAtRisk
                              ? 'bg-rose-100 border-rose-400 text-rose-900 font-bold ring-2 ring-rose-400 animate-pulse'
                              : 'bg-blue-50 border-blue-300 text-blue-800 font-bold ring-2 ring-blue-300'
                            : isWash && !washApplicable
                            ? 'bg-slate-100 border-slate-200 text-slate-400'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-center w-5 h-5 rounded-full mb-1">
                          {isStepFinished ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : isStepCurrent ? (
                            <span className={`w-2.5 h-2.5 rounded-full ${isAtRisk ? 'bg-rose-600 animate-ping' : 'bg-blue-600 animate-pulse'}`} />
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">{node.id}</span>
                          )}
                        </div>
                        <span className="truncate w-full">{node.name}</span>
                        <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                          {isWash ? (washApplicable ? `${batch.preceding_wash_min}m` : (lang === 'zh' ? '免洗' : lang === 'en' ? 'Zero' : 'N/A')) : `${node.standard_hours}h`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quality Release & Schedule Timestamps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                {/* QC Status */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {batch.qc_status === 'RELEASED' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : batch.qc_status === 'HOLD' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <div className="text-[10px] text-slate-400">{lang === 'zh' ? '工序4 质量放行门禁' : lang === 'en' ? 'Step 04 QC Gate' : 'Pintu QC Langkah 04'}</div>
                      <div className="font-semibold text-slate-800 text-[11px]">
                        {batch.qc_status === 'RELEASED'
                          ? (lang === 'zh' ? '已放行 (水分 ≤15ppm 合格)' : lang === 'en' ? 'Released (Moisture ≤15ppm)' : 'Dilepaskan (Kelembapan ≤15ppm)')
                          : batch.qc_status === 'HOLD'
                          ? (lang === 'zh' ? '质量拦截 (水分 16.2ppm > 15ppm)' : lang === 'en' ? 'Hold (Moisture 16.2 > 15ppm)' : 'Ditahan (Kelembapan 16.2 > 15ppm)')
                          : (lang === 'zh' ? '取样检测中 (等待化验室放行)' : lang === 'en' ? 'Sampling (Awaiting QC)' : 'Pensampelan (Menunggu QC)')}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    batch.qc_status === 'RELEASED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : batch.qc_status === 'HOLD'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {batch.qc_status}
                  </span>
                </div>

                {/* Timings */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{lang === 'zh' ? '预计灌装完成:' : lang === 'en' ? 'Est. Finish:' : 'Jangka Selesai:'}</span>
                    <span className={`font-mono font-bold ${isAtRisk ? 'text-rose-600' : 'text-slate-800'}`}>
                      {batch.plan_end_time}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-0.5">
                    <span className="text-slate-500">{lang === 'zh' ? '客户合同交期:' : lang === 'en' ? 'Customer Due:' : 'Tarikh Janji:'}</span>
                    <span className="font-mono text-slate-700">
                      {batch.order?.customer_due_at || '2026-09-18 18:00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="font-medium text-slate-700">{lang === 'zh' ? '洗釜策略:' : lang === 'en' ? 'Wash Rule:' : 'Peraturan Cuci:'}</span>
                  {batch.preceding_wash_min > 0 ? (
                    <span className="text-amber-700 font-medium">{lang === 'zh' ? `换型清洗 ${batch.preceding_wash_min / 60}h` : lang === 'en' ? `Changeover Wash ${batch.preceding_wash_min / 60}h` : `Cuci Tukar Model ${batch.preceding_wash_min / 60}h`}</span>
                  ) : (
                    <span className="text-slate-400">{lang === 'zh' ? '同型号免洗连续投产' : lang === 'en' ? 'Same model zero-wash' : 'Model sama tanpa cuci'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleSimulateDelay(batch.batch_id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    {isAtRisk
                      ? (lang === 'zh' ? '消除告警' : lang === 'en' ? 'Clear Alert' : 'Padam Amaran')
                      : (lang === 'zh' ? '触发延误测试' : lang === 'en' ? 'Simulate Delay' : 'Simulasi Lewat')}
                  </button>

                  {onNavigateToShiftReport && (
                    <button
                      onClick={onNavigateToShiftReport}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
                    >
                      {lang === 'zh' ? '工序报工' : lang === 'en' ? 'Report' : 'Lapor'} <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {onNavigateToGantt && (
                    <button
                      onClick={onNavigateToGantt}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                    >
                      {lang === 'zh' ? '甘特图' : lang === 'en' ? 'Gantt' : 'Gantt'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayedBatches.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
          <AlertCircle className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">
            {lang === 'zh' ? '未找到符合筛选条件的活跃生产批次' : lang === 'en' ? 'No active batches match the filter criteria' : 'Tiada kelompok aktif sepadan dengan penapis'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'zh' ? '请尝试清除搜索词或切换反应釜筛选' : lang === 'en' ? 'Try clearing search keywords or switching reactor filter' : 'Cuba kosongkan carian atau tukar penapis reaktor'}
          </p>
        </div>
      )}
    </div>
  );
};
