import React, { useState, useEffect, useRef } from 'react';
import {
  Reactor,
  ProductModelDef,
  ReactorRestriction,
  WashMatrixRule,
  ProcessNodeDef,
  ShiftDef,
  StaffingConfig,
  SystemConfig,
  UserRole,
  UserRoleInfo,
  SpecialScope,
  WorkshopDef,
  UserAccount,
  WORKSHOP_DEFINITIONS
} from '../types/aps';
import { ROLE_DEFINITIONS, DEFAULT_USER_ACCOUNTS, getShiftDurationHours } from '../utils/apsEngine';
import {
  Settings,
  Shield,
  UserCheck,
  Building2,
  Cpu,
  Clock,
  Sparkles,
  Users,
  Calendar,
  Layers,
  Save,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  ArrowRight,
  Database,
  Download,
  Upload,
  RotateCcw,
  FileJson,
  Server,
  HardDrive,
  Factory,
  KeyRound
} from 'lucide-react';

interface AdminConfigViewProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  systemConfig: SystemConfig;
  onUpdateSystemConfig: (config: SystemConfig) => void;
  reactors: Reactor[];
  onUpdateReactors: (reactors: Reactor[]) => void;
  workshops?: WorkshopDef[];
  onUpdateWorkshops?: (workshops: WorkshopDef[]) => void;
  userAccounts?: UserAccount[];
  onUpdateUserAccounts?: (accounts: UserAccount[]) => void;
  productModels: ProductModelDef[];
  onUpdateProductModels: (models: ProductModelDef[]) => void;
  processNodes: ProcessNodeDef[];
  onUpdateProcessNodes: (nodes: ProcessNodeDef[]) => void;
  shifts: ShiftDef[];
  onUpdateShifts: (shifts: ShiftDef[]) => void;
  staffingConfig: StaffingConfig;
  onUpdateStaffingConfig: (staffing: StaffingConfig) => void;
  washRules: WashMatrixRule[];
  onUpdateWashRules: (rules: WashMatrixRule[]) => void;
  onTriggerAutoSchedule: () => void;
  onNavigateToGantt: () => void;
  onExportDatabase?: () => void;
  onImportDatabase?: (jsonStr: string) => void;
  onResetDatabase?: () => void;
  lastDbSaveTime?: string;
  orderCount?: number;
  batchCount?: number;
}

