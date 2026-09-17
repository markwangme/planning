/**
 * NOVOLYTE ADVANCED PLANNING & SCHEDULING (APS) - REAL-TIME DATABASE SERVICE
 * 反应釜智能排产系统持久化数据库引擎
 * 
 * 核心特性：
 * 1. 自动持久化：后台与界面所做的一切修改（系统配置、设备、型号、工序工时、排班、定员、工单、批次状态）立即存库。
 * 2. 刷新不丢失：页面重载/F5刷新自动从本地与云端数据库即时装载最新数据。
 * 3. 数据库管理：支持导出 JSON 备份、导入恢复、重置为出厂标准基准数据。
 */

import {
  APS_SCHEMA_VERSION,
  resolveWorkshopId,
} from '../shared/apsMasterData';
import {
  Reactor,
  ProductionOrder,
  BatchTask,
  ReactorRestriction,
  WashMatrixRule,
  ProductModelDef,
  ProcessNodeDef,
  ShiftDef,
  StaffingConfig,
  SystemConfig,
  UserRole,
  UserAccount,
  WashRuleCardDef,
  WorkshopDef,
  WORKSHOP_DEFINITIONS,
  LanguageCode,
  WorkshopId,
  PROCESS_NODES
} from '../types/aps';
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
  DEFAULT_WASH_RULE_CARDS
} from './apsEngine';

export interface ApsDatabase {
  schemaVersion: number;
  lastSavedAt: string;
  systemConfig: SystemConfig;
  workshops: WorkshopDef[];
  userAccounts: UserAccount[];
  washRuleCards: WashRuleCardDef[];
  reactors: Reactor[];
  orders: ProductionOrder[];
  batches: BatchTask[];
  restrictions: ReactorRestriction[];
  washRules: WashMatrixRule[];
  productModels: ProductModelDef[];
  processNodes: ProcessNodeDef[];
  shifts: ShiftDef[];
  staffingConfig: StaffingConfig;
  unassignedIssues: string[];
  publishedVersion: string;
  draftVersion: string;
  isDraftActive: boolean;
  currentRole: UserRole;
  authenticatedRoles: UserRole[];
  language: LanguageCode;
  currentWorkshopId: WorkshopId;
}

const DB_STORAGE_KEY = 'novolyte_aps_production_db_v2';
const DB_SCHEMA_VERSION = APS_SCHEMA_VERSION;

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined' || !('localStorage' in window)) return null;
  try {
    return window.localStorage;
  } catch {
    // Browser privacy mode or a restrictive storage policy can throw here.
    return null;
  }
}

// 说明：此处曾有一版「幻影设备清理」迁移（强制删除 R-6000-03 并改挂批次）。
// 口径明确为「釜台数依据后台维护的信息为准」后，该迁移已移除 ——
// 管理员新增或保留的设备必须原样尊重，不得被代码静默删除。
// 设备与批次的引用一致性问题改由非破坏性的 findOrphanReactorIds() 检测上报。

/**
 * 获取系统标准出厂基准数据库
 */
export function getDefaultDatabase(): ApsDatabase {
  return {
    schemaVersion: DB_SCHEMA_VERSION,
    lastSavedAt: new Date().toISOString(),
    systemConfig: DEFAULT_SYSTEM_CONFIG,
    workshops: WORKSHOP_DEFINITIONS,
    userAccounts: DEFAULT_USER_ACCOUNTS,
    washRuleCards: DEFAULT_WASH_RULE_CARDS,
    reactors: INITIAL_REACTORS,
    orders: INITIAL_ORDERS_V2,
    batches: INITIAL_BATCH_TASKS_V2,
    restrictions: INITIAL_RESTRICTIONS,
    washRules: INITIAL_WASH_RULES,
    productModels: INITIAL_PRODUCT_MODELS,
    processNodes: PROCESS_NODES,
    shifts: DEFAULT_SHIFTS,
    staffingConfig: DEFAULT_STAFFING_CONFIG,
    unassignedIssues: [
      '【BATCH_BELOW_MIN】SIM-SO-004 尾批 200 kg 低于 1.3t 釜最小稳定投料量 (300kg)，已列为待处理余量，未自动超产'
    ],
    publishedVersion: 'V12',
    draftVersion: 'V13',
    isDraftActive: false,
    currentRole: 'VIEWER',
    authenticatedRoles: ['VIEWER'],
    language: 'zh',
    currentWorkshopId: 'ALL'
  };
}

/**
 * 从持久化存储中读取数据库
 */
