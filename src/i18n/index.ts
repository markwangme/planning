import { LanguageCode } from '../types/aps';

export interface Translations {
  // Common terms & buttons
  common: {
    all: string;
    cancel: string;
    confirm: string;
    close: string;
    save: string;
    search: string;
    exportCsv: string;
    filter: string;
    status: string;
    action: string;
    refresh: string;
    loading: string;
    details: string;
    locked: string;
    running: string;
    paused: string;
    completed: string;
    pending: string;
    warning: string;
    critical: string;
    high: string;
    medium: string;
    low: string;
    reactor: string;
    model: string;
    batch: string;
    order: string;
    qtyKg: string;
    hours: string;
    minutes: string;
    urgent: string;
  };

  // Header & Global Nav
  header: {
    appName: string;
    appSubtitle: string;
    reviewTag: string;
    pubDraftVersion: (pub: string, draft: string) => string;
    freezeActive: string;
    btnSimulate: string;
    btnWhatIf: string;
    btnCtp: string;
    btnExceptions: string;
    btnPublish: string;
    demoBadgeActive: string;
    demoBadgeInactive: string;
    tabGantt: string;
    tabGanttDesc: string;
    tabReporting: string;
    tabReportingDesc: string;
    tabDashboard: string;
    tabDashboardDesc: string;
    tabRules: string;
    tabRulesDesc: string;
    tabMes: string;
    tabMesDesc: string;
    tabAdmin: string;
    tabAdminDesc: string;
    allPlants: string;
    roles: {
      PLANNER: string;
      OPERATOR: string;
      DISPATCHER: string;
      VIEWER: string;
      ADMIN: string;
    };
  };

  // Demo Watermark & Notices
  demoWatermark: {
    title: string;
    subtitle: string;
    toastOn: string;
    toastOff: string;
    blockedTitle: string;
  };

  // Gantt Chart & Workstation
  gantt: {
    tabIndustrialBoard: string;
    tabGantt: string;
    tabDeviation: string;
    freezeZoneTitle: string;
    freezeZoneDesc: string;
    kpiMakespan: string;
    kpiWashHours: string;
    kpiOee: string;
    kpiBatches: string;
    kpiZeroWash: string;
    scopeDay: string;
    scopeWeek: string;
    scopeMonth: string;
    filterAll: string;
    filterLocked: string;
    filterWarning: string;
    filterRunning: string;
    filterZeroWash: string;
    reactorColTitle: string;
    capacity: string;
    batchDetails: string;
    preWash: string;
    currStep: string;
    estStart: string;
    estEnd: string;
    today: string;
    locateToday: string;
    prevPeriod: string;
    nextPeriod: string;
    zoomMonth: string;
    zoomWeek: string;
    zoomDetail: string;
    exitFullscreen: string;
    fullscreenTitle: string;
    deviationAlert: string;
    pendingDeviationCount: (n: number) => string;
    deviationAlertDesc: string;
    btnLogDeviation: (id?: string) => string;
    btnViewDeviationList: string;
    shiftModeLabel: string;
    shiftSingle: string;
    shiftDouble: string;
    shiftTriple: string;
    searchPlaceholder: string;
    allReactors: (n: number) => string;
  };

  // Shift Reporting
  reporting: {
    title: string;
    tag: string;
    subtitle: string;
    batchSelect: string;
    stepsTitle: string;
    reportingTitle: string;
    operator: string;
    shiftPeriod: string;
    estEndTime: string;
    pauseReason: string;
    stepStatus: string;
    qcSection: string;
    qcReleaseStatus: string;
    qcMoisture: string;
    fillSection: string;
    fillCumulativeGood: string;
    btnStart: string;
    btnPause: string;
    btnResume: string;
    btnFinish: string;
    btnSubmit: string;
    interlockQcHold: string;
    receiptTitle: string;
    receiptIdempotent: string;
    receiptRealtime: string;
    ruleNoticeOrderSettlement: string;
    ruleNoticeStepRun: string;
    quantityRuleSummary: string;
    ops: {
      SOLVENT: { name: string; label: string; code: string; short: string; desc: string };
      SALT: { name: string; label: string; code: string; short: string; desc: string };
      MIX: { name: string; label: string; code: string; short: string; desc: string };
      QC: { name: string; label: string; code: string; short: string; desc: string };
      FILL: { name: string; label: string; code: string; short: string; desc: string };
      CLEAN: { name: string; label: string; code: string; short: string; desc: string };
    };
    statusMap: {
      PROCESSING: string;
      FINISHED: string;
      PAUSED: string;
      PENDING: string;
      NOT_APPLICABLE: string;
    };
  };

  // Dashboard & Orders
  dashboard: {
    title: string;
    subtitle: string;
    otdRate: string;
    pendingOrdersCount: string;
    inProgressOrders: string;
    completedOrders: string;
    orderNo: string;
    customer: string;
    targetModel: string;
    orderQty: string;
    fulfilledQty: string;
    dueDate: string;
    fulfillmentRate: string;
    priorityUrgent: string;
    priorityHigh: string;
    priorityNormal: string;
    btnNewOrder: string;
  };

  // CTP Simulator Modal
  ctpModal: {
    title: string;
    badge: string;
    subtitle: string;
    customerCode: string;
    productModel: string;
    orderQty: string;
    reqDelivery: string;
    allowSplit: string;
    btnSimulate: string;
    atbStatus: string;
    atbReady: string;
    atbShortage: string;
    promisedFpsd: string;
    leadTime: string;
    suggestedBatches: string;
    btnAdopt: string;
    btnCancel: string;
    liveApiTest: string;
    inquiryTitle: string;
    customer: string;
    quantity: string;
    priority: string;
    customerDueDate: string;
    downwardSplit: string;
    atbTitle: string;
    feasible: string;
    infeasible: string;
    promisedDate: string;
    washDuration: string;
    assignedReactor: string;
    batchBreakdown: string;
    cancelBtn: string;
    adoptBtn: string;
  };

