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