# 项目资料管理系统

基于 Vue3 + Node.js(Express) + SQLite 的全栈项目管理系统，支持项目资料、任务节点、成员分工和审批记录的一体化管理。

## 技术栈

- **前端**: Vue3 + Vite + Element Plus + ECharts + Vue Router + Axios
- **后端**: Node.js + Express + better-sqlite3 + JWT + bcryptjs
- **数据库**: SQLite（自动在项目根目录生成 data.db）

## 功能模块

| 模块 | 功能 |
|------|------|
| 统计概览 | 数据统计卡片、项目/节点状态分布图、待审批列表、最近活动时间线 |
| 项目管理 | 项目增删改查、项目详情页（项目信息+成员列表+任务节点+审批摘要） |
| 成员管理 | 成员增删改查、角色管理、查看成员参与项目 |
| 任务节点 | 全局节点列表、按项目/状态筛选、节点状态变更、状态变更历史记录 |
| 审批记录 | 审批历史列表、待审批节点快捷审批、审批意见填写 |

## 节点状态流转

节点支持以下状态：
- **待开始** (pending) - 初始状态
- **进行中** (in_progress) - 节点执行中
- **待审批** (pending_approval) - 提交后等待审批
- **已退回** (rejected) - 审批不通过
- **已完成** (completed) - 审批通过/直接完成
- **已归档** (archived) - 项目归档

每次状态变更都会自动记录：操作人、操作时间、变更前状态、变更后状态、备注说明。

## 数据联动机制

1. **项目详情页**: 集成展示项目基本信息、项目成员、所有任务节点、审批记录摘要
2. **成员页**: 点击「参与项目」可查看该成员参与的所有项目及角色
3. **审批页**: 审批通过/退回后自动同步更新节点状态和项目整体状态
4. **项目状态自动计算**: 根据节点完成情况自动更新项目状态
   - 所有节点完成 → 项目已完成
   - 有节点待审批 → 项目待审批
   - 无节点完成 → 项目待开始
   - 其他 → 项目进行中

## 默认账号

首次启动自动创建以下账号（默认密码：admin123）：

| 用户名 | 姓名 | 角色 | 说明 |
|--------|------|------|------|
| admin | 系统管理员 | 管理员 | 系统超级管理员 |
| zhangsan | 张三 | 普通成员 | 项目成员 |
| lisi | 李四 | 普通成员 | 项目成员 |
| wangwu | 王五 | 审批人 | 可进行审批操作 |

同时自动初始化示例项目和任务节点数据供演示使用。

## 快速启动

### 1. 安装依赖

在项目根目录执行：

```bash
npm run install:all
```

该命令会依次安装根目录、backend、frontend 的所有依赖。

### 2. 启动开发服务

```bash
npm run dev
```

该命令会同时启动后端和前端服务：
- 后端 API 服务: http://localhost:8022
- 前端开发服务器: http://localhost:5173

### 3. 访问系统

浏览器打开: http://localhost:5173

使用默认账号登录即可开始使用。

## 目录结构

```
project_records_admin/
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── index.js         # Express 入口，API 路由
│   │   └── db.js            # SQLite 数据库初始化
│   └── package.json
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── api/             # API 请求封装
│   │   ├── router/          # Vue Router 路由
│   │   ├── utils/           # 工具函数/状态映射
│   │   ├── views/           # 页面组件
│   │   │   ├── Login.vue    # 登录页
│   │   │   ├── Layout.vue   # 主布局框架
│   │   │   ├── Dashboard.vue
│   │   │   ├── Projects.vue
│   │   │   ├── ProjectDetail.vue
│   │   │   ├── Members.vue
│   │   │   ├── Nodes.vue
│   │   │   └── Approvals.vue
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── data.db                  # SQLite 数据库文件（首次运行自动生成）
├── package.json
└── README.md
```

## 后端 API 说明

所有 API 以 `/api` 开头，除登录接口外均需 Bearer Token 认证。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户信息 |
| GET | /api/users | 用户列表 |
| POST | /api/users | 创建用户 |
| PUT | /api/users/:id | 更新用户 |
| DELETE | /api/users/:id | 删除用户 |
| GET | /api/users/:id/projects | 获取用户参与项目 |
| GET | /api/projects | 项目列表 |
| GET | /api/projects/:id | 项目详情（含成员+节点） |
| POST | /api/projects | 创建项目 |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |
| GET | /api/projects/:id/members | 项目成员列表 |
| POST | /api/projects/:id/members | 添加项目成员 |
| DELETE | /api/projects/:id/members/:memberId | 移除成员 |
| GET | /api/nodes | 节点列表（支持 project_id 查询） |
| GET | /api/nodes/:id | 节点详情（含状态日志） |
| POST | /api/nodes | 创建节点 |
| PUT | /api/nodes/:id | 更新节点 |
| PUT | /api/nodes/:id/status | 更新节点状态 |
| DELETE | /api/nodes/:id | 删除节点 |
| GET | /api/approvals | 审批记录 |
| POST | /api/approvals | 提交审批（通过/退回） |
| GET | /api/stats/overview | 统计概览数据 |

## 数据库初始化

- 首次启动后端时会自动在项目根目录创建 `data.db` 文件
- 自动建表（users、projects、project_members、project_nodes、node_status_logs、approval_records）
- 自动插入默认用户账号和示例项目数据
- 如需重置数据，停止服务后删除 data.db 文件即可重新初始化
