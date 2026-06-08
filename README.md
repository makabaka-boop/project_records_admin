# 项目资料管理系统

基于 Vue3 + Node.js (Express) + SQLite 构建的项目资料、任务节点、成员分工和审批记录管理系统。

## 技术栈

- **前端**: Vue 3 + Vite + Element Plus + Pinia + Vue Router
- **后端**: Node.js + Express + SQLite (sqlite3)
- **认证**: JWT + bcryptjs

## 功能特性

- **登录认证**: 基于 JWT 的用户登录认证
- **统计概览**: 项目、节点、审批、成员数据统计
- **项目管理**: 项目 CRUD、成员分配、详情查看
- **成员管理**: 成员 CRUD、角色管理、参与项目查看
- **任务节点**: 节点创建、状态流转、进度更新、状态日志
- **审批记录**: 审批提交、通过/退回处理、节点联动更新
- **数据联动**: 审批通过后自动更新节点状态

## 节点状态流转

节点支持以下状态：
- `pending` 待开始
- `in_progress` 进行中
- `pending_approval` 待审批
- `rejected` 已退回
- `completed` 已完成
- `archived` 已归档

每次状态变化自动记录：操作人、操作时间、前后状态、备注。

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| manager | admin123 | 项目经理 |
| member1 | admin123 | 成员 |
| member2 | admin123 | 成员 |

## 快速开始

### 方式一：分步启动（推荐）

1. **安装依赖**

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

2. **启动后端服务 (端口 8022)**

```bash
cd backend
npm run dev
```

后端服务将在 http://localhost:8022 启动。
首次启动会自动在 backend 目录下创建 `data.db` 数据库文件并初始化表结构和默认数据。

3. **启动前端开发服务器 (端口 5173)**

```bash
cd frontend
npm run dev
```

前端访问地址: http://localhost:5173

### 方式二：一键启动（可选）

在项目根目录执行：

```bash
npm install
npm run install:all
npm run dev
```

此方式需要安装 concurrently 来同时启动前后端。

## 目录结构

```
project_records_admin/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── models/          # 数据库模型
│   │   ├── routes/          # 路由
│   │   └── app.js           # 入口文件
│   ├── package.json
│   └── data.db              # SQLite 数据库（自动生成）
├── frontend/                # 前端代码
│   ├── src/
│   │   ├── api/             # API 请求
│   │   ├── layouts/         # 布局组件
│   │   ├── router/          # 路由
│   │   ├── store/           # 状态管理
│   │   ├── utils/           # 工具函数
│   │   ├── views/           # 页面
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 端口说明

- 前端: http://localhost:5173 (Vue Dev Server)
- 后端: http://localhost:8022 (Express API)
- 前端已配置代理，`/api` 请求自动转发到后端
