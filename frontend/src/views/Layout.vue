<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon size="28"><FolderOpened /></el-icon>
        <span>项目管理系统</span>
      </div>
      <el-menu :default-active="activeMenu" router class="menu" background-color="#304156" text-color="#bfcbd9" active-text-color="#409EFF">
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>统计概览</span>
        </el-menu-item>
        <el-menu-item index="/projects">
          <el-icon><Folder /></el-icon>
          <span>项目管理</span>
        </el-menu-item>
        <el-menu-item index="/members">
          <el-icon><User /></el-icon>
          <span>成员管理</span>
        </el-menu-item>
        <el-menu-item index="/nodes">
          <el-icon><List /></el-icon>
          <span>任务节点</span>
        </el-menu-item>
        <el-menu-item index="/approvals">
          <el-icon><DocumentChecked /></el-icon>
          <span>审批记录</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">{{ user?.name }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="main">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || '')

const handleCommand = (cmd) => {
  if (cmd === 'logout') {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100%;
}

.aside {
  background-color: #304156;
  overflow-y: auto;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  border-bottom: 1px solid #1f2d3d;
}

.menu {
  border: none;
}

.menu :deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
}

.header {
  background: white;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.username {
  color: #606266;
}

.main {
  background: #f0f2f5;
  overflow-y: auto;
}
</style>
