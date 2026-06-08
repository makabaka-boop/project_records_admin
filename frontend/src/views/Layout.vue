<template>
  <el-container class="layout-root">
    <el-aside width="220px" class="layout-aside">
      <div class="logo">项目资料管理</div>
      <el-menu
        :default-active="route.path"
        router
        background-color="#001529"
        text-color="#cbd5e1"
        active-text-color="#ffffff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
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
          <el-icon><Calendar /></el-icon>
          <span>任务节点</span>
        </el-menu-item>
        <el-menu-item index="/approvals">
          <el-icon><Document /></el-icon>
          <span>审批记录</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <div class="breadcrumb">{{ route.meta.title || '后台首页' }}</div>
        <div class="user-area">
          <span class="welcome">欢迎，{{ user.name }}</span>
          <el-button link type="primary" @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DataAnalysis, Folder, User, Calendar, Document } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const user = computed(() => JSON.parse(localStorage.getItem('user') || '{}'));

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/login');
}
</script>

<style scoped>
.layout-root { height: 100vh; }
.layout-aside {
  background: #001529;
  color: #fff;
  overflow-y: auto;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.layout-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #ebeef5;
}
.breadcrumb { font-size: 16px; font-weight: 600; }
.user-area { display: flex; align-items: center; gap: 14px; }
.welcome { color: #606266; font-size: 13px; }
.layout-main { background: #f3f5f9; padding: 18px; }
.el-menu { border-right: none; }
</style>
