/**
 * NOVOLYTE ADVANCED PLANNING & SCHEDULING (APS) - DATA TYPES (V2.0 SPEC)
 * 反应釜智能排产 Web 系统实施级数据模型
 * 依据 NOVOLYTE TECHNOLOGY SDN. BHD. V2.0 设计文档规范
 */

export type LanguageCode = 'zh' | 'en' | 'ms';

export type UserRole = 'VIEWER' | 'PLANNER' | 'PROCESS_ENGINEER' | 'SUPERVISOR' | 'ADMIN';

export interface UserAccount {
  role: UserRole;
  username: string;
  name: string;
  title: string;
  department: string;
  passwordHash: string; // 密码密文或明文比对
  allowedTabs: string[];
  permissions: string[];
  lastLoginAt?: string;
}

export type WorkshopId = string;

export interface WorkshopDef {
  id: string; // 'WS-01' | 'WS-02' | custom
  name: string;
  shortName: string;
  code: string;
  building: string;
  description: string;
  reactorCount: number;
  managerName: string;
}

export const WORKSHOP_DEFINITIONS: WorkshopDef[] = [
  {
    id: 'WS-01',
    name: '一期合成与配制车间 (甲类洁净厂房)',
    shortName: '一期车间 (主线)',
    code: 'PLANT-01',
    building: '甲类主厂房 A区/B区',
    description: '涵盖小试/特种试产釜 (R-1300-01) 及量产动力电解液主力釜 (R-6000-01)',
    reactorCount: 2,
    managerName: '张车间主任 (一期)'
  },
  {
    id: 'WS-02',
    name: '二期高纯与特种电解液车间 (乙类防爆厂房)',
    shortName: '二期车间 (扩产专线)',
    code: 'PLANT-02',
    building: '乙类防爆净化厂房 C区/D区',
    description: '涵盖强腐蚀高镍专线釜 (R-6000-02)，兼储能/高电压配制用途',
    reactorCount: 1,
    managerName: '刘车间主任 (二期)'
  }
];

export interface UserRoleInfo {
  role: UserRole;
  name: string;
  title: string;
  department: string;
  permissions: string[];
  responsibilities: string[];
}

export interface SystemConfig {
  systemName: string;
  systemSubtitle: string;
  companyName: string;
  reviewTag: string;
  version: string;
}

export interface ShiftDef {
  id: string;
  name: string;
  code: 'DAY' | 'MIDDLE' | 'NIGHT' | 'CUSTOM';
  startTime: string; // HH:mm e.g. "08:00"
  endTime: string;   // HH:mm e.g. "16:00"
  breakMinutes: number; // 每班休息时间 (分钟) e.g. 60
  breakStartTime?: string; // HH:mm e.g. "12:00" (班中休息开始时间)
  breakName: string; // e.g. "午餐及班中休息"
  /** Multiple breaks in one shift. Legacy breakMinutes/breakStartTime remain supported. */
  breaks?: ShiftBreak[];
  headcount: number; // 录入生产员工数量 (操作工人数)
  supervisorName: string;
  isActive: boolean;
  /** 工作日：JavaScript 星期编号 0=周日，1=周一 ... 6=周六；缺省表示每天上班。 */
  workingDays?: number[];
  notes?: string;
}

export interface ShiftBreak {
  id?: string;
  startTime: string;
  durationMinutes: number;
  name?: string;
}

