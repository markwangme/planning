import React, { useState } from 'react';
import {
  Server,
  Database,
  Code2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  FileCode,
  Key
} from 'lucide-react';

export const MesApiView: React.FC = () => {
  const [activeEndpoint, setActiveEndpoint] = useState<string>('events');

  const apiEndpoints = [
    {
      id: 'orders',
      method: 'POST',
      path: '/api/v1/orders',
      title: '订单录入与校验',
      desc: '录单/订单行主数据校验，支持 Idempotency-Key 幂等请求键'
    },
    {
      id: 'simulate',
      method: 'POST',
      path: '/api/v1/plans/simulate',
      title: '排产试算草稿生成',
      desc: '启动后台有限产能启发式算法计算，生成草稿版本并返回 job_id；不自动发布'
    },
    {
      id: 'publish',
      method: 'POST',
      path: '/api/v1/plans/{id}/publish',
      title: '计划版本事务发布',
      desc: '原子事务切换已发布版本，校验 24 小时冻结与硬约束，冲突时回滚'
    },
    {
      id: 'events',
      method: 'POST',
      path: '/api/v1/operations/{id}/events',
      title: '工序级半日报工上报',
      desc: '六工序实际事件写入，依赖 client_event_id 去重；灌装工序汇总合格入库量'
    },
    {
      id: 'progress',
      method: 'GET',
      path: '/api/v1/orders/{id}/progress',
      title: '订单完成度与工序追踪',
      desc: '读取合格灌装汇总、在制批次六工序状态及最后人工报工时点'
    }
  ];

  const sampleJsonPayLoad: Record<string, string> = {
    events: `{
  "client_event_id": "EVT-20260914-00129",
  "batch_id": "SIM-B001",
  "operation_code": "FILL",
  "event_type": "COMPLETE",
  "actual_at": "2026-09-14T15:30:00+08:00",
  "reported_by": "USR_OPERATOR_01",
  "period": "09-14 上午",
  "payload": {
    "good_filled_kg": 6000.000,
    "loss_kg": 12.500,
    "qc_release_ref": "QC-DOC-2026-0914-88",
    "package_type": "IBC_1000L_NITROGEN"
  }
}`,
    simulate: `{
  "t0": "2026-09-14T08:00:00+08:00",
  "freeze_window_hours": 24,
  "strategy": "SETUP_MINIMIZE",
  "include_orders": ["SIM-SO-001", "SIM-SO-002", "SIM-SO-003"]
}`,
    publish: `{
  "plan_version": "V13",
  "based_on": "V12",
  "approved_by": "PLANNER_LEI",
  "force_override_warning": false
}`,
    orders: `{
  "order_no": "SIM-SO-005",
  "customer_id": "CUST-CATL-01",
  "product_model": "SIM-MODEL-A",
  "qty_kg": 10000.000,
  "customer_due_at": "2026-09-18T18:00:00+08:00",
  "production_due_at": "2026-09-18T08:00:00+08:00",
  "allow_split": true,
  "allow_parallel": true
}`,
    progress: `{
  "order_no": "SIM-SO-001",
  "status": "IN_PRODUCTION",
  "total_qty_kg": 10000.000,
  "good_filled_kg": 6000.000,
  "completion_rate": 0.60,
  "active_step": "FILL_COMPLETED",
  "last_reported_at": "2026-09-14T12:00:00+08:00"
}`
  };

  return (
    <div id="mes-api-view" className="space-y-4 font-sans text-slate-800">
      {/* 1. Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              系统架构与未来 MES / DCS 接口预留
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ISA-95 工业模型 · 一期解耦
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            当前不连接任何其他外部系统；预留 RESTful 接口、幂等去重 (Idempotency) 与审计留痕机制
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-mono text-xs border border-slate-200">
          Source System: MANUAL (一期固定)
        </span>
      </div>

      {/* 2. Role-Based Permissions (Page 14 原型表格) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          基于角色的访问控制权限表 (RBAC Matrix)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
              <tr>
                <th className="p-3">角色名称</th>
                <th className="p-3">允许操作权限</th>
                <th className="p-3">严格限制边界</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-semibold text-slate-900">管理员 (Admin)</td>
                <td className="p-3 text-slate-700">账号、角色分配、系统基础数据维护</td>
                <td className="p-3 text-rose-700 font-medium">不以管理员身份绕过工艺与专釜硬约束</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-semibold text-slate-900">计划员 (Planner)</td>
                <td className="p-3 text-slate-700">订单录入、生成试算草稿、人工调整、计划发布</td>
                <td className="p-3 text-amber-700 font-medium">不能无审批解除未来 24 小时计划冻结</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-semibold text-slate-900">生产主管 (Supervisor)</td>
                <td className="p-3 text-slate-700">冻结解锁审批、异常工时顺延修正、型号规则审批</td>
                <td className="p-3 text-slate-600">需填写明确审批原因并保留不可篡改审计日志</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-semibold text-slate-900">生产人员 (Operator)</td>
                <td className="p-3 text-slate-700">授权所属设备与批次的工序半日报工</td>
                <td className="p-3 text-slate-600">不可修改型号规则、清洗矩阵或重排发布时间</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="p-3 font-semibold text-slate-900">销售和管理层 (Viewer)</td>
                <td className="p-3 text-slate-700">授权订单与共享看板只读查看、交期风险监控</td>
                <td className="p-3 text-slate-600">不改变排程计划与现场实际报工记录</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. API Design & Interactive Contract Mock (Page 14 API 设计示例) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Endpoints List */}
        <div className="md:col-span-5 space-y-2">
          {apiEndpoints.map((ep) => {
            const isSelected = activeEndpoint === ep.id;
            return (
              <div
                key={ep.id}
                onClick={() => setActiveEndpoint(ep.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    ep.method === 'POST' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {ep.path}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900">
                  {ep.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {ep.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* JSON Payload Inspector */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900">
                RESTful API 请求载荷契约 (JSON Schema Preview)
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Content-Type: application/json
            </span>
          </div>

          <div className="my-3 bg-slate-900 text-slate-100 p-3.5 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
            <pre>{sampleJsonPayLoad[activeEndpoint] || '// Select an endpoint'}</pre>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <strong className="text-slate-900 block">数据一致性与幂等设计原则:</strong>
            <div>1. 客户端提交报工时带 <code className="text-blue-600">client_event_id</code>，重复提交不重复记账。</div>
            <div>2. 更新接口携带 <code className="text-blue-600">row_version</code> 乐观锁，并发修改冲突时拒绝覆盖。</div>
            <div>3. 生产与清洗任务采用左闭右开时间段，前任务结束等于后任务开始。</div>
          </div>
        </div>
      </div>
    </div>
  );
};
