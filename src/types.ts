export type FormulaType =
  | "NCM_HIGH_NICKEL" // 高镍三元动力型电解液
  | "LFP_HIGH_RATE"   // 磷酸铁锂高倍率型电解液
  | "SI_CARBON_ANODE" // 硅碳负极宽温域电解液
  | "SODIUM_ION_SPEC" // 钠离子电池特种电解液
  | "SOLID_STATE_HYBRID"; // 半固态固液混合电解液

export type OrderPriority = "P1_EMERGENCY" | "P2_HIGH" | "P3_NORMAL" | "P4_LOW";

export type OrderStatus = "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";

export interface ProductionOrder {
  id: string;
  orderNo: string;
  customerName: string;
  productCode: string;
  productName: string;
  formulaType: FormulaType;
  quantityTons: number;
  batchCount: number;
  priority: OrderPriority;
  releaseDate: string; // ISO or relative hour
  dueDate: string;     // ISO or relative hour
  dueHour: number;     // Hours from schedule start (0 to 168)
  status: OrderStatus;
  isEmergency?: boolean;
  notes?: string;
}

export type OperationType = "PRE_DISSOLVE" | "MIXING_REACT" | "AGING_FILTER" | "PACK_CANNING" | "QA_INSPECT";

export interface ProcessOperation {
  id: string;
  orderId: string;
  orderNo: string;
  opSeq: number; // 10, 20, 30, 40, 50
  name: string;
  opType: OperationType;
  requiredResourceCategory: "PRE_TANK" | "REACTOR" | "AGING_VESSEL" | "PACKING_LINE" | "QA_LAB";
  durationHours: number;
  dependencies: string[]; // previous operation IDs
  status: "WAITING" | "SCHEDULED" | "RUNNING" | "DONE";
}

export interface WorkResource {
  id: string;
  code: string;
  name: string;
  category: "PRE_TANK" | "REACTOR" | "AGING_VESSEL" | "PACKING_LINE" | "QA_LAB";
  capacityTons: number;
  currentFormula: FormulaType | null;
  status: "NORMAL" | "MAINTENANCE" | "BREAKDOWN" | "CLEANING";
  efficiency: number; // 1.0 = normal, 1.1 = faster, etc.
  dedicatedFormula?: FormulaType; // 专釜专用硬约束
  maintenanceWindow?: {
    startHour: number;
    endHour: number;
    reason: string;
  };
}

export interface ScheduledTask {
  id: string;
  orderId: string;
  orderNo: string;
  customerName: string;
  productName: string;
  formulaType: FormulaType;
  opId: string;
  opSeq: number;
  opName: string;
  resourceId: string;
  startHour: number;
  endHour: number;
  setupStartHour?: number;
  setupDurationHours?: number;
  setupReason?: string;
  isSetup?: boolean;
  isLocked?: boolean;
  isDelayed?: boolean;
  delayHours?: number;
  priority: OrderPriority;
  isEmergency?: boolean;
}

export type SchedulingStrategy =
  | "BALANCED_LOAD"     // 综合平衡排程
  | "EDD_ASAP"          // 顺排极速交付(Earliest Due Date)
  | "JIT_BACKWARD"       // 倒排精益准时(JIT最小在制)
  | "SETUP_MINIMIZE"    // 换产/洗釜时间最小化(Batch Clustering)
  | "TOC_BOTTLENECK";   // 约束理论瓶颈排程(Drum-Buffer-Rope)

export interface DisruptionEvent {
  id: string;
  type: "EMERGENCY_ORDER" | "MACHINE_BREAKDOWN" | "MATERIAL_DELAY" | "QA_HOLD";
  title: string;
  description: string;
  occurredAtHour: number;
  durationHours: number;
  targetResourceId?: string;
  targetOrderId?: string;
  resolved: boolean;
  impactSummary?: string;
}

export interface APSKpis {
  otdRate: number;            // 准时交付率 %
  avgUtilization: number;     // 综合设备利用率 %
  totalSetupHours: number;    // 换产与洗釜总耗时 (h)
  makespanHours: number;      // 总完工跨度 (h)
  delayedOrdersCount: number; // 延误工单数
  totalWipBatches: number;    // 在制品批次
  totalEnergyScore?: number;  // 节能换产评分
}

export interface CleaningRule {
  from: FormulaType;
  to: FormulaType;
  durationHours: number;
  cleanType: "SAME_FLUSH" | "SOLVENT_RINSE" | "DEEP_ULTRASONIC" | "PASSIVATION";
  description: string;
}
