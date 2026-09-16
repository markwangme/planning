import React, { useState, useMemo } from "react";
import {
  ScheduledTask,
  WorkResource,
  ProductionOrder,
  FormulaType,
  DisruptionEvent,
} from "../types.ts";
import {
  Clock,
  Filter,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Info,
  Layers,
  ChevronRight,
} from "lucide-react";

interface GanttChartProps {
  tasks: ScheduledTask[];
  resources: WorkResource[];
  orders: ProductionOrder[];
  disruptions: DisruptionEvent[];
  timelineStart: number;
  timelineEnd: number;
  onTaskClick?: (task: ScheduledTask) => void;
  onUpdateTask?: (task: ScheduledTask) => void;
}

export const FORMULA_META: Record<
  FormulaType,
  { label: string; short: string; bg: string; border: string; text: string; dot: string }
> = {
  NCM_HIGH_NICKEL: {
    label: "高镍三元动力型 (NCM)",
    short: "高镍NCM",
    bg: "bg-blue-600/80 hover:bg-blue-500",
    border: "border-blue-400/80",
    text: "text-white",
    dot: "bg-blue-400",
  },
  LFP_HIGH_RATE: {
    label: "磷酸铁锂高倍率 (LFP)",
    short: "铁锂LFP",
    bg: "bg-emerald-600/80 hover:bg-emerald-500",
    border: "border-emerald-400/80",
    text: "text-white",
    dot: "bg-emerald-400",
  },
  SI_CARBON_ANODE: {
    label: "硅碳4680宽温域",
    short: "硅碳4680",
    bg: "bg-purple-600/80 hover:bg-purple-500",
    border: "border-purple-400/80",
    text: "text-white",
    dot: "bg-purple-400",
  },
  SODIUM_ION_SPEC: {
    label: "钠离子特种耐低温",
    short: "钠电特种",
    bg: "bg-amber-600/80 hover:bg-amber-500",
    border: "border-amber-400/80",
    text: "text-white",
    dot: "bg-amber-400",
  },
  SOLID_STATE_HYBRID: {
    label: "半固态固液混合",
    short: "半固态",
    bg: "bg-cyan-600/80 hover:bg-cyan-500",
    border: "border-cyan-400/80",
    text: "text-white",
    dot: "bg-cyan-400",
  },
};

