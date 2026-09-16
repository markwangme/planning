import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Settings,
  Sparkles,
  Layers,
  Wrench,
  CheckCircle2,
  Trash2,
  Info,
  Lock,
  FileCheck,
  Edit3,
  Save,
  FlaskConical,
  Clock,
  Droplet,
  Award,
  AlertCircle,
  HelpCircle,
  Cpu,
  UserCheck,
  CalendarClock
} from 'lucide-react';
import {
  Reactor,
  ReactorRestriction,
  WashMatrixRule,
  ProductModelDef,
  SpecialScope,
  WashRuleCardDef,
  UserRole
} from '../types/aps';

interface RulesConfigViewProps {
  currentRole: UserRole;
  reactors: Reactor[];
  onUpdateReactors: (reactors: Reactor[]) => void;
  restrictions: ReactorRestriction[];
  washRules: WashMatrixRule[];
  onUpdateWashRules: (rules: WashMatrixRule[]) => void;
  washRuleCards: WashRuleCardDef[];
  onUpdateWashRuleCards: (cards: WashRuleCardDef[]) => void;
  productModels: ProductModelDef[];
  onUpdateProductModels: (models: ProductModelDef[]) => void;
  onUpdateReactorAllowed: (modelCode: string, reactorId: string, allowed: boolean) => void;
  onUpdateSpecialDirection: (modelCode: string, scope: SpecialScope) => void;
  onSubmitRulesApproval: () => void;
  onRequireAuthPrompt?: (targetRole: UserRole) => void;
}

