/**
 * NOVOLYTE APS — 主数据与向下分批的单一权威来源 (Single Source of Truth)
 * ============================================================================
 * 本模块同时被前端排产引擎 (`src/utils/apsEngine.ts`) 与服务端 (`server.ts`) 引用，
 * 目的是消除「同一规则两份实现」导致的发散。
 *
 * ## 权威来源（口径已明确）
 *   **釜台数与设备最小/最大投料量，一律以「后台维护的设备表」为准。**
 *   即运行时持久化状态里的 `reactors`（由管理界面 `AdminConfigView` 维护）。
 *
 *   本文件中的 `SEED_REACTOR_MASTER` **只是初始种子与兜底**：
 *     - 首次建库时用于生成初始设备表；
 *     - 运行时设备表缺失该编号时的显示兜底。
 *   它 **不是** 权威 —— 任何情况下都不得用它覆盖或改写后台维护的设备表。
 *
 *   推论（重要）：不得在运行时强制删除设备。管理员新增的设备即使不在种子里，
 *   也必须原样保留。历史遗留的「幻影设备清理」已因此移除，
 *   改为非破坏性的孤儿批次检测 `findOrphanBatches()`。
 *
 * 铁律（不可协商）：
 *   1. 单批不得超过该釜额定容量 (max_kg)；
 *   2. 计划批量之和必须等于订单量 —— 不丢量、不超排、不四舍五入丢弃尾量；
 *   3. 尾批低于最小投料量 (min_kg) 时，先尝试合法重分配，其次列为待处理，
 *      绝不静默丢弃。
 * ============================================================================
 */

/** 与前端 DB_SCHEMA_VERSION 保持同源，避免前后端各自维护版本号 */
export const APS_SCHEMA_VERSION = 5;

// ============================================================================
// 设备能力 —— 由后台维护的设备记录投影而来
// ============================================================================

/** 后台维护的设备记录中，本模块关心的字段 */
export interface ReactorLike {
  reactor_id: string;
  reactor_name?: string;
  workshop_id?: string;
  /** 额定质量能力 (kg) —— 吨位与容积互不替代 */
  rated_kg?: number | null;
  /** 最小投料量 (kg)。null / 0 表示工艺尚未确认，此时不做下限校验 */
  min_kg?: number | null;
  /** 单批质量上限 (kg)，即额定容量 */
  max_kg?: number | null;
}

/** 归一化后的设备能力记录 */
export interface ReactorCapability {
  reactor_id: string;
  reactor_name: string;
  workshop_id: string;
  rated_kg: number;
  /** 已归一化：null 表示未确认 */
  min_kg: number | null;
  /** 已归一化：容量，取 max_kg，缺失时回落 rated_kg */
  max_kg: number;
}

const isPositive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

/** 取设备容量：优先 max_kg，缺失时回落 rated_kg */
function capacityOf(r: ReactorLike): number {
  if (isPositive(r.max_kg)) return r.max_kg;
  if (isPositive(r.rated_kg)) return r.rated_kg;
  return 0;
}

/** 取最小投料量：null / 0 / 非法值一律视为「未确认」 */
function minOf(r: ReactorLike): number | null {
  return isPositive(r.min_kg) ? r.min_kg : null;
}

// ============================================================================
// 初始种子（非权威，仅用于建库与显示兜底）
// ============================================================================

/**
 * 初始种子设备表。依据 NOVOLYTE V2.0 设计文档 §1「设备能力与订单拆批」：
 *   排产资源为三台釜 —— 1.3 t 釜 1 台、6 t 釜 2 台。
 *
 * **注意**：这只是首次建库的初值。运行时的权威是后台维护的设备表，
 * 管理员可以新增、修改、删除设备，本常量不参与任何覆盖。
 */
