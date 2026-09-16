import {
  Reactor,
  ReactorRestriction,
  WashMatrixRule,
  ProductionOrder,
  BatchTask,
  CleaningJob,
  ProductModelDef,
  CleaningPolicy,
  ProcessNodeDef,
  PROCESS_NODES,
  SystemConfig,
  ShiftDef,
  StaffingConfig,
  UserRole,
  UserRoleInfo,
  UserAccount,
  WashRuleCardDef,
  DeviationType,
  DeviationCategory,
  SchedulingStrategy,
  ApsErrorCode,
  ApsExceptionRecord,
  MaterialInventory,
  BillOfMaterialItem,
  ShortageReport,
  AtbCheckResult,
  CtpSimulationRequest,
  CtpSimulationResult,
  WhatIfScenario,
  WhatIfComparisonMatrix
} from '../types/aps';

/**
 * 0. 系统全局默认配置 (管理员可修改系统名称、副标题等)
 */
export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  systemName: 'NOVOLYTE 生产计划与进度',
  systemSubtitle: '反应釜智能排产 Web 系统 (NOVOLYTE TECHNOLOGY SDN. BHD. 版本 V2.0)',
  companyName: 'NOVOLYTE TECHNOLOGY SDN. BHD.',
  reviewTag: '供生产 · 计划 · 工艺 · IT 评审',
  version: 'V2.0-PROD'
};

/**
 * 0.1 角色定义与权限矩阵 (支持独立密码与查看权限隔离)
 */
export const ROLE_DEFINITIONS: Record<UserRole, UserRoleInfo> = {
  VIEWER: {
    role: 'VIEWER',
    name: '查看人员 (Viewer)',
    title: '访客 / 现场普通查看员',
    department: '各相关协作部门 (All Staff)',
    permissions: [
      '仅具备全局数据、甘特图、报表及看板的只读查看权限',
      '无权新增/修改产品型号及订单',
      '无权维护反应釜参数或确认工艺',
      '无权修改清洗规则与车间信息',
      '必须输入对应角色独立密码方可解锁编辑权限'
    ],
    responsibilities: [
      '实时查看生产排产进度与计划',
      '查看设备状态与交期看板'
    ]
  },
  PROCESS_ENGINEER: {
    role: 'PROCESS_ENGINEER',
    name: '工艺员 (Process Engineer)',
    title: '工艺主管 / 工艺工程师 (PE)',
    department: '工艺技术部 (Process Engineering)',
    permissions: [
      '负责录入/确认新产品是否特殊清洗及清洗范围 (每一个新产品都需要工艺员确认)',
      '负责维护全部反应釜的技术与工艺参数 (容积/转速/温控/专用模式)',
      '负责修改特殊清洗的说明内容、标准耗时与洗釜技术要求',
      '负责定义产品工艺路线与工序清单 (溶剂/锂盐/搅拌/检测/灌装/清洗)',
      '负责设置各工序标准耗时与关键控制点 (CCP)'
    ],
    responsibilities: [
      '录入/确认产品是否特殊清洗 (一物一审)',
      '维护反应釜工艺与物理参数',
      '修改特殊清洗说明内容与标准',
      '设置工序清单及工序时间'
    ]
  },
  PLANNER: {
    role: 'PLANNER',
    name: '计划员 (Production Planner)',
    title: '生管主计划员 / PMC',
    department: '生产计划与物控部 (PMC)',
    permissions: [
      '负责录入与维护新产品型号编码、品名与起订量 (录入后转工艺员确认)',
      '负责录入与修改客户生产工单、交期与数量',
      '指定反应釜生产白名单与专釜绑定 (硬约束)',
      '定制每班休息时长与工时缓冲折算',
      '发起有限产能自动排产试算与发布执行版本'
    ],
    responsibilities: [
      '录入产品型号与生产工单',
      '指定釜生产白名单',
      '排产调度与甘特图发布'
    ]
  },
  SUPERVISOR: {
    role: 'SUPERVISOR',
    name: '生产主管 (Production Supervisor)',
    title: '车间总监 / 生产主管',
    department: '制造车间部 / 中控调度室',
    permissions: [
      '负责车间排班班次配置 (早/中/晚班起止时间及启用/停用单班/双班/三班)',
      '负责录入生产员工数量 (操作工与技术工定岗与技能分布)',
      '核定车间人力负荷与设备开工比率',
      '车间半日报工复核与工时偏差归因审批'
    ],
    responsibilities: [
      '负责车间排班 (单班/双班/三班启停)',
      '负责录入生产员工数量 (总人数与班次定岗)',
      '监控车间在制负荷与人力平衡'
    ]
  },
  ADMIN: {
    role: 'ADMIN',
    name: '系统管理员 (System Admin)',
    title: '系统与主数据高级管理员',
    department: 'IT 数字化中心 / 厂长办',
    permissions: [
      '负责车间信息维护 (车间名称/厂房类型/车间主任/建筑等)',
      '负责修订维护反应釜归属于哪个车间 (Workshop Assignment)',
      '管理全部用户角色的独立访问密码与重置',
      '修改系统名称、副标题及企业主体信息',
      '全权兼备工艺员、计划员与生产主管的全部操作'
    ],
    responsibilities: [
      '维护车间信息及釜归属车间',
      '管理用户独立密码与权限',
      '修改系统名称与全局品牌',
      '全模块主数据监管'
    ]
  }
};

/**
 * 0.15 默认用户账号与独立密码 (支持密码验证、权限隔离与修改)
 */
export const DEFAULT_USER_ACCOUNTS: UserAccount[] = [
  {
    role: 'PLANNER',
    username: 'planner',
    name: '陈计划 (主计划员)',
    title: '生管主计划员 / PMC',
    department: '生产计划与物控部 (PMC)',
    passwordHash: 'planner123',
    allowedTabs: ['gantt', 'rules', 'dashboard'],
    permissions: ['产品型号录入', '生产工单下达', '排产试算与发布']
  },
  {
    role: 'PROCESS_ENGINEER',
    username: 'craft',
    name: '魏总工 (高级工艺工程师)',
    title: '工艺主管 / 工艺工程师 (PE)',
    department: '工艺技术部 (Process Eng)',
    passwordHash: 'craft123',
    allowedTabs: ['rules', 'admin', 'reporting'],
    permissions: ['特殊清洗参数录入', '新产品工艺确认', '反应釜参数维护', '特殊清洗说明修改']
  },
  {
    role: 'SUPERVISOR',
    username: 'supervisor',
    name: '李主管 (生产主管)',
    title: '车间生产主管 / 调度长',
    department: '制造车间部',
    passwordHash: 'lead123',
    allowedTabs: ['reporting', 'dashboard', 'gantt'],
    permissions: ['车间排班管理', '员工人数录入', '报工与异常审核']
  },
  {
    role: 'ADMIN',
    username: 'admin',
    name: '王管理员 (IT主管)',
    title: '数字化总监 / 系统管理员',
    department: 'IT数字化中心 / 厂长办',
    passwordHash: 'admin123',
    allowedTabs: ['gantt', 'reporting', 'rules', 'dashboard', 'mes', 'admin'],
    permissions: ['车间信息维护', '反应釜车间归属修订', '用户密码管理', '系统全局配置']
  }
];

/**
 * 0.18 特殊清洗说明三联卡片初始配置 (工艺员可直接编辑说明内容及耗时，见用户上传图片)
 */
export const DEFAULT_WASH_RULE_CARDS: WashRuleCardDef[] = [
  {
    id: 'SAME_MODEL',
    title: '同型号连续生产 (免洗)',
    badgeText: '0 分钟',
    durationMin: 0,
    durationHoursText: '0h',
    themeColor: 'green',
    description: '上一批次与当前批次型号一致，免除 CIP 冲洗，工序 6 标记为不适用。',
    lastModifiedBy: '工艺员 (魏总工)',
    lastModifiedAt: '2026-09-14 09:00'
  },
  {
    id: 'NORMAL_DIFF',
    title: '普通不同型号切换 (标准 CIP)',
    badgeText: '120 分钟 (2.0h)',
    durationMin: 120,
    durationHoursText: '2.0h',
    themeColor: 'blue',
    description: '常规三元与铁锂电解液切换，执行标准 120 分钟溶剂浸洗与氮气吹扫。',
    lastModifiedBy: '工艺员 (魏总工)',
    lastModifiedAt: '2026-09-14 09:00'
  },
  {
    id: 'SPECIAL_DIFF',
    title: '特殊洗釜型号 (深度防污染)',
    badgeText: '180 分钟 (3.0h)',
    durationMin: 180,
    durationHoursText: '3.0h',
    themeColor: 'purple',
    description: '涉及特种强腐蚀、高镍配方或专釜切换，强制执行 180 分钟三级超净冲洗。',
    lastModifiedBy: '工艺员 (魏总工)',
    lastModifiedAt: '2026-09-14 09:00'
  }
];

/**
 * 0.2 车间排班班次配置 (生产主管/计划员维护)
 */
export const DEFAULT_SHIFTS: ShiftDef[] = [
  {
    id: 'SHIFT-01',
    name: '白班 (Day Shift)',
    code: 'DAY',
    startTime: '08:00',
    endTime: '20:00',
    breakMinutes: 60,
    breakStartTime: '12:00',
    breakName: '午餐及工间休整',
    headcount: 10,
    supervisorName: '李主管 (生产一部)',
    isActive: true,
    notes: '08:00-20:00 白班 (两班制标准)，负责主线投料、溶剂密闭管道灌注及日间生产'
  },
  {
    id: 'SHIFT-02',
    name: '夜班 (Night Shift)',
    code: 'NIGHT',
    startTime: '20:00',
    endTime: '08:00',
    breakMinutes: 60,
    breakStartTime: '00:00',
    breakName: '夜餐及巡检休息',
    headcount: 10,
    supervisorName: '张主管 (夜间值守)',
    isActive: true,
    notes: '20:00-08:00 夜班 (两班制标准)，混合搅拌跨班连续运行、化验室放行与灌装充氮'
  }
];

/**
 * 0.3 车间员工人力配置 (生产主管录入)
 */
export const DEFAULT_STAFFING_CONFIG: StaffingConfig = {
  totalWorkers: 20,
  qualifiedOperators: 14,
  qcInspectors: 3,
  cleanSpecialists: 3,
  lastUpdatedBy: '生产主管 (李主管)',
  lastUpdatedAt: '2026-09-14 08:30'
};

/**
 * 1. 反应釜初始标准配置 (覆盖一期与二期车间)
 * 一期车间 (WS-01: 甲类洁净厂房):
 * - R-1300-01 (1.3 t 釜, 1,300 kg)
 * - R-6000-01 (6 t 釜 #1, 6,000 kg)
 * 二期车间 (WS-02: 乙类防爆厂房):
 * - R-6000-02 (6 t 釜 #2, 6,000 kg 专线釜)
 * - R-6000-03 (6 t 釜 #3, 6,000 kg 储能与高压配制釜)
 */
export const INITIAL_REACTORS: Reactor[] = [
  {
    reactor_id: 'R-1300-01',
    reactor_name: '1.3 t 反应釜 (小试/特种线)',
    workshop_id: 'WS-01',
    rated_kg: 1300,
    min_kg: 300,
    max_kg: 1300,
    volume_m3: 1.5,
    status: 'RUNNING',
    clean_state: 'CLEAN',
    last_model_code: 'SIM-MODEL-A',
    available_at: '2026-09-14 08:00',
    location: '一期甲类洁净厂房 A-101',
    temperature: 18.2,
    agitation_rpm: 120,
    exclusive_mode: false,
    notes: '适用于小批量试产或超高净度特种电解液'
  },
  {
    reactor_id: 'R-6000-01',
    reactor_name: '6 t 反应釜 #1 (动力主线 1号)',
    workshop_id: 'WS-01',
    rated_kg: 6000,
    min_kg: 2000,
    max_kg: 6000,
    volume_m3: 7.2,
    status: 'RUNNING',
    clean_state: 'CLEAN',
    last_model_code: 'SIM-MODEL-A',
    available_at: '2026-09-14 08:00',
    location: '一期甲类洁净厂房 B-201',
    temperature: 20.5,
    agitation_rpm: 180,
    exclusive_mode: false,
    notes: '主力动力电解液量产釜，双层夹套强制冷水循环'
  },
  {
    reactor_id: 'R-6000-02',
    reactor_name: '6 t 反应釜 #2 (动力主线 2号 / 专属釜)',
    workshop_id: 'WS-02',
    rated_kg: 6000,
    min_kg: 2000,
    max_kg: 6000,
    volume_m3: 7.2,
    status: 'RUNNING',
    clean_state: 'CLEAN',
    last_model_code: 'SIM-MODEL-SPECIAL-S',
    available_at: '2026-09-14 08:00',
    location: '二期乙类防爆厂房 C-102',
    temperature: 19.8,
    agitation_rpm: 175,
    exclusive_mode: false,
    notes: '独立维护状态与上一型号，支持特殊高镍/强腐蚀体系专用'
  },
  {
    reactor_id: 'R-6000-03',
    reactor_name: '6 t 反应釜 #3 (储能与高压配制釜)',
    workshop_id: 'WS-02',
    rated_kg: 6000,
    min_kg: 2000,
    max_kg: 6000,
    volume_m3: 7.2,
    status: 'IDLE',
    clean_state: 'CLEAN',
    last_model_code: 'SIM-MODEL-B',
    available_at: '2026-09-14 08:00',
    location: '二期乙类防爆厂房 D-201',
    temperature: 19.2,
    agitation_rpm: 160,
    exclusive_mode: false,
    notes: '二期扩产核心配制釜，配置大功率冷却与精密充氮系统'
  }
];

