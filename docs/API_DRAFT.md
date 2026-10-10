# HomeCore V1.0 API 规范草案 (RESTful & WebSocket)

所有请求默认前缀：`/api/v1`
认证方式：HTTP Header `Authorization: Bearer <JWT_TOKEN>`

---

## 1. 系统与健康检查
- `GET /api/v1/health`
  - 返回系统运行状况、数据库连通性、当前时间、版本信息。
  - 响应：`{"status": "ok", "version": "1.0.0", "db": "connected", "uptime": 120}`
- `GET /api/v1/system/overview`
  - 仪表盘汇总聚合数据：设备总数、在线数、离线数、房间数、近期事件、未连接警报。

---

## 2. 身份认证与用户管理 (`/api/v1/auth`)
- `POST /api/v1/auth/setup`
  - 首次运行初始化创建本地超级管理员（仅允许首次初始化）。
  - 参数：`{"username": "admin", "password": "...", "display_name": "家庭管理员"}`
- `POST /api/v1/auth/login`
  - 登录换取 JWT 访问凭据。
  - 参数：`{"username": "admin", "password": "..."}`
  - 响应：`{"access_token": "...", "token_type": "bearer", "user": {...}}`
- `GET /api/v1/auth/me`
  - 获取当前登录用户画像与权限角色。
- `POST /api/v1/auth/logout`
  - 注销当前会话。

---

## 3. 房间管理 (`/api/v1/rooms`)
- `GET /api/v1/rooms`: 查询房间列表，附带设备数与主要状态统计
- `POST /api/v1/rooms`: 创建新房间（参数：`name`, `area`, `icon`, `description`）
- `GET /api/v1/rooms/{id}`: 房间详情及归属设备清单
- `PUT /api/v1/rooms/{id}`: 更新房间信息
- `DELETE /api/v1/rooms/{id}`: 删除房间（解除设备关联）

---

## 4. 设备管理与控制 (`/api/v1/devices`)
- `GET /api/v1/devices`: 设备列表，支持按 `room_id`, `status`, `device_type`, `is_demo`, `keyword` 过滤
- `POST /api/v1/devices`: 手动登记新设备
- `GET /api/v1/devices/{id}`: 获取设备详情与最新遥测状态
- `PUT /api/v1/devices/{id}`: 更新设备基础信息（名称、房间分配、标签）
- `DELETE /api/v1/devices/{id}`: 移除设备
- `POST /api/v1/devices/{id}/control`: 发送控制指令（开/关、调光、模式），写入审计日志
  - 参数：`{"command": "turn_on" | "turn_off" | "set_brightness", "params": {...}}`
- `POST /api/v1/devices/demo-seed`: 一键生成/清理隔离演示设备环境（用于展示与离线验证）

---

## 5. 审计与事件流 (`/api/v1/audit`, `/api/v1/events`)
- `GET /api/v1/audit/logs`: 检索操作审计历史
- `GET /api/v1/events`: 检索系统事件与设备状态变迁记录

---

## 6. WebSocket 实时推送
- `WS /api/v1/ws`
  - 参数：`?token=<JWT_TOKEN>`
  - 消息类型：
    - `device_state_changed`: 设备状态变更广播
    - `system_event`: 系统级事件通知
    - `ping / pong`: 心跳保活机制
