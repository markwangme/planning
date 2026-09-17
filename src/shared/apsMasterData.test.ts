/**
 * 主数据与向下分批的回归测试。
 *
 * 权威口径（本文件守护的核心约定）：
 *   **釜台数与设备最小/最大投料量，一律以「后台维护的设备表」为准。**
 *   代码里的 SEED_REACTOR_MASTER 只是初始种子，不得覆盖后台维护的数据。
 *
 * 因此本文件重点验证「后台改了什么，算法就按什么算」：
 *   改下限 → 尾批策略跟随；改容量 → 批量跟随；增删设备 → 釜池跟随。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SEED_REACTOR_MASTER,
  SEED_DEVICE_MASTER,
  buildDeviceMaster,
  assignBulkReactors,
  findMissingMasterData,
  findOrphanReactorIds,
  getReactorMaster,
  isKnownReactor,
  planBatchQuantities,
  reactorMaxKg,
  reactorMinKg,
  resolveWorkshopId,
  type ReactorLike,
} from './apsMasterData';

const round3 = (n: number) => Number(n.toFixed(3));

/** 订单量测试矩阵，覆盖边界与历史缺陷区间 */
const ORDER_SIZES = [
  1, 300, 500, 1300, 1310, 1999, 2000, 3000, 5999, 6000, 6001, 7000, 7300,
  9000, 10000, 11999, 12000, 12200, 13000, 18000, 20000, 30000, 61000, 61500,
];

/** 复刻种子设备表（后台尚未维护时的初值） */
const seed = () => SEED_REACTOR_MASTER.map((r) => ({ ...r }));

// ---------------------------------------------------------------------------
// 种子设备表 —— 只是初值，不是权威
// ---------------------------------------------------------------------------

test('种子设备表为三台釜（1.3 t ×1 + 6 t ×2）', () => {
  assert.equal(SEED_REACTOR_MASTER.length, 3);
  assert.deepEqual(
    SEED_REACTOR_MASTER.map((r) => r.reactor_id),
    ['R-1300-01', 'R-6000-01', 'R-6000-02'],
  );
});

test('种子设备表构建出的大釜池与小釜均正确', () => {
  const master = SEED_DEVICE_MASTER;
  assert.equal(master.bulkMaxKg, 6000);
  assert.deepEqual(master.bulkReactorIds, ['R-6000-01', 'R-6000-02']);
  assert.equal(master.smallReactor?.reactor_id, 'R-1300-01');
  assert.equal(master.bulkMinKg, 2000);
  assert.deepEqual(master.missing, []);
});

test('每台釜的容量与投料上下限自洽', () => {
  for (const r of SEED_REACTOR_MASTER) {
    assert.ok((r.rated_kg ?? 0) > 0, `${r.reactor_id} rated_kg 应为正数`);
    assert.ok((r.max_kg ?? 0) > 0, `${r.reactor_id} max_kg 应为正数`);
    if (r.min_kg !== null && r.min_kg !== undefined) {
      assert.ok(r.min_kg > 0, `${r.reactor_id} min_kg 应为正数`);
      assert.ok(r.min_kg <= (r.max_kg ?? 0), `${r.reactor_id} min_kg 不得超过 max_kg`);
    }
    assert.ok(['WS-01', 'WS-02'].includes(r.workshop_id ?? ''), `${r.reactor_id} 车间应合法`);
  }
});

test('由设备表推导车间，取代硬编码推断', () => {
  const master = buildDeviceMaster(seed());
  assert.equal(resolveWorkshopId('R-1300-01', master), 'WS-01');
  assert.equal(resolveWorkshopId('R-6000-01', master), 'WS-01');
  assert.equal(resolveWorkshopId('R-6000-02', master), 'WS-02');
  assert.equal(resolveWorkshopId(null, master), 'WS-01');
  assert.equal(resolveWorkshopId(undefined, master), 'WS-01');
});

test('种子设备表主数据齐套，无缺失项', () => {
  assert.deepEqual(findMissingMasterData(SEED_DEVICE_MASTER), []);
});

// ---------------------------------------------------------------------------
// 后台维护优先 —— 这是本次口径变更的核心
// ---------------------------------------------------------------------------

