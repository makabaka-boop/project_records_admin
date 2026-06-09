# project_records_admin

基于 Vue3、Node.js 与 SQLite 构建的项目资料管理系统，支持项目、成员、节点和审批记录联动管理，自动建表初始化，完整记录节点状态流转。

## 功能特性

### 核心功能
- **统计概览**：项目/节点状态分布图表、最近项目和审批记录
- **项目管理**：创建、编辑、删除项目，查看项目详情
- **成员管理**：用户账号管理，查看成员参与的项目
- **任务节点**：节点配置、负责人分配、状态流转
- **审批记录**：完整的状态变更历史，审批通过/退回操作

### 状态流转
节点状态包含：
- `pending` - 待开始
- `in_progress` - 进行中
- `pending_approval` - 待审批
- `rejected` - 已退回
- `completed` - 已完成
- `archived` - 已归档

每次状态变化都会记录：
- 操作人
- 操作时间
- 前后状态
- 备注说明

### 数据联动
- 项目详情页展示成员、节点和审批摘要
- 成员页面可查看参与的所有项目
- 审批处理后自动同步项目状态

## 技术栈

### 前端
- Vue 3 + Composition API
- Vite 构建工具
- Element Plus UI 组件库
- Pinia 状态管理
- Vue Router 路由
- Axios HTTP 客户端
- ECharts 图表库
- Day.js 日期处理

### 后端
- Node.js + Express
- better-sqlite3 数据库驱动
- JWT 身份认证
- bcryptjs 密码加密
- CORS 跨域支持

### 数据库
- SQLite（文件数据库，无需额外安装）
- 数据库文件自动生成在项目根目录：`backend/data.db`

## 快速开始

### 环境要求
- Node.js >= 16.x
- npm 或 yarn

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 启动项目

#### 方式一：分别启动（推荐开发使用）

1. 启动后端服务（端口 8022）
```bash
cd backend
npm start
```

2. 启动前端开发服务器（端口 5173）
```bash
cd frontend
npm run dev
```

### 默认账号

系统首次启动会自动创建默认管理员账号：
- **用户名**：`admin`
- **密码**：`admin123`

### 访问地址

- 前端访问地址：http://localhost:5173
- 后端 API 地址：http://localhost:8022/api
- 健康检查：http://localhost:8022/api/health

## 项目结构

```
project_records_admin/
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── app.js          # 应用入口
│   │   ├── database/       # 数据库模块
│   │   │   └── db.js       # 数据库连接和初始化
│   │   ├── middleware/     # 中间件
│   │   │   └── auth.js     # 认证中间件
│   │   └── routes/         # 路由
│   │       ├── auth.js     # 认证接口
│   │       ├── users.js    # 用户接口
│   │       ├── projects.js # 项目接口
│   │       ├── taskNodes.js # 任务节点接口
│   │       ├── approvals.js # 审批记录接口
│   │       └── stats.js    # 统计接口
│   ├── data.db             # SQLite 数据库文件（自动生成）
│   └── package.json
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   │   ├── Login.vue   # 登录页
│   │   │   ├── Dashboard.vue # 统计概览
│   │   │   ├── Projects.vue # 项目列表
│   │   │   ├── ProjectDetail.vue # 项目详情
│   │   │   ├── Members.vue # 成员管理
│   │   │   ├── TaskNodes.vue # 任务节点
│   │   │   └── Approvals.vue # 审批记录
│   │   ├── layouts/        # 布局组件
│   │   │   └── Default.vue # 默认布局
│   │   ├── api/            # API 接口
│   │   ├── stores/         # Pinia 状态管理
│   │   ├── router/         # 路由配置
│   │   ├── utils/          # 工具函数
│   │   ├── constants/      # 常量定义
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## API 接口说明

### 认证接口
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取当前用户信息

### 用户接口
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户
- `GET /api/users/:id/projects` - 获取用户参与的项目

### 项目接口
- `GET /api/projects` - 获取项目列表
- `GET /api/projects/:id` - 获取项目详情
- `POST /api/projects` - 创建项目
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目
- `GET /api/projects/:id/members` - 获取项目成员
- `POST /api/projects/:id/members` - 添加项目成员
- `DELETE /api/projects/:id/members/:memberId` - 移除项目成员

### 任务节点接口
- `GET /api/task-nodes/project/:projectId` - 获取项目节点列表
- `GET /api/task-nodes/:id` - 获取节点详情
- `POST /api/task-nodes` - 创建节点
- `PUT /api/task-nodes/:id` - 更新节点
- `DELETE /api/task-nodes/:id` - 删除节点
- `POST /api/task-nodes/:id/status` - 更新节点状态

### 审批记录接口
- `GET /api/approvals` - 获取审批记录列表
- `GET /api/approvals/:id` - 获取审批详情
- `POST /api/approvals/:id/approve` - 审批通过
- `POST /api/approvals/:id/reject` - 审批退回

### 统计接口
- `GET /api/stats/overview` - 获取统计概览数据

## 数据库说明

### 数据表
- `users` - 用户表
- `projects` - 项目表
- `project_members` - 项目成员关联表
- `task_nodes` - 任务节点表
- `approval_records` - 审批记录表

### 自动初始化
首次启动后端服务时，系统会自动：
1. 创建所有数据表
2. 插入默认管理员账号（admin / admin123）

数据库文件位置：`backend/data.db`

## 开发说明

### 端口说明
- 后端端口固定为：8022
- 前端默认端口：5173（如被占用会自动递增）

### 前端代理
前端开发服务器已配置代理，`/api` 请求会自动转发到后端 `http://localhost:8022`。

## 许可证

MIT
