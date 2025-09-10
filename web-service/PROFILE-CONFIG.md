# Spring Boot Profile Configuration Guide

## 配置文件说明

项目现在包含四个配置文件，环境相关的配置已经分离：

### 1. `application.properties` (基础配置)
- 包含通用配置和默认 profile 设置
- 默认激活本地开发环境 (`spring.profiles.active=local`)
- **不再包含**环境相关的自定义配置

### 2. `application-local.properties` (本地开发环境)
- **数据库**: 连接到开发数据库 `octopusx@192.168.0.3:5432`
- **日志**: 详细的调试日志，包含 SQL 语句
- **Swagger**: 启用 API 文档
- **性能**: 启用开发工具和热重载
- **日志文件**: `logs/web-service-local.log` (最大50MB, 保留7天)
- **用途**: IDE 调试和本地开发

### 3. `application-dev.properties` (开发/测试环境)
- **数据库**: 连接到开发数据库 `octopusx@192.168.0.3:5432`
- **日志**: 详细的调试日志，包含 SQL 语句
- **Swagger**: 启用 API 文档
- **性能**: 启用开发工具和热重载
- **日志文件**: `logs/web-service-dev.log` (最大50MB, 保留7天)
- **用途**: 开发服务器部署

### 4. `application-prod.properties` (生产环境)
- **数据库**: 连接到生产数据库 `octopusx@localhost:5432`
- **日志**: 仅输出重要信息，禁用 SQL 日志
- **Swagger**: 禁用 API 文档
- **性能**: 优化的 Tomcat 线程池配置
- **安全**: 禁用错误详情输出
- **日志文件**: `/opt/np/logs/web-service.log` (最大100MB, 保留30天, 总大小限制1GB)
- **自定义配置**:
  - `app.frontend.url=http://localhost` (生产前端地址)
  - `app.report.storage.path=/opt/np/reports` (生产报告路径)
  - `elasticsearch.host=localhost:9200` (本地ES服务)
  - `third-party.base-url=http://localhost:8338/api` (本地服务)
  - `ai.base-url=http://localhost:11434` (本地AI服务)

## 环境配置差异

| 配置项 | 本地环境 (local) | 开发环境 (dev) | 生产环境 (prod) |
|--------|-----------------|---------------|----------------|
| **数据库** | `192.168.0.3:5432` | `192.168.0.3:5432` | `localhost:5432` |
| **前端URL** | `http://localhost:4200` | `http://localhost:4200` | `http://localhost` |
| **报告路径** | `reports` | `reports` | `/opt/np/reports` |
| **Elasticsearch** | `192.168.0.3:9201` | `192.168.0.3:9201` | `localhost:9200` |
| **第三方服务** | `192.168.0.3:8338` | `192.168.0.3:8338` | `localhost:8338` |
| **AI服务** | `192.168.0.66:11434` | `192.168.0.66:11434` | `localhost:11434` |
| **用途** | IDE调试开发 | 开发服务器 | 生产服务器 |

## 使用方法

### 本地开发环境启动 (默认)
```bash
# 方法1: 默认使用 local profile
mvn spring-boot:run

# 方法2: IDE 中直接运行 (默认 local profile)
# 或者设置 VM options: -Dspring.profiles.active=local
```

### 开发环境启动
```bash
# 明确指定 dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# 或环境变量
export SPRING_PROFILES_ACTIVE=dev
mvn spring-boot:run
```

### 生产环境启动
```bash
# 方法1: 命令行指定
java -jar web-service.jar --spring.profiles.active=prod

# 方法2: 环境变量
export SPRING_PROFILES_ACTIVE=prod
java -jar web-service.jar

# 方法3: systemd 服务 (已在 deploy.sh 中配置)
systemctl start np-web-service
```

### 验证当前配置
```bash
# 查看应用启动日志，确认激活的 profile
# 开发环境会显示: The following profiles are active: dev
# 生产环境会显示: The following profiles are active: prod
```

## 自定义属性说明

以下属性是应用程序自定义的，IDE 会显示为"未知属性"，这是正常的：
- `app.frontend.url` - 前端应用 URL
- `app.report.storage.path` - 报告存储路径
- `third-party.base-url` - 第三方服务 URL
- `elasticsearch.*` - Elasticsearch 配置
- `ai.*` - AI 服务配置
- `suricata.*` - Suricata 配置

这些属性需要在对应的 Java Configuration 类中通过 `@ConfigurationProperties` 或 `@Value` 注解来读取。

## 配置文件优先级

Spring Boot 的配置文件加载顺序：
1. `application.properties` (基础配置)
2. `application-{profile}.properties` (环境特定配置，会覆盖基础配置)
3. 环境变量 (最高优先级，会覆盖文件配置)

这样设计确保了每个环境都有自己的配置，避免了配置混乱。
