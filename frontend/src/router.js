import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/login', component: () => import('./views/Login.vue') },
  {
    path: '/',
    component: () => import('./views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('./views/Dashboard.vue'), meta: { title: '统计概览' } },
      { path: 'projects', name: 'projects', component: () => import('./views/Projects.vue'), meta: { title: '项目管理' } },
      { path: 'projects/:id', name: 'projectDetail', component: () => import('./views/ProjectDetail.vue'), meta: { title: '项目详情' } },
      { path: 'members', name: 'members', component: () => import('./views/Members.vue'), meta: { title: '成员管理' } },
      { path: 'nodes', name: 'nodes', component: () => import('./views/Nodes.vue'), meta: { title: '任务节点' } },
      { path: 'approvals', name: 'approvals', component: () => import('./views/Approvals.vue'), meta: { title: '审批记录' } }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.path !== '/login' && !token) return next('/login');
  if (to.path === '/login' && token) return next('/');
  next();
});

export default router;
