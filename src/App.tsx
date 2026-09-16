import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { GanttWorkstation } from './components/GanttWorkstation.tsx';
import { ShiftReportingView } from './components/ShiftReportingView.tsx';
import { RulesConfigView } from './components/RulesConfigView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { MesApiView } from './components/MesApiView.tsx';
import { AdminConfigView } from './components/AdminConfigView.tsx';
import { AuthPasswordModal } from './components/AuthPasswordModal.tsx';
import { CtpSimulationModal } from './components/CtpSimulationModal.tsx';
import { WhatIfComparisonModal } from './components/WhatIfComparisonModal.tsx';
import { ExceptionsCenterModal } from './components/ExceptionsCenterModal.tsx';
import {
  Reactor,
  ProductionOrder,
  BatchTask,
  ReactorRestriction,
  WashMatrixRule,
  ProductModelDef,
  SchedulingStrategy,
  LanguageCode,
  ProcessNodeId,
  ProcessNodeDef,
  PROCESS_NODES,
  StepProgressStatus,
  QcReleaseStatus,
  SpecialScope,
  SystemConfig,
  ShiftDef,
  StaffingConfig,
  UserRole,
  WorkshopId,
  WorkshopDef,
  UserAccount,
  WashRuleCardDef,
  WhatIfScenario,
  WORKSHOP_DEFINITIONS
} from './types/aps';
import {
  INITIAL_REACTORS,
  INITIAL_ORDERS_V2,
  INITIAL_BATCH_TASKS_V2,
  INITIAL_RESTRICTIONS,
  INITIAL_WASH_RULES,
  INITIAL_PRODUCT_MODELS,
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_SHIFTS,
  DEFAULT_STAFFING_CONFIG,
  DEFAULT_USER_ACCOUNTS,
  DEFAULT_WASH_RULE_CARDS,
  ROLE_DEFINITIONS,
  runSmartSchedule,
  validateReactorRestriction,
  evaluateScheduleExceptions
} from './utils/apsEngine';
import {
  loadDatabase,
  saveDatabaseToStorage,
  resetDatabaseToDefault,
  exportDatabaseBackup,
  importDatabaseBackup,
  ApsDatabase
} from './utils/database';
import {
  CheckCircle2,
  AlertTriangle,
  Zap,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  Lock,
  Database
} from 'lucide-react';

