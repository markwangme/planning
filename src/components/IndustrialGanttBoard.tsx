import { resolveWorkshopId } from '../shared/apsMasterData';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  Sparkles,
  Droplet,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Coffee,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Sliders,
  Compass,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Info,
  Building2,
  Factory,
  Search,
  Filter,
  Flame,
  Activity
} from 'lucide-react';
import {
  Reactor,
  BatchTask,
  ReactorRestriction,
  WashMatrixRule,
  ProductionOrder,
  SchedulingStrategy,
  ShiftDef,
  WorkshopId,
  WorkshopDef,
  WORKSHOP_DEFINITIONS,
  LanguageCode
} from '../types/aps';
import {
  parseDateToMinutes,
  formatMinutesToDate,
  calculateBatchDeviation,
  getShiftDurationHours,
  isMinuteInShiftBreak,
  isMinuteInWorkingTime,
  DEFAULT_SHIFTS
} from '../utils/apsEngine';
import { exportIndustrialGanttExcel } from '../utils/excelExport';

export type BoardScope = '30DAYS' | '14DAYS' | '7DAYS' | 'ALL';
export type SlotWidthLevel = 'COMPACT' | 'STANDARD' | 'COMFORT' | 'EXPANDED';

interface IndustrialGanttBoardProps {
  reactors: Reactor[];
  batches: BatchTask[];
  restrictions: ReactorRestriction[];
  washRules: WashMatrixRule[];
  orders: ProductionOrder[];
  shifts?: ShiftDef[];
  workshops?: WorkshopDef[];
  currentWorkshopId?: WorkshopId;
  lang?: LanguageCode;
  onWorkshopChange?: (workshopId: WorkshopId) => void;
  onSelectBatch: (batch: BatchTask) => void;
  onAutoSchedule?: (strategy: SchedulingStrategy) => void;
  onOpenDeviationModal?: (batch: BatchTask) => void;
  onOpenBatchModal?: (batch: BatchTask) => void;
  onUpdateShifts?: (shifts: ShiftDef[]) => void;
}

