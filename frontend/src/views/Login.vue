<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="title">项目资料管理系统</h1>
      <p class="subtitle">Project Records Admin</p>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-button type="primary" class="login-btn" :loading="loading" @click="onSubmit">登录</el-button>
      </el-form>
      <div class="hint">默认账号：<b>admin</b> / 密码：<b>admin123</b></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api';

const router = useRouter();
const formRef = ref();
const loading = ref(false);
const form = reactive({ username: 'admin', password: 'admin123' });
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

async function onSubmit() {
  await formRef.value.validate();
  loading.value = true;
  try {
    const data = await api.post('/auth/login', form);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    ElMessage.success('登录成功');
    router.push('/');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
}
.login-card {
  width: 380px;
  padding: 36px 32px 28px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}
.title {
  margin: 0;
  font-size: 22px;
  text-align: center;
  color: #1f2d3d;
}
.subtitle {
  margin: 6px 0 24px;
  text-align: center;
  color: #909399;
  font-size: 13px;
}
.login-btn {
  width: 100%;
  margin-top: 6px;
}
.hint {
  margin-top: 14px;
  text-align: center;
  color: #909399;
  font-size: 12px;
}
</style>
