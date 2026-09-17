import ExcelJS from 'exceljs';
import type { BatchTask, Reactor, ShiftDef } from '../types/aps';
import { isMinuteInShiftBreak, isMinuteInWorkingTime } from './apsEngine';

type TimelineColumn = { label: string; startMin: number; widthMinutes: number; isNewDay?: boolean };

const COLORS = {
  navy: '1F4E78',
  header: 'D9EAF7',
  plan: 'FFFFFF',
  actual: 'D1FAE5',
  break: '64748B',
  border: '9CA3AF',
  wash: '00B050',
  pending: 'CBD5E1'
};

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } }
  };
}

function styleHeader(cell: ExcelJS.Cell, fill = COLORS.header) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '1F2937' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applyBorder(cell);
}

function styleBody(cell: ExcelJS.Cell, fill = COLORS.plan) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  cell.font = { name: 'Arial', size: 9, color: { argb: '1F2937' } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  applyBorder(cell);
}

function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  return workbook.xlsx.writeBuffer().then((buffer) => {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  });
}

function markTimelineCells(
  sheet: ExcelJS.Worksheet,
  row: number,
  batches: BatchTask[],
  columns: TimelineColumn[],
  timelineStartMin: number,
  fill: string
) {
  columns.forEach((column, index) => {
    const cell = sheet.getCell(row, index + 5);
    const start = column.startMin;
    const end = start + column.widthMinutes;
    const batch = batches.find((item) => {
      const batchStart = new Date(item.plan_start_time.replace(/-/g, '/')).getTime() / 60000;
      const batchEnd = new Date(item.plan_end_time.replace(/-/g, '/')).getTime() / 60000;
      return batchEnd > start && batchStart < end;
    });
    styleBody(cell, batch ? fill : COLORS.plan);
    if (batch) {
      cell.value = `${batch.batch_id}\n${batch.batch_qty_kg >= 1000 ? `${batch.batch_qty_kg / 1000}T` : `${batch.batch_qty_kg}kg`}`;
      cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: fill === COLORS.actual ? '065F46' : '1E3A8A' } };
    }
  });
}

export async function exportIndustrialGanttExcel(params: {
  reactors: Reactor[];
  batches: BatchTask[];
  shifts: ShiftDef[];
  baseDateStr: string;
  daysCount: number;
  filename?: string;
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('工业标准看板');
  sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 4, xSplit: 4 }];
  const base = new Date(`${params.baseDateStr}T00:00:00`).getTime() / 60000;
  const slotMinutes = [540, 180, 540, 180];
  const slotLabels = ['0:00 - 9:00', '9:00 - 12:00', '12:00 - 21:00', '21:00 - 24:00'];
  const columns: TimelineColumn[] = [];
  for (let day = 0; day < params.daysCount; day += 1) {
    let offset = 0;
    slotMinutes.forEach((widthMinutes, slot) => {
      columns.push({ label: slotLabels[slot], startMin: base + day * 1440 + offset, widthMinutes });
      offset += widthMinutes;
    });
  }
  const lastCol = 4 + columns.length;
  sheet.mergeCells(1, 1, 1, lastCol);
  sheet.getCell(1, 1).value = '工业标准看板 · 反应釜月度排程';
  sheet.getCell(1, 1).font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.navy } };
  sheet.getCell(1, 1).alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(1).height = 24;

  ['ITEM', '', '', '', ...columns.map(() => '')].forEach((value, i) => { sheet.getCell(3, i + 1).value = value; });
  sheet.mergeCells(3, 1, 3, 4);
  styleHeader(sheet.getCell(3, 1), 'FDE8E8');
  for (let day = 0; day < params.daysCount; day += 1) {
    const first = 5 + day * 4;
    sheet.mergeCells(3, first, 3, first + 3);
    const date = new Date((base + day * 1440) * 60000);
    const cell = sheet.getCell(3, first);
    cell.value = `${date.getMonth() + 1}/${date.getDate()}`;
    styleHeader(cell);
  }
  ['Reactor', 'Category', 'Type', 'TTL Qty'].forEach((value, i) => { sheet.getCell(4, i + 1).value = value; styleHeader(sheet.getCell(4, i + 1)); });
  columns.forEach((column, i) => {
    const cell = sheet.getCell(4, i + 5);
    cell.value = column.label;
    styleHeader(cell);
    const rest = Array.from({ length: column.widthMinutes }, (_, minute) => column.startMin + minute)
      .every((minute) => !isMinuteInWorkingTime(minute, params.shifts) && !isMinuteInShiftBreak(minute, params.shifts).isBreak);
    if (rest) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.break } };
  });

  let row = 5;
  params.reactors.forEach((reactor) => {
    const reactorBatches = params.batches.filter((batch) => batch.assigned_reactor_id === reactor.reactor_id);
    const planRow = row;
    const actualRow = row + 1;
    [[reactor.reactor_id, reactor.reactor_name, 'Plan', reactorBatches.reduce((sum, batch) => sum + batch.batch_qty_kg, 0) / 1000], [reactor.reactor_id, reactor.reactor_name, 'Actual', reactorBatches.reduce((sum, batch) => sum + (batch.good_filled_kg || 0), 0) / 1000]].forEach((values, index) => {
      values.forEach((value, col) => { const cell = sheet.getCell(row + index, col + 1); cell.value = value; styleBody(cell, index === 1 ? COLORS.actual : COLORS.plan); });
      markTimelineCells(sheet, row + index, reactorBatches, columns, base, index === 1 ? COLORS.actual : COLORS.plan);
    });
    sheet.mergeCells(planRow, 1, actualRow, 1);
    sheet.mergeCells(planRow, 2, actualRow, 2);
    row += 2;
  });
  sheet.getColumn(1).width = 14;
  sheet.getColumn(2).width = 24;
  sheet.getColumn(3).width = 10;
  sheet.getColumn(4).width = 12;
  columns.forEach((_, i) => { sheet.getColumn(i + 5).width = 14; });
  await downloadWorkbook(workbook, params.filename || `industrial-gantt-${params.baseDateStr}.xlsx`);
}