export const SEED_REACTOR_MASTER: readonly ReactorLike[] = [
  {
    reactor_id: 'R-1300-01',
    reactor_name: '1.3 t 反应釜 (小试/特种线)',
    workshop_id: 'WS-01',
    rated_kg: 1300,
    min_kg: 300,
    max_kg: 1300,
  },
  {
    reactor_id: 'R-6000-01',
    reactor_name: '6 t 反应釜 #1 (动力主线 1号)',
    workshop_id: 'WS-01',
    rated_kg: 6000,
    min_kg: 2000,
    max_kg: 6000,
  },
  {
    reactor_id: 'R-6000-02',
    reactor_name: '6 t 反应釜 #2 (动力主线 2号 / 专属釜)',
    workshop_id: 'WS-02',
    rated_kg: 6000,
    min_kg: 2000,
    max_kg: 6000,
  },
];

// ============================================================================
// 设备主数据表 —— 由运行时设备记录构建
// ============================================================================

export interface DeviceMaster {
  /** 归一化后的设备列表（保持后台维护的顺序） */
  reactors: ReactorCapability[];
  /** 满批批量 = 设备表中最大容量；0 表示无可用设备 */
  bulkMaxKg: number;
  /** 大容量釜（容量 == bulkMaxKg），满批在这些釜之间承接 */
  bulkReactorIds: string[];
  /** 大容量釜最小投料量；任一未确认则为 null（不做下限校验） */
  bulkMinKg: number | null;
  /** 小容量釜中容量最大者（用于承接尾批）；无则 null */
  smallReactor: ReactorCapability | null;
  /** 主数据未确认项的描述，供发布接口做真实阻断 */
  missing: string[];
}

/**
 * 由后台维护的设备记录构建主数据表。
 *
 * 大/小容量釜的划分完全由数据推导 —— 容量等于最大容量者为大釜，其余为小釜。
 * 不再硬编码 `R-1300-01` 之类的设备编号：管理员调整容量或增删设备后，
 * 拆批行为会立即跟随。
 */
export function buildDeviceMaster(reactors: readonly ReactorLike[] | null | undefined): DeviceMaster {
  const list: ReactorCapability[] = (Array.isArray(reactors) ? reactors : [])
    .filter((r): r is ReactorLike => !!r && typeof r.reactor_id === 'string' && r.reactor_id.length > 0)
    .map((r) => ({
      reactor_id: r.reactor_id,
      reactor_name: r.reactor_name ?? r.reactor_id,
      workshop_id: r.workshop_id ?? '',
      rated_kg: isPositive(r.rated_kg) ? r.rated_kg : capacityOf(r),
      min_kg: minOf(r),
      max_kg: capacityOf(r),
    }));

  const missing: string[] = [];
  for (const r of list) {
    if (r.min_kg === null) missing.push(`${r.reactor_id}.min_kg IS NULL`);
    if (!isPositive(r.max_kg)) missing.push(`${r.reactor_id}.max_kg IS NULL`);
  }

  const bulkMaxKg = list.reduce((max, r) => Math.max(max, r.max_kg), 0);
  const bulkReactorIds = list.filter((r) => r.max_kg === bulkMaxKg && bulkMaxKg > 0).map((r) => r.reactor_id);

  const bulks = list.filter((r) => r.max_kg === bulkMaxKg && bulkMaxKg > 0);
  const bulkMinKg = (() => {
    if (bulks.length === 0) return null;
    if (bulks.some((r) => r.min_kg === null)) return null;
    return Math.max(...bulks.map((r) => r.min_kg as number));
  })();

  // 尾批承接釜：容量严格小于大釜者中取最大
  const smallCandidates = list
    .filter((r) => r.max_kg < bulkMaxKg && r.max_kg > 0)
    .sort((a, b) => b.max_kg - a.max_kg);
  const smallReactor = smallCandidates.length > 0 ? smallCandidates[0] : null;

  return { reactors: list, bulkMaxKg, bulkReactorIds, bulkMinKg, smallReactor, missing };
}

/** 种子设备表构建出的主数据表（仅在前端尚未水合、或显式兜底时使用） */
export const SEED_DEVICE_MASTER: DeviceMaster = buildDeviceMaster(SEED_REACTOR_MASTER);

