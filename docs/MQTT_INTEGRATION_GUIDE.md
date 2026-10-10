# HomeCore V0.3 — MQTT 真实接入与 Topic 规范手册

本文档指导如何在 HomeCore 中接入标准 MQTT Broker（如 EMQX、Mosquitto、HiveMQ 等），并遵循规范的白名单主题与设备控制协议。

---

## 一、连接配置与安全规范

1. **Broker 连通参数**：
   - **主机地址 (Host)**：Broker 的 IP 或域名（如 `127.0.0.1` 或 `192.168.1.50`）。
   - **端口 (Port)**：默认为 `1883`（标准明文）或 `8883`（TLS 加密通道）。
   - **认证账号**：用户名与密码（可选），密码在 HomeCore 后端落库前执行 Fernet 加密。
   - **Client ID**：网关客户端唯一标识，默认自动生成 `homecore_gw_{id}`。
   - **QoS 级别**：推荐配置为 `1`（保证至少到达一次并等待 PUBACK 确认）。
   - **根主题前缀 (Base Topic)**：默认为 `homecore`。
2. **核心安全红线**：
   - **禁止默认盲目订阅全量主题 `#`**：全局订阅通配符会造成网络带宽占用、潜在的数据风暴及安全泄露。
   - **白名单精准订阅**：HomeCore 仅订阅已登记设备的专属状态主题与规范发现主题。

---

## 二、标准 Topic 命名与交互协议

| 功能 | Topic 格式示例 | 报文格式 | 说明 |
| :--- | :--- | :--- | :--- |
| **状态上报 (State)** | `homecore/device/{device_id}/state` | JSON 或字符串 | 设备向网关上报自身最新开闭或属性 |
| **控制指令 (Command)** | `homecore/device/{device_id}/set` | JSON 格式 | 网关向物理设备下发控制目标状态 |
| **遥测数据 (Telemetry)** | `homecore/device/{device_id}/telemetry` | JSON 格式 | 传感器定时上报温度、湿度、功率等指标 |
| **在线保活 (LWT / Availability)** | `homecore/device/{device_id}/availability` | `"online"` / `"offline"` | 遗嘱消息或保活状态 |
| **自主发现 (Discovery)** | `homecore/discovery/{device_id}` | JSON 格式 | 兼容设备主动广播自身能力与元数据 |

---

## 三、报文载荷格式规范

### 1. 设备向网关上报状态 (`homecore/device/{id}/state`)
- **JSON 规范载荷（推荐）**：
  ```json
  {
    "state": "ON",
    "brightness": 85,
    "color_temp": 4000,
    "temperature": 25.5,
    "humidity": 58.2,
    "availability": "online"
  }
  ```
- **纯文本兼容载荷**：
  - `"ON"` / `"OFF"` / `"true"` / `"false"`

### 2. 网关向设备下发指令 (`homecore/device/{id}/set`)
- **开灯并设定亮度**：
  ```json
  {
    "command": "turn_on",
    "state": "ON",
    "brightness": 80
  }
  ```
- **设定空调目标温度**：
  ```json
  {
    "command": "set_temperature",
    "target_temperature": 26.0
  }
  ```

---

## 四、设备快捷登记与纳管流程

1. 在 HomeCore **“物联网接入” → “MQTT 物联网网关”** 中完成连接配置并测试通过。
2. 点击 **“快捷登记 MQTT 设备”**：
   - 输入外部设备 ID（例如 `balcony_sensor_01`）。
   - 输入设备友好名称（例如 `阳台环境传感器`）。
   - 选择设备类型（`light`、`switch`、`climate`、`sensor`）。
   - 选择归属的生活空间。
3. 点击确认后：
   - 适配器自动将该设备的 State Topic 加入活跃客户端的增量订阅列表中。
   - 设备开机并发布消息后，HomeCore 将实时抓取并呈现。

---

## 五、控制结果生命周期与确认机制

当用户在界面触发 MQTT 设备控制时，系统经过四层状态迁移：
1. **`command_sent`**：指令已打包并通过 TCP 发送至 MQTT 客户端缓冲区。
2. **`device_acknowledged`**：Broker 收到报文并完成 QoS 握手（返回 PUBACK 回执）。
3. **`state_updated`**：硬件在 2.5 秒内通过 State Topic 回传最新状态，网关捕获并更新数据库快照。
4. **`timeout`**：物理硬件未在超时时间内响应，系统记录详细审计日志并提示用户。
