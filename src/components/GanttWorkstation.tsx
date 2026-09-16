import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  Sparkles,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  Info,
  Droplet,
  MoveHorizontal,
  ChevronRight,
  AlertTriangle,
  Lock,
  ExternalLink,
  Layers,
  Wrench,
  RotateCcw,
  Sun,
  Moon,
  Sunset,
  X,
  Building2,
  Factory,
  Eye,
  EyeOff,
  Coffee,
  Calendar as CalendarIcon,
  ChevronLeft,
  Search,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Sliders,
  Grid,
  TrendingUp,
  Award,
  Zap,
  Check,
  Flame,
  Activity,
  BarChart3,
  FileSpreadsheet,
  Edit3,
  ShieldAlert,
  HelpCircle,
  Compass,
  Minimize2
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
  PROCESS_NODES,
  DeviationCategory,
  DEVIATION_CATEGORIES,
  DeviationType,
  LanguageCode
} from '../types/aps';
import {
  validateReactorRestriction,
  parseDateToMinutes,
  formatMinutesToDate,
  getBatchWorkingSegments,
  DEFAULT_SHIFTS,
  calculateBatchDeviation,
  exportPlanDeviationsToCsv,
  getShiftDurationHours,
  getShiftBreakWindow,
  getDailyGrossWorkingHours,
  getDailyBreakMinutes,
  getDailyNetWorkingHours,
  calculateReactorDailyCapacityKg
} from '../utils/apsEngine';
import { getTranslations } from '../i18n';
import { DeviationReasonModal } from './DeviationReasonModal';
import { PlanDeviationMatrix } from './PlanDeviationMatrix';
import { IndustrialGanttBoard } from './IndustrialGanttBoard';

export type TimelineViewScope = 'DAY' | 'WEEK' | 'MONTH';
export type HourGridResolution = '1H' | '2H' | '4H' | '8H';

interface GanttWorkstationProps {
  reactors: Reactor[];
  batches: BatchTask[];
  restrictions: ReactorRestriction[];
  washRules: WashMatrixRule[];
  orders: ProductionOrder[];
  shifts?: ShiftDef[];
  workshops?: WorkshopDef[];
  lang?: LanguageCode;
  onUpdateShifts?: (shifts: ShiftDef[]) => void;
  onAutoSchedule: (strategy: SchedulingStrategy) => void;
  onUpdateBatchReactor: (batchId: string, targetReactorId: string) => { success: boolean; message?: string };
  onSelectBatch: (batch: BatchTask) => void;
  unassignedIssues?: string[];
  currentWorkshopId?: WorkshopId;
  onWorkshopChange?: (workshopId: WorkshopId) => void;
  onUpdateBatches?: (batches: BatchTask[]) => void;
}

