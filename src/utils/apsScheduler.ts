import {
  ProductionOrder,
  WorkResource,
  ScheduledTask,
  SchedulingStrategy,
  APSKpis,
  DisruptionEvent,
  FormulaType,
} from "../types.ts";
import { getCleaningDuration } from "../data/initialData.ts";

export interface ScheduleResult {
  tasks: ScheduledTask[];
  kpis: APSKpis;
  timelineHourStart: number;
  timelineHourEnd: number;
  resourceWorkloads: Record<string, { totalWorkHours: number; setupHours: number; utilization: number }>;
}

export function runApsScheduling(
  orders: ProductionOrder[],
  resources: WorkResource[],
  strategy: SchedulingStrategy = "BALANCED_LOAD",
  disruptions: DisruptionEvent[] = []
): ScheduleResult {
  // Sort orders based on strategy
  const sortedOrders = sortOrdersByStrategy([...orders], strategy);

  // Maintain per-resource timeline allocations: Array of { start: number, end: number, taskId: string }
  const resourceTimelines: Record<
    string,
    { start: number; end: number; taskId: string; isSetup?: boolean }[]
  > = {};
  const resourceLastFormula: Record<string, FormulaType | null> = {};

  resources.forEach((r) => {
    resourceTimelines[r.id] = [];
    resourceLastFormula[r.id] = r.currentFormula || null;

    // Apply active maintenance or breakdown disruptions
    const activeBreakdown = disruptions.find(
      (d) =>
        d.type === "MACHINE_BREAKDOWN" &&
        !d.resolved &&
        d.targetResourceId === r.id
    );
    if (activeBreakdown) {
      resourceTimelines[r.id].push({
        start: activeBreakdown.occurredAtHour,
        end: activeBreakdown.occurredAtHour + activeBreakdown.durationHours,
        taskId: `BREAKDOWN_${activeBreakdown.id}`,
        isSetup: true,
      });
    }

    if (r.maintenanceWindow) {
      resourceTimelines[r.id].push({
        start: r.maintenanceWindow.startHour,
        end: r.maintenanceWindow.endHour,
        taskId: `MAINTENANCE_${r.id}`,
        isSetup: true,
      });
    }
  });

  const scheduledTasks: ScheduledTask[] = [];

  // Define operations templates per batch
  for (const order of sortedOrders) {
    if (order.status === "PENDING" && strategy !== "EDD_ASAP" && strategy !== "TOC_BOTTLENECK") {
      // Keep pending orders if strict, or schedule all
    }

    // Process operations:
    // Op 10: 预溶处理 (3h) -> PRE_TANK
    // Op 20: 核心配制反应 (8h-10h depending on tons) -> REACTOR
    // Op 30: 静态熟化静置 (6h) -> AGING_VESSEL
    // Op 40: 质检水分与色谱检测 (2h) -> QA_LAB
    // Op 50: 充氮无尘灌装 (4h) -> PACKING_LINE

    const tons = order.quantityTons;
    const opDurations = {
      10: Math.max(3, Math.round(tons * 0.12)),
      20: Math.max(7, Math.round(tons * 0.36)),
      30: Math.max(5, Math.round(tons * 0.2)),
      40: 2,
      50: Math.max(3, Math.round(tons * 0.14)),
    };

    // Check for QA Hold or material delay disruptions affecting this order
    const orderDisruption = disruptions.find(
      (d) => !d.resolved && d.targetOrderId === order.id
    );

    let prevOpEndTime = 0; // Relative hour

    // 1. Op 10: 预溶工序
    const op10Res = pickResource(
      resources,
      "PRE_TANK",
      order.formulaType,
      strategy,
      resourceTimelines
    );
    const op10 = scheduleSingleOperation({
      order,
      opSeq: 10,
      opName: "溶剂脱水预溶",
      duration: opDurations[10],
      earliestStart: prevOpEndTime,
      candidateResources: op10Res ? [op10Res] : [],
      resourceTimelines,
      resourceLastFormula,
    });
    scheduledTasks.push(op10);
    prevOpEndTime = op10.endHour;

    // 2. Op 20: 核心配制反应工序 (主瓶颈)
    const op20Candidates = resources.filter(
      (r) =>
        r.category === "REACTOR" &&
        (!r.dedicatedFormula || r.dedicatedFormula === order.formulaType)
    );
    // If no dedicated matched, allow any available reactor
    const finalOp20Candidates =
      op20Candidates.length > 0
        ? op20Candidates
        : resources.filter((r) => r.category === "REACTOR");

    // Order by strategy preference (e.g. dedicated first, or matching formula last on machine)
    finalOp20Candidates.sort((a, b) => {
      if (a.dedicatedFormula === order.formulaType) return -1;
      if (b.dedicatedFormula === order.formulaType) return 1;
      if (resourceLastFormula[a.id] === order.formulaType) return -1;
      return 0;
    });

    const op20 = scheduleSingleOperation({
      order,
      opSeq: 20,
      opName: "高精配制均质反应",
      duration: opDurations[20],
      earliestStart: prevOpEndTime,
      candidateResources: finalOp20Candidates,
      resourceTimelines,
      resourceLastFormula,
    });
    scheduledTasks.push(op20);
    prevOpEndTime = op20.endHour;

    // 3. Op 30: 静态熟化超精沉降
    const op30Candidates = resources.filter((r) => r.category === "AGING_VESSEL");
    const op30 = scheduleSingleOperation({
      order,
      opSeq: 30,
      opName: "静态熟化与超精过滤",
      duration: opDurations[30],
      earliestStart: prevOpEndTime,
      candidateResources: op30Candidates,
      resourceTimelines,
      resourceLastFormula,
    });
    scheduledTasks.push(op30);
    prevOpEndTime = op30.endHour;

    // Disruption injection: QA Hold delay after Op 30 if applicable
    if (orderDisruption && orderDisruption.type === "QA_HOLD") {
      prevOpEndTime += orderDisruption.durationHours;
    }

    // 4. Op 40: 色谱水分与纯度快检
    const op40Candidates = resources.filter((r) => r.category === "QA_LAB");
    const op40 = scheduleSingleOperation({
      order,
      opSeq: 40,
      opName: "色谱纯度与水分质检",
      duration: opDurations[40],
      earliestStart: prevOpEndTime,
      candidateResources: op40Candidates,
      resourceTimelines,
      resourceLastFormula,
    });
    scheduledTasks.push(op40);
    prevOpEndTime = op40.endHour;

    // 5. Op 50: 充氮密闭灌装入库
    const op50Candidates = resources.filter((r) => r.category === "PACKING_LINE");
    const op50 = scheduleSingleOperation({
      order,
      opSeq: 50,
      opName: "全自动吨桶充氮灌装",
      duration: opDurations[50],
      earliestStart: prevOpEndTime,
      candidateResources: op50Candidates,
      resourceTimelines,
      resourceLastFormula,
    });
    scheduledTasks.push(op50);

    // Check delivery punctuality
    const isDelayed = op50.endHour > order.dueHour;
    if (isDelayed) {
      op50.isDelayed = true;
      op50.delayHours = op50.endHour - order.dueHour;
    }
  }

  // Calculate overall KPIs
  const kpis = calculateApsKpis(orders, scheduledTasks, resources);

  // Calculate per-resource workload
  const resourceWorkloads: Record<
    string,
    { totalWorkHours: number; setupHours: number; utilization: number }
  > = {};

  const maxHour = Math.max(
    ...scheduledTasks.map((t) => t.endHour),
    72 // default 3-day horizon
  );

  resources.forEach((r) => {
    const tasksForRes = scheduledTasks.filter((t) => t.resourceId === r.id);
    const workHours = tasksForRes.reduce(
      (sum, t) => sum + (t.endHour - t.startHour),
      0
    );
    const setupH = tasksForRes.reduce(
      (sum, t) => sum + (t.setupDurationHours || 0),
      0
    );
    const totalOccupied = workHours + setupH;
    const utilization = maxHour > 0 ? Math.min(100, Math.round((totalOccupied / maxHour) * 100)) : 0;

    resourceWorkloads[r.id] = {
      totalWorkHours: workHours,
      setupHours: setupH,
      utilization,
    };
  });

  return {
    tasks: scheduledTasks,
    kpis,
    timelineHourStart: 0,
    timelineHourEnd: Math.ceil((maxHour + 8) / 8) * 8, // round to 8h shifts
    resourceWorkloads,
  };
}