export const IndustrialGanttBoard: React.FC<IndustrialGanttBoardProps> = ({
  reactors,
  batches,
  restrictions,
  washRules,
  orders,
  shifts = DEFAULT_SHIFTS,
  workshops = WORKSHOP_DEFINITIONS,
  currentWorkshopId = 'ALL',
  lang = 'zh',
  onWorkshopChange,
  onSelectBatch,
  onAutoSchedule,
  onOpenDeviationModal,
  onOpenBatchModal,
  onUpdateShifts
}) => {
  // 1. Board View & Zoom States
  const [boardScope, setBoardScope] = useState<BoardScope>('30DAYS');
  const [slotWidthLevel, setSlotWidthLevel] = useState<SlotWidthLevel>('STANDARD');
  const [baseDateStr, setBaseDateStr] = useState<string>('2026-09-14'); // Default base date
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedReactorFilter, setSelectedReactorFilter] = useState<string>('ALL');
  const [isBoardFullscreen, setIsBoardFullscreen] = useState<boolean>(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Synchronized scroll references
  const mainTableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollBarRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  const [maxScrollLeft, setMaxScrollLeft] = useState<number>(1);

  // Slot width in pixels
  const slotWidthPx = useMemo(() => {
    switch (slotWidthLevel) {
      case 'COMPACT':
        return 32;
      case 'STANDARD':
        return 44; // Matches Image 2 proportion
      case 'COMFORT':
        return 60;
      case 'EXPANDED':
        return 80;
      default:
        return 44;
    }
  }, [slotWidthLevel]);

  // Determine timeline day count
  const daysCount = useMemo(() => {
    switch (boardScope) {
      case '7DAYS':
        return 7;
      case '14DAYS':
        return 14;
      case '30DAYS':
        return 31; // Image 2: Full month 4/1 to 5/1 (31 days)
      case 'ALL':
        return 45;
      default:
        return 31;
    }
  }, [boardScope]);

  // Calculate timeline start and end minutes
  const { timelineStartMin, timelineEndMin, totalWindowMinutes, daysList } = useMemo(() => {
    const startMin = parseDateToMinutes(`${baseDateStr} 00:00`);
    const endMin = startMin + daysCount * 24 * 60;
    const totalMins = daysCount * 24 * 60;

    const list: {
      dateStr: string;
      displayLabel: string; // e.g. "9/14" matching Image 2 "4/1", "4/2"
      dayOfWeekZh: string;
      isToday: boolean;
      startMin: number;
    }[] = [];

    const weekDaysZh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDaysMs = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'];
    const weekDays = lang === 'zh' ? weekDaysZh : lang === 'en' ? weekDaysEn : weekDaysMs;
    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < daysCount; i++) {
      const dMin = startMin + i * 1440;
      const dObj = new Date(dMin * 1000 * 60);
      const M = dObj.getMonth() + 1;
      const D = dObj.getDate();
      const YYYY = dObj.getFullYear();
      const MM = String(M).padStart(2, '0');
      const DD = String(D).padStart(2, '0');
      const dateStr = `${YYYY}-${MM}-${DD}`;

      list.push({
        dateStr,
        displayLabel: `${M}/${D}`, // Exactly matches "4/1", "4/2", "4/3" from Image 2
        dayOfWeekZh: weekDays[dObj.getDay()],
        isToday: dateStr === todayDateStr,
        startMin: dMin
      });
    }

    return {
      timelineStartMin: startMin,
      timelineEndMin: endMin,
      totalWindowMinutes: totalMins,
      daysList: list
    };
  }, [baseDateStr, daysCount, lang]);

  // 4 shift intervals per day matching Image 2
  // Image 2 has 4 columns:
  // 1: Yellow (0:00 - 9:00 or 0:00 - 8:00)
  // 2: Blue (9:00 - 12:00)
  // 3: Orange (12:00 - 21:00)
  // 4: Red (21:00 - 24:00)
  const shiftIntervalsConfig = useMemo(() => [
    {
      code: 'S1',
      label: '0:00 - 9:00',
      startHour: 0,
      endHour: 9,
      durationHours: 9,
      bgClass: 'bg-[#fcd34d] text-slate-900 border-[#f59e0b]', // Yellow from Image 2
      headerBg: '#fcd34d'
    },
    {
      code: 'S2',
      label: '9:00 - 12:00',
      startHour: 9,
      endHour: 12,
      durationHours: 3,
      bgClass: 'bg-[#38bdf8] text-slate-900 border-[#0284c7]', // Blue from Image 2
      headerBg: '#38bdf8'
    },
    {
      code: 'S3',
      label: '12:00 - 21:00',
      startHour: 12,
      endHour: 21,
      durationHours: 9,
      bgClass: 'bg-[#fb923c] text-white border-[#ea580c]', // Orange from Image 2
      headerBg: '#fb923c'
    },
    {
      code: 'S4',
      label: '21:00 - 24:00',
      startHour: 21,
      endHour: 24,
      durationHours: 3,
      bgClass: 'bg-[#ef4444] text-white border-[#b91c1c]', // Red from Image 2
      headerBg: '#ef4444'
    }
  ], []);

  // Total columns in timeline = daysCount * 4
  const totalTimelineCols = daysCount * 4;
  const totalTimelineWidthPx = totalTimelineCols * slotWidthPx;

  // 只用于时间表头提示：订单条本身仍保持原计划起止时长，不缩短、不拆段。
  const restIntervals = useMemo(() => {
    const intervals: { startMin: number; endMin: number }[] = [];
    let start: number | null = null;
    for (let minute = timelineStartMin; minute < timelineEndMin; minute += 1) {
      // 班中午休/晚餐等 1~2 小时不标记；这里只标记整段班次停工或周末放假。
      const isRest = !isMinuteInWorkingTime(minute, shifts) && !isMinuteInShiftBreak(minute, shifts).isBreak;
      if (isRest && start === null) start = minute;
      if (!isRest && start !== null) {
        intervals.push({ startMin: start, endMin: minute });
        start = null;
      }
    }
    if (start !== null) intervals.push({ startMin: start, endMin: timelineEndMin });
    return intervals;
  }, [timelineStartMin, timelineEndMin, shifts]);

  // Sync scroll handlers
  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollLeft(target.scrollLeft);
    const max = target.scrollWidth - target.clientWidth;
    setMaxScrollLeft(max > 0 ? max : 1);

    if (topScrollBarRef.current && topScrollBarRef.current.scrollLeft !== target.scrollLeft) {
      topScrollBarRef.current.scrollLeft = target.scrollLeft;
    }
  };

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (mainTableScrollRef.current && mainTableScrollRef.current.scrollLeft !== target.scrollLeft) {
      mainTableScrollRef.current.scrollLeft = target.scrollLeft;
    }
  };

  // Quick navigation controls
  const handleScrollToStart = () => {
    if (mainTableScrollRef.current) {
      mainTableScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToEnd = () => {
    if (mainTableScrollRef.current) {
      mainTableScrollRef.current.scrollTo({ left: mainTableScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  const handleScrollDays = (deltaDays: number) => {
    if (mainTableScrollRef.current) {
      const deltaPx = deltaDays * 4 * slotWidthPx;
      mainTableScrollRef.current.scrollBy({ left: deltaPx, behavior: 'smooth' });
    }
  };

  // Workshop & Reactor Filtering
  const workshopReactors = useMemo(() => {
    if (!reactors || reactors.length === 0) return [];
    if (currentWorkshopId === 'ALL') return reactors;
    const filtered = reactors.filter((r) => {
      const wId = r.workshop_id || (resolveWorkshopId(r.reactor_id));
      return wId === currentWorkshopId;
    });
    return filtered.length > 0 ? filtered : reactors;
  }, [reactors, currentWorkshopId]);

  const filteredReactors = useMemo(() => {
    if (selectedReactorFilter === 'ALL') return workshopReactors;
    return workshopReactors.filter((r) => r.reactor_id === selectedReactorFilter);
  }, [workshopReactors, selectedReactorFilter]);

  // Reactor alias and category mappings matching the industrial board.
  const reactorDisplayMeta = useMemo(() => {
    const meta: Record<string, { code: string; category: string; fullTitle: string; defaultModel: string }> = {
      'R-1300-01': {
        code: 'A',
        category: '',
        fullTitle: '1.3 t 反应釜 (小试/特种线)',
        defaultModel: 'SIM-MODEL-A'
      },
      'R-6000-01': {
        code: 'B',
        category: '',
        fullTitle: '6 t 反应釜 #1 (动力主线 1号)',
        defaultModel: 'SIM-MODEL-B'
      },
      'R-6000-02': {
        code: 'C',
        category: '',
        fullTitle: '6 t 反应釜 #2 (动力主线 2号 / 专属釜)',
        defaultModel: 'SIM-MODEL-SPECIAL-S'
      }
    };
    reactors.forEach((r, idx) => {
      if (!meta[r.reactor_id]) {
        const letterCode = String.fromCharCode(65 + (idx % 26)) + (idx >= 26 ? Math.floor(idx / 26) : '');
        const wsObj = workshops.find((w) => w.id === r.workshop_id);
        meta[r.reactor_id] = {
          code: letterCode,
          category: wsObj ? `${wsObj.shortName || wsObj.name}溶剂` : `${r.reactor_name.slice(0, 8)}`,
          fullTitle: r.reactor_name,
          defaultModel: 'SIM-MODEL-AUTO'
        };
      }
    });
    return meta;
  }, [reactors, workshops]);

  // Map batches by reactor
  const batchesByReactor = useMemo(() => {
    const map: Record<string, BatchTask[]> = {};
    reactors.forEach((r) => {
      map[r.reactor_id] = [];
    });

    batches.forEach((b) => {
      if (map[b.assigned_reactor_id]) {
        map[b.assigned_reactor_id].push(b);
      }
    });

    // Sort batches by start time
    Object.keys(map).forEach((rId) => {
      map[rId].sort((a, b) => parseDateToMinutes(a.plan_start_time) - parseDateToMinutes(b.plan_start_time));
    });

    return map;
  }, [reactors, batches]);

  // Calculate total scheduled quantity per reactor
  const reactorTotalQuantities = useMemo(() => {
    const totals: Record<string, { planKg: number; actualKg: number; planTons: number; actualTons: number }> = {};
    reactors.forEach((r) => {
      const rBatches = batchesByReactor[r.reactor_id] || [];
      const planKg = rBatches.reduce((sum, b) => sum + (Number(b.batch_qty_kg) || 0), 0);
      const actualKg = rBatches.reduce((sum, b) => {
        // BatchTask has no legacy status/progress_percent fields. Derive actual
        // quantity from the canonical execution fields instead.
        return sum + (Number(b.good_filled_kg) || 0);
      }, 0);
      totals[r.reactor_id] = {
        planKg,
        actualKg,
        planTons: Math.round(planKg / 1000),
        actualTons: Math.round(actualKg / 1000)
      };
    });
    return totals;
  }, [reactors, batchesByReactor]);

  // Current timeline progress calculation for minimap
  const scrollPercent = maxScrollLeft > 0 ? (scrollLeft / maxScrollLeft) * 100 : 0;

  return (
    <div
      id="industrial-gantt-board-root"
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all select-none ${
        isBoardFullscreen ? 'fixed inset-0 z-50 rounded-none p-3 overflow-hidden h-screen w-screen' : 'w-full'
      }`}
    >
      {/* 1. TOP DOCUMENT HEADER & METADATA BAR */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quality Record Code */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-300 shadow-2xs">
              QR-17-02/1.0
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'zh' ? '车间反应釜月度排程甘特看板' : lang === 'en' ? 'Reactor Monthly Schedule Board' : 'Papan Jadual Bulanan Reaktor'}</span>
          </div>
        </div>

        {/* Center & Right Toolbar: Scope, Shift Mode, Zoom, Fullscreen */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Workshop Switcher */}
          {onWorkshopChange && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                onClick={() => onWorkshopChange('ALL')}
                className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                  currentWorkshopId === 'ALL' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title={lang === 'zh' ? '跨厂总览 (查看全部车间)' : lang === 'en' ? 'All Workshops' : 'Semua Bengkel'}
              >
                {lang === 'zh' ? '全厂跨车间' : lang === 'en' ? 'All Workshops' : 'Semua Bengkel'}
              </button>
              {workshops.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => onWorkshopChange(ws.id)}
                  className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                    currentWorkshopId === ws.id ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`${ws.name} (${ws.building || ''})`}
                >
                  {ws.shortName || ws.name}
                </button>
              ))}
            </div>
          )}

          {/* Time Horizon Scope */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setBoardScope('30DAYS')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                boardScope === '30DAYS' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'zh' ? '30天全月看板' : lang === 'en' ? '30-Day Month' : '30-Hari Bulan'}
            >
              {lang === 'zh' ? '30天全月' : lang === 'en' ? '30 Days' : '30 Hari'}
            </button>
            <button
              onClick={() => setBoardScope('14DAYS')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                boardScope === '14DAYS' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'zh' ? '14天滚动排产' : lang === 'en' ? '14-Day Horizon' : '14-Hari Jadual'}
            >
              {lang === 'zh' ? '14天' : lang === 'en' ? '14 Days' : '14 Hari'}
            </button>
            <button
              onClick={() => setBoardScope('7DAYS')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                boardScope === '7DAYS' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'zh' ? '7天周计划' : lang === 'en' ? '7-Day Week' : '7-Hari Minggu'}
            >
              {lang === 'zh' ? '7天' : lang === 'en' ? '7 Days' : '7 Hari'}
            </button>
            <button
              onClick={() => setBoardScope('ALL')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                boardScope === 'ALL' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'zh' ? '全部订单周期' : lang === 'en' ? 'All Batches' : 'Semua Kelompok'}
            >
              {lang === 'zh' ? '全部计划' : lang === 'en' ? 'All' : 'Semua'}
            </button>
          </div>

          {/* Slot Width / Zoom Controls */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setSlotWidthLevel('COMPACT')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                slotWidthLevel === 'COMPACT' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'zh' ? '紧凑列宽 (32px)' : lang === 'en' ? 'Compact Width (32px)' : 'Lebar Padat (32px)'}
            >
              {lang === 'zh' ? '紧凑' : lang === 'en' ? 'Compact' : 'Padat'}
            </button>
            <button
              onClick={() => setSlotWidthLevel('STANDARD')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                slotWidthLevel === 'STANDARD' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'zh' ? '标准列宽 (44px)' : lang === 'en' ? 'Standard Width (44px)' : 'Lebar Piawai (44px)'}
            >
              {lang === 'zh' ? '标准' : lang === 'en' ? 'Std' : 'Piawai'}
            </button>
            <button
              onClick={() => setSlotWidthLevel('COMFORT')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${
                slotWidthLevel === 'COMFORT' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title={lang === 'zh' ? '宽松列宽 (60px)' : lang === 'en' ? 'Comfort Width (60px)' : 'Lebar Selesa (60px)'}
            >
              {lang === 'zh' ? '宽松' : lang === 'en' ? 'Comfort' : 'Selesa'}
            </button>
          </div>

          <button
            onClick={() => void exportIndustrialGanttExcel({
              reactors: filteredReactors,
              batches: filteredReactors.flatMap((reactor) => batchesByReactor[reactor.reactor_id] || []),
              shifts,
              baseDateStr,
              daysCount
            })}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
            title="导出当前工业标准看板为 Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '导出 Excel' : 'Export Excel'}</span>
          </button>

          {/* Recalculate Schedule Button */}
          {onAutoSchedule && (
            <button
              onClick={() => onAutoSchedule('SETUP_MINIMIZE')}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
              title={lang === 'zh' ? '重新试算并自动优化排产' : lang === 'en' ? 'Reschedule & optimize' : 'Jadual semula & optimumkan'}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '智能重排' : lang === 'en' ? 'Reschedule' : 'Jadual Semula'}</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsBoardFullscreen(!isBoardFullscreen)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
            title={isBoardFullscreen ? (lang === 'zh' ? '退出全屏' : lang === 'en' ? 'Exit Fullscreen' : 'Keluar Penuh') : (lang === 'zh' ? '全屏展开看板' : lang === 'en' ? 'Fullscreen' : 'Skrin Penuh')}
          >
            {isBoardFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. DEDICATED HORIZONTAL SCROLLER & QUICK SLIDER CONTROL BAR (横向滚筒条与快速导航) */}
      <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Quick jump date buttons */}
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <span>{lang === 'zh' ? '滚筒条快速导航:' : lang === 'en' ? 'Quick Nav:' : 'Navigasi Pantas:'}</span>
          </span>
          <button
            onClick={handleScrollToStart}
            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded border border-slate-200 shadow-2xs flex items-center gap-0.5"
            title={lang === 'zh' ? '横向滚动至首日' : lang === 'en' ? 'Scroll to first day' : 'Skrol ke hari pertama'}
          >
            <span>⏮️ {lang === 'zh' ? '首日' : lang === 'en' ? 'First Day' : 'Hari Pertama'} ({daysList[0]?.displayLabel})</span>
          </button>
          <button
            onClick={() => handleScrollDays(-3)}
            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded border border-slate-200 shadow-2xs flex items-center gap-0.5"
            title={lang === 'zh' ? '向左前滚 3 天' : lang === 'en' ? 'Scroll back 3 days' : 'Undur 3 hari'}
          >
            <span>◀ {lang === 'zh' ? '前移 3 天' : lang === 'en' ? '3 Days' : '3 Hari'}</span>
          </button>
          <button
            onClick={() => {
              if (mainTableScrollRef.current) {
                mainTableScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
              }
            }}
            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded border border-blue-200 shadow-2xs flex items-center gap-0.5"
            title={lang === 'zh' ? '定位到排产基准日 (9/14)' : lang === 'en' ? 'Scroll to today' : 'Skrol ke hari ini'}
          >
            <Compass className="w-3 h-3 text-blue-600" />
            <span>{lang === 'zh' ? '今天 (9/14)' : lang === 'en' ? 'Today (9/14)' : 'Hari Ini (9/14)'}</span>
          </button>
          <button
            onClick={() => handleScrollDays(3)}
            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded border border-slate-200 shadow-2xs flex items-center gap-0.5"
            title={lang === 'zh' ? '向右后滚 3 天' : lang === 'en' ? 'Scroll forward 3 days' : 'Maju 3 hari'}
          >
            <span>{lang === 'zh' ? '后移 3 天' : lang === 'en' ? '3 Days' : '3 Hari'} ▶</span>
          </button>
          <button
            onClick={handleScrollToEnd}
            className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded border border-slate-200 shadow-2xs flex items-center gap-0.5"
            title={lang === 'zh' ? '横向滚动至月末' : lang === 'en' ? 'Scroll to month end' : 'Skrol ke akhir bulan'}
          >
            <span>⏭️ {lang === 'zh' ? '月末' : lang === 'en' ? 'End' : 'Akhir'} ({daysList[daysList.length - 1]?.displayLabel})</span>
          </button>
        </div>

        {/* Legend strip matching Image 2 */}
        <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-xs bg-[#fcd34d] border border-amber-400"></span>
            <span>0:00-9:00</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-xs bg-[#38bdf8] border border-sky-400"></span>
            <span>9:00-12:00</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-xs bg-[#fb923c] border border-orange-400"></span>
            <span>12:00-21:00</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-3 h-3 rounded-xs bg-[#ef4444] border border-rose-500"></span>
            <span>21:00-24:00</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-emerald-800">
            <span className="w-3 h-3 rounded-xs bg-[#00b050] border border-emerald-600"></span>
            <span>{lang === 'zh' ? '清洗工序' : lang === 'en' ? 'Wash' : 'Cuci'}</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-amber-900">
            <span className="w-3.5 h-3.5 rounded-xs bg-[#fef08a] border border-amber-400 text-[9px] font-bold flex items-center justify-center">A</span>
            <span>{lang === 'zh' ? 'Actual实际执行行' : lang === 'en' ? 'Actual Execution' : 'Pelaksanaan Sebenar'}</span>
          </div>
        </div>
      </div>

      {/* 3. TOP SYNCHRONIZED HORIZONTAL SCROLLBAR (便于直接在表头上方拖动横向滑条) */}
      <div
        ref={topScrollBarRef}
        onScroll={handleTopScroll}
        className="w-full overflow-x-auto overflow-y-hidden bg-slate-200/60 border-b border-slate-300 h-3 scrollbar-thin scrollbar-thumb-indigo-400 hover:scrollbar-thumb-indigo-600"
      >
        <div style={{ width: `${totalTimelineWidthPx + 360}px`, height: '1px' }} />
      </div>

      {/* 4. MAIN INDUSTRIAL SPREADSHEET TABLE WITH HORIZONTAL SCROLLER */}
      <div
        ref={mainTableScrollRef}
        onScroll={handleMainScroll}
        className="flex-1 w-full overflow-x-auto overflow-y-auto max-h-[78vh] scrollbar-thin scrollbar-thumb-slate-400 hover:scrollbar-thumb-slate-600 scrollbar-track-slate-100"
      >
        <table className="border-collapse text-xs w-max min-w-full font-sans select-none bg-white">
          {/* TABLE HEADER */}
          <thead className="sticky top-0 z-30 bg-slate-100 shadow-2xs">
            {/* Row 1: Left Columns header 'ITEM', and top Dates (4/1, 4/2, 4/3...) */}
            <tr>
              {/* Sticky Frozen Left Header: 'ITEM' spanning Reactor, Category, Type, TTL Qty */}
              <th
                colSpan={4}
                className="sticky left-0 z-40 bg-[#fde8e8] border border-slate-400 px-3 py-1.5 text-center font-bold text-slate-800 text-xs tracking-wider"
                style={{ width: '360px', minWidth: '360px', maxWidth: '360px' }}
              >
                ITEM
              </th>

              {/* Day Headers (e.g. 4/1, 4/2, 4/3...) spanning 4 shift sub-columns each */}
              {daysList.map((day) => (
                <th
                  key={`day-header-${day.dateStr}`}
                  colSpan={4}
                  className={`border border-slate-400 py-1 text-center font-bold text-xs ${
                    day.isToday ? 'bg-amber-100/90 text-amber-950 ring-1 ring-inset ring-amber-400' : 'bg-white text-slate-900'
                  }`}
                  style={{ width: `${slotWidthPx * 4}px`, minWidth: `${slotWidthPx * 4}px` }}
                >
                  <div className="flex items-center justify-center gap-1 font-mono">
                    <span>{day.displayLabel}</span>
                    <span className="text-[10px] font-normal text-slate-500">({day.dayOfWeekZh})</span>
                  </div>
                </th>
              ))}
            </tr>

            {/* Row 2: Sub-headers: Left cols (Reactor, Category, Type, TTL Qty), and 4 colorful shift cols per day */}
            <tr>
              {/* Frozen Left Sub-Columns */}
              <th
                className="sticky left-0 z-40 bg-white border border-slate-400 px-2 py-1 text-center font-bold text-slate-900 text-xs"
                style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}
              >
                Reactor
              </th>
              <th
                className="sticky left-[90px] z-40 bg-white border border-slate-400 px-2 py-1 text-center font-bold text-slate-900 text-xs"
                style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}
              >
                Category
              </th>
              <th
                className="sticky left-[220px] z-40 bg-white border border-slate-400 px-2 py-1 text-center font-bold text-slate-900 text-xs"
                style={{ width: '65px', minWidth: '65px', maxWidth: '65px' }}
              >
                Type
              </th>
              <th
                className="sticky left-[285px] z-40 bg-white border border-slate-400 px-2 py-1 text-center font-bold text-slate-900 text-xs"
                style={{ width: '75px', minWidth: '75px', maxWidth: '75px' }}
              >
                TTL Qty
              </th>

              {/* 4 Shift Columns per day with Colorful Header and Vertical Text (matching Image 2) */}
              {daysList.map((day) => (
                <React.Fragment key={`shifts-subheaders-${day.dateStr}`}>
                  {shiftIntervalsConfig.map((slot) => (
                    <th
                      key={`slot-${day.dateStr}-${slot.code}`}
                      className={`relative border border-slate-400 p-0 text-center font-mono font-bold select-none overflow-hidden ${slot.bgClass}`}
                      style={{
                        width: `${slotWidthPx}px`,
                        minWidth: `${slotWidthPx}px`,
                        maxWidth: `${slotWidthPx}px`,
                        height: '78px'
                      }}
                      title={`${day.displayLabel} ${slot.label}`}
                    >
                      {restIntervals
                        .filter((interval) => {
                          const slotStart = day.startMin + slot.startHour * 60;
                          const slotEnd = day.startMin + slot.endHour * 60;
                          return interval.endMin > slotStart && interval.startMin < slotEnd;
                        })
                        .map((interval) => {
                          const slotStart = day.startMin + slot.startHour * 60;
                          const slotEnd = day.startMin + slot.endHour * 60;
                          const overlapStart = Math.max(interval.startMin, slotStart);
                          const overlapEnd = Math.min(interval.endMin, slotEnd);
                          return (
                            <div
                              key={`rest-header-${day.dateStr}-${slot.code}-${interval.startMin}`}
                              className="absolute inset-y-0 z-10 bg-slate-500/75 text-white flex items-center justify-center pointer-events-none"
                              style={{
                                left: `${((overlapStart - slotStart) / (slotEnd - slotStart)) * 100}%`,
                                width: `${((overlapEnd - overlapStart) / (slotEnd - slotStart)) * 100}%`
                              }}
                              title="生产休息时间"
                            >
                            </div>
                          );
                        })}
                      <div
                        className="w-full h-full flex items-center justify-center text-[9px] leading-none tracking-tighter"
                        style={{
                          writingMode: 'vertical-rl',
                          transform: 'rotate(180deg)'
                        }}
                      >
                        {slot.label}
                      </div>
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody>
            {filteredReactors.map((reactor, rIdx) => {
              const rBatches = batchesByReactor[reactor.reactor_id] || [];
              const meta = reactorDisplayMeta[reactor.reactor_id] || {
                code: String.fromCharCode(65 + rIdx),
                category: '',
                fullTitle: reactor.reactor_name,
                defaultModel: 'SIM-MODEL-A'
              };
              const totals = reactorTotalQuantities[reactor.reactor_id] || { planTons: 0, actualTons: 0 };

              return (
                <React.Fragment key={reactor.reactor_id}>
                  {/* ROW 1: PLAN (计划行) */}
                  <tr className="group/plan hover:bg-slate-50/50">
                    {/* Sticky Left: Reactor Alias & Code (rowspan 2) */}
                    <td
                      rowSpan={2}
                      className="sticky left-0 z-20 bg-white border border-slate-400 px-2 py-2 text-center align-middle font-bold text-slate-900 shadow-xs"
                      style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}
                    >
                      <div className="text-sm font-black text-slate-900">{meta.code}</div>
                      <div className="text-[10px] text-slate-500 font-medium font-mono truncate">{reactor.reactor_id}</div>
                      <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded mt-0.5 border border-indigo-100">
                        {reactor.rated_kg / 1000}t 釜
                      </div>
                    </td>

                    {/* Sticky Left: Category (rowspan 2) */}
                    <td
                      rowSpan={2}
                      className="sticky left-[90px] z-20 bg-white border border-slate-400 px-2 py-2 text-center align-middle font-semibold text-slate-800 text-xs shadow-xs"
                      style={{ width: '130px', minWidth: '130px', maxWidth: '130px' }}
                    >
                      {meta.category && <div className="font-bold text-slate-900 text-xs">{meta.category}</div>}
                      <div className="text-[10px] text-slate-500 truncate mt-0.5" title={reactor.reactor_name}>
                        {reactor.reactor_name}
                      </div>
                    </td>

                    {/* Sticky Left: Type = Plan */}
                    <td
                      className="sticky left-[220px] z-20 bg-white border border-slate-400 px-2 py-1 text-center align-middle font-bold text-slate-800 text-xs shadow-xs"
                      style={{ width: '65px', minWidth: '65px', maxWidth: '65px', height: '48px' }}
                    >
                      Plan
                    </td>

                    {/* Sticky Left: TTL Qty (Plan Total) */}
                    <td
                      className="sticky left-[285px] z-20 bg-white border border-slate-400 px-1.5 py-1 text-center align-middle font-mono font-bold text-slate-900 text-xs shadow-xs"
                      style={{ width: '75px', minWidth: '75px', maxWidth: '75px' }}
                    >
                      {totals.planTons > 0 ? `${totals.planTons}T` : '-'}
                    </td>

                    {/* TIMELINE GRID CONTAINER CELL FOR PLAN ROW (Spanning all time slot columns) */}
                    <td
                      colSpan={totalTimelineCols}
                      className="p-0 border border-slate-300 relative h-12 align-middle overflow-hidden bg-white"
                      style={{ width: `${totalTimelineWidthPx}px`, minWidth: `${totalTimelineWidthPx}px` }}
                    >
                      {/* Background Vertical Column Borders */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {daysList.map((day) => (
                          <div key={`bg-day-${day.dateStr}`} className="flex h-full border-r border-slate-400/80">
                            {shiftIntervalsConfig.map((slot) => (
                              <div
                                key={`bg-slot-${day.dateStr}-${slot.code}`}
                                className="h-full border-r border-slate-200/70"
                                style={{ width: `${slotWidthPx}px`, minWidth: `${slotWidthPx}px` }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Render Scheduled Batches & Preceding Cleaning Tasks */}
                      <div className="absolute inset-0 flex items-center">
                        {rBatches.map((batch, bIdx) => {
                          const bStartMin = parseDateToMinutes(batch.plan_start_time);
                          const bEndMin = parseDateToMinutes(batch.plan_end_time);

                          // Skip if out of window
                          if (bEndMin < timelineStartMin || bStartMin > timelineEndMin) {
                            return null;
                          }

                          const clampedStart = Math.max(timelineStartMin, bStartMin);
                          const clampedEnd = Math.min(timelineEndMin, bEndMin);

                          const offsetMinutes = clampedStart - timelineStartMin;
                          const durationMinutes = clampedEnd - clampedStart;

                          const leftPx = (offsetMinutes / totalWindowMinutes) * totalTimelineWidthPx;
                          const widthPx = Math.max(28, (durationMinutes / totalWindowMinutes) * totalTimelineWidthPx);

                          // Preceding wash task
                          const hasWash = (batch.preceding_wash_min || 0) > 0;
                          const washMin = batch.preceding_wash_min || 0;
                          const washStartMin = batch.preceding_wash_start
                            ? parseDateToMinutes(batch.preceding_wash_start)
                            : bStartMin - washMin;
                          const washEndMin = batch.preceding_wash_end
                            ? parseDateToMinutes(batch.preceding_wash_end)
                            : bStartMin;

                          const washOffset = washStartMin - timelineStartMin;
                          const washLeftPx = (washOffset / totalWindowMinutes) * totalTimelineWidthPx;
                          const washWidthPx = Math.max(24, ((washEndMin - washStartMin) / totalWindowMinutes) * totalTimelineWidthPx);

                          const isSelected = selectedBatchId === batch.batch_id;
                          const seqNum = bIdx + 1; // 1-, 2-, 3- sequence prefix matching Image 2!
                          const tonnageT = Math.round((Number(batch.batch_qty_kg) || 0) / 1000);

                          return (
                            <React.Fragment key={`batch-block-${batch.batch_id}`}>
                              {/* 1. Preceding Cleaning Block (Image 2 style: Green background with '清洗') */}
                              {hasWash && washEndMin > timelineStartMin && washStartMin < timelineEndMin && (
                                <div
                                  className="absolute top-1 bottom-1 bg-[#00b050] hover:bg-[#009b46] text-white border border-emerald-700 z-15 flex items-center justify-center px-1 font-bold text-[10px] cursor-pointer shadow-2xs transition-transform hover:scale-[1.02]"
                                  style={{
                                    left: `${Math.max(0, washLeftPx)}px`,
                                    width: `${washWidthPx}px`
                                  }}
                                  onClick={() => {
                                    onSelectBatch(batch);
                                    if (onOpenBatchModal) onOpenBatchModal(batch);
                                  }}
                                  title={`清洗工序: ${washMin}分钟 (${batch.preceding_wash_start || ''} ~ ${batch.preceding_wash_end || ''})`}
                                >
                                  <div className="flex items-center gap-0.5 truncate select-none">
                                    <span className="font-sans font-black text-[10px]">清洗</span>
                                    {washWidthPx >= 50 && (
                                      <span className="text-[9px] font-mono opacity-90 truncate ml-0.5">
                                        {batch.product_model.replace('SIM-MODEL-', '')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* 2. Main Production Batch Card (Image 2 style: Red sequence number prefix '1-LBC3406F17/20T') */}
                              <div
                                className={`absolute top-1 bottom-1 bg-white hover:bg-blue-50/50 border z-10 flex items-center justify-between px-1.5 text-xs cursor-pointer select-none transition-all shadow-2xs ${
                                  isSelected
                                    ? 'border-indigo-600 ring-2 ring-indigo-500 z-20'
                                    : 'border-slate-800 hover:border-blue-600'
                                }`}
                                style={{
                                  left: `${leftPx}px`,
                                  width: `${widthPx}px`
                                }}
                                onClick={() => {
                                  setSelectedBatchId(batch.batch_id);
                                  onSelectBatch(batch);
                                  const dev = calculateBatchDeviation(batch);
                                  if (dev.requiresReason && onOpenDeviationModal) {
                                    onOpenDeviationModal(batch);
                                  } else if (onOpenBatchModal) {
                                    onOpenBatchModal(batch);
                                  }
                                }}
                                title={`批次: ${batch.batch_id}\n型号: ${batch.product_model} (${batch.product_name})\n重量: ${batch.batch_qty_kg}kg (${tonnageT}T)\n时间: ${batch.plan_start_time} ~ ${batch.plan_end_time}\n客户: ${batch.customer_name}`}
                              >
                                {/* Left Content: Red Index Badge + Batch Code / Model + Tonnage */}
                                <div className="flex items-center gap-0.5 truncate font-mono text-[11px] font-bold">
                                  {/* Red Index Prefix (e.g. '1-', '2-', '3-' exactly like in Image 2) */}
                                  <span className="text-rose-600 font-black shrink-0 text-xs">
                                    {seqNum}-
                                  </span>
                                  <span className="text-slate-900 truncate">
                                    {batch.batch_id}
                                    {tonnageT > 0 ? `/${tonnageT}T` : ''}
                                  </span>
                                </div>

                                {/* Bottom Accent Color Stripe */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#00b050]" />
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </td>
                  </tr>

                  {/* ROW 2: ACTUAL (实际执行行 - Yellow background label matching Image 2) */}
                  <tr className="group/actual bg-slate-50/30">
                    {/* Sticky Left: Type = Actual (VIVID YELLOW BACKGROUND matching Image 2) */}
                    <td
                      className="sticky left-[220px] z-20 bg-[#fef08a] border border-slate-400 px-2 py-1 text-center align-middle font-black text-slate-900 text-xs shadow-xs"
                      style={{ width: '65px', minWidth: '65px', maxWidth: '65px', height: '40px' }}
                    >
                      Actual
                    </td>

                    {/* Sticky Left: TTL Qty (Actual Total) */}
                    <td
                      className="sticky left-[285px] z-20 bg-white border border-slate-400 px-1.5 py-1 text-center align-middle font-mono font-bold text-emerald-700 text-xs shadow-xs"
                      style={{ width: '75px', minWidth: '75px', maxWidth: '75px' }}
                    >
                      {totals.actualTons > 0 ? `${totals.actualTons}T` : '-'}
                    </td>

                    {/* TIMELINE GRID CONTAINER CELL FOR ACTUAL ROW */}
                    <td
                      colSpan={totalTimelineCols}
                      className="p-0 border border-slate-300 relative h-10 align-middle overflow-hidden bg-slate-50/20"
                      style={{ width: `${totalTimelineWidthPx}px`, minWidth: `${totalTimelineWidthPx}px` }}
                    >
                      {/* Background Vertical Grid Lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {daysList.map((day) => (
                          <div key={`actual-bg-day-${day.dateStr}`} className="flex h-full border-r border-slate-400/80">
                            {shiftIntervalsConfig.map((slot) => (
                              <div
                                key={`actual-bg-slot-${day.dateStr}-${slot.code}`}
                                className="h-full border-r border-slate-200/60"
                                style={{ width: `${slotWidthPx}px`, minWidth: `${slotWidthPx}px` }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Actual Execution Progress Bars */}
                      <div className="absolute inset-0 flex items-center">
                        {rBatches.map((batch, bIdx) => {
                          const bStartMin = parseDateToMinutes(batch.actual_start_time || batch.plan_start_time);
                          const bEndMin = parseDateToMinutes(batch.actual_end_time || batch.plan_end_time);

                          if (bEndMin < timelineStartMin || bStartMin > timelineEndMin) {
                            return null;
                          }

                          const clampedStart = Math.max(timelineStartMin, bStartMin);
                          const clampedEnd = Math.min(timelineEndMin, bEndMin);

                          const offsetMinutes = clampedStart - timelineStartMin;
                          const durationMinutes = clampedEnd - clampedStart;

                          const leftPx = (offsetMinutes / totalWindowMinutes) * totalTimelineWidthPx;
                          const widthPx = Math.max(24, (durationMinutes / totalWindowMinutes) * totalTimelineWidthPx);

                          const isCompleted = batch.step_status === 'FINISHED' || Boolean(batch.actual_end_time);
                          const isRunning = batch.step_status === 'PROCESSING' || (batch.is_actual && !batch.actual_end_time);
                          const progressPercent = isCompleted
                            ? 100
                            : batch.current_step > 1
                              ? Math.min(99, Math.round(((batch.current_step - 1) / 5) * 100))
                              : 0;

                          return (
                            <div
                              key={`actual-block-${batch.batch_id}`}
                              className={`absolute top-1 bottom-1 rounded-xs flex items-center justify-between px-1 text-[10px] font-mono font-bold cursor-pointer border ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : isRunning
                                  ? 'bg-amber-400 text-slate-900 border-amber-500 animate-pulse'
                                  : 'bg-slate-200 text-slate-600 border-slate-300'
                              }`}
                              style={{
                                left: `${leftPx}px`,
                                width: `${widthPx}px`
                              }}
                              onClick={() => {
                                onSelectBatch(batch);
                                if (onOpenBatchModal) onOpenBatchModal(batch);
                              }}
                              title={`[实际执行] ${batch.batch_id}: ${isCompleted ? '已完成 100%' : isRunning ? `生产中 ${progressPercent}%` : '待执行'}`}
                            >
                              <span className="truncate">
                                {isCompleted ? `✓ ${batch.batch_id}` : isRunning ? `▶ ${batch.batch_id}` : batch.batch_id}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. PROMINENT BOTTOM HORIZONTAL SCROLLBAR STATUS STRIP (横向滚筒条提示与拖动说明) */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>{lang === 'zh' ? '横向滚筒条就绪:' : lang === 'en' ? 'Scroll Ready:' : 'Skrol Sedia:'}</span>
          </span>
          <span>{lang === 'zh' ? '按住上方或底部的滚动条左右滑动，或按住键盘 Shift + 鼠标滚轮即可快速浏览全周期计划。' : lang === 'en' ? 'Drag scrollbar or hold Shift + Wheel to scroll across horizon.' : 'Seret bar skrol atau tekan Shift + Roda untuk skrol mendatar.'}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span>{lang === 'zh' ? `总列数: ${totalTimelineCols} 列 (${daysCount} 天)` : lang === 'en' ? `Cols: ${totalTimelineCols} (${daysCount} d)` : `Lajur: ${totalTimelineCols} (${daysCount} h)`}</span>
          <span>{lang === 'zh' ? `总画布宽: ${totalTimelineWidthPx} px` : lang === 'en' ? `Width: ${totalTimelineWidthPx} px` : `Lebar: ${totalTimelineWidthPx} px`}</span>
          <span className="text-indigo-600 font-bold">{lang === 'zh' ? `当前位置: ${Math.round(scrollPercent)}%` : lang === 'en' ? `Pos: ${Math.round(scrollPercent)}%` : `Kedudukan: ${Math.round(scrollPercent)}%`}</span>
        </div>
      </div>
    </div>
  );
};
