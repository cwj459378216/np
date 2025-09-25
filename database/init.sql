
-- 设置postgres用户密码
ALTER USER postgres PASSWORD 'postgres';

-- 创建日志表
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP(0) NOT NULL,
    level VARCHAR(20) NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建资产表
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(15) NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_updated TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);


-- 创建通知设置表
CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    service VARCHAR(50) NOT NULL,
    -- Email 相关字段
    mail_server VARCHAR(100),
    security VARCHAR(20),
    email_port VARCHAR(10),
    account_name VARCHAR(100),
    password VARCHAR(100),
    sender VARCHAR(100),
    receiver VARCHAR(100),
    subject VARCHAR(200),
    -- Syslog 相关字段
    host VARCHAR(100),
    syslog_port VARCHAR(10),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建角色表
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role_id INTEGER REFERENCES roles(id),
    description TEXT,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);


-- 插入一些测试数据
INSERT INTO roles (name, description, permissions) VALUES
(
    'Administrator', 
    'Full system access', 
    '{
        "dashboard": {"readWrite": true, "readOnly": false},
        "collector": {
            "readWrite": true,
            "readOnly": false,
            "children": {
                "collectorAnalyzer": {"readWrite": true, "readOnly": false},
                "filter": {"readWrite": true, "readOnly": false}
            }
        },
        "eventAlarm": {
            "readWrite": true,
            "readOnly": false,
            "children": {
                "event": {"readWrite": true, "readOnly": false},
                "alarmSettings": {"readWrite": true, "readOnly": false}
            }
        }
    }'
),
(
    'Operator',
    'Basic operation permissions',
    '{
        "dashboard": {"readWrite": false, "readOnly": true},
        "collector": {
            "readWrite": false,
            "readOnly": true,
            "children": {
                "collectorAnalyzer": {"readWrite": false, "readOnly": true},
                "filter": {"readWrite": false, "readOnly": true}
            }
        }
    }'
);

-- 插入一些测试数据
INSERT INTO users (username, password, email, role_id, description, status) VALUES
('admin', '$2a$10$46rdxR82sJ7yy1X0kWRaquxwNdwQVu30VmwqSx2VQy006GqbUPb0S', 'admin@example.com', 
 (SELECT id FROM roles WHERE name = 'Administrator'), 'System administrator', true),
('operator', '$2a$10$BqWZyqrZ0Kg3pxqL0q.RXOyYzXbWFM3U8AFZZ6mJywX5/pXNL4rMi', 'operator@example.com', 
 (SELECT id FROM roles WHERE name = 'Operator'), 'System operator', true); 
-- 创建模板表
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB,
    creator VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 确保已存在的数据库也强制名称唯一
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_name_unique ON templates(name);

-- 然后创建 reports 表
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_id BIGINT,
    file_path VARCHAR(255),
    trigger_mode VARCHAR(50),
    creator VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_template_id ON reports(template_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_creator ON reports(creator);


-- 创建通知规则表
CREATE TABLE IF NOT EXISTS notification_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    time_window VARCHAR(50) NOT NULL,
    trigger_condition VARCHAR(50) NOT NULL,
    filters JSONB,
    notification_setting_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建报告调度器表
CREATE TABLE IF NOT EXISTS report_schedulers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template VARCHAR(100) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    schedule_time TIME NOT NULL,
    where_to_send VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建规则策略表
CREATE TABLE rules_policy (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建 Snort 规则表（替代原 rules 表）
CREATE TABLE IF NOT EXISTS suricata_rules (
    id SERIAL PRIMARY KEY,
    sid INTEGER UNIQUE,
    protocol TEXT,
    direction TEXT,
    src_port TEXT,
    dst_port TEXT,
    msg TEXT,
    classtype TEXT,
    priority INTEGER,
    cve TEXT,
    rule TEXT,
    filename TEXT,
    last_update TIMESTAMP DEFAULT now()
);

CREATE TABLE policy_rules (
    policy_id INTEGER REFERENCES rules_policy(id),
    rule_id INTEGER REFERENCES suricata_rules(id),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (policy_id, rule_id)
);

-- 创建规则更新配置表
CREATE TABLE rule_update_config (
    id SERIAL PRIMARY KEY,
    update_mode VARCHAR(20) NOT NULL,  -- 'automatic' 或 'manual'
    update_url VARCHAR(255),
    update_interval INTEGER,  -- 小时为单位
    username VARCHAR(100),
    password VARCHAR(100),
    last_update_time TIMESTAMP(0),
    total_rules INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建规则更新历史表
CREATE TABLE rule_update_history (
    id SERIAL PRIMARY KEY,
    update_time TIMESTAMP(0) NOT NULL,
    update_mode VARCHAR(20) NOT NULL,
    total_rules INTEGER,
    status VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建本地规则表
CREATE TABLE local_rules (
    id SERIAL PRIMARY KEY,
    rule_content TEXT NOT NULL,
    created_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    last_updated TIMESTAMP(0) NOT NULL
);

-- 在现有的表之后添加
CREATE TABLE system_time_settings (
    id SERIAL PRIMARY KEY,
    time_setting_method VARCHAR(20) NOT NULL, -- 'manual' 或 'ntp'
    manual_time TIMESTAMP(0),
    ntp_server VARCHAR(255),
    sync_frequency VARCHAR(50),
    time_zone VARCHAR(50) NOT NULL,
    auto_timezone_detection BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 在现有表之后添加
CREATE TABLE protocol_settings (
    id SERIAL PRIMARY KEY,
    protocol_name VARCHAR(50) NOT NULL,
    port INTEGER NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    importance_level VARCHAR(20) DEFAULT 'normal', -- 'important', 'normal', 'negligible'
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建告警设置表
CREATE TABLE alarm_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,  -- 'threshold', 'pattern', 'anomaly'
    priority VARCHAR(20) NOT NULL,  -- 'high', 'medium', 'low'
    threshold INTEGER NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建collectors表
CREATE TABLE collectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    creation_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    interface_name VARCHAR(50) NOT NULL,
    storage_strategy VARCHAR(50),
    filter_strategy VARCHAR(50),
    protocol_analysis_enabled BOOLEAN DEFAULT false,
    ids_enabled BOOLEAN DEFAULT false,
    file_path VARCHAR(255),
    status VARCHAR(20) DEFAULT 'stopped'
);

-- 创建storage_strategies表
CREATE TABLE storage_strategies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    creation_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    file_size VARCHAR(20) NOT NULL,
    file_count INTEGER NOT NULL,
    out_of_disk_action VARCHAR(50) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    trigger_type VARCHAR(20) NOT NULL,
    time_range VARCHAR(100),
    alarm_type VARCHAR(50),
    duration INTEGER,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 修改 collectors 表，添加 session_id 字段
ALTER TABLE collectors ADD COLUMN session_id VARCHAR(100);

-- 创建老化调度配置表
CREATE TABLE aging_schedules (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN DEFAULT FALSE,
    schedule_type VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    execution_time VARCHAR(10) DEFAULT '02:00',
    retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认的老化调度配置
INSERT INTO aging_schedules (enabled, schedule_type, execution_time, retention_days) 
VALUES (false, 'daily', '02:00', 30);