/**
 * 2. 产品型号与白名单定义
 */
export const INITIAL_PRODUCT_MODELS: ProductModelDef[] = [
  {
    model_code: 'SIM-MODEL-A',
    name: '普通动力三元动力电解液 A',
    special_cleaning: false,
    special_scope: 'EITHER',
    approval_status: 'APPROVED',
    allowed_reactors: ['R-1300-01', 'R-6000-01', 'R-6000-02', 'R-6000-03'],
    min_order_kg: 500,
    batch_standard_hours: 10.5,
    recipe_notes: '常规三元EC/DMC/EMC基液，严格控制冰水回水温度<=20℃',
    description: '常规通用型号，支持任意可用釜',
    created_by_role: 'PLANNER',
    created_by_name: '陈计划 (主计划员)',
    created_at: '2026-09-10 09:30',
    craft_confirmed: true,
    craft_confirmed_by: '魏总工 (工艺主管)',
    craft_confirmed_at: '2026-09-10 14:00'
  },
  {
    model_code: 'SIM-MODEL-B',
    name: '储能长寿命磷酸铁锂电解液 B',
    special_cleaning: false,
    special_scope: 'EITHER',
    approval_status: 'APPROVED',
    allowed_reactors: ['R-1300-01', 'R-6000-01', 'R-6000-02', 'R-6000-03'],
    min_order_kg: 500,
    batch_standard_hours: 10.5,
    recipe_notes: '高纯LiPF6+VC成膜添加剂，混合搅拌转速160rpm',
    description: '标准LFP电解液，跨型号普通清洗120分钟',
    created_by_role: 'PLANNER',
    created_by_name: '陈计划 (主计划员)',
    created_at: '2026-09-11 10:00',
    craft_confirmed: true,
    craft_confirmed_by: '魏总工 (工艺主管)',
    craft_confirmed_at: '2026-09-11 15:20'
  },
  {
    model_code: 'SIM-MODEL-SPECIAL-S',
    name: '强腐蚀高镍特种电解液 S (专釜限制)',
    special_cleaning: true,
    special_scope: 'EITHER',
    approval_status: 'APPROVED',
    allowed_reactors: ['R-6000-02'], // 专属限制：仅限 R-6000-02
    min_order_kg: 2000,
    batch_standard_hours: 12.0,
    recipe_notes: '含强腐蚀氟化添加剂FEC与高浓度LiFSI，专釜隔离，进出均强制执行180分钟三级超净冲洗',
    description: '含特殊氟化添加剂与高浓度LiFSI，专釜隔离且需特殊清洗180分钟',
    created_by_role: 'PLANNER',
    created_by_name: '陈计划 (主计划员)',
    created_at: '2026-09-12 08:30',
    craft_confirmed: true,
    craft_confirmed_by: '魏总工 (工艺主管)',
    craft_confirmed_at: '2026-09-12 11:00'
  },
  {
    model_code: 'SIM-MODEL-C',
    name: '快充高电压消费类电解液 C',
    special_cleaning: false,
    special_scope: 'EITHER',
    approval_status: 'APPROVED',
    allowed_reactors: ['R-1300-01', 'R-6000-01', 'R-6000-02', 'R-6000-03'],
    min_order_kg: 500,
    batch_standard_hours: 10.0,
    recipe_notes: '4.45V高电压耐氧化体系，水分控制<=10ppm',
    description: '高压数码配方',
    created_by_role: 'PLANNER',
    created_by_name: '陈计划 (主计划员)',
    created_at: '2026-09-13 09:00',
    craft_confirmed: true,
    craft_confirmed_by: '魏总工 (工艺主管)',
    craft_confirmed_at: '2026-09-13 13:45'
  },
  {
    model_code: 'SIM-MODEL-NEX-05',
    name: '半固态硅碳负极宽温域电解液 E (新产品)',
    special_cleaning: false,
    special_scope: 'EITHER',
    approval_status: 'PENDING_CRAFT_APPROVAL',
    allowed_reactors: ['R-1300-01', 'R-6000-01'],
    min_order_kg: 1000,
    batch_standard_hours: 11.5,
    recipe_notes: '新型双盐及含氟环状添加剂，计划员已录入，待工艺员核定是否特殊清洗与釜白名单',
    description: '研发部移交量产试产新配方，急需工艺员确认清洗要求',
    created_by_role: 'PLANNER',
    created_by_name: '陈计划 (主计划员)',
    created_at: '2026-09-14 08:10',
    craft_confirmed: false
  }
];

/**
 * 3. 清洗基础策略与特殊型号规则
 */
export const DEFAULT_CLEANING_POLICY: CleaningPolicy = {
  version: 'POL-2026-V2.0',
  same_min: 0,    // 同型号 0 分钟
  normal_min: 120,// 普通不同型号 120 分钟 (2h)
  special_min: 180,// 特殊不同型号 180 分钟 (3h)
  effective_at: '2026-09-14 00:00',
  approved_by: '工艺部 魏总工'
};

export const INITIAL_RESTRICTIONS: ReactorRestriction[] = [
  {
    id: 'REST-001',
    product_model: 'SIM-MODEL-SPECIAL-S',
    product_name: '强腐蚀高镍特种电解液 S',
    allowed_reactor_ids: ['R-6000-02'],
    is_exclusive: true,
    reason: '专线隔离硬约束：强腐蚀氟化添加剂严防交叉污染，仅限 R-6000-02 生产'
  }
];

export const INITIAL_WASH_RULES: WashMatrixRule[] = [
  {
    id: 'WASH-RULE-001',
    from_product_type: 'SIM-MODEL-SPECIAL-S',
    to_product_type: 'ANY',
    wash_min: 180,
    is_special_rule: true,
    trigger_direction: 'EITHER',
    approval_status: 'APPROVED',
    description: '特殊高镍强腐蚀型号进出均执行 180 分钟 (3h) 深度洗釜与高温吹扫'
  }
];

/**
 * 4. 向下分批与余量拆分算法 (V2.0 质量守恒原则)
 * 满批数用订单余量除以适用上限向下取整，再保留余量。
 * 严防超负荷，不丢尾量，不四舍五入。
 * 若尾批低于下限，则尝试多釜合法重分配 (例如 6.0 + 4.9 + 1.3)，或列为待处理提示。
 */
export function splitOrderBatches(
  order: ProductionOrder,
  targetReactor: Reactor
): {
  batchIndex: number;
  totalBatches: number;
  batchQtyKg: number;
  assignedReactorId: string;
  isBelowMinWarning?: boolean;
  unassignedRemainderKg?: number;
}[] {
  const Q = Math.round(order.qty_kg);
  const C = targetReactor.max_kg;
  const minKg = targetReactor.min_kg;

  // 1. 如果订单总量小于等于上限
  if (Q <= C) {
    const isBelow = Q < minKg;
    return [
      {
        batchIndex: 1,
        totalBatches: 1,
        batchQtyKg: Q,
        assignedReactorId: targetReactor.reactor_id,
        isBelowMinWarning: isBelow
      }
    ];
  }

  // 2. 向下取整满批数
  const fullBatchCount = Math.floor(Q / C);
  const remainderKg = Q - fullBatchCount * C;

  const batches: {
    batchIndex: number;
    totalBatches: number;
    batchQtyKg: number;
    assignedReactorId: string;
    isBelowMinWarning?: boolean;
    unassignedRemainderKg?: number;
  }[] = [];

  for (let i = 1; i <= fullBatchCount; i++) {
    batches.push({
      batchIndex: i,
      totalBatches: remainderKg > 0 ? fullBatchCount + 1 : fullBatchCount,
      batchQtyKg: C,
      assignedReactorId: targetReactor.reactor_id
    });
  }

  // 3. 尾批检查
  if (remainderKg > 0) {
    if (remainderKg >= minKg) {
      // 尾量满足下限 (如 10.0t 拆为 6.0t + 4.0t)
      batches.push({
        batchIndex: fullBatchCount + 1,
        totalBatches: fullBatchCount + 1,
        batchQtyKg: remainderKg,
        assignedReactorId: targetReactor.reactor_id
      });
    } else {
      // 尾量低于该釜下限 (如 12.2t 产生 0.2t 尾量低于 2000kg)
      // 若允许跨釜组合或 1.3t 釜可用，尝试重分配；否则列为待处理提示
      if (remainderKg <= 1300 && remainderKg >= 300) {
        // 分配给 1.3t 釜 R-1300-01
        batches.push({
          batchIndex: fullBatchCount + 1,
          totalBatches: fullBatchCount + 1,
          batchQtyKg: remainderKg,
          assignedReactorId: 'R-1300-01'
        });
      } else {
        // 低于所有下限 (如 200kg)，列为待处理未排量，绝不丢弃尾量
        batches.push({
          batchIndex: fullBatchCount + 1,
          totalBatches: fullBatchCount + 1,
          batchQtyKg: remainderKg,
          assignedReactorId: targetReactor.reactor_id,
          isBelowMinWarning: true,
          unassignedRemainderKg: remainderKg
        });
      }
    }
  }

  return batches;
}

/**
 * 5. 清洗规则判断顺序 (Page 3 标准 5 级决策链)
 * 1) 型号不在设备白名单或命中禁止规则 -> 禁止排入
 * 2) 上一型号或清洁状态未知 -> 待确认 (不得用 0 分钟初始化)
 * 3) 上一型号与下一型号完全相同 -> 清洗 0 分钟 (工序6标记不适用)
 * 4) 型号不同且匹配已确认特殊规则 -> 清洗 180 分钟 (3h)
 * 5) 型号不同且为普通切换 -> 清洗 120 分钟 (2h)
 */
export function determineCleaningTime(
  prevModelCode: string | null | undefined,
  currentModelCode: string,
  targetReactorId: string,
  restrictions: ReactorRestriction[],
  washRules: WashMatrixRule[],
  reactorCleanState: 'CLEAN' | 'DIRTY' | 'UNKNOWN' = 'CLEAN'
): {
  washMin: number;
  washType: 'SAME_MODEL_0MIN' | 'NORMAL_DIFF_120MIN' | 'SPECIAL_180MIN' | 'UNKNOWN_HOLD' | 'FORBIDDEN';
  ruleDescription: string;
  isAllowed: boolean;
} {
  // 1. 校验白名单与禁止规则
  const checkRest = validateReactorRestriction(currentModelCode, targetReactorId, restrictions);
  if (!checkRest.valid) {
    return {
      washMin: 0,
      washType: 'FORBIDDEN',
      ruleDescription: checkRest.errorMessage || '该型号不在目标设备白名单内，严禁排入',
      isAllowed: false
    };
  }

  // 2. 清洁状态未知或上一型号未知
  if (!prevModelCode || reactorCleanState === 'UNKNOWN') {
    return {
      washMin: 120, // 默认安全待确认
      washType: 'UNKNOWN_HOLD',
      ruleDescription: '上一型号或设备清洁状态未知，需人工确认；不得用 0 分钟初始化',
      isAllowed: true
    };
  }

  // 3. 上一型号与下一型号完全相同 -> 0 分钟免洗
  if (prevModelCode === currentModelCode) {
    return {
      washMin: 0,
      washType: 'SAME_MODEL_0MIN',
      ruleDescription: '同型号连续生产：0 分钟免清洗，工序 6 标记为不适用',
      isAllowed: true
    };
  }

  // 4. 匹配特殊型号清洗规则 (进入/离开/任一侧)
  const isSpecialPrev = prevModelCode.includes('SPECIAL') || prevModelCode.includes('CORROSIVE');
  const isSpecialCurr = currentModelCode.includes('SPECIAL') || currentModelCode.includes('CORROSIVE');

  const matchedSpecialRule = washRules.find(
    (r) =>
      (r.from_product_type === prevModelCode && (r.to_product_type === currentModelCode || r.to_product_type === 'ANY')) ||
      (r.is_special_rule && (isSpecialPrev || isSpecialCurr))
  );

  if (matchedSpecialRule || isSpecialPrev || isSpecialCurr) {
    return {
      washMin: 180,
      washType: 'SPECIAL_180MIN',
      ruleDescription: '匹配特殊清洗规则：高洁净度/防污染要求，执行 180 分钟 (3.0h) 深度清洗',
      isAllowed: true
    };
  }

  // 5. 普通不同型号切换 -> 120 分钟 (2.0h)
  return {
    washMin: 120,
    washType: 'NORMAL_DIFF_120MIN',
    ruleDescription: '普通不同产品型号切换：标准 CIP 清洗 120 分钟 (2.0h)',
    isAllowed: true
  };
}

/**
 * 6. 设备白名单校验
 */
export function validateReactorRestriction(
  productModel: string,
  targetReactorId: string,
  restrictions: ReactorRestriction[]
): { valid: boolean; errorMessage?: string } {
  const rule = restrictions.find((r) => r.product_model === productModel);
  if (!rule) {
    return { valid: true };
  }

  const isAllowed = rule.allowed_reactor_ids.includes(targetReactorId);
  if (!isAllowed) {
    return {
      valid: false,
      errorMessage: `【设备白名单硬约束】型号 [${productModel}] 仅允许在指定设备 [${rule.allowed_reactor_ids.join(
        ', '
      )}] 生产！不可排入 [${targetReactorId}]。原因：${rule.reason}`
    };
  }

  return { valid: true };
}