// ============================================================================
// 能力查询 —— 一律接受运行时设备表
// ============================================================================

export function getReactorMaster(
  reactorId: string,
  master: DeviceMaster = SEED_DEVICE_MASTER,
): ReactorCapability | undefined {
  return master.reactors.find((r) => r.reactor_id === reactorId);
}

export function reactorMaxKg(reactorId: string, master: DeviceMaster = SEED_DEVICE_MASTER): number | null {
  const rec = getReactorMaster(reactorId, master);
  return rec && rec.max_kg > 0 ? rec.max_kg : null;
}

export function reactorMinKg(reactorId: string, master: DeviceMaster = SEED_DEVICE_MASTER): number | null {
  const rec = getReactorMaster(reactorId, master);
  return rec ? rec.min_kg : null;
}

/** 该设备能否承接指定批量（容量与下限双判） */
export function reactorCapacity(
  reactorId: string,
  master: DeviceMaster = SEED_DEVICE_MASTER,
): number {
  return getReactorMaster(reactorId, master)?.max_kg ?? master.bulkMaxKg;
}

/**
 * 由设备主数据推导所属车间 —— 取代各处 `id === 'R-6000-02' ? 'WS-02' : 'WS-01'` 的硬编码推断。
 * 设备记录自带 workshop_id 时优先使用它。
 */
export function resolveWorkshopId(
  reactorId: string | null | undefined,
  master: DeviceMaster = SEED_DEVICE_MASTER,
): string {
  if (!reactorId) return 'WS-01';
  const rec = getReactorMaster(reactorId, master);
  if (rec?.workshop_id) return rec.workshop_id;
  // 运行时设备表里没有该编号时，再用种子兜底
  return getReactorMaster(reactorId, SEED_DEVICE_MASTER)?.workshop_id || 'WS-01';
}

/** 设备编号是否存在于给定设备表 */
export function isKnownReactor(reactorId: string, master: DeviceMaster = SEED_DEVICE_MASTER): boolean {
  return getReactorMaster(reactorId, master) !== undefined;
}

/**
 * 主数据齐套性校验 —— 供发布接口做真实阻断。
 * 返回未确认项的描述列表；空数组表示主数据齐全。
 */
export function findMissingMasterData(master: DeviceMaster = SEED_DEVICE_MASTER): string[] {
  if (master.reactors.length === 0) return ['reactor_master IS EMPTY'];
  return master.missing;
}

// ============================================================================
// 状态卫生 —— 孤儿批次检测（非破坏性）
// ============================================================================

/**
 * 检测挂靠了「设备表中不存在」的批次的编号。
 *
 * 取代此前的 `sanitizePhantomReactors()`：既然釜台数以后台维护为准，
 * 就不能再强制删除设备或静默改挂批次 —— 那会破坏管理员维护的真实数据。
 * 这里只做**只读检测**，把问题交给人工或管理界面处理。
 */
export function findOrphanReactorIds(
  reactors: readonly ReactorLike[] | null | undefined,
  batches: ReadonlyArray<Record<string, any>> | null | undefined,
  orders?: ReadonlyArray<Record<string, any>> | null | undefined,
): string[] {
  const known = new Set(
    (Array.isArray(reactors) ? reactors : [])
      .map((r) => r?.reactor_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0),
  );

  const orphans = new Set<string>();
  const check = (id: unknown) => {
    if (typeof id === 'string' && id.length > 0 && !known.has(id)) orphans.add(id);
  };

  for (const b of Array.isArray(batches) ? batches : []) check(b?.assigned_reactor_id);
  for (const o of Array.isArray(orders) ? orders : []) {
    for (const sb of Array.isArray(o?.split_batches) ? o.split_batches : []) check(sb?.reactor_id);
  }

  return [...orphans].sort();
}

// ============================================================================
// 向下分批（满批 + 尾批）—— 唯一的批量拆分算法
// ============================================================================

