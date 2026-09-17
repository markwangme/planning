/**
 * 持久化边界回归测试。
 *
 * 守护的核心约定：**釜台数依据后台维护的信息为准。**
 * 因此持久化层对设备表必须是**透明的** —— 不得删除、改挂或重排任何设备记录。
 *
 * 回归背景：此前曾有一版「幻影设备清理」，会在读/写两侧强制删除 R-6000-03
 * 并把引用它的批次改挂到 R-6000-02。该做法与「后台维护为准」直接冲突：
 * 管理员新增的同名设备会在重启后被静默删掉。本文件锁定「不改写」这一行为。
 *
 * 本测试在系统临时目录里跑，绝不触碰仓库的真实 data/。
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { createDurableApsDatabase } from './apsDatabase';

const tempDirs: string[] = [];

/** 建一个隔离的数据目录，并（可选）预置一份遗留 JSON 快照 */
function makeIsolatedDir(legacyState?: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aps-db-test-'));
  tempDirs.push(dir);
  if (legacyState !== undefined) {
    fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'data', 'aps-server-database.json'),
      JSON.stringify(legacyState),
      'utf8',
    );
  }
  return dir;
}

const readState = (dir: string): any => {
  const db = createDurableApsDatabase(dir);
  const state = db.loadState();
  db.close();
  return state;
};

const writeState = (dir: string, state: unknown): void => {
  const db = createDurableApsDatabase(dir);
  db.saveState(state);
  db.close();
};

/**
 * 复刻真实遗留快照：含四台设备（第四台是历史遗留编号）。
 * 在新口径下这是**后台维护的数据**，必须原样保留。
 */
const legacySnapshot = () => ({
  schemaVersion: 4,
  reactors: [
    { reactor_id: 'R-1300-01', workshop_id: 'WS-01', rated_kg: 1300, min_kg: 300, max_kg: 1300 },
    { reactor_id: 'R-6000-01', workshop_id: 'WS-01', rated_kg: 6000, min_kg: 2000, max_kg: 6000 },
    { reactor_id: 'R-6000-02', workshop_id: 'WS-02', rated_kg: 6000, min_kg: 2000, max_kg: 6000 },
    { reactor_id: 'R-6000-03', workshop_id: 'WS-02', rated_kg: 6000, min_kg: 2000, max_kg: 6000 },
  ],
  workshops: [
    { id: 'WS-01', reactorCount: 2 },
    { id: 'WS-02', reactorCount: 2 },
  ],
  batches: [
    { batch_id: 'SIM-B003', assigned_reactor_id: 'R-6000-03', batch_qty_kg: 6000 },
    { batch_id: 'SIM-B011', assigned_reactor_id: 'R-6000-03', batch_qty_kg: 3100 },
    { batch_id: 'SIM-B001', assigned_reactor_id: 'R-6000-01', batch_qty_kg: 6000 },
  ],
  orders: [
    {
      order_no: 'SIM-SO-004',
      split_batches: [
        { batch_index: 1, reactor_id: 'R-6000-03' },
        { batch_index: 2, reactor_id: 'R-6000-02' },
      ],
    },
  ],
});

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// 迁移路径
// ---------------------------------------------------------------------------

test('迁移路径：遗留 JSON 的设备表原样进入 SQLite，不删任何设备', () => {
  const dir = makeIsolatedDir(legacySnapshot());
  const state = readState(dir);

  assert.ok(state, '迁移后应能读到状态');
  assert.deepEqual(
    state.reactors.map((r: any) => r.reactor_id),
    ['R-1300-01', 'R-6000-01', 'R-6000-02', 'R-6000-03'],
    '四台设备都必须保留 —— 后台维护的数据不得被代码改写',
  );
});

test('迁移路径：批次与订单的设备引用保持原样，不被改挂', () => {
  const dir = makeIsolatedDir(legacySnapshot());
  const state = readState(dir);

  assert.equal(state.batches.length, 3, '批次总数不得被静默改动');
  assert.equal(
    state.batches.find((b: any) => b.batch_id === 'SIM-B003').assigned_reactor_id,
    'R-6000-03',
    '批次引用不得被改挂到别的釜',
  );
  assert.deepEqual(
    state.orders[0].split_batches.map((sb: any) => sb.reactor_id),
    ['R-6000-03', 'R-6000-02'],
  );
  assert.equal(state.workshops.find((w: any) => w.id === 'WS-02').reactorCount, 2, '台数不得被改写');
});

// ---------------------------------------------------------------------------
// 读取路径
// ---------------------------------------------------------------------------