test('后台改下限：尾批策略立即跟随，不再用代码里的 2000', () => {
  // 后台把 6 t 釜下限从 2000 下调到 300
  const relaxed: ReactorLike[] = seed().map((r) =>
    r.reactor_id.startsWith('R-6000') ? { ...r, min_kg: 300 } : r,
  );
  const master = buildDeviceMaster(relaxed);
  assert.equal(master.bulkMinKg, 300, '下限应取后台维护值');

  // 7300 = 6000 + 1300：原先 1300 < 2000 需交小釜，现在 1300 >= 300 可直接作大釜尾批
  const { batches } = planBatchQuantities(7300, { master });
  assert.deepEqual(
    batches.map((b) => [b.qty_kg, b.vessel_class]),
    [
      [6000, 'BULK'],
      [1300, 'BULK'],
    ],
    '下限放宽后尾批不再降级到小釜',
  );
});

test('后台改下限：上调到 4000 时尾批被合并均分', () => {
  const strict = buildDeviceMaster(
    seed().map((r) => (r.reactor_id.startsWith('R-6000') ? { ...r, min_kg: 4000 } : r)),
  );
  assert.equal(strict.bulkMinKg, 4000);

  // 10000 的尾批 4000 正好等于下限，应保留为大釜尾批
  assert.deepEqual(
    planBatchQuantities(10000, { master: strict }).batches.map((b) => b.qty_kg),
    [6000, 4000],
  );
  // 9000 的尾批 3000 < 4000，且装不下 1.3 t 釜 → 合并均分为 4500 + 4500
  assert.deepEqual(
    planBatchQuantities(9000, { master: strict }).batches.map((b) => b.qty_kg),
    [4500, 4500],
  );
});

test('后台改容量：满批批量立即跟随，不再是 6000', () => {
  const enlarged = buildDeviceMaster(
    seed().map((r) => (r.reactor_id.startsWith('R-6000') ? { ...r, max_kg: 8000, rated_kg: 8000 } : r)),
  );
  assert.equal(enlarged.bulkMaxKg, 8000);

  const { batches } = planBatchQuantities(20000, { master: enlarged });
  assert.deepEqual(
    batches.map((b) => b.qty_kg),
    [8000, 8000, 4000],
    '满批应按后台维护的 8000 拆分',
  );
  assert.equal(assignBulkReactors(batches, enlarged).length, 3);
});

test('后台增设备：新增大釜自动进入大釜池', () => {
  const withThird: ReactorLike[] = [
    ...seed(),
    { reactor_id: 'R-6000-03', reactor_name: '新增 6 t 釜', workshop_id: 'WS-02', rated_kg: 6000, min_kg: 2000, max_kg: 6000 },
  ];
  const master = buildDeviceMaster(withThird);

  assert.equal(master.reactors.length, 4, '管理员新增的设备必须原样保留');
  assert.deepEqual(master.bulkReactorIds, ['R-6000-01', 'R-6000-02', 'R-6000-03']);
  assert.ok(isKnownReactor('R-6000-03', master), '新增设备应被识别为已知设备');

  // 三台大釜轮流承接
  const { batches } = planBatchQuantities(18000, { master });
  assert.deepEqual(assignBulkReactors(batches, master), ['R-6000-01', 'R-6000-02', 'R-6000-03']);
});

test('后台增设备：新增小釜时按容量自动识别为尾批承接釜', () => {
  const withMid: ReactorLike[] = [
    ...seed(),
    { reactor_id: 'R-3000-01', reactor_name: '3 t 釜', workshop_id: 'WS-01', rated_kg: 3000, min_kg: 1000, max_kg: 3000 },
  ];
  const master = buildDeviceMaster(withMid);
  // 3 t 釜容量介于 1.3 t 与 6 t 之间，应成为尾批承接釜（取小于大釜者中容量最大）
  assert.equal(master.smallReactor?.reactor_id, 'R-3000-01');

  // 7500 = 6000 + 1500：1500 低于 6 t 釜下限 2000，但装得下 3 t 釜且 ≥ 其下限 1000
  const { batches } = planBatchQuantities(7500, { master });
  assert.deepEqual(
    batches.map((b) => [b.qty_kg, b.vessel_class]),
    [
      [6000, 'BULK'],
      [1500, 'SMALL'],
    ],
  );
});

test('后台删光设备：拒绝拆批并明确告警，不静默回落到种子', () => {
  const master = buildDeviceMaster([]);
  assert.equal(master.reactors.length, 0);
  assert.equal(master.bulkMaxKg, 0);

  const { batches, warnings } = planBatchQuantities(10000, { master });
  assert.equal(batches.length, 0, '无可用设备时不得产出批次');
  assert.ok(warnings.some((w) => w.includes('没有可用容量')), '应给出设备缺失告警');
});