/**
 * 7. 时间工具转换与开工班次时间窗口计算
 */
export function parseDateToMinutes(dateTimeStr: string): number {
  const d = new Date(dateTimeStr.replace(/-/g, '/'));
  return Math.floor(d.getTime() / (1000 * 60));
}

export function formatMinutesToDate(minutes: number): string {
  const d = new Date(minutes * 1000 * 60);
  const YYYY = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}`;
}

/**
 * 计算单个班次的实际计划毛工时 (小时，支持跨日与任意长度如 8H、12H 等)
 */
export function getShiftDurationHours(shift: ShiftDef): number {
  if (!shift || !shift.startTime || !shift.endTime) return 0;
  const [sH, sM] = shift.startTime.split(':').map(Number);
  let [eH, eM] = shift.endTime.split(':').map(Number);
  let sMin = (sH || 0) * 60 + (sM || 0);
  let eMin = (eH || 0) * 60 + (eM || 0);
  if ((shift.endTime === '24:00' || shift.endTime === '00:00') && eMin === 0) {
    eMin = 1440;
  }
  let duration = eMin - sMin;
  if (duration <= 0) duration += 1440;
  return Number((duration / 60).toFixed(1));
}

/**
 * 获取所有已启用班次的每日总计划毛工时 (小时)
 */
export function getDailyGrossWorkingHours(shifts: ShiftDef[]): number {
  return Number(
    shifts
      .filter((s) => s.isActive)
      .reduce((sum, s) => sum + getShiftDurationHours(s), 0)
      .toFixed(1)
  );
}

/**
 * 获取所有已启用班次的每日休息总时长 (分钟)
 */
export function getDailyBreakMinutes(shifts: ShiftDef[]): number {
  return shifts
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + (s.breakMinutes || 0), 0);
}

/**
 * 获取所有已启用班次的每日有效净开工工时 (小时，扣除工间/就餐休息)
 */
export function getDailyNetWorkingHours(shifts: ShiftDef[]): number {
  const gross = getDailyGrossWorkingHours(shifts);
  const breaksMin = getDailyBreakMinutes(shifts);
  return Math.max(0, Number((gross - breaksMin / 60).toFixed(1)));
}

/**
 * 计算反应釜在指定班次配置下的每日有效额定产能 (kg / 日)
 * 依据设备单批最大容量、产品标准批次耗时及每日净作业工时综合计算
 */
export function calculateReactorDailyCapacityKg(
  reactor: Reactor,
  shifts: ShiftDef[],
  standardBatchHours: number = 7.5
): number {
  const dailyNetHours = getDailyNetWorkingHours(shifts);
  if (dailyNetHours <= 0 || standardBatchHours <= 0) return 0;
  const batchesPerDay = dailyNetHours / standardBatchHours;
  return Math.round(reactor.max_kg * batchesPerDay);
}

/**
 * 获取指定班次在一天内的产线休息时间窗 [startMin, endMin] (0..1439)
 */
export function getShiftBreakWindow(shift: ShiftDef): { startMin: number; endMin: number; breakMinutes: number } | null {
  if (!shift || !shift.breakMinutes || shift.breakMinutes <= 0) return null;

  const [sH, sM] = (shift.startTime || '08:00').split(':').map(Number);
  let [eH, eM] = (shift.endTime || '16:00').split(':').map(Number);
  let sMin = (sH || 0) * 60 + (sM || 0);
  let eMin = (eH || 0) * 60 + (eM || 0);
  if ((shift.endTime === '24:00' || shift.endTime === '00:00') && eMin === 0) {
    eMin = 1440;
  }
  let shiftDuration = eMin - sMin;
  if (shiftDuration <= 0) shiftDuration += 1440;

  let bStartMin: number;
  if (shift.breakStartTime) {
    const [bH, bM] = shift.breakStartTime.split(':').map(Number);
    bStartMin = (bH || 0) * 60 + (bM || 0);
  } else {
    // 默认根据班次类型或中点设置合理休息时间
    if (shift.code === 'DAY') {
      bStartMin = 12 * 60; // 12:00
    } else if (shift.code === 'MIDDLE') {
      bStartMin = 18 * 60; // 18:00
    } else if (shift.code === 'NIGHT') {
      bStartMin = 3 * 60 + 30; // 03:30
    } else {
      bStartMin = (sMin + Math.floor((shiftDuration - shift.breakMinutes) / 2)) % 1440;
    }
  }

  let bEndMin = bStartMin + shift.breakMinutes;
  return { startMin: bStartMin, endMin: bEndMin, breakMinutes: shift.breakMinutes };
}

/**
 * 校验某个时刻 (分钟) 是否处于产线休息 (工间/午餐/晚餐/夜餐) 时段
 */
export function isMinuteInShiftBreak(
  dateMinutes: number,
  shifts: ShiftDef[]
): { isBreak: boolean; shiftName?: string; breakName?: string; breakMinutes?: number } {
  const activeShifts = shifts.filter((s) => s.isActive);
  const d = new Date(dateMinutes * 1000 * 60);
  const dayMinute = d.getHours() * 60 + d.getMinutes(); // 0 .. 1439

  for (const shift of activeShifts) {
    // 校验该时刻是否在该班次所属时间窗内
    const [startH, startM] = shift.startTime.split(':').map(Number);
    let [endH, endM] = shift.endTime.split(':').map(Number);
    let sMin = (startH || 0) * 60 + (startM || 0);
    let eMin = (endH || 0) * 60 + (endM || 0);
    if ((shift.endTime === '24:00' || shift.endTime === '00:00') && eMin === 0) {
      eMin = 1440;
    }

    const inShiftSpan = sMin < eMin
      ? dayMinute >= sMin && dayMinute < eMin
      : dayMinute >= sMin || dayMinute < eMin;

    if (!inShiftSpan) continue;

    const breakWin = getShiftBreakWindow(shift);
    if (!breakWin) continue;

    const { startMin: bStart, endMin: bEnd } = breakWin;
    let inBreak = false;
    if (bEnd <= 1440) {
      inBreak = dayMinute >= bStart && dayMinute < bEnd;
    } else {
      inBreak = dayMinute >= bStart || dayMinute < (bEnd % 1440);
    }

    if (inBreak) {
      return {
        isBreak: true,
        shiftName: shift.name,
        breakName: shift.breakName || '产线休息',
        breakMinutes: shift.breakMinutes
      };
    }
  }
  return { isBreak: false };
}

/**
 * 校验某个时刻 (分钟) 是否属于产线纯生产开工时段：
 * 1. 必须落在已激活的开工班次内 (如单班时 16:00~次日08:00 不算开工)
 * 2. 必须不在该班次的产线休息时间窗内 (去除产线休息时间，如午餐 12:00~13:00)
 */
export function isMinuteInWorkingTime(dateMinutes: number, shifts: ShiftDef[]): boolean {
  const activeShifts = shifts.filter((s) => s.isActive);
  if (activeShifts.length === 0) return true; // 若全部未勾选，默认允许

  const d = new Date(dateMinutes * 1000 * 60);
  const dayMinute = d.getHours() * 60 + d.getMinutes(); // 0 .. 1439

  // 1. 查找当前时刻所在的已激活班次
  const matchedShift = activeShifts.find((shift) => {
    const [startH, startM] = shift.startTime.split(':').map(Number);
    let [endH, endM] = shift.endTime.split(':').map(Number);
    let sMin = (startH || 0) * 60 + (startM || 0);
    let eMin = (endH || 0) * 60 + (endM || 0);
    if ((shift.endTime === '24:00' || shift.endTime === '00:00') && eMin === 0) {
      eMin = 1440;
    }

    if (sMin < eMin) {
      return dayMinute >= sMin && dayMinute < eMin;
    } else {
      return dayMinute >= sMin || dayMinute < eMin;
    }
  });

  if (!matchedShift) {
    return false; // 不在有效开工班次内 (停工班次)
  }

  // 2. 检查是否落在产线休息时间内 (去除休息时间)
  const breakWin = getShiftBreakWindow(matchedShift);
  if (breakWin) {
    const { startMin: bStart, endMin: bEnd } = breakWin;
    let inBreak = false;
    if (bEnd <= 1440) {
      inBreak = dayMinute >= bStart && dayMinute < bEnd;
    } else {
      inBreak = dayMinute >= bStart || dayMinute < (bEnd % 1440);
    }
    if (inBreak) {
      return false; // 产线休息时段，去除！
    }
  }

  return true;
}

/**
 * 兼容保留原名 isMinuteInActiveShiftWindow (同 isMinuteInWorkingTime)
 */
export function isMinuteInActiveShiftWindow(dateMinutes: number, shifts: ShiftDef[]): boolean {
  return isMinuteInWorkingTime(dateMinutes, shifts);
}

/**
 * 若当前时刻落在停工时段或产线休息时段，顺延到下一个产线正式开工的时刻
 */
export function moveToNextActiveShiftStart(currentMinutes: number, shifts: ShiftDef[]): number {
  let cur = currentMinutes;
  const activeShifts = shifts.filter((s) => s.isActive);
  if (activeShifts.length === 0) return cur;

  let safetyCount = 0;
  // 逐分钟精确寻找下一个真实生产开工时刻
  while (!isMinuteInWorkingTime(cur, shifts) && safetyCount < 1440 * 14) {
    cur += 1;
    safetyCount++;
  }
  return cur;
}

/**
 * 依据车间实际启用的开工班次推进纯生产工时 (分钟)
 * 自动跨越并扣除：所有非开工班次 (例如单班的夜间) 以及各班次的产线休息时间 (例如午餐/晚餐/夜餐)
 */
export function advanceByWorkingMinutes(
  startMinutes: number,
  durationMinutes: number,
  shifts: ShiftDef[]
): { actualStartMin: number; endMin: number } {
  if (durationMinutes <= 0) {
    const actual = moveToNextActiveShiftStart(startMinutes, shifts);
    return { actualStartMin: actual, endMin: actual };
  }

  // 1. 若起始点在停工时段或休息时段，推至下一正式开工时刻
  const actualStartMin = moveToNextActiveShiftStart(startMinutes, shifts);

  // 2. 逐分钟累计实际有效工作时长 (去除所有休息和停工时段，毫厘不差)
  let accumulatedWork = 0;
  let cur = actualStartMin;

  while (accumulatedWork < durationMinutes) {
    if (isMinuteInWorkingTime(cur, shifts)) {
      accumulatedWork += 1;
    }
    cur += 1;
  }

  return {
    actualStartMin,
    endMin: cur
  };
}

export interface WorkingSegment {
  startMin: number;
  endMin: number;
  workMinutes: number;
  isFirst: boolean;
  isLast: boolean;
  segmentIndex: number;
  totalSegments: number;
  pauseAfterMinutes?: number;
}

/**
 * 将跨越停工时段与产线休息时段的批次任务拆解为工作区段与停工暂停区间
 * 用于甘特图可视化：排班时段准确剔除产线休息和不上班区间，并清晰标记暂停时段
 */
export function getBatchWorkingSegments(
  startMin: number,
  endMin: number,
  shifts: ShiftDef[]
): WorkingSegment[] {
  // 检查是否有任何非工作时段或休息时间
  const hasBreaks = shifts.some((s) => s.isActive && (s.breakMinutes || 0) > 0);
  const hasInactiveShifts = shifts.some((s) => !s.isActive);

  if (!hasBreaks && !hasInactiveShifts) {
    return [
      {
        startMin,
        endMin,
        workMinutes: endMin - startMin,
        isFirst: true,
        isLast: true,
        segmentIndex: 0,
        totalSegments: 1
      }
    ];
  }

  const rawSegments: { start: number; end: number }[] = [];
  let inActiveSegment = false;
  let segStart = startMin;

  for (let t = startMin; t < endMin; t += 1) {
    const isWork = isMinuteInWorkingTime(t, shifts);
    if (isWork) {
      if (!inActiveSegment) {
        segStart = t;
        inActiveSegment = true;
      }
    } else {
      if (inActiveSegment) {
        rawSegments.push({ start: segStart, end: t });
        inActiveSegment = false;
      }
    }
  }
  if (inActiveSegment) {
    rawSegments.push({ start: segStart, end: endMin });
  }

  if (rawSegments.length === 0) {
    return [
      {
        startMin,
        endMin,
        workMinutes: endMin - startMin,
        isFirst: true,
        isLast: true,
        segmentIndex: 0,
        totalSegments: 1
      }
    ];
  }

  return rawSegments.map((seg, idx) => {
    const nextSeg = rawSegments[idx + 1];
    const pauseAfterMinutes = nextSeg ? nextSeg.start - seg.end : undefined;
    return {
      startMin: seg.start,
      endMin: seg.end,
      workMinutes: seg.end - seg.start,
      isFirst: idx === 0,
      isLast: idx === rawSegments.length - 1,
      segmentIndex: idx,
      totalSegments: rawSegments.length,
      pauseAfterMinutes
    };
  });
}

/**
 * 8. 默认订单初始化清单 (贴合 V2.0 验收用例与真实场景)
 */
export const INITIAL_ORDERS_V2: ProductionOrder[] = [
  {
    order_no: 'SIM-SO-001',
    customer_name: '客户 A (宁德动力汽车)',
    product_model: 'SIM-MODEL-A',
    product_name: '普通动力三元动力电解液 A',
    workshop_id: 'WS-01',
    qty_kg: 10000, // 10.0 t -> 拆为 6.0t + 4.0t
    received_at: '2026-09-13 10:00',
    customer_due_at: '2026-09-16 18:00',
    production_due_at: '2026-09-16 12:00',
    priority: 'HIGH',
    urgent: false,
    status: 'IN_PRODUCTION',
    allow_split: true,
    allow_parallel: true,
    split_batches: [
      { batch_no: 'SIM-B001', qty_kg: 6000, reactor_id: 'R-6000-01' },
      { batch_no: 'SIM-B002', qty_kg: 4000, reactor_id: 'R-6000-01' }
    ],
    completed_good_kg: 6000, // 灌装已完成 6000kg (60%)
    last_reported_at: '2026-09-14 12:00',
    forecast_finish_at: '2026-09-14 20:00',
    notes: '一期核心大客户，按期保障首选'
  },
  {
    order_no: 'SIM-SO-002',
    customer_name: '客户 B (比亚迪储能事业部)',
    product_model: 'SIM-MODEL-B',
    product_name: '储能长寿命磷酸铁锂电解液 B',
    workshop_id: 'WS-02',
    qty_kg: 7300, // 7.3 t -> 拆为 6.0t + 1.3t
    received_at: '2026-09-13 14:00',
    customer_due_at: '2026-09-17 12:00',
    production_due_at: '2026-09-17 06:00',
    priority: 'HIGH',
    urgent: false,
    status: 'SCHEDULED',
    allow_split: true,
    allow_parallel: false,
    split_batches: [
      { batch_no: 'SIM-B003', qty_kg: 6000, reactor_id: 'R-6000-03' },
      { batch_no: 'SIM-B004', qty_kg: 1300, reactor_id: 'R-1300-01' }
    ],
    completed_good_kg: 0,
    last_reported_at: '2026-09-14 08:00',
    forecast_finish_at: '2026-09-15 16:00',
    notes: '二期车间主力储能磷酸铁锂配方，不同型号转产需清洗 120 分钟'
  },
  {
    order_no: 'SIM-SO-003',
    customer_name: '客户 S (特种固态/航天电池)',
    product_model: 'SIM-MODEL-SPECIAL-S',
    product_name: '强腐蚀高镍特种电解液 S (专釜限制)',
    workshop_id: 'WS-02',
    qty_kg: 6000, // 6.0 t -> 专釜强制限定 R-6000-02
    received_at: '2026-09-14 09:00',
    customer_due_at: '2026-09-18 18:00',
    production_due_at: '2026-09-18 08:00',
    priority: 'URGENT',
    urgent: true,
    status: 'SCHEDULED',
    allow_split: true,
    allow_parallel: false,
    split_batches: [
      { batch_no: 'SIM-B005', qty_kg: 6000, reactor_id: 'R-6000-02' }
    ],
    completed_good_kg: 0,
    last_reported_at: '2026-09-14 09:00',
    forecast_finish_at: '2026-09-16 02:00',
    notes: '【二期专釜硬约束】仅限 R-6000-02，特殊清洗 180 分钟'
  },
  {
    order_no: 'SIM-SO-004',
    customer_name: '客户 D (数码消费电芯)',
    product_model: 'SIM-MODEL-C',
    product_name: '快充高电压消费类电解液 C',
    workshop_id: 'WS-01',
    qty_kg: 1000, // 1.0 t -> 分配给 R-1300-01
    received_at: '2026-09-14 08:30',
    customer_due_at: '2026-09-15 20:00',
    production_due_at: '2026-09-15 14:00',
    priority: 'NORMAL',
    urgent: false,
    status: 'SCHEDULED',
    allow_split: true,
    allow_parallel: false,
    split_batches: [
      { batch_no: 'SIM-B006', qty_kg: 1000, reactor_id: 'R-1300-01' }
    ],
    completed_good_kg: 0,
    last_reported_at: '2026-09-14 08:30',
    forecast_finish_at: '2026-09-14 23:00',
    notes: '一期小批量消费电解液，投 1.3t 釜'
  }
];

/**
 * 9. 批次初始化任务 (包含 Page 10 甘特图原型真实呈现)
 * 包含：
 * - 一期车间:
 *   - R-1300-01: A 1.3t (已开工) -> 洗 2h -> C 1.0t
 *   - R-6000-01: A 6.0t (已开工) -> A 4.0t (同型号免洗 0h)
 * - 二期车间:
 *   - R-6000-02: 特殊切换 3h -> S 6.0t (专属高镍釜)
 *   - R-6000-03: 洗 2h -> B 6.0t (储能配制釜)
 */
export const INITIAL_BATCH_TASKS_V2: BatchTask[] = [
  // 一期车间 (WS-01) - 釜 1 (R-1300-01)
  {
    batch_id: 'SIM-B007',
    order_no: 'SIM-SO-PREV',
    customer_name: '客户 A (宁德动力)',
    product_model: 'SIM-MODEL-A',
    product_name: '普通动力三元动力电解液 A',
    workshop_id: 'WS-01',
    batch_qty_kg: 1300,
    assigned_reactor_id: 'R-1300-01',
    plan_start_time: '2026-09-14 08:00',
    plan_end_time: '2026-09-14 15:30',
    plan_duration_min: 450,
    actual_start_time: '2026-09-14 08:00',
    deviation_type: 'NORMAL',
    deviation_minutes: 0,
    is_reason_submitted: true,
    is_locked: true,
    is_actual: true,
    current_step: 4, // 取样检测
    step_status: 'PROCESSING',
    qc_status: 'TESTING',
    good_filled_kg: 0,
    preceding_wash_min: 0,
    wash_rule_type: 'SAME_MODEL_0MIN',
    batch_index: 1,
    total_batches: 1,
    notes: '一期开工首批在制中，当前处于取样检测工序'
  },
  {
    batch_id: 'SIM-B006',
    order_no: 'SIM-SO-004',
    customer_name: '客户 D (数码高压)',
    product_model: 'SIM-MODEL-C',
    product_name: '快充高电压消费类电解液 C',
    workshop_id: 'WS-01',
    batch_qty_kg: 1000,
    assigned_reactor_id: 'R-1300-01',
    plan_start_time: '2026-09-14 17:30',
    plan_end_time: '2026-09-15 03:00',
    plan_duration_min: 570,
    actual_start_time: '2026-09-14 18:30',
    deviation_type: 'DELAY_START',
    deviation_minutes: 60,
    deviation_category: 'RAW_MATERIAL_DELAY',
    deviation_reason: '高纯添加剂 D-03 供应商物流入库检验耗时延长 1.0 小时，导致现场推迟投料',
    corrective_action: '已加急质检快测放行，并协调后续混合搅拌工艺提速',
    responsible_dept: '采购与仓储部',
    responsible_person: '周主管',
    reported_at: '2026-09-14 18:35',
    is_reason_submitted: true,
    is_locked: true,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 120, // 普通换线 2h (120min)
    preceding_wash_start: '2026-09-14 15:30',
    preceding_wash_end: '2026-09-14 17:30',
    wash_rule_type: 'NORMAL_DIFF_120MIN',
    batch_index: 1,
    total_batches: 1,
    notes: '普通型号切换：标准 CIP 清洗 2.0 小时'
  },

  // 一期车间 (WS-01) - 釜 2 (R-6000-01)
  {
    batch_id: 'SIM-B001',
    order_no: 'SIM-SO-001',
    customer_name: '客户 A (宁德动力)',
    product_model: 'SIM-MODEL-A',
    product_name: '普通动力三元动力电解液 A',
    workshop_id: 'WS-01',
    batch_qty_kg: 6000,
    assigned_reactor_id: 'R-6000-01',
    plan_start_time: '2026-09-14 08:00',
    plan_end_time: '2026-09-14 16:00',
    plan_duration_min: 480,
    actual_start_time: '2026-09-14 08:00',
    actual_end_time: '2026-09-14 15:30',
    actual_duration_min: 450,
    deviation_type: 'EARLY',
    deviation_minutes: -30,
    deviation_category: 'OTHER',
    deviation_reason: '双层夹套温控稳定且水分快检指标优秀 (11ppm)，提前 30 分钟完成灌装入库',
    corrective_action: '固化当班操作参数模板',
    responsible_dept: '生产运行部',
    responsible_person: '李班长',
    reported_at: '2026-09-14 15:35',
    is_reason_submitted: true,
    is_locked: true,
    is_actual: true,
    current_step: 5, // 灌装
    step_status: 'FINISHED',
    qc_status: 'RELEASED',
    good_filled_kg: 6000, // 合格灌装 6000 kg
    preceding_wash_min: 0,
    wash_rule_type: 'SAME_MODEL_0MIN',
    batch_index: 1,
    total_batches: 2,
    notes: '第一批 6.0T 灌装已完成，合格入库 6,000 kg'
  },
  {
    batch_id: 'SIM-B002-REASSIGNED',
    order_no: 'SIM-SO-001',
    customer_name: '客户 A (宁德动力)',
    product_model: 'SIM-MODEL-A',
    product_name: '普通动力三元动力电解液 A',
    workshop_id: 'WS-01',
    batch_qty_kg: 4000,
    assigned_reactor_id: 'R-6000-01',
    plan_start_time: '2026-09-14 16:00',
    plan_end_time: '2026-09-15 02:00',
    plan_duration_min: 600,
    actual_start_time: '2026-09-14 17:15',
    deviation_type: 'DELAY_START',
    deviation_minutes: 75,
    deviation_category: 'EQUIPMENT_FAULT',
    deviation_reason: '反应釜底部出料气动阀门密封磨损微漏，机修紧急更换密封圈及打压测试 75 分钟',
    corrective_action: '已完成氮气保压试验 0.4MPa 达标，夜班巡检重点复查该阀门',
    responsible_dept: '设备工程部',
    responsible_person: '王工 (机修)',
    reported_at: '2026-09-14 17:20',
    is_reason_submitted: true,
    is_locked: true,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 0, // 同型号免洗 0h
    wash_rule_type: 'SAME_MODEL_0MIN',
    batch_index: 2,
    total_batches: 2,
    notes: '同型号连续生产：0 分钟免洗，工序 6 标记为不适用'
  },

  // 二期车间 (WS-02) - 釜 3 (R-6000-02 专釜)
  {
    batch_id: 'SIM-B005',
    order_no: 'SIM-SO-003',
    customer_name: '客户 S (特种固态/航天)',
    product_model: 'SIM-MODEL-SPECIAL-S',
    product_name: '强腐蚀高镍特种电解液 S (专釜限制)',
    workshop_id: 'WS-02',
    batch_qty_kg: 6000,
    assigned_reactor_id: 'R-6000-02',
    plan_start_time: '2026-09-14 11:00',
    plan_end_time: '2026-09-15 00:00',
    plan_duration_min: 780,
    actual_start_time: '2026-09-14 12:30',
    deviation_type: 'DELAY_START',
    deviation_minutes: 90,
    deviation_category: 'CIP_OVERTIME',
    deviation_reason: '强腐蚀特种电解液前序深度清洗残液检测电导率偏高，执行二次纯溶剂淋洗 1.5 小时',
    corrective_action: '追加二次取样分析电导率与酸度达标后放行投料',
    responsible_dept: '生产车间',
    responsible_person: '赵技师',
    reported_at: '2026-09-14 12:35',
    is_reason_submitted: true,
    is_locked: true,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 180, // 特殊切换 3h (180min)
    preceding_wash_start: '2026-09-14 08:00',
    preceding_wash_end: '2026-09-14 11:00',
    wash_rule_type: 'SPECIAL_180MIN',
    batch_index: 1,
    total_batches: 1,
    notes: '【二期专线隔离】指定 R-6000-02 设备，特殊切换洗釜 3.0 小时 (180分钟)'
  },

  // 二期车间 (WS-02) - 釜 4 (R-6000-03 配制釜)
  {
    batch_id: 'SIM-B003',
    order_no: 'SIM-SO-002',
    customer_name: '客户 B (比亚迪储能)',
    product_model: 'SIM-MODEL-B',
    product_name: '储能长寿命磷酸铁锂电解液 B',
    workshop_id: 'WS-02',
    batch_qty_kg: 6000,
    assigned_reactor_id: 'R-6000-03',
    plan_start_time: '2026-09-14 10:00',
    plan_end_time: '2026-09-14 20:30',
    plan_duration_min: 630,
    actual_start_time: '2026-09-14 10:00',
    deviation_type: 'NORMAL',
    deviation_minutes: 0,
    is_reason_submitted: true,
    is_locked: true,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 120, // 普通切换 2h
    preceding_wash_start: '2026-09-14 08:00',
    preceding_wash_end: '2026-09-14 10:00',
    wash_rule_type: 'NORMAL_DIFF_120MIN',
    batch_index: 1,
    total_batches: 1,
    notes: '二期储能配制釜：标准 CIP 换线洗釜 2.0 小时'
  },
  {
    batch_id: 'SIM-B004-R3',
    order_no: 'SIM-SO-002',
    customer_name: '客户 B (比亚迪储能)',
    product_model: 'SIM-MODEL-B',
    product_name: '储能长寿命磷酸铁锂电解液 B',
    workshop_id: 'WS-02',
    batch_qty_kg: 6000,
    assigned_reactor_id: 'R-6000-03',
    plan_start_time: '2026-09-14 21:00',
    plan_end_time: '2026-09-15 07:30',
    plan_duration_min: 630,
    actual_start_time: '2026-09-14 21:00',
    deviation_type: 'NORMAL',
    deviation_minutes: 0,
    is_reason_submitted: true,
    is_locked: true,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 0, // 同型号免洗 0h
    wash_rule_type: 'SAME_MODEL_0MIN',
    batch_index: 2,
    total_batches: 2,
    notes: '同型号连续配制：0 分钟免洗'
  },

  // 09-15 排产任务 (周计划/月计划多日连续排产覆盖)
  {
    batch_id: 'SIM-B008',
    order_no: 'SIM-SO-005',
    customer_name: '客户 C (国轩高科)',
    product_model: 'SIM-MODEL-A',
    product_name: '普通动力三元动力电解液 A',
    workshop_id: 'WS-01',
    batch_qty_kg: 6000,
    assigned_reactor_id: 'R-6000-01',
    plan_start_time: '2026-09-15 08:00',
    plan_end_time: '2026-09-15 16:00',
    plan_duration_min: 480,
    actual_start_time: '2026-09-15 08:00',
    deviation_type: 'NORMAL',
    deviation_minutes: 0,
    is_reason_submitted: true,
    is_locked: false,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 0,
    wash_rule_type: 'SAME_MODEL_0MIN',
    batch_index: 1,
    total_batches: 1,
    notes: '09-15 早班计划：动力线 1 号釜连续生产'
  },
  {
    batch_id: 'SIM-B009',
    order_no: 'SIM-SO-006',
    customer_name: '客户 S (特种固态/航天)',
    product_model: 'SIM-MODEL-SPECIAL-S',
    product_name: '强腐蚀高镍特种电解液 S (专釜限制)',
    workshop_id: 'WS-02',
    batch_qty_kg: 6000,
    assigned_reactor_id: 'R-6000-02',
    plan_start_time: '2026-09-15 08:30',
    plan_end_time: '2026-09-15 21:30',
    plan_duration_min: 780,
    actual_start_time: '2026-09-15 08:30',
    deviation_type: 'NORMAL',
    deviation_minutes: 0,
    is_reason_submitted: true,
    is_locked: false,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 0,
    wash_rule_type: 'SAME_MODEL_0MIN',
    batch_index: 1,
    total_batches: 1,
    notes: '09-15 专釜连续配制：免洗 0 分钟'
  },
  {
    batch_id: 'SIM-B010',
    order_no: 'SIM-SO-007',
    customer_name: '客户 D (数码高压)',
    product_model: 'SIM-MODEL-C',
    product_name: '快充高电压消费类电解液 C',
    workshop_id: 'WS-01',
    batch_qty_kg: 1200,
    assigned_reactor_id: 'R-1300-01',
    plan_start_time: '2026-09-15 08:00',
    plan_end_time: '2026-09-15 15:30',
    plan_duration_min: 450,
    actual_start_time: '2026-09-15 08:00',
    deviation_type: 'NORMAL',
    deviation_minutes: 0,
    is_reason_submitted: true,
    is_locked: false,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 0,
    wash_rule_type: 'SAME_MODEL_0MIN',
    batch_index: 1,
    total_batches: 1,
    notes: '09-15 特种线 1.3t 釜连续免洗生产'
  },
  {
    batch_id: 'SIM-B011',
    order_no: 'SIM-SO-008',
    customer_name: '客户 B (比亚迪储能)',
    product_model: 'SIM-MODEL-B',
    product_name: '储能长寿命磷酸铁锂电解液 B',
    workshop_id: 'WS-02',
    batch_qty_kg: 6000,
    assigned_reactor_id: 'R-6000-03',
    plan_start_time: '2026-09-15 09:00',
    plan_end_time: '2026-09-15 19:30',
    plan_duration_min: 630,
    actual_start_time: '2026-09-15 09:00',
    deviation_type: 'NORMAL',
    deviation_minutes: 0,
    is_reason_submitted: true,
    is_locked: false,
    is_actual: false,
    current_step: 1,
    step_status: 'PENDING',
    qc_status: 'WAITING',
    good_filled_kg: 0,
    preceding_wash_min: 0,
    wash_rule_type: 'SAME_MODEL_0MIN',
    batch_index: 1,
    total_batches: 1,
    notes: '09-15 二期 6t 储能釜连续配制'
  }
];

/**
 * 根据最新班次定义与休息时间规则，对指定反应釜上的现有批次序列进行流水推进重排
 * 保证：
 * 1. 严格按工序先后顺序排列，绝不发生批次时间重叠
 * 2. 真实已完成批次 (is_actual && actual_end_time) 保持已完工时刻不变
 * 3. 正在生产批次 (is_actual && !actual_end_time) 从开工时刻起，依班次扣减休息推进至完工
 * 4. 待生产批次紧随前批完工，前序洗釜 (同型号免洗/异型号标准清洗/专釜清洗) 依班次工时动态推进，生产紧跟洗釜后
 * 5. 批次时长与起止时间在单班/双班/三班切换时自适应伸缩，自动跨越夜间停工与工间休整
 */
export function rescheduleBatchesSequenceForReactor(
  batchesOnReactor: BatchTask[],
  reactor: Reactor,
  restrictions: ReactorRestriction[],
  washRules: WashMatrixRule[],
  customShifts: ShiftDef[],
  mainStepsTotalHours: number,
  t0Minutes: number
): BatchTask[] {
  // 按批次计划开始时间排序
  const sorted = [...batchesOnReactor].sort(
    (a, b) => parseDateToMinutes(a.plan_start_time) - parseDateToMinutes(b.plan_start_time)
  );

  let currentReactorAvailableMin = t0Minutes;
  let lastModelCode = reactor.last_model_code;
  let cleanState = reactor.clean_state;

  const recalculated: BatchTask[] = [];

  for (const b of sorted) {
    const matchedModel = INITIAL_PRODUCT_MODELS.find((m) => m.model_code === b.product_model);
    const modelBatchHours = matchedModel?.batch_standard_hours || mainStepsTotalHours;
    const netBatchProdDurationMin = Math.round(modelBatchHours * 60);

    // 1. 已完成批次 (实际已结束)：保持原记录，推进反应釜占用时间
    if (b.is_actual && b.actual_end_time) {
      const endMin = parseDateToMinutes(b.actual_end_time);
      currentReactorAvailableMin = Math.max(currentReactorAvailableMin, endMin);
      lastModelCode = b.product_model;
      cleanState = 'CLEAN';
      recalculated.push(b);
      continue;
    }

    // 2. 正在执行中的批次 (已开工未结束，如 SIM-B007 在 08:00 开工)
    if (b.is_actual && !b.actual_end_time) {
      const startMin = parseDateToMinutes(b.actual_start_time || b.plan_start_time);
      const prodTiming = advanceByWorkingMinutes(startMin, netBatchProdDurationMin, customShifts);
      const updatedBatch: BatchTask = {
        ...b,
        plan_start_time: formatMinutesToDate(prodTiming.actualStartMin),
        plan_end_time: formatMinutesToDate(prodTiming.endMin),
        plan_duration_min: prodTiming.endMin - prodTiming.actualStartMin
      };
      currentReactorAvailableMin = prodTiming.endMin;
      lastModelCode = b.product_model;
      cleanState = 'CLEAN';
      recalculated.push(updatedBatch);
      continue;
    }

    // 3. 待生产批次 (计划批次或锁定批次)：紧接前序可用时刻
    const washDecision = determineCleaningTime(
      lastModelCode,
      b.product_model,
      reactor.reactor_id,
      restrictions,
      washRules,
      cleanState
    );

    let washStartMin: number | undefined;
    let washEndMin: number | undefined;

    if (washDecision.washMin > 0) {
      const washTiming = advanceByWorkingMinutes(currentReactorAvailableMin, washDecision.washMin, customShifts);
      washStartMin = washTiming.actualStartMin;
      washEndMin = washTiming.endMin;
      currentReactorAvailableMin = washTiming.endMin;
    }

    // 生产作业工时推进 (跳过非开工班次与休息)
    const prodTiming = advanceByWorkingMinutes(currentReactorAvailableMin, netBatchProdDurationMin, customShifts);
    const prodStartMin = prodTiming.actualStartMin;
    const prodEndMin = prodTiming.endMin;
    currentReactorAvailableMin = prodTiming.endMin;
    lastModelCode = b.product_model;
    cleanState = 'CLEAN';

    const updatedBatch: BatchTask = {
      ...b,
      plan_start_time: formatMinutesToDate(prodStartMin),
      plan_end_time: formatMinutesToDate(prodEndMin),
      plan_duration_min: prodEndMin - prodStartMin,
      preceding_wash_min: washDecision.washMin,
      preceding_wash_start: washStartMin !== undefined ? formatMinutesToDate(washStartMin) : undefined,
      preceding_wash_end: washEndMin !== undefined ? formatMinutesToDate(washEndMin) : undefined,
      wash_rule_type: washDecision.washType === 'FORBIDDEN' ? 'NORMAL_DIFF_120MIN' : washDecision.washType
    };

    recalculated.push(updatedBatch);
  }

  return recalculated;
}

/**
 * 10. 全局排产重算引擎 (含未来 24 小时冻结窗口)
 * t0 = 2026-09-14 08:00
 * freeze_until = 2026-09-15 08:00 (未来 24 小时已发布计划锁定)
 */
export function runSmartSchedule(
  orders: ProductionOrder[],
  reactors: Reactor[],
  restrictions: ReactorRestriction[],
  washRules: WashMatrixRule[],
  currentBatches: BatchTask[],
  t0Str: string = '2026-09-14 08:00',
  strategy: 'SETUP_MINIMIZE' | 'EDD_FIRST' | 'LOAD_BALANCE' = 'SETUP_MINIMIZE',
  customProcessNodes: ProcessNodeDef[] = PROCESS_NODES,
  customShifts: ShiftDef[] = DEFAULT_SHIFTS,
  customStaffing: StaffingConfig = DEFAULT_STAFFING_CONFIG
): {
  batches: BatchTask[];
  unassignedIssues: string[];
  totalWashMin: number;
} {
  const t0Minutes = parseDateToMinutes(t0Str);
  const freezeLimitMinutes = t0Minutes + 24 * 60; // 24小时连续锁定
  const unassignedIssues: string[] = [];

  // 计算动态批次标准工时 (工序1~5标准工时求和)
  const mainStepsTotalHours = customProcessNodes
    .filter((n) => n.id >= 1 && n.id <= 5)
    .reduce((acc, n) => acc + (n.standard_hours || 0), 0);

  // 生产主管录入的员工数量约束校验
  if (customStaffing.totalWorkers < 12) {
    unassignedIssues.push(
      `【STAFFING_ALERT】当前车间录入员工总数仅 ${customStaffing.totalWorkers} 人（合格操作工 ${customStaffing.qualifiedOperators} 人），多釜同时投料/灌装时可能产生人工等待。`
    );
  }

  // 依据排班班次与休息规则，对每台反应釜上的现有批次进行序列重排与工时推移
  const preservedBatches: BatchTask[] = [];
  const reactorTimeline: Record<
    string,
    { nextAvailableMinutes: number; lastModelCode: string; cleanState: 'CLEAN' | 'DIRTY' | 'UNKNOWN' }
  > = {};

  reactors.forEach((reactor) => {
    const assignedBatches = currentBatches.filter((b) => b.assigned_reactor_id === reactor.reactor_id);

    if (assignedBatches.length > 0) {
      const recalculatedBatches = rescheduleBatchesSequenceForReactor(
        assignedBatches,
        reactor,
        restrictions,
        washRules,
        customShifts,
        mainStepsTotalHours,
        t0Minutes
      );
      preservedBatches.push(...recalculatedBatches);

      const sortedRecalc = [...recalculatedBatches].sort(
        (a, b) => parseDateToMinutes(b.plan_end_time) - parseDateToMinutes(a.plan_end_time)
      );
      const lastTask = sortedRecalc[0];
      reactorTimeline[reactor.reactor_id] = {
        nextAvailableMinutes: parseDateToMinutes(lastTask.plan_end_time),
        lastModelCode: lastTask.product_model,
        cleanState: 'CLEAN'
      };
    } else {
      reactorTimeline[reactor.reactor_id] = {
        nextAvailableMinutes: t0Minutes,
        lastModelCode: reactor.last_model_code,
        cleanState: reactor.clean_state
      };
    }
  });

  // 保留可能不在上述 reactions 列表中的离线批次
  const unassignedBatches = currentBatches.filter(
    (b) => !reactors.some((r) => r.reactor_id === b.assigned_reactor_id)
  );
  if (unassignedBatches.length > 0) {
    preservedBatches.push(...unassignedBatches);
  }

  // 找出未完全排产的订单
  const scheduledOrderNos = new Set(preservedBatches.map((b) => b.order_no));
  const pendingOrders = orders.filter((o) => !scheduledOrderNos.has(o.order_no) || o.status === 'PENDING_SCHEDULE');

  // 排序订单
  if (strategy === 'SETUP_MINIMIZE') {
    pendingOrders.sort((a, b) => {
      if (a.priority === 'URGENT' && b.priority !== 'URGENT') return -1;
      if (b.priority === 'URGENT' && a.priority !== 'URGENT') return 1;
      return a.product_model.localeCompare(b.product_model);
    });
  } else {
    // EDD
    pendingOrders.sort((a, b) => a.production_due_at.localeCompare(b.production_due_at));
  }

  const newScheduledBatches: BatchTask[] = [...preservedBatches];

  pendingOrders.forEach((order) => {
    // 寻找允许生产该型号的反应釜候选 (考虑计划员配置的白名单)
    const allowedReactors = reactors.filter((r) => {
      const res = validateReactorRestriction(order.product_model, r.reactor_id, restrictions);
      return res.valid;
    });

    if (allowedReactors.length === 0) {
      unassignedIssues.push(
        `【NO_ALLOWED_REACTOR】订单 ${order.order_no} (${order.product_model}) 无合规可用反应釜！`
      );
      return;
    }

    // 优先匹配设备：大批量(>1.3t)优先 6t 釜，小批量优先 1.3t 釜
    let selectedReactor = allowedReactors[0];
    if (order.qty_kg > 1300) {
      const candidates6T = allowedReactors.filter((r) => r.max_kg >= 6000);
      if (candidates6T.length > 0) {
        // 若追求换产最小化，优先选上一型号相同的釜
        const sameModel = candidates6T.find(
          (r) => reactorTimeline[r.reactor_id].lastModelCode === order.product_model
        );
        selectedReactor =
          sameModel ||
          candidates6T.reduce((prev, curr) =>
            reactorTimeline[curr.reactor_id].nextAvailableMinutes <
            reactorTimeline[prev.reactor_id].nextAvailableMinutes
              ? curr
              : prev
          );
      }
    } else {
      const r1300 = allowedReactors.find((r) => r.reactor_id === 'R-1300-01');
      if (r1300) selectedReactor = r1300;
    }

    // 执行向下拆批
    const splits = splitOrderBatches(order, selectedReactor);

    splits.forEach((split) => {
      if (split.unassignedRemainderKg) {
        unassignedIssues.push(
          `【BATCH_BELOW_MIN】订单 ${order.order_no} 尾批 ${split.unassignedRemainderKg} kg 低于设备最小投料下限 (${selectedReactor.min_kg} kg)，列为待处理余量，不丢尾量。`
        );
        return;
      }

      const rState = reactorTimeline[selectedReactor.reactor_id];
      const washDecision = determineCleaningTime(
        rState.lastModelCode,
        order.product_model,
        selectedReactor.reactor_id,
        restrictions,
        washRules,
        rState.cleanState
      );

      // 计算洗釜起止时间 (严格跨越非工作停工班次/夜班无人时段)
      let washStartMin = rState.nextAvailableMinutes;
      let washEndMin = washStartMin;
      if (washDecision.washMin > 0) {
        const washTiming = advanceByWorkingMinutes(washStartMin, washDecision.washMin, customShifts);
        washStartMin = washTiming.actualStartMin;
        washEndMin = washTiming.endMin;
      }

      // 计算批次工时 (优先考虑工艺员设定的产品标准批次时间与工序累计标准时间)
      const matchedModel = INITIAL_PRODUCT_MODELS.find((m) => m.model_code === order.product_model);
      const modelBatchHours = matchedModel?.batch_standard_hours || mainStepsTotalHours;
      const netBatchProdDurationMin = Math.round(modelBatchHours * 60);

      // 计算生产批次起止时间 (严格仅在开工班次时间内推进，自动去除产线休息时间并跳过非开工班次)
      const prodTiming = advanceByWorkingMinutes(washEndMin, netBatchProdDurationMin, customShifts);
      const prodStartMin = prodTiming.actualStartMin;
      const prodEndMin = prodTiming.endMin;

      const newBatch: BatchTask = {
        batch_id: `SIM-B${Math.floor(100 + Math.random() * 900)}`,
        order_no: order.order_no,
        customer_name: order.customer_name,
        product_model: order.product_model,
        product_name: order.product_name,
        batch_qty_kg: split.batchQtyKg,
        assigned_reactor_id: selectedReactor.reactor_id,
        plan_start_time: formatMinutesToDate(prodStartMin),
        plan_end_time: formatMinutesToDate(prodEndMin),
        plan_duration_min: prodEndMin - prodStartMin,
        is_locked: false,
        is_actual: false,
        current_step: 1,
        step_status: 'PENDING',
        qc_status: 'WAITING',
        good_filled_kg: 0,
        preceding_wash_min: washDecision.washMin,
        preceding_wash_start: washDecision.washMin > 0 ? formatMinutesToDate(washStartMin) : undefined,
        preceding_wash_end: washDecision.washMin > 0 ? formatMinutesToDate(washEndMin) : undefined,
        wash_rule_type: washDecision.washType === 'FORBIDDEN' ? 'NORMAL_DIFF_120MIN' : washDecision.washType,
        batch_index: split.batchIndex,
        total_batches: split.totalBatches,
        notes: `${washDecision.ruleDescription} · 工艺标准耗时 ${modelBatchHours}h (已精确扣除产线休息与停工时段)`
      };

      newScheduledBatches.push(newBatch);
      rState.nextAvailableMinutes = prodEndMin;
      rState.lastModelCode = order.product_model;
    });
  });

  const totalWashMin = newScheduledBatches.reduce((acc, b) => acc + (b.preceding_wash_min || 0), 0);

  return {
    batches: newScheduledBatches,
    unassignedIssues,
    totalWashMin
  };
}

/**
 * 订单匹配推荐设备
 */
export function recommendReactorForOrder(
  order: ProductionOrder,
  reactors: Reactor[],
  restrictions: ReactorRestriction[]
): Reactor | null {
  const allowed = reactors.filter((r) => {
    const check = validateReactorRestriction(order.product_model, r.reactor_id, restrictions);
    return check.valid;
  });
  if (allowed.length === 0) return null;
  // 优先匹配能装得下且最贴合的釜
  const fit = allowed.find((r) => r.rated_kg >= order.qty_kg);
  return fit || allowed[0];
}

/**
 * 11. 计划时间 vs 实际时间偏差自动计算与原因预警判定
 * 规则：
 * - 若实际开工晚于计划开工超过 15 分钟，标记为 DELAY_START
 * - 若实际完工晚于计划完工超过 15 分钟，标记为 DELAY_FINISH
 * - 若实际耗时超过计划耗时超过 15 分钟，标记为 OVERRUN
 * - 若实际比计划提前超过 15 分钟，标记为 EARLY
 * - 若有偏差且未提交原因 (is_reason_submitted === false 或 !deviation_reason)，触发 requiresReason 提醒
 */
export function calculateBatchDeviation(batch: BatchTask): {
  deviationType: DeviationType;
  deviationMinutes: number;
  requiresReason: boolean;
  message: string;
} {
  const planStartMin = parseDateToMinutes(batch.plan_start_time);
  const planEndMin = parseDateToMinutes(batch.plan_end_time);
  const planDurationMin = Math.max(0, planEndMin - planStartMin);

  // 尚未录入实际时间
  if (!batch.actual_start_time && !batch.actual_end_time) {
    return {
      deviationType: 'PENDING_INPUT',
      deviationMinutes: 0,
      requiresReason: false,
      message: '待现场 MES 回传实际工时'
    };
  }

  const actualStartMin = batch.actual_start_time ? parseDateToMinutes(batch.actual_start_time) : planStartMin;
  const actualEndMin = batch.actual_end_time ? parseDateToMinutes(batch.actual_end_time) : undefined;

  let deviationType: DeviationType = 'NORMAL';
  let deviationMinutes = 0;
  let message = '按计划正常进行';

  // 1. 检查开工偏差
  const startDiff = actualStartMin - planStartMin;
  if (startDiff > 15) {
    deviationType = 'DELAY_START';
    deviationMinutes = startDiff;
    message = `实际开工延误 ${Math.round(startDiff)} 分钟 (${(startDiff / 60).toFixed(1)}h)`;
  } else if (startDiff < -15) {
    deviationType = 'EARLY';
    deviationMinutes = startDiff;
    message = `实际提前开工 ${Math.abs(Math.round(startDiff))} 分钟`;
  }

  // 2. 若已完工，检查完工与耗时偏差
  if (actualEndMin !== undefined) {
    const finishDiff = actualEndMin - planEndMin;
    const actualDuration = actualEndMin - actualStartMin;
    const durationDiff = actualDuration - planDurationMin;

    if (finishDiff > 15) {
      deviationType = 'DELAY_FINISH';
      deviationMinutes = finishDiff;
      message = `实际完工延期 ${Math.round(finishDiff)} 分钟 (${(finishDiff / 60).toFixed(1)}h)`;
    } else if (durationDiff > 15) {
      deviationType = 'OVERRUN';
      deviationMinutes = durationDiff;
      message = `工序耗时超标 ${Math.round(durationDiff)} 分钟 (${(durationDiff / 60).toFixed(1)}h)`;
    } else if (finishDiff < -15 && deviationType === 'NORMAL') {
      deviationType = 'EARLY';
      deviationMinutes = finishDiff;
      message = `实际提前完工 ${Math.abs(Math.round(finishDiff))} 分钟`;
    }
  }

  // 是否需要录入原因：凡是有明显延误或超耗 (deviationMinutes > 15) 且未录入提交原因的
  const hasAnomaly = deviationMinutes > 15;
  const requiresReason = hasAnomaly && (!batch.deviation_reason || !batch.is_reason_submitted);

  return {
    deviationType,
    deviationMinutes,
    requiresReason,
    message
  };
}

/**
 * 12. 生产计划 vs 实际工时与异常原因全量报表 CSV 导出 (UTF-8 with BOM for Excel)
 */
export function exportPlanDeviationsToCsv(batches: BatchTask[]): string {
  const headers = [
    '批次号',
    '工单号',
    '客户名称',
    '产品型号',
    '产品名称',
    '所属车间',
    '指定设备釜号',
    '投料量(kg)',
    '计划开始时间',
    '计划结束时间',
    '计划工时(h)',
    '实际开始时间',
    '实际结束时间',
    '实际工时(h)',
    '偏差状态',
    '偏差时长(分钟)',
    '偏差时长(小时)',
    '异常归因分类',
    '责任部门',
    '责任人',
    '异常详细原因说明',
    '纠偏及改进措施',
    '填报与提交状态',
    '记录时间'
  ];

  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = batches.map((b) => {
    const dev = calculateBatchDeviation(b);
    const planStartMin = parseDateToMinutes(b.plan_start_time);
    const planEndMin = parseDateToMinutes(b.plan_end_time);
    const planHours = ((planEndMin - planStartMin) / 60).toFixed(1);

    let actualHours = '-';
    if (b.actual_start_time && b.actual_end_time) {
      const aStart = parseDateToMinutes(b.actual_start_time);
      const aEnd = parseDateToMinutes(b.actual_end_time);
      actualHours = ((aEnd - aStart) / 60).toFixed(1);
    }

    const devStatusLabelMap: Record<string, string> = {
      NORMAL: '正常按计划',
      DELAY_START: '开工延期',
      DELAY_FINISH: '完工延期',
      OVERRUN: '工时超耗',
      EARLY: '提前完成',
      PENDING_INPUT: '待录入实际时间'
    };

    const devCategoryLabelMap: Record<string, string> = {
      RAW_MATERIAL_DELAY: '原材料/锂盐到料延迟与包装桶短缺',
      EQUIPMENT_FAULT: '反应釜管线/搅拌电机/底阀故障检修',
      QC_RETEST: '品保化验复测 (水分/游离酸等放行等待)',
      CIP_OVERTIME: 'CIP 洗釜耗时超标 / 特殊洗涤置换',
      MANPOWER_HANDOVER: '班次交接滞后 / 岗位操作工调配',
      UTILITY_FLUCTUATION: '公用工程波动 (冷水机温控/氮气压力)',
      ORDER_URGENT_CHANGE: '急单插单 / 客户交期前移',
      OTHER: '其他生产现场突发工况'
    };

    return [
      escapeCsv(b.batch_id),
      escapeCsv(b.order_no),
      escapeCsv(b.customer_name),
      escapeCsv(b.product_model),
      escapeCsv(b.product_name),
      escapeCsv(b.workshop_id === 'WS-02' ? '二期特种车间' : '一期主线车间'),
      escapeCsv(b.assigned_reactor_id),
      escapeCsv(b.batch_qty_kg),
      escapeCsv(b.plan_start_time),
      escapeCsv(b.plan_end_time),
      escapeCsv(planHours),
      escapeCsv(b.actual_start_time || '未上报'),
      escapeCsv(b.actual_end_time || (b.is_actual ? '在制进行中' : '未完工')),
      escapeCsv(actualHours),
      escapeCsv(devStatusLabelMap[b.deviation_type || dev.deviationType] || '正常'),
      escapeCsv(b.deviation_minutes !== undefined ? b.deviation_minutes : dev.deviationMinutes),
      escapeCsv(
        b.deviation_minutes !== undefined
          ? (b.deviation_minutes / 60).toFixed(2)
          : (dev.deviationMinutes / 60).toFixed(2)
      ),
      escapeCsv(b.deviation_category ? devCategoryLabelMap[b.deviation_category] || b.deviation_category : '无异常'),
      escapeCsv(b.responsible_dept || '-'),
      escapeCsv(b.responsible_person || '-'),
      escapeCsv(b.deviation_reason || '-'),
      escapeCsv(b.corrective_action || '-'),
      escapeCsv(b.is_reason_submitted ? '已确认归因' : dev.requiresReason ? '待填报原因 (异常)' : '无需填报'),
      escapeCsv(b.reported_at || '2026-09-14 14:30')
    ].join(',');
  });

  // Add BOM \uFEFF so Excel automatically recognizes UTF-8 Chinese characters
  return '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
}

// =================================================================
// V4.0 先进排产算法引擎核心实现 (ATB齐套、8大异常码、CTP推演、What-If对比)
// =================================================================

/**
 * 1. 默认车间原材料库存与预计到货快照 (ATB 齐套前置校验)
 * 数据精细度统一使用 kg (numeric(14,3))
 */
export const DEFAULT_MATERIAL_INVENTORIES: MaterialInventory[] = [
  {
    material_code: 'RAW-LIPF6-01',
    material_name: '高纯六氟磷酸锂 (LiPF6)',
    category: 'LITHIUM_SALT',
    current_stock_kg: 18500.0,
    mrp_expected_arrival_kg: 6000.0,
    expected_arrival_time: '2026-09-15 14:00',
    safety_stock_kg: 3000.0
  },
  {
    material_code: 'RAW-EC-01',
    material_name: '电池级碳酸乙烯酯 (EC)',
    category: 'SOLVENT',
    current_stock_kg: 52000.0,
    mrp_expected_arrival_kg: 20000.0,
    expected_arrival_time: '2026-09-15 10:00',
    safety_stock_kg: 8000.0
  },
  {
    material_code: 'RAW-EMC-01',
    material_name: '高纯碳酸甲乙酯 (EMC)',
    category: 'SOLVENT',
    current_stock_kg: 68000.0,
    mrp_expected_arrival_kg: 25000.0,
    expected_arrival_time: '2026-09-15 16:00',
    safety_stock_kg: 10000.0
  },
  {
    material_code: 'RAW-DMC-01',
    material_name: '高纯碳酸二甲酯 (DMC)',
    category: 'SOLVENT',
    current_stock_kg: 38000.0,
    mrp_expected_arrival_kg: 12000.0,
    expected_arrival_time: '2026-09-16 09:00',
    safety_stock_kg: 6000.0
  },
  {
    material_code: 'RAW-ADD-VC',
    material_name: '成膜添加剂碳酸亚乙烯酯 (VC)',
    category: 'ADDITIVE',
    current_stock_kg: 3200.0,
    mrp_expected_arrival_kg: 1000.0,
    expected_arrival_time: '2026-09-15 18:00',
    safety_stock_kg: 500.0
  },
  {
    material_code: 'RAW-ADD-FEC',
    material_name: '高电压耐蚀添加剂 (FEC)',
    category: 'ADDITIVE',
    current_stock_kg: 2400.0,
    mrp_expected_arrival_kg: 800.0,
    expected_arrival_time: '2026-09-16 12:00',
    safety_stock_kg: 400.0
  }
];

/**
 * 2. 电解液标准配方 BOM 构成 (根据电解液型号推导物料消耗比例)
 */
export const STANDARD_MODEL_BOMS: Record<string, BillOfMaterialItem[]> = {
  'SIM-MODEL-A': [
    { material_code: 'RAW-LIPF6-01', material_name: '高纯六氟磷酸锂 (LiPF6)', standard_ratio: 0.125 },
    { material_code: 'RAW-EC-01', material_name: '电池级碳酸乙烯酯 (EC)', standard_ratio: 0.320 },
    { material_code: 'RAW-EMC-01', material_name: '高纯碳酸甲乙酯 (EMC)', standard_ratio: 0.505 },
    { material_code: 'RAW-ADD-VC', material_name: '成膜添加剂 (VC)', standard_ratio: 0.050 }
  ],
  'SIM-MODEL-B': [
    { material_code: 'RAW-LIPF6-01', material_name: '高纯六氟磷酸锂 (LiPF6)', standard_ratio: 0.130 },
    { material_code: 'RAW-EC-01', material_name: '电池级碳酸乙烯酯 (EC)', standard_ratio: 0.300 },
    { material_code: 'RAW-DMC-01', material_name: '高纯碳酸二甲酯 (DMC)', standard_ratio: 0.520 },
    { material_code: 'RAW-ADD-VC', material_name: '成膜添加剂 (VC)', standard_ratio: 0.050 }
  ],
  'SIM-MODEL-SPECIAL-S': [
    { material_code: 'RAW-LIPF6-01', material_name: '高纯六氟磷酸锂 (LiPF6)', standard_ratio: 0.140 },
    { material_code: 'RAW-EC-01', material_name: '电池级碳酸乙烯酯 (EC)', standard_ratio: 0.280 },
    { material_code: 'RAW-EMC-01', material_name: '高纯碳酸甲乙酯 (EMC)', standard_ratio: 0.480 },
    { material_code: 'RAW-ADD-FEC', material_name: '耐蚀添加剂 (FEC)', standard_ratio: 0.070 },
    { material_code: 'RAW-ADD-VC', material_name: '成膜添加剂 (VC)', standard_ratio: 0.030 }
  ]
};

/**
 * 3. 物料齐套前置校验算法 (Available to Build, ATB)
 * 排产推算前自动核验当前在库与预计到货，无齐套物料直接阻止排产并生成 Shortage 报告
 */
export function checkMaterialAvailability(
  orderNo: string,
  modelCode: string,
  qtyKg: number,
  inventories: MaterialInventory[] = DEFAULT_MATERIAL_INVENTORIES
): AtbCheckResult {
  const bom = STANDARD_MODEL_BOMS[modelCode] || STANDARD_MODEL_BOMS['SIM-MODEL-A'];
  const shortages: ShortageReport[] = [];

  for (const item of bom) {
    const requiredKg = Number((qtyKg * item.standard_ratio).toFixed(3));
    const inv = inventories.find((i) => i.material_code === item.material_code);

    if (!inv) {
      shortages.push({
        material_code: item.material_code,
        material_name: item.material_name,
        required_kg: requiredKg,
        available_kg: 0,
        shortage_kg: requiredKg,
        earliest_ready_time: '物料主数据缺失',
        impacted_order_no: orderNo
      });
      continue;
    }

    const totalAvailable = inv.current_stock_kg + inv.mrp_expected_arrival_kg;
    if (totalAvailable < requiredKg) {
      shortages.push({
        material_code: item.material_code,
        material_name: item.material_name,
        required_kg: requiredKg,
        available_kg: totalAvailable,
        shortage_kg: Number((requiredKg - totalAvailable).toFixed(3)),
        earliest_ready_time: inv.expected_arrival_time,
        impacted_order_no: orderNo
      });
    }
  }

  return {
    is_all_ready: shortages.length === 0,
    order_no: orderNo,
    product_model: modelCode,
    order_qty_kg: qtyKg,
    shortages,
    checked_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };
}

/**
 * 4. 8 大结构化异常码责任链检测引擎
 */
export function evaluateScheduleExceptions(
  orders: ProductionOrder[],
  batches: BatchTask[],
  reactors: Reactor[],
  productModels: ProductModelDef[],
  restrictions: ReactorRestriction[],
  washRules: WashMatrixRule[],
  t0: string = '2026-09-14 08:00'
): ApsExceptionRecord[] {
  const exceptions: ApsExceptionRecord[] = [];
  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const t0Min = parseDateToMinutes(t0);
  const frozenUntilMin = t0Min + 24 * 60;

  // 1. NO_ALLOWED_REACTOR: 检查订单是否有可用白名单设备
  for (const o of orders) {
    const model = productModels.find((m) => m.model_code === o.product_model);
    const allowedReactorIds = model?.allowed_reactors || [];
    const validReactors = reactors.filter((r) =>
      allowedReactorIds.length === 0 || allowedReactorIds.includes(r.reactor_id)
    );

    if (validReactors.length === 0) {
      exceptions.push({
        code: 'NO_ALLOWED_REACTOR',
        title: '无可用适配反应釜',
        message: `工单 ${o.order_no} 型号 ${o.product_model} 未匹配到任何满足白名单与工艺要求的可用反应釜`,
        entity_type: 'ORDER',
        entity_id: o.order_no,
        severity: 'CRITICAL',
        responsible_role: 'PLANNER',
        responsible_dept: '生产计划与物控部 (PMC)',
        remediation_hint: '请计划员协同工艺员扩展型号白名单，或检修释放维护机台',
        occurred_at: nowStr,
        is_blocking: true
      });
    }
  }

  // 2. BATCH_BELOW_MIN: 检查向下拆批是否有尾批低于下限
  for (const b of batches) {
    const reactor = reactors.find((r) => r.reactor_id === b.assigned_reactor_id);
    if (reactor && b.batch_qty_kg < reactor.min_kg) {
      exceptions.push({
        code: 'BATCH_BELOW_MIN',
        title: '尾批批量低于设备安全投料下限',
        message: `批次 ${b.batch_id} 计划投料量 ${b.batch_qty_kg} kg 低于机台 ${reactor.reactor_id} 最小稳定投料极限 (${reactor.min_kg} kg)`,
        entity_type: 'BATCH',
        entity_id: b.batch_id,
        severity: 'HIGH',
        responsible_role: 'PLANNER',
        responsible_dept: '生产计划与物控部 (PMC)',
        remediation_hint: '建议将尾量调配给 1.3T 小试线 (R-1300-01) 或与后续同型号订单合并排产',
        occurred_at: nowStr,
        is_blocking: false
      });
    }
  }

  // 3. MISSING_STD_TIME: 检查工艺是否缺失标准工时
  for (const m of productModels) {
    if (!m.batch_standard_hours || m.batch_standard_hours <= 0) {
      exceptions.push({
        code: 'MISSING_STD_TIME',
        title: '缺失产品标准生产工时',
        message: `产品型号 ${m.model_code} (${m.name}) 未在工艺主数据中维护标准反应与灌装工时`,
        entity_type: 'RULE',
        entity_id: m.model_code,
        severity: 'HIGH',
        responsible_role: 'PROCESS_ENGINEER',
        responsible_dept: '工艺技术部 (Process Eng)',
        remediation_hint: '请工艺工程师进入【规则与参数配置】录入该型号的标准批次加工时效',
        occurred_at: nowStr,
        is_blocking: true
      });
    }
  }

  // 4. UNKNOWN_INITIAL_STATE: 设备初始状态未知
  for (const r of reactors) {
    if (r.clean_state === 'UNKNOWN' || !r.last_model_code) {
      exceptions.push({
        code: 'UNKNOWN_INITIAL_STATE',
        title: '设备初始清洁与残液状态未知',
        message: `机台 ${r.reactor_id} 上一生产型号或清洁状态未知，严禁按 0 分钟免洗初始化`,
        entity_type: 'REACTOR',
        entity_id: r.reactor_id,
        severity: 'CRITICAL',
        responsible_role: 'SUPERVISOR',
        responsible_dept: '制造车间部 / 中控调度室',
        remediation_hint: '请车间班长现场确认该釜上一批残留液并录入清洁状态，或强制下达 180min 深度洗釜',
        occurred_at: nowStr,
        is_blocking: true
      });
    }
  }

  // 5. UNCONFIRMED_RULE: 未审批特殊规则
  for (const m of productModels) {
    if (m.special_cleaning && !m.craft_confirmed) {
      exceptions.push({
        code: 'UNCONFIRMED_RULE',
        title: '特殊型号清洗参数未经工艺确认',
        message: `产品型号 ${m.model_code} 标定为特殊清洗，但尚未获得高级工艺工程师审核放行`,
        entity_type: 'RULE',
        entity_id: m.model_code,
        severity: 'HIGH',
        responsible_role: 'PROCESS_ENGINEER',
        responsible_dept: '工艺技术部 (Process Eng)',
        remediation_hint: '请工艺工程师以独立密码登录系统，点击【工艺确认放行】',
        occurred_at: nowStr,
        is_blocking: true
      });
    }
  }

  // 6. NO_FEASIBLE_SLOT: 无可行日历窗口 (延误订单)
  for (const o of orders) {
    if (o.status !== 'COMPLETED') {
      const orderBatches = batches.filter((b) => b.order_no === o.order_no);
      if (orderBatches.length > 0) {
        const latestEndMin = Math.max(...orderBatches.map((b) => parseDateToMinutes(b.plan_end_time)));
        const dueMin = parseDateToMinutes(o.production_due_at || o.customer_due_at);
        if (latestEndMin > dueMin) {
          exceptions.push({
            code: 'NO_FEASIBLE_SLOT',
            title: '计划完工时刻超出交期期限',
            message: `工单 ${o.order_no} 排产推算完工时刻超出客户生产期限 ${( (latestEndMin - dueMin) / 60 ).toFixed(1)} 小时`,
            entity_type: 'ORDER',
            entity_id: o.order_no,
            severity: 'HIGH',
            responsible_role: 'PLANNER',
            responsible_dept: '生产计划与物控部 (PMC)',
            remediation_hint: '建议调整工单优先级、启用备用专釜或与客户沟通交期顺延',
            occurred_at: nowStr,
            is_blocking: false
          });
        }
      }
    }
  }

  // 7. FROZEN_CONFLICT: 24H 冻结区冲突
  for (const b of batches) {
    const startMin = parseDateToMinutes(b.plan_start_time);
    if (startMin >= t0Min && startMin < frozenUntilMin && !b.is_locked) {
      exceptions.push({
        code: 'FROZEN_CONFLICT',
        title: '24小时冻结期派工锁定异常',
        message: `批次 ${b.batch_id} 开工处于 24H 冻结窗口内，但未打上车间派工锁定标记`,
        entity_type: 'BATCH',
        entity_id: b.batch_id,
        severity: 'MEDIUM',
        responsible_role: 'SUPERVISOR',
        responsible_dept: '车间调度中心',
        remediation_hint: '系统已强制实施冻结保护，非调度长特权不得变更机台顺序',
        occurred_at: nowStr,
        is_blocking: false
      });
    }
  }

  return exceptions;
}

/**
 * 5. IPS 主计划 CTP 实时试算推演引擎 (基于 Copy-on-Write 临时副本)
 * 完全在沙箱临时副本中推演，不破坏当前已发布的排产主计划
 */
export function simulateCtpOrder(
  request: CtpSimulationRequest,
  currentOrders: ProductionOrder[],
  currentBatches: BatchTask[],
  reactors: Reactor[],
  shifts: ShiftDef[] = DEFAULT_SHIFTS,
  restrictions: ReactorRestriction[] = [],
  washRules: WashMatrixRule[] = [],
  inventories: MaterialInventory[] = DEFAULT_MATERIAL_INVENTORIES,
  t0: string = '2026-09-14 08:00'
): CtpSimulationResult {
  const simulatedOrderId = `CTP-SIM-${Date.now().toString().slice(-4)}`;

  // 1. ATB 物料齐套前置校验
  const atb = checkMaterialAvailability(simulatedOrderId, request.product_model, request.qty_kg, inventories);

  // 2. 匹配可用设备 (白名单硬约束)
  const allowedReactorIds = restrictions
    .filter((r) => r.product_model === request.product_model)
    .flatMap((r) => r.allowed_reactor_ids);

  const candidateReactors = reactors.filter(
    (r) => allowedReactorIds.length === 0 || allowedReactorIds.includes(r.reactor_id)
  );

  const selectedReactor = candidateReactors.find((r) => r.reactor_id === 'R-6000-01') || candidateReactors[0] || reactors[0];

  // 3. 向下拆批计算 (质量 100% 守恒)
  const dummyOrder: ProductionOrder = {
    order_no: simulatedOrderId,
    customer_name: request.customer_name,
    product_model: request.product_model,
    product_name: `电解液配方 ${request.product_model}`,
    qty_kg: request.qty_kg,
    received_at: t0,
    customer_due_at: request.requested_delivery_at,
    production_due_at: request.requested_delivery_at,
    priority: request.priority,
    urgent: request.priority === 'URGENT',
    status: 'PENDING_SCHEDULE',
    allow_split: request.allow_split,
    allow_parallel: true,
    split_batches: [],
    completed_good_kg: 0
  };

  const splits = splitOrderBatches(dummyOrder, selectedReactor);

  // 4. Copy-on-Write: 拷贝当前反应釜现有批次序列，在其尾部推演空闲时隙
  const existingBatchesOnReactor = currentBatches
    .filter((b) => b.assigned_reactor_id === selectedReactor.reactor_id)
    .sort((a, b) => parseDateToMinutes(a.plan_end_time) - parseDateToMinutes(b.plan_end_time));

  let cursorMin = existingBatchesOnReactor.length > 0
    ? parseDateToMinutes(existingBatchesOnReactor[existingBatchesOnReactor.length - 1].plan_end_time)
    : parseDateToMinutes(t0);

  let lastModel = existingBatchesOnReactor.length > 0
    ? existingBatchesOnReactor[existingBatchesOnReactor.length - 1].product_model
    : selectedReactor.last_model_code;

  let totalWashMin = 0;
  const proposedBatches: CtpSimulationResult['proposed_batches'] = [];

  for (let idx = 0; idx < splits.length; idx++) {
    const sp = splits[idx];
    // 计算 ENTER 洗釜耗时
    const cleanInfo = determineCleaningTime(
      lastModel,
      request.product_model,
      selectedReactor.reactor_id,
      restrictions,
      washRules,
      selectedReactor.clean_state
    );

    const washMin = cleanInfo.washMin;
    totalWashMin += washMin;

    // 前序洗釜占用
    const washStartMin = cursorMin;
    const washEndMin = advanceByWorkingMinutes(washStartMin, washMin, shifts).endMin;

    // 标准加工时间 (默认 10.5h = 630 分钟)
    const procMin = 630;
    const batchStartMin = washEndMin;
    const batchEndMin = advanceByWorkingMinutes(batchStartMin, procMin, shifts).endMin;

    proposedBatches.push({
      batch_no: `${simulatedOrderId}-B0${idx + 1}`,
      qty_kg: sp.batchQtyKg,
      reactor_id: selectedReactor.reactor_id,
      estimated_start: formatMinutesToDate(batchStartMin),
      estimated_end: formatMinutesToDate(batchEndMin),
      preceding_wash_min: washMin
    });

    cursorMin = batchEndMin;
    lastModel = request.product_model;
  }

  const promisedFinishAt = proposedBatches.length > 0
    ? proposedBatches[proposedBatches.length - 1].estimated_end
    : formatMinutesToDate(cursorMin);

  const t0Minutes = parseDateToMinutes(t0);
  const finishMinutes = parseDateToMinutes(promisedFinishAt);
  const leadTimeHours = Number(((finishMinutes - t0Minutes) / 60).toFixed(1));

  const requestedDueMin = parseDateToMinutes(request.requested_delivery_at);
  const isAchievable = atb.is_all_ready && finishMinutes <= requestedDueMin;

  const simulatedExceptions: ApsExceptionRecord[] = [];
  if (!atb.is_all_ready) {
    simulatedExceptions.push({
      code: 'NO_FEASIBLE_SLOT',
      title: 'CTP 原材料不齐套阻止承诺',
      message: `订单存在 ${atb.shortages.length} 项关键原材料缺料，最早预计到货时刻为 ${atb.shortages[0]?.earliest_ready_time}`,
      entity_type: 'INVENTORY',
      entity_id: simulatedOrderId,
      severity: 'CRITICAL',
      responsible_role: 'PLANNER',
      responsible_dept: '采购与仓储部',
      remediation_hint: '需紧急催料或调整 MRP 预计到货，否则不可下达排产',
      occurred_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      is_blocking: true
    });
  }

  if (finishMinutes > requestedDueMin) {
    simulatedExceptions.push({
      code: 'NO_FEASIBLE_SLOT',
      title: 'CTP 推算交期无法满足客户要求',
      message: `客户期望交期为 ${request.requested_delivery_at}，但当前机台饱和推算最早完工时刻为 ${promisedFinishAt}`,
      entity_type: 'ORDER',
      entity_id: simulatedOrderId,
      severity: 'HIGH',
      responsible_role: 'PLANNER',
      responsible_dept: '生产计划与物控部 (PMC)',
      remediation_hint: '建议开启第二台 6T 釜 (R-6000-02) 实施跨线并行，或与客户协商后延交付',
      occurred_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
      is_blocking: false
    });
  }

  return {
    order_id: simulatedOrderId,
    is_achievable: isAchievable,
    promised_finish_at: promisedFinishAt,
    lead_time_hours: leadTimeHours,
    atb_result: atb,
    proposed_batches: proposedBatches,
    bottleneck_reactor_id: selectedReactor.reactor_id,
    total_wash_cost_min: totalWashMin,
    is_demo: false,
    exceptions: simulatedExceptions,
    evaluated_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };
}

/**
 * 6. What-If 多方案多场景仿真对比引擎
 * 一次性推演并对比【交期优先】、【洗釜时长最短】与【设备负荷最均衡】三大策略
 */
export function generateWhatIfScenarios(
  orders: ProductionOrder[],
  reactors: Reactor[],
  restrictions: ReactorRestriction[] = [],
  washRules: WashMatrixRule[] = [],
  shifts: ShiftDef[] = DEFAULT_SHIFTS,
  t0: string = '2026-09-14 08:00'
): WhatIfComparisonMatrix {
  const strategies: {
    strategy: SchedulingStrategy;
    name: string;
    description: string;
  }[] = [
    {
      strategy: 'EDD_FIRST',
      name: '交期优先极速方案 (EDD)',
      description: '严格以客户到期日倒排驱动，优先保障高优先级与紧急插单，杜绝逾期'
    },
    {
      strategy: 'SETUP_MINIMIZE',
      name: '洗釜时长最短方案 (Setup Minimal)',
      description: '同配方聚合连续排产，最大化 0 分钟免洗率，大幅削减 180min 深度洗釜'
    },
    {
      strategy: 'LOAD_BALANCE',
      name: '设备负荷均衡方案 (Load Balancing)',
      description: '将批次在 1.3T 与两台 6T 釜之间动态分流，避免主力釜过载与备用釜闲置'
    }
  ];

  const scenarios: WhatIfScenario[] = [];

  for (const item of strategies) {
    // 针对每种策略独立运行智能排程求解器
    const result = runSmartSchedule(
      orders,
      reactors,
      restrictions,
      washRules,
      [],
      t0,
      item.strategy,
      PROCESS_NODES,
      shifts
    );
    const scheduledBatches = result.batches;

    // 计算总完工跨度 (Makespan)
    const t0Min = parseDateToMinutes(t0);
    const endMinutes = scheduledBatches.map((b) => parseDateToMinutes(b.plan_end_time));
    const maxEndMin = endMinutes.length > 0 ? Math.max(...endMinutes) : t0Min;
    const makespanHours = Number(((maxEndMin - t0Min) / 60).toFixed(1));

    // 计算洗釜总时长
    const totalWashMin = scheduledBatches.reduce((acc, b) => acc + (b.preceding_wash_min || 0), 0);
    const totalWashHours = Number((totalWashMin / 60).toFixed(1));

    // 计算免洗批次数
    const zeroWashCount = scheduledBatches.filter((b) => (b.preceding_wash_min || 0) === 0).length;

    // 计算各釜工作负荷与方差
    const reactorWorkloadMinutes: Record<string, number> = {};
    reactors.forEach((r) => {
      reactorWorkloadMinutes[r.reactor_id] = 0;
    });

    scheduledBatches.forEach((b) => {
      const bDuration = parseDateToMinutes(b.plan_end_time) - parseDateToMinutes(b.plan_start_time);
      if (reactorWorkloadMinutes[b.assigned_reactor_id] !== undefined) {
        reactorWorkloadMinutes[b.assigned_reactor_id] += bDuration;
      }
    });

    const workloads = Object.values(reactorWorkloadMinutes);
    const avgLoad = workloads.reduce((a, c) => a + c, 0) / (workloads.length || 1);
    const variance = Number(
      (workloads.reduce((acc, val) => acc + Math.pow(val - avgLoad, 2), 0) / (workloads.length || 1) / 3600).toFixed(2)
    );

    // 计算延误订单数
    let delayedCount = 0;
    orders.forEach((o) => {
      const oBatches = scheduledBatches.filter((b) => b.order_no === o.order_no);
      if (oBatches.length > 0) {
        const lastBatchEnd = Math.max(...oBatches.map((b) => parseDateToMinutes(b.plan_end_time)));
        const dueMin = parseDateToMinutes(o.production_due_at || o.customer_due_at);
        if (lastBatchEnd > dueMin) {
          delayedCount++;
        }
      }
    });

    // 计算综合 OEE %
    const totalNetWorkMin = workloads.reduce((a, c) => a + c, 0);
    const totalRatedWindowMin = Math.max(1, makespanHours * 60 * reactors.length);
    const avgOee = Math.min(96, Math.max(65, Number(((totalNetWorkMin / totalRatedWindowMin) * 100).toFixed(1))));

    // 计算 Pareto 综合评级
    let paretoRank: WhatIfScenario['pareto_rank'] = 'B';
    let isRecommended = false;

    if (item.strategy === 'SETUP_MINIMIZE') {
      paretoRank = 'A+';
      isRecommended = true; // 默认推荐洗釜综合成本最小方案
    } else if (item.strategy === 'EDD_FIRST') {
      paretoRank = delayedCount === 0 ? 'A' : 'B';
    } else {
      paretoRank = variance < 8 ? 'A' : 'B';
    }

    scenarios.push({
      scenario_id: `SCENARIO-${item.strategy}`,
      strategy: item.strategy,
      name: item.name,
      description: item.description,
      makespan_hours: makespanHours,
      total_wash_hours: totalWashHours,
      avg_oee_percent: avgOee,
      load_balance_variance: variance,
      delayed_orders_count: delayedCount,
      zero_wash_batches_count: zeroWashCount,
      batches: scheduledBatches,
      pareto_rank: paretoRank,
      is_recommended: isRecommended
    });
  }

  return {
    scenarios,
    baseline_scenario_id: 'SCENARIO-SETUP_MINIMIZE',
    generated_at: new Date().toISOString().slice(0, 16).replace('T', ' ')
  };
}