export default function App() {
  // 1. Initialize persistent state from database
  const [initialDb] = useState(() => loadDatabase());

  // Navigation & Localization & RBAC
  const [currentTab, setCurrentTab] = useState<'gantt' | 'reporting' | 'rules' | 'dashboard' | 'mes' | 'admin'>('gantt');
  const [language, setLanguage] = useState<LanguageCode>(initialDb.language || 'zh');
  const [currentRole, setCurrentRole] = useState<UserRole>(initialDb.currentRole || 'PLANNER');
  const [currentWorkshopId, setCurrentWorkshopId] = useState<WorkshopId>(initialDb.currentWorkshopId || 'ALL');

  // RBAC Password Authentication State
  const [authenticatedRoles, setAuthenticatedRoles] = useState<UserRole[]>(
    initialDb.authenticatedRoles || ['PLANNER']
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  // Global System Configuration & Workshops & Users
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(initialDb.systemConfig || DEFAULT_SYSTEM_CONFIG);
  const [workshops, setWorkshops] = useState<WorkshopDef[]>(initialDb.workshops || WORKSHOP_DEFINITIONS);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(initialDb.userAccounts || DEFAULT_USER_ACCOUNTS);
  const [washRuleCards, setWashRuleCards] = useState<WashRuleCardDef[]>(initialDb.washRuleCards || DEFAULT_WASH_RULE_CARDS);

  // Version Control (Page 10: 已发布 V12 / 试算草稿 V13)
  const [publishedVersion, setPublishedVersion] = useState(initialDb.publishedVersion || 'V12');
  const [draftVersion, setDraftVersion] = useState(initialDb.draftVersion || 'V13');
  const [isDraftActive, setIsDraftActive] = useState(initialDb.isDraftActive || false);

  // Core Data Entities (Loaded from database)
  const [reactors, setReactors] = useState<Reactor[]>(initialDb.reactors || INITIAL_REACTORS);
  const [orders, setOrders] = useState<ProductionOrder[]>(initialDb.orders || INITIAL_ORDERS_V2);
  const [batches, setBatches] = useState<BatchTask[]>(initialDb.batches || INITIAL_BATCH_TASKS_V2);
  const [restrictions, setRestrictions] = useState<ReactorRestriction[]>(initialDb.restrictions || INITIAL_RESTRICTIONS);
  const [washRules, setWashRules] = useState<WashMatrixRule[]>(initialDb.washRules || INITIAL_WASH_RULES);
  const [productModels, setProductModels] = useState<ProductModelDef[]>(initialDb.productModels || INITIAL_PRODUCT_MODELS);

  // Dynamic Process Times (Planner), Shifts & Staffing (Supervisor)
  const [processNodes, setProcessNodes] = useState<ProcessNodeDef[]>(initialDb.processNodes || PROCESS_NODES);
  const [shifts, setShifts] = useState<ShiftDef[]>(initialDb.shifts || DEFAULT_SHIFTS);
  const [staffingConfig, setStaffingConfig] = useState<StaffingConfig>(initialDb.staffingConfig || DEFAULT_STAFFING_CONFIG);

  // V4.0 Advanced Features State: CTP, What-If, 8 Exceptions, and Demo Isolation
  const [isCtpModalOpen, setIsCtpModalOpen] = useState<boolean>(false);
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState<boolean>(false);
  const [isExceptionsModalOpen, setIsExceptionsModalOpen] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Dynamic 8 Structural Exceptions Engine
  const exceptions = useMemo(() => {
    return evaluateScheduleExceptions(
      orders,
      batches,
      reactors,
      productModels,
      restrictions,
      washRules,
      '2026-09-14 08:00'
    );
  }, [orders, batches, reactors, productModels, restrictions, washRules]);

  const criticalExceptionCount = useMemo(() => {
    return exceptions.filter((e) => e.severity === 'CRITICAL').length;
  }, [exceptions]);

  // Unassigned issues list
  const [unassignedIssues, setUnassignedIssues] = useState<string[]>(
    initialDb.unassignedIssues || [
      '【BATCH_BELOW_MIN】SIM-SO-004 尾批 200 kg 低于 1.3t 釜最小稳定投料量 (300kg)，已列为待处理余量，未自动超产'
    ]
  );

  // Last Saved Database Timestamp
  const [lastDbSaveTime, setLastDbSaveTime] = useState<string>(initialDb.lastSavedAt || new Date().toISOString());

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Auto Persistence Effect: Save entire state to database on any update
  useEffect(() => {
    const currentDbState: ApsDatabase = {
      schemaVersion: 2,
      lastSavedAt: new Date().toISOString(),
      systemConfig,
      workshops,
      userAccounts,
      washRuleCards,
      reactors,
      orders,
      batches,
      restrictions,
      washRules,
      productModels,
      processNodes,
      shifts,
      staffingConfig,
      unassignedIssues,
      publishedVersion,
      draftVersion,
      isDraftActive,
      currentRole,
      authenticatedRoles,
      language,
      currentWorkshopId
    };

    saveDatabaseToStorage(currentDbState);
    setLastDbSaveTime(currentDbState.lastSavedAt);
  }, [
    systemConfig,
    workshops,
    userAccounts,
    washRuleCards,
    reactors,
    orders,
    batches,
    restrictions,
    washRules,
    productModels,
    processNodes,
    shifts,
    staffingConfig,
    unassignedIssues,
    publishedVersion,
    draftVersion,
    isDraftActive,
    currentRole,
    authenticatedRoles,
    language,
    currentWorkshopId
  ]);

  // Database Management Handlers
  const handleExportDatabase = useCallback(() => {
    const currentDbState: ApsDatabase = {
      schemaVersion: 2,
      lastSavedAt: new Date().toISOString(),
      systemConfig,
      workshops,
      userAccounts,
      washRuleCards,
      reactors,
      orders,
      batches,
      restrictions,
      washRules,
      productModels,
      processNodes,
      shifts,
      staffingConfig,
      unassignedIssues,
      publishedVersion,
      draftVersion,
      isDraftActive,
      currentRole,
      authenticatedRoles,
      language,
      currentWorkshopId
    };
    exportDatabaseBackup(currentDbState);
    showNotification('全量数据库备份文件已导出下载！', 'success');
  }, [
    systemConfig,
    workshops,
    userAccounts,
    washRuleCards,
    reactors,
    orders,
    batches,
    restrictions,
    washRules,
    productModels,
    processNodes,
    shifts,
    staffingConfig,
    unassignedIssues,
    publishedVersion,
    draftVersion,
    isDraftActive,
    currentRole,
    authenticatedRoles,
    language,
    currentWorkshopId
  ]);

  const handleImportDatabase = useCallback((jsonString: string) => {
    const res = importDatabaseBackup(jsonString);
    if (!res.success || !res.data) {
      showNotification(`数据库导入失败：${res.error}`, 'warning');
      return;
    }
    const d = res.data;
    setSystemConfig(d.systemConfig);
    if (d.workshops) setWorkshops(d.workshops);
    if (d.userAccounts) setUserAccounts(d.userAccounts);
    if (d.washRuleCards) setWashRuleCards(d.washRuleCards);
    setReactors(d.reactors);
    setOrders(d.orders);
    setBatches(d.batches);
    setRestrictions(d.restrictions);
    setWashRules(d.washRules);
    setProductModels(d.productModels);
    setProcessNodes(d.processNodes);
    setShifts(d.shifts);
    setStaffingConfig(d.staffingConfig);
    setUnassignedIssues(d.unassignedIssues);
    setPublishedVersion(d.publishedVersion);
    setDraftVersion(d.draftVersion);
    setIsDraftActive(d.isDraftActive);
    setCurrentRole(d.currentRole);
    if (d.authenticatedRoles) setAuthenticatedRoles(d.authenticatedRoles);
    setLanguage(d.language);
    if (d.currentWorkshopId) setCurrentWorkshopId(d.currentWorkshopId);
    setLastDbSaveTime(d.lastSavedAt);
    showNotification('数据库备份已成功恢复！全厂排产工单与设备台账已更新', 'success');
  }, []);

  const handleResetDatabase = useCallback(() => {
    const def = resetDatabaseToDefault();
    setSystemConfig(def.systemConfig);
    setWorkshops(def.workshops);
    setUserAccounts(def.userAccounts);
    setWashRuleCards(def.washRuleCards);
    setReactors(def.reactors);
    setOrders(def.orders);
    setBatches(def.batches);
    setRestrictions(def.restrictions);
    setWashRules(def.washRules);
    setProductModels(def.productModels);
    setProcessNodes(def.processNodes);
    setShifts(def.shifts);
    setStaffingConfig(def.staffingConfig);
    setUnassignedIssues(def.unassignedIssues);
    setPublishedVersion(def.publishedVersion);
    setDraftVersion(def.draftVersion);
    setIsDraftActive(def.isDraftActive);
    setCurrentRole(def.currentRole);
    setAuthenticatedRoles(def.authenticatedRoles);
    setLanguage(def.language);
    setCurrentWorkshopId(def.currentWorkshopId);
    setLastDbSaveTime(def.lastSavedAt);
    showNotification('数据库已重置为标准出厂出厂数据集！', 'info');
  }, []);

  // Role Authentication prompt handler
  const handleRequireAuthPrompt = (targetRole: UserRole) => {
    setPendingRole(targetRole);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (role: UserRole) => {
    setAuthenticatedRoles((prev) => (prev.includes(role) ? prev : [...prev, role]));
    setCurrentRole(role);
    setIsAuthModalOpen(false);
    setPendingRole(null);
    showNotification(
      `身份密码校验通过，已成功切换至【${ROLE_DEFINITIONS[role]?.name || role}】操作权限！`,
      'success'
    );
  };

  // 1. Simulate draft schedule recalculation using latest planner & supervisor input
  const handleSimulateSchedule = useCallback((strategy: SchedulingStrategy = 'SETUP_MINIMIZE') => {
    const result = runSmartSchedule(
      orders,
      reactors,
      restrictions,
      washRules,
      batches,
      '2026-09-14 08:00',
      strategy,
      processNodes,
      shifts,
      staffingConfig
    );

    setBatches(result.batches);
    setUnassignedIssues(result.unassignedIssues);
    setIsDraftActive(true);
    showNotification(
      `系统已自动依据【计划员】产品工序耗时/洗釜规则及【生产主管】排班班次/员工人数完成有限产能自动排产！生成草稿版本 ${draftVersion}`,
      'info'
    );
  }, [orders, reactors, restrictions, washRules, batches, draftVersion, processNodes, shifts, staffingConfig]);

  // Handle Shift changes: Automatically adjust schedule batches, accounting for working hours and breaks
  const handleUpdateShifts = useCallback((newShifts: ShiftDef[]) => {
    setShifts(newShifts);
    const result = runSmartSchedule(
      orders,
      reactors,
      restrictions,
      washRules,
      batches,
      '2026-09-14 08:00',
      'SETUP_MINIMIZE',
      processNodes,
      newShifts,
      staffingConfig
    );
    setBatches(result.batches);
    setUnassignedIssues(result.unassignedIssues);
    setIsDraftActive(true);
    showNotification('班次与休息时间设置已更新，甘特图排程已随之自动重新排产计算完成！', 'info');
  }, [orders, reactors, restrictions, washRules, batches, processNodes, staffingConfig]);

  // 2. Publish schedule with hard constraints check & Server-Side Demo Isolation
  const handlePublishSchedule = async () => {
    // Check if there are blocking hard constraints
    const hasViolations = batches.some((b) => {
      const check = validateReactorRestriction(b.product_model, b.assigned_reactor_id, restrictions);
      return !check.valid;
    });

    if (hasViolations) {
      showNotification('【发布阻断】当前计划存在违反专线隔离或设备白名单的硬冲突，禁止发布！', 'warning');
      return;
    }

    // Call RESTful publish endpoint (validates is_demo flag server-side according to Page 8)
    try {
      const response = await fetch(`/api/v1/plans/${draftVersion}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_demo: isDemoMode,
          publisher_id: 'usr-88902',
          version_no: draftVersion,
          publisher_name: currentRole === 'PLANNER' ? '计划员' : '生产调度主任',
          frozen_until: '2026-09-15 08:00'
        })
      });

      const resJson = await response.json();
      if (!response.ok || resJson.status === 'REJECTED') {
        showNotification(
          `【服务端物理拦截 - ${resJson.error_code || 'BLOCKED'}】${resJson.message || '发布失败'} ${
            resJson.missing_master_data ? `(缺失项: ${resJson.missing_master_data.join(', ')})` : ''
          }`,
          'warning'
        );
        return;
      }

      const nextVer = `V${parseInt(draftVersion.replace('V', '')) + 1}`;
      setPublishedVersion(draftVersion);
      setDraftVersion(nextVer);
      setIsDraftActive(false);

      showNotification(`排程计划发布成功！当前生效版本升级为【${draftVersion}】，全厂已同步最新指令（24H 冻结规则已激活）`, 'success');
    } catch (err: any) {
      // Fallback
      showNotification(`发布异常: ${err.message || err}`, 'warning');
    }
  };

  // What-If Scenario Adoption Handler
  const handleApplyWhatIfScenario = (scenario: WhatIfScenario) => {
    setBatches(scenario.batches);
    setIsDraftActive(true);
    showNotification(`已应用 What-If 方案【${scenario.name}】(${scenario.strategy})，甘特图排程已随之动态刷新！`, 'success');
  };

  // 3. Manual Batch Move between Reactors (with Hard Interlock Check)
  const handleUpdateBatchReactor = (batchId: string, targetReactorId: string): { success: boolean; message?: string } => {
    const targetBatch = batches.find((b) => b.batch_id === batchId);
    if (!targetBatch) return { success: false, message: '未找到对应批次' };

    // 冻结保护：未来 24 小时内锁定的任务不能随意挪动
    if (targetBatch.is_locked && targetBatch.is_actual) {
      return {
        success: false,
        message: '【冻结计划拦截】该任务处于已开工/未来24小时锁定状态，不可直接拖拽变更！须先申请主管审批解锁。'
      };
    }

    // 专釜白名单硬约束校验
    const check = validateReactorRestriction(targetBatch.product_model, targetReactorId, restrictions);
    if (!check.valid) {
      return {
        success: false,
        message: check.errorMessage || '违反设备白名单或专釜硬约束'
      };
    }

    // 反应釜容量硬约束校验
    const targetReactor = reactors.find((r) => r.reactor_id === targetReactorId);
    if (targetReactor) {
      if (targetBatch.batch_qty_kg > targetReactor.max_kg) {
        return {
          success: false,
          message: `【容量超限】批次量 ${targetBatch.batch_qty_kg}kg 超出反应釜 ${targetReactor.reactor_name} 的额定上限 ${targetReactor.max_kg}kg！`
        };
      }
      if (targetBatch.batch_qty_kg < targetReactor.min_kg) {
        return {
          success: false,
          message: `【投料过低】批次量 ${targetBatch.batch_qty_kg}kg 低于反应釜 ${targetReactor.reactor_name} 的最小投料量 ${targetReactor.min_kg}kg！`
        };
      }
    }

    // 更新批次
    setBatches((prev) =>
      prev.map((b) => (b.batch_id === batchId ? { ...b, assigned_reactor_id: targetReactorId } : b))
    );

    showNotification(`批次【${batchId}】已成功变更至反应釜【${targetReactorId}】`, 'success');
    return { success: true };
  };

  // 4. Update Rule: Allowed Reactors (Whitelisting)
  const handleUpdateReactorAllowed = (productModel: string, reactorId: string, isAllowed: boolean) => {
    setRestrictions((prev) =>
      prev.map((r) => {
        if (r.product_model === productModel) {
          const currentList = r.allowed_reactor_ids;
          let newList: string[];
          if (isAllowed) {
            newList = currentList.includes(reactorId) ? currentList : [...currentList, reactorId];
          } else {
            newList = currentList.filter((id) => id !== reactorId);
          }
          return {
            ...r,
            allowed_reactor_ids: newList,
            is_exclusive: newList.length === 1
          };
        }
        return r;
      })
    );

    // 同步更新产品库
    setProductModels((prev) =>
      prev.map((p) => {
        if (p.model_code === productModel) {
          const currentList = p.allowed_reactors || [];
          let newList: string[];
          if (isAllowed) {
            newList = currentList.includes(reactorId) ? currentList : [...currentList, reactorId];
          } else {
            newList = currentList.filter((id) => id !== reactorId);
          }
          return { ...p, allowed_reactors: newList };
        }
        return p;
      })
    );

    showNotification(`已更新型号【${productModel}】的反应釜可用白名单`, 'info');
  };

  // 5. Update Special Washing Direction (ENTER / LEAVE / EITHER)
  const handleUpdateSpecialDirection = (productModel: string, direction: SpecialScope) => {
    setProductModels((prev) =>
      prev.map((p) => (p.model_code === productModel ? { ...p, special_scope: direction } : p))
    );
    showNotification(`已将型号【${productModel}】的特殊洗釜触发方向更新为：${direction}`, 'info');
  };

  // 6. Shift Progress Reporting from Shop Floor
  const handleReportProgress = (
    batchId: string,
    stepId: ProcessNodeId,
    status: StepProgressStatus,
    goodFilledKg?: number,
    qcStatus?: QcReleaseStatus,
    actualEndTime?: string
  ) => {
    setBatches((prev) =>
      prev.map((b) => {
        if (b.batch_id === batchId) {
          const updated = {
            ...b,
            current_step: stepId,
            step_status: status,
            is_actual: true,
            is_locked: true,
            ...(goodFilledKg !== undefined ? { good_filled_kg: goodFilledKg } : {}),
            ...(qcStatus ? { qc_status: qcStatus } : {}),
            ...(actualEndTime ? { actual_end_time: actualEndTime } : {})
          };
          return updated;
        }
        return b;
      })
    );

    // If order is completed or filling reported, update order completed_good_kg
    if (goodFilledKg !== undefined && goodFilledKg > 0) {
      const batch = batches.find((b) => b.batch_id === batchId);
      if (batch) {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.order_no === batch.order_no) {
              const prevCompleted = o.completed_good_kg || 0;
              const newCompleted = prevCompleted + goodFilledKg;
              return {
                ...o,
                completed_good_kg: newCompleted,
                status: newCompleted >= o.qty_kg ? 'COMPLETED' : 'IN_PROGRESS'
              };
            }
            return o;
          })
        );
      }
    }

    showNotification(`已保存批次【${batchId}】工序 #${stepId} 报工数据，进度已同步至甘特图与看板`, 'success');
  };

  // 7. Add new Production Order from Dashboard
  const handleAddNewOrder = (newOrder: ProductionOrder) => {
    setOrders((prev) => [...prev, newOrder]);
    // Trigger smart scheduling to generate batches for new order
    const result = runSmartSchedule(
      [...orders, newOrder],
      reactors,
      restrictions,
      washRules,
      batches,
      '2026-09-14 08:00',
      'SETUP_MINIMIZE',
      processNodes,
      shifts,
      staffingConfig
    );
    setBatches(result.batches);
    setUnassignedIssues(result.unassignedIssues);
    showNotification(`新工单【${newOrder.order_no}】(${newOrder.qty_kg} kg) 录入成功，系统已自动按反应釜容量分批并排程！`, 'success');
  };

  // Check if there are hard constraint errors
  const hasHardConstraintErrors = useMemo(() => {
    return batches.some((b) => {
      const check = validateReactorRestriction(b.product_model, b.assigned_reactor_id, restrictions);
      return !check.valid;
    });
  }, [batches, restrictions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Redesigned Navigation Header with Zero Scrollbar & Database Persistence Status & Workshop Switcher */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        lang={language}
        onLangChange={setLanguage}
        publishedVersion={publishedVersion}
        draftVersion={draftVersion}
        onSimulateSchedule={() => handleSimulateSchedule('SETUP_MINIMIZE')}
        onPublishSchedule={handlePublishSchedule}
        hasHardConstraintErrors={hasHardConstraintErrors}
        systemConfig={systemConfig}
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        authenticatedRoles={authenticatedRoles}
        onRequireAuthPrompt={handleRequireAuthPrompt}
        workshops={workshops}
        userAccounts={userAccounts}
        lastDbSaveTime={lastDbSaveTime}
        onOpenDbManager={() => setCurrentTab('admin')}
        currentWorkshopId={currentWorkshopId}
        onWorkshopChange={(ws) => {
          setCurrentWorkshopId(ws);
          const found = workshops.find((w) => w.id === ws);
          showNotification(
            ws === 'ALL'
              ? '已切换至【全部车间 · 跨厂总览】'
              : found
              ? `已切换至【${found.name}】(${found.building || '车间'})`
              : `已切换至【${ws}】`,
            'info'
          );
        }}
        onOpenCtpModal={() => setIsCtpModalOpen(true)}
        onOpenWhatIfModal={() => setIsWhatIfModalOpen(true)}
        onOpenExceptionsModal={() => setIsExceptionsModalOpen(true)}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => {
          setIsDemoMode((prev) => {
            const next = !prev;
            showNotification(
              next ? '已开启【演示试算模式】：图表叠加水印，服务端将拦截正式发布' : '已切换回【正式生产模式】',
              next ? 'warning' : 'info'
            );
            return next;
          });
        }}
        criticalExceptionCount={criticalExceptionCount}
      />

      {/* Global Notice / Alerts Banner */}
      {notification && (
        <div className={`border-b px-4 py-2.5 text-xs flex items-center justify-between shadow-xs transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : notification.type === 'warning'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Zap className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto px-2 sm:px-4 lg:px-6 py-3 ${currentTab === 'gantt' ? 'w-full max-w-full' : 'max-w-7xl'}`}>
        {currentTab === 'gantt' && (
          <div className="relative">
            {isDemoMode && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
                <div className="transform -rotate-12 select-none border-4 border-dashed border-rose-500/50 bg-rose-50/40 px-12 py-6 rounded-3xl text-center backdrop-blur-[1px] shadow-2xl">
                  <span className="block text-2xl sm:text-4xl lg:text-5xl font-black tracking-widest text-rose-700/60 uppercase">
                    【演示草稿-主数据未确认-禁止发布】
                  </span>
                  <span className="block text-xs sm:text-sm font-bold text-rose-800/80 mt-1 font-mono">
                    DEMO TRIAL MODE · 服务端 API 硬拦截 · 严禁用于车间实际执行
                  </span>
                </div>
              </div>
            )}
            <GanttWorkstation
              reactors={reactors}
              batches={batches}
              restrictions={restrictions}
              washRules={washRules}
              orders={orders}
              shifts={shifts}
              workshops={workshops}
              onUpdateShifts={handleUpdateShifts}
              onAutoSchedule={handleSimulateSchedule}
              onUpdateBatchReactor={handleUpdateBatchReactor}
              onSelectBatch={() => {}}
              unassignedIssues={unassignedIssues}
              currentWorkshopId={currentWorkshopId}
              onWorkshopChange={setCurrentWorkshopId}
              onUpdateBatches={setBatches}
            />
          </div>
        )}

        {currentTab === 'reporting' && (
          <ShiftReportingView
            reactors={reactors}
            batches={batches}
            onReportProgress={handleReportProgress}
          />
        )}

        {currentTab === 'rules' && (
          <RulesConfigView
            currentRole={currentRole}
            reactors={reactors}
            onUpdateReactors={setReactors}
            restrictions={restrictions}
            washRules={washRules}
            onUpdateWashRules={setWashRules}
            washRuleCards={washRuleCards}
            onUpdateWashRuleCards={setWashRuleCards}
            productModels={productModels}
            onUpdateProductModels={setProductModels}
            onUpdateReactorAllowed={handleUpdateReactorAllowed}
            onUpdateSpecialDirection={handleUpdateSpecialDirection}
            onSubmitRulesApproval={() => showNotification('已提交规则变更审批单，生效后自动重新校验计划', 'success')}
            onRequireAuthPrompt={handleRequireAuthPrompt}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            orders={orders}
            batches={batches}
            reactors={reactors}
            productModels={productModels}
            onAddNewOrder={handleAddNewOrder}
            onNavigateToGantt={() => setCurrentTab('gantt')}
            onNavigateToShiftReport={() => setCurrentTab('reporting')}
          />
        )}

        {currentTab === 'mes' && <MesApiView />}

        {currentTab === 'admin' && (
          <AdminConfigView
            currentRole={currentRole}
            onRoleChange={setCurrentRole}
            systemConfig={systemConfig}
            onUpdateSystemConfig={setSystemConfig}
            workshops={workshops}
            onUpdateWorkshops={setWorkshops}
            userAccounts={userAccounts}
            onUpdateUserAccounts={setUserAccounts}
            reactors={reactors}
            onUpdateReactors={setReactors}
            productModels={productModels}
            onUpdateProductModels={setProductModels}
            processNodes={processNodes}
            onUpdateProcessNodes={setProcessNodes}
            shifts={shifts}
            onUpdateShifts={handleUpdateShifts}
            staffingConfig={staffingConfig}
            onUpdateStaffingConfig={setStaffingConfig}
            washRules={washRules}
            onUpdateWashRules={setWashRules}
            onTriggerAutoSchedule={() => handleSimulateSchedule('SETUP_MINIMIZE')}
            onNavigateToGantt={() => setCurrentTab('gantt')}
            onExportDatabase={handleExportDatabase}
            onImportDatabase={handleImportDatabase}
            onResetDatabase={handleResetDatabase}
            lastDbSaveTime={lastDbSaveTime}
            orderCount={orders.length}
            batchCount={batches.length}
          />
        )}
      </main>

      {/* RBAC Password Verification Modal */}
      <AuthPasswordModal
        isOpen={isAuthModalOpen}
        targetRole={pendingRole}
        userAccounts={userAccounts}
        onSuccess={handleAuthSuccess}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingRole(null);
        }}
        onSwitchToViewer={() => {
          setCurrentRole('VIEWER');
          setIsAuthModalOpen(false);
          setPendingRole(null);
        }}
      />

      {/* V4.0 CTP / IPS Order Inquiry Simulation Modal */}
      <CtpSimulationModal
        isOpen={isCtpModalOpen}
        onClose={() => setIsCtpModalOpen(false)}
        orders={orders}
        batches={batches}
        reactors={reactors}
        shifts={shifts}
        restrictions={restrictions}
        washRules={washRules}
        productModels={productModels}
        onAdoptOrder={handleAddNewOrder}
      />

      {/* V4.0 What-If Multi-Scenario Pareto Optimization Modal */}
      <WhatIfComparisonModal
        isOpen={isWhatIfModalOpen}
        onClose={() => setIsWhatIfModalOpen(false)}
        orders={orders}
        reactors={reactors}
        restrictions={restrictions}
        washRules={washRules}
        shifts={shifts}
        onApplyScenario={handleApplyWhatIfScenario}
      />

      {/* V4.0 8 Structural Exceptions Governance Modal */}
      <ExceptionsCenterModal
        isOpen={isExceptionsModalOpen}
        onClose={() => setIsExceptionsModalOpen(false)}
        orders={orders}
        batches={batches}
        reactors={reactors}
        productModels={productModels}
        restrictions={restrictions}
        washRules={washRules}
        currentRole={currentRole}
        onNavigateToConfig={() => setCurrentTab('rules')}
      />

      {/* Light Theme Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>{systemConfig.companyName} · {systemConfig.systemName}</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>已启用全库持久化存储</span>
            </span>
          </div>
          <span className="font-mono text-slate-400">
            内部质量单位统一为 kg · 1.3t 釜 1 台 / 6t 釜 2 台独立建模 · 连续24小时冻结承诺
          </span>
        </div>
      </footer>
    </div>
  );
}