test('后台未确认最小投料量：不做下限校验，但不阻断容量与守恒', () => {
  const master = buildDeviceMaster(seed().map((r) => ({ ...r, min_kg: null })));
  assert.equal(master.bulkMinKg, null, '任一未确认即视为整体未确认');
  assert.deepEqual(findMissingMasterData(master), [
    'R-1300-01.min_kg IS NULL',
    'R-6000-01.min_kg IS NULL',
    'R-6000-02.min_kg IS NULL',
  ]);

  const { batches } = planBatchQuantities(12200, { master });
  assert.deepEqual(
    batches.map((b) => b.qty_kg),
    [6000, 6000, 200],
    '下限未确认时尾批原样保留，不丢量',
  );
  assert.equal(batches.some((b) => b.below_min), false);
});

test('设备表为空时主数据校验报 EMPTY', () => {
  assert.deepEqual(findMissingMasterData(buildDeviceMaster([])), ['reactor_master IS EMPTY']);
  assert.deepEqual(findMissingMasterData(buildDeviceMaster(null)), ['reactor_master IS EMPTY']);
});

test('容量取 max_kg，缺失时回落 rated_kg', () => {
  const master = buildDeviceMaster([
    { reactor_id: 'R-A', rated_kg: 5000, min_kg: 1000 },
    { reactor_id: 'R-B', rated_kg: 5000, max_kg: 4000, min_kg: 1000 },
  ]);
  assert.equal(reactorMaxKg('R-A', master), 5000, 'max_kg 缺失应回落 rated_kg');
  assert.equal(reactorMaxKg('R-B', master), 4000, 'max_kg 存在时优先');
  assert.equal(reactorMinKg('R-A', master), 1000);
  assert.equal(master.bulkMaxKg, 5000);
  assert.equal(master.smallReactor?.reactor_id, 'R-B');
});

// ---------------------------------------------------------------------------
// 孤儿批次检测 —— 取代此前的强制删除
// ---------------------------------------------------------------------------

test('不再强制删除设备：管理员新增的第四台釜不会被清理', () => {
  const reactors: ReactorLike[] = [
    ...seed(),
    { reactor_id: 'R-6000-03', workshop_id: 'WS-02', rated_kg: 6000, min_kg: 2000, max_kg: 6000 },
  ];
  // 该编号在代码种子里不存在，但后台维护了它 —— 必须被视为合法设备
  const master = buildDeviceMaster(reactors);
  assert.equal(getReactorMaster('R-6000-03', master)?.reactor_id, 'R-6000-03');
  assert.equal(findOrphanReactorIds(reactors, [], []).length, 0);
});

test('孤儿检测：批次挂靠了设备表中不存在的编号时上报，但不改数据', () => {
  const reactors = seed();
  const batches = [
    { batch_id: 'B1', assigned_reactor_id: 'R-6000-01' },
    { batch_id: 'B2', assigned_reactor_id: 'R-9999-99' },
  ];
  const orders = [{ order_no: 'O1', split_batches: [{ reactor_id: 'R-8888-88' }] }];

  const orphans = findOrphanReactorIds(reactors, batches, orders);
  assert.deepEqual(orphans, ['R-8888-88', 'R-9999-99'], '应上报全部孤儿编号且排序稳定');
  // 只读检测：入参不得被改写
  assert.equal(batches[1].assigned_reactor_id, 'R-9999-99');
  assert.equal(orders[0].split_batches[0].reactor_id, 'R-8888-88');
});

test('孤儿检测：全部引用合法时返回空数组', () => {
  const reactors = seed();
  const batches = [{ batch_id: 'B1', assigned_reactor_id: 'R-6000-02' }];
  const orders = [{ order_no: 'O1', split_batches: [{ reactor_id: 'R-1300-01' }] }];
  assert.deepEqual(findOrphanReactorIds(reactors, batches, orders), []);
});

test('孤儿检测：空/缺字段输入不抛异常', () => {
  assert.deepEqual(findOrphanReactorIds([], [], []), []);
  assert.deepEqual(findOrphanReactorIds(null, null, null), []);
  assert.deepEqual(findOrphanReactorIds(undefined, undefined), []);
});

// ---------------------------------------------------------------------------
// 拆批：两条铁律 + 设备归属（以种子设备表为准）
// ---------------------------------------------------------------------------

