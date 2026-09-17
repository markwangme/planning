-- ==============================================================================
-- NOVOLYTE APS V4.0 高级计划与排产系统 生产级数据库 DDL Schema (PostgreSQL / MySQL 兼容)
-- 设计规范：质量精细度一律采用 numeric(14,3) kg，严禁浮点存储；包含乐观锁 row_version 与幂等键 client_event_id
-- ==============================================================================
--
-- ⚠️ 重要说明：本文件是**目标态参考 DDL，当前运行期不会执行**。
--
-- 运行期实际使用的是 Node 内置 node:sqlite，建表语句位于 server/apsDatabase.ts，
-- 目前只建两张表：aps_state（单行状态快照）与 aps_event_log（幂等事件表）。
-- 二者关系如下：
--   · schema_v4.sql  —— PostgreSQL / MySQL 目标态（21 张表），供正式数据库落地时使用；
--   · apsDatabase.ts —— 本地调试期的 SQLite 持久化，字段语义与目标态对齐但表结构未完全展开。
--
-- 因此**不要**在本机直接执行本文件：它使用 PG/MySQL 语法（VARCHAR / NUMERIC / SERIAL 等），
-- 在 SQLite 上无法运行；且本文件同时包含 aps_*（11 张，目标态）与
-- tb_*（10 张，附录「V4.0 核心数据库规范原名映射表」）两套语义重叠的建表语句，
-- 全部为 CREATE TABLE IF NOT EXISTS，同时执行会建出两套并行结构。
--
-- 落地正式数据库时，请先确认以 aps_* 为准还是以 tb_* 为准，再删去另一套。
-- ==============================================================================