function sortOrdersByStrategy(
  orders: ProductionOrder[],
  strategy: SchedulingStrategy
): ProductionOrder[] {
  switch (strategy) {
    case "EDD_ASAP":
      // Earliest Due Date first, prioritizing emergencies
      return orders.sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        if (a.priority !== b.priority) {
          return priorityWeight(a.priority) - priorityWeight(b.priority);
        }
        return a.dueHour - b.dueHour;
      });

    case "SETUP_MINIMIZE":
      // Cluster by formula type to reduce cleaning/changeover
      return orders.sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        if (a.formulaType === b.formulaType) {
          return a.dueHour - b.dueHour;
        }
        return a.formulaType.localeCompare(b.formulaType);
      });

    case "TOC_BOTTLENECK":
      // Bottleneck first: prioritize large orders and high-nickel formulas with high due date urgency
      return orders.sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        const urgencyA = a.dueHour - a.quantityTons * 0.5;
        const urgencyB = b.dueHour - b.quantityTons * 0.5;
        return urgencyA - urgencyB;
      });

    case "JIT_BACKWARD":
      // Pull schedule based on due dates to avoid early inventory
      return orders.sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        return a.dueHour - b.dueHour;
      });

    case "BALANCED_LOAD":
    default:
      // Weighted balance between priority, due date, and batch clustering
      return orders.sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;
        const scoreA =
          priorityWeight(a.priority) * 20 + a.dueHour * 0.8;
        const scoreB =
          priorityWeight(b.priority) * 20 + b.dueHour * 0.8;
        return scoreA - scoreB;
      });
  }
}

