/**
 * 渲染期安全网 (Error Boundary)
 *
 * 为什么需要它：
 *   本项目原先组件树里**没有任何 Error Boundary**。React 的默认行为是——
 *   只要某个组件在渲染期抛异常且无人捕获，**整棵组件树会被卸载**，用户看到整页白屏，
 *   连导航栏都点不了，只能手动刷新。
 *
 *   真实事故：`GanttWorkstation` 的甘特分支调用了字典里不存在的翻译键
 *   `t.gantt.kpiTons(...)`，运行期抛 TypeError，整个页面白屏。
 *   如果当时有这层安全网，用户只会看到「该视图渲染出错」的提示卡片，
 *   其余标签页照常可用。
 *
 * 用法：
 *   - 包裹整个应用 → 兜住导航栏等公共区域的异常；
 *   - 包裹单个视图并传 `resetKey`（如当前标签页）→ 某个视图崩溃时，
 *     用户切换到别的标签页即可自动恢复，不会一直卡在错误页。
 */
import React from 'react';
import { AlertOctagon, RotateCcw, RefreshCw } from 'lucide-react';

import { getTranslations } from '../i18n';
import type { LanguageCode } from '../types/aps';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** 出错视图的名称（已本地化），用于告知用户是哪一块坏了 */
  label?: string;
  /** 该值变化时自动清除错误状态 —— 传当前标签页即可实现「切页即恢复」 */
  resetKey?: unknown;
  /** 出错回调，便于上报或埋点 */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  lang?: LanguageCode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] 已拦截渲染期异常:', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // 出错后若 resetKey 变了（例如用户切换了标签页），自动恢复正常渲染
    if (this.state.error !== null && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  override render(): React.ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;

    const t = getTranslations(this.props.lang ?? 'zh').errorBoundary;
    const stack = error.stack ?? '';

    return (
      <div className="flex items-center justify-center p-4 sm:p-6" role="alert">
        <div className="w-full max-w-2xl bg-white border border-rose-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="flex items-start gap-3 p-4 border-b border-rose-100 bg-rose-50/60">
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-rose-900">{t.title}</h2>
              {this.props.label ? (
                <p className="text-[11px] text-rose-700/80 mt-0.5 font-mono truncate">
                  {this.props.label}
                </p>
              ) : null}
            </div>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>

            <pre className="text-[11px] font-mono text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2.5 overflow-x-auto whitespace-pre-wrap break-all">
              {error.name}: {error.message}
            </pre>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.retry}</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.reload}</span>
              </button>
            </div>

            {stack ? (
              <details className="text-[11px] text-slate-500">
                <summary className="cursor-pointer font-semibold text-slate-600 hover:text-slate-900">
                  {t.details}
                </summary>
                <pre className="mt-2 font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 overflow-auto whitespace-pre-wrap break-all max-h-64">
                  {stack}
                </pre>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}
