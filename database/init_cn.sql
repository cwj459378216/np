-- 创建数据库
CREATE DATABASE data;

-- 连接到数据库
\c data;

-- 创建系统日志表
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP(0) NOT NULL,
    level VARCHAR(20) NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试数据
INSERT INTO system_logs (date, level, user_name, module, content) VALUES
    ('2024-11-25 10:30:45', 'INFO', 'admin', '认证', '用户登录成功'),
    ('2024-11-24 15:20:30', 'INFO', 'admin', '数据库', '数据库备份完成'),
    ('2024-11-23 08:45:15', 'WARNING', 'system', '网络', '网络连接异常'),
    ('2024-11-22 20:10:25', 'ERROR', 'admin', '安全', '检测到未授权访问');

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

-- 插入测试数据
INSERT INTO assets (asset_name, ip_address, mac_address, type, status, last_updated) VALUES
    ('服务器-01', '192.168.1.100', '00:1B:44:11:3A:B7', '服务器', '活动', '2024-03-21 10:30:45'),
    ('工作站-02', '192.168.1.101', '00:1B:44:11:3A:B8', '工作站', '活动', '2024-03-21 10:30:45');


-- 创建通知设置表
CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    service VARCHAR(50) NOT NULL,
    -- 邮件相关字段
    mail_server VARCHAR(100),
    security VARCHAR(20),
    email_port VARCHAR(10),
    account_name VARCHAR(100),
    password VARCHAR(100),
    sender VARCHAR(100),
    receiver VARCHAR(100),
    subject VARCHAR(200),
    -- 系统日志相关字段
    host VARCHAR(100),
    syslog_port VARCHAR(10),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试数据
INSERT INTO notification_settings (name, description, service, mail_server, security, email_port, account_name, password, sender, receiver, subject) 
VALUES ('邮件服务器', '用于邮件通知的SMTP服务器配置', 'email', 'smtp.example.com', 'ssl', '587', 'admin@example.com', '******', 'noreply@example.com', 'admin@company.com', '系统通知');

INSERT INTO notification_settings (name, description, service, host, syslog_port) 
VALUES ('系统日志服务器', '用于系统通知的Syslog服务器', 'syslog', '192.168.1.100', '514');

-- 创建角色表
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试数据
INSERT INTO roles (name, description, permissions) VALUES
(
    '管理员', 
    '完整系统访问权限', 
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
    '操作员',
    '基本操作权限',
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

-- 插入测试数据
INSERT INTO users (username, password, email, role_id, description, status) VALUES
('admin', '$2a$10$46rdxR82sJ7yy1X0kWRaquxwNdwQVu30VmwqSx2VQy006GqbUPb0S', 'admin@example.com', 
 (SELECT id FROM roles WHERE name = '管理员'), '系统管理员', true),
('operator', '$2a$10$BqWZyqrZ0Kg3pxqL0q.RXOyYzXbWFM3U8AFZZ6mJywX5/pXNL4rMi', 'operator@example.com', 
 (SELECT id FROM roles WHERE name = '操作员'), '系统操作员', true); 

-- 创建模板表
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB,
    creator VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 先插入模板数据
INSERT INTO templates (name, description, content, creator) VALUES
(
    '安全仪表板',
    '安全监控仪表板模板',
    '{
        "dashboard": [
            {
                "type": "chart",
                "chartType": "line",
                "uniqueId": "chart1",
                "x": 0,
                "y": 0,
                "cols": 6,
                "rows": 4
            },
            {
                "type": "table",
                "uniqueId": "table1",
                "x": 6,
                "y": 0,
                "cols": 6,
                "rows": 4
            }
        ]
    }',
    '系统'
) ON CONFLICT (id) DO NOTHING;

-- 然后创建报告表
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

-- 添加外键约束（如果需要）
ALTER TABLE reports 
DROP CONSTRAINT IF EXISTS fk_reports_template;

ALTER TABLE reports 
ADD CONSTRAINT fk_reports_template 
FOREIGN KEY (template_id) 
REFERENCES templates(id);

-- 插入报告数据（使用SELECT确保引用的模板存在）
INSERT INTO reports (name, description, template_id, file_path, trigger_mode, creator, created_at) 
SELECT 
    '月度安全报告',
    '从安全仪表板模板生成',
    t.id,
    '/reports/monthly/security_report_202403.pdf',
    '手动',
    '系统',
    CURRENT_TIMESTAMP
FROM templates t
WHERE t.name = '安全仪表板'
LIMIT 1;