const CATEGORY_NAMES: Record<WorkResource["category"], { title: string; badge: string }> = {
  PRE_TANK: { title: "预溶与脱水工段", badge: "前道预备" },
  REACTOR: { title: "核心配制反应工段 (瓶颈工序)", badge: "关键产能" },
  AGING_VESSEL: { title: "静态熟化与超精过滤工段", badge: "中道均质" },
  PACKING_LINE: { title: "自动化充氮灌装工段", badge: "后道成品" },
  QA_LAB: { title: "分析质检与水分快检中心", badge: "品控放行" },
};

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  resources,
  orders,
  disruptions,
  timelineStart = 0,
  timelineEnd = 96,
  onTaskClick,
}) => {
  // UI States
  const [zoomLevel, setZoomLevel] = useState<"compact" | "normal" | "spacious">("normal");
  const [filterFormula, setFilterFormula] = useState<string>("ALL");
  const [filterOrderNo, setFilterOrderNo] = useState<string>("ALL");
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);

  // Pixels per hour calculation
  const pxPerHour = useMemo(() => {
    switch (zoomLevel) {
      case "compact":
        return 16;
      case "spacious":
        return 36;
      case "normal":
      default:
        return 24;
    }
  }, [zoomLevel]);

  const totalWidth = (timelineEnd - timelineStart) * pxPerHour;

  // Group resources by category
  const groupedResources = useMemo(() => {
    const groups: { category: WorkResource["category"]; items: WorkResource[] }[] = [
      { category: "PRE_TANK", items: [] },
      { category: "REACTOR", items: [] },
      { category: "AGING_VESSEL", items: [] },
      { category: "QA_LAB", items: [] },
      { category: "PACKING_LINE", items: [] },
    ];

    resources.forEach((r) => {
      const g = groups.find((grp) => grp.category === r.category);
      if (g) g.items.push(r);
    });

    return groups;
  }, [resources]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterFormula !== "ALL" && t.formulaType !== filterFormula) return false;
      if (filterOrderNo !== "ALL" && t.orderNo !== filterOrderNo) return false;
      return true;
    });
  }, [tasks, filterFormula, filterOrderNo]);

  // Generate timeline markers (days, shifts, hours)
  const hourTicks = useMemo(() => {
    const ticks: { hour: number; label: string; isDayStart: boolean; shiftName: string }[] = [];
    for (let h = timelineStart; h <= timelineEnd; h += 4) {
      const dayNum = Math.floor(h / 24) + 1;
      const hourInDay = h % 24;
      const isDayStart = hourInDay === 0;

      let shiftName = "夜班 (00-08)";
      if (hourInDay >= 8 && hourInDay < 16) {
        shiftName = "早班 (08-16)";
      } else if (hourInDay >= 16 && hourInDay < 24) {
        shiftName = "中班 (16-24)";
      }

      ticks.push({
        hour: h,
        label: `${hourInDay.toString().padStart(2, "0")}:00`,
        isDayStart,
        shiftName,
      });
    }
    return ticks;
  }, [timelineStart, timelineEnd]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-slate-850 p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>排程甘特图主推演区 (半天/班次级)</span>
          </div>

          {/* Formula Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="text-slate-400">配方筛选:</span>
            <select
              value={filterFormula}
              onChange={(e) => setFilterFormula(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-800">全部电解液配方</option>
              <option value="NCM_HIGH_NICKEL" className="bg-slate-800">高镍NCM动力型</option>
              <option value="LFP_HIGH_RATE" className="bg-slate-800">铁锂LFP倍率型</option>
              <option value="SI_CARBON_ANODE" className="bg-slate-800">硅碳4680宽温</option>
              <option value="SODIUM_ION_SPEC" className="bg-slate-800">钠离子耐低温</option>
            </select>
          </div>

          {/* Order Highlight Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400">工单高亮:</span>
            <select
              value={filterOrderNo}
              onChange={(e) => {
                setFilterOrderNo(e.target.value);
                setHoveredOrderId(e.target.value === "ALL" ? null : e.target.value);
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-800">所有工单链路</option>
              {orders.map((o) => (
                <option key={o.id} value={o.orderNo} className="bg-slate-800">
                  {o.orderNo} - {o.customerName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend & Zoom controls */}
        <div className="flex items-center gap-3">
          {/* Color Legend */}
          <div className="hidden lg:flex items-center gap-2">
            {Object.entries(FORMULA_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-1 text-[11px] text-slate-300">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span>{meta.short}</span>
              </div>
            ))}
            <div className="flex items-center gap-1 text-[11px] text-slate-300 ml-1">
              <span className="w-2.5 h-2 rounded bg-stripes-slate border border-amber-500/50" />
              <span>换产洗釜</span>
            </div>
          </div>

          {/* Zoom buttons */}
          <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 p-0.5">
            <button
              onClick={() => setZoomLevel("compact")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                zoomLevel === "compact"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="紧凑缩放 (适合查看7天全景)"
            >
              紧凑
            </button>
            <button
              onClick={() => setZoomLevel("normal")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                zoomLevel === "normal"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="标准缩放 (4小时/格)"
            >
              标准
            </button>
            <button
              onClick={() => setZoomLevel("spacious")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                zoomLevel === "spacious"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="精细缩放 (便于微调每小时)"
            >
              精细
            </button>
          </div>
        </div>
      </div>

      {/* Main Gantt Body: Left Resource Header + Right Scrollable Timeline Canvas */}
      <div className="flex flex-1 overflow-hidden relative min-h-[520px] max-h-[680px]">
        {/* Left Column: Fixed Resource List */}
        <div className="w-64 sm:w-72 bg-slate-900 border-r border-slate-800 flex-shrink-0 z-20 flex flex-col select-none">
          {/* Header spacer */}
          <div className="h-14 bg-slate-850 border-b border-slate-800 px-3 flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>机台 / 配制釜 / 生产线</span>
            <span className="text-[10px] text-slate-400 font-normal">专釜约束/容量</span>
          </div>

          {/* Resource list by category */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
            {groupedResources.map((group) => (
              <div key={group.category} className="bg-slate-900/50">
                {/* Category Group Header */}
                <div className="bg-slate-850/90 px-3 py-1.5 flex items-center justify-between border-b border-slate-800/60">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    {CATEGORY_NAMES[group.category].title}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {CATEGORY_NAMES[group.category].badge}
                  </span>
                </div>

                {/* Resource Rows */}
                {group.items.map((res) => {
                  const resTasks = filteredTasks.filter((t) => t.resourceId === res.id);
                  const totalOccupied = resTasks.reduce(
                    (s, t) => s + (t.endHour - t.startHour) + (t.setupDurationHours || 0),
                    0
                  );
                  const util = Math.min(100, Math.round((totalOccupied / (timelineEnd || 1)) * 100));

                  const hasBreakdown = disruptions.some(
                    (d) =>
                      d.type === "MACHINE_BREAKDOWN" &&
                      !d.resolved &&
                      d.targetResourceId === res.id
                  );

                  return (
                    <div
                      key={res.id}
                      className={`h-16 px-3 flex flex-col justify-center transition-colors border-b border-slate-800/40 ${
                        hasBreakdown ? "bg-rose-950/20" : "hover:bg-slate-850/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-cyan-300">
                            {res.code}
                          </span>
                          <span className="text-xs text-slate-200 truncate max-w-[120px]">
                            {res.name}
                          </span>
                        </div>
                        {hasBreakdown ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 animate-pulse font-medium">
                            故障检修
                          </span>
                        ) : res.dedicatedFormula ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-medium">
                            专釜专用
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-mono">
                            {res.capacityTons}吨/批
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <span>负荷率</span>
                          <span className="font-mono font-medium text-slate-300">{util}%</span>
                        </div>
                        <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              util > 85
                                ? "bg-amber-400"
                                : util > 50
                                ? "bg-cyan-400"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${util}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Scrollable Timeline Canvas */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-950 flex flex-col relative">
          <div style={{ width: `${totalWidth}px` }} className="relative min-w-full">
            {/* Timeline Header (Days + Shifts + Hours) */}
            <div className="h-14 bg-slate-900 sticky top-0 z-30 border-b border-slate-800 select-none">
              {/* Day & Shift Row */}
              <div className="h-7 border-b border-slate-850 flex relative">
                {Array.from({ length: Math.ceil((timelineEnd - timelineStart) / 24) }).map(
                  (_, dIdx) => {
                    const dayHourStart = dIdx * 24;
                    const leftPx = dayHourStart * pxPerHour;
                    const dayWidth = 24 * pxPerHour;
                    return (
                      <div
                        key={dIdx}
                        style={{ left: `${leftPx}px`, width: `${dayWidth}px` }}
                        className="absolute top-0 bottom-0 border-r border-slate-700/80 px-2 flex items-center justify-between bg-slate-850/60 text-[11px] font-bold text-slate-300"
                      >
                        <span>第 {dIdx + 1} 天 (2026-09-{14 + dIdx})</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          三班运转 (24H)
                        </span>
                      </div>
                    );
                  }
                )}
              </div>

              {/* Hour Ticks Row */}
              <div className="h-7 relative flex items-center">
                {hourTicks.map((tick) => {
                  const leftPx = (tick.hour - timelineStart) * pxPerHour;
                  return (
                    <div
                      key={tick.hour}
                      style={{ left: `${leftPx}px` }}
                      className={`absolute top-0 bottom-0 flex items-center px-1 font-mono text-[10px] ${
                        tick.isDayStart
                          ? "text-cyan-400 font-bold border-l-2 border-cyan-500"
                          : "text-slate-400 border-l border-slate-800"
                      }`}
                    >
                      {tick.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vertical grid lines for timeline */}
            <div className="absolute top-14 bottom-0 left-0 right-0 pointer-events-none">
              {hourTicks.map((tick) => {
                const leftPx = (tick.hour - timelineStart) * pxPerHour;
                return (
                  <div
                    key={`line_${tick.hour}`}
                    style={{ left: `${leftPx}px` }}
                    className={`absolute top-0 bottom-0 ${
                      tick.isDayStart
                        ? "border-l-2 border-cyan-900/50"
                        : "border-l border-slate-800/40"
                    }`}
                  />
                );
              })}
            </div>

            {/* Resources Tasks Track */}
            <div className="relative">
              {groupedResources.map((group) => (
                <div key={`track_grp_${group.category}`}>
                  {/* Category spacer banner */}
                  <div className="h-7 bg-slate-900/70 border-b border-slate-800/60" />

                  {/* Resource rows */}
                  {group.items.map((res) => {
                    const resTasks = filteredTasks.filter((t) => t.resourceId === res.id);

                    // Check if machine breakdown event is on this resource
                    const breakdown = disruptions.find(
                      (d) =>
                        d.type === "MACHINE_BREAKDOWN" &&
                        !d.resolved &&
                        d.targetResourceId === res.id
                    );

                    return (
                      <div
                        key={`row_${res.id}`}
                        className="h-16 relative border-b border-slate-800/40 hover:bg-slate-900/30 transition-colors"
                      >
                        {/* Breakdown blocked area */}
                        {breakdown && (
                          <div
                            style={{
                              left: `${(breakdown.occurredAtHour - timelineStart) * pxPerHour}px`,
                              width: `${breakdown.durationHours * pxPerHour}px`,
                            }}
                            className="absolute top-1 bottom-1 bg-stripes-rose rounded-lg border border-rose-600/70 z-10 flex items-center justify-center text-rose-200 text-xs font-semibold shadow-inner"
                            title={`故障维修中: ${breakdown.title}`}
                          >
                            <span className="bg-rose-950/90 px-2 py-0.5 rounded text-[10px] border border-rose-500/50 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400 animate-spin" />
                              {breakdown.durationHours}h 停机检修
                            </span>
                          </div>
                        )}

                        {/* Scheduled Tasks on this machine */}
                        {resTasks.map((task) => {
                          const meta = FORMULA_META[task.formulaType];
                          const startPx = (task.startHour - timelineStart) * pxPerHour;
                          const widthPx = (task.endHour - task.startHour) * pxPerHour;

                          // Setup / Cleaning changeover block
                          const hasSetup = (task.setupDurationHours || 0) > 0;
                          const setupWidthPx = (task.setupDurationHours || 0) * pxPerHour;
                          const setupStartPx = startPx - setupWidthPx;

                          const isRelatedToHovered =
                            hoveredOrderId &&
                            (hoveredOrderId === task.orderId || hoveredOrderId === task.orderNo);

                          return (
                            <React.Fragment key={task.id}>
                              {/* 1. Setup / Cleaning Changeover Block */}
                              {hasSetup && (
                                <div
                                  style={{
                                    left: `${setupStartPx}px`,
                                    width: `${setupWidthPx}px`,
                                  }}
                                  className="absolute top-2 bottom-2 rounded-md bg-amber-950/80 border border-dashed border-amber-500/70 z-10 flex items-center justify-center overflow-hidden cursor-help text-amber-200 text-[10px] shadow-sm hover:bg-amber-900/90 transition-all"
                                  title={`换产洗釜: ${task.setupReason} (耗时: ${task.setupDurationHours}h)`}
                                  onClick={() => setSelectedTask(task)}
                                >
                                  <span className="truncate px-1 font-mono font-medium flex items-center gap-0.5">
                                    🧼 {task.setupDurationHours}h
                                  </span>
                                </div>
                              )}

                              {/* 2. Main Operation Task Block */}
                              <div
                                style={{
                                  left: `${startPx}px`,
                                  width: `${Math.max(widthPx, 28)}px`,
                                }}
                                onMouseEnter={() => setHoveredOrderId(task.orderId)}
                                onMouseLeave={() => {
                                  if (filterOrderNo === "ALL") setHoveredOrderId(null);
                                }}
                                onClick={() => {
                                  setSelectedTask(task);
                                  if (onTaskClick) onTaskClick(task);
                                }}
                                className={`absolute top-1.5 bottom-1.5 rounded-lg border px-2 py-1 flex flex-col justify-between cursor-pointer transition-all z-15 shadow-md ${
                                  meta.bg
                                } ${meta.border} ${meta.text} ${
                                  isRelatedToHovered
                                    ? "ring-2 ring-white scale-[1.02] shadow-cyan-500/30 z-25"
                                    : "opacity-95"
                                } ${
                                  task.isDelayed
                                    ? "ring-2 ring-rose-500 animate-pulse"
                                    : ""
                                }`}
                              >
                                {/* Task Header: Op Seq + Order No + Customer */}
                                <div className="flex items-center justify-between text-[11px] font-bold leading-none gap-1">
                                  <div className="flex items-center gap-1 truncate">
                                    <span className="bg-black/30 px-1 py-0.2 rounded text-[10px] font-mono">
                                      {task.opName.slice(0, 4)}
                                    </span>
                                    <span className="truncate font-mono">{task.orderNo}</span>
                                  </div>

                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {task.isEmergency && (
                                      <span className="bg-rose-500 text-white text-[9px] px-1 rounded animate-bounce">
                                        加急
                                      </span>
                                    )}
                                    {task.isDelayed && (
                                      <span className="bg-rose-950 text-rose-300 border border-rose-600 text-[9px] px-1 rounded">
                                        延期{task.delayHours}h
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Task Footer: Product & Time */}
                                <div className="flex items-center justify-between text-[10px] opacity-90 truncate mt-0.5">
                                  <span className="truncate">{task.customerName.slice(0, 4)}</span>
                                  <span className="font-mono text-[9px]">
                                    {task.startHour}h-{task.endHour}h ({task.endHour - task.startHour}h)
                                  </span>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Modal / Inspection Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-100 relative">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  工序详情 · {selectedTask.opName} (SEQ {selectedTask.opSeq})
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedTask.orderNo} - {selectedTask.customerName}
                </h3>
                <p className="text-xs text-slate-400">{selectedTask.productName}</p>
              </div>

              <button
                onClick={() => setSelectedTask(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">所属工作中心</span>
                <p className="font-mono font-bold text-cyan-300 text-sm mt-0.5">
                  {resources.find((r) => r.id === selectedTask.resourceId)?.name || selectedTask.resourceId}
                </p>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">排程作业时间</span>
                <p className="font-mono font-bold text-slate-200 text-sm mt-0.5">
                  第 {selectedTask.startHour}h 至 {selectedTask.endHour}h (净用时 {selectedTask.endHour - selectedTask.startHour}h)
                </p>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">前置洗釜/换产准备</span>
                <p className="font-medium text-amber-300 text-xs mt-0.5">
                  {(selectedTask.setupDurationHours || 0) > 0
                    ? `耗时 ${selectedTask.setupDurationHours}h (${selectedTask.setupReason})`
                    : "初次开机或同配方免深度清洗"}
                </p>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">配方类别</span>
                <p className="font-medium text-slate-200 text-xs mt-0.5">
                  {FORMULA_META[selectedTask.formulaType]?.label}
                </p>
              </div>
            </div>

            {/* Precedence context */}
            <div className="mt-4 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-300 block mb-2">
                完整工序流转链路追踪:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                {[
                  { seq: 10, name: "预溶脱水" },
                  { seq: 20, name: "配制均质" },
                  { seq: 30, name: "熟化静置" },
                  { seq: 40, name: "水分质检" },
                  { seq: 50, name: "充氮灌装" },
                ].map((step, idx) => {
                  const isCurrent = step.seq === selectedTask.opSeq;
                  return (
                    <React.Fragment key={step.seq}>
                      <div
                        className={`px-2 py-1 rounded-md font-medium ${
                          isCurrent
                            ? "bg-cyan-600 text-white font-bold ring-1 ring-cyan-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {step.seq} {step.name}
                      </div>
                      {idx < 4 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setHoveredOrderId(selectedTask.orderId);
                  setSelectedTask(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                全线高亮该工单
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
