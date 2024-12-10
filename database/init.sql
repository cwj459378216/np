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