export interface BatchQuantityPlan {
  qty_kg: number;
  is_tail: boolean;
  /** 建议承接的釜类型：'SMALL' 表示应交给小容量釜，'BULK' 表示大容量釜 */
  vessel_class: 'BULK' | 'SMALL';
  /** 该批低于最小投料量、需要人工确认或与同型号订单合并 */
  below_min: boolean;
}

export interface BatchPlanOptions {
  /**
   * 运行时设备表（**权威来源**）。缺省时使用种子表，
   * 调用方应始终传入后台维护的设备表。
   */
  master?: DeviceMaster;
  /** 大容量釜单批上限，显式覆盖设备表推导值（联调/测试用） */
  bulkMaxKg?: number;
  /** 大容量釜最小投料量；null / 0 表示未确认，不做下限校验 */
  bulkMinKg?: number | null;
  /** 小容量釜单批上限，显式覆盖设备表推导值 */
  smallMaxKg?: number | null;
  /** 小容量釜最小投料量 */
  smallMinKg?: number | null;
}

export interface BatchPlanResult {
  batches: BatchQuantityPlan[];
  warnings: string[];
}

const round3 = (n: number): number => Number(n.toFixed(3));

/**
 * 把订单量拆成「满批 + 尾批」，满足不超容量、不丢量、尾批合法三条铁律。
 *
 * 批量上限与下限全部来自 `options.master`（后台维护的设备表）；
 * 显式传入的 bulkMaxKg / bulkMinKg 等仅用于覆盖，便于联调与测试。
 *
 * 尾批处理策略（与 V2.0「尾批不足下限时重新分配，不丢量」一致）：
 *   1) 尾批 ≥ 大釜下限          → 作为大釜尾批；
 *   2) 尾批装得下小釜且满足其下限 → 交给小釜；
 *   3) 否则与最后一个满批合并后均分为两批（合法重分配）；
 *   4) 均分后仍不足下限、或本就没有满批可合并 → 保留尾批并告警，交人工确认。
 */