export function loadDatabase(): ApsDatabase {
  const storage = getBrowserStorage();
  if (!storage) return getDefaultDatabase();
  try {
    const raw = storage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      const defaultDb = getDefaultDatabase();
      saveDatabaseToStorage(defaultDb);
      return defaultDb;
    }

    const parsed = JSON.parse(raw);
    // 字段安全性合并补全，防止新字段因旧缓存导致 undefined
    const defaultDb = getDefaultDatabase();

    // 确保设备与批次具有合法的 workshop_id（旧版本缓存可能没有 workshop_id 属性导致筛选为空）
    const parsedReactors = Array.isArray(parsed.reactors) && parsed.reactors.length > 0
      ? parsed.reactors.map((r: any) => ({
          ...r,
          workshop_id: r.workshop_id || (resolveWorkshopId(r.reactor_id))
        }))
      : defaultDb.reactors;

    let parsedBatches = Array.isArray(parsed.batches) && parsed.batches.length > 0
      ? parsed.batches.map((b: any) => ({
          ...b,
          workshop_id: b.workshop_id || (resolveWorkshopId(b.assigned_reactor_id))
        }))
      : defaultDb.batches;

    // One-time repair for the shipped demo snapshot from the previous schema:
    // SIM-SO-002 is 7.3t and its second batch was incorrectly persisted as 6t.
    // Keep this migration narrow so user-maintained production data is not
    // silently rebalanced during startup.
    parsedBatches = parsed.schemaVersion < 4 ? parsedBatches.map((batch: any) =>
      batch.batch_id === 'SIM-B004-R3' && batch.order_no === 'SIM-SO-002'
        ? { ...batch, batch_qty_kg: 1300, assigned_reactor_id: 'R-1300-01', workshop_id: 'WS-01' }
        : batch
    ) : parsedBatches;

    const merged: ApsDatabase = {
      ...defaultDb,
      ...parsed,
      systemConfig: { ...defaultDb.systemConfig, ...(parsed.systemConfig || {}) },
      workshops: Array.isArray(parsed.workshops) && parsed.workshops.length > 0 ? parsed.workshops : defaultDb.workshops,
      userAccounts: Array.isArray(parsed.userAccounts) && parsed.userAccounts.length > 0 ? parsed.userAccounts : defaultDb.userAccounts,
      washRuleCards: Array.isArray(parsed.washRuleCards) && parsed.washRuleCards.length > 0 ? parsed.washRuleCards : defaultDb.washRuleCards,
      staffingConfig: { ...defaultDb.staffingConfig, ...(parsed.staffingConfig || {}) },
      reactors: parsedReactors,
      orders: Array.isArray(parsed.orders) && parsed.orders.length > 0 ? parsed.orders : defaultDb.orders,
      batches: parsedBatches,
      restrictions: Array.isArray(parsed.restrictions) ? parsed.restrictions : defaultDb.restrictions,
      washRules: Array.isArray(parsed.washRules) ? parsed.washRules : defaultDb.washRules,
      productModels: Array.isArray(parsed.productModels) && parsed.productModels.length > 0 ? parsed.productModels : defaultDb.productModels,
      processNodes: Array.isArray(parsed.processNodes) && parsed.processNodes.length > 0 ? parsed.processNodes : defaultDb.processNodes,
      shifts: Array.isArray(parsed.shifts) && parsed.shifts.length > 0 ? parsed.shifts : defaultDb.shifts,
      authenticatedRoles: Array.isArray(parsed.authenticatedRoles) && parsed.authenticatedRoles.length > 0 ? parsed.authenticatedRoles : ['VIEWER']
    };

    return merged;
  } catch (err) {
    console.error('Failed to load database from localStorage, initializing defaults:', err);
    const defaultDb = getDefaultDatabase();
    saveDatabaseToStorage(defaultDb);
    return defaultDb;
  }
}

/**
 * 将数据库即时写入本地持久化存储
 */
export function saveDatabaseToStorage(db: ApsDatabase): boolean {
  const storage = getBrowserStorage();
  if (!storage) return false;
  try {
    const updatedDb: ApsDatabase = {
      ...db,
      schemaVersion: DB_SCHEMA_VERSION,
      lastSavedAt: new Date().toISOString()
    };
    storage.setItem(DB_STORAGE_KEY, JSON.stringify(updatedDb));

    // 异步尝试同步至服务端 (静默同步)
    syncDatabaseToServer(updatedDb).catch(() => {});
    return true;
  } catch (err) {
    console.error('Failed to save database to localStorage:', err);
    return false;
  }
}

/**
 * 异步同步数据至后台 API
 */
export async function syncDatabaseToServer(db: ApsDatabase): Promise<boolean> {
  try {
    const res = await fetch('/api/database/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db)
    });
    return res.ok;
  } catch {
    // 离线或开发模式下允许静默降级
    return false;
  }
}

/**
 * 从服务器加载数据库备份
 */
export async function fetchDatabaseFromServer(): Promise<ApsDatabase | null> {
  try {
    const res = await fetch('/api/database/load');
    if (res.ok) {
      const data = await res.json();
      if (data && data.reactors) {
        return data as ApsDatabase;
      }
    }
  } catch (err) {
    console.warn('Server database load fallback to local:', err);
  }
  return null;
}

/**
 * 重置数据库为出厂标准基准
 */
export function resetDatabaseToDefault(): ApsDatabase {
  const defaultDb = getDefaultDatabase();
  const storage = getBrowserStorage();
  if (storage) {
    try {
      storage.setItem(DB_STORAGE_KEY, JSON.stringify(defaultDb));
    } catch {
      // The server-side reset below remains authoritative when browser storage is unavailable.
    }
  }
  try {
    fetch('/api/database/reset', { method: 'POST' }).catch(() => {});
  } catch {}
  return defaultDb;
}

/**
 * 导出数据库为可下载的 JSON 备份文件
 */
export function exportDatabaseBackup(db: ApsDatabase) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
  const downloadAnchor = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `novolyte_aps_db_backup_${timestamp}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * 导入并验证 JSON 数据库备份
 */
export function importDatabaseBackup(jsonString: string): { success: boolean; data?: ApsDatabase; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.reactors || !parsed.productModels || !parsed.processNodes) {
      return { success: false, error: 'JSON 文件缺少必要的反应釜、产品型号或工序数据结构' };
    }
    const defaultDb = getDefaultDatabase();
    const importedDb: ApsDatabase = {
      ...defaultDb,
      ...parsed,
      schemaVersion: DB_SCHEMA_VERSION,
      lastSavedAt: new Date().toISOString()
    };
    saveDatabaseToStorage(importedDb);
    return { success: true, data: importedDb };
  } catch (e: any) {
    return { success: false, error: e.message || 'JSON 解析失败，请检查文件格式' };
  }
}