test('铁律一：单批不得超过承接釜的额定容量', () => {
  const master = SEED_DEVICE_MASTER;
  for (const qty of ORDER_SIZES) {
    const { batches } = planBatchQuantities(qty, { master });
    const reactorIds = assignBulkReactors(batches, master);
    batches.forEach((batch, i) => {
      const capacity = getReactorMaster(reactorIds[i], master)?.max_kg;
      assert.ok(capacity !== undefined, `批次落在未知设备 ${reactorIds[i]}`);
      assert.ok(
        batch.qty_kg <= capacity,
        `订单 ${qty} kg：批次 ${batch.qty_kg} kg 超过 ${reactorIds[i]} 的 ${capacity} kg`,
      );
    });
  }
});

test('铁律二：计划批量之和必须等于订单量（不丢量、不超排）', () => {
  const master = SEED_DEVICE_MASTER;
  for (const qty of ORDER_SIZES) {
    const { batches } = planBatchQuantities(qty, { master });
    const total = round3(batches.reduce((sum, b) => sum + b.qty_kg, 0));
    assert.equal(total, round3(qty), `订单 ${qty} kg 拆批合计为 ${total} kg`);
  }
});

test('铁律在后台改过容量后同样成立', () => {
  // 把两台大釜改成不对称容量，验证铁律仍不被破坏
  const master = buildDeviceMaster([
    { reactor_id: 'R-1300-01', workshop_id: 'WS-01', rated_kg: 1300, min_kg: 300, max_kg: 1300 },
    { reactor_id: 'R-6000-01', workshop_id: 'WS-01', rated_kg: 6000, min_kg: 2000, max_kg: 6000 },
    { reactor_id: 'R-6000-02', workshop_id: 'WS-02', rated_kg: 6000, min_kg: 2000, max_kg: 6000 },
    { reactor_id: 'R-9000-01', workshop_id: 'WS-02', rated_kg: 9000, min_kg: 3000, max_kg: 9000 },
  ]);
  for (const qty of ORDER_SIZES) {
    const { batches } = planBatchQuantities(qty, { master });
    const total = round3(batches.reduce((sum, b) => sum + b.qty_kg, 0));
    assert.equal(total, round3(qty), `订单 ${qty} kg 合计不符`);
    for (const b of batches) {
      assert.ok(b.qty_kg <= master.bulkMaxKg, `订单 ${qty} kg 出现超容量批次`);
    }
  }
});

test('拆批只落在已知设备上，且满批交替承接两台 6 t 釜', () => {
  const master = SEED_DEVICE_MASTER;
  const { batches } = planBatchQuantities(30000, { master });
  const reactorIds = assignBulkReactors(batches, master);
  for (const id of reactorIds) {
    assert.ok(isKnownReactor(id, master), `出现未知设备 ${id}`);
  }
  const smallId = master.smallReactor?.reactor_id;
  const bulkSequence = reactorIds.filter((id) => id !== smallId);
  assert.deepEqual(bulkSequence, ['R-6000-01', 'R-6000-02', 'R-6000-01', 'R-6000-02', 'R-6000-01']);
});

// ---------------------------------------------------------------------------
// 原缺陷回归：超釜容量
// ---------------------------------------------------------------------------

test('原缺陷回归：订单量 > 12000 kg 不再产生超容量批次', () => {
  const master = SEED_DEVICE_MASTER;
  for (const qty of [12200, 13000, 20000, 61000, 61500]) {
    const { batches } = planBatchQuantities(qty, { master });
    const overCapacity = batches.filter((b) => b.qty_kg > master.bulkMaxKg);
    assert.equal(overCapacity.length, 0, `订单 ${qty} kg 出现超容量批次`);
  }
});

// ---------------------------------------------------------------------------
// 尾批处理策略
// ---------------------------------------------------------------------------

test('尾批满足大釜下限时，作为大釜尾批', () => {
  // 10000 = 6000（满批）+ 4000（尾批，≥ 2000 下限）
  const { batches, warnings } = planBatchQuantities(10000);
  assert.deepEqual(
    batches.map((b) => [b.qty_kg, b.is_tail, b.vessel_class]),
    [
      [6000, false, 'BULK'],
      [4000, true, 'BULK'],
    ],
  );
  assert.equal(warnings.length, 0);
});

test('尾批装得下小釜时交给小釜', () => {
  // 7300 = 6000 + 1300，1300 低于 6 t 釜下限 2000，但正好装满 1.3 t 釜
  const { batches, warnings } = planBatchQuantities(7300);
  assert.deepEqual(
    batches.map((b) => [b.qty_kg, b.is_tail, b.vessel_class]),
    [
      [6000, false, 'BULK'],
      [1300, true, 'SMALL'],
    ],
  );
  assert.equal(warnings.length, 0);
});

