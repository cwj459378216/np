-- 创建数据库
CREATE DATABASE data;

-- 连接到数据库
\c data;

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

-- 插入一些测��数据
INSERT INTO assets (asset_name, ip_address, mac_address, type, status, last_updated) VALUES
    ('Server-01', '192.168.1.100', '00:1B:44:11:3A:B7', 'Server', 'Active', '2024-03-21 10:30:45'),
    ('Workstation-02', '192.168.1.101', '00:1B:44:11:3A:B8', 'Workstation', 'Active', '2024-03-21 10:30:45');

-- 创建网络接口表
CREATE TABLE network_interfaces (
    id SERIAL PRIMARY KEY,
    interface_name VARCHAR(50) NOT NULL,
    method VARCHAR(20) NOT NULL,
    ip_address VARCHAR(15),
    netmask VARCHAR(15),
    gateway VARCHAR(15),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- 插入一些测试数据
INSERT INTO network_interfaces (interface_name, method, ip_address, netmask, gateway) VALUES
    ('eno1', 'Static', '192.168.0.58', '255.255.255.0', '192.168.0.1'),
    ('eno2', 'DHCP', NULL, NULL, NULL);

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
('admin', '$2a$10$BqWZyqrZ0Kg3pxqL0q.RXOyYzXbWFM3U8AFZZ6mJywX5/pXNL4rMi', 'admin@example.com', 
 (SELECT id FROM roles WHERE name = 'Administrator'), 'System administrator', true),
('operator', '$2a$10$BqWZyqrZ0Kg3pxqL0q.RXOyYzXbWFM3U8AFZZ6mJywX5/pXNL4rMi', 'operator@example.com', 
 (SELECT id FROM roles WHERE name = 'Operator'), 'System operator', true); 

-- 创建模板表
CREATE TABLE IF NOT EXISTS templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content JSON,
    creator VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入一些测试数据
INSERT INTO templates (name, description, content, creator) VALUES
(
    'Sales Dashboard',
    'Sales performance analysis dashboard',
    '{
        "widgets": [
            {
                "id": "chart_1",
                "type": "chart",
                "chartType": "line",
                "position": {"x": 0, "y": 0, "cols": 2, "rows": 2},
                "config": {
                    "title": "Sales Trend",
                    "dataSource": "sales_data",
                    "aggregation": {"field": "amount", "type": "sum"}
                }
            }
        ]
    }',
    'John Doe'
),
(
    'Marketing Analytics',
    'Marketing campaign analysis dashboard',
    '{
        "widgets": [
            {
                "id": "chart_2",
                "type": "chart",
                "chartType": "pie",
                "position": {"x": 2, "y": 0, "cols": 2, "rows": 2},
                "config": {
                    "title": "Channel Distribution",
                    "dataSource": "marketing_data",
                    "aggregation": {"field": "visits", "type": "count"}
                }
            }
        ]
    }',
    'Jane Smith'
);

-- 添加报告表的创建语句
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    create_time TIMESTAMP(0) NOT NULL,
    creator VARCHAR(100) NOT NULL,
    trigger_mode VARCHAR(50) NOT NULL,
    file_path VARCHAR(255),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
) ;

-- 为reports表创建索引
CREATE INDEX idx_create_time ON reports(create_time);
CREATE INDEX idx_creator ON reports(creator);

-- 插入报告示例数据
INSERT INTO reports (name, description, create_time, creator, trigger_mode, file_path) VALUES
(
    'Monthly Report',
    'Monthly security analysis report',
    '2024-01-15 10:30:00',
    'John Doe',
    'Manual',
    '/reports/monthly/2024-01-security-analysis.pdf'
),
(
    'Weekly Report',
    'Weekly security status report',
    '2024-01-16 14:20:00',
    'Jane Smith',
    'Scheduled',
    '/reports/weekly/2024-w3-security-status.pdf'
),
(
    'Daily Report',
    'Daily system health check report',
    '2024-01-17 09:00:00',
    'Mike Johnson',
    'Scheduled',
    '/reports/daily/2024-01-17-health-check.pdf'
),
(
    'Incident Report',
    'Security incident investigation report',
    '2024-01-17 15:45:00',
    'Sarah Wilson',
    'Manual',
    '/reports/incident/2024-01-17-investigation.pdf'
);

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
    'System Status Template',
    'Daily',
    '00:00:00',
    'admin@example.com',
    'Active'
),
(
    'Weekly Security Report',
    'Generate security analysis report weekly',
    'Security Alert Template',
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
('Default Policy', 'Default security policy configuration', true),
('Web Security', 'Web application security policy', true);

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



