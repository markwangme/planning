/**
 * i18n 完整性回归测试
 *
 * 背景（这是一次真实事故的复盘）：
 *   本项目没有安装 `@types/react`，`react` 包也不自带类型声明。
 *   在 `noImplicitAny` 关闭的情况下，`useMemo(...)` 的返回值被推断为 `any`，
 *   于是 `const t = useMemo(() => getTranslations(lang), [lang])` 里的 `t` 也是 `any`。
 *   结果：组件里 `t.gantt.kpiTons(...)` 这类「字典中并不存在的键」完全不会触发类型报错。
 *
 *   实际后果：`kpiTons` / `kpiWashBatches` / `kpiZeroWashBatches` / `breakTooltip`
 *   这四个被当作函数调用的键在字典里根本不存在，运行期抛
 *   `TypeError: t.gantt.kpiTons is not a function`，React 无 ErrorBoundary，
 *   整个页面白屏——即「点击『甘特图工时泳道』后空白」这一缺陷的根因。
 *
 * 因此这里用运行期断言补上缺失的编译期防线。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { i18nDict } from './index';

const LANGS = ['zh', 'en', 'ms'] as const;
type Lang = (typeof LANGS)[number];

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(HERE, '..');

/** 根字典的一级段落名，例如 common / header / gantt / reporting / dashboard */
const SECTIONS = Object.keys(i18nDict.zh);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function resolvePath(obj: unknown, dotted: string): unknown {
  let cur: unknown = obj;
  for (const part of dotted.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

interface Ref {
  file: string;
  line: number;
  dotted: string;
  isCall: boolean;
}

/**
 * 收集源码里 `t.<section>.<...>` 形式的翻译引用。
 *
 * 只认一级段落名属于根字典的引用，这样可以自动排除两类无关写法：
 *   - Header.tsx 里 `const t = { ...拍平后的翻译... }`（`t.tabGantt` 只有一段）
 *   - apsScheduler.ts / GanttChart.tsx 里把 `t` 当任务别名（`t.startHour` 等）
 */
function collectRefs(): Ref[] {
  const refs: Ref[] = [];
  const pattern = new RegExp(
    '\\bt\\.(' + SECTIONS.join('|') + ')((?:\\.[A-Za-z_][A-Za-z0-9_]*)+)\\s*(\\(?)',
    'g',
  );

  for (const file of walk(SRC_DIR)) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const m of line.matchAll(pattern)) {
        refs.push({
          file: path.relative(SRC_DIR, file),
          line: idx + 1,
          dotted: m[1] + m[2],
          isCall: m[3] === '(',
        });
      }
    });
  }
  return refs;
}

function collectKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectKeys(v, prefix ? prefix + '.' + k : k),
  );
}

test('所有组件引用的翻译键，在 zh/en/ms 三种语言中都真实存在', () => {
  const refs = collectRefs();
  assert.ok(refs.length > 0, '没有扫描到任何翻译引用，正则或目录可能已失效');

  const missing: string[] = [];
  for (const lang of LANGS) {
    for (const ref of refs) {
      if (resolvePath(i18nDict[lang], ref.dotted) === undefined) {
        missing.push(
          '[' + lang + '] ' + ref.dotted + (ref.isCall ? '()' : '') +
            '  ← ' + ref.file + ':' + ref.line,
        );
      }
    }
  }

  assert.deepEqual(
    missing,
    [],
    '以下翻译键在组件里被使用、但字典中不存在（运行期会渲染为空，' +
      '若是函数式调用则直接抛错导致白屏）：\n  ' + missing.join('\n  '),
  );
});

test('被当作函数调用的翻译键，在三种语言中都必须真的是函数', () => {
  const callRefs = collectRefs().filter((r) => r.isCall);
  assert.ok(callRefs.length > 0, '没有扫描到函数式翻译调用');

  const broken: string[] = [];
  for (const lang of LANGS) {
    for (const ref of callRefs) {
      const value = resolvePath(i18nDict[lang], ref.dotted);
      if (typeof value !== 'function') {
        broken.push(
          '[' + lang + '] ' + ref.dotted + ' 实际是 ' + typeof value +
            '  ← ' + ref.file + ':' + ref.line,
        );
      }
    }
  }

  assert.deepEqual(
    broken,
    [],
    '以下键被以函数形式调用，但字典里不是函数（会抛 TypeError）：\n  ' + broken.join('\n  '),
  );
});

test('zh/en/ms 三套字典的键集合完全一致', () => {
  const zhKeys = new Set(collectKeys(i18nDict.zh));
  for (const lang of ['en', 'ms'] as const) {
    const set = new Set(collectKeys(i18nDict[lang]));
    const missing = [...zhKeys].filter((k) => !set.has(k)).sort();
    const extra = [...set].filter((k) => !zhKeys.has(k)).sort();
    assert.deepEqual(missing, [], '[' + lang + '] 相对 zh 缺少这些键：' + missing.join(', '));
    assert.deepEqual(extra, [], '[' + lang + '] 相对 zh 多出这些键：' + extra.join(', '));
  }
});

test('同名键在各语言中的类型必须一致（防止一边是字符串、一边是函数）', () => {
  const mismatches: string[] = [];
  for (const key of collectKeys(i18nDict.zh)) {
    const types = LANGS.map((lang) => typeof resolvePath(i18nDict[lang], key));
    if (new Set(types).size > 1) {
      mismatches.push(key + ' → ' + LANGS.map((l, i) => l + ':' + types[i]).join(', '));
    }
  }
  assert.deepEqual(mismatches, [], '以下键在不同语言中类型不一致：\n  ' + mismatches.join('\n  '));
});

test('甘特泳道看板的 KPI 与时间轴标记键均已补齐（本次白屏缺陷的定点回归）', () => {
  // 这四个曾被当作函数调用、却完全不存在，是白屏的直接触发点
  const functionKeys = ['kpiTons', 'kpiZeroWashBatches', 'kpiWashBatches', 'breakTooltip'];
  // 这些曾被引用但缺失，表现为 KPI 卡片标签空白
  const stringKeys = [
    'kpiTotalVolume',
    'kpiShiftLoadRate',
    'kpiZeroWashSaved',
    'kpiCipOccupied',
    'kpiDeviationAnomaly',
    'kpiPendingLoop',
    'kpiViewDeviationMatrix',
    'reactorSwimlaneTitle',
    'todayBadge',
    'shiftOffBadge',
    'currentMarker',
    'freezeMarker',
  ];

  for (const lang of LANGS) {
    const gantt = i18nDict[lang].gantt as unknown as Record<string, unknown>;
    for (const key of functionKeys) {
      assert.equal(typeof gantt[key], 'function', '[' + lang + '] gantt.' + key + ' 应为函数');
    }
    for (const key of stringKeys) {
      assert.equal(typeof gantt[key], 'string', '[' + lang + '] gantt.' + key + ' 应为字符串');
      assert.ok((gantt[key] as string).length > 0, '[' + lang + '] gantt.' + key + ' 不应为空串');
    }
  }

  // 参数占位符必须真的被消费掉
  assert.match(i18nDict.zh.gantt.kpiTons(7), /7/);
  assert.match(i18nDict.en.gantt.kpiTons(7), /7/);
  assert.match(i18nDict.zh.gantt.breakTooltip('午餐', 30), /午餐/);
  assert.match(i18nDict.zh.gantt.breakTooltip('午餐', 30), /30/);
});
