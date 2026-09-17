/**
 * ErrorBoundary 测试
 *
 * 重要前提：**React 的服务端渲染器不实现错误边界**。
 * `getDerivedStateFromError` 只在浏览器端被调用；在 Node 里用
 * `renderToString` / `renderToPipeableStream` 渲染一个会抛错的子树，
 * 异常会直接冒泡（流式 API 走 `onShellError`），边界不会介入。
 *
 * 因此这里不试图用 SSR 去"复现"捕获过程（那是 React 客户端的职责），
 * 而是把本组件自身的逻辑与兜底 UI 逐条测清楚：
 *   1. 无错误时原样透传 children；
 *   2. `getDerivedStateFromError` 会把异常写入 state；
 *   3. 有错误时渲染兜底卡片，且不再渲染 children；
 *   4. 兜底卡片包含三语文案与错误详情；
 *   5. `componentDidUpdate` 仅在 resetKey 变化时清除错误（切换标签页自动恢复）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ErrorBoundary } from './ErrorBoundary';

const CHILD_TEXT = 'CHILD-CONTENT';

function makeChild(): React.ReactElement {
  return React.createElement('div', null, CHILD_TEXT);
}

/** 用指定 props/state 直接驱动组件的 render()，绕开服务端渲染器不支持边界的限制 */
function renderWithState(
  props: Partial<React.ComponentProps<typeof ErrorBoundary>>,
  error: Error | null,
): string {
  const instance = new ErrorBoundary({ children: makeChild(), ...props });
  instance.state = { error };
  return renderToStaticMarkup(instance.render() as React.ReactElement);
}

test('无错误时原样渲染 children', () => {
  const html = renderWithState({}, null);
  assert.ok(html.includes(CHILD_TEXT), '应渲染子内容，实际输出：' + html);
});

test('getDerivedStateFromError 把异常写入 state', () => {
  const err = new Error('boom');
  const next = ErrorBoundary.getDerivedStateFromError(err);
  assert.equal(next.error, err);
});

test('有错误时渲染兜底卡片，且不再渲染 children', () => {
  const html = renderWithState({}, new Error('kpiTons is not a function'));
  assert.ok(!html.includes(CHILD_TEXT), '不应再渲染子内容');
  assert.ok(html.includes('页面渲染出错'), '应显示兜底标题');
  assert.ok(html.includes('重试'), '应显示重试按钮');
  assert.ok(html.includes('重新加载页面'), '应显示重新加载按钮');
  assert.ok(
    html.includes('kpiTons is not a function'),
    '应把原始异常信息展示出来，便于定位',
  );
});

test('兜底卡片按 lang 输出对应语言', () => {
  const zh = renderWithState({ lang: 'zh' }, new Error('x'));
  const en = renderWithState({ lang: 'en' }, new Error('x'));
  const ms = renderWithState({ lang: 'ms' }, new Error('x'));

  assert.ok(zh.includes('页面渲染出错'));
  assert.ok(en.includes('Page failed to render'));
  assert.ok(ms.includes('Halaman gagal dipaparkan'));

  // 三语兜底文案都不应出现未替换的占位或空串
  for (const [label, html] of [
    ['zh', zh],
    ['en', en],
    ['ms', ms],
  ] as const) {
    assert.ok(!html.includes('undefined'), label + ' 兜底文案含 undefined');
    assert.ok(html.length > 300, label + ' 兜底卡片内容过短');
  }
});

test('传入 label 时兜底卡片会标出出错视图', () => {
  const html = renderWithState({ label: '甘特图工时泳道' }, new Error('x'));
  assert.ok(html.includes('甘特图工时泳道'), '应标出出错视图名');
});

test('resetKey 变化时清除错误，未变化时保留', () => {
  const probe = new ProbeBoundary({ children: makeChild(), resetKey: 'gantt' });
  probe.state = { error: new Error('x') };

  // resetKey 未变化 → 不清除
  probe.componentDidUpdate({ children: makeChild(), resetKey: 'gantt' });
  assert.equal(probe.calls.length, 0, 'resetKey 未变化时不应清除错误');

  // resetKey 变化（用户切了标签页）→ 清除
  probe.componentDidUpdate({ children: makeChild(), resetKey: 'dashboard' });
  assert.equal(probe.calls.length, 1, 'resetKey 变化时应清除错误');
  assert.deepEqual(probe.calls[0], { error: null });
});

test('本身没有错误时，resetKey 变化不会触发多余的 setState', () => {
  const probe = new ProbeBoundary({ children: makeChild(), resetKey: 'a' });
  probe.state = { error: null };
  probe.componentDidUpdate({ children: makeChild(), resetKey: 'b' });
  assert.equal(probe.calls.length, 0);
});

/** 探针子类：记录 setState 调用而不真正触发 React 更新（实例未挂载） */
class ProbeBoundary extends ErrorBoundary {
  public calls: unknown[] = [];

  override setState(state: any): void {
    this.calls.push(state);
  }
}