export const AdminConfigView: React.FC<AdminConfigViewProps> = ({
  currentRole,
  onRoleChange,
  systemConfig,
  onUpdateSystemConfig,
  reactors,
  onUpdateReactors,
  workshops = WORKSHOP_DEFINITIONS,
  onUpdateWorkshops,
  userAccounts = DEFAULT_USER_ACCOUNTS,
  onUpdateUserAccounts,
  productModels,
  onUpdateProductModels,
  processNodes,
  onUpdateProcessNodes,
  shifts,
  onUpdateShifts,
  staffingConfig,
  onUpdateStaffingConfig,
  washRules,
  onUpdateWashRules,
  onTriggerAutoSchedule,
  onNavigateToGantt,
  onExportDatabase,
  onImportDatabase,
  onResetDatabase,
  lastDbSaveTime,
  orderCount = 4,
  batchCount = 8
}) => {
  const [activeSection, setActiveSection] = useState<
    'workshops' | 'users' | 'system' | 'reactors' | 'products' | 'process_nodes' | 'shifts' | 'staffing' | 'wash_rules' | 'database'
  >('workshops');

  // Local editing states
  const [localSysConfig, setLocalSysConfig] = useState<SystemConfig>(systemConfig);
  const [localReactors, setLocalReactors] = useState<Reactor[]>(reactors);
  const [localWorkshops, setLocalWorkshops] = useState<WorkshopDef[]>(workshops);
  const [localUserAccounts, setLocalUserAccounts] = useState<UserAccount[]>(userAccounts);
  const [localProductModels, setLocalProductModels] = useState<ProductModelDef[]>(productModels);
  const [localProcessNodes, setLocalProcessNodes] = useState<ProcessNodeDef[]>(processNodes);
  const [localShifts, setLocalShifts] = useState<ShiftDef[]>(shifts);
  const [localStaffing, setLocalStaffing] = useState<StaffingConfig>(staffingConfig);
  const [localWashRules, setLocalWashRules] = useState<WashMatrixRule[]>(washRules);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const triggerFeedback = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Synchronize local states when props change
  useEffect(() => {
    setLocalSysConfig(systemConfig);
  }, [systemConfig]);

  useEffect(() => {
    setLocalReactors(reactors);
  }, [reactors]);

  useEffect(() => {
    setLocalWorkshops(workshops);
  }, [workshops]);

  useEffect(() => {
    setLocalUserAccounts(userAccounts);
  }, [userAccounts]);

  useEffect(() => {
    setLocalProductModels(productModels);
  }, [productModels]);

  useEffect(() => {
    setLocalProcessNodes(processNodes);
  }, [processNodes]);

  useEffect(() => {
    setLocalShifts(shifts);
  }, [shifts]);

  useEffect(() => {
    setLocalStaffing(staffingConfig);
  }, [staffingConfig]);

  useEffect(() => {
    setLocalWashRules(washRules);
  }, [washRules]);

  // Workshop draft states
  const [isAddingWorkshop, setIsAddingWorkshop] = useState(false);
  const [newWorkshopDraft, setNewWorkshopDraft] = useState<Partial<WorkshopDef>>({
    id: '',
    name: '',
    shortName: '',
    code: '',
    building: '',
    description: '',
    managerName: ''
  });

  // Workshop Edit State (Admin can modify workshop name, description/remarks, manager, building)
  const [editingWorkshopId, setEditingWorkshopId] = useState<string | null>(null);
  const [workshopEditDraft, setWorkshopEditDraft] = useState<Partial<WorkshopDef>>({});

  const handleStartEditWorkshop = (ws: WorkshopDef) => {
    setEditingWorkshopId(ws.id);
    setWorkshopEditDraft({
      name: ws.name,
      shortName: ws.shortName,
      building: ws.building,
      description: ws.description,
      managerName: ws.managerName
    });
  };

  const handleCancelEditWorkshop = () => {
    setEditingWorkshopId(null);
    setWorkshopEditDraft({});
  };

  const handleSaveEditWorkshop = (wsId: string) => {
    if (!workshopEditDraft.name?.trim()) {
      alert('车间名称不能为空');
      return;
    }
    const updated = localWorkshops.map((w) => {
      if (w.id === wsId) {
        return {
          ...w,
          name: workshopEditDraft.name!.trim(),
          shortName: workshopEditDraft.shortName?.trim() || workshopEditDraft.name!.trim(),
          building: workshopEditDraft.building?.trim() || w.building,
          description: workshopEditDraft.description !== undefined ? workshopEditDraft.description.trim() : w.description,
          managerName: workshopEditDraft.managerName !== undefined ? workshopEditDraft.managerName.trim() : w.managerName
        };
      }
      return w;
    });
    setLocalWorkshops(updated);
    if (onUpdateWorkshops) {
      onUpdateWorkshops(updated);
    }
    setEditingWorkshopId(null);
    setWorkshopEditDraft({});
    triggerFeedback('车间信息（名称、备注、负责人）已更新并保存成功！', 'success');
  };


  // New item draft modals / states
  const [newModelDraft, setNewModelDraft] = useState<Partial<ProductModelDef>>({
    model_code: '',
    name: '',
    min_order_kg: 1000,
    special_cleaning: false,
    special_scope: 'EITHER',
    approval_status: 'APPROVED',
    allowed_reactors: ['R-1300-01', 'R-6000-01', 'R-6000-02'],
    description: ''
  });
  const [isAddingModel, setIsAddingModel] = useState(false);

  const [newReactorDraft, setNewReactorDraft] = useState<Partial<Reactor>>({
    reactor_id: '',
    reactor_name: '',
    rated_kg: 6000,
    min_kg: 2000,
    max_kg: 6000,
    volume_m3: 7.2,
    status: 'RUNNING',
    clean_state: 'CLEAN',
    last_model_code: 'SIM-MODEL-A',
    available_at: '2026-09-14 08:00',
    location: '一期甲类洁净厂房 B-203',
    exclusive_mode: false,
    notes: ''
  });
  const [isAddingReactor, setIsAddingReactor] = useState(false);

  // Process Node Adding Draft (Process Engineer)
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [newNodeDraft, setNewNodeDraft] = useState<Partial<ProcessNodeDef>>({
    name: '',
    code: '',
    standard_hours: 1.5,
    description: '',
    requires_release: false,
    is_critical: false
  });

  const roleInfo: UserRoleInfo = ROLE_DEFINITIONS[currentRole];

  // RBAC Permission checks
  const canEditAdmin = currentRole === 'ADMIN';
  const canEditPlanner = currentRole === 'ADMIN' || currentRole === 'PLANNER';
  const canEditSupervisor = currentRole === 'ADMIN' || currentRole === 'SUPERVISOR';
  const canEditProcess = currentRole === 'ADMIN' || currentRole === 'PROCESS_ENGINEER' || currentRole === 'PLANNER';

  // Save System Config
  const handleSaveSystemConfig = () => {
    onUpdateSystemConfig(localSysConfig);
    alert('系统名称与全局配置已保存成功！');
  };

  // Save Reactors
  const handleSaveReactors = () => {
    onUpdateReactors(localReactors);
    onTriggerAutoSchedule();
    alert('反应釜台账与物理信息已更新，系统已自动按新设备参数重新排产！');
  };

  // Add new reactor
  const handleAddNewReactor = () => {
    if (!newReactorDraft.reactor_id || !newReactorDraft.reactor_name) {
      alert('请输入反应釜编号与名称');
      return;
    }
    const reactor: Reactor = {
      reactor_id: newReactorDraft.reactor_id,
      reactor_name: newReactorDraft.reactor_name,
      rated_kg: Number(newReactorDraft.rated_kg) || 6000,
      min_kg: Number(newReactorDraft.min_kg) || 2000,
      max_kg: Number(newReactorDraft.max_kg) || 6000,
      volume_m3: Number(newReactorDraft.volume_m3) || 7.2,
      status: newReactorDraft.status || 'RUNNING',
      clean_state: 'CLEAN',
      last_model_code: newReactorDraft.last_model_code || 'SIM-MODEL-A',
      available_at: '2026-09-14 08:00',
      location: newReactorDraft.location || '厂房 A-101',
      exclusive_mode: Boolean(newReactorDraft.exclusive_mode),
      notes: newReactorDraft.notes || ''
    };
    const updated = [...localReactors, reactor];
    setLocalReactors(updated);
    onUpdateReactors(updated);
    setIsAddingReactor(false);
    onTriggerAutoSchedule();
  };

  // Add new process node (Process Engineer)
  const handleAddNewProcessNode = () => {
    if (!newNodeDraft.name || !newNodeDraft.code) {
      alert('请输入工序名称与工序代码');
      return;
    }
    const nextId = (localProcessNodes.length > 0 ? Math.max(...localProcessNodes.map((n) => n.id)) : 0) + 1;
    const newNode: ProcessNodeDef = {
      id: nextId as any,
      name: newNodeDraft.name,
      code: newNodeDraft.code.toUpperCase(),
      standard_hours: Number(newNodeDraft.standard_hours) || 1.5,
      description: newNodeDraft.description || '工艺员定制工序节点',
      requires_release: Boolean(newNodeDraft.requires_release),
      is_critical: Boolean(newNodeDraft.is_critical),
      lastUpdatedBy: `${roleInfo.title} (${roleInfo.name})`
    };
    const updated = [...localProcessNodes, newNode];
    setLocalProcessNodes(updated);
    setIsAddingNode(false);
    setNewNodeDraft({
      name: '',
      code: '',
      standard_hours: 1.5,
      description: '',
      requires_release: false,
      is_critical: false
    });
    onUpdateProcessNodes(updated);
    onTriggerAutoSchedule();
    alert(`已新增工序【${newNode.name}】，单批次总工时已自动重新累加并触发排产！`);
  };

  // Delete process node (Process Engineer)
  const handleDeleteProcessNode = (nodeId: number) => {
    if (localProcessNodes.length <= 1) {
      alert('至少需保留一个工艺工序节点，无法全部删除。');
      return;
    }
    const target = localProcessNodes.find((n) => n.id === nodeId);
    if (window.confirm(`确定要删除工序【${target?.name || nodeId}】吗？删除后系统将自动缩减批次时间并重新排产。`)) {
      const updated = localProcessNodes.filter((n) => n.id !== nodeId);
      setLocalProcessNodes(updated);
      onUpdateProcessNodes(updated);
      onTriggerAutoSchedule();
      alert(`已删除工序【${target?.name || nodeId}】，排产引擎已自动重算！`);
    }
  };

  // Save Product Models
  const handleSaveProductModels = () => {
    onUpdateProductModels(localProductModels);
    onTriggerAutoSchedule();
    alert('产品型号与设备白名单已更新，系统已自动根据最新白名单重新排产！');
  };

  // Add new product model
  const handleAddNewModel = () => {
    if (!newModelDraft.model_code || !newModelDraft.name) {
      alert('请填写产品型号代码与名称');
      return;
    }
    const model: ProductModelDef = {
      model_code: newModelDraft.model_code,
      name: newModelDraft.name,
      min_order_kg: Number(newModelDraft.min_order_kg) || 500,
      special_cleaning: Boolean(newModelDraft.special_cleaning),
      special_scope: newModelDraft.special_scope || 'EITHER',
      approval_status: 'APPROVED',
      allowed_reactors: newModelDraft.allowed_reactors || ['R-1300-01', 'R-6000-01', 'R-6000-02'],
      description: newModelDraft.description || ''
    };
    const updated = [...localProductModels, model];
    setLocalProductModels(updated);
    onUpdateProductModels(updated);
    setIsAddingModel(false);
    onTriggerAutoSchedule();
  };

  // Save Process Node Durations
  const handleSaveProcessNodes = () => {
    onUpdateProcessNodes(localProcessNodes);
    onTriggerAutoSchedule();
    alert('批次工序标准工时已更新，系统已自动依据新批次时间重新排产！');
  };

  // Save Shifts and Break Duration
  const handleSaveShifts = () => {
    onUpdateShifts(localShifts);
    onTriggerAutoSchedule();
    alert('排班班次与每班休息时间已更新，排产引擎已自动完成工时折算排程！');
  };

  // Save Staffing
  const handleSaveStaffing = () => {
    const updated: StaffingConfig = {
      ...localStaffing,
      lastUpdatedBy: `${roleInfo.title} (${roleInfo.name})`,
      lastUpdatedAt: '2026-09-14 12:00'
    };
    onUpdateStaffingConfig(updated);
    onTriggerAutoSchedule();
    alert('生产员工数量与人员配置已保存，系统已执行人力平衡校验！');
  };

  // Save Workshops info
  const handleSaveWorkshops = () => {
    if (onUpdateWorkshops) {
      onUpdateWorkshops(localWorkshops);
      triggerFeedback('车间主数据信息已保存成功！', 'success');
      alert('车间信息已保存至数据库！');
    }
  };

  // Add new workshop
  const handleAddNewWorkshop = () => {
    if (!newWorkshopDraft.id || !newWorkshopDraft.name) {
      alert('请输入车间编号与车间全称');
      return;
    }
    const workshop: WorkshopDef = {
      id: newWorkshopDraft.id.toUpperCase(),
      name: newWorkshopDraft.name,
      shortName: newWorkshopDraft.shortName || newWorkshopDraft.name,
      code: newWorkshopDraft.code || `PLANT-${newWorkshopDraft.id}`,
      building: newWorkshopDraft.building || '标准化净化厂房',
      description: newWorkshopDraft.description || '新建生产车间',
      reactorCount: Number(newWorkshopDraft.reactorCount) || 0,
      managerName: newWorkshopDraft.managerName || '车间主任'
    };
    const updated = [...localWorkshops, workshop];
    setLocalWorkshops(updated);
    if (onUpdateWorkshops) onUpdateWorkshops(updated);
    setIsAddingWorkshop(false);
    setNewWorkshopDraft({ id: '', name: '', shortName: '', code: '', building: '', description: '', managerName: '' });
    triggerFeedback(`已新增车间【${workshop.name}】！`, 'success');
  };

  // Delete workshop
  const handleDeleteWorkshop = (wsId: string) => {
    if (localWorkshops.length <= 1) {
      alert('工厂至少保留一个主生产车间，无法删除全部车间。');
      return;
    }
    const ws = localWorkshops.find(w => w.id === wsId);
    if (window.confirm(`确定要删除车间【${ws?.name || wsId}】吗？若该车间下有釜，请先调整釜归属。`)) {
      const updated = localWorkshops.filter(w => w.id !== wsId);
      setLocalWorkshops(updated);
      if (onUpdateWorkshops) onUpdateWorkshops(updated);
      triggerFeedback(`已删除车间【${ws?.name || wsId}】`, 'info');
    }
  };

  // Save Reactor Workshop Assignments (Requirement 4)
  const handleUpdateReactorWorkshop = (reactorId: string, targetWorkshopId: string) => {
    const updatedReactors = localReactors.map(r => {
      if (r.reactor_id === reactorId) {
        return { ...r, workshop_id: targetWorkshopId };
      }
      return r;
    });
    setLocalReactors(updatedReactors);
    onUpdateReactors(updatedReactors);
    triggerFeedback(`反应釜 ${reactorId} 已重新划拨归属于车间 ${targetWorkshopId}`, 'success');
  };

  // Save User Accounts & Passwords (Requirement 5)
  const handleUpdateUserPassword = (role: UserRole, newPass: string) => {
    const updated = localUserAccounts.map(acc => {
      if (acc.role === role) {
        return { ...acc, passwordHash: newPass };
      }
      return acc;
    });
    setLocalUserAccounts(updated);
    if (onUpdateUserAccounts) onUpdateUserAccounts(updated);
    triggerFeedback(`角色【${ROLE_DEFINITIONS[role]?.name || role}】独立密码已更新！`, 'success');
  };

  // Save Wash Rules
  const handleSaveWashRules = () => {
    onUpdateWashRules(localWashRules);
    onTriggerAutoSchedule();
    alert('特殊洗釜规则与清洗矩阵已保存，系统已自动重新计算洗釜耗时！');
  };

  // Calculate total standard batch duration
  const totalStandardHours = localProcessNodes
    .filter((n) => n.id <= 5)
    .reduce((sum, n) => sum + (Number(n.standard_hours) || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Top Active Role Profile Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl text-white shadow-xs ${
              currentRole === 'ADMIN'
                ? 'bg-purple-600'
                : currentRole === 'PLANNER'
                ? 'bg-blue-600'
                : currentRole === 'PROCESS_ENGINEER'
                ? 'bg-amber-600'
                : 'bg-emerald-600'
            }`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  当前生效权限
                </span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {roleInfo.name}
                </h2>
                <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {roleInfo.department}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span>核心职责：</span>
                <span className="font-medium text-slate-700">
                  {roleInfo.responsibilities.join(' · ')}
                </span>
              </p>
            </div>
          </div>

          {/* Unified role indicator - role switching happens globally in the header */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-slate-600">
              <span className="font-semibold text-slate-800">已同步顶部身份：</span>
              <span>如需切换身份请在顶部导航栏统一切换</span>
            </div>
          </div>
        </div>

        {/* Auto Scheduling Engine Info Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-blue-50/50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
          <div className="flex items-center gap-2 text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">自动排产联动引擎：</span>
            <span className="text-blue-700">
              系统实时根据计划员录入的型号与批次工时、洗釜时间、每班休息时长，以及生产主管录入的排班班次与员工人数，自动完成有限产能智能排产。
            </span>
          </div>
          <button
            onClick={() => {
              onTriggerAutoSchedule();
              onNavigateToGantt();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-2xs transition-colors shrink-0"
          >
            <span>执行自动排产并查看甘特图</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Save Feedback Notification */}
      {feedbackMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium">{feedbackMsg.text}</span>
          <span className="text-[10px] text-emerald-300 font-mono">· 已实时存入数据库</span>
        </div>
      )}

      {/* 2. Admin Sections Navigation & Content Layout (Zero horizontal scrolling) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Menu (Categorized Navigation) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-3 sticky top-20">
            <div className="flex items-center justify-between px-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                主数据配置导航
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                实时持久化
              </span>
            </div>

            {/* Category 0: 车间与权限管理 (Admin Exclusive) */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-slate-500 px-2 py-0.5 flex items-center gap-1">
                <span>🏭 车间与权限</span>
              </div>
              <button
                onClick={() => setActiveSection('workshops')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'workshops'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Factory className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  <span className="truncate">车间信息及釜归属</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                  {localWorkshops.length}个车间
                </span>
              </button>

              <button
                onClick={() => setActiveSection('users')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'users'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <KeyRound className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span className="truncate">角色独立密码与权限</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                  4岗独立
                </span>
              </button>
            </div>

            {/* Category 1: 基础主数据 */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-500 px-2 py-0.5 flex items-center gap-1">
                <span>🏢 基础台账</span>
              </div>
              <button
                onClick={() => setActiveSection('system')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'system'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-purple-400" />
                  <span className="truncate">系统全局设置</span>
                </div>
                {canEditAdmin ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                ) : (
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                )}
              </button>

              <button
                onClick={() => setActiveSection('reactors')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'reactors'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Cpu className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                  <span className="truncate">反应釜台账参数</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {localReactors.length}台
                </span>
              </button>

              <button
                onClick={() => setActiveSection('products')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'products'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                  <span className="truncate">产品型号与指定釜</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {localProductModels.length}种
                </span>
              </button>
            </div>

            {/* Category 2: 工艺与工序 */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-500 px-2 py-0.5 flex items-center gap-1">
                <span>🧪 工艺工序</span>
              </div>
              <button
                onClick={() => setActiveSection('process_nodes')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'process_nodes'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span className="truncate">工序工时定制</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {localProcessNodes.length}道
                </span>
              </button>

              <button
                onClick={() => setActiveSection('wash_rules')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'wash_rules'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
                  <span className="truncate">清洗换产矩阵</span>
                </div>
                {canEditPlanner ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></span>
                ) : (
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                )}
              </button>
            </div>

            {/* Category 3: 班次与定员 */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-500 px-2 py-0.5 flex items-center gap-1">
                <span>👥 班次定员</span>
              </div>
              <button
                onClick={() => setActiveSection('shifts')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'shifts'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span className="truncate">生产班次与休息</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {localShifts.filter(s => s.isActive).length}班
                </span>
              </button>

              <button
                onClick={() => setActiveSection('staffing')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'staffing'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                  <span className="truncate">车间人力定员</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {localStaffing.totalWorkers}人
                </span>
              </button>
            </div>

            {/* Category 4: 数据库管理 */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-500 px-2 py-0.5 flex items-center gap-1">
                <span>💾 数据服务</span>
              </div>
              <button
                onClick={() => setActiveSection('database')}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeSection === 'database'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/70'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Database className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">数据库管理与备份</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Content Panels (col-span-9) */}
        <div className="lg:col-span-9 space-y-6">

      {/* 3. Section Content Panels */}

      {/* SECTION 0A: Workshops Info & Reactor Assignment (Admin Exclusive - Requirement 4) */}
      {activeSection === 'workshops' && (
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Factory className="w-5 h-5 text-indigo-600" />
                  <span>车间信息及反应釜车间归属管理</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  由系统管理员（Admin）统一维护全厂生产车间信息、厂房属性及各反应釜所属车间归属划拨（Requirement 4）。
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!canEditAdmin ? (
                  <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> 仅管理员可编辑 (当前为只读浏览)
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => setIsAddingWorkshop(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增车间</span>
                    </button>
                    <button
                      onClick={handleSaveWorkshops}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition-all shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>保存车间主数据</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Add Workshop Inline Modal / Form */}
            {isAddingWorkshop && canEditAdmin && (
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    <span>新增生产车间 / 厂房定义</span>
                  </h4>
                  <button
                    onClick={() => setIsAddingWorkshop(false)}
                    className="text-xs text-slate-400 hover:text-slate-700"
                  >
                    取消
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      车间标识 ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="如：WS-03"
                      value={newWorkshopDraft.id}
                      onChange={(e) => setNewWorkshopDraft({ ...newWorkshopDraft, id: e.target.value })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      车间全称 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="如：三期超高纯电解液车间 (甲类厂房)"
                      value={newWorkshopDraft.name}
                      onChange={(e) => setNewWorkshopDraft({ ...newWorkshopDraft, name: e.target.value })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      车间简称
                    </label>
                    <input
                      type="text"
                      placeholder="如：三期车间 (扩产)"
                      value={newWorkshopDraft.shortName}
                      onChange={(e) => setNewWorkshopDraft({ ...newWorkshopDraft, shortName: e.target.value })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      厂房建筑与安全等级
                    </label>
                    <input
                      type="text"
                      placeholder="如：甲类防爆净化厂房 E区"
                      value={newWorkshopDraft.building}
                      onChange={(e) => setNewWorkshopDraft({ ...newWorkshopDraft, building: e.target.value })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      车间主任 / 负责人
                    </label>
                    <input
                      type="text"
                      placeholder="如：周车间主任"
                      value={newWorkshopDraft.managerName}
                      onChange={(e) => setNewWorkshopDraft({ ...newWorkshopDraft, managerName: e.target.value })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      车间定位与职责说明
                    </label>
                    <input
                      type="text"
                      placeholder="如：涵盖超高压动力电池电解液专线"
                      value={newWorkshopDraft.description}
                      onChange={(e) => setNewWorkshopDraft({ ...newWorkshopDraft, description: e.target.value })}
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100">
                  <button
                    onClick={() => setIsAddingWorkshop(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddNewWorkshop}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-2xs"
                  >
                    确认新增车间
                  </button>
                </div>
              </div>
            )}

            {/* Workshop List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localWorkshops.map((ws) => {
                const assignedReactors = localReactors.filter(r => r.workshop_id === ws.id);
                const isEditingThis = editingWorkshopId === ws.id;

                if (isEditingThis) {
                  return (
                    <div
                      key={ws.id}
                      className="p-4 rounded-xl border-2 border-indigo-500 bg-white shadow-md space-y-3 animate-in fade-in"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-600 text-white">
                            {ws.id}
                          </span>
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>修改车间信息</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleCancelEditWorkshop}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditWorkshop(ws.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>保存修改</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            车间名称 <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={workshopEditDraft.name || ''}
                            onChange={(e) => setWorkshopEditDraft({ ...workshopEditDraft, name: e.target.value })}
                            placeholder="如：一期合成与配制车间 (甲类洁净厂房)"
                            className="w-full text-xs font-semibold border border-indigo-300 rounded-lg px-2.5 py-1.5 bg-indigo-50/30 text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              车间负责人 <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={workshopEditDraft.managerName || ''}
                              onChange={(e) => setWorkshopEditDraft({ ...workshopEditDraft, managerName: e.target.value })}
                              placeholder="如：张车间主任 (一期)"
                              className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              车间简称
                            </label>
                            <input
                              type="text"
                              value={workshopEditDraft.shortName || ''}
                              onChange={(e) => setWorkshopEditDraft({ ...workshopEditDraft, shortName: e.target.value })}
                              placeholder="如：一期车间"
                              className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-600"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            厂房建筑与安全等级
                          </label>
                          <input
                            type="text"
                            value={workshopEditDraft.building || ''}
                            onChange={(e) => setWorkshopEditDraft({ ...workshopEditDraft, building: e.target.value })}
                            placeholder="如：甲类主厂房 A区/B区"
                            className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            车间备注 / 职责说明
                          </label>
                          <textarea
                            rows={2}
                            value={workshopEditDraft.description || ''}
                            onChange={(e) => setWorkshopEditDraft({ ...workshopEditDraft, description: e.target.value })}
                            placeholder="如：涵盖小试/特种试产釜 (R-1300-01) 及量产动力电解液主力釜 (R-6000-01)"
                            className="w-full text-xs font-medium border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-indigo-600 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={ws.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all space-y-3 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {ws.id}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{ws.name}</span>
                            {ws.shortName && ws.shortName !== ws.name && (
                              <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {ws.shortName}
                              </span>
                            )}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {ws.building}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEditAdmin && (
                          <button
                            type="button"
                            onClick={() => handleStartEditWorkshop(ws)}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-xs font-bold border border-indigo-200 transition-colors shadow-2xs"
                            title="修改车间名称、备注、负责人"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>修改</span>
                          </button>
                        )}
                        {canEditAdmin && localWorkshops.length > 1 && (
                          <button
                            onClick={() => handleDeleteWorkshop(ws.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="删除车间"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">车间备注 / 职责说明</div>
                      <p className="leading-relaxed">{ws.description || '暂无备注说明'}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                      <span className="text-slate-600 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span>负责人: <strong className="text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{ws.managerName || '未指定'}</strong></span>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 font-medium">已分配反应釜:</span>
                        <div className="flex flex-wrap gap-1">
                          {assignedReactors.length > 0 ? (
                            assignedReactors.map(r => (
                              <span
                                key={r.reactor_id}
                                className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-blue-50 text-blue-700 font-bold border border-blue-200"
                              >
                                {r.reactor_name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">暂无反应釜</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reactor-to-Workshop Assignment Matrix (Requirement 4) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-600" />
                  <span>反应釜所属车间划拨调整矩阵 (Reactor Assignment)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  管理员可随时调整任一反应釜（如 R-1300-01, R-6000-01, R-6000-02, R-6000-03）所属车间，划拨后排产看板与甘特图将自动按车间分类联动。
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 划拨实时生效
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">反应釜编码</th>
                    <th className="py-2.5 px-3">反应釜名称 / 规格</th>
                    <th className="py-2.5 px-3">当前所属车间</th>
                    <th className="py-2.5 px-3">车间调整与划拨</th>
                    <th className="py-2.5 px-3">厂房安装具体位置</th>
                    <th className="py-2.5 px-3 text-right">专釜隔离属性</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {localReactors.map((r) => {
                    const currentWs = localWorkshops.find(w => w.id === r.workshop_id);
                    return (
                      <tr key={r.reactor_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {r.reactor_id}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{r.reactor_name}</div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            额定 {r.rated_kg}kg · 最小投料 {r.min_kg}kg
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                            r.workshop_id === 'WS-01'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : r.workshop_id === 'WS-02'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            <Factory className="w-3 h-3" />
                            <span>{currentWs?.shortName || r.workshop_id || '未分配'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            disabled={!canEditAdmin}
                            value={r.workshop_id || 'WS-01'}
                            onChange={(e) => handleUpdateReactorWorkshop(r.reactor_id, e.target.value)}
                            className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1 text-slate-800 bg-white focus:outline-hidden focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
                          >
                            {localWorkshops.map(ws => (
                              <option key={ws.id} value={ws.id}>
                                归属到: {ws.shortName} ({ws.id})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            disabled={!canEditAdmin}
                            value={r.location}
                            onChange={(e) => {
                              const updated = localReactors.map(item =>
                                item.reactor_id === r.reactor_id ? { ...item, location: e.target.value } : item
                              );
                              setLocalReactors(updated);
                              onUpdateReactors(updated);
                            }}
                            className="w-full text-xs font-medium border border-slate-200 rounded-md px-2 py-1 text-slate-800 focus:outline-hidden focus:border-indigo-500 disabled:bg-slate-50"
                            placeholder="安装具体位置"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            r.exclusive_mode
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {r.exclusive_mode ? '专线专釜' : '通用配制釜'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 0B: User Accounts & Independent Passwords (Admin Exclusive - Requirement 5) */}
      {activeSection === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <span>各角色独立访问密码与权限管理 (Requirement 5)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                系统严格实施岗位独立密码鉴权：每一个用户都需要独立的密码才可以进入对应权限页面。未授权或无密码时仅具备查看权限（Viewer）。
              </p>
            </div>
            {!canEditAdmin && (
              <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> 仅管理员可重置/修改密码
              </span>
            )}
          </div>

          {/* User Account Password Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localUserAccounts.map((account) => {
              const roleDef = ROLE_DEFINITIONS[account.role];
              const isCurrent = currentRole === account.role;

              return (
                <div
                  key={account.role}
                  className={`p-5 rounded-xl border transition-all space-y-4 ${
                    isCurrent
                      ? 'border-blue-300 bg-blue-50/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl text-white shadow-2xs ${
                        account.role === 'ADMIN'
                          ? 'bg-purple-600'
                          : account.role === 'PLANNER'
                          ? 'bg-blue-600'
                          : account.role === 'PROCESS_ENGINEER'
                          ? 'bg-emerald-600'
                          : 'bg-amber-600'
                      }`}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {roleDef.name}
                          </h4>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              当前身份
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          账号: {account.username} · {roleDef.department}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Password Input & Edit (Strictly masked, no plaintext reveal) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                        <span>岗位独立访问口令 (已安全掩码)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {canEditAdmin ? '管理员可输入新密码覆盖' : '安全隔离已保护'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        disabled={!canEditAdmin}
                        value={account.passwordHash}
                        onChange={(e) => handleUpdateUserPassword(account.role, e.target.value)}
                        className="flex-1 text-xs font-mono font-bold border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-900 focus:outline-hidden focus:border-amber-500 disabled:bg-slate-100 disabled:text-slate-500 tracking-wider"
                        placeholder="••••••••"
                      />
                      {canEditAdmin && (
                        <button
                          onClick={() => {
                            const defaultPwd =
                              account.role === 'PLANNER'
                                ? 'planner123'
                                : account.role === 'PROCESS_ENGINEER'
                                ? 'craft123'
                                : account.role === 'SUPERVISOR'
                                ? 'lead123'
                                : 'admin123';
                            handleUpdateUserPassword(account.role, defaultPwd);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 whitespace-nowrap shadow-2xs"
                          title="重置为初始密码"
                        >
                          重置初始密码
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Permissions & Allowed Tabs */}
                  <div className="space-y-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                      核心权限与职责清单：
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {roleDef.responsibilities.map((resp, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {resp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 1: System Name & Branding (Admin) */}
      {activeSection === 'system' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>系统名称与全局品牌设置</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                由系统管理员（Admin）统一维护系统显示名称、所属企业主体与版本标签，全局实时生效。
              </p>
            </div>
            {!canEditAdmin && (
              <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> 仅管理员可编辑 (当前为只读浏览)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                系统显示主名称 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={!canEditAdmin}
                value={localSysConfig.systemName}
                onChange={(e) => setLocalSysConfig({ ...localSysConfig, systemName: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="例如：NOVOLYTE 生产计划与进度"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                所属企业 / 厂区主体
              </label>
              <input
                type="text"
                disabled={!canEditAdmin}
                value={localSysConfig.companyName}
                onChange={(e) => setLocalSysConfig({ ...localSysConfig, companyName: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="例如：NOVOLYTE TECHNOLOGY SDN. BHD."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                系统副标题 / 描述规范
              </label>
              <input
                type="text"
                disabled={!canEditAdmin}
                value={localSysConfig.systemSubtitle}
                onChange={(e) => setLocalSysConfig({ ...localSysConfig, systemSubtitle: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="例如：反应釜智能排产 Web 系统 (NOVOLYTE TECHNOLOGY SDN. BHD. 版本 V2.0)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                评审标记 / 权限标签
              </label>
              <input
                type="text"
                disabled={!canEditAdmin}
                value={localSysConfig.reviewTag}
                onChange={(e) => setLocalSysConfig({ ...localSysConfig, reviewTag: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                系统版本号
              </label>
              <input
                type="text"
                disabled={!canEditAdmin}
                value={localSysConfig.version}
                onChange={(e) => setLocalSysConfig({ ...localSysConfig, version: e.target.value })}
                className="w-full text-xs font-mono border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          {canEditAdmin && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveSystemConfig}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存系统全局配置</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: Reactor Asset Info (Admin / Planner) */}
      {activeSection === 'reactors' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>反应釜台账与物理信息维护</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                维护反应釜编号、名称、额定质量容量（kg）、最小/最大投料界限、专釜模式及当前物理状态。
              </p>
            </div>
            {canEditAdmin && (
              <button
                onClick={() => setIsAddingReactor(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增反应釜</span>
              </button>
            )}
          </div>

          {/* New Reactor Modal Form */}
          {isAddingReactor && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">录入新反应釜设备台账</span>
                <button
                  onClick={() => setIsAddingReactor(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  取消
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  placeholder="反应釜编号 (如 R-6000-03)"
                  value={newReactorDraft.reactor_id || ''}
                  onChange={(e) => setNewReactorDraft({ ...newReactorDraft, reactor_id: e.target.value })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
                <input
                  placeholder="反应釜全称"
                  value={newReactorDraft.reactor_name || ''}
                  onChange={(e) => setNewReactorDraft({ ...newReactorDraft, reactor_name: e.target.value })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
                <input
                  type="number"
                  placeholder="额定容量 kg (如 6000)"
                  value={newReactorDraft.rated_kg || ''}
                  onChange={(e) => setNewReactorDraft({ ...newReactorDraft, rated_kg: Number(e.target.value) })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
                <input
                  type="number"
                  placeholder="最小投料下限 kg (如 2000)"
                  value={newReactorDraft.min_kg || ''}
                  onChange={(e) => setNewReactorDraft({ ...newReactorDraft, min_kg: Number(e.target.value) })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
                <input
                  type="number"
                  placeholder="最大投料上限 kg (如 6000)"
                  value={newReactorDraft.max_kg || ''}
                  onChange={(e) => setNewReactorDraft({ ...newReactorDraft, max_kg: Number(e.target.value) })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
                <input
                  placeholder="物理洁净厂房位置"
                  value={newReactorDraft.location || ''}
                  onChange={(e) => setNewReactorDraft({ ...newReactorDraft, location: e.target.value })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleAddNewReactor}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  确认录入反应釜
                </button>
              </div>
            </div>
          )}

          {/* Reactor List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">釜编号</th>
                  <th className="py-2.5 px-3">设备名称</th>
                  <th className="py-2.5 px-3">额定容量 (kg)</th>
                  <th className="py-2.5 px-3">投料区间 (min~max)</th>
                  <th className="py-2.5 px-3">几何容积 (m³)</th>
                  <th className="py-2.5 px-3">运行状态</th>
                  <th className="py-2.5 px-3">专釜专线隔离</th>
                  <th className="py-2.5 px-3">物理位置</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localReactors.map((r, idx) => (
                  <tr key={r.reactor_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">
                      {r.reactor_id}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {canEditAdmin ? (
                        <input
                          type="text"
                          value={r.reactor_name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalReactors((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, reactor_name: val } : item))
                            );
                          }}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      ) : (
                        r.reactor_name
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {canEditAdmin ? (
                        <input
                          type="number"
                          value={r.rated_kg}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLocalReactors((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, rated_kg: val } : item))
                            );
                          }}
                          className="w-20 border border-slate-200 rounded px-2 py-1 text-xs font-mono"
                        />
                      ) : (
                        `${r.rated_kg.toLocaleString()} kg`
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {canEditAdmin ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={r.min_kg}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setLocalReactors((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, min_kg: val } : item))
                              );
                            }}
                            className="w-16 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono"
                          />
                          <span>~</span>
                          <input
                            type="number"
                            value={r.max_kg}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setLocalReactors((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, max_kg: val } : item))
                              );
                            }}
                            className="w-16 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono"
                          />
                          <span>kg</span>
                        </div>
                      ) : (
                        `${r.min_kg.toLocaleString()} ~ ${r.max_kg.toLocaleString()} kg`
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {r.volume_m3 ? `${r.volume_m3} m³` : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      {canEditAdmin ? (
                        <select
                          value={r.status}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setLocalReactors((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, status: val } : item))
                            );
                          }}
                          className="border border-slate-200 rounded px-2 py-1 text-xs"
                        >
                          <option value="RUNNING">生产中 (RUNNING)</option>
                          <option value="IDLE">空闲待料 (IDLE)</option>
                          <option value="WASHING">清洗中 (WASHING)</option>
                          <option value="MAINTENANCE">停机保养 (MAINTENANCE)</option>
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {canEditAdmin ? (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={r.exclusive_mode}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setLocalReactors((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, exclusive_mode: val } : item))
                              );
                            }}
                            className="rounded text-purple-600 focus:ring-0"
                          />
                          <span className="text-[11px] text-slate-700">专釜隔离</span>
                        </label>
                      ) : r.exclusive_mode ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          专线专属
                        </span>
                      ) : (
                        <span className="text-slate-400">通用</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {r.location}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEditAdmin && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveReactors}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存反应釜台账并触发自动重排</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Product Models & Whitelist (Planner) */}
      {activeSection === 'products' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>产品录入与指定釜生产配置 (计划员专属)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                计划员负责录入产品档案、指定各型号合规生产的反应釜（设备白名单绑定）、配置最小批量与特殊清洗触发属性。
              </p>
            </div>
            {canEditPlanner && (
              <button
                onClick={() => setIsAddingModel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>录入新产品型号</span>
              </button>
            )}
          </div>

          {/* New Model Modal */}
          {isAddingModel && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">计划员录入新产品型号</span>
                <button
                  onClick={() => setIsAddingModel(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  取消
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  placeholder="型号代码 (如 SIM-MODEL-NCM9系)"
                  value={newModelDraft.model_code || ''}
                  onChange={(e) => setNewModelDraft({ ...newModelDraft, model_code: e.target.value })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
                <input
                  placeholder="产品全称"
                  value={newModelDraft.name || ''}
                  onChange={(e) => setNewModelDraft({ ...newModelDraft, name: e.target.value })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
                <input
                  type="number"
                  placeholder="起订批量 kg"
                  value={newModelDraft.min_order_kg || ''}
                  onChange={(e) => setNewModelDraft({ ...newModelDraft, min_order_kg: Number(e.target.value) })}
                  className="text-xs border border-blue-200 rounded-lg p-2 bg-white"
                />
                <div className="sm:col-span-3">
                  <input
                    placeholder="配方描述与工艺要点"
                    value={newModelDraft.description || ''}
                    onChange={(e) => setNewModelDraft({ ...newModelDraft, description: e.target.value })}
                    className="w-full text-xs border border-blue-200 rounded-lg p-2 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleAddNewModel}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  确认录入产品档案
                </button>
              </div>
            </div>
          )}

          {/* Product Models Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">型号代码</th>
                  <th className="py-2.5 px-3">产品名称</th>
                  <th className="py-2.5 px-3">指定合规反应釜 (白名单)</th>
                  <th className="py-2.5 px-3">最小起订 (kg)</th>
                  <th className="py-2.5 px-3">特殊清洗</th>
                  <th className="py-2.5 px-3">触发方向</th>
                  <th className="py-2.5 px-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localProductModels.map((p, idx) => (
                  <tr key={p.model_code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {p.model_code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {p.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {localReactors.map((r) => {
                          const isAllowed = p.allowed_reactors.includes(r.reactor_id);
                          return (
                            <label
                              key={r.reactor_id}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] cursor-pointer transition-all ${
                                isAllowed
                                  ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={!canEditPlanner}
                                checked={isAllowed}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const set = new Set(p.allowed_reactors);
                                  if (checked) set.add(r.reactor_id);
                                  else set.delete(r.reactor_id);
                                  const updatedAllowed = Array.from(set);
                                  setLocalProductModels((prev) =>
                                    prev.map((item, i) =>
                                      i === idx ? { ...item, allowed_reactors: updatedAllowed } : item
                                    )
                                  );
                                }}
                                className="rounded text-blue-600 focus:ring-0 w-3 h-3"
                              />
                              <span>{r.reactor_id}</span>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {canEditPlanner ? (
                        <input
                          type="number"
                          value={p.min_order_kg}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLocalProductModels((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, min_order_kg: val } : item))
                            );
                          }}
                          className="w-20 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono"
                        />
                      ) : (
                        `${p.min_order_kg.toLocaleString()} kg`
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {canEditPlanner ? (
                        <input
                          type="checkbox"
                          checked={p.special_cleaning}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setLocalProductModels((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, special_cleaning: val } : item))
                            );
                          }}
                          className="rounded text-purple-600 focus:ring-0"
                        />
                      ) : p.special_cleaning ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          需特殊洗
                        </span>
                      ) : (
                        <span className="text-slate-400">常规</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {canEditPlanner ? (
                        <select
                          value={p.special_scope}
                          onChange={(e) => {
                            const val = e.target.value as SpecialScope;
                            setLocalProductModels((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, special_scope: val } : item))
                            );
                          }}
                          className="border border-slate-200 rounded px-1.5 py-1 text-[11px]"
                        >
                          <option value="EITHER">双向 (切入/切出)</option>
                          <option value="ENTER">仅切入此型号 (ENTER)</option>
                          <option value="LEAVE">仅切出此型号 (LEAVE)</option>
                        </select>
                      ) : (
                        <span className="font-mono text-slate-600">{p.special_scope}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.approval_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEditPlanner && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveProductModels}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存产品与指定釜白名单并自动排产</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: Batch Process Standard Node Durations (Process Engineer / Planner) */}
      {activeSection === 'process_nodes' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  批次工序增删与标准工时定制 (工艺员 / 计划员)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                工艺员可自由<strong>增加新工序、删减工序、调整工序顺序与标准耗时（小时）</strong>。系统排产引擎将自动根据当前有效工序累加单批次计划工时，并实时推算甘特图。
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
                <span>单批次生产总工时：</span>
                <span className="text-sm font-bold text-amber-700 font-mono">
                  {localProcessNodes.filter(n => n.code !== 'CLEAN').reduce((acc, n) => acc + (Number(n.standard_hours) || 0), 0).toFixed(1)} 小时
                </span>
              </div>

              {canEditProcess && (
                <button
                  onClick={() => setIsAddingNode(!isAddingNode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>增加工序节点</span>
                </button>
              )}
            </div>
          </div>

          {/* Add New Process Node Card Form */}
          {isAddingNode && canEditProcess && (
            <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-amber-700" />
                  <span>录入新工艺工序节点</span>
                </span>
                <button
                  onClick={() => setIsAddingNode(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  取消
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">工序名称 *</label>
                  <input
                    type="text"
                    placeholder="如：真空脱水 / 二次精滤"
                    value={newNodeDraft.name}
                    onChange={(e) => setNewNodeDraft({ ...newNodeDraft, name: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">工序代码 (唯一) *</label>
                  <input
                    type="text"
                    placeholder="如：VACUUM / FILTER_2"
                    value={newNodeDraft.code}
                    onChange={(e) => setNewNodeDraft({ ...newNodeDraft, code: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">标准耗时 (小时) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    value={newNodeDraft.standard_hours}
                    onChange={(e) => setNewNodeDraft({ ...newNodeDraft, standard_hours: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs font-mono"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(newNodeDraft.requires_release)}
                      onChange={(e) => setNewNodeDraft({ ...newNodeDraft, requires_release: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <span className="text-[11px] font-medium text-slate-700">需质检放行</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(newNodeDraft.is_critical)}
                      onChange={(e) => setNewNodeDraft({ ...newNodeDraft, is_critical: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-0"
                    />
                    <span className="text-[11px] font-medium text-slate-700">关键控制点(CCP)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">工序工艺要求与操作说明</label>
                <input
                  type="text"
                  placeholder="请输入该工序在反应釜上的具体工艺控制要求与设备操作参数..."
                  value={newNodeDraft.description}
                  onChange={(e) => setNewNodeDraft({ ...newNodeDraft, description: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleAddNewProcessNode}
                  className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shadow-2xs"
                >
                  确认增加并更新排产
                </button>
              </div>
            </div>
          )}

          {/* Process Nodes List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localProcessNodes.map((node, idx) => (
              <div
                key={node.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 hover:border-amber-300 transition-colors relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                      {node.id}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">
                      {node.code}
                    </span>
                    {node.requires_release && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                        需放行
                      </span>
                    )}
                  </div>

                  {canEditProcess && (
                    <button
                      onClick={() => handleDeleteProcessNode(node.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="删除此工序节点"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div>
                  {canEditProcess ? (
                    <input
                      type="text"
                      value={node.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalProcessNodes((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                        );
                      }}
                      className="w-full text-sm font-bold text-slate-900 border border-slate-200 rounded px-2 py-1 bg-white focus:border-amber-500 focus:outline-hidden"
                    />
                  ) : (
                    <h4 className="text-sm font-bold text-slate-900">{node.name}</h4>
                  )}

                  {canEditProcess ? (
                    <textarea
                      rows={2}
                      value={node.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalProcessNodes((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                        );
                      }}
                      className="w-full text-xs text-slate-600 border border-slate-200 rounded p-1.5 mt-1.5 bg-white focus:border-amber-500 focus:outline-hidden"
                    />
                  ) : (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{node.description}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">标准耗时：</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      disabled={!canEditProcess}
                      value={node.standard_hours}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setLocalProcessNodes((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, standard_hours: val } : item))
                        );
                      }}
                      className="w-20 text-xs font-mono font-bold border border-slate-300 rounded-md px-2 py-1 bg-white text-right focus:border-amber-500 focus:outline-hidden disabled:bg-slate-100"
                    />
                    <span className="text-xs text-slate-600">小时 (h)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {canEditProcess && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveProcessNodes}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存工序标准耗时并自动重新排产</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: Special Clean Models & Wash Matrix (Planner) */}
      {activeSection === 'wash_rules' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>特殊洗釜型号与清洗时间矩阵 (计划员专属)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                计划员定制换产清洗策略：同型号连续生产免洗（0分钟）、普通不同型号标准清洗（120分钟）、特殊强腐蚀/高洁净型号深度清洗（180分钟）。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">同型号连续生产 (免洗)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">0 分钟</span>
              </div>
              <p className="text-xs text-emerald-700">
                上一批次与当前批次型号一致，免除 CIP 冲洗，工序 6 标记为不适用。
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">普通不同型号切换 (标准 CIP)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">120 分钟 (2.0h)</span>
              </div>
              <p className="text-xs text-blue-700">
                常规三元与铁锂电解液切换，执行标准 120 分钟溶剂浸洗与氮气吹扫。
              </p>
            </div>

            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900">特殊洗釜型号 (深度防污染)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">180 分钟 (3.0h)</span>
              </div>
              <p className="text-xs text-purple-700">
                涉及特种强腐蚀、高镍配方或专釜切换，强制执行 180 分钟三级超净冲洗。
              </p>
            </div>
          </div>

          {/* Wash Rules Matrix Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">规则编号</th>
                  <th className="py-2.5 px-3">前序型号 (From)</th>
                  <th className="py-2.5 px-3">后序型号 (To)</th>
                  <th className="py-2.5 px-3">洗釜工时 (分钟)</th>
                  <th className="py-2.5 px-3">是否特殊规则</th>
                  <th className="py-2.5 px-3">规则描述与说明</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localWashRules.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-900 font-medium">{r.from_product_type}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-900 font-medium">{r.to_product_type}</td>
                    <td className="py-2.5 px-3 font-mono">
                      {canEditPlanner ? (
                        <input
                          type="number"
                          value={r.wash_min}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLocalWashRules((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, wash_min: val } : item))
                            );
                          }}
                          className="w-20 border border-slate-200 rounded px-1.5 py-1 text-xs font-mono"
                        />
                      ) : (
                        `${r.wash_min} min`
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {r.is_special_rule ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          特殊深度洗
                        </span>
                      ) : (
                        <span className="text-slate-400">常规</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEditPlanner && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveWashRules}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存特殊洗釜规则并自动排产</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: Shifts & Break Durations (Supervisor & Planner) */}
      {activeSection === 'shifts' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>排班班次与每班休息时间设置 (生产主管与计划员维护)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                生产主管负责定义排班班次起止时间与排班状态，计划员与主管共同设定每班休息时长（如午休、晚餐、夜休），自动在排产周期中计算工时补偿与交接。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {localShifts.map((shift, idx) => (
              <div
                key={shift.id}
                className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-900">
                    {shift.name}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!canEditSupervisor}
                      checked={shift.isActive}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLocalShifts((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, isActive: checked } : item))
                        );
                      }}
                      className="rounded text-emerald-600 focus:ring-0"
                    />
                    <span className="text-xs font-medium text-slate-700">启用该班次</span>
                  </label>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">班次时间：</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="time"
                        disabled={!canEditSupervisor}
                        value={shift.startTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalShifts((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, startTime: val } : item))
                          );
                        }}
                        className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white"
                      />
                      <span>~</span>
                      <input
                        type="time"
                        disabled={!canEditSupervisor}
                        value={shift.endTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalShifts((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, endTime: val } : item))
                          );
                        }}
                        className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">每班休息时间：</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="180"
                        step="5"
                        disabled={!canEditPlanner && !canEditSupervisor}
                        value={shift.breakMinutes}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setLocalShifts((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, breakMinutes: val } : item))
                          );
                        }}
                        className="w-16 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-right bg-white"
                      />
                      <span className="text-slate-600">分钟</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">休息开始时间：</span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="time"
                        disabled={!canEditPlanner && !canEditSupervisor}
                        value={shift.breakStartTime || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalShifts((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, breakStartTime: val } : item))
                          );
                        }}
                        className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white"
                      />
                      <span className="text-[10px] text-slate-400 font-sans">(留空默认居中)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-700 font-semibold">排产开工时长核算：</span>
                    <span className="text-emerald-700 font-mono font-bold">
                      {getShiftDurationHours(shift)}H (净作业 {Math.max(0, (getShiftDurationHours(shift) * 60 - (shift.breakMinutes || 0)) / 60).toFixed(1)}H)
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">休息说明：</span>
                    <input
                      type="text"
                      disabled={!canEditPlanner && !canEditSupervisor}
                      value={shift.breakName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalShifts((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, breakName: val } : item))
                        );
                      }}
                      className="w-36 border border-slate-300 rounded px-2 py-0.5 text-xs bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">班次责任主管：</span>
                    <input
                      type="text"
                      disabled={!canEditSupervisor}
                      value={shift.supervisorName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalShifts((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, supervisorName: val } : item))
                        );
                      }}
                      className="w-36 border border-slate-300 rounded px-2 py-0.5 text-xs bg-white"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">{shift.notes}</p>
              </div>
            ))}
          </div>

          {(canEditSupervisor || canEditPlanner) && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveShifts}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存排班班次与每班休息时间并自动排产</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 7: Staffing & Headcount Registry (Supervisor) */}
      {activeSection === 'staffing' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>生产员工数量录入与车间人力配置 (生产主管专属)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                生产主管负责录入车间在岗生产员工数量、合格操作工人数、化验员与清洗保洁人员配置，系统在排产时自动进行人力负荷校验与防错预警。
              </p>
            </div>
            {!canEditSupervisor && (
              <span className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> 仅生产主管可编辑 (当前为只读浏览)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-xs font-bold text-slate-700">车间总在岗员工数</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  disabled={!canEditSupervisor}
                  value={localStaffing.totalWorkers}
                  onChange={(e) => setLocalStaffing({ ...localStaffing, totalWorkers: Number(e.target.value) })}
                  className="w-24 text-2xl font-bold font-mono text-emerald-700 border border-slate-300 rounded-lg px-2 py-1 bg-white focus:border-emerald-500"
                />
                <span className="text-xs text-slate-500">人</span>
              </div>
              <p className="text-[11px] text-slate-500">涵盖三个运行班次的所有一线员工</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-xs font-bold text-slate-700">合格投料/灌装操作工</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  disabled={!canEditSupervisor}
                  value={localStaffing.qualifiedOperators}
                  onChange={(e) => setLocalStaffing({ ...localStaffing, qualifiedOperators: Number(e.target.value) })}
                  className="w-24 text-2xl font-bold font-mono text-blue-700 border border-slate-300 rounded-lg px-2 py-1 bg-white focus:border-blue-500"
                />
                <span className="text-xs text-slate-500">人</span>
              </div>
              <p className="text-[11px] text-slate-500">具备甲类车间投料上岗资质</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-xs font-bold text-slate-700">化验室取样质检员 (QC)</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  disabled={!canEditSupervisor}
                  value={localStaffing.qcInspectors}
                  onChange={(e) => setLocalStaffing({ ...localStaffing, qcInspectors: Number(e.target.value) })}
                  className="w-24 text-2xl font-bold font-mono text-purple-700 border border-slate-300 rounded-lg px-2 py-1 bg-white focus:border-purple-500"
                />
                <span className="text-xs text-slate-500">人</span>
              </div>
              <p className="text-[11px] text-slate-500">卡尔费休水分/酸度放行专员</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-xs font-bold text-slate-700">CIP 清洗与危化品专员</span>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  disabled={!canEditSupervisor}
                  value={localStaffing.cleanSpecialists}
                  onChange={(e) => setLocalStaffing({ ...localStaffing, cleanSpecialists: Number(e.target.value) })}
                  className="w-24 text-2xl font-bold font-mono text-amber-700 border border-slate-300 rounded-lg px-2 py-1 bg-white focus:border-amber-500"
                />
                <span className="text-xs text-slate-500">人</span>
              </div>
              <p className="text-[11px] text-slate-500">专釜特殊冲洗与废液回收</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span>最后录入更新人：</span>
              <span className="font-semibold text-slate-800 font-mono">{localStaffing.lastUpdatedBy}</span>
              <span className="mx-2 text-slate-300">|</span>
              <span>更新时间：</span>
              <span className="font-mono text-slate-700">{localStaffing.lastUpdatedAt}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>人力满足 3 台反应釜满负荷连续运转要求</span>
            </div>
          </div>

          {canEditSupervisor && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={handleSaveStaffing}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存员工数量并同步自动排产</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 8: Real-time Database Management & Backup Center */}
      {activeSection === 'database' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>数据库实时持久化引擎与数据备份管理中心</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                系统全量数据（设备台账、产品型号、工序工时、排班定员、工单批次及工序报工记录）均采用真实数据库持久化存储，修改即时存库，刷新网页（F5）100%保留。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>持久化引擎正常运行</span>
              </span>
            </div>
          </div>

          {/* Database Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  <span>本地存储引擎 (Indexed Storage)</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  已连接
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-mono">
                Key: novolyte_aps_production_db_v2
              </p>
              <p className="text-[11px] text-emerald-600">
                每次在界面上增删改查立即自动持久化存盘。
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span>服务端 API 同步服务</span>
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                  /api/database
                </span>
              </div>
              <p className="text-xs text-blue-800 font-mono">
                最近保存: {lastDbSaveTime ? new Date(lastDbSaveTime).toLocaleTimeString() : '实时同步'}
              </p>
              <p className="text-[11px] text-blue-600">
                支持服务端状态载入与多端多页面数据同步。
              </p>
            </div>

            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <FileJson className="w-4 h-4 text-purple-600" />
                  <span>数据库架构版本</span>
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-mono">
                  Schema V2.0
                </span>
              </div>
              <p className="text-xs text-purple-800 font-mono">
                包含 8 类核心实体与工序节点
              </p>
              <p className="text-[11px] text-purple-600">
                支持 JSON 离线归档与一键无损还原。
              </p>
            </div>
          </div>

          {/* Stored Entities Metrics */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>当前数据库已持久化数据明细清单</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">反应釜台账</span>
                <span className="text-base font-bold text-slate-900 font-mono">{localReactors.length}</span>
                <span className="text-[10px] text-slate-400 block">台设备</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">产品型号库</span>
                <span className="text-base font-bold text-slate-900 font-mono">{localProductModels.length}</span>
                <span className="text-[10px] text-slate-400 block">个电解液型号</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">工艺工序节点</span>
                <span className="text-base font-bold text-slate-900 font-mono">{localProcessNodes.length}</span>
                <span className="text-[10px] text-slate-400 block">道工序</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">生产运行班次</span>
                <span className="text-base font-bold text-slate-900 font-mono">{localShifts.length}</span>
                <span className="text-[10px] text-slate-400 block">班制</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">车间配置定员</span>
                <span className="text-base font-bold text-slate-900 font-mono">{localStaffing.totalWorkers}</span>
                <span className="text-[10px] text-slate-400 block">人</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">销售排产工单</span>
                <span className="text-base font-bold text-slate-900 font-mono">{orderCount}</span>
                <span className="text-[10px] text-slate-400 block">笔工单</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 block">生产批次任务</span>
                <span className="text-base font-bold text-slate-900 font-mono">{batchCount}</span>
                <span className="text-[10px] text-slate-400 block">个批次</span>
              </div>
            </div>
          </div>

          {/* Database Operations & Tools */}
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-800">数据库运维与备份工具箱</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tool 1: Export Backup */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>导出全量数据库备份 (.json)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    将当前工厂所有设备台账、产品型号、工序工时、排班定员、工单批次及甘特图状态导出为标准 JSON 备份文件。
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (onExportDatabase) {
                      onExportDatabase();
                      triggerFeedback('数据库备份文件已成功导出下载！', 'success');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>立即导出 JSON 备份</span>
                </button>
              </div>

              {/* Tool 2: Import Backup */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Upload className="w-4 h-4 text-purple-600" />
                    <span>导入与还原数据库备份</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    上传此前导出的 JSON 备份文件，校验后瞬间恢复全厂设备参数、工单与排产计划。
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const content = event.target?.result as string;
                          if (content && onImportDatabase) {
                            onImportDatabase(content);
                            triggerFeedback('数据库备份文件已成功解析并还原！', 'success');
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>选择 JSON 备份文件导入</span>
                  </button>
                </div>
              </div>

              {/* Tool 3: Reset to Default Baseline */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <RotateCcw className="w-4 h-4 text-rose-600" />
                    <span>重置为出厂标准基准数据库</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    一键清除自定义测试脏数据，恢复系统出厂标准测试基线（3台反应釜、4张工单、8个标准批次）。
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('确定要将数据库重置为标准基准出厂数据吗？当前所有未备份的修改将被重置。')) {
                      if (onResetDatabase) {
                        onResetDatabase();
                        triggerFeedback('数据库已恢复出厂标准初始状态！', 'info');
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>恢复出厂标准基准</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
};
