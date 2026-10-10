# HomeCore V0.3 — Home Assistant 真实接入指南

本文档指导如何在 HomeCore 中接入局域网内的 Home Assistant 实例，建立 REST API 实体扫描与 WebSocket 双工实时状态监听链路。

---

## 一、前置条件与凭据准备

1. **Home Assistant 实例**：运行中的 Home Assistant 实例（操作系统版、容器版或 Supervised 均可）。
2. **长期访问令牌 (Long-Lived Access Token)**：
   - 登录 Home Assistant 控制台。
   - 点击左下角个人用户头像进入“个人资料”页面。
   - 滚动到底部找到 **“长期访问令牌” (Long-Lived Access Tokens)** 区域。
   - 点击“创建令牌”，输入名称（例如 `HomeCore-Gateway`）并确认。
   - 复制生成的长字符串令牌（形如 `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`）。
   > **注意**：该令牌仅在生成时完整展示一次，请妥善保存。

---

## 二、在 HomeCore 中配置集成

1. 启动并登录 HomeCore 网页控制台。
2. 在左侧导航栏点击 **“核心控制中枢” → “物联网接入”**。
3. 选择 **“Home Assistant 实例”** 选项卡。
4. 填写配置项：
   - **实例地址 (URL)**：输入局域网访问地址，例如 `http://192.168.1.100:8123`（如果为带 SSL 的域名可使用 `https://ha.home.local:8123`）。
   - **长期访问令牌**：粘贴步骤一中复制的访问令牌。
5. 点击 **“测试连通性”** 按钮：
   - 系统将通过 REST API 调用 `/api/config` 与 `/api/states`。
   - 若成功，将展示 Home Assistant 版本、所在地理空间、可发现实体数量与往返延迟 (Latency)。
6. 点击 **“保存并建立长连接”**：
   - 后端使用 Fernet 对称加密将令牌落库至 `integration_configs` 表，绝不向前端传输明文。
   - 启动后台 WebSocket 守护协程，向 `ws://<host>:<port>/api/websocket` 发起鉴权并订阅 `state_changed` 事件。

---

## 三、实体发现与批量导入

1. 点击 **“扫描并发现实体”** 按钮打开导入向导。
2. 系统将实时读取 Home Assistant 当前注册的全部实体：
   - **支持的类型**：
     - `light.*`：自动识别并映射为照明灯具，提取开关及调光能力（`brightness`、`color_temp`）。
     - `switch.*`：自动识别并映射为智能开关与排插。
     - `climate.*`：自动识别并映射为环境空调，提取温控与运行模式能力。
     - `sensor.*` / `binary_sensor.*`：自动识别并映射为数字量化传感器或安全门窗感应器。
   - **可用性识别**：若实体在 HA 中状态为 `unavailable` 或 `unknown`，HomeCore 严谨识别为离线状态。
3. **空间归属分配**：可在弹窗内为每个实体指定 HomeCore 中的生活空间（如“客厅”、“主卧”、“厨房”）。
4. **去重保障**：对于已在 HomeCore 库中的外部实体，系统标识为“已在库中”，再次导入将平滑更新能力与最新状态，绝不产生重复脏数据。
5. 点击 **“执行批量导入”** 完成纳管。

---

## 四、双工控制与状态实时回环

1. **下发控制**：在“智能家居”或“家庭总览”中操作灯光开关、拖动亮度滑块或步进空调温度：
   - 请求通过 `POST /api/v1/devices/{id}/control` 进入统一物联网引擎。
   - 引擎向 HA 服务下发 `POST /api/services/{domain}/{service}` 指令。
   - 等待 HA 返回服务调用结果，并验证设备最终状态。
2. **外部状态同步**：当用户通过实体物理墙壁开关、HA 手机 App 或物理遥控器改变设备状态时：
   - HA 广播 `state_changed` 事件。
   - HomeCore WebSocket 接收报文并在毫秒级内自动更新本地数据库与前端界面。

---

## 五、常见故障排查 (Troubleshooting)

| 现象 | 可能原因 | 排查建议 |
| :--- | :--- | :--- |
| **HTTP 401 Unauthorized** | 长期令牌错误或已在 HA 中撤销 | 重新在 HA 个人资料中生成长期令牌并填入保存 |
| **连接超时 (Timeout)** | 局域网防火墙阻断或 IP 变动 | 检查 HA 主机 IP 是否配置为静态 DHCP 分配，检查 8123 端口是否开放 |
| **设备显示离线且无法控制** | 真实设备在 HA 中已失联 | 物理设备掉电或 Zigbee/Wi-Fi 掉线。HomeCore 坚持数据诚实原则，离线时主动拦截控制请求，禁止伪造 |
| **WebSocket 重连中** | 网络波动或 HA 重启 | HomeCore 内置指数退避重连守护进程，网络恢复后将在数秒内自动重新上线并恢复订阅 |
