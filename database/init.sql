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