export interface StaffingConfig {
  totalWorkers: number;
  qualifiedOperators: number;
  qcInspectors: number;
  cleanSpecialists: number;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export type ReactorStatus = 'IDLE' | 'RUNNING' | 'WASHING' | 'MAINTENANCE';
export type CleanState = 'CLEAN' | 'DIRTY' | 'UNKNOWN';

export interface Reactor {
  reactor_id: 'R-1300-01' | 'R-6000-01' | 'R-6000-02' | string;
  reactor_name: string;
  workshop_id?: string; // 'WS-01' | 'WS-02'
  rated_kg: number; // 1300 kg or 6000 kg
  min_kg: number;   // 300 kg (1.3t釜) or 2000 kg (6t釜)
  max_kg: number;   // 1300 kg or 6000 kg
  volume_m3?: number; // 可选独立字段，不与质量等同
  status: ReactorStatus;
  clean_state: CleanState;
  last_model_code: string; // 生产结束不抹掉上一型号
  cleaned_for_model?: string;
  available_at: string; // YYYY-MM-DD HH:mm
  location: string;
  temperature?: number;
  agitation_rpm?: number;
  exclusive_mode: boolean; // 是否专用模式
  allowed_exclusive_models?: string[]; // 该釜专用于哪些型号
  row_version?: number; // 乐观锁版本号
  notes?: string;
}

export type SpecialScope = 'ENTER' | 'LEAVE' | 'EITHER';

export interface ProductModelDef {
  model_code: string;
  name: string;
  special_cleaning: boolean;
  special_scope: SpecialScope;
  approval_status: 'APPROVED' | 'PENDING_APPROVAL' | 'PENDING_CRAFT_APPROVAL';
  allowed_reactors: string[]; // 白名单：该型号只能用哪些釜
  min_order_kg: number;
  customer_target?: string;
  batch_standard_hours?: number; // 工艺员设定的该产品标准批次反应与制备工时 (默认 10.5h)
  recipe_notes?: string; // 工艺配方要点
  description: string;
  // 责任录入与工艺审核字段
  created_by_role?: UserRole; // 计划员录入型号
  created_by_name?: string;
  created_at?: string;
  craft_confirmed?: boolean; // 工艺员是否已确认特殊清洗及参数
  craft_confirmed_by?: string;
  craft_confirmed_at?: string;
}

// 特殊清洗卡片定义（完全对应界面三联卡片）
export interface WashRuleCardDef {
  id: 'SAME_MODEL' | 'NORMAL_DIFF' | 'SPECIAL_DIFF';
  title: string;
  badgeText: string;
  durationMin: number;
  durationHoursText: string;
  themeColor: 'green' | 'blue' | 'purple';
  description: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface CleaningPolicy {
  version: string;
  same_min: number;    // 0 分钟
  normal_min: number;  // 120 分钟 (2h)
  special_min: number; // 180 分钟 (3h)
  effective_at: string;
  approved_by: string;
}

export interface ReactorRestriction {
  id: string;
  product_model: string;
  product_name: string;
  allowed_reactor_ids: string[]; // e.g. ['R-6000-02']
  is_exclusive: boolean;
  reason: string;
}

export interface WashMatrixRule {
  id: string;
  from_product_type: string;
  to_product_type: string;
  wash_min: number; // 0, 120, 180 分钟
  is_special_rule: boolean;
  trigger_direction: SpecialScope;
  approval_status: 'APPROVED' | 'PENDING_APPROVAL';
  description: string;
}

export type ProcessNodeId = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * 标准工序代码。这 6 个值带有**排产与报工语义**，下游逻辑直接依赖：
 *   - `FILL`  灌装工序，只有它的合格量参与订单完成率累计；
 *   - `CLEAN` 独立洗釜，不计入有效生产工时（AdminConfigView 汇总时排除）；
 *   - `QC`    取样检测，决定报工模板显示水分/游离酸录入项；
 *   - `SOLVENT` / `SALT` / `MIX` 为投料与混合工序。
 *
 * 注意：工艺员可在后台「增加工序节点」中录入**自定义工序代码**
 * （表单占位符即示例 `VACUUM` / `FILTER_2`），因此 `ProcessNodeDef.code`
 * 的类型是开放的 `string`，而非本枚举。自定义代码**不得复用**上述 6 个标准值，
 * 否则会污染完成率累计与工时统计。
 */
export type ProcessNodeCode = 'SOLVENT' | 'SALT' | 'MIX' | 'QC' | 'FILL' | 'CLEAN';

/** 标准工序代码清单，供后台表单校验与提示使用 */
export const STANDARD_PROCESS_NODE_CODES: readonly ProcessNodeCode[] = [
  'SOLVENT',
  'SALT',
  'MIX',
  'QC',
  'FILL',
  'CLEAN',
];

export interface ProcessNodeDef {
  id: ProcessNodeId;
  name: string;
  /** 标准工序代码之一（见 `ProcessNodeCode`），或工艺员自定义代码 */
  code: string;
  standard_hours: number;
  description: string;
  requires_release?: boolean; // 工序4取样放行才能进入工序5
  target_temp_celsius?: number; // 目标温度 (<= 25℃)
  stir_rpm?: number; // 搅拌转速 (rpm)
  is_critical?: boolean; // 是否关键工艺控制点 (CCP)
  lastUpdatedBy?: string;
}

export const PROCESS_NODES: ProcessNodeDef[] = [
  { id: 1, name: '溶剂投料', code: 'SOLVENT', standard_hours: 1.5, description: 'EC/DMC/EMC等高纯有机溶剂密闭管道输送' },
  { id: 2, name: '锂盐投料', code: 'SALT', standard_hours: 2.0, description: '六氟磷酸锂(LiPF6)/LiFSI低温手套箱投加' },
  { id: 3, name: '混合搅拌', code: 'MIX', standard_hours: 3.5, description: '冷水机循环控温(<=25℃)与磁力变频搅拌' },
  { id: 4, name: '取样检测', code: 'QC', standard_hours: 1.5, description: '卡尔费休水分(<=15ppm)、游离酸及离子检测', requires_release: true },
  { id: 5, name: '灌装包装', code: 'FILL', standard_hours: 2.0, description: '精密滤芯过滤与充氮包装，据此汇总合格订单数量' },
  { id: 6, name: '清洗准备', code: 'CLEAN', standard_hours: 2.0, description: '独立清洗任务占用原釜，同型号时标记为不适用' }
];

export type StepProgressStatus = 'PENDING' | 'PROCESSING' | 'PAUSED' | 'FINISHED' | 'NOT_APPLICABLE';
export type QcReleaseStatus = 'WAITING' | 'TESTING' | 'HOLD' | 'RELEASED';
export type TaskStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';

export type DeviationType =
  | 'NORMAL'           // 正常按计划执行
  | 'DELAY_START'      // 开工延期 (实际开工晚于计划)
  | 'DELAY_FINISH'     // 完工延期 (实际完工晚于计划)
  | 'OVERRUN'          // 工时超耗 (实际耗时大于计划标准)
  | 'EARLY'            // 提前开工/完工
  | 'PENDING_INPUT';   // 待填报实际时间

export type DeviationCategory =
  | 'RAW_MATERIAL_DELAY'     // 原料到料延迟/包装桶短缺
  | 'EQUIPMENT_FAULT'        // 反应釜机械密封/搅拌电机/阀门故障
  | 'QC_RETEST'              // 水分/游离酸超标取样复测
  | 'CIP_OVERTIME'           // 洗釜耗时超标/残液清洗不达标
  | 'MANPOWER_HANDOVER'      // 班次交接/人员短缺/操作失误
  | 'UTILITY_FLUCTUATION'    // 冷水机冰水温度波动/氮气压力不足
  | 'ORDER_URGENT_CHANGE'    // 紧急加塞工单/调度调整
  | 'OTHER';                 // 其它突发工况

export interface DeviationCategoryDef {
  id: DeviationCategory;
  label: string;
  dept: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const DEVIATION_CATEGORIES: DeviationCategoryDef[] = [
  { id: 'RAW_MATERIAL_DELAY', label: '原材料/锂盐到料延迟与包装桶短缺', dept: '采购与仓储部', severity: 'HIGH' },
  { id: 'EQUIPMENT_FAULT', label: '反应釜管线/搅拌电机/底阀故障检修', dept: '设备工程部', severity: 'HIGH' },
  { id: 'QC_RETEST', label: '品保化验复测 (水分/游离酸等放行等待)', dept: '质量检验部 (QC)', severity: 'MEDIUM' },
  { id: 'CIP_OVERTIME', label: 'CIP 洗釜耗时超标 / 特殊洗涤置换', dept: '生产车间', severity: 'MEDIUM' },
  { id: 'MANPOWER_HANDOVER', label: '班次交接滞后 / 岗位操作工调配', dept: '生产运行部', severity: 'LOW' },
  { id: 'UTILITY_FLUCTUATION', label: '公用工程波动 (冷水机温控/氮气压力)', dept: '动力能源部', severity: 'MEDIUM' },
  { id: 'ORDER_URGENT_CHANGE', label: '急单插单 / 客户交期前移', dept: 'PMC 计划部', severity: 'HIGH' },
  { id: 'OTHER', label: '其他生产现场突发工况', dept: '生产调度', severity: 'LOW' },
];

export interface BatchTask {
  batch_id: string; // e.g. 'SIM-B001'
  order_no: string;
  customer_name: string;
  product_model: string;
  product_name: string;
  workshop_id?: string; // 所属车间
  batch_qty_kg: number; // 质量能力，统一以 kg 建模
  assigned_reactor_id: string;
  