test('尾批低于所有下限时，与末个满批合并均分', () => {
  // 12200 的尾批为 200 kg：低于 6 t 釜下限 2000，也低于 1.3 t 釜下限 300
  const { batches, warnings } = planBatchQuantities(12200);
  assert.deepEqual(
    batches.map((b) => b.qty_kg),
    [6000, 3100, 3100],
  );
  assert.ok(warnings.some((w) => w.includes('合并均分')), '应给出合并均分告警');
  assert.equal(
    batches.filter((b) => b.below_min).length,
    0,
    '重分配后不应再有低于下限的批次',
  );
});

test('合并均分：极小尾批被吸收（6001 kg）', () => {
  const { batches } = planBatchQuantities(6001);
  assert.deepEqual(
    batches.map((b) => b.qty_kg),
    [3000.5, 3000.5],
  );
});

test('尾批大于小釜容量且低于大釜下限时，保留并告警而非静默丢弃', () => {
  // 1310 kg：超过 1.3 t 釜容量，无法交小釜；又低于 6 t 釜下限 2000，且无满批可合并
  const { batches, warnings } = planBatchQuantities(1310);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].qty_kg, 1310);
  assert.equal(batches[0].below_min, true);
  assert.ok(warnings.length > 0, '应给出低于下限的告警');
});

test('订单量本身低于大釜下限时，标记 below_min 且不丢量', () => {
  const { batches } = planBatchQuantities(500);
  const total = round3(batches.reduce((sum, b) => sum + b.qty_kg, 0));
  assert.equal(total, 500);
  // 500 kg 装得下 1.3 t 釜，应交给小釜
  assert.equal(batches[0].vessel_class, 'SMALL');
  assert.equal(batches[0].below_min, false);
});

test('200kg 不满足大小釜最小投料量时，不得伪装成可生产的 6T 批次', () => {
  const { batches, warnings } = planBatchQuantities(200);
  assert.deepEqual(batches.map((batch) => [batch.qty_kg, batch.vessel_class, batch.below_min]), [[200, 'BULK', true]]);
  assert.match(warnings[0], /低于最小投料量/);
  assert.equal(assignBulkReactors(batches)[0], 'R-6000-01');
});

test('最小投料量未确认时不做下限校验，尾批原样保留', () => {
  const { batches, warnings } = planBatchQuantities(12200, { bulkMinKg: null });
  assert.deepEqual(
    batches.map((b) => b.qty_kg),
    [6000, 6000, 200],
  );
  assert.equal(
    batches.some((b) => b.below_min),
    false,
    '下限未确认时不应标记 below_min',
  );
  assert.equal(warnings.length, 0);
});

test('显式覆盖优先级高于设备表（联调用途）', () => {
  const { batches } = planBatchQuantities(7300, { bulkMinKg: 300 });
  // 下限降到 300 后，1300 kg 尾批不再需要重分配
  assert.deepEqual(
    batches.map((b) => b.qty_kg),
    [6000, 1300],
  );
});

// ---------------------------------------------------------------------------
// 非法输入
// ---------------------------------------------------------------------------

test('非法订单量返回空批次并给出告警', () => {
  for (const bad of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
    const { batches, warnings } = planBatchQuantities(bad);
    assert.equal(batches.length, 0, `订单量 ${bad} 应返回空批次`);
    assert.ok(warnings.length > 0, `订单量 ${bad} 应给出告警`);
  }
});

test('精度保持三位小数，不做整数四舍五入', () => {
  const { batches } = planBatchQuantities(6000.125);
  const total = round3(batches.reduce((sum, b) => sum + b.qty_kg, 0));
  assert.equal(total, 6000.125);
});

test('设备记录脏数据不导致崩溃（缺 id / 非数组）', () => {
  const master = buildDeviceMaster([
    { reactor_id: '', max_kg: 6000 } as ReactorLike,
    { reactor_id: 'R-X', rated_kg: 0, max_kg: 0, min_kg: 0 },
    null as unknown as ReactorLike,
  ]);
  assert.equal(master.reactors.length, 1, '空编号与 null 应被过滤');
  assert.equal(master.reactors[0].reactor_id, 'R-X');
  assert.deepEqual(master.missing, ['R-X.min_kg IS NULL', 'R-X.max_kg IS NULL']);
});