export const RulesConfigView: React.FC<RulesConfigViewProps> = ({
  currentRole,
  reactors,
  onUpdateReactors,
  restrictions,
  washRules,
  onUpdateWashRules,
  washRuleCards,
  onUpdateWashRuleCards,
  productModels,
  onUpdateProductModels,
  onUpdateReactorAllowed,
  onUpdateSpecialDirection,
  onSubmitRulesApproval,
  onRequireAuthPrompt
}) => {
  const isProcessEngineer = currentRole === 'PROCESS_ENGINEER' || currentRole === 'ADMIN';
  const isPlanner = currentRole === 'PLANNER' || currentRole === 'ADMIN';

  // Active Sub-Tab: 'wash_cards' | 'craft_confirm' | 'planner_entry' | 'reactor_params'
  const [subTab, setSubTab] = useState<'wash_cards' | 'craft_confirm' | 'planner_entry' | 'reactor_params'>('wash_cards');

  // 1. Wash Rule Cards Editing State (Requirement 3: 特殊清洗说明内容，工艺员可以修改)
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardDescDraft, setCardDescDraft] = useState<string>('');
  const [cardTitleDraft, setCardTitleDraft] = useState<string>('');
  const [cardBadgeDraft, setCardBadgeDraft] = useState<string>('');
  const [cardDurationDraft, setCardDurationDraft] = useState<number>(0);

  // 2. Craft Confirmation State (Requirement 1: 是否特殊清洗由工艺员录入，每个新产品都需要确认)
  const [selectedConfirmModelCode, setSelectedConfirmModelCode] = useState<string>(
    productModels.find((p) => p.approval_status === 'PENDING_CRAFT_APPROVAL')?.model_code || productModels[0]?.model_code || ''
  );
  const currentConfirmModel = productModels.find((p) => p.model_code === selectedConfirmModelCode) || productModels[0];

  const [craftSpecialClean, setCraftSpecialClean] = useState<boolean>(currentConfirmModel?.special_cleaning || false);
  const [craftSpecialScope, setCraftSpecialScope] = useState<SpecialScope>(currentConfirmModel?.special_scope || 'EITHER');
  const [craftStdHours, setCraftStdHours] = useState<number>(currentConfirmModel?.batch_standard_hours || 10.5);
  const [craftRecipeNotes, setCraftRecipeNotes] = useState<string>(currentConfirmModel?.recipe_notes || '');
  const [craftAllowedReactors, setCraftAllowedReactors] = useState<string[]>(currentConfirmModel?.allowed_reactors || ['R-1300-01', 'R-6000-01']);

  // Sync craft form when selected model changes
  React.useEffect(() => {
    if (currentConfirmModel) {
      setCraftSpecialClean(currentConfirmModel.special_cleaning);
      setCraftSpecialScope(currentConfirmModel.special_scope || 'EITHER');
      setCraftStdHours(currentConfirmModel.batch_standard_hours || 10.5);
      setCraftRecipeNotes(currentConfirmModel.recipe_notes || '');
      setCraftAllowedReactors(currentConfirmModel.allowed_reactors || ['R-1300-01', 'R-6000-01']);
    }
  }, [selectedConfirmModelCode]);

  // 3. Planner Product Entry Form State (Requirement 1: 产品型号由计划员录入)
  const [newModelCode, setNewModelCode] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelMinKg, setNewModelMinKg] = useState(1000);
  const [newModelCustomer, setNewModelCustomer] = useState('');
  const [newModelDesc, setNewModelDesc] = useState('');

  // 4. Reactor Parameter Editing (Requirement 2: 反应釜的参数由工艺员维护)
  const [selectedReactorId, setSelectedReactorId] = useState<string>(reactors[0]?.reactor_id || 'R-1300-01');
  const activeReactor = reactors.find((r) => r.reactor_id === selectedReactorId) || reactors[0];
  const [reactorDraft, setReactorDraft] = useState<Reactor>(activeReactor);

  React.useEffect(() => {
    if (activeReactor) {
      setReactorDraft(activeReactor);
    }
  }, [selectedReactorId, reactors]);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const showFeedback = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Handlers for Wash Rule Cards
  const handleStartEditCard = (card: WashRuleCardDef) => {
    if (!isProcessEngineer) {
      onRequireAuthPrompt?.('PROCESS_ENGINEER');
      return;
    }
    setEditingCardId(card.id);
    setCardTitleDraft(card.title);
    setCardBadgeDraft(card.badgeText);
    setCardDescDraft(card.description);
    setCardDurationDraft(card.durationMin);
  };

  const handleSaveCard = (cardId: string) => {
    const updatedCards = washRuleCards.map((c) => {
      if (c.id === cardId) {
        return {
          ...c,
          title: cardTitleDraft,
          badgeText: cardBadgeDraft,
          durationMin: cardDurationDraft,
          description: cardDescDraft,
          lastModifiedBy: currentRole === 'ADMIN' ? '系统管理员' : '工艺员 (魏总工)',
          lastModifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return c;
    });
    onUpdateWashRuleCards(updatedCards);
    setEditingCardId(null);
    showFeedback('特殊清洗说明内容与耗时已由工艺员更新并实时保存！', 'success');
  };

  // Handlers for Planner Model Entry
  const handlePlannerCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPlanner) {
      onRequireAuthPrompt?.('PLANNER');
      return;
    }
    if (!newModelCode.trim() || !newModelName.trim()) {
      showFeedback('请完整输入型号编码与产品名称', 'warn');
      return;
    }
    if (productModels.some((p) => p.model_code === newModelCode.trim())) {
      showFeedback('该产品型号编码已存在，请勿重复创建', 'warn');
      return;
    }

    const newProduct: ProductModelDef = {
      model_code: newModelCode.trim().toUpperCase(),
      name: newModelName.trim(),
      min_order_kg: Number(newModelMinKg) || 1000,
      customer_target: newModelCustomer.trim() || '通用客户标准',
      description: newModelDesc.trim() || '计划员录入新产品，待工艺员核定清洗标准与工艺路线',
      special_cleaning: false,
      special_scope: 'EITHER',
      approval_status: 'PENDING_CRAFT_APPROVAL', // 待工艺员确认
      allowed_reactors: ['R-1300-01', 'R-6000-01', 'R-6000-02', 'R-6000-03'],
      batch_standard_hours: 10.5,
      recipe_notes: '待工艺员录入工艺要点',
      created_by_role: 'PLANNER',
      created_by_name: '生管计划员',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
      craft_confirmed: false
    };

    const updatedList = [newProduct, ...productModels];
    onUpdateProductModels(updatedList);
    setSelectedConfirmModelCode(newProduct.model_code);
    setNewModelCode('');
    setNewModelName('');
    setNewModelCustomer('');
    setNewModelDesc('');
    showFeedback(`计划员已成功录入新产品【${newProduct.model_code}】，已推送至工艺员工作台待确认！`, 'success');
    setSubTab('craft_confirm');
  };

  // Handlers for Craft Confirmation
  const handleCraftConfirmProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProcessEngineer) {
      onRequireAuthPrompt?.('PROCESS_ENGINEER');
      return;
    }
    if (!currentConfirmModel) return;

    const updatedList = productModels.map((p) => {
      if (p.model_code === currentConfirmModel.model_code) {
        return {
          ...p,
          special_cleaning: craftSpecialClean,
          special_scope: craftSpecialScope,
          batch_standard_hours: Number(craftStdHours) || 10.5,
          recipe_notes: craftRecipeNotes,
          allowed_reactors: craftAllowedReactors.length > 0 ? craftAllowedReactors : ['R-1300-01', 'R-6000-01'],
          approval_status: 'APPROVED' as const,
          craft_confirmed: true,
          craft_confirmed_by: currentRole === 'ADMIN' ? '魏总工 (工艺主管/管理员)' : '魏总工 (高级工艺工程师)',
          craft_confirmed_at: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return p;
    });

    onUpdateProductModels(updatedList);
    showFeedback(`工艺员已成功确认并放行【${currentConfirmModel.model_code}】的特殊清洗与工艺参数！`, 'success');
  };

  // Handlers for Reactor Parameter Maintenance
  const handleSaveReactorParams = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProcessEngineer) {
      onRequireAuthPrompt?.('PROCESS_ENGINEER');
      return;
    }

    const updatedReactors = reactors.map((r) => {
      if (r.reactor_id === reactorDraft.reactor_id) {
        return { ...reactorDraft };
      }
      return r;
    });

    onUpdateReactors(updatedReactors);
    showFeedback(`工艺员已成功更新反应釜【${reactorDraft.reactor_id}】的物理与工艺参数！`, 'success');
  };

  // Count pending models for badge
  const pendingCraftCount = productModels.filter((p) => p.approval_status === 'PENDING_CRAFT_APPROVAL' || !p.craft_confirmed).length;

  return (
    <div id="rules-config-view" className="space-y-4 font-sans text-slate-800">
      {/* 1. Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
            <FlaskConical className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                型号、清洗标准与反应釜参数工作台
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                双轨职责制
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              计划员录入产品型号 · 工艺员录入是否特殊清洗并确认 · 工艺员维护反应釜参数与清洗说明
            </p>
          </div>
        </div>

        {/* Current User Role Notice */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium">当前操作身份:</span>
          <span className={`font-bold px-2 py-0.5 rounded ${
            currentRole === 'PROCESS_ENGINEER'
              ? 'bg-emerald-100 text-emerald-800'
              : currentRole === 'PLANNER'
              ? 'bg-blue-100 text-blue-800'
              : currentRole === 'ADMIN'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-slate-200 text-slate-700'
          }`}>
            {currentRole === 'PROCESS_ENGINEER' && '🧪 工艺员 (PE)'}
            {currentRole === 'PLANNER' && '📋 计划员 (Planner)'}
            {currentRole === 'SUPERVISOR' && '👷 生产主管'}
            {currentRole === 'ADMIN' && '⚙️ 系统管理员'}
            {currentRole === 'VIEWER' && '👀 访客 (仅查看)'}
          </span>
          {currentRole === 'VIEWER' && (
            <button
              onClick={() => onRequireAuthPrompt?.('PROCESS_ENGINEER')}
              className="text-blue-600 hover:text-blue-800 font-semibold underline ml-1"
            >
              登录解锁
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 transition-all ${
          feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : feedback.type === 'warn'
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{feedback.text}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => setSubTab('wash_cards')}
          className={`p-3 rounded-xl border text-left transition-all ${
            subTab === 'wash_cards'
              ? 'bg-white border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-blue-600" />
              1. 洗釜标准与说明修改
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">工艺员维护</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            免洗0h / 普通2h / 特殊3h 说明内容在线修订
          </p>
        </button>

        <button
          onClick={() => setSubTab('craft_confirm')}
          className={`p-3 rounded-xl border text-left transition-all ${
            subTab === 'craft_confirm'
              ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-emerald-600" />
              2. 特殊清洗录入与工艺确认
            </span>
            {pendingCraftCount > 0 ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold animate-pulse">
                {pendingCraftCount} 个待确认
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                全部已放行
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            新产品特殊清洗确认 (一物一审)
          </p>
        </button>

        <button
          onClick={() => setSubTab('planner_entry')}
          className={`p-3 rounded-xl border text-left transition-all ${
            subTab === 'planner_entry'
              ? 'bg-white border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-indigo-600" />
              3. 产品型号录入 (计划员)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">计划员录入</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            录入新产品编码、名称与起订批量
          </p>
        </button>

        <button
          onClick={() => setSubTab('reactor_params')}
          className={`p-3 rounded-xl border text-left transition-all ${
            subTab === 'reactor_params'
              ? 'bg-white border-purple-600 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-slate-50 border-slate-200 hover:bg-white text-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-purple-600" />
              4. 反应釜参数维护
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">工艺员参数</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            反应釜容积/投料范围/转速/温控与专用模式
          </p>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. WASH RULE CARDS (EXACT MATCHING USER SCREENSHOT IMAGE)                 */}
      {/* ========================================================================= */}
      {subTab === 'wash_cards' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-blue-600" />
                  清洗切换标准卡片 (工艺员可在线修改说明内容)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  对应 NOVOLYTE 标准规范 · 同型号免洗 / 普通切换标准 CIP / 特殊洗釜深度防污染
                </p>
              </div>

              {!isProcessEngineer && (
                <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>当前处于查看权限，需登录工艺员或管理员身份方可编辑说明</span>
                </div>
              )}
            </div>

            {/* The 3 Cards matching user image exactly */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {washRuleCards.map((card) => {
                const isEditing = editingCardId === card.id;

                // Color themes matching the image
                let containerClass = 'border-emerald-300 bg-emerald-50/20';
                let titleClass = 'text-emerald-950 font-bold';
                let badgeClass = 'bg-emerald-100 text-emerald-800 font-mono font-bold';
                let descClass = 'text-emerald-900';

                if (card.themeColor === 'blue') {
                  containerClass = 'border-blue-300 bg-blue-50/20';
                  titleClass = 'text-blue-950 font-bold';
                  badgeClass = 'bg-blue-100 text-blue-800 font-mono font-bold';
                  descClass = 'text-blue-900';
                } else if (card.themeColor === 'purple') {
                  containerClass = 'border-purple-300 bg-purple-50/20';
                  titleClass = 'text-purple-950 font-bold';
                  badgeClass = 'bg-purple-100 text-purple-800 font-mono font-bold';
                  descClass = 'text-purple-900';
                }

                return (
                  <div
                    key={card.id}
                    className={`rounded-2xl border p-4 transition-all relative flex flex-col justify-between ${containerClass} ${
                      isEditing ? 'ring-2 ring-indigo-500 shadow-md bg-white' : 'hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Header of the card */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={cardTitleDraft}
                            onChange={(e) => setCardTitleDraft(e.target.value)}
                            className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 w-full mr-2"
                          />
                        ) : (
                          <span className={`text-xs ${titleClass}`}>{card.title}</span>
                        )}

                        {isEditing ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              value={cardDurationDraft}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCardDurationDraft(val);
                                setCardBadgeDraft(`${val} 分钟${val > 0 ? ` (${(val / 60).toFixed(1)}h)` : ''}`);
                              }}
                              className="w-16 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-1"
                            />
                            <span className="text-[10px] text-slate-500">min</span>
                          </div>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap shrink-0 ${badgeClass}`}>
                            {card.badgeText}
                          </span>
                        )}
                      </div>

                      {/* Description Body (The exact editable explanation text) */}
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            编辑特殊清洗说明内容 (工艺员):
                          </label>
                          <textarea
                            rows={3}
                            value={cardDescDraft}
                            onChange={(e) => setCardDescDraft(e.target.value)}
                            className="w-full p-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                          />
                        </div>
                      ) : (
                        <p className={`text-xs leading-relaxed mt-1 ${descClass}`}>
                          {card.description}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action / Metadata strip */}
                    <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 text-[10px] font-mono">
                        {card.lastModifiedBy || '工艺员核定'} · {card.lastModifiedAt?.split(' ')[0] || '2026-09-14'}
                      </span>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingCardId(null)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCard(card.id)}
                            className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-2xs flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            <span>保存说明</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEditCard(card)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 hover:bg-white text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
                        >
                          <Edit3 className="w-3 h-3 text-slate-600" />
                          <span>修改说明内容</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CRAFT CONFIRMATION DESK (Requirement 1: 是否特殊清洗由工艺员录入，每个新产品都需要确认) */}
      {/* ========================================================================= */}
      {subTab === 'craft_confirm' && (
        <div className="space-y-4">
          {/* Pending Confirmations Alert */}
          {pendingCraftCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">存在 {pendingCraftCount} 个由计划员刚录入的新产品型号待工艺员确认！</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    根据工艺规范，每一个新产品都必须由工艺员录入清洗特性、确认是否特殊清洗及白名单后方可发布排产。
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-900 font-bold font-mono text-[11px] shrink-0">
                一物一审制
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column: Product List & Status */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>产品型号档案清单</span>
                <span className="text-[10px] text-slate-500 font-mono">共 {productModels.length} 款</span>
              </h3>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {productModels.map((p) => {
                  const isSelected = p.model_code === selectedConfirmModelCode;
                  const isPending = p.approval_status === 'PENDING_CRAFT_APPROVAL' || !p.craft_confirmed;

                  return (
                    <button
                      key={p.model_code}
                      onClick={() => setSelectedConfirmModelCode(p.model_code)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-mono font-black text-slate-900">
                            {p.model_code}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                            {p.name}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isPending ? '待工艺确认' : '已放行'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>清洗: {p.special_cleaning ? '3.0h 特殊' : '2.0h 普通'}</span>
                        <span>{p.allowed_reactors.length} 台可用釜</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 2 Columns: Craft Confirmation Form */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-emerald-600" />
                    工艺员核定与确认放行面板
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    当前核定型号: <strong className="font-mono text-slate-800">{currentConfirmModel?.model_code}</strong> ({currentConfirmModel?.name})
                  </p>
                </div>

                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                  currentConfirmModel?.craft_confirmed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {currentConfirmModel?.craft_confirmed
                    ? `已由 ${currentConfirmModel.craft_confirmed_by || '工艺员'} 确认放行`
                    : '待工艺员录入并放行'}
                </span>
              </div>

              <form onSubmit={handleCraftConfirmProduct} className="space-y-4 text-xs">
                {/* 1. Special Cleaning Setting (Requirement 1: 是否特殊清洗由工艺员录入) */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Droplet className="w-4 h-4 text-emerald-600" />
                        是否特殊清洗 (Special Deep Wash Required):
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        含特殊氟化添加剂、强腐蚀离子或高镍配方需强制执行 180 分钟 (3.0h) 深度三级冲洗
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCraftSpecialClean(true)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                          craftSpecialClean
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        是 (执行 3.0h 特殊洗釜)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCraftSpecialClean(false)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                          !craftSpecialClean
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        否 (执行 2.0h 标准 CIP)
                      </button>
                    </div>
                  </div>

                  {craftSpecialClean && (
                    <div className="pt-2 border-t border-emerald-200/60">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        特殊清洗触发范围 (Trigger Direction):
                      </label>
                      <select
                        value={craftSpecialScope}
                        onChange={(e) => setCraftSpecialScope(e.target.value as SpecialScope)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium text-slate-800"
                      >
                        <option value="EITHER">任一侧为特殊 (进出均强制执行 3.0h 特殊清洗)</option>
                        <option value="ENTER">转入该型号时 (仅在转入该型号前执行 3.0h)</option>
                        <option value="LEAVE">转出该型号时 (仅在该型号生产后执行 3.0h)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* 2. Standard Batch Hours & Recipe Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      标准批次反应与制备总工时 (Hours):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="4"
                        max="36"
                        value={craftStdHours}
                        onChange={(e) => setCraftStdHours(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:bg-white"
                      />
                      <span className="text-slate-500 font-mono">小时/批</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      计划员录入的初始起订量 (kg):
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${currentConfirmModel?.min_order_kg || 1000} kg`}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-600"
                    />
                  </div>
                </div>

                {/* 3. Recipe Notes */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    工艺配方要点与防污染控制要求 (Recipe Technical Notes):
                  </label>
                  <textarea
                    rows={2}
                    value={craftRecipeNotes}
                    onChange={(e) => setCraftRecipeNotes(e.target.value)}
                    placeholder="例如：新型双盐添加剂，冰水循环回水控温<=20℃，取样水分严格<=12ppm..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white focus:outline-hidden leading-relaxed"
                  />
                </div>

                {/* 4. Reactor Whitelist Multi-Select */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    核定可用反应釜白名单 (Reactor Whitelist):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {reactors.map((r) => {
                      const isChecked = craftAllowedReactors.includes(r.reactor_id);
                      return (
                        <label
                          key={r.reactor_id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked
                              ? 'border-blue-500 bg-blue-50/60 font-bold text-blue-950'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCraftAllowedReactors([...craftAllowedReactors, r.reactor_id]);
                                } else {
                                  setCraftAllowedReactors(craftAllowedReactors.filter((id) => id !== r.reactor_id));
                                }
                              }}
                              className="rounded text-blue-600"
                            />
                            <span className="font-mono text-xs">{r.reactor_id}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal">{r.rated_kg / 1000}t</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    工艺员确认放行后，排产引擎将自动采用最新洗釜时长与可用设备白名单。
                  </span>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>确认并放行型号工艺标准</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PLANNER PRODUCT ENTRY FORM (Requirement 1: 产品型号由计划员录入)       */}
      {/* ========================================================================= */}
      {subTab === 'planner_entry' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-indigo-600" />
                  计划员新产品型号录入登记表
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  计划员负责录入产品基础档案与交期起订批量，录入后自动转交工艺员核定特殊清洗与工艺路线
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-800 font-mono font-bold text-xs">
                生管 PMC 职责
              </span>
            </div>

            <form onSubmit={handlePlannerCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    产品型号编码 (Model Code) *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：SIM-MODEL-NEX-07"
                    value={newModelCode}
                    onChange={(e) => setNewModelCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    产品全称 / 品名描述 *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：半固态超高能量密度动力电解液 G"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    建议最小起订批量 (Min Order kg):
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={newModelMinKg}
                    onChange={(e) => setNewModelMinKg(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    目标客户群 / 适用电池体系:
                  </label>
                  <input
                    type="text"
                    placeholder="如：宁德时代/亿纬锂能 5C超充体系"
                    value={newModelCustomer}
                    onChange={(e) => setNewModelCustomer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  研发配方背景说明与交付需求:
                </label>
                <textarea
                  rows={2}
                  value={newModelDesc}
                  onChange={(e) => setNewModelDesc(e.target.value)}
                  placeholder="请输入该型号相关业务背景，便于工艺员快速核定清洗与工艺路线..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  录入后状态将初始化为【待工艺确认】，并自动列入工艺员待办审批列表。
                </span>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>提交录入并推送工艺确认</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. REACTOR PARAMETERS (Requirement 2: 反应釜的参数由工艺员维护)             */}
      {/* ========================================================================= */}
      {subTab === 'reactor_params' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Reactor List */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>反应釜物理台账</span>
                <span className="text-[10px] text-slate-500 font-mono">共 {reactors.length} 台</span>
              </h3>

              <div className="space-y-2">
                {reactors.map((r) => {
                  const isSelected = r.reactor_id === selectedReactorId;
                  return (
                    <button
                      key={r.reactor_id}
                      onClick={() => setSelectedReactorId(r.reactor_id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-500/20'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-slate-900">{r.reactor_id}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                          {r.rated_kg / 1000} t 釜
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 line-clamp-1">{r.reactor_name}</div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                        <span>{r.location.split(' ')[0]}</span>
                        <span className="text-emerald-700">{r.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 2 Columns: Parameter Maintenance Form */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-purple-600" />
                    反应釜工艺与物理技术参数维护
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    维护设备: <strong className="font-mono text-purple-900">{reactorDraft.reactor_id}</strong> ({reactorDraft.reactor_name})
                  </p>
                </div>

                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                  工艺员权限
                </span>
              </div>

              <form onSubmit={handleSaveReactorParams} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">反应釜设备名称:</label>
                    <input
                      type="text"
                      value={reactorDraft.reactor_name}
                      onChange={(e) => setReactorDraft({ ...reactorDraft, reactor_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">物理容积 (m³):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={reactorDraft.volume_m3 || 7.2}
                      onChange={(e) => setReactorDraft({ ...reactorDraft, volume_m3: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">最小投料能力 (min_kg):</label>
                    <input
                      type="number"
                      value={reactorDraft.min_kg}
                      onChange={(e) => setReactorDraft({ ...reactorDraft, min_kg: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">最大装料上限 (max_kg):</label>
                    <input
                      type="number"
                      value={reactorDraft.max_kg}
                      onChange={(e) => setReactorDraft({ ...reactorDraft, max_kg: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">变频搅拌转速 (rpm):</label>
                    <input
                      type="number"
                      value={reactorDraft.agitation_rpm || 160}
                      onChange={(e) => setReactorDraft({ ...reactorDraft, agitation_rpm: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">标准工作温控 (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={reactorDraft.temperature || 20.0}
                      onChange={(e) => setReactorDraft({ ...reactorDraft, temperature: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="p-3 bg-purple-50/40 border border-purple-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">专釜专用隔离模式 (Exclusive Isolation Mode):</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      开启后该釜仅限生产允许的指定专属型号，避免高镍/高腐蚀添加剂交叉污染
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reactorDraft.exclusive_mode}
                      onChange={(e) => setReactorDraft({ ...reactorDraft, exclusive_mode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">物理安装位置与管线备注:</label>
                  <input
                    type="text"
                    value={reactorDraft.location}
                    onChange={(e) => setReactorDraft({ ...reactorDraft, location: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    工艺员修改后立即持久化至实时数据库，并在排产引擎分批时生效。
                  </span>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>保存反应釜工艺参数</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
