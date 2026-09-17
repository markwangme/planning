/**
 * 视图渲染冒烟测试
 *
 * 背景：本项目原先未安装 `@types/react`，`useMemo` / `useState` 一律推断为 `any`，
 * 编译期完全无法发现「组件引用了字典里不存在的翻译键」这类缺陷。
 * 真实事故：点击「甘特图工时泳道」时 `t.gantt.kpiTons(...)` 抛
 * `TypeError`，且组件树没有 ErrorBoundary，导致整页白屏。
 *
 * 类型声明补上后编译期能拦住翻译键问题，但**渲染期异常**仍需运行期兜底
 * （例如对 undefined 取属性、数组越界、日期解析失败等）。
 * 因此这里用 `react-dom/server` 把每个顶层视图真渲染一遍：
 * 只要有一个视图在渲染期抛错，测试立即失败，不必等用户点到那一页才发现。
 *
 * 新增顶层视图时，请一并加入 CASES。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

import { GanttWorkstation } from './components/GanttWorkstation';
import { OrderManagementView } from './components/OrderManagementView';
import { CtpSimulationModal } from './components/CtpSimulationModal';
import { ShiftReportingView } from './components/ShiftReportingView';
import { AdminConfigView } from './components/AdminConfigView';
import { PlanDeviationMatrix } from './components/PlanDeviationMatrix';
import { IndustrialGanttBoard } from './components/IndustrialGanttBoard';
import App from './App';

import {
  INITIAL_REACTORS,
  INITIAL_BATCH_TASKS_V2,
  INITIAL_ORDERS_V2,
  INITIAL_RESTRICTIONS,
  INITIAL_WASH_RULES,
  INITIAL_PRODUCT_MODELS,
  DEFAULT_SHIFTS,
  DEFAULT_SYSTEM_CONFIG,
  DEFAULT_STAFFING_CONFIG,
} from './utils/apsEngine';
import { WORKSHOP_DEFINITIONS, PROCESS_NODES } from './types/aps';

const noop = () => {};
const okResult = () => ({ success: true, message: 'ok' });

const shared = {
  reactors: INITIAL_REACTORS,
  batches: INITIAL_BATCH_TASKS_V2,
  orders: INITIAL_ORDERS_V2,
  restrictions: INITIAL_RESTRICTIONS,
  washRules: INITIAL_WASH_RULES,
  shifts: DEFAULT_SHIFTS,
  workshops: WORKSHOP_DEFINITIONS,
  lang: 'zh' as const,
};

/** 每个视图一组最小可用 props，取自 apsEngine 的出厂种子数据 */
const CASES: { name: string; Component: React.ComponentType<never>; props: unknown }[] = [
  {
    name: 'App（整棵应用树，含 ErrorBoundary 包裹）',
    Component: App as unknown as React.ComponentType<never>,
    props: {},
  },
  {
    name: 'GanttWorkstation（工业标准看板为默认子标签）',
    Component: GanttWorkstation as unknown as React.ComponentType<never>,
    props: {
      ...shared,
      onAutoSchedule: noop,
      onUpdateBatchReactor: okResult,
      onSelectBatch: noop,
      unassignedIssues: [],
      currentWorkshopId: 'ALL',
      onWorkshopChange: noop,
      onUpdateBatches: noop,
      onUpdateShifts: noop,
    },
  },
  {
    name: 'IndustrialGanttBoard（工业标准看板）',
    Component: IndustrialGanttBoard as unknown as React.ComponentType<never>,
    props: {
      ...shared,
      currentWorkshopId: 'ALL',
      onWorkshopChange: noop,
      onSelectBatch: noop,
      onAutoSchedule: noop,
      onOpenDeviationModal: noop,
      onOpenBatchModal: noop,
      onUpdateShifts: noop,
    },
  },
  {
    name: 'PlanDeviationMatrix（计划 vs 实际偏差清单）',
    Component: PlanDeviationMatrix as unknown as React.ComponentType<never>,
    props: {
      batches: INITIAL_BATCH_TASKS_V2,
      workshops: WORKSHOP_DEFINITIONS,
      onOpenReasonModal: noop,
      onSimulateActuals: noop,
    },
  },
  {
    name: 'OrderManagementView（订单台账与向下分批演算）',
    Component: OrderManagementView as unknown as React.ComponentType<never>,
    props: {
      orders: INITIAL_ORDERS_V2,
      reactors: INITIAL_REACTORS,
      restrictions: INITIAL_RESTRICTIONS,
      washRules: INITIAL_WASH_RULES,
      onAddOrder: noop,
      onScheduleAllOrders: noop,
    },
  },
  {
    name: 'CtpSimulationModal（订单可承诺量推演）',
    Component: CtpSimulationModal as unknown as React.ComponentType<never>,
    props: {
      isOpen: true,
      onClose: noop,
      lang: 'zh',
      orders: INITIAL_ORDERS_V2,
      batches: INITIAL_BATCH_TASKS_V2,
      reactors: INITIAL_REACTORS,
      shifts: DEFAULT_SHIFTS,
      restrictions: INITIAL_RESTRICTIONS,
      washRules: INITIAL_WASH_RULES,
      productModels: INITIAL_PRODUCT_MODELS,
      onAdoptOrder: noop,
    },
  },
  {
    name: 'ShiftReportingView（车间工序报工）',
    Component: ShiftReportingView as unknown as React.ComponentType<never>,
    props: {
      reactors: INITIAL_REACTORS,
      batches: INITIAL_BATCH_TASKS_V2,
      lang: 'zh',
      onReportProgress: okResult,
    },
  },
  {
    name: 'AdminConfigView（后台维护）',
    Component: AdminConfigView as unknown as React.ComponentType<never>,
    props: {
      currentRole: 'ADMIN',
      onRoleChange: noop,
      systemConfig: DEFAULT_SYSTEM_CONFIG,
      onUpdateSystemConfig: noop,
      reactors: INITIAL_REACTORS,
      onUpdateReactors: noop,
      workshops: WORKSHOP_DEFINITIONS,
      onUpdateWorkshops: noop,
      productModels: INITIAL_PRODUCT_MODELS,
      onUpdateProductModels: noop,
      processNodes: PROCESS_NODES,
      onUpdateProcessNodes: noop,
      shifts: DEFAULT_SHIFTS,
      onUpdateShifts: noop,
      staffingConfig: DEFAULT_STAFFING_CONFIG,
      onUpdateStaffingConfig: noop,
      washRules: INITIAL_WASH_RULES,
      onUpdateWashRules: noop,
      onTriggerAutoSchedule: noop,
      onNavigateToGantt: noop,
      batches: INITIAL_BATCH_TASKS_V2,
    },
  },
];

for (const { name, Component, props } of CASES) {
  test('渲染期不抛异常：' + name, () => {
    const html = renderToString(React.createElement(Component, props as never));
    assert.ok(typeof html === 'string', name + ' 未产出 HTML');
    assert.ok(html.length > 200, name + ' 产出内容过短（' + html.length + ' 字符），疑似渲染成空页');
    // NaN 是最典型的「字段名写错取到 undefined 再参与运算」信号，必须拦住。
    // 注意：`{undefined}` 在 JSX 中渲染为空串而非 "undefined"，
    // 因此纯粹的字段拼写错误由 tsc 负责（装上 @types/react 后已可报 TS2339），
    // 下面这条只用于兜住模板字符串里 `${undefined}` 这类泄漏。
    assert.ok(!/>NaN</.test(html), name + ' 渲染结果含 NaN（多为字段名写错取到 undefined）');
    assert.ok(!/>undefined</.test(html), name + ' 渲染结果含裸 undefined（模板字符串泄漏）');
  });
}
