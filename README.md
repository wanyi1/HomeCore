# HomeCore — 家庭数字中枢 (Family Intelligence Operating System)

HomeCore 是专为家庭数字场景打造的综合数字操作系统。首期专注于 Windows 10/11 x64 主力电脑本地部署，未来支持一键迁移至低功耗 Linux 小主机。

---

## 核心设计理念
1. **真实与诚实**：严禁伪造设备在线状态或虚拟能耗数据。无法连接的设备清晰标记“未连接/离线”，提供独立隔离的【演示模拟器】。
2. **本地优先与数据主权**：核心数据存储于本地 SQLite (WAL模式)，默认仅监听 `127.0.0.1`，绝不静默上报隐私。
3. **专业深色设计系统**：采用工业科技深色主题（主背景 `#0B1020`，卡片 `#171F30`，主色 `#3B82F6`），全中文用户界面。
4. **高可扩展性**：支持 Home Assistant、MQTT 等多协议适配器插件化接入。

---

## 目录结构
```
e:\HomeCore/
├── apps/
│   └── web/              # React 18 + Vite + Tailwind CSS + Lucide 界面
├── services/
│   └── api/              # FastAPI 异步核心后端
├── packages/
│   └── contracts/        # 契约与公共定义
├── integrations/
│   └── adapters/         # 适配器抽象与实现
├── tests/
│   ├── unit/             # 单元测试
│   └── integration/      # 接口集成测试
├── docs/                 # 架构设计与ADR文档
├── scripts/              # Windows 启动与运维脚本
├── .env.example          # 环境配置示例
└── README.md
```

---

## 快速启动 (Windows)
1. **安装后端依赖** (Python 3.12+):
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\pip install -r services\api\requirements.txt
   ```
2. **安装前端依赖** (Node 18+ & pnpm):
   ```powershell
   cd apps\web
   pnpm install
   ```
3. **一键启动**：
   运行项目根目录下的 `scripts\start-windows.bat` 或 `scripts\start-windows.ps1`，浏览器自动打开 `http://127.0.0.1:5173`。