function priorityWeight(priority: string): number {
  switch (priority) {
    case "P1_EMERGENCY":
      return 1;
    case "P2_HIGH":
      return 2;
    case "P3_NORMAL":
      return 3;
    case "P4_LOW":
      return 4;
    default:
      return 5;
  }
}

function pickResource(
  resources: WorkResource[],
  category: WorkResource["category"],
  formula: FormulaType,
  _strategy: SchedulingStrategy,
  timelines: Record<string, { start: number; end: number }[]>
): WorkResource | null {
  const candidates = resources.filter((r) => r.category === category);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Pick resource with least busy hours so far
  let best = candidates[0];
  let minOccupied = Infinity;

  for (const c of candidates) {
    // Dedication check
    if (c.dedicatedFormula && c.dedicatedFormula !== formula) continue;

    const intervals = timelines[c.id] || [];
    const occupied = intervals.reduce((sum, i) => sum + (i.end - i.start), 0);
    if (occupied < minOccupied) {
      minOccupied = occupied;
      best = c;
    }
  }

  return best;
}

interface SingleOpParam {
  order: ProductionOrder;
  opSeq: number;
  opName: string;
  duration: number;
  earliestStart: number;
  candidateResources: WorkResource[];
  resourceTimelines: Record<string, { start: number; end: number; taskId: string; isSetup?: boolean }[]>;
  resourceLastFormula: Record<string, FormulaType | null>;
}

