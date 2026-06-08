# project_records_admin

基于 **Vue3 + Node.js (Express) + SQLite** 的项目资料管理系统，覆盖项目、成员、任务节点与审批记录的完整闭环管理，支持节点状态流转与跨菜单数据联动，启动后自动建表并写入示例数据。

## 功能概览

- 登录页（默认账号：`admin` / `admin123`）
- 后台首页布局，左侧菜单包含：
  - **统计概览**：项目/成员/节点/审批数量、状态分布、最近操作记录
  - **项目管理**：项目 CRUD、项目详情中查看成员/节点/审批
  - **成员管理**：成员 CRUD、查看成员参与的项目
  - **任务节点**：节点列表、按项目/状态筛选、状态流转
  - **审批记录**：全部状态变更记录，可按项目筛选
- 节点状态流转：`待开始 / 进行中 / 待审批 / 已退回 / 已完成 / 已归档`，每次变更都会记录操作人、前后状态、操作类型、备注与时间，同时自动同步项目状态。

## 技术栈

- 前端：Vue 3 + Vite + Vue Router + Pinia + Element Plus + Axios
- 后端：Node.js + Express + better-sqlite3 + JSON Web Token
- 数据库：SQLite（数据库文件位于项目根目录 `data.db`，首次启动自动创建并初始化默认数据）

## 目录结构

```
project_records_admin/
├── backend/          # Express 后端
│   └── src/
│       ├── index.js          # 服务入口（端口 8022）
│       ├── db.js             # SQLite 初始化与默认数据
│       ├── auth.js           # JWT 鉴权
│       └── routes/           # auth/projects/members/nodes/approvals/stats
├── frontend/         # Vue3 前端（默认端口 5173）
│   └── src/
│       ├── views/            # Login/Layout/Dashboard/Projects/.../Approvals
│       ├── router.js
│       ├── api.js
│       └── utils/status.js
└── data.db           # SQLite 数据库文件（首次启动自动生成）
```

## 启动方式

打开两个终端，分别启动后端与前端：

```bash
# 1. 启动后端 (http://localhost:8022)
cd backend
npm install
npm run dev

# 2. 启动前端 (http://localhost:5173)
cd frontend
npm install
npm run dev
```

> 首次启动后端时会自动在项目根目录创建 `data.db`，并写入默认管理员账号、5 名成员、2 个示例项目以及若干节点、审批记录。

## 访问地址

- 前端：<http://localhost:5173>
- 后端 API：<http://localhost:8022/api>
- 健康检查：<http://localhost:8022/api/health>

## 默认账号

| 账号  | 密码     | 角色 |
| ----- | -------- | ---- |
| admin | admin123 | 管理员 |

## 主要 API

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| POST | `/api/auth/login` | 登录获取 token |
| GET / POST / PUT / DELETE | `/api/projects` | 项目 CRUD |
| GET | `/api/projects/:id` | 项目详情（含成员、节点、审批摘要） |
| POST / DELETE | `/api/projects/:id/members[/:memberId]` | 项目成员维护 |
| GET / POST / PUT / DELETE | `/api/members` | 成员 CRUD |
| GET | `/api/members/:id` | 成员详情（含参与项目） |
| GET / POST / PUT / DELETE | `/api/nodes` | 节点 CRUD |
| POST | `/api/nodes/:id/transition` | 节点状态流转，写入审批记录并同步项目状态 |
| GET | `/api/approvals` | 审批记录（可按 `project_id`、`node_id` 过滤） |
| GET | `/api/stats/overview` | 概览统计 |

## 数据库初始化

首次启动后端时自动执行：

1. 在项目根目录创建 `data.db`（无需安装数据库服务）。
2. 自动建表：`users / members / projects / project_members / nodes / approvals`。
3. 写入默认账号、示例成员、示例项目、节点与审批记录。

如需重置数据，只需停止后端服务并删除根目录下的 `data.db` 文件，再次启动会重新初始化。
