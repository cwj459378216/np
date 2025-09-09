
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

-- 插入一些测试数据
INSERT INTO system_logs (date, level, user_name, module, content) VALUES
    ('2024-11-25 10:30:45', 'INFO', 'admin', 'Auth', 'User login successful'),
    ('2024-11-24 15:20:30', 'INFO', 'admin', 'Database', 'Database backup completed'),
    ('2024-11-23 08:45:15', 'WARNING', 'system', 'Network', 'Network connection anomaly'),
    ('2024-11-22 20:10:25', 'ERROR', 'admin', 'Security', 'Unauthorized access detected');

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

-- 插入一些测试数据
INSERT INTO assets (asset_name, ip_address, mac_address, type, status, last_updated) VALUES
    ('Server-01', '192.168.1.100', '00:1B:44:11:3A:B7', 'Server', 'Active', '2024-03-21 10:30:45'),
    ('Workstation-02', '192.168.1.101', '00:1B:44:11:3A:B8', 'Workstation', 'Active', '2024-03-21 10:30:45');


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

-- 插入一些测试数据
INSERT INTO notification_settings (name, description, service, mail_server, security, email_port, account_name, password, sender, receiver, subject) 
VALUES ('Email Server', 'SMTP server configuration for email notifications', 'email', 'smtp.example.com', 'ssl', '587', 'admin@example.com', '******', 'noreply@example.com', 'admin@company.com', 'System Notification');

INSERT INTO notification_settings (name, description, service, host, syslog_port) 
VALUES ('Syslog Server', 'Syslog server for system notifications', 'syslog', '192.168.1.100', '514');

-- 创建角色表
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
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

-- 先插入模板数据
INSERT INTO templates (name, description, content, creator) VALUES
(
    'Security Dashboard',
    'Security monitoring dashboard template',
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
    'System'
) ON CONFLICT (id) DO NOTHING;
ON CONFLICT (name) DO NOTHING;

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

-- 移除外键约束（Templates 不应该与已生成的 Reports 关联）
ALTER TABLE reports 
DROP CONSTRAINT IF EXISTS fk_reports_template;

-- 插入报告数据（使用 SELECT 确保引用的模板存在）
INSERT INTO reports (name, description, template_id, file_path, trigger_mode, creator, created_at) 
SELECT 
    'Monthly Security Report',
    'Generated from Security Dashboard template',
    t.id,
    '/reports/monthly/security_report_202403.pdf',
    'Manual',
    'System',
    CURRENT_TIMESTAMP