function scheduleSingleOperation({
  order,
  opSeq,
  opName,
  duration,
  earliestStart,
  candidateResources,
  resourceTimelines,
  resourceLastFormula,
}: SingleOpParam): ScheduledTask {
  if (candidateResources.length === 0) {
    // Fallback stub
    return {
      id: `${order.id}_OP${opSeq}`,
      orderId: order.id,
      orderNo: order.orderNo,
      customerName: order.customerName,
      productName: order.productName,
      formulaType: order.formulaType,
      opId: `OP_${opSeq}`,
      opSeq,
      opName,
      resourceId: "UNKNOWN",
      startHour: earliestStart,
      endHour: earliestStart + duration,
      priority: order.priority,
      isEmergency: order.isEmergency,
    };
  }

  // Find the earliest available slot among candidates
  let bestRes = candidateResources[0];
  let earliestFinish = Infinity;
  let bestSlot = { start: earliestStart, end: earliestStart + duration, setupHours: 0, setupReason: "" };

  for (const res of candidateResources) {
    const lastFormula = resourceLastFormula[res.id];
    const { duration: cleanDur, reason: cleanReason } = getCleaningDuration(
      lastFormula,
      order.formulaType
    );

    const totalDurNeeded = duration + cleanDur;
    const intervals = resourceTimelines[res.id] || [];

    // Find first gap >= totalDurNeeded starting at or after earliestStart
    const slotStart = findEarliestGap(intervals, earliestStart, totalDurNeeded);
    const finish = slotStart + totalDurNeeded;

    if (finish < earliestFinish) {
      earliestFinish = finish;
      bestRes = res;
      bestSlot = {
        start: slotStart + cleanDur,
        end: finish,
        setupHours: cleanDur,
        setupReason: cleanReason,
      };
    }
  }

  // Commit to chosen resource timeline
  const intervals = resourceTimelines[bestRes.id];
  if (bestSlot.setupHours > 0) {
    intervals.push({
      start: bestSlot.start - bestSlot.setupHours,
      end: bestSlot.start,
      taskId: `CLEAN_${order.id}_${opSeq}`,
      isSetup: true,
    });
  }

  intervals.push({
    start: bestSlot.start,
    end: bestSlot.end,
    taskId: `${order.id}_OP${opSeq}`,
  });

  // Update last formula on resource
  resourceLastFormula[bestRes.id] = order.formulaType;

  return {
    id: `${order.id}_OP${opSeq}`,
    orderId: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    productName: order.productName,
    formulaType: order.formulaType,
    opId: `OP_${opSeq}`,
    opSeq,
    opName,
    resourceId: bestRes.id,
    startHour: bestSlot.start,
    endHour: bestSlot.end,
    setupStartHour: bestSlot.setupHours > 0 ? bestSlot.start - bestSlot.setupHours : undefined,
    setupDurationHours: bestSlot.setupHours > 0 ? bestSlot.setupHours : 0,
    setupReason: bestSlot.setupReason,
    priority: order.priority,
    isEmergency: order.isEmergency,
  };
}

function findEarliestGap(
  intervals: { start: number; end: number }[],
  earliestStart: number,
  durationNeeded: number
): number {
  if (intervals.length === 0) return earliestStart;

  // Sort intervals by start
  const sorted = [...intervals].sort((a, b) => a.start - b.start);

  let currentCandidate = earliestStart;

  for (const interval of sorted) {
    if (interval.end <= currentCandidate) {
      continue;
    }
    if (interval.start >= currentCandidate + durationNeeded) {
      // Gap is wide enough!
      return currentCandidate;
    }
    // Conflict, move candidate to end of this interval
    currentCandidate = Math.max(currentCandidate, interval.end);
  }

  return currentCandidate;
}

function calculateApsKpis(
  orders: ProductionOrder[],
  tasks: ScheduledTask[],
  resources: WorkResource[]
): APSKpis {
  const lastOpTasks = tasks.filter((t) => t.opSeq === 50);

  let onTimeCount = 0;
  let delayedCount = 0;

  orders.forEach((ord) => {
    const finalTask = lastOpTasks.find((t) => t.orderId === ord.id);
    if (finalTask) {
      if (finalTask.endHour <= ord.dueHour) {
        onTimeCount++;
      } else {
        delayedCount++;
      }
    } else {
      onTimeCount++;
    }
  });

  const totalOrders = orders.length || 1;
  const otdRate = Math.round((onTimeCount / totalOrders) * 100);

  const makespanHours = tasks.length > 0 ? Math.max(...tasks.map((t) => t.endHour)) : 0;

  const totalSetupHours = tasks.reduce(
    (sum, t) => sum + (t.setupDurationHours || 0),
    0
  );

  const totalWorkHours = tasks.reduce(
    (sum, t) => sum + (t.endHour - t.startHour),
    0
  );

  const totalCapacity = (resources.length || 1) * (makespanHours || 72);
  const avgUtilization =
    totalCapacity > 0
      ? Math.min(98, Math.round(((totalWorkHours + totalSetupHours) / totalCapacity) * 100))
      : 0;

  return {
    otdRate,
    avgUtilization,
    totalSetupHours,
    makespanHours,
    delayedOrdersCount: delayedCount,
    totalWipBatches: tasks.filter((t) => t.opSeq === 20 || t.opSeq === 30).length,
    totalEnergyScore: Math.round(100 - totalSetupHours * 1.5),
  };
}
