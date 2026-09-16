import React from 'react';
import {
  CalendarClock,
  ShieldCheck,
  Globe,
  SlidersHorizontal,
  FileCheck2,
  GitCompare,
  CheckCircle2,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  Settings,
  Shield,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Database,
  Cpu,
  Share2,
  Clock,
  Building2,
  Factory,
  KeyRound,
  Eye,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { LanguageCode, SystemConfig, UserRole, WorkshopId, WorkshopDef, WORKSHOP_DEFINITIONS } from '../types/aps';
import { getTranslations } from '../i18n';

interface HeaderProps {
  currentTab: 'gantt' | 'reporting' | 'rules' | 'dashboard' | 'mes' | 'admin';
  onTabChange: (tab: 'gantt' | 'reporting' | 'rules' | 'dashboard' | 'mes' | 'admin') => void;
  lang: LanguageCode;
  onLangChange: (lang: LanguageCode) => void;
  publishedVersion: string;
  draftVersion: string;
  onSimulateSchedule: () => void;
  onPublishSchedule: () => void;
  hasHardConstraintErrors: boolean;
  isPublishing?: boolean;
  systemConfig: SystemConfig;
  currentRole: UserRole;
  authenticatedRoles?: UserRole[];
  onRoleChange: (role: UserRole) => void;
  onRequireAuthPrompt?: (targetRole: UserRole) => void;
  workshops?: WorkshopDef[];
  userAccounts?: any[];
  lastDbSaveTime?: string;
  onOpenDbManager?: () => void;
  currentWorkshopId: WorkshopId;
  onWorkshopChange: (workshopId: WorkshopId) => void;
  onOpenCtpModal?: () => void;
  onOpenWhatIfModal?: () => void;
  onOpenExceptionsModal?: () => void;
  isDemoMode?: boolean;
  onToggleDemoMode?: () => void;
  criticalExceptionCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  lang,
  onLangChange,
  publishedVersion,
  draftVersion,
  onSimulateSchedule,
  onPublishSchedule,
  hasHardConstraintErrors,
  isPublishing,
  systemConfig,
  currentRole,
  authenticatedRoles = ['VIEWER'],
  onRoleChange,
  onRequireAuthPrompt,
  workshops = WORKSHOP_DEFINITIONS,
  userAccounts,
  lastDbSaveTime,
  onOpenDbManager,
  currentWorkshopId,
  onWorkshopChange,
  onOpenCtpModal,
  onOpenWhatIfModal,
  onOpenExceptionsModal,
  isDemoMode = false,
  onToggleDemoMode,
  criticalExceptionCount = 0
}) => {
  // Translations dictionary
  const tr = getTranslations(lang);
  const t = {
    appName: systemConfig?.systemName || tr.header.appName,
    appSubtitle: systemConfig?.systemSubtitle || tr.header.appSubtitle,
    reviewTag: systemConfig?.reviewTag || tr.header.reviewTag,
    verStatus: tr.header.pubDraftVersion(publishedVersion, draftVersion),
    freezeInfo: tr.header.freezeActive,
    btnSimulate: tr.header.btnSimulate,
    btnWhatIf: tr.header.btnWhatIf,
    btnCtp: tr.header.btnCtp,
    btnExceptions: tr.header.btnExceptions,
    btnPublish: tr.header.btnPublish,
    tabGantt: tr.header.tabGantt,
    tabReporting: tr.header.tabReporting,
    tabDashboard: tr.header.tabDashboard,
    tabRules: tr.header.tabRules,
    tabMes: tr.header.tabMes,
    tabAdmin: tr.header.tabAdmin
  };

  const tabs = [
    { id: 'gantt' as const, label: t.tabGantt, icon: CalendarClock, desc: tr.header.tabGanttDesc },
    { id: 'reporting' as const, label: t.tabReporting, icon: ClipboardList, desc: tr.header.tabReportingDesc },
    { id: 'dashboard' as const, label: t.tabDashboard, icon: LayoutDashboard, desc: tr.header.tabDashboardDesc },
    { id: 'rules' as const, label: t.tabRules, icon: SlidersHorizontal, desc: tr.header.tabRulesDesc },
    { id: 'mes' as const, label: t.tabMes, icon: Share2, desc: tr.header.tabMesDesc },
    { id: 'admin' as const, label: t.tabAdmin, icon: Settings, desc: tr.header.tabAdminDesc, highlight: true }
  ];

  const handleSelectRole = (targetRole: UserRole) => {
    if (targetRole === 'VIEWER') {
      onRoleChange('VIEWER');
      return;
    }

    if (authenticatedRoles.includes(targetRole) || authenticatedRoles.includes('ADMIN')) {
      onRoleChange(targetRole);
    } else {
      // Require password prompt
      if (onRequireAuthPrompt) {
        onRequireAuthPrompt(targetRole);
      } else {
        onRoleChange(targetRole);
      }
    }
  };

  const isCurrentRoleUnlocked = currentRole !== 'VIEWER' && (authenticatedRoles.includes(currentRole) || authenticatedRoles.includes('ADMIN'));

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner (Control Center) - 100% Screen Width */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold tracking-wider text-xs shadow-xs shrink-0">
            NV
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                {t.appName}
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {t.reviewTag}
              </span>
              
              {/* Database Real-time Persistence Badge */}
              <button
                onClick={onOpenDbManager}
                className="group flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                title="数据已实时存入本地及服务器数据库，页面刷新不丢失。点击可导出/备份/恢复数据库。"
              >
                <Database className="w-2.5 h-2.5 text-emerald-600" />
                <span>实时数据库已连接</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Right side: Workshop Switcher, Role Switcher, Language & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Workshop Switcher (Fast 1-Click Toggle) */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 px-1.5 flex items-center gap-1">
              <Factory className="w-3 h-3 text-indigo-600" />
              <span>车间:</span>
            </span>
            {workshops.map((ws) => (
              <button
                key={ws.id}
                onClick={() => onWorkshopChange(ws.id)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                  currentWorkshopId === ws.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title={`切换至 ${ws.name} (${ws.building || ''}) · 负责人: ${ws.managerName || '未指定'}`}
              >
                <span>{ws.shortName || ws.name}</span>
              </button>
            ))}
            <button
              onClick={() => onWorkshopChange('ALL')}
              className={`px-1.5 py-1 rounded text-[11px] font-medium transition-all ${
                currentWorkshopId === 'ALL'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title={tr.header.allPlants}
            >
              {tr.header.allPlants}
            </button>
          </div>

          {/* Active Role Selector in Top Header with Password Lock status */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <span className="text-[11px] font-medium text-slate-500 px-1.5 flex items-center gap-1">
              {isCurrentRoleUnlocked ? (
                <Unlock className="w-3 h-3 text-emerald-600" />
              ) : (
                <Lock className="w-3 h-3 text-amber-600" />
              )}
              <span>{lang === 'zh' ? '身份:' : lang === 'en' ? 'Role:' : 'Peranan:'}</span>
            </span>
            <select
              value={currentRole}
              onChange={(e) => handleSelectRole(e.target.value as UserRole)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:ring-0 cursor-pointer pr-1 py-1"
            >
              <option value="VIEWER">👀 {tr.header.roles.VIEWER}</option>
              <option value="PLANNER">📋 {tr.header.roles.PLANNER}</option>
              <option value="PROCESS_ENGINEER">🧪 {tr.header.roles.OPERATOR}</option>
              <option value="SUPERVISOR">👷 {tr.header.roles.DISPATCHER}</option>
              <option value="ADMIN">⚙️ {tr.header.roles.ADMIN}</option>
            </select>
            {currentRole === 'VIEWER' && (
              <button
                type="button"
                onClick={() => onRequireAuthPrompt?.('PLANNER')}
                className="ml-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-bold border border-blue-200"
                title="PIN Auth"
              >
                {lang === 'zh' ? '解锁' : lang === 'en' ? 'Unlock' : 'Buka'}
              </button>
            )}
          </div>

          {/* Language Switcher */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => onLangChange('zh')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                lang === 'zh' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="中文 (Chinese)"
            >
              中
            </button>
            <button
              onClick={() => onLangChange('en')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                lang === 'en' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="English"
            >
              EN
            </button>
            <button
              onClick={() => onLangChange('ms')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                lang === 'ms' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bahasa Melayu"
            >
              BM
            </button>
          </div>

          {/* V4.0 Advanced Tools (CTP, What-If, 8 Exceptions, Demo Isolation) */}
          <button
            onClick={onOpenCtpModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors shadow-2xs"
            title="IPS / CTP"
          >
            <Zap className="w-3 h-3 text-blue-600" />
            <span className="font-semibold">{t.btnCtp}</span>
          </button>

          <button
            onClick={onOpenWhatIfModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors shadow-2xs"
            title="What-If"
          >
            <GitCompare className="w-3 h-3 text-indigo-600" />
            <span className="font-semibold">{t.btnWhatIf}</span>
          </button>

          <button
            onClick={onOpenExceptionsModal}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors shadow-2xs ${
              criticalExceptionCount > 0
                ? 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 animate-pulse'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            title="APS Exceptions"
          >
            <ShieldAlert className={`w-3 h-3 ${criticalExceptionCount > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
            <span className="font-semibold">{t.btnExceptions}</span>
            {criticalExceptionCount > 0 && (
              <span className="ml-0.5 px-1 py-0.1 bg-rose-600 text-white rounded text-[10px] font-bold">
                {criticalExceptionCount}
              </span>
            )}
          </button>

          {/* Demo Mode Toggle */}
          <button
            onClick={onToggleDemoMode}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border transition-colors ${
              isDemoMode
                ? 'border-amber-400 bg-amber-100 text-amber-900 font-bold'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title={isDemoMode ? tr.demoWatermark.title : 'Toggle Demo Mode'}
          >
            <Eye className={`w-3 h-3 ${isDemoMode ? 'text-amber-700' : 'text-slate-500'}`} />
            <span>{isDemoMode ? tr.header.demoBadgeActive : tr.header.demoBadgeInactive}</span>
          </button>

          {/* Action buttons */}
          <button
            onClick={onSimulateSchedule}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-2xs"
            title="依据主数据和工序时间重新计算未锁定批次并生成试算草稿"
          >
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span className="font-semibold">{t.btnSimulate}</span>
          </button>

          <button
            onClick={onPublishSchedule}
            disabled={hasHardConstraintErrors || isPublishing}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg transition-all shadow-2xs ${
              hasHardConstraintErrors
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
            }`}
            title={hasHardConstraintErrors ? '存在硬约束错误或主数据待确认，发布已拦截' : '校验合规并发布最新排程版本'}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>{t.btnPublish}</span>
          </button>
        </div>
      </div>

      {/* Redesigned Navigation Hub - 100% Screen Width */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-1.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          {/* Main Navigation Segmented Tabs - Responsive Grid Layout (Never overflows) */}
          <nav className="grid grid-cols-3 md:grid-cols-6 gap-1 w-full lg:w-auto flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    isActive
                      ? tab.highlight
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs ring-1 ring-purple-400/30'
                        : 'bg-blue-600 text-white border-blue-600 shadow-xs ring-1 ring-blue-400/30'
                      : tab.highlight
                      ? 'bg-purple-50/50 text-purple-700 border-purple-200/70 hover:bg-purple-100 hover:text-purple-900'
                      : 'bg-slate-50/80 text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : tab.highlight ? 'text-purple-600' : 'text-slate-500'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Compact Version & Status Strip */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-600 shrink-0 pl-2 border-l border-slate-200">
            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {t.verStatus}
            </span>
            <div className="flex items-center gap-1 text-slate-500">
              <Lock className="w-2.5 h-2.5 text-amber-600" />
              <span>{t.freezeInfo}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
