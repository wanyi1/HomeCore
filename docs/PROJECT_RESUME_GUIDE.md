# HomeCore — 项目暂停与开发恢复指南 (Project Resume Guide)

本文档为 HomeCore 项目暂停开发后的完整交接与环境恢复手册。即使更换电脑或全新部署，也可依据本指南在 10 分钟内无缝还原开发环境并继续后续迭代。

---

## 一、当前开发阶段与成果现状

- **当前版本**：HomeCore V0.3 (`v0.3.0-dev-archive`)
- **当前开发分支**：`feature/iot-v0.3-core`
- **已完成里程碑**：
  - **阶段 0 & 1**：前后端基础架构、JWT 认证与管理员首次引导、房间与设备数据字典、SQLite WAL 高并发连接池、操作审计流水。
  - **Windows 稳定性治理**：PowerShell 5.1 / CMD 路径解析规范化、真实端到端 HTTP 健康检查探针门禁、端口占用智能复用与外部冲突保护、控制台 UTF-8 乱码彻底根治。
  - **V0.2 全局 UI 重构**：现代深色赛博居家设计系统（`#0A0F1D` + 毛玻璃 + 环境漫反射）、家庭数字驾驶舱、三重视图模式（分组/网格/列表）、类型特异化控制组件（调光滑块/温控步进/拟态触控）、二维户型图 SVG 蓝图预演、全局 Toast 通知与详情抽屉。
  - **V0.3 物联网核心与真实设备接入**：
    - 统一物联网管理引擎 `IoTEngine` 与 `BaseDeviceAdapter` 抽象层。
    - Home Assistant 真实双工适配器（REST 连通性诊断、版本与实体扫描、WebSocket `state_changed` 实时事件订阅、心跳保活与断线指数退避重连）。
    - MQTT 真实物联网适配器（`paho-mqtt` 客户端管理、白名单精准订阅、JSON/纯文本报文解析、QoS 1 投递与 Future 状态回执确认）。
    - 敏感凭据 Fernet 对称加密落库与掩码脱敏。
    - 实体批量发现、无损去重导入与空间绑定向导。
    - 严格秉持状态诚实原则（真实离线设备控制强拦截）与演示沙箱隔离机制。
    - HomeCore Voice 语音中枢网关预留接口 (`/api/v1/voice/query`, `/api/v1/voice/command`)。

---

## 二、Git 仓库与云端备份信息

- **GitHub 私有仓库地址**：`https://github.com/wanyi1/HomeCore.git`
- **仓库可见性**：`Private (私有)`
- **核心分支**：
  - `main`：初始基础版本
  - `feature/ui-v0.2-revamp`：V0.2 UI 重构快照
  - `feature/iot-v0.3-core`：**当前主工作开发分支**
- **归档标签 (Git Tag)**：`v0.3.0-dev-archive`
- **本地归档压缩包**：`E:\HomeCore-Backups\HomeCore-V0.3-Source-Archive.zip`
- **本地独立数据库备份**：`E:\HomeCore-Backups\homecore-db-v0.3-consistent.db`

---

## 三、环境依赖要求 (Windows 10/11 x64)

| 依赖项 | 推荐版本 | 检查命令 |
| :--- | :--- | :--- |
| **操作系统** | Windows 10/11 64-bit | `[System.Environment]::OSVersion` |
| **Git** | 2.40+ | `git --version` |
| **Python** | 3.12 ~ 3.14 x64 | `python --version` |
| **Node.js** | 20.x ~ 22.x LTS (或更高) | `node --version` |
| **pnpm** | 9.x ~ 10.x | `pnpm --version` |
| **网络端口** | 8000 (API), 5173 (Web) | `netstat -ano \| findstr ":8000 :5173"` |

---

## 四、新机器环境恢复与依赖安装

### 1. 克隆代码
```powershell
git clone https://github.com/wanyi1/HomeCore.git E:\HomeCore
cd E:\HomeCore
git checkout feature/iot-v0.3-core
```

### 2. 配置环境变量
```powershell
Copy-Item .env.example .env
```
根据实际环境核对 `.env` 中的 `SECRET_KEY`、`PORT` 等配置。

### 3. 安装 Python 后端虚拟环境与依赖
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r services\api\requirements.txt
```

### 4. 安装前端 Web 依赖
```powershell
cd apps\web
pnpm install
cd ..\..
```

---

## 五、数据库恢复与数据导入

HomeCore 遵循无损数据保留原则：
1. **全新开发环境**：
   无需手动还原，直接启动系统，FastAPI lifespan 会自动执行 `init_db()` 和 `run_migrations()`，在项目根目录自动创建 `homecore.db` 并应用 WAL 高并发模式。首次打开浏览器访问 `http://127.0.0.1:5173` 将进入管理员初始化引导。
2. **恢复历史业务数据**：
   若需还原历史房间、物理设备及管理员账号，将备份的 `homecore-db-v0.3-consistent.db` 拷贝至根目录并重命名为 `homecore.db`：
   ```powershell
   Copy-Item "E:\HomeCore-Backups\homecore-db-v0.3-consistent.db" "E:\HomeCore\homecore.db" -Force
   ```
   启动时系统会自动检测已有表结构并验证数据兼容性。

---

## 六、启动与测试验证

### 1. 一键启动 (Windows 启动器)
使用项目专属启动脚本（已解决端口复用、路径解析与中文编码）：
```cmd
scripts\start-windows.bat
```
或在 PowerShell 5.1+ 中运行：
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-windows.ps1
```
浏览器将自动打开 `http://127.0.0.1:5173`。

### 2. 自动化测试套件回归
```powershell
# 运行后端 pytest 全量 23 项测试与前端编译构建
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\run-tests.ps1

# 运行启动器 5 大稳定性场景验证
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\test-launcher-scenarios.ps1
```

---

## 七、尚未完成功能与后续阶段接入计划

### 1. 阶段 4 规划功能 (后续优先恢复项)
- **多条件自动化编排引擎 (Automation & Scene Engine)**：
  - 触发器 (Triggers)：定时 Cron、设备状态变更（如“门磁开启”）、数值阈值（如“温度 > 28℃”）。
  - 条件过滤 (Conditions)：时间范围（仅夜间）、空间情境（在离家模式下）。
  - 执行动作 (Actions)：批量控制设备、模式切换、本地扬声器播报。
- **二维户型图交互编辑器 (Interactive Floorplan)**：
  - 将现有的 SVG 蓝图预演升级为支持拖拽放置设备落点、实时灯光辉光热区渲染的户型图编辑器。
- **HomeCore Voice 本地语音终端固件与唤醒**：
  - 基于已预留的 `/api/v1/voice/query` 与 `/api/v1/voice/command` 接入轻量唤醒词检测与离线 ASR 模型。

### 2. 真实物理设备接入联调计划
- 接入实际局域网 Home Assistant 实例与物理 Zigbee 网关，完成灯光、传感器实机通电动作验证。
- 接入实际 MQTT Broker（如 EMQX），对接入的 ESP32 / Tasmota 设备进行长时稳定性压测。

---

## 八、恢复开发推荐实施步骤

1. 执行 `git status` 确保工作树干净。
2. 运行 `scripts\run-tests.ps1` 确认测试 100% 通过（23/23）。
3. 从 `feature/iot-v0.3-core` 分支切出新特性分支（如 `feature/automation-v0.4-engine`）。
4. 参考 `docs/DATA_MODELS.md` 与 `docs/API_DRAFT.md` 开始自动化引擎与规则调度器开发。
