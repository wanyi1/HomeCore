# ADR-0001: HomeCore V1.0 系统分层架构与本地部署决策

## 状态
已接受 (Accepted)

## 背景
HomeCore 是专为家庭数字场景设计的家庭操作系统（Family Intelligence Operating System），首期重点在 Windows 10/11 x64 主力 PC 本地部署运行，未来具备无缝迁移至低功耗 Linux 小主机的能力。
系统需要支撑设备管理、多协议集成（Home Assistant/MQTT）、自动化编排、网络扫描、主机监控及 AI 助手的长期扩展。

## 架构决策

1. **分层架构**：
   - **呈现层 (Web UI)**: React + TypeScript + Vite + Tailwind CSS，全中文、工业科技深色系统。
   - **接口网关与认证层 (API & Auth)**: FastAPI 异步框架，提供标准 RESTful API 和 WebSocket 实时通道。
   - **业务领域服务层 (Domain Services)**:
     - 认证与权限 (AuthService / RBAC: 管理员、成员、访客)
     - 房间管理 (RoomService)
     - 设备生命周期与操作审计 (DeviceService / AuditService)
     - 集成适配器中心 (IntegrationService)
   - **持久层 (Persistence)**: SQLAlchemy 2.0 ORM + SQLite WAL 引擎。

2. **安全隔离策略**：
   - 默认绑定 `127.0.0.1` 本地回环地址，禁止未经用户授权的公网或局域网免密暴露。
   - 密码采用安全 Hash (Bcrypt / Argon2)，JWT 会话认证，凭据不得在日志和前端输出。

3. **桌面与运行形态**：
   - 一期提供跨平台独立服务启动器与 Windows 便捷批处理脚本，端口隔离，健康探测，防止孤儿进程。
   - 后续阶段支持打包 Tauri 2 桌面轻量原生外壳。

## 影响与后果
- 正向：模块边界清晰、易于独立进行单元与集成测试、无外部商业云强依赖、数据主权完全留在本地。
- 负向：需要维护前端独立构建产物与后端服务生命周期管理。