FROM templates t
WHERE t.name = 'Security Dashboard'
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
    'High CPU Usage Alert',
    'Alert when CPU usage is high',
    '24 hours',
    'condition',
    '[{"field": "cpu_usage", "value": "90"}]',
    'email',
    'admin@example.com',
    'Active'
),
(
    'Memory Warning',
    'Warning for high memory usage',
    '7 days',
    'new_event',
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
    'Daily System Report',
    'Generate system status report daily',
    'Security Dashboard',
    'Daily',
    '00:00:00',
    'admin@example.com',
    'Active'
),
(
    'Weekly Security Report',
    'Generate security analysis report weekly',
    'Security Dashboard',
    'Weekly',
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

-- 插入示例数据
INSERT INTO rules_policy (name, description, enabled) VALUES
('Default Policy', 'Default security policy configuration', true),
('Web Security', 'Web application security policy', true);

-- 示例 Snort 规则数据
INSERT INTO suricata_rules (sid, protocol, direction, src_port, dst_port, msg, classtype, priority, cve, rule, filename)
VALUES
(1000001, 'tcp', '->', 'any', '80', 'Custom Web Attack', 'web-application-attack', 1, 'CVE-2023-1234', 'alert tcp any any -> 192.168.1.0/24 80 (msg:"Custom Web Attack"; sid:1000001; classtype:web-application-attack; priority:1;)', 'local.rules'),
(1000002, 'udp', '->', '53', 'any', 'Attempted Recon', 'attempted-recon', 2, 'CVE-2023-5678', 'alert udp 10.0.0.0/8 53 -> any any (msg:"Attempted Recon"; sid:1000002; classtype:attempted-recon; priority:2;)', 'local.rules');

-- 若不存在则插入示例规则
INSERT INTO suricata_rules (sid, protocol, direction, src_port, dst_port, msg, classtype, priority, cve, rule, filename)
SELECT 1000001, 'tcp', '->', 'any', '80', 'Custom Web Attack', 'web-application-attack', 1, 'CVE-2023-1234', 'alert tcp any any -> 192.168.1.0/24 80 (msg:"Custom Web Attack"; sid:1000001; classtype:web-application-attack; priority:1;)', 'local.rules'
WHERE NOT EXISTS (SELECT 1 FROM suricata_rules WHERE sid = 1000001);

INSERT INTO suricata_rules (sid, protocol, direction, src_port, dst_port, msg, classtype, priority, cve, rule, filename)
SELECT 1000002, 'udp', '->', '53', 'any', 'Attempted Recon', 'attempted-recon', 2, 'CVE-2023-5678', 'alert udp 10.0.0.0/8 53 -> any any (msg:"Attempted Recon"; sid:1000002; classtype:attempted-recon; priority:2;)', 'local.rules'
WHERE NOT EXISTS (SELECT 1 FROM suricata_rules WHERE sid = 1000002);

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

-- 插入一些测试数据
INSERT INTO rule_update_config (update_mode, update_url, update_interval, username, password, last_update_time, total_rules, status) 
VALUES ('automatic', 'https://rules.example.com/update', 24, 'admin', 'encrypted_password', '2024-03-21 14:30:00', 1234, 'active');

INSERT INTO rule_update_history (update_time, update_mode, total_rules, status, message)
VALUES 
('2024-03-21 14:30:00', 'automatic', 1234, 'success', 'Rules updated successfully'),
('2024-03-20 14:30:00', 'manual', 1200, 'success', 'Manual update completed');

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
('alert tcp any any -> any any (msg:"Custom Local Rule"; sid:1000001;)', '2024-03-21', 'Enabled', 'Custom', '2024-03-21 10:30:45');

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

-- 插入默认数据
INSERT INTO system_time_settings (
    time_setting_method, 
    manual_time, 
    time_zone, 
    auto_timezone_detection
) VALUES (
    'manual',
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
    importance_level VARCHAR(20) DEFAULT 'normal', -- 'important', 'normal', 'negligible'
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入一些初始数据
INSERT INTO protocol_settings (protocol_name, port, description, is_enabled, importance_level) VALUES
('HTTP', 80, 'HTTP stands for Hypertext Transfer Protocol, used for transferring web pages and data on the internet.', true, 'normal'),
('DNS', 53, 'DNS stands for Domain Name System, translating domain names into IP addresses so that computers can locate each other.', true, 'important'),
('SSL', 443, 'SSL (Secure Sockets Layer) is used for securing HTTP traffic, commonly referred to as HTTPS. It encrypts data to ensure security.', true, 'normal'),
('SMB', 445, 'SMB stands for Server Message Block, used for file sharing, printer sharing, and other network services between computers.', false, 'negligible'),
('FTP', 21, 'FTP stands for File Transfer Protocol, a standard network protocol for transferring files between a client and a server.', true, 'normal');

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

-- 插入一些初始数据
INSERT INTO alarm_settings (name, type, priority, threshold, description, is_enabled) VALUES
('CPU Usage Alert', 'threshold', 'high', 90, 'Alert when CPU usage exceeds 90%', true),
('Memory Usage Warning', 'threshold', 'medium', 80, 'Warning when memory usage exceeds 80%', true),
('Network Traffic Pattern', 'pattern', 'low', 1000, 'Monitor unusual network traffic patterns', false),
('Disk Space Alert', 'threshold', 'high', 95, 'Critical alert when disk space usage exceeds 95%', true),
('Login Anomaly Detection', 'anomaly', 'medium', 5, 'Detect unusual login patterns', true),
('Database Connection Alert', 'pattern', 'high', 100, 'Monitor database connection failures', false);

-- 创建collectors表
CREATE TABLE collectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    creation_time TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    interface_name VARCHAR(50) NOT NULL,
    storage_strategy VARCHAR(50) NOT NULL,
    filter_strategy VARCHAR(50),
    protocol_analysis_enabled BOOLEAN DEFAULT false,
    ids_enabled BOOLEAN DEFAULT false,
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

-- 插入测试数据
INSERT INTO collectors (name, interface_name, storage_strategy, filter_strategy, protocol_analysis_enabled, ids_enabled, status) 
VALUES 
('Collector-1', 'DPDK', 'Strategy-1', 'Filter-1', true, false, 'running'),
('Collector-2', 'File', 'Strategy-2', 'Filter-2', false, true, 'stopped');

INSERT INTO storage_strategies (name, file_size, file_count, out_of_disk_action, file_type, trigger_type, time_range) 
VALUES 
('Strategy-1', '64M', 10, 'Wrap', 'PCAP', 'Timer', '2024-01-01 00:00:00 to 2024-12-31 23:59:59'),
('Strategy-2', '128M', 20, 'Stop', 'PCAPNG', 'Alarm', NULL);

-- 修改 collectors 表，添加 session_id 字段
ALTER TABLE collectors ADD COLUMN session_id VARCHAR(100);