export function planBatchQuantities(
  qtyKg: number,
  options: BatchPlanOptions = {},
): BatchPlanResult {
  const master = options.master ?? SEED_DEVICE_MASTER;

  const bulkMaxKg = options.bulkMaxKg ?? master.bulkMaxKg;
  const bulkMinRaw = options.bulkMinKg !== undefined ? options.bulkMinKg : master.bulkMinKg;
  const smallMaxKg =
    options.smallMaxKg !== undefined ? options.smallMaxKg : master.smallReactor?.max_kg ?? null;
  const smallMinKg =
    options.smallMinKg !== undefined ? options.smallMinKg : master.smallReactor?.min_kg ?? null;

  // 0 或 null 一律视为「下限未确认」→ 不做下限校验
  const bulkMinKg = bulkMinRaw && bulkMinRaw > 0 ? bulkMinRaw : null;
  const smallMin = smallMinKg && smallMinKg > 0 ? smallMinKg : null;

  const batches: BatchQuantityPlan[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(qtyKg) || qtyKg <= 0) {
    warnings.push(`订单量 ${qtyKg} kg 非法，无法拆批`);
    return { batches, warnings };
  }
  if (!Number.isFinite(bulkMaxKg) || bulkMaxKg <= 0) {
    warnings.push('设备表中没有可用容量（后台未维护设备或容量为空），无法拆批');
    return { batches, warnings };
  }

  const orderedQty = round3(qtyKg);

  // 1) 满批：按大釜额定容量向下取整
  const fullCount = Math.floor(orderedQty / bulkMaxKg);
  for (let i = 0; i < fullCount; i += 1) {
    batches.push({ qty_kg: bulkMaxKg, is_tail: false, vessel_class: 'BULK', below_min: false });
  }

  // 2) 尾批：完整保留，不四舍五入、不丢弃
  let tailKg = round3(orderedQty - fullCount * bulkMaxKg);

  if (tailKg > 0) {
    const belowBulkMin = bulkMinKg !== null && tailKg < bulkMinKg;

    if (!belowBulkMin) {
      // 尾批满足大釜下限（或下限未确认）→ 直接作为大釜尾批
      batches.push({ qty_kg: tailKg, is_tail: true, vessel_class: 'BULK', below_min: false });
      tailKg = 0;
    } else {
      const fitsSmall =
        smallMaxKg !== null &&
        smallMaxKg > 0 &&
        tailKg <= smallMaxKg &&
        (smallMin === null || tailKg >= smallMin);

      if (fitsSmall) {
        // 尾批交给小容量釜
        batches.push({ qty_kg: tailKg, is_tail: true, vessel_class: 'SMALL', below_min: false });
        tailKg = 0;
      } else if (fullCount > 0) {
        // 与最后一个满批合并后均分，避免产生不合法尾批
        const mergedKg = round3(bulkMaxKg + tailKg);
        const halfKg = round3(mergedKg / 2);
        if (bulkMinKg === null || halfKg >= bulkMinKg) {
          batches.pop();
          batches.push({ qty_kg: halfKg, is_tail: false, vessel_class: 'BULK', below_min: false });
          batches.push({
            qty_kg: round3(mergedKg - halfKg),
            is_tail: true,
            vessel_class: 'BULK',
            below_min: false,
          });
          warnings.push(
            `尾批 ${tailKg} kg 低于最小投料量 ${bulkMinKg} kg，已与一个满批合并均分为两批`,
          );
          tailKg = 0;
        } else {
          batches.push({ qty_kg: tailKg, is_tail: true, vessel_class: 'BULK', below_min: true });
          warnings.push(
            `尾批 ${tailKg} kg 低于最小投料量 ${bulkMinKg} kg，且合并均分后仍不足下限，需人工确认或与同型号订单合并`,
          );
          tailKg = 0;
        }
      } else {
        // 订单量本身就低于下限，且无满批可合并 → 保留并告警
        batches.push({ qty_kg: tailKg, is_tail: true, vessel_class: 'BULK', below_min: true });
        warnings.push(
          `尾批 ${tailKg} kg 低于最小投料量 ${bulkMinKg} kg，需人工确认或与同型号订单合并`,
        );
        tailKg = 0;
      }
    }
  }

  // 3) 质量守恒自检：计划批量之和必须等于订单量
  const totalKg = round3(batches.reduce((sum, b) => sum + b.qty_kg, 0));
  if (totalKg !== orderedQty) {
    warnings.push(`拆批总量 ${totalKg} kg 与订单量 ${orderedQty} kg 不一致，已阻断发布`);
  }

  // 4) 容量自检：单批不得超过该釜额定容量
  for (const batch of batches) {
    const capacity =
      batch.vessel_class === 'SMALL' && smallMaxKg !== null ? smallMaxKg : bulkMaxKg;
    if (batch.qty_kg > capacity) {
      warnings.push(
        `批次 ${batch.qty_kg} kg 超过${batch.vessel_class === 'SMALL' ? '小' : '大'}容量釜额定容量 ${capacity} kg，已阻断发布`,
      );
    }
  }

  return { batches, warnings };
}

/**
 * 把拆批结果依次落到大容量釜上（后台维护的大釜交替承接）。
 * 仅用于「给出一个跨釜的初始建议」；最终落釜仍由排程引擎按空闲时间与专釜约束决定。
 */
export function assignBulkReactors(
  batches: readonly BatchQuantityPlan[],
  master: DeviceMaster = SEED_DEVICE_MASTER,
  startIndex = 0,
): string[] {
  const smallId = master.smallReactor?.reactor_id ?? master.reactors[0]?.reactor_id ?? '';
  const lanes = master.bulkReactorIds.length > 0 ? master.bulkReactorIds : master.reactors.map((r) => r.reactor_id);
  if (lanes.length === 0) return batches.map(() => '');

  let bulkCursor = startIndex;
  return batches.map((batch) => {
    if (batch.vessel_class === 'SMALL' && smallId) return smallId;
    const reactorId = lanes[bulkCursor % lanes.length];
    bulkCursor += 1;
    return reactorId;
  });
}
