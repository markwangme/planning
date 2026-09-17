import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import {
  APS_SCHEMA_VERSION,
} from "../src/shared/apsMasterData";

export interface ApsEventRecord {
  event_id: number;
  client_event_id: string;
  payload_json: string;
  created_at: string;
}

export interface DurableApsDatabase {
  loadState(): unknown | null;
  saveState(state: unknown): void;
  resetState(): void;
  recordEvent(clientEventId: string, payload: unknown): boolean;
  /** 按事件ID倒序列出已记账事件（用于审计与对账） */
  listEvents(limit?: number): ApsEventRecord[];
  /**
   * 汇总各批次的累计合格灌装量 (kg)。
   * 口径：仅统计 operation_code === 'FILL' 的事件，其 filled_good_kg 视为**增量**逐条累加；
   * 由于 client_event_id 有唯一约束，重复提交不会重复计量。
   */
  sumFilledGoodKgByBatch(): Record<string, number>;
  createBackupIfNeeded(): void;
  close(): void;
  dbPath: string;
}

export function createDurableApsDatabase(baseDir = process.cwd()): DurableApsDatabase {
  const dataDir = path.join(baseDir, "data");
  const backupDir = path.join(dataDir, "backups");
  const dbPath = path.join(dataDir, "aps.sqlite");
  const legacyJsonPath = path.join(dataDir, "aps-server-database.json");
  fs.mkdirSync(backupDir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS aps_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS aps_event_log (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_event_id TEXT NOT NULL UNIQUE,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_aps_event_log_created_at ON aps_event_log(created_at);
  `);

  let lastBackupDate = "";

  const createBackupIfNeeded = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (today === lastBackupDate) return;
    try {
      db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
      const backupPath = path.join(backupDir, `aps-${today}.sqlite`);
      fs.copyFileSync(dbPath, backupPath);
      lastBackupDate = today;

      const backups = fs.readdirSync(backupDir)
        .filter((name) => /^aps-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name))
        .sort()
        .reverse();
      for (const oldBackup of backups.slice(30)) {
        fs.rmSync(path.join(backupDir, oldBackup), { force: true });
      }
    } catch (error) {
      console.error("APS database backup failed:", error);
    }
  };

  // 说明：持久化边界不再做「幻影设备清理」。
  // 口径明确为「釜台数依据后台维护的信息为准」后，服务端不得删除或改挂任何设备记录 ——
  // 那会破坏管理员通过后台维护的真实数据。设备与批次引用不一致的问题
  // 交由非破坏性的 findOrphanReactorIds() 在接口层检测上报。

  const api: DurableApsDatabase = {
    dbPath,
    loadState() {
      const row = db.prepare("SELECT payload_json FROM aps_state WHERE id = 1").get() as { payload_json?: string } | undefined;
      if (!row?.payload_json) return null;
      try {
        return JSON.parse(row.payload_json);
      } catch (error) {
        throw new Error(`APS database state is corrupted: ${String(error)}`);
      }
    },
    saveState(state) {
      const payload = JSON.stringify(state);
      const now = new Date().toISOString();
      const schemaVersion = Number((state as { schemaVersion?: unknown } | null)?.schemaVersion);
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.prepare(`
          INSERT INTO aps_state (id, schema_version, payload_json, updated_at)
          VALUES (1, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            schema_version = excluded.schema_version,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        `).run(
          Number.isFinite(schemaVersion) && schemaVersion > 0 ? schemaVersion : APS_SCHEMA_VERSION,
          payload,
          now,
        );
        db.exec("COMMIT;");
        createBackupIfNeeded();
      } catch (error) {
        db.exec("ROLLBACK;");
        throw error;
      }
    },
    resetState() {
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.prepare("DELETE FROM aps_state WHERE id = 1").run();
        db.exec("COMMIT;");
        createBackupIfNeeded();
      } catch (error) {
        db.exec("ROLLBACK;");
        throw error;
      }
    },
    recordEvent(clientEventId, payload) {
      const result = db.prepare(`
        INSERT INTO aps_event_log (client_event_id, payload_json, created_at)
        VALUES (?, ?, ?)
        ON CONFLICT(client_event_id) DO NOTHING
      `).run(clientEventId, JSON.stringify(payload), new Date().toISOString());
      return Number(result.changes) === 1;
    },
    createBackupIfNeeded,
    listEvents(limit = 200) {
      return db
        .prepare(
          "SELECT event_id, client_event_id, payload_json, created_at FROM aps_event_log ORDER BY event_id DESC LIMIT ?",
        )
        .all(limit) as unknown as ApsEventRecord[];
    },
    sumFilledGoodKgByBatch() {
      const rows = db.prepare("SELECT payload_json FROM aps_event_log").all() as unknown as {
        payload_json: string;
      }[];
      const totals: Record<string, number> = {};
      for (const row of rows) {
        let payload: Record<string, unknown> | null = null;
        try {
          payload = JSON.parse(row.payload_json) as Record<string, unknown>;
        } catch {
          continue; // 损坏的历史行跳过，不影响其余对账
        }
        if (!payload || payload.operation_code !== "FILL") continue;
        const batchNo = payload.batch_no;
        const kg = Number(payload.filled_good_kg);
        if (typeof batchNo !== "string" || batchNo.length === 0) continue;
        if (!Number.isFinite(kg) || kg <= 0) continue;
        totals[batchNo] = Number(((totals[batchNo] ?? 0) + kg).toFixed(3));
      }
      return totals;
    },
    close() {
      db.close();
    }
  };

  // Upgrade the previous JSON snapshot exactly once when SQLite is empty.
  // The legacy file is retained as an additional recovery copy.
  if (!api.loadState() && fs.existsSync(legacyJsonPath)) {
    try {
      const legacyState = JSON.parse(fs.readFileSync(legacyJsonPath, "utf8"));
      api.saveState(legacyState);
      console.log(`Migrated legacy APS JSON snapshot to SQLite: ${dbPath}`);
    } catch (error) {
      console.error("APS legacy JSON migration failed; starting with empty SQLite state:", error);
    }
  }

  createBackupIfNeeded();
  return api;
}
