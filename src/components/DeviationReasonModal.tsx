import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Building,
  User,
  ShieldAlert,
  X,
  HelpCircle,
  TrendingDown,
  Sparkles,
  Zap,
  RotateCcw
} from 'lucide-react';
import {
  BatchTask,
  DeviationCategory,
  DEVIATION_CATEGORIES,
  DeviationType,
  LanguageCode
} from '../types/aps';
import { calculateBatchDeviation } from '../utils/apsEngine';

interface DeviationReasonModalProps {
  batch: BatchTask;
  isOpen: boolean;
  onClose: () => void;
  lang?: LanguageCode;
  onSave: (
    batchId: string,
    updates: {
      actual_start_time?: string;
      actual_end_time?: string;
      deviation_type?: DeviationType;
      deviation_minutes?: number;
      deviation_category?: DeviationCategory;
      deviation_reason: string;
      corrective_action?: string;
      responsible_dept?: string;
      responsible_person?: string;
      reported_at: string;
      is_reason_submitted: boolean;
    }
  ) => void;
}

export const DeviationReasonModal: React.FC<DeviationReasonModalProps> = ({
  batch,
  isOpen,
  onClose,
  lang = 'zh',
  onSave
}) => {
  if (!isOpen) return null;

  const initialDev = calculateBatchDeviation(batch);

  // Form states
  const [actualStart, setActualStart] = useState<string>(
    batch.actual_start_time || batch.plan_start_time
  );
  const [actualEnd, setActualEnd] = useState<string>(
    batch.actual_end_time || (batch.is_actual ? '2026-09-14 15:30' : '')
  );

  const [category, setCategory] = useState<DeviationCategory>(
    batch.deviation_category || (initialDev.deviationType === 'DELAY_START' ? 'RAW_MATERIAL_DELAY' : 'EQUIPMENT_FAULT')
  );

  const [reason, setReason] = useState<string>(
    batch.deviation_reason || ''
  );

  const [action, setAction] = useState<string>(
    batch.corrective_action || ''
  );

  const [dept, setDept] = useState<string>(
    batch.responsible_dept || DEVIATION_CATEGORIES.find((c) => c.id === category)?.dept || (lang === 'en' ? 'Production Dept' : lang === 'ms' ? 'Jabatan Pengeluaran' : '生产车间')
  );

  const [person, setPerson] = useState<string>(
    batch.responsible_person || (lang === 'en' ? 'Supervisor Li' : lang === 'ms' ? 'Penyelia Li' : '李班长')
  );

  const quickTemplates: Record<DeviationCategory, { reason: string; action: string }> = {
    RAW_MATERIAL_DELAY: {
      reason: lang === 'en'
        ? 'High-purity organic solvent tanker customs clearance & lab sampling delayed by 1.0h, workshop awaiting raw materials.'
        : lang === 'ms'
        ? 'Pelepasan kastam lori tangki pelarut organik ketulenan tinggi & pensampelan makmal lewat 1.0 jam, talian bengkel menunggu bahan mentah.'
        : '高纯有机溶剂槽车进厂报关及取样化验耗时超出预期 1.0 小时，车间管线待料。',
      action: lang === 'en'
        ? 'Coordinated warehouse fast-track release and started nitrogen high-pressure purging to accelerate feed.'
        : lang === 'ms'
        ? 'Gudang telah menyelaraskan pelepasan keutamaan dan memulakan pembersihan tekanan nitrogen untuk mempercepat suapan.'
        : '已协调仓储优先放行，并开启氮气快速保压吹扫，加快后续投料。'
    },
    EQUIPMENT_FAULT: {
      reason: lang === 'en'
        ? 'Pneumatic diaphragm discharge valve slight leak at bottom of reactor; maintenance replaced fluoroelastomer seal & pressure tested for 75 min.'
        : lang === 'ms'
        ? 'Injap diafragma pneumatik di bahagian bawah reaktor bocor sedikit; mekanik menggantikan cincin meterai dan menguji tekanan selama 75 min.'
        : '反应釜底部出料气动隔膜阀微漏，机修紧急更换氟橡胶密封圈并打压检漏 75 分钟。',
      action: lang === 'en'
        ? 'Passed 0.4MPa N2 pressure test, notified night patrol to prioritize this reactor.'
        : lang === 'ms'
        ? 'Lulus ujian tekanan N2 0.4MPa, maklumkan rondaan syif malam untuk memantau reaktor ini.'
        : '已完成 0.4MPa 氮气保压试验合格，通知夜班巡检将该釜列为重点监控。'
    },
    QC_RETEST: {
      reason: lang === 'en'
        ? 'Karl Fischer water content initial test 18ppm exceeded 15ppm limit, required 2nd dehydration stirring & re-test for 90 min.'
        : lang === 'ms'
        ? 'Ujian awal kelembapan Karl Fischer 18ppm melebihi had 15ppm, memerlukan pengacauan penyahairan ke-2 dan ujian semula 90 min.'
        : '取样卡尔费休水分初测 18ppm 略超 15ppm 标准，执行二次脱水搅拌与复测等待 90 分钟。',
      action: lang === 'en'
        ? 'Activated molecular sieve cyclic filtration; passed 2nd test (11ppm) and released for filling.'
        : lang === 'ms'
        ? 'Mengaktifkan penapisan kitaran ayakan molekul; lulus ujian ke-2 (11ppm) dan dilepaskan untuk pengisian.'
        : '追加开启分子筛循环过滤装置，二次检测合格 (11ppm) 后放行灌装。'
    },
    CIP_OVERTIME: {
      reason: lang === 'en'
        ? 'Switching from high-nickel corrosive model caused conductivity exceeding standard, added hot solvent circulation wash for 1.5h.'
        : lang === 'ms'
        ? 'Pertukaran dari model nikel tinggi menghakis menyebabkan kekonduksian melebihi piawaian, tambah basuhan pelarut panas 1.5j.'
        : '由特殊高镍强腐蚀型号切换时残液清洗检测电导率超标，追加一次高温纯溶剂循环冲洗 1.5 小时。',
      action: lang === 'en'
        ? 'Re-sampled conductivity <0.1uS/cm passed, locked CIP rinsing standard for this chemistry.'
        : lang === 'ms'
        ? 'Sampel semula kekonduksian <0.1uS/cm lulus, kunci piawaian pembilasan CIP untuk formula ini.'
        : '重新取样电导率 <0.1μS/cm 达标放行，固化该体系清洗冲洗标准。'
    },
    MANPOWER_HANDOVER: {
      reason: lang === 'en'
        ? 'Extended shift handover safety briefing & PPE inspection delayed feeding by 25 min.'
        : lang === 'ms'
        ? 'Taklimat keselamatan pertukaran syif dan pemeriksaan PPE dilanjutkan, menangguhkan suapan 25 min.'
        : '交接班期间操作工岗位安全例会及劳保穿戴检查延长，导致投料推迟 25 分钟。',
      action: lang === 'en'
        ? 'Optimized handover morning meeting; incoming deputy supervisor reports 15 min early for pre-checks.'
        : lang === 'ms'
        ? 'Optimumkan taklimat pertukaran syif; penolong penyelia baru hadir 15 min awal untuk pra-pemeriksaan.'
        : '优化交接班晨会流程，由接班副班长提前 15 分钟到岗完成自检。'
    },
    UTILITY_FLUCTUATION: {
      reason: lang === 'en'
        ? 'Utility chiller circulation water temp suddenly fluctuated (>28C), system auto-reduced frequency protection waiting 40 min.'
        : lang === 'ms'
        ? 'Suhu air peredaran penyejuk utiliti turun naik tiba-tiba (>28C), perlindungan auto menunggu penyejukan 40 min.'
        : '公用工程冷水机循环水温突发波动 (>28℃)，系统自动降频保护等待降温 40 分钟。',
      action: lang === 'en'
        ? 'Power workshop switched to standby plate heat exchanger; temperature restored to 18C.'
        : lang === 'ms'
        ? 'Bengkel kuasa bertukar ke penukar haba plat sandaran; suhu kembali stabil pada 18C.'
        : '动力车间已切入备用板式换热器，釜内温度恢复至 18℃ 恒温。'
    },
    ORDER_URGENT_CHANGE: {
      reason: lang === 'en'
        ? 'PMC dispatched urgent priority rush order, dispatcher rearranged reactor sequence.'
        : lang === 'ms'
        ? 'PMC mengeluarkan pesanan segera pelanggan utama, penyelia melaraskan urutan reaktor semasa.'
        : 'PMC 下发重点客户紧急订单加塞插单要求，调度调整当前釜生产次序。',
      action: lang === 'en'
        ? 'Re-verified whitelist and wash matrix to ensure zero cross-contamination before execution.'
        : lang === 'ms'
        ? 'Sahkan semula senarai putih dan matriks basuhan untuk elak pencemaran sebelum mula.'
        : '重新校核白名单与清洗矩阵，确保无交叉污染后执行生产。'
    },
    OTHER: {
      reason: lang === 'en' ? 'Fine-tuned process rhythm based on actual shopfloor conditions.' : lang === 'ms' ? 'Laraskan rentak proses mengikut keadaan sebenar bengkel.' : '现场根据实际工况微调工艺节拍。',
      action: lang === 'en' ? 'Continuous monitoring of batch stage quality and yield.' : lang === 'ms' ? 'Pemantauan berterusan kualiti dan hasil setiap peringkat kelompok.' : '持续监控批次各节点质量指标与收率。'
    }
  };

  const handleApplyTemplate = (cat: DeviationCategory) => {
    setCategory(cat);
    const matched = DEVIATION_CATEGORIES.find((c) => c.id === cat);
    if (matched) {
      setDept(matched.dept);
    }
    const tpl = quickTemplates[cat];
    if (tpl) {
      setReason(tpl.reason);
      setAction(tpl.action);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert(lang === 'en' ? 'Please enter the detailed root cause for this deviation!' : lang === 'ms' ? 'Sila masukkan penerangan terperinci tentang punca sisihan ini!' : '请填写异常及偏差详细原因说明！');
      return;
    }

    // Recalculate deviation
    const tempBatch: BatchTask = {
      ...batch,
      actual_start_time: actualStart,
      actual_end_time: actualEnd || undefined
    };
    const devCalc = calculateBatchDeviation(tempBatch);

    onSave(batch.batch_id, {
      actual_start_time: actualStart,
      actual_end_time: actualEnd || undefined,
      deviation_type: devCalc.deviationType,
      deviation_minutes: devCalc.deviationMinutes,
      deviation_category: category,
      deviation_reason: reason,
      corrective_action: action,
      responsible_dept: dept,
      responsible_person: person,
      reported_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      is_reason_submitted: true
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-amber-500/10 via-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>{lang === 'en' ? 'Working Hours Deviation & Root-Cause Confirmation' : lang === 'ms' ? 'Pengesahan Sisihan Masa & Punca Anomali' : '生产工时偏差与异常归因确认'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono font-bold">
                  {batch.batch_id}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'en' ? 'Plan baseline is immutable · Record actual shopfloor times and root cause for traceability' : lang === 'ms' ? 'Garis asas pelan dikunci · Masukkan masa sebenar & punca anomali untuk penjejakan' : '计划基准时间已锁定 · 请录入现场实际时间与异常原因以闭环追溯'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* 1. Plan Baseline vs Actual Execution Comparison Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'en' ? 'Hours Baseline Comparison (Plan Immutable vs Shopfloor Actual)' : lang === 'ms' ? 'Perbandingan Garis Asas Masa (Pelan Kekal vs Sebenar Bengkel)' : '工时基准对比 (计划恒定 vs 现场实际)'}</span>
              </span>
              <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {lang === 'en' ? 'Reactor:' : lang === 'ms' ? 'Reaktor:' : '釜号:'} {batch.assigned_reactor_id} · {batch.batch_qty_kg}kg
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
              {/* Plan Baseline */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <span>🔒 {lang === 'en' ? 'Plan Baseline (Immutable)' : lang === 'ms' ? 'Garis Asas Pelan (Kekal)' : '计划基准 (锁定不变)'}</span>
                  </span>
                  <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {lang === 'en' ? 'Reference' : lang === 'ms' ? 'Rujukan' : '恒定参考'}
                  </span>
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>{lang === 'en' ? 'Plan Start:' : lang === 'ms' ? 'Mula Pelan:' : '计划开工:'}</span>
                    <span className="font-bold text-slate-800">{batch.plan_start_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === 'en' ? 'Plan End:' : lang === 'ms' ? 'Tamat Pelan:' : '计划完工:'}</span>
                    <span className="font-bold text-slate-800">{batch.plan_end_time}</span>
                  </div>
                </div>
              </div>

              {/* Actual Execution Input */}
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <span>⚡ {lang === 'en' ? 'Shopfloor Actual' : lang === 'ms' ? 'Sebenar Bengkel' : '现场实际时间'}</span>
                  </span>
                  <span className="text-[10px] font-mono bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-900 font-bold">
                    {lang === 'en' ? 'Editable' : lang === 'ms' ? 'Boleh edit' : '可编辑填报'}
                  </span>
                </div>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium shrink-0">{lang === 'en' ? 'Actual Start:' : lang === 'ms' ? 'Mula Sebenar:' : '实际开工:'}</span>
                    <input
                      type="text"
                      value={actualStart}
                      onChange={(e) => setActualStart(e.target.value)}
                      placeholder="YYYY-MM-DD HH:mm"
                      className="font-mono text-xs px-2 py-0.5 bg-white border border-amber-300 rounded text-slate-900 w-36 text-right focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium shrink-0">{lang === 'en' ? 'Actual End:' : lang === 'ms' ? 'Tamat Sebenar:' : '实际完工:'}</span>
                    <input
                      type="text"
                      value={actualEnd}
                      onChange={(e) => setActualEnd(e.target.value)}
                      placeholder={lang === 'en' ? 'Leave blank if in-progress' : lang === 'ms' ? 'Kosongkan jika berjalan' : '未完工可留空'}
                      className="font-mono text-xs px-2 py-0.5 bg-white border border-amber-300 rounded text-slate-900 w-36 text-right focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Quick Category Templates Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>{lang === 'en' ? 'Root Cause Category (Click to Apply Template)' : lang === 'ms' ? 'Kategori Punca Anomali (Klik untuk Templat)' : '异常分类归因 (点击快速套用模板)'}</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {lang === 'en' ? 'Auto-fills department and description' : lang === 'ms' ? 'Isi automatik jabatan & penerangan' : '选择分类自动填充部门与参考说明'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEVIATION_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleApplyTemplate(cat.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs text-amber-950 font-bold'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] truncate">
                        {lang === 'en'
                          ? cat.id.replace(/_/g, ' ')
                          : lang === 'ms'
                          ? cat.id === 'RAW_MATERIAL_DELAY' ? 'Lewat Bahan Mentah' : cat.id === 'EQUIPMENT_FAULT' ? 'Kerosakan Alatan' : cat.id === 'QC_RETEST' ? 'Ujian Semula QC' : cat.id === 'CIP_OVERTIME' ? 'Lebih Masa CIP' : cat.id === 'MANPOWER_HANDOVER' ? 'Penyerahan Syif' : cat.id === 'UTILITY_FLUCTUATION' ? 'Turun Naik Utiliti' : cat.id === 'ORDER_URGENT_CHANGE' ? 'Pesanan Segera' : 'Lain-lain'
                          : cat.label.split('/')[0]}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{cat.dept}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Reason Description & Corrective Action */}
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-800 flex items-center justify-between mb-1">
                <span>{lang === 'en' ? 'Detailed Reason Description *' : lang === 'ms' ? 'Penerangan Terperinci Sebab *' : '异常详细原因说明 *'}</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {lang === 'en' ? 'Record shopfloor condition & delay root cause' : lang === 'ms' ? 'Rekod keadaan bengkel & punca kelewatan' : '请如实记录现场工况与延迟主因'}
                </span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                placeholder={lang === 'en' ? 'e.g. Raw material delivery delayed by 1h...' : lang === 'ms' ? 'cth. Penghantaran bahan mentah lewat 1j...' : '例如：高纯溶剂槽车到料延迟 1.0 小时，导致现场待料未能按时投料...'}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 flex items-center justify-between mb-1">
                <span>{lang === 'en' ? 'Corrective Action (Optional)' : lang === 'ms' ? 'Tindakan Pembetulan (Pilihan)' : '纠偏与改进措施 (可选)'}</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {lang === 'en' ? 'Actions taken or preventive measures' : lang === 'ms' ? 'Tindakan yang diambil atau langkah pencegahan' : '针对该异常已采取或后续预防措施'}
                </span>
              </label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder={lang === 'en' ? 'e.g. Expedited QC testing and accelerated downstream mixing...' : lang === 'ms' ? 'cth. Ujian QC dipercepat dan percampuran hiliran dipercepatkan...' : '例如：加急质检快检，并协调后续混合搅拌提速追赶进度...'}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* 4. Responsible Department & Person */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'en' ? 'Responsible Dept' : lang === 'ms' ? 'Jabatan Bertanggungjawab' : '责任部门'}</span>
              </label>
              <input
                type="text"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                placeholder={lang === 'en' ? 'Dept name' : lang === 'ms' ? 'Nama jabatan' : '责任部门名称'}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'en' ? 'Responsible / Reporter' : lang === 'ms' ? 'Orang Bertanggungjawab' : '责任人 / 填报人'}</span>
              </label>
              <input
                type="text"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder={lang === 'en' ? 'Name' : lang === 'ms' ? 'Nama' : '责任人姓名'}
                className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleApplyTemplate('OTHER')}
              className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Reset to Default' : lang === 'ms' ? 'Tetap Semula Lalai' : '重置为默认工况'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {lang === 'en' ? 'Cancel' : lang === 'ms' ? 'Batal' : '取消'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-98 shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'en' ? 'Save & Confirm Root Cause' : lang === 'ms' ? 'Simpan & Sahkan Punca' : '保存并确认异常归因'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

