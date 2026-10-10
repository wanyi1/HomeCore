# HomeCore V1.0 数据模型规范 (Data Models)

本文档定义 HomeCore 的核心持久化实体、字段含义、主外键约束与数据字典。

---

## 1. 用户模型 (User)
记录系统账户信息，用于认证与权限控制（RBAC）。
- `id`: string (UUID), 主键
- `username`: string, 唯一，登录用户名
- `password_hash`: string, Bcrypt 安全哈希密码
- `display_name`: string, 用户昵称
- `role`: string, 角色枚举：`admin` (系统管理员), `member` (普通家庭成员), `guest` (访客)
- `is_active`: boolean, 是否有效
- `created_at`: datetime
- `updated_at`: datetime

---

## 2. 房间模型 (Room)
记录家庭空间划分（客厅、主卧、厨房、书房等）。
- `id`: string (UUID), 主键
- `name`: string, 房间名称（如 "主卧"）
- `area`: string, 所属区域（如 "一楼", "室内", "花园"）
- `icon`: string, 房间图标标识
- `sort_order`: integer, 排序序号
- `description`: string, 备注描述
- `created_at`: datetime
- `updated_at`: datetime

---

## 3. 设备模型 (Device)
记录家庭纳管的所有物理实体与受控端点。
- `id`: string (UUID), 主键
- `name`: string, 设备名称（如 "客厅主吸顶灯"）
- `identifier`: string, 外部设备物理标识（如 MAC, Entity ID, Zigbee IEEE）
- `source`: string, 接入来源 (`manual` 手动登记, `homeassistant` HA接入, `mqtt` MQTT直连, `simulator` 演示模拟)
- `protocol`: string, 协议 (`wifi`, `zigbee`, `matter`, `ble`, `virtual`)
- `device_type`: string, 设备类型 (`light` 灯光, `switch` 开关插座, `climate` 温控, `sensor` 传感器, `curtain` 窗帘, `media` 影音, `gateway` 网关)
- `room_id`: string (UUID), 外键关联 Room.id，可为空（未分配房间）
- `capabilities`: json, 能力集合 (如 `["switch", "brightness", "color_temp"]`)
- `status`: string, 在线状态 (`online` 在线, `offline` 离线/未连接, `error` 异常, `unknown` 未知)
- `is_demo`: boolean, 是否为演示模拟设备（强制显式标识）
- `last_seen`: datetime, 最后通信时间戳
- `extra_meta`: json, 附加元数据（固件版本、IP、制造商等）
- `created_at`: datetime
- `updated_at`: datetime

---

## 4. 设备实时状态快照 (DeviceState)
记录设备最新属性读数与控制值。
- `id`: string (UUID), 主键
- `device_id`: string (UUID), 外键关联 Device.id, 唯一
- `state_value`: string, 核心状态值 (如 `on`, `off`, `open`, `closed`, `24.5`)
- `attributes`: json, 扩展属性 (如 `{"brightness": 80, "temperature": 23.5, "humidity": 55}`)
- `updated_at`: datetime

---

## 5. 集成配置模型 (Integration)
记录外部接入源适配器配置（如 Home Assistant 凭据）。
- `id`: string (UUID), 主键
- `name`: string, 集成名称
- `adapter_type`: string, 适配器类型 (`homeassistant`, `mqtt`, `simulator`)
- `config`: json, 加密/隔离配置 (URL, Token, Broker地址等)
- `is_enabled`: boolean, 是否启用
- `status`: string, 连接状态 (`connected`, `disconnected`, `auth_error`, `timeout`)
- `last_sync`: datetime, 最近同步时间
- `error_message`: string, 错误详细诊断

---

## 6. 审计日志模型 (AuditLog)
记录所有人员操作、控制下发与敏感行为。
- `id`: string (UUID), 主键
- `user_id`: string, 操作人ID或系统角色
- `username`: string, 操作人用户名
- `action`: string, 动作类型 (`device_control`, `room_create`, `login`, `config_change`)
- `target_type`: string, 目标类型 (`device`, `room`, `system`)
- `target_id`: string, 目标对象ID
- `details`: json, 操作详情及变更前后差分
- `ip_address`: string, 请求来源IP
- `created_at`: datetime

---

## 7. 系统事件模型 (EventLog)
记录系统内部状态变迁、断线、告警触发与恢复事件。
- `id`: string (UUID), 主键
- `level`: string, 级别 (`info`, `warning`, `error`, `critical`)
- `source`: string, 来源模块
- `message`: string, 事件简要消息
- `payload`: json, 上下文信息
- `created_at`: datetime
