import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/Default.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '统计概览', icon: 'DataAnalysis' }
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/views/Projects.vue'),
        meta: { title: '项目管理', icon: 'Folder' }
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('@/views/ProjectDetail.vue'),
        meta: { title: '项目详情', icon: 'Folder', hidden: true }
      },
      {
        path: 'members',
        name: 'Members',
        component: () => import('@/views/Members.vue'),
        meta: { title: '成员管理', icon: 'User' }
      },
      {
        path: 'task-nodes',
        name: 'TaskNodes',
        component: () => import('@/views/TaskNodes.vue'),
        meta: { title: '任务节点', icon: 'List' }
      },
      {
        path: 'approvals',
        name: 'Approvals',
        component: () => import('@/views/Approvals.vue'),
        meta: { title: '审批记录', icon: 'DocumentChecked' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
