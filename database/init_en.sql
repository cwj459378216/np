-- Create database
CREATE DATABASE data;

-- Connect to database
\c data;

-- Create logs table
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP(0) NOT NULL,
    level VARCHAR(20) NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO system_logs (date, level, user_name, module, content) VALUES
    ('2024-11-25 10:30:45', 'INFO', 'admin', 'Auth', 'User login successful'),
    ('2024-11-24 15:20:30', 'INFO', 'admin', 'Database', 'Database backup completed'),
    ('2024-11-23 08:45:15', 'WARNING', 'system', 'Network', 'Network connection anomaly'),
    ('2024-11-22 20:10:25', 'ERROR', 'admin', 'Security', 'Unauthorized access detected');

-- Create assets table
CREATE TABLE assets (
    id SERIAL PRIMARY KEY,
    asset_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(15) NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_updated TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO assets (asset_name, ip_address, mac_address, type, status, last_updated) VALUES
    ('Server-01', '192.168.1.100', '00:1B:44:11:3A:B7', 'Server', 'Active', '2024-03-21 10:30:45'),
    ('Workstation-02', '192.168.1.101', '00:1B:44:11:3A:B8', 'Workstation', 'Active', '2024-03-21 10:30:45');


-- Create notification settings table
CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    service VARCHAR(50) NOT NULL,
    -- Email related fields
    mail_server VARCHAR(100),
    security VARCHAR(20),
    email_port VARCHAR(10),
    account_name VARCHAR(100),
    password VARCHAR(100),
    sender VARCHAR(100),
    receiver VARCHAR(100),
    subject VARCHAR(200),
    -- Syslog related fields
    host VARCHAR(100),
    syslog_port VARCHAR(10),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO notification_settings (name, description, service, mail_server, security, email_port, account_name, password, sender, receiver, subject) 
VALUES ('Email Server', 'SMTP server configuration for email notifications', 'email', 'smtp.example.com', 'ssl', '587', 'admin@example.com', '******', 'noreply@example.com', 'admin@company.com', 'System Notification');

INSERT INTO notification_settings (name, description, service, host, syslog_port) 
VALUES ('Syslog Server', 'Syslog server for system notifications', 'syslog', '192.168.1.100', '514');

-- Create roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
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

-- Create users table
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

-- Insert test data
INSERT INTO users (username, password, email, role_id, description, status) VALUES
('admin', '$2a$10$46rdxR82sJ7yy1X0kWRaquxwNdwQVu30VmwqSx2VQy006GqbUPb0S', 'admin@example.com', 
 (SELECT id FROM roles WHERE name = 'Administrator'), 'System administrator', true),
('operator', '$2a$10$BqWZyqrZ0Kg3pxqL0q.RXOyYzXbWFM3U8AFZZ6mJywX5/pXNL4rMi', 'operator@example.com', 
 (SELECT id FROM roles WHERE name = 'Operator'), 'System operator', true); 

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB,
    creator VARCHAR(100),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Insert template data first
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

-- Then create reports table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_template_id ON reports(template_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_creator ON reports(creator);

-- Add foreign key constraint (if needed)
ALTER TABLE reports 
DROP CONSTRAINT IF EXISTS fk_reports_template;

ALTER TABLE reports 
ADD CONSTRAINT fk_reports_template 
FOREIGN KEY (template_id) 
REFERENCES templates(id);

-- Insert report data (using SELECT to ensure referenced template exists)
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

-- Create notification rules table
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

-- Insert sample data
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

-- Create report schedulers table
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

-- Add sample data
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

-- Create rules policy table
CREATE TABLE rules_policy (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Create rules table
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

-- Create policy rules association table
CREATE TABLE policy_rules (
    policy_id INTEGER REFERENCES rules_policy(id),
    rule_id INTEGER REFERENCES rules(id),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (policy_id, rule_id)
);

-- Insert sample data
INSERT INTO rules_policy (name, description, enabled) VALUES
('Default Policy', 'Default security policy configuration', true),
('Web Security', 'Web application security policy', true);

INSERT INTO rules (sid, protocol, source_address, source_port, destination_address, destination_port, class_type, cve, reference) VALUES
('1000001', 'TCP', 'any', 'any', '192.168.1.0/24', '80', 'web-application-attack', 'CVE-2023-1234', 'bugtraq,1234'),
('1000002', 'UDP', '10.0.0.0/8', '53', 'any', 'any', 'attempted-recon', 'CVE-2023-5678', 'url,example.com');

-- Check if rules already exist
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

-- Create rule update configuration table
CREATE TABLE rule_update_config (
    id SERIAL PRIMARY KEY,
    update_mode VARCHAR(20) NOT NULL,  -- 'automatic' or 'manual'
    update_url VARCHAR(255),
    update_interval INTEGER,  -- in hours
    username VARCHAR(100),
    password VARCHAR(100),
    last_update_time TIMESTAMP(0),
    total_rules INTEGER,
    status VARCHAR(20),
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Create rule update history table
CREATE TABLE rule_update_history (
    id SERIAL PRIMARY KEY,
    update_time TIMESTAMP(0) NOT NULL,
    update_mode VARCHAR(20) NOT NULL,
    total_rules INTEGER,
    status VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO rule_update_config (update_mode, update_url, update_interval, username, password, last_update_time, total_rules, status) 
VALUES ('automatic', 'https://rules.example.com/update', 24, 'admin', 'encrypted_password', '2024-03-21 14:30:00', 1234, 'active');

INSERT INTO rule_update_history (update_time, update_mode, total_rules, status, message)
VALUES 
('2024-03-21 14:30:00', 'automatic', 1234, 'success', 'Rules updated successfully'),
('2024-03-20 14:30:00', 'manual', 1200, 'success', 'Manual update completed');

-- Create local rules table
CREATE TABLE local_rules (
    id SERIAL PRIMARY KEY,
    rule_content TEXT NOT NULL,
    created_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    last_updated TIMESTAMP(0) NOT NULL
);

-- Insert sample data
INSERT INTO local_rules (rule_content, created_date, status, category, last_updated) VALUES
('alert tcp any any -> any any (msg:"Custom Local Rule"; sid:1000001;)', '2024-03-21', 'Enabled', 'Custom', '2024-03-21 10:30:45');

-- Add after existing tables
CREATE TABLE system_time_settings (
    id SERIAL PRIMARY KEY,
    time_setting_method VARCHAR(20) NOT NULL, -- 'manual' or 'ntp'
    manual_time TIMESTAMP(0),
    ntp_server VARCHAR(255),
    sync_frequency VARCHAR(50),
    time_zone VARCHAR(50) NOT NULL,
    auto_timezone_detection BOOLEAN DEFAULT false,
    created_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP
);

-- Insert default data
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

-- Add after existing tables
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

-- Insert initial data
INSERT INTO protocol_settings (protocol_name, port, description, is_enabled, importance_level) VALUES
('HTTP', 80, 'HTTP stands for Hypertext Transfer Protocol, used for transferring web pages and data on the internet.', true, 'normal'),
('DNS', 53, 'DNS stands for Domain Name System, translating domain names into IP addresses so that computers can locate each other.', true, 'important'),
('SSL', 443, 'SSL (Secure Sockets Layer) is used for securing HTTP traffic, commonly referred to as HTTPS. It encrypts data to ensure security.', true, 'normal'),
('SMB', 445, 'SMB stands for Server Message Block, used for file sharing, printer sharing, and other network services between computers.', false, 'negligible'),
('FTP', 21, 'FTP stands for File Transfer Protocol, a standard network protocol for transferring files between a client and a server.', true, 'normal');

-- Create alarm settings table
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

-- Insert initial data
INSERT INTO alarm_settings (name, type, priority, threshold, description, is_enabled) VALUES
('CPU Usage Alert', 'threshold', 'high', 90, 'Alert when CPU usage exceeds 90%', true),
('Memory Usage Warning', 'threshold', 'medium', 80, 'Warning when memory usage exceeds 80%', true),
('Network Traffic Pattern', 'pattern', 'low', 1000, 'Monitor unusual network traffic patterns', false),
('Disk Space Alert', 'threshold', 'high', 95, 'Critical alert when disk space usage exceeds 95%', true),
('Login Anomaly Detection', 'anomaly', 'medium', 5, 'Detect unusual login patterns', true),
('Database Connection Alert', 'pattern', 'high', 100, 'Monitor database connection failures', false);

-- Create collectors table
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

-- Create storage strategies table
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

-- Insert test data
INSERT INTO collectors (name, interface_name, storage_strategy, filter_strategy, protocol_analysis_enabled, ids_enabled, status, file_path) 
VALUES 
('Collector-1', 'DPDK', 'Strategy-1', 'Filter-1', true, false, 'running', NULL),
('Collector-2', 'File', 'Strategy-2', 'Filter-2', false, true, 'stopped', '/datastore/admin/pcap/example.pcap');

INSERT INTO storage_strategies (name, file_size, file_count, out_of_disk_action, file_type, trigger_type, time_range) 
VALUES 
('Strategy-1', '64M', 10, 'Wrap', 'PCAP', 'Timer', '2024-01-01 00:00:00 to 2024-12-31 23:59:59'),
('Strategy-2', '128M', 20, 'Stop', 'PCAPNG', 'Alarm', NULL);

-- Modify collectors table, add session_id field
ALTER TABLE collectors ADD COLUMN session_id VARCHAR(100);

-- If not exists, add file_path column for existing databases
ALTER TABLE collectors ADD COLUMN IF NOT EXISTS file_path VARCHAR(255);