-- 1. 反应釜物理机台资产表 (独立实体建模，严禁合并逻辑池)
CREATE TABLE IF NOT EXISTS aps_reactors (
    reactor_id VARCHAR(32) PRIMARY KEY, -- e.g. 'R-1300-01', 'R-6000-01', 'R-6000-02'
    reactor_name VARCHAR(128) NOT NULL,
    workshop_id VARCHAR(32) NOT NULL DEFAULT 'WS-01', -- 所属车间
    rated_kg NUMERIC(14, 3) NOT NULL, -- 额定容量 (kg)
    min_kg NUMERIC(14, 3) NOT NULL,   -- 物理投料安全下限 (kg)
    max_kg NUMERIC(14, 3) NOT NULL,   -- 物理投料安全上限 (kg)
    volume_m3 NUMERIC(10, 2) NOT NULL, -- 釜体容积 (m3)，与 kg 互不替代
    status VARCHAR(32) NOT NULL DEFAULT 'IDLE', -- 'IDLE', 'RUNNING', 'MAINTENANCE', 'FAULT'
    clean_state VARCHAR(32) NOT NULL DEFAULT 'CLEAN', -- 'CLEAN', 'DIRTY', 'UNKNOWN'
    last_model_id VARCHAR(64), -- 上一生产型号编码 (触发清洗矩阵判断)
    available_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(128),
    exclusive_mode BOOLEAN NOT NULL DEFAULT FALSE,
    allowed_exclusive_models JSONB,
    row_version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. 产品型号与工艺主数据
CREATE TABLE IF NOT EXISTS aps_product_models (
    model_code VARCHAR(64) PRIMARY KEY, -- e.g. 'SIM-MODEL-A'
    model_name VARCHAR(128) NOT NULL,
    customer_group VARCHAR(64),
    batch_standard_hours NUMERIC(6, 2) NOT NULL DEFAULT 10.5,
    special_cleaning BOOLEAN NOT NULL DEFAULT FALSE,
    craft_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
    approval_status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. 型号-反应釜适配与白名单矩阵 (交集约束上下限)
CREATE TABLE IF NOT EXISTS aps_model_reactors (
    id BIGSERIAL PRIMARY KEY,
    model_code VARCHAR(64) NOT NULL REFERENCES aps_product_models(model_code),
    reactor_id VARCHAR(32) NOT NULL REFERENCES aps_reactors(reactor_id),
    min_feed_kg NUMERIC(14, 3) NOT NULL, -- 工艺设定最小投料量
    max_feed_kg NUMERIC(14, 3) NOT NULL, -- 工艺设定最大投料量
    is_preferred BOOLEAN NOT NULL DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 1,
    UNIQUE(model_code, reactor_id)
);

-- 4. 生产主订单表 (支持向下拆批、乐观锁并发控制、试算隔离)
CREATE TABLE IF NOT EXISTS aps_production_orders (
    order_no VARCHAR(64) PRIMARY KEY,
    customer_name VARCHAR(128) NOT NULL,
    product_model VARCHAR(64) NOT NULL REFERENCES aps_product_models(model_code),
    qty_kg NUMERIC(14, 3) NOT NULL, -- 订单待排产总质量 (kg)
    received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    customer_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    production_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_SCHEDULE', -- 'PENDING_SCHEDULE', 'SCHEDULED', 'IN_PRODUCTION', 'COMPLETED'
    is_demo BOOLEAN NOT NULL DEFAULT FALSE, -- 演示试算隔离，严禁发布
    row_version BIGINT NOT NULL DEFAULT 1, -- 乐观锁版本号
    completed_good_kg NUMERIC(14, 3) NOT NULL DEFAULT 0.000, -- 累计灌装合格量
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. 批次作业任务表 (Downward Batch Splitting 产物，工单质量 100% 守恒)
CREATE TABLE IF NOT EXISTS aps_batch_tasks (
    batch_id VARCHAR(64) PRIMARY KEY, -- e.g. 'SIM-B001'
    order_no VARCHAR(64) NOT NULL REFERENCES aps_production_orders(order_no),
    assigned_reactor_id VARCHAR(32) NOT NULL REFERENCES aps_reactors(reactor_id),
    product_model VARCHAR(64) NOT NULL,
    batch_qty_kg NUMERIC(14, 3) NOT NULL, -- 计划批量，不得产生负数或丢弃尾批
    batch_index INT NOT NULL,
    total_batches INT NOT NULL,
    
    plan_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    plan_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_time TIMESTAMP WITH TIME ZONE,
    actual_end_time TIMESTAMP WITH TIME ZONE,
    
    is_locked BOOLEAN NOT NULL DEFAULT FALSE, -- 24H 冻结区硬锁定
    is_actual BOOLEAN NOT NULL DEFAULT FALSE,
    current_step VARCHAR(32) NOT NULL DEFAULT 'STEP_1_FEEDING',
    step_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    qc_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    good_filled_kg NUMERIC(14, 3) NOT NULL DEFAULT 0.000,
    loss_kg NUMERIC(14, 3) NOT NULL DEFAULT 0.000,
    
    preceding_wash_min INT NOT NULL DEFAULT 0, -- 0, 120, 180 min
    wash_rule_type VARCHAR(32) NOT NULL DEFAULT 'SAME_MODEL_0MIN',
    
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    row_version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. 洗釜作业任务表 (独立占用釜资源)
CREATE TABLE IF NOT EXISTS aps_cleaning_jobs (
    job_id VARCHAR(64) PRIMARY KEY,
    reactor_id VARCHAR(32) NOT NULL REFERENCES aps_reactors(reactor_id),
    from_model VARCHAR(64) NOT NULL,
    to_model VARCHAR(64),
    planned_min INT NOT NULL, -- 0, 120, 180 min
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. 半天工序级报工事件流水表 (幂等键保障)
CREATE TABLE IF NOT EXISTS aps_shift_report_events (
    event_id VARCHAR(64) PRIMARY KEY,
    client_event_id VARCHAR(128) NOT NULL UNIQUE, -- 客户端幂等去重防重复上报
    batch_id VARCHAR(64) NOT NULL REFERENCES aps_batch_tasks(batch_id),
    reactor_id VARCHAR(32) NOT NULL REFERENCES aps_reactors(reactor_id),
    step_id VARCHAR(32) NOT NULL, -- 'SOLVENT', 'SALT', 'MIX', 'QC', 'FILL', 'CLEAN'
    shift_name VARCHAR(64) NOT NULL, -- 'DAY_AM', 'DAY_PM', 'NIGHT_AM', 'NIGHT_PM'
    operator_name VARCHAR(64) NOT NULL,
    good_qty_kg NUMERIC(14, 3) NOT NULL DEFAULT 0.000,
    loss_qty_kg NUMERIC(14, 3) NOT NULL DEFAULT 0.000,
    status_change VARCHAR(32),
    reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. 原材料库存快照表 (ATB 齐套前置校验)
CREATE TABLE IF NOT EXISTS aps_material_inventory (
    material_code VARCHAR(64) PRIMARY KEY,
    material_name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL, -- 'LITHIUM_SALT', 'SOLVENT', 'ADDITIVE'
    current_stock_kg NUMERIC(14, 3) NOT NULL DEFAULT 0.000,
    mrp_expected_arrival_kg NUMERIC(14, 3) NOT NULL DEFAULT 0.000,
    expected_arrival_time TIMESTAMP WITH TIME ZONE,
    safety_stock_kg NUMERIC(14, 3) NOT NULL DEFAULT 0.000,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. 排产方案版本表 (含 24H 冻结基准与 is_demo 隔离)
CREATE TABLE IF NOT EXISTS aps_plan_versions (
    version_id VARCHAR(64) PRIMARY KEY,
    version_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SIMULATION', 'PUBLISHED', 'SUPERSEDED'
    strategy VARCHAR(32) NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE, -- is_demo 为 true 严禁发布
    published_by VARCHAR(64),
    published_at TIMESTAMP WITH TIME ZONE,
    frozen_until TIMESTAMP WITH TIME ZONE NOT NULL,
    makespan_hours NUMERIC(8, 2) NOT NULL,
    total_wash_hours NUMERIC(8, 2) NOT NULL,
    avg_oee_percent NUMERIC(5, 2) NOT NULL,
    row_version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. 8 大结构化排产异常监控记录表
CREATE TABLE IF NOT EXISTS aps_exception_records (
    exception_id BIGSERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL, -- NO_ALLOWED_REACTOR, BATCH_BELOW_MIN, MISSING_STD_TIME, UNKNOWN_INITIAL_STATE, UNCONFIRMED_RULE, NO_FEASIBLE_SLOT, FROZEN_CONFLICT, STALE_INPUT
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(32) NOT NULL, -- 'ORDER', 'BATCH', 'REACTOR', 'RULE', 'INVENTORY'
    entity_id VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL, -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    responsible_role VARCHAR(32) NOT NULL,
    responsible_dept VARCHAR(128) NOT NULL,
    remediation_hint TEXT NOT NULL,
    is_blocking BOOLEAN NOT NULL DEFAULT FALSE,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 常用高频查询索引
CREATE INDEX IF NOT EXISTS idx_batch_tasks_order ON aps_batch_tasks(order_no);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_reactor ON aps_batch_tasks(assigned_reactor_id);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_plan_time ON aps_batch_tasks(plan_start_time, plan_end_time);
CREATE INDEX IF NOT EXISTS idx_report_events_client ON aps_shift_report_events(client_event_id);
CREATE INDEX IF NOT EXISTS idx_report_events_batch ON aps_shift_report_events(batch_id);

-- ==============================================================================
-- 附录：V4.0 核心数据库规范原名映射表 (tb_* 规范对照，严格匹配 Section 三 Pages 3-5)
-- ==============================================================================

-- 1. tb_reactor (反应釜静态台账)
CREATE TABLE IF NOT EXISTS tb_reactor (
    reactor_code VARCHAR(32) PRIMARY KEY, -- R-1300-01, R-6000-01, R-6000-02
    reactor_name VARCHAR(64) NOT NULL,
    volume_m3 NUMERIC(6,2) NOT NULL,
    max_batch_kg NUMERIC(14,3) NOT NULL,
    min_batch_kg NUMERIC(14,3) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. tb_product_model (产品型号主数据)
CREATE TABLE IF NOT EXISTS tb_product_model (
    model_code VARCHAR(64) PRIMARY KEY,
    model_name VARCHAR(128) NOT NULL,
    special_cleaning_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. tb_model_reactor (型号-设备适配及上下限)
CREATE TABLE IF NOT EXISTS tb_model_reactor (
    id BIGSERIAL PRIMARY KEY,
    model_code VARCHAR(64) NOT NULL REFERENCES tb_product_model(model_code),
    reactor_code VARCHAR(32) NOT NULL REFERENCES tb_reactor(reactor_code),
    feed_min_kg NUMERIC(14,3) NOT NULL,
    feed_max_kg NUMERIC(14,3) NOT NULL,
    std_cycle_min INT NOT NULL,
    UNIQUE(model_code, reactor_code)
);

-- 4. tb_reactor_state (设备动态状态表)
CREATE TABLE IF NOT EXISTS tb_reactor_state (
    reactor_code VARCHAR(32) PRIMARY KEY REFERENCES tb_reactor(reactor_code),
    last_model_code VARCHAR(64),
    clean_state VARCHAR(16) NOT NULL DEFAULT 'CLEAN', -- CLEAN, DIRTY, UNKNOWN
    available_from TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. tb_production_batch (批次计划与实绩)
CREATE TABLE IF NOT EXISTS tb_production_batch (
    batch_no VARCHAR(64) PRIMARY KEY,
    order_no VARCHAR(64) NOT NULL,
    model_code VARCHAR(64) NOT NULL REFERENCES tb_product_model(model_code),
    reactor_code VARCHAR(32) NOT NULL REFERENCES tb_reactor(reactor_code),
    batch_qty_kg NUMERIC(14,3) NOT NULL,
    plan_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    plan_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_start_at TIMESTAMP WITH TIME ZONE,
    actual_end_at TIMESTAMP WITH TIME ZONE,
    filled_good_kg NUMERIC(14,3) NOT NULL DEFAULT 0.000,
    status VARCHAR(16) NOT NULL DEFAULT 'PLANNED'
);

-- 6. tb_cleaning_job (洗釜作业任务)
CREATE TABLE IF NOT EXISTS tb_cleaning_job (
    job_id VARCHAR(64) PRIMARY KEY,
    reactor_code VARCHAR(32) NOT NULL REFERENCES tb_reactor(reactor_code),
    preceding_model VARCHAR(64),
    following_model VARCHAR(64),
    wash_duration_min INT NOT NULL, -- 0, 120, 180
    wash_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    wash_end_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 7. tb_plan_version (排产版本元数据)
CREATE TABLE IF NOT EXISTS tb_plan_version (
    version_id VARCHAR(64) PRIMARY KEY,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE, -- 演示模式强阻断发布
    snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE
);

-- 8. tb_plan_task (版本内排产明细快照)
CREATE TABLE IF NOT EXISTS tb_plan_task (
    task_id BIGSERIAL PRIMARY KEY,
    version_id VARCHAR(64) NOT NULL REFERENCES tb_plan_version(version_id),
    batch_no VARCHAR(64) NOT NULL,
    reactor_code VARCHAR(32) NOT NULL,
    plan_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    plan_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. tb_operation_event (工序级报工流水表 - 幂等保障)
CREATE TABLE IF NOT EXISTS tb_operation_event (
    event_id BIGSERIAL PRIMARY KEY,
    client_event_id VARCHAR(128) NOT NULL UNIQUE, -- 客户端幂等去重键
    batch_no VARCHAR(64) NOT NULL,
    operation_code VARCHAR(16) NOT NULL, -- SOLVENT, SALT, MIX, QC, FILL, CLEAN
    event_type VARCHAR(16) NOT NULL, -- START, PAUSE, RESUME, COMPLETE
    actual_at TIMESTAMP WITH TIME ZONE NOT NULL,
    filled_good_kg NUMERIC(14,3),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. tb_external_id_map (系统间实体主键映射表 - Page 9 MES预留)
CREATE TABLE IF NOT EXISTS tb_external_id_map (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL, -- REACTOR, BATCH, ORDER
    aps_id VARCHAR(64) NOT NULL,
    external_system VARCHAR(32) NOT NULL DEFAULT 'MANUAL', -- MANUAL, MES, DCS
    external_id VARCHAR(128) NOT NULL,
    UNIQUE(entity_type, aps_id, external_system)
);

-- 11. tb_integration_message (第三方系统异步报文邮箱 - Page 9 幂等消息收发箱)
CREATE TABLE IF NOT EXISTS tb_integration_message (
    msg_id VARCHAR(64) PRIMARY KEY,
    source_system VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    event_type VARCHAR(64) NOT NULL,
    payload_json JSONB NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'RECEIVED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