  // What-If Modal
  whatIfModal: {
    title: string;
    subtitle: string;
    strategySetupMin: string;
    strategyOtd: string;
    strategyLoadBalance: string;
    kpiMakespan: string;
    kpiWashHours: string;
    kpiAvgOee: string;
    btnAdoptStrategy: string;
  };

  // Exceptions Center
  exceptionsModal: {
    title: string;
    subtitle: string;
    unresolvedCount: (count: number) => string;
    colCode: string;
    colTitle: string;
    colEntity: string;
    colSeverity: string;
    colDept: string;
    colRemediation: string;
  };
}

export const i18nDict: Record<LanguageCode, Translations> = {
  zh: {
    common: {
      all: '全部',
      cancel: '取消',
      confirm: '确认',
      close: '关闭',
      save: '保存',
      search: '搜索...',
      exportCsv: '导出 CSV',
      filter: '筛选',
      status: '状态',
      action: '操作',
      refresh: '刷新',
      loading: '加载中...',
      details: '详情',
      locked: '已锁定',
      running: '进行中',
      paused: '暂停中',
      completed: '已完成',
      pending: '待开始',
      warning: '预警',
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低',
      reactor: '反应釜',
      model: '型号',
      batch: '批次',
      order: '工单',
      qtyKg: '批量 (kg)',
      hours: '小时',
      minutes: '分钟',
      urgent: '加急'
    },
    header: {
      appName: 'NOVOLYTE 诺莱特电解液智排',
      appSubtitle: '高精度反应釜排产与过程追踪系统 (V4.0)',
      reviewTag: '工业精细评审标杆',
      pubDraftVersion: (pub, draft) => `已发布 ${pub} / 草稿 ${draft}`,
      freezeActive: '24H 冻结区已生效',
      btnSimulate: '排产重算',
      btnWhatIf: 'What-If 对比',
      btnCtp: 'CTP 试算',
      btnExceptions: '异常监控',
      btnPublish: '发布主计划',
      demoBadgeActive: '演示试算中',
      demoBadgeInactive: '正式模式',
      tabGantt: '智能排产',
      tabGanttDesc: '甘特图排程',
      tabReporting: '工序报工',
      tabReportingDesc: '工序报工质检',
      tabDashboard: '订单看板',
      tabDashboardDesc: '订单交期与负荷',
      tabRules: '型号与规则',
      tabRulesDesc: '型号与白名单',
      tabMes: 'MES与接口',
      tabMesDesc: '系统架构与API',
      tabAdmin: '后台配置',
      tabAdminDesc: '主数据与数据库',
      allPlants: '跨厂总览',
      roles: {
        PLANNER: '计划员',
        OPERATOR: '工艺员',
        DISPATCHER: '生产主管',
        VIEWER: '只读访客',
        ADMIN: '系统管理'
      }
    },
    demoWatermark: {
      title: '【演示草稿-主数据未确认-禁止发布】',
      subtitle: 'DEMO TRIAL MODE · 服务端 API 硬拦截 · 严禁用于车间实际执行',
      toastOn: '已开启【演示试算模式】：图表叠加水印，服务端将拦截正式发布',
      toastOff: '已切换回【正式生产模式】',
      blockedTitle: '演示模式发布阻断'
    },
    gantt: {
      tabIndustrialBoard: '工业标准看板',
      tabGantt: '甘特图工时泳道',
      tabDeviation: '计划 vs 实际偏差清单',
      freezeZoneTitle: '24H 计划冻结区',
      freezeZoneDesc: '严禁挪动已锁定任务，保障当班生产平稳',
      kpiMakespan: '总排程跨度',
      kpiWashHours: '清洗总耗时',
      kpiOee: '综合稼动率',
      kpiBatches: '排产批次数',
      kpiZeroWash: '同型号免洗批次',
      scopeDay: '日 (24H)',
      scopeWeek: '周 (7天)',
      scopeMonth: '月 (30天)',
      filterAll: '全部',
      filterLocked: '已锁定',
      filterWarning: '预警',
      filterRunning: '进行中',
      filterZeroWash: '免洗批次',
      reactorColTitle: '反应釜设备',
      capacity: '标称容量',
      batchDetails: '批次任务详情',
      preWash: '前序洗釜',
      currStep: '当前工序',
      estStart: '计划开始',
      estEnd: '计划结束',
      today: '今日',
      locateToday: '定位今日',
      prevPeriod: '上一周期',
      nextPeriod: '下一周期',
      zoomMonth: '月总览 (30%)',
      zoomWeek: '周视图 (1/5格宽)',
      zoomDetail: '放大 (200%)',
      exitFullscreen: '退出全屏 (ESC)',
      fullscreenTitle: '甘特图独立全屏排产看板',
      deviationAlert: '现场实际工时偏差智能预警',
      pendingDeviationCount: (n) => `${n} 批待填报原因`,
      deviationAlertDesc: '系统检测到现场实际开工/完工与恒定计划基准存在偏差，需录入异常分类、原因及纠偏措施以完成追溯。',
      btnLogDeviation: (id) => id ? `立即录入偏差原因 (${id})` : '立即录入偏差原因',
      btnViewDeviationList: '查看全部清单',
      shiftModeLabel: '开工班次:',
      shiftSingle: '单班',
      shiftDouble: '双班',
      shiftTriple: '三班',
      searchPlaceholder: '搜索批次号 / 型号 / 订单 / 客户...',
      allReactors: (n) => `全部${n}台釜`
    },
    reporting: {
      title: '工序级半日报工工作台',
      tag: '固定六工序 · 防错与阻断',
      subtitle: '每半天人工更新实际事件 · 灌装合格量汇总计入订单',
      batchSelect: '在制批次选择:',
      stepsTitle: '工序流转状态',
      reportingTitle: '单道工序报工录入',
      operator: '操作员:',
      shiftPeriod: '报工时段',
      estEndTime: '预计完成时刻',
      pauseReason: '暂停或延期原因',
      stepStatus: '工序状态',
      qcSection: '取样检测结果状态记录 (仅记录，不做检验自动判定)',
      qcReleaseStatus: '放行状态:',
      qcMoisture: '卡尔费休水分 (标准 ≤ 15 ppm):',
      fillSection: '灌装工序合格灌装数量登记',
      fillCumulativeGood: '累计合格灌装量 (kg) · 核心据此汇总订单数量',
      btnStart: '▶ 开工',
      btnPause: '⏸ 暂停',
      btnResume: '▶ 恢复',
      btnFinish: '✓ 完工',
      btnSubmit: '提交报工',
      interlockQcHold: '【质量放行防错阻断】工序 4 取样检测 (QC) 尚未获得“已放行”终审状态！严禁启动工序 5 灌装包装 (FILL) 作业。',
      receiptTitle: 'RESTful 报工幂等凭证 (POST /api/v1/operations/events)',
      receiptIdempotent: '幂等拦截·重复提交防双重记账',
      receiptRealtime: '实时记账',
      ruleNoticeOrderSettlement: '该工序将更新订单完成数量与达成率，修改数量后重算订单进度。',
      ruleNoticeStepRun: '该工序不增加订单完成数量；同一批次同一时间只允许一道核心生产工序进行中。',
      quantityRuleSummary: '订单数量完成率＝各关联批次累计合格灌装量之和 ÷ 订单量；溶剂投料量、锂盐投料量和混合量不能累加作为订单完成量。',
      ops: {
        SOLVENT: { name: '溶剂投料', label: '溶剂投料', code: 'SOLVENT', short: 'SOLV', desc: '碳酸酯溶剂投料与预混合' },
        SALT: { name: '锂盐投料', label: '锂盐投料', code: 'SALT', short: 'SALT', desc: '高纯LiPF6在手套箱/密闭系统投入' },
        MIX: { name: '混合搅拌', label: '混合搅拌', code: 'MIX', short: 'MIX', desc: '恒温恒压密闭循环搅拌反应' },
        QC: { name: '取样检测', label: '取样检测', code: 'QC', short: 'QC', desc: '水分与游离酸取样检测放行' },
        FILL: { name: '灌装包装', label: '灌装包装', code: 'FILL', short: 'FILL', desc: '充氮密闭桶装/槽车，产出合格品' },
        CLEAN: { name: '独立洗釜', label: '独立洗釜', code: 'CLEAN', short: 'WASH', desc: '前序清洗矩阵独立任务' }
      },
      statusMap: {
        PROCESSING: '进行中',
        FINISHED: '已完成',
        PAUSED: '暂停 (异常中)',
        PENDING: '待开始',
        NOT_APPLICABLE: '不适用 (免洗等)'
      }
    },
    dashboard: {
      title: '订单生产看板与达成追踪',
      subtitle: '实时跟踪各客户订单完成进度、交付准时率 (OTD) 与物料齐套状态',
      otdRate: '准时交付率 (OTD)',
      pendingOrdersCount: '待排产订单',
      inProgressOrders: '生产执行中',
      completedOrders: '已交付完成',
      orderNo: '订单编号',
      customer: '客户名称',
      targetModel: '交付型号',
      orderQty: '订单需求量',
      fulfilledQty: '累计合格灌装量',
      dueDate: '承诺交期',
      fulfillmentRate: '达成率',
      priorityUrgent: '加急 (URG)',
      priorityHigh: '高优先级 (HI)',
      priorityNormal: '普通 (NORM)',
      btnNewOrder: '录入新工单'
    },
    ctpModal: {
      title: 'IPS / CTP 订单可承诺能力推演模拟器',
      badge: 'Copy-on-Write 沙箱',
      subtitle: '在临时内存副本中推演排程时隙与 ATB 齐套状态，杜绝破坏当前已发布的排产主计划',
      customerCode: '客户代码 / 客户名称',
      productModel: '电解液型号',
      orderQty: '订单需求量 (kg)',
      reqDelivery: '期望交期 (EDD)',
      allowSplit: '允许拆批生产 (满批 + 余量尾批)',
      btnSimulate: '开始推演计算',
      atbStatus: '物料齐套 (ATB)',
      atbReady: '齐套可用',
      atbShortage: '缺料预警',
      promisedFpsd: '最早可承诺交期 (FPSD)',
      leadTime: '生产周期 (Lead Time)',
      suggestedBatches: '系统推荐拆批方案',
      btnAdopt: '采纳并转入正式工单',
      btnCancel: '取消关闭',
      liveApiTest: '服务端联调测试',
      inquiryTitle: '订单推演参数表',
      customer: '客户名称 / 代码',
      quantity: '订单需求量 (kg)',
      priority: '优先级设定',
      customerDueDate: '客户期望交期 (EDD)',
      downwardSplit: '允许向下拆批生产',
      atbTitle: '物料齐套 (ATB) 实时校验',
      feasible: '排程测算可行 (Achievable)',
      infeasible: '排程存在超期/缺料风险',
      promisedDate: '最早可承诺交期 (FPSD)',
      washDuration: '洗釜总耗时',
      assignedReactor: '主瓶颈反应釜',
      batchBreakdown: '系统推荐拆批方案 (Mass Balance)',
      cancelBtn: '取消',
      adoptBtn: '采纳并转入正式工单'
    },
    whatIfModal: {
      title: 'What-If 多方案排程场景仿真对比',
      subtitle: '基于相同订单集与主数据，在沙箱中仿真多目标优化策略并进行帕累托评估',
      strategySetupMin: '洗釜最少 (Setup Min)',
      strategyOtd: '交期优先 (OTD First)',
      strategyLoadBalance: '负荷均衡 (Balanced)',
      kpiMakespan: '总跨度 (Makespan)',
      kpiWashHours: '洗釜时间',
      kpiAvgOee: '平均稼动率',
      btnAdoptStrategy: '采纳此方案为工作草稿'
    },
    exceptionsModal: {
      title: 'APS 8 大结构化排产异常监控中心',
      subtitle: '实时跟踪反应釜适配、批次下限、标准工时与冻结期冲突，明确责任链与闭环指引',
      unresolvedCount: (count) => `共 ${count} 项未闭环异常`,
      colCode: '异常代码',
      colTitle: '异常描述',
      colEntity: '关联实体',
      colSeverity: '严重等级',
      colDept: '责任角色 / 部门',
      colRemediation: '整改处置建议'
    }
  },

  en: {
    common: {
      all: 'All',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      save: 'Save',
      search: 'Search...',
      exportCsv: 'Export CSV',
      filter: 'Filter',
      status: 'Status',
      action: 'Action',
      refresh: 'Refresh',
      loading: 'Loading...',
      details: 'Details',
      locked: 'Locked',
      running: 'Running',
      paused: 'Paused',
      completed: 'Done',
      pending: 'Pending',
      warning: 'Warning',
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      reactor: 'Reactor',
      model: 'Model',
      batch: 'Batch',
      order: 'Order',
      qtyKg: 'Qty (kg)',
      hours: 'hrs',
      minutes: 'mins',
      urgent: 'Urgent'
    },
    header: {
      appName: 'NOVOLYTE APS & MES',
      appSubtitle: 'Precision Reactor Scheduling & Process Tracking (V4.0)',
      reviewTag: 'Industrial Gold Standard',
      pubDraftVersion: (pub, draft) => `Pub ${pub} / Draft ${draft}`,
      freezeActive: '24h Freeze Active',
      btnSimulate: 'Reschedule',
      btnWhatIf: 'What-If',
      btnCtp: 'CTP Sim',
      btnExceptions: 'Alerts',
      btnPublish: 'Publish Plan',
      demoBadgeActive: 'Demo Mode',
      demoBadgeInactive: 'Live Mode',
      tabGantt: 'Sched. (Gantt)',
      tabGanttDesc: 'Gantt Schedule',
      tabReporting: 'Shift Rep.',
      tabReportingDesc: 'Progress & QC',
      tabDashboard: 'Order Board',
      tabDashboardDesc: 'OTD & Workload',
      tabRules: 'Rules & Models',
      tabRulesDesc: 'White-list & Wash',
      tabMes: 'MES & APIs',
      tabMesDesc: 'Interfaces & Docs',
      tabAdmin: 'Admin Config',
      tabAdminDesc: 'Master & Database',
      allPlants: 'All Plants',
      roles: {
        PLANNER: 'Planner',
        OPERATOR: 'Process Eng',
        DISPATCHER: 'Production Supervisor',
        VIEWER: 'Viewer',
        ADMIN: 'Admin'
      }
    },
    demoWatermark: {
      title: '[DEMO DRAFT - UNCONFIRMED MASTER DATA - PUBLISH BLOCKED]',
      subtitle: 'DEMO TRIAL MODE · Server-Side Hard Block · Prohibited for Shopfloor Execution',
      toastOn: 'Switched to [Demo Trial Mode]: Watermark active, server will block formal publishing',
      toastOff: 'Switched back to [Formal Production Mode]',
      blockedTitle: 'Demo Mode Publish Blocked'
    },
    gantt: {
      tabIndustrialBoard: 'Std Board (Img 2)',
      tabGantt: 'Gantt Timeline',
      tabDeviation: 'Plan vs Actual Deviations',
      freezeZoneTitle: '24H Freeze Zone',
      freezeZoneDesc: 'Locked tasks cannot be moved; ensures shift dispatch stability',
      kpiMakespan: 'Makespan',
      kpiWashHours: 'Wash Time',
      kpiOee: 'Avg OEE',
      kpiBatches: 'Total Batches',
      kpiZeroWash: 'Zero-Wash Batches',
      scopeDay: 'Day (24H)',
      scopeWeek: 'Week (7D)',
      scopeMonth: 'Month (30D)',
      filterAll: 'All',
      filterLocked: 'Locked',
      filterWarning: 'Warning',
      filterRunning: 'Running',
      filterZeroWash: 'Zero-Wash',
      reactorColTitle: 'Reactor Unit',
      capacity: 'Nominal Cap.',
      batchDetails: 'Batch Task Details',
      preWash: 'Prep Wash',
      currStep: 'Current Step',
      estStart: 'Plan Start',
      estEnd: 'Plan End',
      today: 'Today',
      locateToday: 'Locate Today',
      prevPeriod: 'Previous',
      nextPeriod: 'Next',
      zoomMonth: 'Month (30%)',
      zoomWeek: 'Week (Fit)',
      zoomDetail: 'Zoom (200%)',
      exitFullscreen: 'Exit Fullscreen (ESC)',
      fullscreenTitle: 'Gantt Standalone Workstation',
      deviationAlert: 'Actual Execution Deviation Alert',
      pendingDeviationCount: (n) => `${n} pending reason`,
      deviationAlertDesc: 'Deviations detected between actual MES execution and planned schedule. Root cause tracking required.',
      btnLogDeviation: (id) => id ? `Log Reason (${id})` : 'Log Deviation Reason',
      btnViewDeviationList: 'View All List',
      shiftModeLabel: 'Shifts:',
      shiftSingle: '1-Shift',
      shiftDouble: '2-Shift',
      shiftTriple: '3-Shift',
      searchPlaceholder: 'Search batch / model / order / client...',
      allReactors: (n) => `All ${n} Units`
    },
    reporting: {
      title: 'Shift Progress Reporting Desk',
      tag: '6 Standard Operations · Interlock Protected',
      subtitle: 'Bi-daily shopfloor actual reporting · Only FILL outputs count towards order completion',
      batchSelect: 'Select Active Batch:',
      stepsTitle: 'Process Status Flow',
      reportingTitle: 'Operation Event Entry',
      operator: 'Operator:',
      shiftPeriod: 'Shift Period',
      estEndTime: 'Est. Finish Time',
      pauseReason: 'Pause / Delay Reason',
      stepStatus: 'Operation State',
      qcSection: 'QC Sample Inspection Record (Audit only, no auto pass/fail)',
      qcReleaseStatus: 'QC Release State:',
      qcMoisture: 'Karl Fischer Moisture (Std ≤ 15 ppm):',
      fillSection: 'Filling Good Output Registration',
      fillCumulativeGood: 'Cumulative Good Filled (kg) · Core basis for order progress',
      btnStart: '▶ Start',
      btnPause: '⏸ Pause',
      btnResume: '▶ Resume',
      btnFinish: '✓ Finish',
      btnSubmit: 'Submit Report',
      interlockQcHold: '[QC Interlock Warning] Step 04 QC is not yet RELEASED! Starting Step 05 FILL is strictly prohibited.',
      receiptTitle: 'RESTful Idempotent Receipt (POST /api/v1/operations/events)',
      receiptIdempotent: 'Idempotent Intercept · Duplicate Ignored',
      receiptRealtime: 'Recorded in Real-time',
      ruleNoticeOrderSettlement: 'This operation will update order fulfilled quantity and completion percentage.',
      ruleNoticeStepRun: 'This step does not add to order fulfillment; only 1 core production step permitted per batch at a time.',
      quantityRuleSummary: 'Order completion rate = Total good filled (FILL) ÷ Order qty. Solvent, Salt, and Mix quantities MUST NOT be accumulated.',
      ops: {
        SOLVENT: { name: 'Solvent Feed', label: 'Solvent Feed', code: 'SOLVENT', short: 'SOLV', desc: 'Carbonate solvents feed & premix' },
        SALT: { name: 'Li-Salt Feed', label: 'Li-Salt Feed', code: 'SALT', short: 'SALT', desc: 'High-purity LiPF6 glovebox feed' },
        MIX: { name: 'Mixing & React', label: 'Mixing & React', code: 'MIX', short: 'MIX', desc: 'Isothermal closed loop agitation' },
        QC: { name: 'QC Sampling', label: 'QC Sampling', code: 'QC', short: 'QC', desc: 'Moisture & acid testing for release' },
        FILL: { name: 'Filling & Pack', label: 'Filling & Pack', code: 'FILL', short: 'FILL', desc: 'N2-purged drums/tankers good output' },
        CLEAN: { name: 'Reactor Wash', label: 'Reactor Wash', code: 'CLEAN', short: 'WASH', desc: 'Independent cleaning job matrix' }
      },
      statusMap: {
        PROCESSING: 'Running',
        FINISHED: 'Completed',
        PAUSED: 'Paused (Hold)',
        PENDING: 'Pending',
        NOT_APPLICABLE: 'N/A (Zero-Wash)'
      }
    },
    dashboard: {
      title: 'Order Progress & Fulfillment Board',
      subtitle: 'Real-time tracking of customer orders, On-Time Delivery (OTD), and material readiness',
      otdRate: 'On-Time Delivery (OTD)',
      pendingOrdersCount: 'Pending Orders',
      inProgressOrders: 'In Production',
      completedOrders: 'Delivered / Done',
      orderNo: 'Order No.',
      customer: 'Customer',
      targetModel: 'Product Model',
      orderQty: 'Order Qty',
      fulfilledQty: 'Cumulative Good Filled',
      dueDate: 'Customer Due Date',
      fulfillmentRate: 'Progress %',
      priorityUrgent: 'Urgent (URG)',
      priorityHigh: 'High (HI)',
      priorityNormal: 'Normal (NORM)',
      btnNewOrder: 'New Order'
    },
    ctpModal: {
      title: 'IPS / CTP Order Capable-to-Promise Simulator',
      badge: 'Copy-on-Write Sandbox',
      subtitle: 'Simulate slots and ATB material availability in temporary sandbox without corrupting live plan',
      customerCode: 'Customer Code / Name',
      productModel: 'Electrolyte Model',
      orderQty: 'Order Qty (kg)',
      reqDelivery: 'Requested Due Date (EDD)',
      allowSplit: 'Allow Batch Splitting (Full + Tail Remainder)',
      btnSimulate: 'Run Simulation',
      atbStatus: 'Material Readiness (ATB)',
      atbReady: 'Ready / Fully Allocated',
      atbShortage: 'Shortage Warning',
      promisedFpsd: 'Earliest Promised Date (FPSD)',
      leadTime: 'Production Lead Time',
      suggestedBatches: 'Recommended Batch Split',
      btnAdopt: 'Adopt as Active Order',
      btnCancel: 'Cancel & Close',
      liveApiTest: 'Test Server API',
      inquiryTitle: 'Order Inquiry Parameters',
      customer: 'Customer / Name',
      quantity: 'Order Qty (kg)',
      priority: 'Priority',
      customerDueDate: 'Customer Due Date (EDD)',
      downwardSplit: 'Allow downward batch splitting',
      atbTitle: 'Material Readiness (ATB) Real-time Check',
      feasible: 'Schedule Achievable',
      infeasible: 'Schedule Infeasible / Risk',
      promisedDate: 'Promised Completion Date',
      washDuration: 'Total Wash Duration',
      assignedReactor: 'Bottleneck Reactor',
      batchBreakdown: 'Recommended Batch Breakdown',
      cancelBtn: 'Cancel',
      adoptBtn: 'Adopt & Create Order'
    },
    whatIfModal: {
      title: 'What-If Multi-Scenario Scheduling Comparison',
      subtitle: 'Simulate multi-objective optimization strategies and evaluate Pareto trade-offs in sandbox',
      strategySetupMin: 'Setup Minimize (Min Wash)',
      strategyOtd: 'Due Date Priority (OTD First)',
      strategyLoadBalance: 'Load Balanced (Even Load)',
      kpiMakespan: 'Makespan',
      kpiWashHours: 'Wash Hours',
      kpiAvgOee: 'Avg OEE',
      btnAdoptStrategy: 'Adopt Strategy as Draft'
    },
    exceptionsModal: {
      title: 'APS 8 Structured Scheduling Exceptions Center',
      subtitle: 'Real-time monitoring of reactor mismatch, batch below min, missing standard time, and freeze conflicts',
      unresolvedCount: (count) => `${count} Unresolved Exceptions`,
      colCode: 'Code',
      colTitle: 'Description',
      colEntity: 'Entity',
      colSeverity: 'Severity',
      colDept: 'Responsible Role / Dept',
      colRemediation: 'Remediation Action'
    }
  },

  ms: {
    common: {
      all: 'Semua',
      cancel: 'Batal',
      confirm: 'Sahkan',
      close: 'Tutup',
      save: 'Simpan',
      search: 'Cari...',
      exportCsv: 'Eksport CSV',
      filter: 'Tapis',
      status: 'Status',
      action: 'Tindakan',
      refresh: 'Muat Semula',
      loading: 'Memuatkan...',
      details: 'Butiran',
      locked: 'Terkunci',
      running: 'Sedang Jalan',
      paused: 'Dijeda',
      completed: 'Selesai',
      pending: 'Belum Mula',
      warning: 'Amaran',
      critical: 'Kritikal',
      high: 'Tinggi',
      medium: 'Sederhana',
      low: 'Rendah',
      reactor: 'Reaktor',
      model: 'Model',
      batch: 'Kelompok',
      order: 'Pesanan',
      qtyKg: 'Kuantiti (kg)',
      hours: 'jam',
      minutes: 'minit',
      urgent: 'Segera'
    },
    header: {
      appName: 'NOVOLYTE Penjadualan Pintar',
      appSubtitle: 'Sistem Penjadualan Reaktor Berketepatan Tinggi (V4.0)',
      reviewTag: 'Piawaian Ketepatan Industri',
      pubDraftVersion: (pub, draft) => `Terbit ${pub} / Draf ${draft}`,
      freezeActive: 'Zon Beku 24J Aktif',
      btnSimulate: 'Kira Semula',
      btnWhatIf: 'Bandingkan',
      btnCtp: 'Sim CTP',
      btnExceptions: 'Amaran',
      btnPublish: 'Terbit Pelan',
      demoBadgeActive: 'Mod Demo',
      demoBadgeInactive: 'Mod Rasmi',
      tabGantt: 'Penjadualan (Gantt)',
      tabGanttDesc: 'Carta Gantt Reaktor',
      tabReporting: 'Laporan Syif',
      tabReportingDesc: 'Kemajuan & QC',
      tabDashboard: 'Papan Pesanan',
      tabDashboardDesc: 'OTD & Beban Kerja',
      tabRules: 'Peraturan & Model',
      tabRulesDesc: 'Senarai Putih & Cuci',
      tabMes: 'MES & API',
      tabMesDesc: 'Antara Muka & Dokumen',
      tabAdmin: 'Konfigurasi',
      tabAdminDesc: 'Data Induk & Pangkalan',
      allPlants: 'Semua Loji',
      roles: {
        PLANNER: 'Perancang',
        OPERATOR: 'Jurutera Proses',
        DISPATCHER: 'Penyelia Pengeluaran',
        VIEWER: 'Pelawat',
        ADMIN: 'Pentadbir'
      }
    },
    demoWatermark: {
      title: '[DRAF DEMO - DATA INDUK BELUM SAH - TERBITAN DISEKAT]',
      subtitle: 'MOD CUBAAN DEMO · Disekat oleh Pelayan API · Dilarang untuk Pelaksanaan Bengkel',
      toastOn: 'Beralih ke [Mod Cubaan Demo]: Cap air aktif, pelayan akan menyekat penerbitan rasmi',
      toastOff: 'Beralih semula ke [Mod Pengeluaran Rasmi]',
      blockedTitle: 'Penerbitan Mod Demo Disekat'
    },
    gantt: {
      tabIndustrialBoard: 'Papan Piawai (Imej 2)',
      tabGantt: 'Garis Masa Gantt',
      tabDeviation: 'Sisihan Pelan vs Sebenar',
      freezeZoneTitle: 'Zon Beku 24 Jam',
      freezeZoneDesc: 'Tugas terkunci tidak boleh dialih; menjamin kestabilan syif',
      kpiMakespan: 'Rentang Masa',
      kpiWashHours: 'Masa Cuci',
      kpiOee: 'Purata OEE',
      kpiBatches: 'Jumlah Kelompok',
      kpiZeroWash: 'Kelompok Tanpa Cuci',
      scopeDay: 'Hari (24J)',
      scopeWeek: 'Minggu (7H)',
      scopeMonth: 'Bulan (30H)',
      filterAll: 'Semua',
      filterLocked: 'Terkunci',
      filterWarning: 'Amaran',
      filterRunning: 'Sedang Jalan',
      filterZeroWash: 'Tanpa Cuci',
      reactorColTitle: 'Unit Reaktor',
      capacity: 'Kapasiti Nominal',
      batchDetails: 'Butiran Tugas Kelompok',
      preWash: 'Cuci Awal',
      currStep: 'Langkah Semasa',
      estStart: 'Rancang Mula',
      estEnd: 'Rancang Tamat',
      today: 'Hari Ini',
      locateToday: 'Hari Ini',
      prevPeriod: 'Sebelumnya',
      nextPeriod: 'Seterusnya',
      zoomMonth: 'Bulan (30%)',
      zoomWeek: 'Minggu (Muat)',
      zoomDetail: 'Zum (200%)',
      exitFullscreen: 'Keluar Penuh (ESC)',
      fullscreenTitle: 'Stesen Kerja Gantt Skrin Penuh',
      deviationAlert: 'Amaran Sisihan Masa Pelaksanaan',
      pendingDeviationCount: (n) => `${n} belum isi sebab`,
      deviationAlertDesc: 'Sisihan dikesan antara pelaksanaan sebenar MES dan jadual. Penjejakan punca diperlukan.',
      btnLogDeviation: (id) => id ? `Isi Punca Sisihan (${id})` : 'Isi Punca Sisihan',
      btnViewDeviationList: 'Lihat Semua Senarai',
      shiftModeLabel: 'Syif Kerja:',
      shiftSingle: '1-Syif',
      shiftDouble: '2-Syif',
      shiftTriple: '3-Syif',
      searchPlaceholder: 'Cari kelompok / model / pesanan / pelanggan...',
      allReactors: (n) => `Semua ${n} Reaktor`
    },
    reporting: {
      title: 'Meja Laporan Kemajuan Syif',
      tag: '6 Operasi Standard · Saling Kunci Selamat',
      subtitle: 'Laporan kemajuan dwiharian · Hanya output FILL dikira untuk pesanan selesai',
      batchSelect: 'Pilih Kelompok Aktif:',
      stepsTitle: 'Aliran Status Operasi',
      reportingTitle: 'Kemasukan Peristiwa Operasi',
      operator: 'Operator:',
      shiftPeriod: 'Tempoh Syif',
      estEndTime: 'Anggaran Masa Siap',
      pauseReason: 'Sebab Jeda / Lewat',
      stepStatus: 'Status Operasi',
      qcSection: 'Rekod Ujian Sampel QC (Rekod sahaja, tiada kelulusan automatik)',
      qcReleaseStatus: 'Status Pelepasan QC:',
      qcMoisture: 'Kelembapan Karl Fischer (Piawai ≤ 15 ppm):',
      fillSection: 'Pendaftaran Kuantiti Pengisian Baik',
      fillCumulativeGood: 'Jumlah Pengisian Baik (kg) · Asas utama kemajuan pesanan',
      btnStart: '▶ Mula',
      btnPause: '⏸ Jeda',
      btnResume: '▶ Sambung',
      btnFinish: '✓ Selesai',
      btnSubmit: 'Hantar Laporan',
      interlockQcHold: '[Amaran Kunci QC] Langkah 04 QC belum DILEPASKAN! Dilarang memulakan Langkah 05 FILL.',
      receiptTitle: 'Resit Idempoten RESTful (POST /api/v1/operations/events)',
      receiptIdempotent: 'Sekatan Idempoten · Duplikasi Diabaikan',
      receiptRealtime: 'Direkodkan Masa Nyata',
      ruleNoticeOrderSettlement: 'Operasi ini akan mengemas kini kuantiti selesai pesanan dan peratusan kemajuan.',
      ruleNoticeStepRun: 'Langkah ini tidak menambah penyelesaian pesanan; hanya 1 operasi pengeluaran utama dibenarkan serentak.',
      quantityRuleSummary: 'Kadar siap pesanan = Jumlah pengisian baik (FILL) ÷ Kuantiti pesanan. Kuantiti Pelarut, Garam, dan Campuran DILARANG dikira sebagai siap.',
      ops: {
        SOLVENT: { name: 'Suapan Pelarut', label: 'Suapan Pelarut', code: 'SOLVENT', short: 'SOLV', desc: 'Suapan pelarut karbonat & pracampuran' },
        SALT: { name: 'Suapan Garam Li', label: 'Suapan Garam Li', code: 'SALT', short: 'SALT', desc: 'LiPF6 ketulenan tinggi dalam kotak sarung tangan' },
        MIX: { name: 'Campuran & Reaksi', label: 'Campuran & Reaksi', code: 'MIX', short: 'MIX', desc: 'Kacauan kitaran tertutup suhu malar' },
        QC: { name: 'Ujian Sampel QC', label: 'Ujian Sampel QC', code: 'QC', short: 'QC', desc: 'Ujian kelembapan & asid untuk pelepasan' },
        FILL: { name: 'Pengisian & Pakej', label: 'Pengisian & Pakej', code: 'FILL', short: 'FILL', desc: 'Pengisian tong/tangki bergas N2, produk siap' },
        CLEAN: { name: 'Cuci Reaktor', label: 'Cuci Reaktor', code: 'CLEAN', short: 'WASH', desc: 'Tugas matriks pembersihan bebas' }
      },
      statusMap: {
        PROCESSING: 'Sedang Jalan',
        FINISHED: 'Selesai',
        PAUSED: 'Dijeda (Tahan)',
        PENDING: 'Belum Mula',
        NOT_APPLICABLE: 'T/B (Tanpa Cuci)'
      }
    },
    dashboard: {
      title: 'Papan Pemuka Pesanan & Penjejakan',
      subtitle: 'Penjejakan masa nyata pesanan pelanggan, Penghantaran Tepat Masa (OTD), dan kesediaan bahan',
      otdRate: 'Kadar Tepat Masa (OTD)',
      pendingOrdersCount: 'Pesanan Belum Selesai',
      inProgressOrders: 'Dalam Pengeluaran',
      completedOrders: 'Dihantar / Selesai',
      orderNo: 'No. Pesanan',
      customer: 'Pelanggan',
      targetModel: 'Model Produk',
      orderQty: 'Kuantiti Pesanan',
      fulfilledQty: 'Jumlah Pengisian Baik',
      dueDate: 'Tarikh Dijanjikan',
      fulfillmentRate: 'Kemajuan %',
      priorityUrgent: 'Segera (URG)',
      priorityHigh: 'Tinggi (HI)',
      priorityNormal: 'Biasa (NORM)',
      btnNewOrder: 'Pesanan Baharu'
    },
    ctpModal: {
      title: 'Simulator Keupayaan Janji Pesanan IPS / CTP',
      badge: 'Kotak Pasir Salin-atas-Tulis',
      subtitle: 'Simulasikan slot masa dan kesediaan bahan ATB dalam salinan sementara tanpa merosakkan pelan rasmi',
      customerCode: 'Kod / Nama Pelanggan',
      productModel: 'Model Elektrolit',
      orderQty: 'Kuantiti Pesanan (kg)',
      reqDelivery: 'Tarikh Dikehendaki (EDD)',
      allowSplit: 'Benarkan Pemecahan Kelompok (Penuh + Baki Akhir)',
      btnSimulate: 'Mulakan Simulasi',
      atbStatus: 'Kesediaan Bahan (ATB)',
      atbReady: 'Sedia / Diperuntukkan',
      atbShortage: 'Amaran Kekurangan Bahan',
      promisedFpsd: 'Tarikh Terawal Dijanjikan (FPSD)',
      leadTime: 'Masa Pengeluaran (Lead Time)',
      suggestedBatches: 'Cadangan Pecahan Kelompok',
      btnAdopt: 'Terima Sebagai Pesanan Rasmi',
      btnCancel: 'Batal & Tutup',
      liveApiTest: 'Uji API Pelayan',
      inquiryTitle: 'Parameter Pertanyaan Pesanan',
      customer: 'Pelanggan / Nama',
      quantity: 'Kuantiti Pesanan (kg)',
      priority: 'Keutamaan',
      customerDueDate: 'Tarikh Akhir Pelanggan (EDD)',
      downwardSplit: 'Benarkan pemecahan kelompok ke bawah',
      atbTitle: 'Semakan Masa Nyata Kesediaan Bahan (ATB)',
      feasible: 'Jadual Boleh Dicapai',
      infeasible: 'Jadual Tidak Berdaya Maju / Risiko',
      promisedDate: 'Tarikh Siap Dijanjikan',
      washDuration: 'Jumlah Masa Cuci',
      assignedReactor: 'Reaktor Lebihan Beban',
      batchBreakdown: 'Pecahan Kelompok Cadangan',
      cancelBtn: 'Batal',
      adoptBtn: 'Terima & Cipta Pesanan'
    },
    whatIfModal: {
      title: 'Perbandingan Pelbagai Senario What-If',
      subtitle: 'Simulasikan strategi pengoptimuman pelbagai objektif dan nilaikan pertukaran Pareto dalam kotak pasir',
      strategySetupMin: 'Minimakan Cuci (Setup Min)',
      strategyOtd: 'Utamakan Tarikh (OTD First)',
      strategyLoadBalance: 'Beban Seimbang (Balanced)',
      kpiMakespan: 'Rentang Masa',
      kpiWashHours: 'Masa Cuci',
      kpiAvgOee: 'Purata OEE',
      btnAdoptStrategy: 'Gunakan Strategi Sebagai Draf'
    },
    exceptionsModal: {
      title: 'Pusat Pemantauan 8 Pengecualian Struktur APS',
      subtitle: 'Pemantauan masa nyata ketidakpadanan reaktor, kuantiti bawah had minimum, dan konflik zon pembekuan',
      unresolvedCount: (count) => `${count} Pengecualian Belum Selesai`,
      colCode: 'Kod',
      colTitle: 'Penerangan',
      colEntity: 'Entiti',
      colSeverity: 'Tahap Kritikal',
      colDept: 'Peranan / Jabatan Bertanggungjawab',
      colRemediation: 'Cadangan Tindakan Pemulihan'
    }
  }
};

export function getTranslations(lang: LanguageCode): Translations {
  return i18nDict[lang] || i18nDict.zh;
}