-- 创建通知规则表
CREATE TABLE IF NOT EXISTS notification_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    time_window VARCHAR(50) NOT NULL,
    trigger_condition VARCHAR(50) NOT NULL,
    filters JSONB,
    notification_method VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入示例数据
INSERT INTO notification_rules (rule_name, description, time_window, trigger_condition, filters, notification_method, endpoint, status) VALUES
(
    'CPU使用率高告警',
    'CPU使用率过高时发出告警',
    '24小时',
    '条件',
    '[{"field": "cpu_usage", "value": "90"}]',
    'email',
    'admin@example.com',
    'Active'
),
(
    '内存警告',
    '内存使用率过高警告',
    '7天',
    '新事件',
    NULL,
    'syslog',
    '192.168.1.100:514',
    'Active'
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

-- 添加示例数据
INSERT INTO report_schedulers (name, description, template, frequency, schedule_time, where_to_send, status) VALUES
(
    '每日系统报告',
    '每日生成系统状态报告',
    '系统状态模板',
    '每日',
    '00:00:00',
    'admin@example.com',
    'Active'
),
(
    '每周安全报告',
    '每周生成安全分析报告',
    '安全警报模板',
    '每周',
    '08:00:00',
    'security@example.com',
    'Active'
);

-- 创建规则策略表
CREATE TABLE rules_policy (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建规则表
CREATE TABLE rules (
    id SERIAL PRIMARY KEY,
    sid VARCHAR(50) NOT NULL,
    protocol VARCHAR(20),
    source_address VARCHAR(100),
    source_port VARCHAR(50),
    destination_address VARCHAR(100),
    destination_port VARCHAR(50),
    class_type VARCHAR(100),
    cve VARCHAR(50),
    reference TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 创建策略规则关联表
CREATE TABLE policy_rules (
    policy_id INTEGER REFERENCES rules_policy(id),
    rule_id INTEGER REFERENCES rules(id),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (policy_id, rule_id)
);

-- 插入示例数据
INSERT INTO rules_policy (name, description, enabled) VALUES
('默认策略', '默认安全策略配置', true),
('Web安全', 'Web应用程序安全策略', true);

INSERT INTO rules (sid, protocol, source_address, source_port, destination_address, destination_port, class_type, cve, reference) VALUES
('1000001', 'TCP', 'any', 'any', '192.168.1.0/24', '80', 'web-application-attack', 'CVE-2023-1234', 'bugtraq,1234'),
('1000002', 'UDP', '10.0.0.0/8', '53', 'any', 'any', 'attempted-recon', 'CVE-2023-5678', 'url,example.com');

-- 检查是否已存在规则
INSERT INTO rules (sid, protocol, source_address, source_port, destination_address, destination_port, class_type, cve, reference) 
SELECT '1000001', 'TCP', 'any', 'any', '192.168.1.0/24', '80', 'web-application-attack', 'CVE-2023-1234', 'bugtraq,1234'
WHERE NOT EXISTS (
    SELECT 1 FROM rules WHERE sid = '1000001'
);

INSERT INTO rules (sid, protocol, source_address, source_port, destination_address, destination_port, class_type, cve, reference)
SELECT '1000002', 'UDP', '10.0.0.0/8', '53', 'any', 'any', 'attempted-recon', 'CVE-2023-5678', 'url,example.com'
WHERE NOT EXISTS (
    SELECT 1 FROM rules WHERE sid = '1000002'
);

-- 创建规则更新配置表
CREATE TABLE rule_update_config (
    id SERIAL PRIMARY KEY,
    update_mode VARCHAR(20) NOT NULL,  -- '自动' 或 '手动'
    update_url VARCHAR(255),
    update_interval INTEGER,  -- 以小时为单位
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

-- 插入测试数据
INSERT INTO rule_update_config (update_mode, update_url, update_interval, username, password, last_update_time, total_rules, status) 
VALUES ('自动', 'https://rules.example.com/update', 24, 'admin', '加密密码', '2024-03-21 14:30:00', 1234, '活动');

INSERT INTO rule_update_history (update_time, update_mode, total_rules, status, message)
VALUES 
('2024-03-21 14:30:00', '自动', 1234, '成功', '规则更新成功'),
('2024-03-20 14:30:00', '手动', 1200, '成功', '手动更新完成');

-- 创建本地规则表
CREATE TABLE local_rules (
    id SERIAL PRIMARY KEY,
    rule_content TEXT NOT NULL,
    created_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    last_updated TIMESTAMP(0) NOT NULL
);

-- 插入示例数据
INSERT INTO local_rules (rule_content, created_date, status, category, last_updated) VALUES
('alert tcp any any -> any any (msg:"自定义本地规则"; sid:1000001;)', '2024-03-21', '启用', '自定义', '2024-03-21 10:30:45');

-- 在现有表之后添加
CREATE TABLE system_time_settings (
    id SERIAL PRIMARY KEY,
    time_setting_method VARCHAR(20) NOT NULL, -- '手动' 或 'ntp'
    manual_time TIMESTAMP(0),
    ntp_server VARCHAR(255),
    sync_frequency VARCHAR(50),
    time_zone VARCHAR(50) NOT NULL,
    auto_timezone_detection BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认数据
INSERT INTO system_time_settings (
    time_setting_method, 
    manual_time, 
    time_zone, 
    auto_timezone_detection
) VALUES (
    '手动',
    CURRENT_TIMESTAMP,
    'GMT+8',
    false
);

-- 在现有表之后添加
CREATE TABLE protocol_settings (
    id SERIAL PRIMARY KEY,
    protocol_name VARCHAR(50) NOT NULL,
    port INTEGER NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    importance_level VARCHAR(20) DEFAULT 'normal', -- '重要', '普通', '可忽略'
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始数据
INSERT INTO protocol_settings (protocol_name, port, description, is_enabled, importance_level) VALUES
('HTTP', 80, 'HTTP代表超文本传输协议，用于在互联网上传输网页和数据。', true, '普通'),
('DNS', 53, 'DNS代表域名系统，将域名转换为IP地址，以便计算机可以相互定位。', true, '重要'),
('SSL', 443, 'SSL（安全套接字层）用于保护HTTP流量，通常称为HTTPS。它加密数据以确保安全。', true, '普通'),
('SMB', 445, 'SMB代表服务器消息块，用于计算机之间的文件共享、打印机共享和其他网络服务。', false, '可忽略'),
('FTP', 21, 'FTP代表文件传输协议，是在客户端和服务器之间传输文件的标准网络协议。', true, '普通');

-- 创建告警设置表
CREATE TABLE alarm_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,  -- '阈值', '模式', '异常'
    priority VARCHAR(20) NOT NULL,  -- '高', '中', '低'
    threshold INTEGER NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始数据
INSERT INTO alarm_settings (name, type, priority, threshold, description, is_enabled) VALUES
('CPU使用率告警', '阈值', '高', 90, '当CPU使用率超过90%时告警', true),
('内存使用率警告', '阈值', '中', 80, '当内存使用率超过80%时警告', true),
('网络流量模式', '模式', '低', 1000, '监控异常网络流量模式', false),
('磁盘空间告警', '阈值', '高', 95, '当磁盘空间使用率超过95%时发出严重告警', true),
('登录异常检测', '异常', '中', 5, '检测异常登录模式', true),
('数据库连接告警', '模式', '高', 100, '监控数据库连接失败', false);

-- 创建采集器表
CREATE TABLE collectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    creation_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    interface_name VARCHAR(50) NOT NULL,
    storage_strategy VARCHAR(50) NOT NULL,
    filter_strategy VARCHAR(50),
    protocol_analysis_enabled BOOLEAN DEFAULT false,
    ids_enabled BOOLEAN DEFAULT false,
    file_path VARCHAR(255),
    status VARCHAR(20) DEFAULT 'stopped'
);

-- 创建存储策略表
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

-- 插入测试数据
INSERT INTO collectors (name, interface_name, storage_strategy, filter_strategy, protocol_analysis_enabled, ids_enabled, status, file_path) 
VALUES 
('采集器-1', 'DPDK', '策略-1', '过滤器-1', true, false, '运行中', NULL),
('采集器-2', '文件', '策略-2', '过滤器-2', false, true, '已停止', '/datastore/admin/pcap/example.pcap');

INSERT INTO storage_strategies (name, file_size, file_count, out_of_disk_action, file_type, trigger_type, time_range) 
VALUES 
('策略-1', '64M', 10, '循环覆盖', 'PCAP', '定时器', '2024-01-01 00:00:00 至 2024-12-31 23:59:59'),
('策略-2', '128M', 20, '停止', 'PCAPNG', '告警', NULL);

-- 修改采集器表，添加会话ID字段
ALTER TABLE collectors ADD COLUMN session_id VARCHAR(100);

-- 若不存在则为已存在的数据库添加 file_path 字段
ALTER TABLE collectors ADD COLUMN IF NOT EXISTS file_path VARCHAR(255);
