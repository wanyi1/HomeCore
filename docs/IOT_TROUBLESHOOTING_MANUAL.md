# HomeCore V0.3 — 设备接入与故障排查手册

本手册汇集 HomeCore V0.3 物联网核心系统的关键架构机制、常见异常排查指南及已知限制。

---

## 一、核心原则与机制说明

### 1. 真实状态诚实原则 (Honest State Principle)
- 任何无法建立通信的真实硬件，其物理状态必须如实呈现为“未连接/离线”。
- 严禁在设备掉线或未接入时，通过界面交互伪造“控制成功”或制造假能耗。
- 当真实设备处于离线状态时，任何下发的控制指令将在引擎网关层被安全阻断，并提示：`设备当前处于未连接状态，无法执行操作。请先检查物理电源或网络连接。`

### 2. 演示沙箱完全隔离 (Demo Sandbox Isolation)
- 演示设备（`is_demo = True`）仅用于无物理硬件环境下的体验演示与前端组件交互验证。
- 演示设备的状态由本地独立内存/状态机托管，绝不会向真实 Home Assistant 或外部 MQTT Broker 发起任何网络数据包。
- 物理设备与演示设备在数据库、API、控制链路及 UI 徽章上实现 100% 隔离。

### 3. 敏感凭据落库加密与传输脱敏
- Home Assistant 长期访问令牌和 MQTT 认证密码，在写入 SQLite 数据库前均由 Python `cryptography` 库以 AES/Fernet 对称算法加密。
- 前端查询集成列表或详情时，所有密码与令牌均经过脱敏遮罩处理（如 `eyJh...****`），绝不泄漏明文。

---

## 二、常见故障与排查步骤

### 1. Home Assistant 集成问题

- **Q: 点击“测试连通性”提示 HTTP 401 Unauthorized？**
  - **原因**：填写的长期访问令牌已被撤销、过期，或者在复制时遗漏了字符。
  - **解决**：在 Home Assistant 网页控制台重新生成令牌，完整复制后重新粘贴。

- **Q: 提示连接超时 (Connect Timeout)？**
  - **原因**：HomeCore 所在的 Windows 主机与 Home Assistant 实例不在同一个局域网，或者 Windows 防火墙、路由器 AP 隔离限制了内网访问。
  - **解决**：在 Windows PowerShell 中运行 `Test-NetConnection -ComputerName <HA_IP> -Port 8123` 检查内网 8123 端口是否可达。

- **Q: 扫描实体为空？**
  - **原因**：HomeCore V0.3 严格过滤并只扫描 `light`、`switch`、`climate`、`sensor`、`binary_sensor` 领域的实体。
  - **解决**：检查 Home Assistant 中是否存在上述域的有效实体，且实体未处于完全卸载状态。

---

### 2. MQTT 集成问题

- **Q: MQTT 连接被拒绝 (Reason Code 5 或拒绝连接)？**
  - **原因**：Broker 启用了 ACL 鉴权，提供的用户名/密码不匹配，或者端口未放行。
  - **解决**：核对 Broker 账号密码，检查 Broker 监听日志（如 `mosquitto.log` 或 EMQX 控制台客户端连接记录）。

- **Q: 设备发布了数据，但 HomeCore 界面没有更新？**
  - **原因**：
    1. Topic 未在 HomeCore 登记，安全白名单机制未对其进行订阅。
    2. 报文 payload 非 UTF-8 编码或 JSON 格式破坏。
  - **解决**：确保在“物联网接入”页面登记了该设备的 external_id，并使用标准格式（如 `homecore/device/{id}/state`）发布。

---

### 3. HomeCore Voice 语音接口调试

- **Q: 如何测试预留的 Voice 接口？**
  - **接口 1（状态查询）**：
    ```bash
    curl -X POST http://127.0.0.1:8000/api/v1/voice/query \
      -H "Authorization: Bearer <ADMIN_TOKEN>" \
      -H "Content-Type: application/json" \
      -d '{"query": "客厅开着几盏灯"}'
    ```
  - **接口 2（语音意图控制）**：
    ```bash
    curl -X POST http://127.0.0.1:8000/api/v1/voice/command \
      -H "Authorization: Bearer <ADMIN_TOKEN>" \
      -H "Content-Type: application/json" \
      -d '{"intent": "turn_on", "target_name": "客厅主顶灯"}'
    ```

---

## 三、尚未实现功能与已知限制

1. **真实硬件在线实机测试环境限制**：
   - 当前开发与验证环境为本地隔离环境，未连接物理局域网中的真实物理 Home Assistant 硬件设备和外部物理 Zigbee 协调器。
   - 本阶段所有协议层行为（REST 连通性、401 鉴权拒绝、实体发现、WebSocket 握手握签、MQTT 状态解析、离线阻断与去重导入）均通过端到端协议级自动化测试套件验证通过。
2. **Phase 4 规划功能**：
   - 复杂场景条件自动化联动引擎（如“当门磁打开且光照小于 20 lux 时开灯”）规划于后续阶段。
   - 语音唤醒词模型（Wake Word）、离线 STT/TTS 模块规划于 HomeCore Voice 阶段；当前阶段已完成全部 REST API 控制通道的预留与鉴权集成。
