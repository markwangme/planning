import React, { useState } from "react";
import {
  ProductionOrder,
  FormulaType,
  OrderPriority,
} from "../types.ts";
import {
  FileSpreadsheet,
  PlusCircle,
  AlertCircle,
  Clock,
  Trash2,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { FORMULA_META } from "./GanttChart.tsx";

interface OrderManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: ProductionOrder[];
  onAddOrder: (order: ProductionOrder) => void;
  onDeleteOrder: (id: string) => void;
  onToggleEmergency: (id: string) => void;
}

export const OrderManagementModal: React.FC<OrderManagementModalProps> = ({
  isOpen,
  onClose,
  orders,
  onAddOrder,
  onDeleteOrder,
  onToggleEmergency,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [formulaType, setFormulaType] = useState<FormulaType>("NCM_HIGH_NICKEL");
  const [quantityTons, setQuantityTons] = useState(25);
  const [dueHour, setDueHour] = useState(48);
  const [priority, setPriority] = useState<OrderPriority>("P2_HIGH");
  const [isEmergency, setIsEmergency] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !productName) return;

    const newOrder: ProductionOrder = {
      id: `ORD_${Date.now()}`,
      orderNo: `WO-2026-${formulaType.slice(0, 2)}${Math.floor(10 + Math.random() * 90)}`,
      customerName,
      productCode: `EL-${formulaType.slice(0, 3)}-${quantityTons}`,
      productName,
      formulaType,
      quantityTons: Number(quantityTons),
      batchCount: 1,
      priority,
      releaseDate: "2026-09-14 08:00",
      dueDate: `第 ${dueHour} 小时`,
      dueHour: Number(dueHour),
      status: "SCHEDULED",
      isEmergency,
      notes: "人工新建插单",
    };

    onAddOrder(newOrder);
    setCustomerName("");
    setProductName("");
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">生产工单管理与BOM工序清单</h2>
              <p className="text-xs text-slate-400">
                维护电池厂批量订单、配方分类、交期阈值与VIP紧急插单标记
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              当前生产计划工单池 ({orders.length} 笔订单)
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {showAddForm ? "收起表单" : "新增生产工单"}
            </button>
          </div>

          {/* New Order Form */}
          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="bg-slate-850 p-4 rounded-xl border border-cyan-500/40 text-xs space-y-3 shadow-lg"
            >
              <h3 className="font-bold text-cyan-300 flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" />
                创建新电解液生产任务
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">客户名称</label>
                  <input
                    type="text"
                    required
                    placeholder="如：宁德时代 / 蜂巢能源"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">产品品名与规格</label>
                  <input
                    type="text"
                    required
                    placeholder="如：超高倍率快充电解液"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">配方体系 (洗釜约束)</label>
                  <select
                    value={formulaType}
                    onChange={(e) => setFormulaType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="NCM_HIGH_NICKEL">高镍三元动力型 (NCM)</option>
                    <option value="LFP_HIGH_RATE">磷酸铁锂高倍率 (LFP)</option>
                    <option value="SI_CARBON_ANODE">硅碳4680宽温域</option>
                    <option value="SODIUM_ION_SPEC">钠离子特种耐低温</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">计划产量 (吨)</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={quantityTons}
                    onChange={(e) => setQuantityTons(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">交付时限 (排程第xh前)</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    value={dueHour}
                    onChange={(e) => setDueHour(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">排程优先级</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="P1_EMERGENCY">P1 - 最高紧急度</option>
                    <option value="P2_HIGH">P2 - 高战略优先</option>
                    <option value="P3_NORMAL">P3 - 常规量产</option>
                    <option value="P4_LOW">P4 - 备库调峰</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-amber-300">
                    <input
                      type="checkbox"
                      checked={isEmergency}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-0"
                    />
                    <span className="font-semibold">设为VIP紧急插单</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30"
                >
                  确认加入工单池
                </button>
              </div>
            </form>
          )}

          {/* Orders Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-850 text-slate-300 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">工单号</th>
                  <th className="p-3">客户与品名</th>
                  <th className="p-3">配方体系</th>
                  <th className="p-3">批量 (吨)</th>
                  <th className="p-3">交期阈值</th>
                  <th className="p-3">优先级</th>
                  <th className="p-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.map((order) => {
                  const meta = FORMULA_META[order.formulaType];
                  return (
                    <tr key={order.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-cyan-400">
                        {order.orderNo}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400">{order.productName}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${meta.border} bg-slate-800 ${meta.text}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.short}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-200">
                        {order.quantityTons} 吨
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        第 {order.dueHour}h (
                        <span className="text-[10px] text-slate-400">
                          ~{(order.dueHour / 24).toFixed(1)}天
                        </span>
                        )
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => onToggleEmergency(order.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            order.isEmergency
                              ? "bg-rose-950 text-rose-300 border border-rose-600 animate-pulse"
                              : order.priority === "P2_HIGH"
                              ? "bg-amber-950 text-amber-300 border border-amber-700"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                          title="点击切换紧急插单标记"
                        >
                          {order.isEmergency ? "🚨 VIP加急" : order.priority}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onDeleteOrder(order.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="移除工单"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            完成并返回主看板
          </button>
        </div>
      </div>
    </div>
  );
};