export async function exportGanttWorkstationExcel(params: {
  reactors: Reactor[];
  batches: BatchTask[];
  columns: TimelineColumn[];
  timelineStartMin: number;
  timelineEndMin: number;
  filename?: string;
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('甘特图工时泳道');
  sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 2, xSplit: 3 }];
  const lastCol = params.columns.length + 3;
  sheet.mergeCells(1, 1, 1, lastCol);
  sheet.getCell(1, 1).value = '甘特图工时泳道 · 反应釜排产';
  sheet.getCell(1, 1).font = { name: 'Arial', size: 14, bold: true, color: { argb: COLORS.navy } };
  ['反应釜', '状态', '数量'].forEach((value, i) => { sheet.getCell(2, i + 1).value = value; styleHeader(sheet.getCell(2, i + 1)); });
  params.columns.forEach((column, i) => { sheet.getCell(2, i + 4).value = column.label; styleHeader(sheet.getCell(2, i + 4)); });
  let row = 3;
  params.reactors.forEach((reactor) => {
    const reactorBatches = params.batches.filter((batch) => batch.assigned_reactor_id === reactor.reactor_id);
    const planRow = row;
    const actualRow = row + 1;
    [[reactor.reactor_id, '计划', reactorBatches.reduce((sum, batch) => sum + batch.batch_qty_kg, 0) / 1000], [reactor.reactor_id, '实际', reactorBatches.reduce((sum, batch) => sum + (batch.good_filled_kg || 0), 0) / 1000]].forEach((values, index) => {
      values.forEach((value, col) => { const cell = sheet.getCell(row + index, col + 1); cell.value = value; styleBody(cell, index === 1 ? COLORS.actual : COLORS.plan); });
      markTimelineCells(sheet, row + index, reactorBatches, params.columns, params.timelineStartMin, index === 1 ? COLORS.actual : COLORS.plan);
    });
    sheet.mergeCells(planRow, 1, actualRow, 1);
    row += 2;
  });
  sheet.getColumn(1).width = 18;
  sheet.getColumn(2).width = 10;
  sheet.getColumn(3).width = 12;
  params.columns.forEach((_, i) => { sheet.getColumn(i + 4).width = 14; });
  await downloadWorkbook(workbook, params.filename || 'gantt-workstation.xlsx');
}
