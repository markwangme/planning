import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Filter,
  UserCheck,
  Building2,
  ArrowRight,
  Info,
  Wrench,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import {
  ApsErrorCode,
  ApsExceptionRecord,
  ProductionOrder,
  BatchTask,
  Reactor,
  ProductModelDef,
  ReactorRestriction,
  WashMatrixRule,
  UserRole
} from '../types/aps';
import { evaluateScheduleExceptions } from '../utils/apsEngine';

interface ExceptionsCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: ProductionOrder[];
  batches: BatchTask[];
  reactors: Reactor[];
  productModels: ProductModelDef[];
  restrictions: ReactorRestriction[];
  washRules: WashMatrixRule[];
  currentRole: UserRole;
  onNavigateToConfig?: () => void;
}

export const ExceptionsCenterModal: React.FC<ExceptionsCenterModalProps> = ({
  isOpen,
  onClose,
  orders,
  batches,
  reactors,
  productModels,
  restrictions,
  washRules,
  currentRole,
  onNavigateToConfig
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Compute 8 exceptions dynamically
  const exceptions: ApsExceptionRecord[] = useMemo(() => {
    return evaluateScheduleExceptions(
      orders,
      batches,
      reactors,
      productModels,
      restrictions,
      washRules,
      '2026-09-14 08:00'
    );
  }, [orders, batches, reactors, productModels, restrictions, washRules]);

  if (!isOpen) return null;

  const filtered = exceptions.filter((ex) => {
    if (selectedSeverity !== 'ALL' && ex.severity !== selectedSeverity) return false;
    if (selectedRole !== 'ALL' && ex.responsible_role !== selectedRole) return false;
    return true;
  });

  const criticalCount = exceptions.filter((e) => e.severity === 'CRITICAL').length;
  const highCount = exceptions.filter((e) => e.severity === 'HIGH').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg border border-rose-400/30">
              <ShieldAlert className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">APS 8大结构化排产异常监控与责任链中心</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30">
                  契约治理引擎
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                对设备白名单、尾批投料下限、标准工时、初始残液、未审批规则与冻结冲突进行全链路结构化追踪
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Counter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">异常过滤:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">全部严重度 ({exceptions.length})</option>
              <option value="CRITICAL">阻断级 CRITICAL ({criticalCount})</option>
              <option value="HIGH">高危 HIGH ({highCount})</option>
              <option value="MEDIUM">提示 MEDIUM</option>
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="ALL">全部责任角色</option>
              <option value="PLANNER">计划员 (PLANNER)</option>
              <option value="PROCESS_ENGINEER">工艺工程师 (PROCESS)</option>
              <option value="SUPERVISOR">车间调度/班长 (SUPERVISOR)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              阻断发布异常: {criticalCount} 项
            </span>
            <span className="text-slate-500 font-mono">
              命中记录: {filtered.length} / {exceptions.length}
            </span>
          </div>
        </div>

        {/* Exceptions List */}
        <div className="p-6 max-h-[500px] overflow-y-auto divide-y divide-slate-200">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-sm font-semibold text-slate-700">未检测到该筛选条件下的排产异常</div>
              <p className="text-xs">白名单、下限约束、工时标准及设备初始状态校验均符合规程要求。</p>
            </div>
          ) : (
            filtered.map((ex, idx) => {
              const isBlocking = ex.severity === 'CRITICAL';
              return (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        ex.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : ex.severity === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {ex.code}
                      </span>

                      <h4 className="text-sm font-bold text-slate-800">{ex.title}</h4>

                      {isBlocking && (
                        <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded">
                          阻断发布
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-mono">对象: [{ex.entity_type}] {ex.entity_id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-400 font-mono">{ex.occurred_at}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 pl-1">{ex.message}</p>

                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>责任岗位：<strong className="text-slate-800">{ex.responsible_role}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>责任部门：<strong className="text-slate-800">{ex.responsible_dept}</strong></span>
                      </div>
                    </div>

                    <div className="text-right text-indigo-700 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{ex.remediation_hint}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>异常闭环：当工艺确认放行、设备状态更新或批次合并后，系统将自动消除对应异常码</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            关闭中心
          </button>
        </div>
      </div>
    </div>
  );
};
