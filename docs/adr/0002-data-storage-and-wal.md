# ADR-0002: 本地数据持久化与 SQLite WAL 模式决策

## 状态
已接受 (Accepted)

## 背景
作为家庭数字中枢，系统需要对高频事件（状态变迁、心跳上报、审计日志、自动化动作）进行高可靠持久化，同时要求免除用户在 Windows 主力机上安装和维护沉重数据库服务的负担。

## 架构决策

1. **引擎选型**：
   - 选用 Python 内置驱动配合 SQLAlchemy 2.0 的 **SQLite**。
   - 启用 **WAL (Write-Ahead Logging)** 模式，显著提高并发读写性能，避免读者阻塞写者或写者阻塞读者。
   - 配置连接池与 PRAGMA 优化：
     ```sql
     PRAGMA journal_mode = WAL;
     PRAGMA synchronous = NORMAL;
     PRAGMA foreign_keys = ON;
     PRAGMA busy_timeout = 5000;
     ```

2. **多环境适配**：
   - 数据访问层完全基于 SQLAlchemy ORM 抽象建模。
   - 当未来用户需要迁移至 PostgreSQL（如多节点部署或巨量历史遥测），仅需切换环境变量 `DATABASE_URL`，无需修改业务逻辑。

3. **数据安全与备份**：
   - 数据库文件存储于程序数据目录，支持一键热快照与结构化备份恢复。
