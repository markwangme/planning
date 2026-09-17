import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDailyBreakMinutes,
  getShiftBreakWindows,
  isMinuteInShiftBreak,
  isMinuteInWorkingTime,
  moveToNextActiveShiftStart,
} from './apsEngine';
import type { ShiftDef } from '../types/aps';

const dayShift: ShiftDef = {
  id: 'TEST-DAY',
  name: '测试白班',
  code: 'DAY',
  startTime: '08:00',
  endTime: '20:00',
  breakMinutes: 90,
  breakStartTime: '12:00',
  breakName: '兼容字段',
  breaks: [
    { id: 'LUNCH', startTime: '12:00', durationMinutes: 60, name: '午餐' },
    { id: 'TEA', startTime: '16:00', durationMinutes: 30, name: '下午茶' },
  ],
  headcount: 10,
  supervisorName: '测试主管',
  isActive: true,
};

test('一个班次支持多个休息时段并分别返回时间窗', () => {
  assert.deepEqual(getShiftBreakWindows(dayShift), [
    { startMin: 720, endMin: 780, breakMinutes: 60, breakName: '午餐' },
    { startMin: 960, endMin: 990, breakMinutes: 30, breakName: '下午茶' },
  ]);
  assert.equal(getDailyBreakMinutes([dayShift]), 90);
});

test('多个休息时段都会阻断排程开工时间', () => {
  const lunch = new Date(2026, 0, 1, 12, 30).getTime() / 60000;
  const tea = new Date(2026, 0, 1, 16, 15).getTime() / 60000;
  const production = new Date(2026, 0, 1, 15, 30).getTime() / 60000;
  assert.equal(isMinuteInShiftBreak(lunch, [dayShift]).breakName, '午餐');
  assert.equal(isMinuteInShiftBreak(tea, [dayShift]).breakName, '下午茶');
  assert.equal(isMinuteInWorkingTime(lunch, [dayShift]), false);
  assert.equal(isMinuteInWorkingTime(tea, [dayShift]), false);
  assert.equal(isMinuteInWorkingTime(production, [dayShift]), true);
});

test('旧版单休息字段仍可兼容读取', () => {
  const legacy = { ...dayShift, breaks: undefined, breakMinutes: 45, breakStartTime: '13:00' };
  assert.deepEqual(getShiftBreakWindows(legacy), [
    { startMin: 780, endMin: 825, breakMinutes: 45, breakName: '兼容字段' },
  ]);
});

test('关闭周六周日后，排产时间自动跳过周末并顺延到周一', () => {
  const weekdaysOnly = { ...dayShift, workingDays: [1, 2, 3, 4, 5] };
  const saturday = new Date(2026, 0, 3, 10, 0).getTime() / 60000;
  const sunday = new Date(2026, 0, 4, 10, 0).getTime() / 60000;
  const monday = new Date(2026, 0, 5, 8, 0).getTime() / 60000;
  assert.equal(isMinuteInWorkingTime(saturday, [weekdaysOnly]), false);
  assert.equal(isMinuteInWorkingTime(sunday, [weekdaysOnly]), false);
  assert.equal(moveToNextActiveShiftStart(saturday, [weekdaysOnly]), monday);
});
