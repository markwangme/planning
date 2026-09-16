import React, { useState } from 'react';
import {
  ClipboardList,
  PlusCircle,
  Sparkles,
  Layers,
  ArrowDownCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';
import {
  ProductionOrder,
  Reactor,
  ReactorRestriction,
  WashMatrixRule
} from '../types/aps';
import {
  splitOrderBatches,
  recommendReactorForOrder,
  validateReactorRestriction
} from '../utils/apsEngine';

interface OrderManagementViewProps {
  orders: ProductionOrder[];
  reactors: Reactor[];
  restrictions: ReactorRestriction[];
  washRules: WashMatrixRule[];
  onAddOrder: (newOrder: ProductionOrder) => void;
  onScheduleAllOrders: () => void;
}

export const OrderManagementView: React.FC<OrderManagementViewProps> = ({
  orders,
  reactors,
  restrictions,
  washRules,
  onAddOrder,
  onScheduleAllOrders
}) => {
  // Form state
  const [customerName, setCustomerName] = useState('中创新航动力电池');
  const [productModel, setProductModel] = useState('EL-NCM-811');
  const [totalQty, setTotalQty] = useState<number>(15.2);
  const [dueDate, setDueDate] = useState('2026-09-18');
  const [priority, setPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL'>('HIGH');
  const [customNotes, setCustomNotes] = useState('高能量密度NCM811体系，重点控制水分<=12ppm');

  // Product catalog reference
  const products = [
    { model: 'EL-NCM-811', name: '高镍811动力三元动力电解液', desc: '动力高能量密度体系，常规建议6T釜', defaultQty: 15.2 },
    { model: 'EL-LFP-002', name: '储能型磷酸铁锂长寿命电解液', desc: '长循环寿命储能体系，常规建议6T釜', defaultQty: 11.0 },
    { model: 'EL-CORROSIVE-X', name: '强腐蚀特种高镍电解液', desc: '【专釜硬约束】含特殊氟化添加剂，强制仅限 R-1.3T-01 釜', defaultQty: 2.3 },
    { model: 'EL-NA-01', name: '钠离子超导电解液 (NaPF6)', desc: '防交叉污染限定 R-1.3T-01 或 R-6T-01 釜', defaultQty: 1.2 },
    { model: 'EL-LCO-445', name: '4.45V高电压消费数码电解液', desc: '数码高电压标准配方', defaultQty: 5.5 }
  ];

  // Selected product object
  const currentProduct = products.find((p) => p.model === productModel) || products[0];

  // Realtime simulation of reactor & downward split
  const simulatedOrder: ProductionOrder = {
    order_no: `ORD-${Date.now().toString().slice(-4)}`,
    customer_name: customerName,
    product_model: productModel,
    product_name: currentProduct.name,
    qty_kg: (Number(totalQty) || 1.0) * 1000,
    customer_due_at: dueDate,
    production_due_at: dueDate,
    received_at: '2026-09-14 08:00',
    priority: priority,
    urgent: priority === 'URGENT',
    status: 'PENDING_SCHEDULE',
    allow_split: true,
    allow_parallel: true,
    split_batches: [],
    completed_good_kg: 0,
    notes: customNotes
  };

  const targetReactor = recommendReactorForOrder(simulatedOrder, reactors, restrictions) || reactors[0];
  const splitBatches = splitOrderBatches(simulatedOrder, targetReactor);
  const restrictionCheck = validateReactorRestriction(productModel, targetReactor.reactor_id, restrictions);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalQty <= 0) return;

    const newOrder: ProductionOrder = {
      order_no: `ORD-202609-${String(orders.length + 1).padStart(3, '0')}`,
      customer_name: customerName,
      product_model: productModel,
      product_name: currentProduct.name,
      qty_kg: Number(totalQty) * 1000,
      customer_due_at: dueDate,
      production_due_at: dueDate,
      received_at: '2026-09-14 14:35',
      priority: priority,
      urgent: priority === 'URGENT',
      status: 'PENDING_SCHEDULE',
      allow_split: true,
      allow_parallel: true,
      split_batches: [],
      completed_good_kg: 0,
      notes: customNotes
    };

    onAddOrder(newOrder);
    setTotalQty(5.0);
  };

  return (
    <div id="order-management-view" className="space-y-4">
      {/* Top Banner & Fast Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            订单录入与向下分批 (Batch Division) 工作台
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            根据物理釜容积（1.3T / 6.0T）及专釜限制规则，实时演算订单向下拆批策略与最优配釜
          </p>
        </div>

        <button
          id="btn-schedule-all-orders"
          onClick={onScheduleAllOrders}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-md cursor-pointer transition-all"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>一键将所有待排订单纳入 APS 排程</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Order Input & Dynamic Split Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-400" />
              新建电解液客户订单
            </h3>

            <form onSubmit={handleSubmitOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">客户名称</label>
                <input
                  id="input-customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">电解液型号 / 配方体系</label>
                <select
                  id="select-product-model"
                  value={productModel}
                  onChange={(e) => {
                    setProductModel(e.target.value);
                    const p = products.find((x) => x.model === e.target.value);
                    if (p) setTotalQty(p.defaultQty);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.model} value={p.model}>
                      {p.model} - {p.name}
                    </option>
                  ))}
                </select>
                <div className="text-[11px] text-slate-400 mt-1">{currentProduct.desc}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">订单总量 (吨 Q)</label>
                  <input
                    id="input-total-qty"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={totalQty}
                    onChange={(e) => setTotalQty(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">交付日期 (Due Date)</label>
                  <input
                    id="input-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">生产优先级</label>
                  <select
                    id="select-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="URGENT">加急 (URGENT - 优先连续插单)</option>
                    <option value="HIGH">高优先级 (HIGH)</option>
                    <option value="NORMAL">普通订单 (NORMAL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">订单备注 / 特殊质量要求</label>
                  <input
                    id="input-notes"
                    type="text"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dynamic Downward Split Preview Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 mt-3">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    【向下分批】算法实时演算结果:
                  </span>
                  <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                    目标容积 C = {targetReactor.max_capacity}T
                  </span>
                </div>

                <div className="text-xs space-y-1.5 text-slate-300">
                  <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400">推荐反应釜:</span>
                    <span className="font-bold text-white font-mono flex items-center gap-1.5">
                      <span>{targetReactor.reactor_id}</span>
                      <span className="text-[11px] text-slate-400 font-normal">({targetReactor.reactor_name})</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-400 pl-1">
                    系统匹配：{targetReactor.reactor_id} ({targetReactor.rated_kg / 1000}t 釜) 最符合订单批量
                  </div>

                  {!restrictionCheck.valid && (
                    <div className="p-2 rounded bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-start gap-1.5 mt-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{restrictionCheck.errorMessage}</span>
                    </div>
                  )}

                  {/* Batch Breakdown List */}
                  <div className="mt-2 space-y-1">
                    <div className="text-[11px] text-slate-400 font-medium">拆解生成独立生产批次清单:</div>
                    {splitBatches.map((item) => (
                      <div
                        key={item.batchIndex}
                        className="flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded text-xs border border-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-900 text-blue-200 flex items-center justify-center text-[10px] font-bold">
                            {item.batchIndex}
                          </span>
                          <span className="font-mono text-slate-200">
                            批次 #{item.batchIndex}/{item.totalBatches}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">
                            {item.batchQtyKg / 1000} 吨 ({item.batchQtyKg.toLocaleString()} kg)
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.batchIndex < item.totalBatches ? '(满釜生产)' : '(余量向下分批)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                id="btn-submit-order"
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>确认录入订单并生成拆批任务</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Existing Orders Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                客户订单台账清单 ({orders.length} 笔)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                总需求量: {orders.reduce((s, o) => s + o.total_qty, 0).toFixed(1)} 吨
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">订单编号 / 客户</th>
                    <th className="py-2.5 px-3">产品型号</th>
                    <th className="py-2.5 px-3 text-right">总量 (吨)</th>
                    <th className="py-2.5 px-3 text-center">拆分批次</th>
                    <th className="py-2.5 px-3">交付日期</th>
                    <th className="py-2.5 px-3 text-center">排产状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {orders.map((order) => {
                    const isUrgent = order.priority === 'URGENT';
                    const isCorrosive = order.product_model.includes('CORROSIVE');

                    return (
                      <tr key={order.order_no} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-white flex items-center gap-1.5">
                            <span>{order.order_no}</span>
                            {isUrgent && (
                              <span className="bg-rose-950 text-rose-300 border border-rose-800 text-[9px] px-1 rounded">
                                加急
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {order.customer_name}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-medium text-white flex items-center gap-1">
                            <span>{order.product_model}</span>
                            {isCorrosive && (
                              <span className="text-[9px] px-1 rounded bg-rose-900/60 text-rose-200 border border-rose-700" title="专釜硬隔离约束">
                                专釜
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {order.product_name}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-300">
                          {order.total_qty.toFixed(1)} T
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px] border border-slate-700">
                            {order.split_batch_count} 批
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                          {order.due_date}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {order.status === 'IN_PRODUCTION' && (
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-medium">
                              生产中
                            </span>
                          )}
                          {order.status === 'SCHEDULED' && (
                            <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-medium">
                              已排产
                            </span>
                          )}
                          {order.status === 'PENDING_SCHEDULE' && (
                            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-medium">
                              待排产
                            </span>
                          )}
                          {order.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
                              已完工
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 mt-4 text-xs text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                向下分批与配釜逻辑规范说明:
              </div>
              <p className="leading-relaxed">
                1. <strong className="text-slate-300">配釜与拆批规则</strong>：当订单量 Q &gt; C（如时代动力 14.5T 分配给 6T 釜），拆分为 N = ⌈14.5 / 6⌉ = 3 批：前两批各 6.0T，第三批余量向下分批为 2.5T，严禁超负荷投产。
              </p>
              <p className="leading-relaxed">
                2. <strong className="text-slate-300">专线隔离硬约束</strong>：若产品绑定特定设备（如强腐蚀特种型号绑定 R-1.3T-01），排产引擎必须 100% 遵守，严防氟化添加剂污染其他不锈钢反应釜。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