  // 计划基准时间 (录入后作为恒定计划基准，不可随意覆盖)
  plan_start_time: string; // YYYY-MM-DD HH:mm
  plan_end_time: string;   // YYYY-MM-DD HH:mm
  plan_duration_min?: number;

  // 实际执行时间 (现场 MES/手工上报)
  actual_start_time?: string; // YYYY-MM-DD HH:mm
  actual_end_time?: string;   // YYYY-MM-DD HH:mm
  actual_duration_min?: number;

  // 偏差监控与异常原因归因
  deviation_type?: DeviationType;
  deviation_minutes?: number; // 实际相对于计划的偏差分钟数 (>0 为延误/超耗, <0 为提前)
  deviation_category?: DeviationCategory;
  deviation_reason?: string; // 详细原因说明
  corrective_action?: string; // 纠偏措施
  responsible_dept?: string; // 责任部门
  responsible_person?: string; // 责任人
  reported_at?: string; // 实际时间与原因录入时间
  is_reason_submitted?: boolean; // 原因是否已确认提交

  is_locked: boolean; // 未来 24 小时冻结标记
  is_actual: boolean; // 是否已开工/已完成
  current_step: ProcessNodeId;
  step_status: StepProgressStatus;
  qc_status: QcReleaseStatus; // 取样检测人工放行状态
  good_filled_kg: number;     // 累计合格灌装量(kg)
  loss_kg?: number;
  pause_reason?: string;
  // 清洗关联
  preceding_wash_min: number; // 0, 120, 180 min
  preceding_wash_job_id?: string;
  preceding_wash_start?: string;
  preceding_wash_end?: string;
  wash_rule_type: 'SAME_MODEL_0MIN' | 'NORMAL_DIFF_120MIN' | 'SPECIAL_180MIN' | 'UNKNOWN_HOLD' | 'PENDING_NEXT';
  conflict_warning?: string;
  batch_index: number;
  total_batches: number;
  is_demo?: boolean; // 演示试算隔离标记
  row_version?: number; // 乐观并发控制
  notes?: string;
}

export interface CleaningJob {
  job_id: string;
  reactor_id: string;
  from_model: string;
  to_model?: string; // 末批无下一型号时显示“切换待定”
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING_NEXT';
  planned_min: number; // 0, 120, 180 min
  actual_start?: string;
  actual_end?: string;
  cleaned_release_status: 'CONFIRMED' | 'UNCONFIRMED';
  confirmed_by?: string;
  prev_batch_id?: string;
  next_batch_id?: string;
}

export interface ProductionOrder {
  order_no: string;
  customer_name: string;
  product_model: string;
  product_name: string;
  workshop_id?: string;    // 所属车间
  qty_kg: number;          // 内部统一以 kg 存储 (numeric(14,3))
  received_at: string;
  customer_due_at: string; // 客户交期
  production_due_at: string;// 生产期限 (交期减去发运准备提前量)
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  urgent: boolean;
  status: 'PENDING_SCHEDULE' | 'SCHEDULED' | 'IN_PRODUCTION' | 'COMPLETED';
  allow_split: boolean;    // 默认允许向下拆批
  allow_parallel: boolean; // 是否允许跨釜并行
  split_batches: {
    batch_no: string;
    qty_kg: number;
    reactor_id: string;
  }[];
  // 进度汇总
  completed_good_kg: number; // 仅从灌装工序累加
  last_reported_at?: string; // 最后人工更新时间
  forecast_finish_at?: string;// 推算完成时刻
  row_version?: number; // 乐观并发控制锁
  is_demo?: boolean; // 演示试算标记
  notes?: string;
}

export interface ShiftReportEvent {
  event_id: string;
  client_event_id: string; // 客户端提交幂等性 UUID
  batch_id: string;
  order_no: string;
  reactor_id: string;
  operation_code: 'SOLVENT' | 'SALT' | 'MIX' | 'QC' | 'FILL' | 'CLEAN';
  operation_name: string;
  event_type: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'QC_UPDATE' | 'FILL_PROGRESS';
  status: StepProgressStatus;
  actual_at: string;
  reported_at: string;
  reported_by: string;
  period: string; // e.g. '09-14 上午' | '09-14 下午'
  shift_name?: string; // 白班 / 夜班
  payload?: {
    moisture_ppm?: number;
    acidity_ppm?: number;
    qc_status?: QcReleaseStatus;
    filled_kg?: number; // 灌装合格净重 (kg, numeric(14,3))
    loss_kg?: number;
    pause_reason?: string;
    notes?: string;
  };
}

export type SchedulingStrategy = 'SETUP_MINIMIZE' | 'EDD_FIRST' | 'LOAD_BALANCE';

export interface PlanVersion {
  version_no: string; // e.g. 'V12' (已发布), 'V13' (试算草稿)
  state: 'PUBLISHED' | 'DRAFT' | 'SUPERSEDED';
  t0: string; // 重算基准时点 e.g. '2026-09-14 08:00'
  freeze_until: string; // t0 + 24小时 (24H 冻结区分界线)
  updated_at: string;
  published_at?: string;
  delayed_orders_count: number;
  total_wash_min: number;
  batches_count: number;
  unassigned_kg: number;
  is_demo: boolean; // 服务端硬隔离：若为 true 严禁向 MES 发布
  row_version: number; // 乐观锁版本号
}

// =================================================================
// V4.0 新增实施级模型：8 大异常码、ATB 齐套、CTP 试算、What-If 场景
// =================================================================

/**
 * APS 8 大结构化异常码枚举 (标准机器可读代码)
 */
export type ApsErrorCode =
  | 'NO_ALLOWED_REACTOR'    // 1. 无可用设备 (型号白名单不匹配或全部维护中)
  | 'BATCH_BELOW_MIN'       // 2. 尾批低于下限 (向下拆批后余量小于釜最低投料量)
  | 'MISSING_STD_TIME'      // 3. 缺失标准工时 (工艺路线缺少 6 大工序标准耗时)
  | 'UNKNOWN_INITIAL_STATE' // 4. 设备初始状态未知 (上一生产型号未知，严禁按 0min 免洗初始化)
  | 'UNCONFIRMED_RULE'      // 5. 未审批特殊规则 (特殊清洗范围/专釜参数未通过工艺确认)
  | 'NO_FEASIBLE_SLOT'      // 6. 无可行日历窗口 (在客户要求交付前无连续开工可用窗口)
  | 'FROZEN_CONFLICT'       // 7. 24H 冻结冲突 (尝试在 24 小时冻结区内调整锁定任务)
  | 'STALE_INPUT';          // 8. 输入快照过期 (并发修改冲突，row_version 已被抢先更新)

/**
 * 结构化异常责任链记录
 */
export interface ApsExceptionRecord {
  code: ApsErrorCode;
  title: string;
  message: string;
  entity_type: 'ORDER' | 'BATCH' | 'REACTOR' | 'RULE' | 'INVENTORY' | 'SCHEDULE';
  entity_id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  responsible_role: UserRole;
  responsible_dept: string;
  remediation_hint: string;
  occurred_at: string;
  is_blocking: boolean;
}

/**
 * 物料齐套性物料实体与 BOM (ATB Available to Build)
 */
export interface MaterialInventory {
  material_code: string;
  material_name: string;
  category: 'LITHIUM_SALT' | 'SOLVENT' | 'ADDITIVE' | 'PACKAGING';
  current_stock_kg: number; // 当前在库可用 (numeric(14,3))
  mrp_expected_arrival_kg: number; // MRP 预计到货量
  expected_arrival_time: string; // 预计到货时刻 YYYY-MM-DD HH:mm
  safety_stock_kg: number;
}

export interface BillOfMaterialItem {
  material_code: string;
  material_name: string;
  standard_ratio: number; // 占产品总量比例 e.g. 0.125 (12.5% LiPF6)
}

export interface ShortageReport {
  material_code: string;
  material_name: string;
  required_kg: number;
  available_kg: number;
  shortage_kg: number;
  earliest_ready_time: string;
  impacted_order_no: string;
}

export interface AtbCheckResult {
  is_all_ready: boolean;
  order_no: string;
  product_model: string;
  order_qty_kg: number;
  shortages: ShortageReport[];
  checked_at: string;
}

/**
 * IPS 实时 CTP (Capable-to-Promise) 试算请求与结果 (Copy-on-Write 临时沙箱)
 */
export interface CtpSimulationRequest {
  customer_name: string;
  product_model: string;
  qty_kg: number;
  requested_delivery_at: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL';
  allow_split: boolean;
  target_workshop_id?: string;
}

export interface CtpSimulationResult {
  order_id: string;
  is_achievable: boolean;
  promised_finish_at: string; // 最早可行完工时刻
  lead_time_hours: number;
  atb_result: AtbCheckResult;
  proposed_batches: {
    batch_no: string;
    qty_kg: number;
    reactor_id: string;
    estimated_start: string;
    estimated_end: string;
    preceding_wash_min: number;
  }[];
  bottleneck_reactor_id: string;
  total_wash_cost_min: number;
  is_demo: boolean;
  exceptions: ApsExceptionRecord[];
  evaluated_at: string;
}

/**
 * What-If 多方案多场景仿真对比模型
 */
export interface WhatIfScenario {
  scenario_id: string;
  strategy: SchedulingStrategy;
  name: string;
  description: string;
  makespan_hours: number;
  total_wash_hours: number;
  avg_oee_percent: number;
  load_balance_variance: number; // 负载方差，越小越均衡
  delayed_orders_count: number;
  zero_wash_batches_count: number;
  batches: BatchTask[];
  pareto_rank: 'A+' | 'A' | 'B' | 'C';
  is_recommended: boolean;
}

export interface WhatIfComparisonMatrix {
  scenarios: WhatIfScenario[];
  baseline_scenario_id: string;
  generated_at: string;
}

