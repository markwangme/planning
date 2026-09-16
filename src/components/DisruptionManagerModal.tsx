import React, { useState } from "react";
import {
  AlertTriangle,
  Zap,
  PlusCircle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Clock,
  Flame,
  Layers,
} from "lucide-react";
import { DisruptionEvent, WorkResource, ProductionOrder } from "../types.ts";
import { PRESET_DISRUPTIONS } from "../data/initialData.ts";

interface DisruptionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  disruptions: DisruptionEvent[];
  resources: WorkResource[];
  orders: ProductionOrder[];
  onAddDisruption: (event: DisruptionEvent) => void;
  onRemoveDisruption: (id: string) => void;
  onTriggerPreset: (presetId: string) => void;
  onDynamicReoptimize: () => void;
  onResetAll: () => void;
}

export const DisruptionManagerModal: React.FC<DisruptionManagerModalProps> = ({
  isOpen,
  onClose,
  disruptions,
  resources,
  orders,
  onAddDisruption,
  onRemoveDisruption,
  onTriggerPreset,
  onDynamicReoptimize,
  onResetAll,
}) => {
  const [customType, setCustomType] = useState<DisruptionEvent["type"]>("MACHINE_BREAKDOWN");
  const [customTitle, setCustomTitle] = useState("");
  const [customHour, setCustomHour] = useState(12);
  const [customDuration, setCustomDuration] = useState(4);
  const [customTargetRes, setCustomTargetRes] = useState(resources[2]?.id || "");

  if (!isOpen) return null;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle) return;

    const newEvent: DisruptionEvent = {
      id: `DISRUPT_${Date.now()}`,
      type: customType,
      title: customTitle,
      description: `自定义现场扰动：影响时长 ${customDuration} 小时`,
      occurredAtHour: Number(customHour),
      durationHours: Number(customDuration),
      targetResourceId: customType === "MACHINE_BREAKDOWN" ? customTargetRes : undefined,
      resolved: false,
    };

    onAddDisruption(newEvent);
    setCustomTitle("");
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">突发扰动模拟与实时动态排程中心</h2>
              <p className="text-xs text-slate-400">
                模拟车间突发故障、紧急VIP插单、质检复验，触发有限产能实时动态重排
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

        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Preset One-Click Scenarios */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>典型工业突发场景 (点击立即注入扰动)：</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESET_DISRUPTIONS.map((preset) => {
                const isActivated = disruptions.some((d) => d.id === preset.id);
                return (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                      isActivated
                        ? "bg-amber-950/40 border-amber-600/70"
                        : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between font-bold text-slate-200">
                        <span className="truncate">{preset.title.slice(0, 14)}</span>
                        {isActivated && (
                          <span className="text-[10px] text-amber-400 bg-amber-950 px-1 rounded border border-amber-700">
                            已注入
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {preset.description}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        影响: {preset.durationHours}h
                      </span>
                      <button
                        onClick={() => {
                          if (isActivated) {
                            onRemoveDisruption(preset.id);
                          } else {
                            onTriggerPreset(preset.id);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          isActivated
                            ? "bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900"
                            : "bg-cyan-600 hover:bg-cyan-500 text-white"
                        }`}
                      >
                        {isActivated ? "移除扰动" : "注入该扰动"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Disruptions List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>当前作用中的现场扰动列表 ({disruptions.length})：</span>
              </h3>
              {disruptions.length > 0 && (
                <button
                  onClick={onResetAll}
                  className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  全部清空恢复基准
                </button>
              )}
            </div>

            {disruptions.length === 0 ? (
              <div className="bg-slate-800/40 rounded-xl p-4 text-center border border-slate-800 text-xs text-slate-400">
                当前车间运行处于理想基准状态，无未决扰动。
              </div>
            ) : (
              <div className="space-y-2">
                {disruptions.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-slate-800/80 rounded-xl border border-amber-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <div>
                        <span className="font-bold text-white">{d.title}</span>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>发生时间: 第 {d.occurredAtHour}h</span>
                          <span>持续: {d.durationHours}小时</span>
                          {d.targetResourceId && (
                            <span className="text-cyan-300 font-mono">
                              目标: {resources.find((r) => r.id === d.targetResourceId)?.name || d.targetResourceId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveDisruption(d.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
                      title="撤销该扰动"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Disruption Form */}
          <form
            onSubmit={handleCreateCustom}
            className="bg-slate-850 p-3.5 rounded-xl border border-slate-700/70 text-xs space-y-3"
          >
            <span className="font-semibold text-slate-200 block">
              自定义添加生产突发异常:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">扰动类型</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                >
                  <option value="MACHINE_BREAKDOWN">设备突发故障 (停机维护)</option>
                  <option value="EMERGENCY_ORDER">紧急插单 (VIP优先抢占)</option>
                  <option value="QA_HOLD">质检异常 (二次回流脱水)</option>
                  <option value="MATERIAL_DELAY">原料短缺 (延迟上线)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">扰动名称/简述</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="例如：R-202温度传感器漂移"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">发生时刻 (排程第xh)</label>
                <input
                  type="number"
                  min="0"
                  max="72"
                  value={customHour}
                  onChange={(e) => setCustomHour(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">影响时长 (小时)</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>

              {customType === "MACHINE_BREAKDOWN" && (
                <div>
                  <label className="text-slate-400 block mb-1">受影响设备</label>
                  <select
                    value={customTargetRes}
                    onChange={(e) => setCustomTargetRes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} - {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              注入自定义现场扰动
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            * 注入扰动后点击右侧执行排程内核局部/全局智能重排
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              取消
            </button>
            <button
              onClick={() => {
                onDynamicReoptimize();
                onClose();
              }}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold shadow-lg shadow-orange-500/20 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              立即动态重排优化
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
