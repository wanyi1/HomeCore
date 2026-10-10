# CHANGELOG — 变更日志

所有关键架构变动、功能发布和测试验收记录均在此维护。

## [0.1.0] - 2026-10-10
### Added (阶段 0 & 阶段 1)
- **环境审计**：完成 Windows 10/11 x64, Python 3.14, Node v25, pnpm 10, Git 2.53, 端口（8000/5173）检查。
- **架构决策**：发布 ADR-001（系统分层）、ADR-002（SQLite WAL 持久化）、ADR-003（真实状态诚实原则与独立演示模式）。
- **技术规范**：制定 `DATA_MODELS.md` 数据字典、`API_DRAFT.md` RESTful/WebSocket 规范及 `TASKS_AND_RISKS.md` 风险矩阵。
- **项目初始化**：搭建 `apps/web`, `services/api`, `integrations`, `tests`, `docs`, `scripts` 目录架构。
- **后端核心服务**：
  - 基于 FastAPI + SQLAlchemy 构建，内置 SQLite WAL 自动配置与连接池。
  - 实现管理员首次初始化向导、密码 Bcrypt 加密及 JWT 令牌认证机制。
  - 交付房间管理 (Room) 完整 CRUD 接口与设备归属关联。
  - 交付设备管理 (Device) 模型、状态快照 (DeviceState)、手动设备登记、设备控制与操作审计日志 (AuditLog)。
  - 实现独立隔离的演示数据种子 (Demo Seed)，真实设备与演示设备严格隔离。
  - 提供系统健康度探测与家庭总览聚合 API。
- **前端深色工业系统**：
  - 基于 React + Vite + Tailwind CSS + Lucide 搭建专业深色主题（#0B1020, #171F30, #3B82F6）。
  - 实现登录/首次安装向导、侧边栏导航、家庭总览仪表盘、房间管理及设备管理中心。
  - 界面提供真实的加载中、空数据、离线未连接状态展示与操作反馈。
- **Windows 启动脚本**：编写 `scripts/start-windows.bat` 与 `scripts/start-windows.ps1`。
- **自动化测试**：提供后端单元测试与集成测试套件。