test('读取路径：直接写入 SQLite 的设备表在 loadState 时原样返回', () => {
  const dir = makeIsolatedDir();
  writeState(dir, { schemaVersion: 5, reactors: [{ reactor_id: 'R-6000-01' }], batches: [], orders: [], workshops: [] });

  const injected = {
    schemaVersion: 5,
    reactors: [{ reactor_id: 'R-6000-01' }, { reactor_id: 'R-ADMIN-NEW', workshop_id: 'WS-02' }],
    batches: [{ batch_id: 'B1', assigned_reactor_id: 'R-ADMIN-NEW' }],
    orders: [],
    workshops: [],
  };

  const raw = new DatabaseSync(path.join(dir, 'data', 'aps.sqlite'));
  raw.prepare('UPDATE aps_state SET payload_json = ? WHERE id = 1').run(JSON.stringify(injected));
  raw.close();

  const state = readState(dir);
  assert.deepEqual(
    state.reactors.map((r: any) => r.reactor_id),
    ['R-6000-01', 'R-ADMIN-NEW'],
    '读取侧不得删除设备',
  );
  assert.equal(state.batches[0].assigned_reactor_id, 'R-ADMIN-NEW', '读取侧不得改挂批次');
});

// ---------------------------------------------------------------------------
// 写入路径
// ---------------------------------------------------------------------------

test('写入路径：客户端提交的设备表原样落盘，不被清洗', () => {
  const dir = makeIsolatedDir();

  const submitted = {
    schemaVersion: 5,
    reactors: [
      { reactor_id: 'R-6000-01', workshop_id: 'WS-01' },
      { reactor_id: 'R-6000-03', workshop_id: 'WS-02' },
    ],
    workshops: [{ id: 'WS-02', reactorCount: 1 }],
    batches: [{ batch_id: 'X', assigned_reactor_id: 'R-6000-03' }],
    orders: [{ order_no: 'O1', split_batches: [{ reactor_id: 'R-6000-03' }] }],
  };
  writeState(dir, submitted);

  const state = readState(dir);
  assert.deepEqual(state.reactors.map((r: any) => r.reactor_id), ['R-6000-01', 'R-6000-03']);
  assert.equal(state.batches[0].assigned_reactor_id, 'R-6000-03');
  assert.equal(state.orders[0].split_batches[0].reactor_id, 'R-6000-03');
});

test('写入路径：后台维护的最小投料量原样保留，不被代码覆盖', () => {
  const dir = makeIsolatedDir();
  writeState(dir, {
    schemaVersion: 5,
    reactors: [{ reactor_id: 'R-6000-01', min_kg: 1234, max_kg: 6000 }],
    batches: [],
    orders: [],
    workshops: [],
  });

  const state = readState(dir);
  assert.equal(state.reactors[0].min_kg, 1234, '后台维护的 min_kg 必须原样保留');
  assert.equal(state.reactors[0].max_kg, 6000);
});

test('写入路径：管理员可删除设备，持久化层不得把它加回来', () => {
  const dir = makeIsolatedDir(legacySnapshot());
  // 先迁移一次，再模拟管理员删掉第四台
  const migrated = readState(dir);
  writeState(dir, { ...migrated, reactors: migrated.reactors.slice(0, 3) });

  const state = readState(dir);
  assert.deepEqual(
    state.reactors.map((r: any) => r.reactor_id),
    ['R-1300-01', 'R-6000-01', 'R-6000-02'],
    '删除后的设备表必须被尊重',
  );
});

// ---------------------------------------------------------------------------
// 幂等与元数据
// ---------------------------------------------------------------------------

test('幂等：重复读取结果稳定，不产生额外改写', () => {
  const dir = makeIsolatedDir();
  writeState(dir, {
    schemaVersion: 5,
    reactors: [{ reactor_id: 'R-6000-01', workshop_id: 'WS-01', min_kg: 2000, max_kg: 6000 }],
    workshops: [{ id: 'WS-01', reactorCount: 1 }],
    batches: [{ batch_id: 'B1', assigned_reactor_id: 'R-6000-01' }],
    orders: [],
  });

  const first = readState(dir);
  const second = readState(dir);
  assert.deepEqual(first, second, '重复读取结果必须稳定');
});

test('schema_version 列取自载荷，不再写死为 4', () => {
  const dir = makeIsolatedDir();
  writeState(dir, {
    schemaVersion: 5,
    reactors: [{ reactor_id: 'R-6000-01' }],
    batches: [],
    orders: [],
    workshops: [],
  });

  const raw = new DatabaseSync(path.join(dir, 'data', 'aps.sqlite'));
  const row = raw.prepare('SELECT schema_version FROM aps_state WHERE id = 1').get() as { schema_version: number };
  raw.close();

  assert.equal(row.schema_version, 5);
});

test('空 SQLite 且无遗留快照时 loadState 返回 null', () => {
  const dir = makeIsolatedDir();
  assert.equal(readState(dir), null);
});