export const GanttWorkstation: React.FC<GanttWorkstationProps> = ({
  reactors,
  batches,
  restrictions,
  washRules,
  orders,
  shifts = DEFAULT_SHIFTS,
  workshops = WORKSHOP_DEFINITIONS,
  lang = 'zh',
  onUpdateShifts,
  onAutoSchedule,
  onUpdateBatchReactor,
  onSelectBatch,
  unassignedIssues = [],
  currentWorkshopId = 'ALL',
  onWorkshopChange,
  onUpdateBatches
}) => {
  const t = useMemo(() => getTranslations(lang as LanguageCode), [lang]);

  // 1. Core State
  const [activeSubTab, setActiveSubTab] = useState<'industrial_board' | 'gantt' | 'deviation_matrix'>('industrial_board');
  const [viewScope, setViewScope] = useState<TimelineViewScope>('WEEK');
  const [hourGridRes, setHourGridRes] = useState<HourGridResolution>('2H');
  const [scaleFeedbackToast, setScaleFeedbackToast] = useState<string | null>(null);

  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-09-14'); // Base date
  const [selectedStrategy, setSelectedStrategy] = useState<SchedulingStrategy>('SETUP_MINIMIZE');
  const [activeReactorFilter, setActiveReactorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredReactorCardId, setHoveredReactorCardId] = useState<string | null>(null);

  // Zoom Engine: 100% corresponds to 1/5th of original 72px = 14.4px per 2H cell (fits 7-day week on one screen)
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Zoom Controls
  const handleZoomIn = useCallback(() => {
    setZoomPercent((prev) => {
      const next = Math.min(350, prev + 25);
      setScaleFeedbackToast(`甘特图已放大至 ${next}% (${((14.4 * next) / 100).toFixed(1)}px/2H格)`);
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomPercent((prev) => {
      const next = Math.max(20, prev - 20);
      setScaleFeedbackToast(`甘特图已缩小至 ${next}% (${((14.4 * next) / 100).toFixed(1)}px/2H格)`);
      return next;
    });
  }, []);

  const handleZoomFitWeek = useCallback(() => {
    setViewScope('WEEK');
    setHourGridRes('2H');
    setZoomPercent(100);
    setScaleFeedbackToast('已设定为【周计划免滚全景】(100% · 14.4px/2H · 7天排产一屏看全)');
  }, []);

  const handleZoomFitMonth = useCallback(() => {
    setViewScope('MONTH');
    setHourGridRes('8H');
    setZoomPercent(30);
    setScaleFeedbackToast('已设定为【月计划免滚全景】(30% · 30天全月总览一屏看全)');
  }, []);

  const handleZoomDetail = useCallback(() => {
    setZoomPercent(200);
    setScaleFeedbackToast('已设定为【高精工时放大】(200% · 28.8px/2H)');
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomPercent(100);
    setScaleFeedbackToast('已恢复为标准刻度 (100% · 14.4px/2H)');
  }, []);

  const handleSwitchViewScope = useCallback((scope: TimelineViewScope) => {
    setViewScope(scope);
    if (scope === 'MONTH') {
      setHourGridRes('8H');
      setZoomPercent(30);
      setScaleFeedbackToast('已切换至月计划 (30天长周期，已自动缩放至全景无横滚)');
    } else if (scope === 'WEEK') {
      setHourGridRes('2H');
      setZoomPercent(100);
      setScaleFeedbackToast('已切换至周计划 (7天，2H格宽已缩小至1/5，整周排产一览无余)');
    } else if (scope === 'DAY') {
      setHourGridRes('1H');
      setZoomPercent(150);
      setScaleFeedbackToast('已切换至日计划 (24小时精细排产)');
    }
  }, []);

  // Modals
  const [activeBatchModal, setActiveBatchModal] = useState<BatchTask | null>(null);
  const [activeDeviationModalBatch, setActiveDeviationModalBatch] = useState<BatchTask | null>(null);
  const [manualMoveWarning, setManualMoveWarning] = useState<string | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: ESC for fullscreen, + / - for zoom, 0 for reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
      if (e.key === '=' || e.key === '+') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          e.preventDefault();
          handleZoomIn();
        }
      }
      if (e.key === '-' || e.key === '_') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          e.preventDefault();
          handleZoomOut();
        }
      }
      if (e.key === '0') {
        if (!['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
          e.preventDefault();
          handleZoomReset();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleZoomIn, handleZoomOut, handleZoomReset]);

  // 2. Timeline Window Computation
  const selectedBaseMin = useMemo(() => {
    return parseDateToMinutes(`${selectedDateStr} 00:00`);
  }, [selectedDateStr]);

  // Window bounds based on viewScope
  const { timelineStartMin, timelineEndMin, totalWindowMinutes, daysList } = useMemo(() => {
    let startMin = selectedBaseMin;
    let daysCount = 7; // default WEEK

    if (viewScope === 'DAY') {
      daysCount = 1;
      startMin = selectedBaseMin;
    } else if (viewScope === 'WEEK') {
      daysCount = 7;
      startMin = selectedBaseMin;
    } else if (viewScope === 'MONTH') {
      daysCount = 30;
      const [year, month] = selectedDateStr.split('-');
      startMin = parseDateToMinutes(`${year}-${month}-01 00:00`);
    }

    const endMin = startMin + daysCount * 24 * 60;
    const totalMins = daysCount * 24 * 60;

    const list: {
      dateStr: string;
      dateShort: string;
      dayOfWeek: string;
      dayIndex: number;
      startMin: number;
      endMin: number;
      isToday: boolean;
    }[] = [];

    const weekDays = lang === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : lang === 'ms'
      ? ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab']
      : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    for (let i = 0; i < daysCount; i++) {
      const dMin = startMin + i * 1440;
      const dObj = new Date(dMin * 1000 * 60);
      const YYYY = dObj.getFullYear();
      const MM = String(dObj.getMonth() + 1).padStart(2, '0');
      const DD = String(dObj.getDate()).padStart(2, '0');
      const dateStr = `${YYYY}-${MM}-${DD}`;
      const isToday = dateStr === '2026-09-14';

      list.push({
        dateStr,
        dateShort: `${MM}-${DD}`,
        dayOfWeek: weekDays[dObj.getDay()],
        dayIndex: i,
        startMin: dMin,
        endMin: dMin + 1440,
        isToday
      });
    }

    return {
      timelineStartMin: startMin,
      timelineEndMin: endMin,
      totalWindowMinutes: totalMins,
      daysList: list
    };
  }, [selectedBaseMin, selectedDateStr, viewScope, lang]);

  // Resolution in minutes per column cell
  const gridStepMinutes = useMemo(() => {
    switch (hourGridRes) {
      case '1H':
        return 60;
      case '2H':
        return 120;
      case '4H':
        return 240;
      case '8H':
        return 480;
      default:
        return 120;
    }
  }, [hourGridRes]);

  // Dynamic pixel width calculation for physical grid zooming & responsive horizontal scroll
  // Baseline: 2H cell width reduced to 1/5th of original (72px / 5 = 14.4px)
  const { columnPixelWidth, totalGridWidth } = useMemo(() => {
    const totalSteps = Math.ceil(totalWindowMinutes / gridStepMinutes);

    // 1/5th baseline scale (at 100% zoom): 2H = 14.4px, 1H = 7.2px, 4H = 28.8px, 8H = 57.6px
    let basePx = 14.4;
    if (hourGridRes === '1H') {
      basePx = 7.2;
    } else if (hourGridRes === '2H') {
      basePx = 14.4;
    } else if (hourGridRes === '4H') {
      basePx = 28.8;
    } else if (hourGridRes === '8H') {
      basePx = 57.6;
    }

    let colPx = (basePx * zoomPercent) / 100;
    if (colPx < 2) colPx = 2;

    let computedWidth = Math.round(totalSteps * colPx);

    // In DAY view (24h), ensure it fills adequately if width is small
    if (viewScope === 'DAY' && computedWidth < 540) {
      computedWidth = 540;
      colPx = computedWidth / totalSteps;
    }

    return {
      columnPixelWidth: Number(colPx.toFixed(2)),
      totalGridWidth: computedWidth
    };
  }, [totalWindowMinutes, gridStepMinutes, hourGridRes, viewScope, zoomPercent]);

  // Hourly grid columns definition
  const timeGridColumns = useMemo(() => {
    const cols: {
      id: string;
      label: string;
      fullTimeStr: string;
      startMin: number;
      offsetPercent: number;
      widthPercent: number;
      isShiftBoundary: boolean;
      shiftCode?: string;
      isNewDay: boolean;
    }[] = [];

    const totalSteps = Math.ceil(totalWindowMinutes / gridStepMinutes);

    for (let i = 0; i < totalSteps; i++) {
      const colStartMin = timelineStartMin + i * gridStepMinutes;
      const dObj = new Date(colStartMin * 1000 * 60);
      const HH = String(dObj.getHours()).padStart(2, '0');
      const mm = String(dObj.getMinutes()).padStart(2, '0');
      const timeLabel = `${HH}:${mm}`;
      const isNewDay = dObj.getHours() === 0 && dObj.getMinutes() === 0;

      // 依据 shifts 配置动态识别班次分界线与当前所属班次 (彻底消除硬编码 8/16/24 限制)
      const timeStr = `${HH}:${mm}`;
      const dayMinute = dObj.getHours() * 60 + dObj.getMinutes();
      const isShiftBoundary = shifts.some((s) => {
        const sTime = s.startTime || '08:00';
        const eTime = s.endTime || '16:00';
        return timeStr === sTime || timeStr === eTime || (timeStr === '00:00' && (eTime === '24:00' || eTime === '00:00'));
      });

      const matchedShift = shifts.find((s) => {
        const [sh, sm] = (s.startTime || '08:00').split(':').map(Number);
        let [eh, em] = (s.endTime || '16:00').split(':').map(Number);
        const sMin = (sh || 0) * 60 + (sm || 0);
        let eMin = (eh || 0) * 60 + (em || 0);
        if ((s.endTime === '24:00' || s.endTime === '00:00') && eMin === 0) eMin = 1440;
        if (sMin < eMin) {
          return dayMinute >= sMin && dayMinute < eMin;
        } else {
          return dayMinute >= sMin || dayMinute < eMin;
        }
      });
      const shiftCode = matchedShift?.code;

      const offsetPercent = ((colStartMin - timelineStartMin) / totalWindowMinutes) * 100;
      const widthPercent = (gridStepMinutes / totalWindowMinutes) * 100;

      cols.push({
        id: `grid-col-${i}`,
        label: timeLabel,
        fullTimeStr: formatMinutesToDate(colStartMin),
        startMin: colStartMin,
        offsetPercent: Math.max(0, Math.min(100, offsetPercent)),
        widthPercent: Math.max(0, Math.min(100 - offsetPercent, widthPercent)),
        isShiftBoundary,
        shiftCode,
        isNewDay
      });
    }

    return cols;
  }, [timelineStartMin, totalWindowMinutes, gridStepMinutes]);

  // Non-working (inactive shift) intervals across the timeline
  const inactiveShiftIntervals = useMemo(() => {
    const intervals: {
      id: string;
      shiftId: string;
      shiftName: string;
      startMin: number;
      endMin: number;
      offsetPercent: number;
      widthPercent: number;
    }[] = [];

    const inactiveShifts = shifts.filter((s) => !s.isActive);
    if (inactiveShifts.length === 0) return intervals;

    daysList.forEach((day) => {
      inactiveShifts.forEach((s) => {
        const [sH, sM] = (s.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = (s.endTime || '08:00').split(':').map(Number);

        let sStartMin = day.startMin + sH * 60 + sM;
        let sEndMin = day.startMin + eH * 60 + eM;

        if (sEndMin <= sStartMin) {
          sEndMin += 1440;
        }

        const visibleStart = Math.max(timelineStartMin, sStartMin);
        const visibleEnd = Math.min(timelineEndMin, sEndMin);

        if (visibleStart < visibleEnd) {
          const offsetPercent = ((visibleStart - timelineStartMin) / totalWindowMinutes) * 100;
          const widthPercent = ((visibleEnd - visibleStart) / totalWindowMinutes) * 100;

          intervals.push({
            id: `inactive-${day.dateStr}-${s.id}`,
            shiftId: s.id,
            shiftName: s.name,
            startMin: visibleStart,
            endMin: visibleEnd,
            offsetPercent: Math.max(0, Math.min(100, offsetPercent)),
            widthPercent: Math.max(0, Math.min(100 - offsetPercent, widthPercent))
          });
        }
      });
    });

    return intervals;
  }, [shifts, daysList, timelineStartMin, timelineEndMin, totalWindowMinutes]);

  // 产线休息时间窗 intervals (午餐/晚餐/夜餐等工间休息，已启用的开工班次内)
  const shiftBreakIntervals = useMemo(() => {
    const intervals: {
      id: string;
      shiftId: string;
      shiftName: string;
      breakName: string;
      breakMinutes: number;
      startMin: number;
      endMin: number;
      offsetPercent: number;
      widthPercent: number;
    }[] = [];

    const activeShifts = shifts.filter((s) => s.isActive && (s.breakMinutes || 0) > 0);
    if (activeShifts.length === 0) return intervals;

    daysList.forEach((day) => {
      activeShifts.forEach((s) => {
        const breakWin = getShiftBreakWindow(s);
        if (!breakWin) return;

        let bStartMin = day.startMin + breakWin.startMin;
        let bEndMin = day.startMin + breakWin.endMin;

        const visibleStart = Math.max(timelineStartMin, bStartMin);
        const visibleEnd = Math.min(timelineEndMin, bEndMin);

        if (visibleStart < visibleEnd) {
          const offsetPercent = ((visibleStart - timelineStartMin) / totalWindowMinutes) * 100;
          const widthPercent = ((visibleEnd - visibleStart) / totalWindowMinutes) * 100;

          intervals.push({
            id: `break-${day.dateStr}-${s.id}`,
            shiftId: s.id,
            shiftName: s.name,
            breakName: s.breakName || '产线休息',
            breakMinutes: s.breakMinutes,
            startMin: visibleStart,
            endMin: visibleEnd,
            offsetPercent: Math.max(0, Math.min(100, offsetPercent)),
            widthPercent: Math.max(0, Math.min(100 - offsetPercent, widthPercent))
          });
        }
      });
    });

    return intervals;
  }, [shifts, daysList, timelineStartMin, timelineEndMin, totalWindowMinutes]);

  // 依据排班班次配置动态核算每日毛工时、休息扣减、净作业工时及各模式开工时长
  const shiftMetrics = useMemo(() => {
    const activeShifts = shifts.filter((s) => s.isActive);
    const dailyGrossHours = getDailyGrossWorkingHours(shifts);
    const dailyBreakMinutes = getDailyBreakMinutes(shifts);
    const dailyNetHours = getDailyNetWorkingHours(shifts);
    const dailyRestHours = Math.max(0, Number((24 - dailyNetHours).toFixed(1)));

    // 单班、双班、三班切换模式的动态核算 (完全依据实际班次定义，无硬编码8/16/24)
    const s1 = shifts[0];
    const s2 = shifts[1];
    const s1Gross = s1 ? getShiftDurationHours(s1) : 0;
    const s1Net = s1 ? Math.max(0, Number((s1Gross - (s1.breakMinutes || 0) / 60).toFixed(1))) : 0;

    const s2Gross = s1Gross + (s2 ? getShiftDurationHours(s2) : 0);
    const s2Breaks = (s1?.breakMinutes || 0) + (s2?.breakMinutes || 0);
    const s2Net = Math.max(0, Number((s2Gross - s2Breaks / 60).toFixed(1)));

    const s3Gross = shifts.reduce((sum, s) => sum + getShiftDurationHours(s), 0);
    const s3Breaks = shifts.reduce((sum, s) => sum + (s.breakMinutes || 0), 0);
    const s3Net = Math.max(0, Number((s3Gross - s3Breaks / 60).toFixed(1)));

    return {
      activeShifts,
      activeShiftCount: activeShifts.length,
      dailyGrossHours,
      dailyBreakMinutes,
      dailyNetHours,
      dailyRestHours,
      singleHours: s1Gross,
      singleNetHours: s1Net,
      doubleHours: s2Gross,
      doubleNetHours: s2Net,
      tripleHours: s3Gross,
      tripleNetHours: s3Net
    };
  }, [shifts]);

  const shiftDurationInfo = shiftMetrics;

  // Live Current Time Marker: 2026-09-14 14:30
  const currentTimeMin = useMemo(() => parseDateToMinutes('2026-09-14 14:30'), []);
  const isCurrentTimeInWindow = currentTimeMin >= timelineStartMin && currentTimeMin <= timelineEndMin;
  const currentTimePercent = ((currentTimeMin - timelineStartMin) / totalWindowMinutes) * 100;

  // 24-Hour Freeze Line: 2026-09-15 08:00
  const freezeLineMin = useMemo(() => parseDateToMinutes('2026-09-15 08:00'), []);
  const isFreezeLineInWindow = freezeLineMin >= timelineStartMin && freezeLineMin <= timelineEndMin;
  const freezeLinePercent = ((freezeLineMin - timelineStartMin) / totalWindowMinutes) * 100;

  // 3. Workshop Filtering with safe fallbacks
  const workshopReactors = useMemo(() => {
    if (!reactors || reactors.length === 0) return [];
    if (currentWorkshopId === 'ALL') return reactors;
    const filtered = reactors.filter((r) => {
      const wId = r.workshop_id || (r.reactor_id === 'R-6000-02' || r.reactor_id === 'R-6000-03' ? 'WS-02' : 'WS-01');
      return wId === currentWorkshopId;
    });
    // If filtering yields nothing (e.g. customized workshop ID not found), safely fallback to all reactors
    return filtered.length > 0 ? filtered : reactors;
  }, [reactors, currentWorkshopId]);

  const filteredReactors = useMemo(() => {
    if (activeReactorFilter === 'ALL') return workshopReactors;
    const byId = workshopReactors.filter((r) => r.reactor_id === activeReactorFilter);
    return byId.length > 0 ? byId : workshopReactors;
  }, [workshopReactors, activeReactorFilter]);

  const workshopBatches = useMemo(() => {
    if (!batches || batches.length === 0) return [];
    return batches.filter((b) => {
      const bWorkshop = b.workshop_id || (b.assigned_reactor_id === 'R-6000-02' || b.assigned_reactor_id === 'R-6000-03' ? 'WS-02' : 'WS-01');
      if (currentWorkshopId !== 'ALL' && bWorkshop !== currentWorkshopId) {
        // If current workshop has no match, don't completely suppress if user is viewing that reactor
        if (!workshopReactors.some(r => r.reactor_id === b.assigned_reactor_id)) {
          return false;
        }
      }
      if (activeReactorFilter !== 'ALL' && b.assigned_reactor_id !== activeReactorFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBatch = b.batch_id.toLowerCase().includes(q);
        const matchModel = b.product_model.toLowerCase().includes(q);
        const matchOrder = b.order_no.toLowerCase().includes(q);
        const matchCustomer = b.customer_name.toLowerCase().includes(q);
        const matchReason = (b.deviation_reason || '').toLowerCase().includes(q);
        if (!matchBatch && !matchModel && !matchOrder && !matchCustomer && !matchReason) return false;
      }
      return true;
    });
  }, [batches, currentWorkshopId, activeReactorFilter, searchQuery, workshopReactors]);

  // 4. Deviation & Anomaly Detection Summary for Banner
  const pendingDeviationBatches = useMemo(() => {
    return batches.filter((b) => {
      const dev = calculateBatchDeviation(b);
      return dev.requiresReason;
    });
  }, [batches]);

  const currentWorkshopDef = workshops.find((w) => w.id === currentWorkshopId);
  const activeShiftCount = shifts.filter((s) => s.isActive).length;
  const isNightShiftOff = shifts.some((s) => s.code === 'NIGHT' && !s.isActive);
  const isSingleShift = activeShiftCount === 1;

  // 5. Shift Mode Handler
  const handleQuickSetShiftMode = (mode: 'SINGLE' | 'DOUBLE' | 'TRIPLE') => {
    if (!onUpdateShifts) return;
    if (mode === 'SINGLE') {
      onUpdateShifts(shifts.map((s, idx) => ({ ...s, isActive: idx === 0 })));
    } else if (mode === 'DOUBLE') {
      onUpdateShifts(shifts.map((s, idx) => ({ ...s, isActive: idx < 2 })));
    } else {
      onUpdateShifts(shifts.map((s) => ({ ...s, isActive: true })));
    }
  };

  // 6. Navigation Controls
  const handlePrevPeriod = () => {
    if (viewScope === 'DAY') {
      const prevMin = selectedBaseMin - 1440;
      setSelectedDateStr(formatMinutesToDate(prevMin).split(' ')[0]);
    } else if (viewScope === 'WEEK') {
      const prevMin = selectedBaseMin - 7 * 1440;
      setSelectedDateStr(formatMinutesToDate(prevMin).split(' ')[0]);
    } else {
      const [y, m] = selectedDateStr.split('-').map(Number);
      const prevMonth = m === 1 ? 12 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;
      setSelectedDateStr(`${prevYear}-${String(prevMonth).padStart(2, '0')}-01`);
    }
  };

  const handleNextPeriod = () => {
    if (viewScope === 'DAY') {
      const nextMin = selectedBaseMin + 1440;
      setSelectedDateStr(formatMinutesToDate(nextMin).split(' ')[0]);
    } else if (viewScope === 'WEEK') {
      const nextMin = selectedBaseMin + 7 * 1440;
      setSelectedDateStr(formatMinutesToDate(nextMin).split(' ')[0]);
    } else {
      const [y, m] = selectedDateStr.split('-').map(Number);
      const nextMonth = m === 12 ? 1 : m + 1;
      const nextYear = m === 12 ? y + 1 : y;
      setSelectedDateStr(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01`);
    }
  };

  const scrollToTargetTime = useCallback((targetDateTimeStr: string = '2026-09-14 08:00') => {
    if (!timelineContainerRef.current) return;
    const targetMin = parseDateToMinutes(targetDateTimeStr);
    if (targetMin >= timelineStartMin && targetMin <= timelineEndMin) {
      const offsetPercent = (targetMin - timelineStartMin) / totalWindowMinutes;
      const targetPx = offsetPercent * totalGridWidth;
      timelineContainerRef.current.scrollTo({
        left: Math.max(0, targetPx - 60),
        behavior: 'smooth'
      });
    } else {
      setSelectedDateStr(targetDateTimeStr.split(' ')[0]);
    }
  }, [timelineStartMin, timelineEndMin, totalWindowMinutes, totalGridWidth]);

  // Auto-scroll on mount or viewScope switch to focus on today's active production
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToTargetTime('2026-09-14 08:00');
    }, 150);
    return () => clearTimeout(timer);
  }, [viewScope, scrollToTargetTime]);

  const handleResetToday = () => {
    setSelectedDateStr('2026-09-14');
    setTimeout(() => {
      scrollToTargetTime('2026-09-14 08:00');
    }, 100);
  };

  // 7. Grid Resolution Switcher with Interactive Toast
  const handleSwitchHourGridRes = (res: HourGridResolution) => {
    setHourGridRes(res);
    setScaleFeedbackToast(`已切换工时泳道刻度为 [${res}/格] · 柱宽与时间网格已重标定`);
    setTimeout(() => {
      setScaleFeedbackToast(null);
    }, 2800);
  };

  // 8. Manual Reactor Reassignment
  const handleAttemptMoveReactor = (batch: BatchTask, targetReactorId: string) => {
    const result = onUpdateBatchReactor(batch.batch_id, targetReactorId);
    if (!result.success) {
      setManualMoveWarning(result.message || '违规排产操作已拦截');
    } else {
      setManualMoveWarning(null);
      if (activeBatchModal) {
        setActiveBatchModal({ ...batch, assigned_reactor_id: targetReactorId });
      }
    }
  };

  // 9. Save Deviation Reason Handler
  const handleSaveDeviationReason = (batchId: string, updates: any) => {
    if (onUpdateBatches) {
      const updated = batches.map((b) => {
        if (b.batch_id === batchId) {
          return { ...b, ...updates };
        }
        return b;
      });
      onUpdateBatches(updated);
    }
    setActiveDeviationModalBatch(null);
  };

  // 10. Simulate MES Actual Report Handler
  const handleSimulateMesActuals = () => {
    if (!onUpdateBatches) return;
    // Find SIM-B007 or SIM-B006 to simulate delay
    const targetBatch = batches.find((b) => b.batch_id === 'SIM-B006') || batches[0];
    if (!targetBatch) return;

    const updated = batches.map((b) => {
      if (b.batch_id === targetBatch.batch_id) {
        return {
          ...b,
          actual_start_time: '2026-09-14 18:45', // Delayed by 75m
          deviation_type: 'DELAY_START' as DeviationType,
          deviation_minutes: 75,
          is_reason_submitted: false,
          deviation_reason: undefined,
          reported_at: '2026-09-14 18:50'
        };
      }
      return b;
    });

    onUpdateBatches(updated);
    setActiveDeviationModalBatch({
      ...targetBatch,
      actual_start_time: '2026-09-14 18:45',
      deviation_type: 'DELAY_START',
      deviation_minutes: 75,
      is_reason_submitted: false
    });
  };

  // 11. KPI Aggregation for the current view
  const kpiStats = useMemo(() => {
    const totalBatchesCount = workshopBatches.length;
    const totalKg = workshopBatches.reduce((sum, b) => sum + (b.batch_qty_kg || 0), 0);
    const totalTons = (totalKg / 1000).toFixed(1);
    const zeroWashBatches = workshopBatches.filter((b) => b.preceding_wash_min === 0).length;
    const washBatches = workshopBatches.filter((b) => (b.preceding_wash_min || 0) > 0);
    const totalWashHours = (washBatches.reduce((sum, b) => sum + (b.preceding_wash_min || 0), 0) / 60).toFixed(1);
    const hoursSavedByZeroWash = (zeroWashBatches * 2.0).toFixed(1);

    const activeReactorsCount = filteredReactors.length || 1;
    const totalDays = daysList.length || 1;
    // 依据已启用班次的每日净工作时长，动态计算时间窗内反应釜额定有效产能工时 (彻底消除硬编码 8/16/24/7.5)
    const totalAvailHours = Number((activeReactorsCount * totalDays * shiftMetrics.dailyNetHours).toFixed(1));

    // 动态统计当前时间窗内所有排产批次的纯生产净工时
    const totalProdHours = Number(
      workshopBatches.reduce((acc, b) => {
        const bStart = parseDateToMinutes(b.plan_start_time);
        const bEnd = parseDateToMinutes(b.plan_end_time);
        const segments = getBatchWorkingSegments(bStart, bEnd, shifts);
        const workMins = segments.reduce((sum, seg) => sum + seg.workMinutes, 0);
        return acc + (workMins > 0 ? workMins : (b.plan_duration_min || 0)) / 60;
      }, 0).toFixed(1)
    );

    // 综合负荷率 = (生产纯工时 + CIP清洗工时) / 额定有效产能净工时
    const totalOccupiedWithWash = Number((totalProdHours + Number(totalWashHours)).toFixed(1));
    const loadRatePercent =
      totalAvailHours > 0
        ? Math.min(100, Math.round((totalOccupiedWithWash / totalAvailHours) * 100))
        : 0;

    return {
      totalBatchesCount,
      totalTons,
      zeroWashBatches,
      washBatchesCount: washBatches.length,
      totalWashHours,
      hoursSavedByZeroWash,
      loadRatePercent,
      totalAvailHours,
      totalProdHours,
      dailyNetHours: shiftMetrics.dailyNetHours,
      dailyBreakMinutes: shiftMetrics.dailyBreakMinutes,
      dailyGrossHours: shiftMetrics.dailyGrossHours,
      dailyRestHours: shiftMetrics.dailyRestHours
    };
  }, [workshopBatches, filteredReactors, daysList, shiftMetrics, shifts]);

  // Detailed Per-Reactor Statistics (Utilization Rate, Expected Wash Time, Task Count)
  const reactorMetricsMap = useMemo(() => {
    const map: Record<string, {
      batchesCount: number;
      totalTons: string;
      prodHours: string;
      washHours: string;
      washMin: number;
      washCount: number;
      zeroWashCount: number;
      totalOccupiedHours: string;
      utilPercent: number;
      prodPercent: number;
      washPercent: number;
      idleHours: string;
      activeBatch?: BatchTask;
      nextBatch?: BatchTask;
      isOverloaded: boolean;
    }> = {};

    reactors.forEach((reactor) => {
      const rBatches = workshopBatches.filter((b) => b.assigned_reactor_id === reactor.reactor_id);
      let prodMin = 0;
      let washMin = 0;
      let washCount = 0;
      let zeroWashCount = 0;
      let totalKg = 0;

      rBatches.forEach((b) => {
        totalKg += b.batch_qty_kg || 0;
        const bStart = parseDateToMinutes(b.plan_start_time);
        const bEnd = parseDateToMinutes(b.plan_end_time);

        // Overlap with current timeline window, accounting for dynamic shifts and break segments
        const effectiveStart = Math.max(bStart, timelineStartMin);
        const effectiveEnd = Math.min(bEnd, timelineEndMin);
        if (effectiveEnd > effectiveStart) {
          const segments = getBatchWorkingSegments(effectiveStart, effectiveEnd, shifts);
          const workMins = segments.reduce((sum, seg) => sum + seg.workMinutes, 0);
          prodMin += workMins > 0 ? workMins : (effectiveEnd - effectiveStart);
        }

        const wash = b.preceding_wash_min || 0;
        if (wash > 0) {
          washMin += wash;
          washCount += 1;
        } else {
          zeroWashCount += 1;
        }
      });

      const totalOccupied = prodMin + washMin;
      // 反应釜额定净可用工作分钟数
      const reactorAvailMin = Math.max((daysList.length || 1) * shiftMetrics.dailyNetHours * 60, 1);
      const utilPercent = Math.min(100, Math.round((totalOccupied / reactorAvailMin) * 100));
      const prodPercent = Math.min(100, Math.round((prodMin / reactorAvailMin) * 100));
      const washPercent = Math.min(100, Math.round((washMin / reactorAvailMin) * 100));

      const nowMin = parseDateToMinutes('2026-09-14 14:30');
      const activeBatch = rBatches.find((b) => {
        const s = parseDateToMinutes(b.plan_start_time);
        const e = parseDateToMinutes(b.plan_end_time);
        return nowMin >= s && nowMin <= e;
      });

      const nextBatch = rBatches.find((b) => {
        const s = parseDateToMinutes(b.plan_start_time);
        return s > nowMin;
      });

      const totalWindowHours = totalWindowMinutes / 60;
      const occupiedHours = totalOccupied / 60;
      const idleHours = Math.max(0, totalWindowHours - occupiedHours).toFixed(1);

      map[reactor.reactor_id] = {
        batchesCount: rBatches.length,
        totalTons: (totalKg / 1000).toFixed(1),
        prodHours: (prodMin / 60).toFixed(1),
        washHours: (washMin / 60).toFixed(1),
        washMin,
        washCount,
        zeroWashCount,
        totalOccupiedHours: (totalOccupied / 60).toFixed(1),
        utilPercent,
        prodPercent,
        washPercent,
        idleHours,
        activeBatch,
        nextBatch,
        isOverloaded: utilPercent > 80
      };
    });

    return map;
  }, [reactors, workshopBatches, timelineStartMin, timelineEndMin, totalWindowMinutes, daysList, shiftMetrics, shifts]);

  // Format date range string for display
  const periodDisplayRange = useMemo(() => {
    if (viewScope === 'DAY') {
      const d = daysList[0];
      const desc = lang === 'en' ? 'Daily Horizon' : lang === 'ms' ? 'Panorama Harian' : '单日工时全景';
      return `${d.dateStr} (${d.dayOfWeek}) · ${desc}`;
    } else if (viewScope === 'WEEK') {
      const first = daysList[0];
      const last = daysList[daysList.length - 1];
      const desc = lang === 'en' ? '7-Day Plan' : lang === 'ms' ? 'Pelan 7 Hari' : '7天周计划';
      return `${first.dateStr} ~ ${last.dateStr} · ${desc}`;
    } else {
      const [y, m] = selectedDateStr.split('-');
      const desc = lang === 'en' ? 'Monthly Schedule (30 Days)' : lang === 'ms' ? 'Jadual Bulanan (30 Hari)' : '全月排产总览 (30天长周期)';
      return `${y}-${m} · ${desc}`;
    }
  }, [viewScope, daysList, selectedDateStr, lang]);

  return (
    <div
      id="aps-gantt-workstation"
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-100 p-2.5 sm:p-3.5 flex flex-col h-screen w-screen overflow-hidden font-sans text-slate-800 animate-in fade-in duration-150"
          : "space-y-4 font-sans text-slate-800 animate-in fade-in duration-200"
      }
    >
      {/* ========================================================= */}
      {/* DEDICATED INDEPENDENT FULLSCREEN WORKSTATION HEADER       */}
      {/* ========================================================= */}
      {isFullscreen && (
        <div className="bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0 mb-1">
          {/* Left: Brand Badge & Scope & Navigation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-2xs">
              <Layers className="w-3.5 h-3.5" />
              <span>{t.gantt.fullscreenTitle}</span>
            </div>

            {/* Scope: Day / Week / Month */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs shadow-inner">
              <button
                onClick={() => handleSwitchViewScope('DAY')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  viewScope === 'DAY'
                    ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="24H"
              >
                <CalendarClock className="w-3 h-3" />
                <span>{t.gantt.scopeDay}</span>
              </button>
              <button
                onClick={() => handleSwitchViewScope('WEEK')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  viewScope === 'WEEK'
                    ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="7 Days"
              >
                <BarChart3 className="w-3 h-3" />
                <span>{t.gantt.scopeWeek}</span>
              </button>
              <button
                onClick={() => handleSwitchViewScope('MONTH')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  viewScope === 'MONTH'
                    ? 'bg-white text-indigo-600 shadow-2xs ring-1 ring-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="30 Days"
              >
                <CalendarIcon className="w-3 h-3" />
                <span>{t.gantt.scopeMonth}</span>
              </button>
            </div>

            {/* Date Range Navigation */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200/80 text-xs font-mono">
              <button
                onClick={handlePrevPeriod}
                className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                title={t.gantt.prevPeriod}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-bold text-slate-800 text-xs">{periodDisplayRange}</span>
              <button
                onClick={handleNextPeriod}
                className="p-1 rounded hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                title={t.gantt.nextPeriod}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetToday}
                className="ml-1 px-2 py-0.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md border border-indigo-200/80 flex items-center gap-1"
                title={t.gantt.locateToday}
              >
                <Compass className="w-3 h-3 text-indigo-600" />
                <span>{t.gantt.locateToday}</span>
              </button>
            </div>

            {/* Workshop Filter in Fullscreen */}
            {onWorkshopChange && (
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs shadow-inner">
                <button
                  onClick={() => onWorkshopChange('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    currentWorkshopId === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.gantt.allReactors(reactors.length)}
                </button>
                {workshops.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => onWorkshopChange(ws.id)}
                    className={`px-2 py-1 rounded-lg font-bold transition-all ${
                      currentWorkshopId === ws.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={`${ws.name} (${ws.building || ''})`}
                  >
                    {ws.shortName || ws.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Zoom Controls & Exit Fullscreen Button */}
          <div className="flex items-center gap-2.5">
            {/* Dedicated Zoom Controls in Fullscreen */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs shadow-2xs">
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                title="-"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleZoomFitMonth}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  zoomPercent <= 35
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                title="30 Days"
              >
                {t.gantt.zoomMonth}
              </button>

              <button
                onClick={handleZoomFitWeek}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  zoomPercent >= 90 && zoomPercent <= 110
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                title="7 Days"
              >
                {t.gantt.zoomWeek}
              </button>

              <button
                onClick={handleZoomDetail}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  zoomPercent >= 180
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                title="200%"
              >
                {t.gantt.zoomDetail}
              </button>

              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-indigo-600 active:scale-95 transition-all"
                title="+"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <span
                onClick={handleZoomReset}
                className="px-2 py-0.5 bg-white rounded-md font-mono font-bold text-[11px] text-indigo-700 border border-slate-200 cursor-pointer shadow-2xs select-none"
                title="100%"
              >
                {zoomPercent}%
              </span>
            </div>

            {/* Exit Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all border border-rose-700"
              title="ESC"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>{t.gantt.exitFullscreen}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 0. DEVIATION ALERT BANNER (If any batches require reason) */}
      {/* ========================================================= */}
      {!isFullscreen && pendingDeviationBatches.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-2xs">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-amber-950 text-sm flex items-center gap-2">
                <span>{t.gantt.deviationAlert}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono font-bold text-[10px]">
                  {t.gantt.pendingDeviationCount(pendingDeviationBatches.length)}
                </span>
              </div>
              <p className="text-amber-800 text-[11px] mt-0.5">
                {t.gantt.deviationAlertDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveDeviationModalBatch(pendingDeviationBatches[0])}
              className="px-3.5 py-1.5 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-98"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t.gantt.btnLogDeviation(pendingDeviationBatches[0].batch_id)}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('deviation_matrix')}
              className="px-3.5 py-1.5 rounded-xl font-semibold bg-white text-amber-900 border border-amber-300 hover:bg-amber-50 transition-colors"
            >
              {t.gantt.btnViewDeviationList}
            </button>
          </div>
        </div>
      )}

      {/* Scale Feedback Floating Toast Notification */}
      {scaleFeedbackToast && (
        <div className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-200" />
            <span>{scaleFeedbackToast}</span>
          </div>
          <button onClick={() => setScaleFeedbackToast(null)} className="text-indigo-200 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP PREMIUM COMMAND BAR: SubTab Switcher & Controls   */}
      {/* ========================================================= */}
      {!isFullscreen && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Left: View Scope & Sub-tab Switcher */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Primary Main View Mode Switcher */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-inner">
                <button
                  onClick={() => setActiveSubTab('industrial_board')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'industrial_board'
                      ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Standard Board"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.gantt.tabIndustrialBoard}</span>
                  <span className="px-1.5 py-0.2 text-[9px] bg-emerald-100 text-emerald-800 rounded font-black">{lang === 'zh' ? '推荐' : 'REC'}</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('gantt')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'gantt'
                      ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t.gantt.tabGantt}</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('deviation_matrix')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeSubTab === 'deviation_matrix'
                      ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{t.gantt.tabDeviation}</span>
                  {pendingDeviationBatches.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  )}
                </button>
              </div>

              {/* Scope Segmented Buttons [ 日计划 | 周计划 | 月计划 ] */}
              {activeSubTab === 'gantt' && (
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-inner">
                  <button
                    onClick={() => handleSwitchViewScope('DAY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewScope === 'DAY'
                        ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                    title="24H"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>{t.gantt.scopeDay}</span>
                  </button>

                  <button
                    onClick={() => handleSwitchViewScope('WEEK')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewScope === 'WEEK'
                        ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                    title="7 Days"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>{t.gantt.scopeWeek}</span>
                  </button>

                  <button
                    onClick={() => handleSwitchViewScope('MONTH')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      viewScope === 'MONTH'
                        ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                    title="30 Days"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>{t.gantt.scopeMonth}</span>
                  </button>
                </div>
              )}

              {/* Date Range Navigation Toolbar */}
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={handlePrevPeriod}
                  className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                  title={t.gantt.prevPeriod}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-2 py-0.5 text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                  <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{periodDisplayRange}</span>
                </div>

                <button
                  onClick={handleNextPeriod}
                  className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                  title={t.gantt.nextPeriod}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleResetToday}
                  className="ml-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all flex items-center gap-1 border border-indigo-200/80 shadow-2xs"
                  title={t.gantt.locateToday}
                >
                  <Compass className="w-3.5 h-3.5 text-indigo-600 animate-spin" style={{ animationDuration: '8s' }} />
                  <span>{t.gantt.locateToday}</span>
                </button>
              </div>
            </div>

            {/* Right: Zoom Engine Controls, Workshop Switcher & Fullscreen Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Dynamic Zoom Controls Group (In Normal Toolbar) */}
              {activeSubTab === 'gantt' && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-indigo-600 transition-all active:scale-95"
                    title="-"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleZoomFitMonth}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                        zoomPercent <= 35
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                      title="30 Days"
                    >
                      {t.gantt.zoomMonth}
                    </button>

                    <button
                      onClick={handleZoomFitWeek}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                        zoomPercent >= 90 && zoomPercent <= 110
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                      title="7 Days"
                    >
                      {t.gantt.zoomWeek}
                    </button>

                    <button
                      onClick={handleZoomDetail}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                        zoomPercent >= 180
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                      title="200%"
                    >
                      {t.gantt.zoomDetail}
                    </button>
                  </div>

                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-700 hover:text-indigo-600 transition-all active:scale-95"
                    title="+"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <span
                    onClick={handleZoomReset}
                    className="px-2 py-0.5 bg-white rounded-md font-mono font-bold text-[11px] text-indigo-700 border border-slate-200/80 shadow-2xs cursor-pointer select-none"
                    title="100%"
                  >
                    {zoomPercent}%
                  </span>
                </div>
              )}

              {/* Fast Workshop Toggle */}
              {onWorkshopChange && (
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs">
                  <button
                    onClick={() => {
                      onWorkshopChange('ALL');
                      setActiveReactorFilter('ALL');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      currentWorkshopId === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title={t.gantt.allReactors(reactors.length)}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{t.gantt.allReactors(reactors.length)}</span>
                  </button>
                  {workshops.map((ws) => {
                    const wsReactors = reactors.filter(
                      (r) => (r.workshop_id || (r.reactor_id === 'R-6000-02' || r.reactor_id === 'R-6000-03' ? 'WS-02' : 'WS-01')) === ws.id
                    );
                    return (
                      <button
                        key={ws.id}
                        onClick={() => {
                          onWorkshopChange(ws.id);
                          setActiveReactorFilter('ALL');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          currentWorkshopId === ws.id
                            ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-700'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                        title={`${ws.name} (${ws.building || ''})`}
                      >
                        <Factory className="w-3 h-3 text-emerald-500" />
                        <span>{ws.shortName || ws.name} ({wsReactors.length})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Full Screen View Toggle Button */}
              <button
                onClick={() => setIsFullscreen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-98 border bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-indigo-100"
                title={lang === 'en' ? 'Fullscreen Workstation' : lang === 'ms' ? 'Skrin Penuh' : '独立全屏'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Fullscreen' : lang === 'ms' ? 'Skrin Penuh' : '独立全屏'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-VIEW: INDUSTRIAL SPREADSHEET OR DEVIATION MATRIX   */}
      {/* ========================================================= */}
      {activeSubTab === 'deviation_matrix' ? (
        <PlanDeviationMatrix
          batches={batches}
          workshops={workshops}
          onOpenReasonModal={(b) => setActiveDeviationModalBatch(b)}
          onSimulateActuals={handleSimulateMesActuals}
        />
      ) : activeSubTab === 'industrial_board' ? (
        <IndustrialGanttBoard
          reactors={reactors}
          batches={batches}
          restrictions={restrictions}
          washRules={washRules}
          orders={orders}
          shifts={shifts}
          workshops={workshops}
          lang={lang}
          currentWorkshopId={currentWorkshopId}
          onWorkshopChange={onWorkshopChange}
          onSelectBatch={onSelectBatch}
          onAutoSchedule={onAutoSchedule}
          onOpenDeviationModal={(b) => setActiveDeviationModalBatch(b)}
          onOpenBatchModal={(b) => setActiveBatchModal(b)}
          onUpdateShifts={onUpdateShifts}
        />
      ) : (
        <>
          {/* ========================================================= */}
          {/* 3. SECONDARY CONTROLS: Shift Mode, Filter, Search, Simulation */}
          {/* ========================================================= */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left: Quick Shift Setting & Status */}
            <div className="flex flex-wrap items-center gap-2.5">
              {onUpdateShifts && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 px-1.5 flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>{t.gantt.shiftModeLabel}</span>
                  </span>
                  <button
                    onClick={() => handleQuickSetShiftMode('SINGLE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      isSingleShift
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    ☀️ {t.gantt.shiftSingle} ({shiftMetrics.singleHours}H)
                  </button>
                  <button
                    onClick={() => handleQuickSetShiftMode('DOUBLE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      !isSingleShift && isNightShiftOff
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    ⛅ {t.gantt.shiftDouble} ({shiftMetrics.doubleHours}H)
                  </button>
                  <button
                    onClick={() => handleQuickSetShiftMode('TRIPLE')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      !isNightShiftOff
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    🌙 {t.gantt.shiftTriple} ({shiftMetrics.tripleHours}H)
                  </button>
                </div>
              )}

              {/* Shift State Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-medium">
                  {shiftMetrics.activeShiftCount === 1
                    ? `${t.gantt.shiftSingle} (${shiftMetrics.singleHours}h/d · net ${shiftMetrics.singleNetHours}h)`
                    : isNightShiftOff
                    ? `${t.gantt.shiftDouble} (${shiftMetrics.doubleHours}h/d · net ${shiftMetrics.doubleNetHours}h)`
                    : `${t.gantt.shiftTriple} (${shiftMetrics.tripleHours}h/d · net ${shiftMetrics.tripleNetHours}h)`}
                </span>
              </div>
            </div>

            {/* Right: Search, Filter, Strategy, Simulation Trigger */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={t.gantt.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white w-48 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Single Reactor Filter */}
              <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={activeReactorFilter}
                  onChange={(e) => setActiveReactorFilter(e.target.value)}
                  className="bg-transparent text-slate-800 font-medium focus:outline-hidden cursor-pointer"
                >
                  <option value="ALL">
                    {lang === 'en' ? `All (${workshopReactors.length} Reactors)` : lang === 'ms' ? `Semua (${workshopReactors.length} Reaktor)` : `全部设备 (${workshopReactors.length}台釜)`}
                  </option>
                  {workshopReactors.map((r) => (
                    <option key={r.reactor_id} value={r.reactor_id}>
                      {r.reactor_id} ({r.rated_kg / 1000}t)
                    </option>
                  ))}
                </select>
              </div>

              {/* Strategy Dropdown */}
              <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={selectedStrategy}
                  onChange={(e) => {
                    const strat = e.target.value as SchedulingStrategy;
                    setSelectedStrategy(strat);
                    onAutoSchedule(strat);
                  }}
                  className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
                >
                  <option value="SETUP_MINIMIZE">
                    {lang === 'en' ? '⚡ Min Changeover (Zero-Wash First)' : lang === 'ms' ? '⚡ Masa Pertukaran Minimum' : '⚡ 换线时间最小化 (同型号免洗优先)'}
                  </option>
                  <option value="EDD_FIRST">
                    {lang === 'en' ? '⏱️ Earliest Due Date (EDD First)' : lang === 'ms' ? '⏱️ Tarikh Tamat Terawal (EDD)' : '⏱️ 交期最早优先 (EDD 先到先出)'}
                  </option>
                  <option value="LOAD_BALANCE">
                    {lang === 'en' ? '⚖️ Load Balancing' : lang === 'ms' ? '⚖️ Imbangan Beban Kerja' : '⚖️ 设备负荷均衡 (多釜均摊)'}
                  </option>
                </select>
              </div>

              {/* Re-calculate button */}
              <button
                onClick={() => onAutoSchedule(selectedStrategy)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-xs active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Re-Schedule' : lang === 'ms' ? 'Jadual Semula' : '智能排产重排'}</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. KPI METRICS RIBBON                                     */}
          {/* ========================================================= */}
          {!isFullscreen && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{t.gantt.kpiTotalVolume}</span>
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">{kpiStats.totalTons}</span>
                  <span className="text-xs font-semibold text-slate-500">{t.gantt.kpiTons(kpiStats.totalBatchesCount)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{currentWorkshopDef?.shortName || (lang === 'en' ? 'Plant Total' : lang === 'ms' ? 'Jumlah Loji' : '全厂总计')}</span>
                  <span className="text-indigo-600 font-semibold">{lang === 'en' ? '100% Whitelist Safe' : lang === 'ms' ? '100% Mematuhi Senarai Putih' : '100% 满足白名单'}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{t.gantt.kpiShiftLoadRate}</span>
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className={`text-2xl font-black font-mono ${kpiStats.loadRatePercent > 90 ? 'text-amber-600' : 'text-blue-600'}`}>
                    {kpiStats.loadRatePercent}%
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {lang === 'en' ? `Net ${kpiStats.totalProdHours}h` : lang === 'ms' ? `Bersih ${kpiStats.totalProdHours}j` : `净工时 ${kpiStats.totalProdHours}h`}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{lang === 'en' ? `Cap ${kpiStats.totalAvailHours}h` : lang === 'ms' ? `Kapasiti ${kpiStats.totalAvailHours}j` : `额定 ${kpiStats.totalAvailHours}h`}</span>
                  <span className="text-blue-600 font-semibold">{lang === 'en' ? `Wash ${kpiStats.totalWashHours}h` : lang === 'ms' ? `Basuh ${kpiStats.totalWashHours}j` : `洗釜 ${kpiStats.totalWashHours}h`}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{t.gantt.kpiZeroWashSaved}</span>
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-emerald-600 font-mono">+{kpiStats.hoursSavedByZeroWash}</span>
                  <span className="text-xs font-semibold text-emerald-700">{t.gantt.kpiZeroWashBatches(kpiStats.zeroWashBatches)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-600/80">
                  <span>{lang === 'en' ? 'Continuous Optimization' : lang === 'ms' ? 'Pengoptimuman Berterusan' : '连续生产优化'}</span>
                  <span className="font-mono font-semibold">0 min</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{t.gantt.kpiCipOccupied}</span>
                  <Droplet className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-amber-600 font-mono">{kpiStats.totalWashHours}</span>
                  <span className="text-xs font-semibold text-amber-700">{t.gantt.kpiWashBatches(kpiStats.washBatchesCount)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-amber-600/80">
                  <span>{lang === 'en' ? 'Std 2.0h / Special 3.0h' : lang === 'ms' ? 'Piawai 2.0j / Khas 3.0j' : '标准 2.0h / 特殊 3.0h'}</span>
                  <span className="font-semibold">{lang === 'en' ? 'Interleaved' : lang === 'ms' ? 'Diselaraskan' : '已智能穿插'}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{t.gantt.kpiDeviationAnomaly}</span>
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-2xl font-black text-rose-600 font-mono">{pendingDeviationBatches.length}</span>
                  <span className="text-xs font-semibold text-slate-600">{t.gantt.kpiPendingLoop}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <button
                    onClick={() => setActiveSubTab('deviation_matrix')}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    {t.gantt.kpiViewDeviationMatrix}
                  </button>
                  <span className="text-slate-500">{lang === 'en' ? 'Dual-Track Locked' : lang === 'ms' ? 'Terkunci Dwi-Trek' : '双轨制锁定'}</span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. REDESIGNED GANTT TIMELINE WORKSTATION (HOUR-GRID SWIMLANE) */}
          {/* ========================================================= */}
          <div className={`bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden ${isFullscreen ? 'flex-1 flex flex-col min-h-0' : ''}`}>
            {/* Scrollable Container with Sticky Left Column */}
            <div className={`overflow-x-auto relative ${isFullscreen ? 'flex-1 min-h-0 overflow-y-auto' : ''}`} ref={timelineContainerRef}>
              <div style={{ minWidth: `${totalGridWidth + 280}px` }} className="flex flex-col">
                {/* Top Header of Gantt: Date Tier & Explicit Hour Tier (e.g. 2H/cell) */}
                <div className="flex border-b border-slate-200 bg-slate-50/80 text-xs font-semibold select-none sticky top-0 z-20">
                  {/* Left Column: Equipment Header (Sticky Left) */}
                  <div className="w-[280px] shrink-0 p-3.5 border-r border-slate-200 bg-slate-100/95 sticky left-0 z-30 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-slate-900">{t.gantt.reactorSwimlaneTitle}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-700 border border-slate-200 font-mono shadow-2xs">
                      {currentWorkshopId === 'ALL' ? t.gantt.allReactors(reactors.length) : currentWorkshopDef?.shortName}
                    </span>
                  </div>

                  {/* Right Column: Time Grid Header (2 Tiers: Days + Hourly Tick Marks) */}
                  <div className="flex-1 relative flex flex-col justify-between overflow-hidden bg-slate-50/50">
                    {/* Tier 1: Day Headers */}
                    <div className="h-7 border-b border-slate-200/80 flex items-center relative">
                      {daysList.map((day) => {
                        const dayOffset = ((day.startMin - timelineStartMin) / totalWindowMinutes) * 100;
                        const dayWidth = (1440 / totalWindowMinutes) * 100;

                        return (
                          <div
                            key={day.dateStr}
                            className={`absolute top-0 bottom-0 border-r border-slate-200 flex items-center justify-center font-bold text-xs transition-colors ${
                              day.isToday
                                ? 'bg-indigo-50/60 text-indigo-900 font-black'
                                : 'text-slate-700 hover:bg-slate-100/60'
                            }`}
                            style={{
                              left: `${dayOffset}%`,
                              width: `${dayWidth}%`
                            }}
                          >
                            <div className="flex items-center gap-1.5 truncate px-1">
                              <span>{day.dateShort}</span>
                              <span className="opacity-75 font-normal text-[11px]">({day.dayOfWeek})</span>
                              {day.isToday && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-600 text-white">
                                  {t.gantt.todayBadge}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tier 2: Hourly Tick Marks (e.g. 2H/cell -> 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00) */}
                    <div className="h-6 relative flex items-center bg-slate-100/40 text-[10px] font-mono text-slate-600">
                      {timeGridColumns.map((col) => {
                        const showHourLabel = columnPixelWidth >= 22 || col.isShiftBoundary || col.isNewDay;
                        return (
                          <div
                            key={col.id}
                            className={`absolute top-0 bottom-0 border-r flex items-center justify-center truncate ${
                              col.isNewDay
                                ? 'border-slate-300 font-bold text-slate-900 bg-slate-200/50'
                                : col.isShiftBoundary
                                ? 'border-slate-200/90 font-semibold text-slate-700 bg-slate-100/40'
                                : 'border-slate-200/40 text-slate-500'
                            }`}
                            style={{
                              left: `${col.offsetPercent}%`,
                              width: `${col.widthPercent}%`
                            }}
                            title={`${col.fullTimeStr} (刻度: ${hourGridRes}/格 · 列宽: ${columnPixelWidth.toFixed(1)}px)`}
                          >
                            {showHourLabel && (
                              <span className="truncate px-0.5 text-[9px] select-none font-mono">
                                {col.label}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Inactive Shifts Header Badges */}
                      {inactiveShiftIntervals.map((interval) => (
                        <div
                          key={`hdr-${interval.id}`}
                          className="absolute top-0 bottom-0 bg-slate-200/80 border-x border-dashed border-slate-300 z-1 pointer-events-none flex items-center justify-center"
                          style={{
                            left: `${interval.offsetPercent}%`,
                            width: `${interval.widthPercent}%`
                          }}
                        >
                          <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap bg-white/90 px-1 rounded shadow-2xs">
                            ⏸️ {interval.shiftName} ({t.gantt.shiftOffBadge})
                          </span>
                        </div>
                      ))}

                      {/* Shift Break Header Badges (午餐/晚餐/夜餐等产线休息时段) */}
                      {shiftBreakIntervals.map((interval) => (
                        <div
                          key={`hdr-brk-${interval.id}`}
                          className="absolute top-0 bottom-0 bg-amber-100/80 border-x border-dashed border-amber-300 z-2 pointer-events-none flex items-center justify-center overflow-hidden"
                          style={{
                            left: `${interval.offsetPercent}%`,
                            width: `${interval.widthPercent}%`
                          }}
                          title={t.gantt.breakTooltip(interval.breakName, interval.breakMinutes)}
                        >
                          <span className="text-[8px] font-bold text-amber-800 whitespace-nowrap bg-amber-50/95 px-1 py-0.2 rounded shadow-2xs border border-amber-200">
                            ☕ {interval.breakName} {interval.breakMinutes}m
                          </span>
                        </div>
                      ))}

                      {/* Live Current Time Marker (2026-09-14 14:30) */}
                      {isCurrentTimeInWindow && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none flex flex-col items-center"
                          style={{ left: `${currentTimePercent}%` }}
                        >
                          <span className="bg-rose-600 text-white text-[9px] px-1 py-0.2 rounded-b shadow-xs font-mono whitespace-nowrap font-bold">
                            {t.gantt.currentMarker}
                          </span>
                        </div>
                      )}

                      {/* 24-Hour Freeze Boundary Line (2026-09-15 08:00) */}
                      {isFreezeLineInWindow && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-amber-500 border-r border-dashed border-amber-600 z-15 pointer-events-none flex flex-col items-center"
                          style={{ left: `${freezeLinePercent}%` }}
                        >
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] px-1 rounded shadow-2xs font-mono whitespace-nowrap font-bold">
                            {t.gantt.freezeMarker}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Equipment Swimlanes Rows */}
                <div className="divide-y divide-slate-200">
                  {filteredReactors.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-white">
                      <Layers className="w-8 h-8 text-slate-300 animate-pulse" />
                      <div className="text-slate-600 font-semibold text-sm">
                        {lang === 'en' ? 'No matching reactors found' : lang === 'ms' ? 'Tiada reaktor yang sepadan' : '暂无匹配的反应釜设备'}
                      </div>
                      <p className="text-xs text-slate-400">
                        {lang === 'en' ? 'Please check workshop filter or search criteria' : lang === 'ms' ? 'Sila semak penapis bengkel atau carian' : '请检查车间筛选或釜号搜索条件'}
                      </p>
                      <button
                        onClick={() => {
                          setActiveReactorFilter('ALL');
                          setSearchQuery('');
                          onWorkshopChange?.('ALL');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200"
                      >
                        {lang === 'en' ? 'Reset filters (Show all reactors)' : lang === 'ms' ? 'Tetap semula penapis (Tunjuk semua reaktor)' : '重置所有筛选 (显示全部4台釜)'}
                      </button>
                    </div>
                  ) : (
                    filteredReactors.map((reactor) => {
                      const reactorBatches = workshopBatches.filter(
                        (b) => b.assigned_reactor_id === reactor.reactor_id
                      );

                    return (
                      <div
                        key={reactor.reactor_id}
                        className="flex min-h-[108px] hover:bg-slate-50/40 transition-colors group"
                      >
                        {/* Swimlane Left Card: Reactor Info (Sticky Left with Hover Tooltip) */}
                        <div
                          className="w-[280px] shrink-0 p-3.5 border-r border-slate-200 bg-white sticky left-0 z-20 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] flex flex-col justify-between relative group/reactor"
                          onMouseEnter={() => setHoveredReactorCardId(reactor.reactor_id)}
                          onMouseLeave={() => setHoveredReactorCardId(null)}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-slate-900 text-sm">
                                  {reactor.reactor_id}
                                </span>
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                  {reactor.rated_kg / 1000} t
                                </span>
                              </div>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                {reactor.workshop_id || 'WS-01'}
                              </span>
                            </div>

                            {/* Reactor Name Line with Hover Indicator & Tooltip Trigger */}
                            <div
                              className="text-xs text-slate-700 font-medium mt-1 flex items-center justify-between gap-1 group-hover/reactor:text-indigo-600 transition-colors cursor-help"
                              title="KPI"
                            >
                              <span className="truncate">{reactor.reactor_name}</span>
                              <span className="shrink-0 flex items-center gap-0.5 text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-sans font-bold border border-indigo-200/60 shadow-2xs">
                                <Info className="w-2.5 h-2.5 text-indigo-500" />
                                <span>{lang === 'en' ? 'KPI' : lang === 'ms' ? 'KPI' : '指标'}</span>
                              </span>
                            </div>

                            {/* Quick Inline Metrics Snapshot in Left Card */}
                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-indigo-500" />
                                <span>{lang === 'en' ? 'Util:' : lang === 'ms' ? 'Guna:' : '占用率:'}</span>
                                <strong className={`font-mono font-bold ${
                                  (reactorMetricsMap[reactor.reactor_id]?.utilPercent || 0) > 80
                                    ? 'text-amber-600'
                                    : (reactorMetricsMap[reactor.reactor_id]?.utilPercent || 0) > 40
                                    ? 'text-emerald-600'
                                    : 'text-indigo-600'
                                }`}>
                                  {reactorMetricsMap[reactor.reactor_id]?.utilPercent || 0}%
                                </strong>
                              </div>
                              <div className="flex items-center gap-1">
                                <Droplet className="w-3 h-3 text-amber-500" />
                                <span>{lang === 'en' ? 'Wash:' : lang === 'ms' ? 'Basuh:' : '预计洗釜:'}</span>
                                <strong className="font-mono font-bold text-amber-600">
                                  {reactorMetricsMap[reactor.reactor_id]?.washHours || '0.0'}h
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Capacity & Limits Footer */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1 text-slate-500">
                              <span>{lang === 'en' ? 'Rated:' : lang === 'ms' ? 'Kadar:' : '额定:'}</span>
                              <span className="font-mono font-bold text-slate-800">
                                {reactor.rated_kg.toLocaleString()}kg
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                              <span>{lang === 'en' ? 'Min:' : lang === 'ms' ? 'Min:' : '下限:'}</span>
                              <span className="font-mono text-slate-600">{reactor.min_kg}kg</span>
                            </div>
                          </div>

                          {/* ========================================================= */}
                          {/* HOVER FLOATING TOOLTIP CARD (占用率 & 预期清洗时间明细)    */}
                          {/* ========================================================= */}
                          {hoveredReactorCardId === reactor.reactor_id && reactorMetricsMap[reactor.reactor_id] && (
                            <div
                              className="absolute left-[285px] top-0 z-50 w-84 bg-slate-900/95 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
                            >
                              {/* Tooltip Header */}
                              <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                    <Factory className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-mono font-black text-white text-sm flex items-center gap-1.5">
                                      <span>{reactor.reactor_id}</span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-600 text-white font-sans font-bold">
                                        {reactor.rated_kg / 1000}t
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-300 font-medium truncate max-w-[170px]">
                                      {reactor.reactor_name}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                  {reactor.workshop_id || 'WS-01'}
                                </span>
                              </div>

                              {/* Section 1: Current Utilization Rate (占用率 / 负荷率) */}
                              <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 mb-2.5">
                                <div className="flex items-center justify-between text-xs mb-1.5">
                                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>{lang === 'en' ? 'Schedule Utilization Rate:' : lang === 'ms' ? 'Kadar Penggunaan Jadual:' : '当前排产占用率 (负荷率):'}</span>
                                  </span>
                                  <span className={`font-mono font-black text-sm ${
                                    reactorMetricsMap[reactor.reactor_id].utilPercent > 80
                                      ? 'text-amber-400'
                                      : reactorMetricsMap[reactor.reactor_id].utilPercent > 40
                                      ? 'text-emerald-400'
                                      : 'text-sky-400'
                                  }`}>
                                    {reactorMetricsMap[reactor.reactor_id].utilPercent}%
                                  </span>
                                </div>

                                {/* Progress Bar (Dual: Production + Wash) */}
                                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden flex mb-1.5">
                                  <div
                                    className="bg-indigo-500 h-full transition-all duration-300"
                                    style={{ width: `${reactorMetricsMap[reactor.reactor_id].prodPercent}%` }}
                                  />
                                  <div
                                    className="bg-amber-400 h-full transition-all duration-300"
                                    style={{ width: `${reactorMetricsMap[reactor.reactor_id].washPercent}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                                    <span>{lang === 'en' ? 'Prod:' : lang === 'ms' ? 'Prod:' : '生产:'} {reactorMetricsMap[reactor.reactor_id].prodHours}h ({reactorMetricsMap[reactor.reactor_id].prodPercent}%)</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                                    <span>{lang === 'en' ? 'Wash:' : lang === 'ms' ? 'Basuh:' : '清洗:'} {reactorMetricsMap[reactor.reactor_id].washHours}h ({reactorMetricsMap[reactor.reactor_id].washPercent}%)</span>
                                  </div>
                                  <span className="text-slate-500">
                                    {lang === 'en' ? 'Idle:' : lang === 'ms' ? 'Melahu:' : '空闲:'} {reactorMetricsMap[reactor.reactor_id].idleHours}h
                                  </span>
                                </div>
                              </div>

                              {/* Section 2: Expected Wash Duration & CIP Stats (预期清洗时间) */}
                              <div className="bg-amber-950/40 rounded-xl p-2.5 border border-amber-500/30 mb-2.5 text-xs">
                                <div className="flex items-center justify-between text-amber-300 font-bold mb-1">
                                  <span className="flex items-center gap-1.5">
                                    <Droplet className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{lang === 'en' ? 'Expected Wash Time (CIP/Changeover):' : lang === 'ms' ? 'Masa Pembersihan Dijangka (CIP):' : '预期清洗时间 (CIP/换线):'}</span>
                                  </span>
                                  <span className="font-mono text-white bg-amber-600/90 px-1.5 py-0.2 rounded text-[11px] font-bold">
                                    {reactorMetricsMap[reactor.reactor_id].washHours} {lang === 'en' ? 'hrs' : lang === 'ms' ? 'jam' : '小时'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-amber-200/90 leading-tight space-y-1 mt-1.5">
                                  <div className="flex items-center justify-between">
                                    <span>{lang === 'en' ? '• Planned washes:' : lang === 'ms' ? '• Pembersihan dirancang:' : '• 计划洗釜工序:'}</span>
                                    <span className="font-mono font-bold text-white">
                                      {reactorMetricsMap[reactor.reactor_id].washCount} {lang === 'en' ? 'times' : lang === 'ms' ? 'kali' : '次'} ({reactorMetricsMap[reactor.reactor_id].washMin} min)
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>{lang === 'en' ? '• Same model zero-wash:' : lang === 'ms' ? '• Model sama tanpa basuh:' : '• 同型号免洗次数:'}</span>
                                    <span className="font-mono font-bold text-emerald-400">
                                      {reactorMetricsMap[reactor.reactor_id].zeroWashCount} {lang === 'en' ? 'times (saved)' : lang === 'ms' ? 'kali (jimat)' : '次 (免洗节省工时)'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Section 3: Batch Status Summary */}
                              <div className="text-[11px] text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800">
                                <div className="flex items-center gap-1">
                                  <span>{lang === 'en' ? 'Cycle Batches:' : lang === 'ms' ? 'Kelompok Kitaran:' : '周期排产:'}</span>
                                  <span className="font-mono font-bold text-white">
                                    {reactorMetricsMap[reactor.reactor_id].batchesCount} {lang === 'en' ? 'batches' : lang === 'ms' ? 'kelompok' : '批'}
                                  </span>
                                  <span className="text-slate-400">({reactorMetricsMap[reactor.reactor_id].totalTons} {lang === 'en' ? 't' : '吨'})</span>
                                </div>
                                {reactorMetricsMap[reactor.reactor_id].activeBatch ? (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-900/80 text-emerald-300 text-[10px] font-bold border border-emerald-700">
                                    {lang === 'en' ? '▶ In Production' : lang === 'ms' ? '▶ Sedang Dihasilkan' : '▶ 正在生产'}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                                    {lang === 'en' ? 'Idle / Ready' : lang === 'ms' ? 'Melahu / Sedia' : '待料 / 空闲'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Swimlane Right Track: Timeline Canvas with Hourly Grids & Task Blocks */}
                        <div className="flex-1 relative p-2 min-h-[108px] bg-slate-50/10 overflow-hidden flex items-center">
                          {/* Vertical Hour Grid Lines */}
                          {timeGridColumns.map((col) => (
                            <div
                              key={`line-${col.id}`}
                              className={`absolute top-0 bottom-0 pointer-events-none ${
                                col.isNewDay
                                  ? 'w-px bg-slate-300'
                                  : col.isShiftBoundary
                                  ? 'w-px bg-slate-200'
                                  : 'w-px bg-slate-100'
                              }`}
                              style={{ left: `${col.offsetPercent}%` }}
                            />
                          ))}

                          {/* Inactive Shifts Non-Working Shaded Overlays */}
                          {inactiveShiftIntervals.map((interval) => (
                            <div
                              key={interval.id}
                              className="absolute top-0 bottom-0 bg-slate-200/50 border-x border-dashed border-slate-300/80 z-1 pointer-events-none flex flex-col items-center justify-center select-none"
                              style={{
                                left: `${interval.offsetPercent}%`,
                                width: `${interval.widthPercent}%`
                              }}
                            >
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-white/90 px-2 py-0.5 rounded-md shadow-2xs border border-slate-200/90 whitespace-nowrap">
                                <Coffee className="w-3 h-3 text-slate-400" />
                                <span>{interval.shiftName} · {t.gantt.shiftOffBadge}</span>
                              </div>
                            </div>
                          ))}

                          {/* Shift Break Overlays (产线休息时间: 午餐/晚餐/夜餐等工间休整) */}
                          {shiftBreakIntervals.map((interval) => (
                            <div
                              key={`grid-brk-${interval.id}`}
                              className="absolute top-0 bottom-0 bg-amber-200/35 border-x border-dashed border-amber-400/60 z-1 pointer-events-none flex flex-col items-center justify-center select-none"
                              style={{
                                left: `${interval.offsetPercent}%`,
                                width: `${interval.widthPercent}%`
                              }}
                              title={t.gantt.breakTooltip(interval.breakName, interval.breakMinutes)}
                            >
                              <div className="flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-50/95 px-1.5 py-0.5 rounded shadow-2xs border border-amber-300 whitespace-nowrap">
                                <Coffee className="w-2.5 h-2.5 text-amber-600" />
                                <span>{interval.breakName} · {interval.breakMinutes}m</span>
                              </div>
                            </div>
                          ))}

                          {/* 24h Freeze Background Zone - 24小时灰色阴影遮罩区 (Page 7 Section 2) */}
                          {isFreezeLineInWindow && (
                            <div
                              className="absolute top-0 bottom-0 left-0 bg-slate-900/[0.06] pointer-events-none border-r-2 border-dashed border-amber-600/80 z-2 backdrop-contrast-95"
                              style={{ width: `${freezeLinePercent}%` }}
                            >
                              <div className="absolute top-1 left-2 flex items-center gap-1 bg-slate-800/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs select-none">
                                <Lock className="w-2.5 h-2.5 text-amber-300" />
                                <span>{lang === 'en' ? '24H Freeze Zone' : lang === 'ms' ? 'Zon Pembekuan 24H' : '24H 计划冻结区'}</span>
                              </div>
                            </div>
                          )}

                          {/* Render Scheduled Batches & Preceding Wash Blocks */}
                          {reactorBatches.map((batch) => {
                            const batchStartMin = parseDateToMinutes(batch.plan_start_time);
                            const batchEndMin = parseDateToMinutes(batch.plan_end_time);

                            if (batchEndMin < timelineStartMin || batchStartMin > timelineEndMin) {
                              return null;
                            }

                            const dev = calculateBatchDeviation(batch);
                            const segments = getBatchWorkingSegments(batchStartMin, batchEndMin, shifts);

                            const hasWash = (batch.preceding_wash_min || 0) > 0;
                            const washStart = batch.preceding_wash_start || batch.plan_start_time;
                            const washStartMin = parseDateToMinutes(washStart);

                            const washOffset = ((washStartMin - timelineStartMin) / totalWindowMinutes) * 100;
                            const washEndMin = batch.preceding_wash_end
                              ? parseDateToMinutes(batch.preceding_wash_end)
                              : washStartMin + (batch.preceding_wash_min || 0);
                            const washDuration = (Math.max(1, washEndMin - washStartMin) / totalWindowMinutes) * 100;

                            const isSpecialModel = batch.product_model === 'SIM-MODEL-SPECIAL-S';

                            return (
                              <React.Fragment key={batch.batch_id}>
                                {/* Preceding CIP Wash Task Block */}
                                {hasWash && (
                                  <div
                                    className="absolute top-2 bottom-2 rounded-xl bg-linear-to-r from-amber-500/30 to-amber-500/15 border border-amber-500/60 z-5 flex items-center justify-center text-amber-900 overflow-hidden px-0.5 cursor-pointer hover:border-amber-600 transition-all shadow-2xs group/wash select-none"
                                    style={{
                                      left: `${Math.max(0, washOffset)}%`,
                                      width: `${Math.max(0.2, washDuration)}%`,
                                      minWidth: '6px'
                                    }}
                                    title={`CIP: ${batch.preceding_wash_min} min (${batch.preceding_wash_start} ~ ${batch.preceding_wash_end})`}
                                  >
                                    <div className="flex items-center gap-0.5 font-mono font-bold text-[9px] whitespace-nowrap">
                                      <Droplet className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                      {((batch.preceding_wash_min / totalWindowMinutes) * totalGridWidth >= 28) && (
                                        <span>{batch.preceding_wash_min}m</span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Main Production Batch Task Block */}
                                {segments.map((seg, idx) => {
                                  const segOffset = ((seg.startMin - timelineStartMin) / totalWindowMinutes) * 100;
                                  const segWidth = (seg.workMinutes / totalWindowMinutes) * 100;

                                  if (seg.startMin > timelineEndMin || seg.startMin + seg.workMinutes < timelineStartMin) {
                                    return null;
                                  }

                                  const segPixelWidth = (seg.workMinutes / totalWindowMinutes) * totalGridWidth;
                                  const isUltraCompact = segPixelWidth < 30;
                                  const isCompact = segPixelWidth >= 30 && segPixelWidth < 75;

                                  return (
                                    <React.Fragment key={`${batch.batch_id}-seg-${idx}`}>
                                      <div
                                        onClick={() => {
                                          if (dev.requiresReason) {
                                            setActiveDeviationModalBatch(batch);
                                          } else {
                                            setActiveBatchModal(batch);
                                          }
                                          onSelectBatch(batch);
                                        }}
                                      className={`absolute top-2 bottom-2 rounded-xl z-10 border flex flex-col justify-between cursor-pointer transition-all duration-150 hover:shadow-lg hover:scale-[1.01] select-none overflow-hidden ${
                                        isUltraCompact ? 'p-0.5' : isCompact ? 'p-1.5' : 'p-2'
                                      } ${
                                        batch.is_actual
                                          ? 'bg-emerald-600/95 text-white border-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                                          : isSpecialModel
                                          ? 'bg-purple-700/95 text-white border-purple-800 ring-2 ring-purple-500/20 shadow-xs'
                                          : 'bg-indigo-600/95 text-white border-indigo-700 shadow-xs'
                                      }`}
                                      style={{
                                        left: `${Math.max(0, segOffset)}%`,
                                        width: `${Math.max(0.3, segWidth)}%`,
                                        minWidth: '10px'
                                      }}
                                      title={`Batch: ${batch.batch_id} (${batch.product_model})\nOrder: ${batch.order_no} | ${batch.customer_name}\nPlan: ${batch.plan_start_time} ~ ${batch.plan_end_time}\n${batch.batch_qty_kg} kg`}
                                    >
                                      {/* Ultra-compact view (for Month view or high zoom-out) */}
                                      {isUltraCompact ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center">
                                          <span className="font-mono font-black text-[9px] truncate leading-none">
                                            {batch.batch_id.replace('BATCH-', 'B')}
                                          </span>
                                        </div>
                                      ) : isCompact ? (
                                        /* Compact view (for 1/5th week view) */
                                        <div className="h-full flex flex-col justify-between text-[10px] leading-tight">
                                          <div className="flex items-center justify-between gap-0.5 min-w-0">
                                            <span className="font-mono font-black text-[10px] truncate">
                                              {batch.batch_id}
                                            </span>
                                            {batch.is_locked && (
                                              <Lock className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                                            )}
                                          </div>
                                          <div className="flex items-center justify-between gap-1 opacity-90 font-mono text-[9px] border-t border-white/20 pt-0.5">
                                            <span className="truncate">{batch.product_model}</span>
                                            <span className="shrink-0">
                                              {batch.batch_qty_kg >= 1000 ? `${batch.batch_qty_kg / 1000}t` : `${batch.batch_qty_kg}k`}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        /* Full Detailed view (for Day view or zoomed-in) */
                                        <>
                                          {/* Top Row: Batch ID, Lock status & Deviation Warning */}
                                          <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1 min-w-0">
                                              <span className="font-mono font-black text-xs truncate">
                                                {batch.batch_id}
                                              </span>
                                              {batch.is_locked && (
                                                <Lock className="w-3 h-3 text-amber-300 shrink-0" title={lang === 'en' ? 'Locked batch' : '锁定批次'} />
                                              )}
                                            </div>

                                            {/* Deviation Alert icon if delayed or pending reason */}
                                            {dev.requiresReason ? (
                                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-amber-950 animate-bounce flex items-center gap-0.5 shrink-0">
                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                <span>{lang === 'en' ? 'Deviation' : lang === 'ms' ? 'Sisihan' : '偏差待录'}</span>
                                              </span>
                                            ) : dev.deviationMinutes > 15 ? (
                                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white font-mono shrink-0">
                                                +{dev.deviationMinutes}m
                                              </span>
                                            ) : batch.is_actual ? (
                                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-400 text-emerald-950 shrink-0">
                                                {lang === 'en' ? 'WIP' : lang === 'ms' ? 'WIP' : '在制'}
                                              </span>
                                            ) : null}
                                          </div>

                                          {/* Middle Row: Product Model & Customer */}
                                          <div className="text-[11px] font-medium truncate opacity-95">
                                            {batch.product_model} · {batch.customer_name.split('(')[0]}
                                          </div>

                                          {/* Bottom Row: Plan vs Actual Time Indicator */}
                                          <div className="flex items-center justify-between text-[10px] font-mono opacity-90 border-t border-white/20 pt-1">
                                            <span>
                                              {batch.batch_qty_kg >= 1000 ? `${batch.batch_qty_kg / 1000}t` : `${batch.batch_qty_kg}kg`}
                                            </span>
                                            <span>
                                              🔒{batch.plan_start_time.split(' ')[1]}~{batch.plan_end_time.split(' ')[1]}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Segment Pause Connection (产线休息或停工跨段连线) */}
                                    {seg.pauseAfterMinutes && seg.pauseAfterMinutes > 0 && (
                                      <div
                                        className="absolute top-1/2 -translate-y-1/2 border-t-2 border-dashed border-indigo-400/80 z-5 pointer-events-none flex items-center justify-center select-none"
                                        style={{
                                          left: `${segOffset + segWidth}%`,
                                          width: `${(seg.pauseAfterMinutes / totalWindowMinutes) * 100}%`
                                        }}
                                        title={`产线休息/停工暂停: ${seg.pauseAfterMinutes}分钟`}
                                      >
                                        <span className="text-[8px] font-bold text-slate-600 bg-white/95 px-1 py-0.2 rounded shadow-2xs border border-slate-300 whitespace-nowrap">
                                          ⏸️ {seg.pauseAfterMinutes >= 60 ? `${(seg.pauseAfterMinutes / 60).toFixed(1)}h` : `${seg.pauseAfterMinutes}m`}
                                        </span>
                                      </div>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 6. BATCH DETAILS & REACTOR REASSIGNMENT MODAL             */}
      {/* ========================================================= */}
      {activeBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{lang === 'en' ? 'Batch Details & Working Hours' : lang === 'ms' ? 'Butiran Kelompok & Masa Bekerja' : '批次详情与工时核算'}</span>
                    <span className="font-mono text-indigo-600 font-black">{activeBatchModal.batch_id}</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {lang === 'en' ? 'Workshop:' : lang === 'ms' ? 'Bengkel:' : '所属车间:'} {activeBatchModal.workshop_id || 'WS-01'} · {lang === 'en' ? 'Assigned:' : lang === 'ms' ? 'Ditugaskan:' : '当前指派:'} {activeBatchModal.assigned_reactor_id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveBatchModal(null);
                  setManualMoveWarning(null);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualMoveWarning && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div className="font-semibold">{manualMoveWarning}</div>
              </div>
            )}

            {/* Plan Baseline vs Actual Comparison Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>{lang === 'en' ? 'Hours Baseline Execution' : lang === 'ms' ? 'Pelaksanaan Garis Asas Masa' : '工时基准执行情况'}</span>
                </span>
                <button
                  onClick={() => {
                    const b = activeBatchModal;
                    setActiveBatchModal(null);
                    setActiveDeviationModalBatch(b);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{lang === 'en' ? 'Report Actual Hours & Reason' : lang === 'ms' ? 'Lapor Masa Sebenar & Sebab' : '填报/修改实际工时与原因'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 font-mono text-[11px]">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                  <div className="text-slate-500 font-sans text-[10px]">🔒 {lang === 'en' ? 'Plan Baseline (Immutable)' : lang === 'ms' ? 'Garis Asas Pelan (Kekal)' : '计划基准 (不可变)'}</div>
                  <div className="font-bold text-slate-900 mt-1">
                    {activeBatchModal.plan_start_time} ~ {activeBatchModal.plan_end_time}
                  </div>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-amber-800 font-sans text-[10px]">⚡ {lang === 'en' ? 'Shopfloor Actual' : lang === 'ms' ? 'Sebenar Bengkel' : '现场实际时间'}</div>
                  <div className="font-bold text-amber-950 mt-1">
                    {activeBatchModal.actual_start_time || (lang === 'en' ? 'Unreported' : lang === 'ms' ? 'Belum lapor' : '未上报')} ~ {activeBatchModal.actual_end_time || (activeBatchModal.is_actual ? (lang === 'en' ? 'In Progress' : '在制中') : (lang === 'en' ? 'Unfinished' : '未完工'))}
                  </div>
                </div>
              </div>

              {activeBatchModal.deviation_reason && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] space-y-0.5">
                  <div className="font-semibold text-slate-700">
                    {lang === 'en' ? 'Deviation Reason:' : lang === 'ms' ? 'Sebab Sisihan:' : '异常原因:'} <span className="font-normal text-slate-900">{activeBatchModal.deviation_reason}</span>
                  </div>
                  {activeBatchModal.corrective_action && (
                    <div className="text-slate-500">
                      {lang === 'en' ? 'Corrective Action:' : lang === 'ms' ? 'Tindakan Pembetulan:' : '纠偏措施:'} <span className="text-emerald-700 font-medium">{activeBatchModal.corrective_action}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">{lang === 'en' ? 'Sales Order:' : lang === 'ms' ? 'Pesanan Jualan:' : '关联销售订单:'}</span>
                <div className="font-bold text-slate-800 font-mono mt-0.5">
                  {activeBatchModal.order_no} ({activeBatchModal.customer_name})
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">{lang === 'en' ? 'Product Model:' : lang === 'ms' ? 'Model Produk:' : '产品型号:'}</span>
                <div className="font-bold text-slate-800 mt-0.5 truncate">
                  {activeBatchModal.product_model}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">{lang === 'en' ? 'Batch Feed Qty:' : lang === 'ms' ? 'Kuantiti Suapan:' : '排产投料量:'}</span>
                <div className="font-bold text-slate-800 font-mono mt-0.5">
                  {activeBatchModal.batch_qty_kg.toLocaleString()} kg ({lang === 'en' ? `Batch ${activeBatchModal.batch_index}/${activeBatchModal.total_batches}` : `第 ${activeBatchModal.batch_index}/${activeBatchModal.total_batches} 批`})
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500">{lang === 'en' ? 'Current Process:' : lang === 'ms' ? 'Proses Semasa:' : '生产进度工序:'}</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  #{activeBatchModal.current_step} ({PROCESS_NODES.find((n) => n.id === activeBatchModal.current_step)?.name || (lang === 'en' ? 'Ready' : '准备')})
                </div>
              </div>
            </div>

            {/* Manual Reactor Reassignment with White-list Validation */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>{lang === 'en' ? 'Manual Reassignment (Hard Constraints Check)' : lang === 'ms' ? 'Penetapan Semula Reaktor (Kekangan Keras)' : '人工指定变更反应釜 (触发白名单硬约束校验)'}</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {lang === 'en' ? 'Current:' : lang === 'ms' ? 'Semasa:' : '当前:'} <strong className="text-indigo-600 font-mono">{activeBatchModal.assigned_reactor_id}</strong>
                </span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {reactors.map((r) => {
                  const check = validateReactorRestriction(
                    activeBatchModal.product_model,
                    r.reactor_id,
                    restrictions
                  );
                  const isCurrent = activeBatchModal.assigned_reactor_id === r.reactor_id;

                  return (
                    <button
                      key={r.reactor_id}
                      onClick={() => handleAttemptMoveReactor(activeBatchModal, r.reactor_id)}
                      disabled={isCurrent}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between text-xs transition-all ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : check.valid
                          ? 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                          : 'border-rose-200 bg-rose-50/40 text-rose-800 opacity-90'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">{r.reactor_id}</span>
                        {check.valid ? (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100/80 px-1 rounded">
                            {lang === 'en' ? 'Valid' : lang === 'ms' ? 'Sah' : '合规'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold text-rose-700 bg-rose-100 px-1 rounded">
                            {lang === 'en' ? 'Restricted' : lang === 'ms' ? 'Terhad' : '受限'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate">
                        {r.rated_kg / 1000}t ({r.workshop_id || 'WS-01'})
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wash Task Information */}
            {activeBatchModal.preceding_wash_min > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-amber-600" />
                  <span>{lang === 'en' ? `Preceding CIP: ${activeBatchModal.preceding_wash_min} min (${activeBatchModal.preceding_wash_min / 60} hrs)` : `前序洗釜占用：${activeBatchModal.preceding_wash_min} 分钟 (${activeBatchModal.preceding_wash_min / 60} 小时)`}</span>
                </div>
                <div className="text-amber-800 font-mono text-[11px]">
                  {lang === 'en' ? 'Window:' : lang === 'ms' ? 'Tetingkap:' : '清洗窗口:'} {activeBatchModal.preceding_wash_start} ~ {activeBatchModal.preceding_wash_end}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setActiveBatchModal(null);
                  setManualMoveWarning(null);
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-colors"
              >
                {lang === 'en' ? 'Close' : lang === 'ms' ? 'Tutup' : '完成查看'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. DEVIATION REASON MODAL DIALOG                          */}
      {/* ========================================================= */}
      {activeDeviationModalBatch && (
        <DeviationReasonModal
          batch={activeDeviationModalBatch}
          isOpen={!!activeDeviationModalBatch}
          onClose={() => setActiveDeviationModalBatch(null)}
          onSave={handleSaveDeviationReason}
        />
      )}
    </div>
  );
};
