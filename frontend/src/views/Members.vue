<template>
  <div class="page-card">
    <div class="page-toolbar">
      <h3 class="section-title">成员管理</h3>
      <el-button type="primary" @click="openForm()">新增成员</el-button>
    </div>
    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="role" label="角色" width="140" />
      <el-table-column prop="department" label="部门" width="140" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="phone" label="电话" width="160" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="viewMember(row)">参与项目</el-button>
          <el-button size="small" @click="openForm(row)">编辑</el-button>
          <el-popconfirm title="确认删除？" @confirm="remove(row)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.show" :title="dialog.id ? '编辑成员' : '新增成员'" width="480px">
      <el-form :model="dialog.form" label-width="80px">
        <el-form-item label="姓名"><el-input v-model="dialog.form.name" /></el-form-item>
        <el-form-item label="角色"><el-input v-model="dialog.form.role" /></el-form-item>
        <el-form-item label="部门"><el-input v-model="dialog.form.department" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="dialog.form.email" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="dialog.form.phone" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.show = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detail.show" :title="`${detail.member.name || ''} 参与的项目`" width="640px">
      <el-table :data="detail.projects" size="small">
        <el-table-column prop="code" label="项目编号" width="140" />
        <el-table-column prop="name" label="项目名称">
          <template #default="{ row }">
            <el-link type="primary" @click="goProject(row.id)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="duty" label="项目分工" width="160" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api';
import { statusType } from '../utils/status';

const router = useRouter();
const list = ref([]);
const loading = ref(false);
const dialog = reactive({ show: false, id: null, form: {} });
const detail = reactive({ show: false, member: {}, projects: [] });

async function load() {
  loading.value = true;
  try { list.value = await api.get('/members'); }
  finally { loading.value = false; }
}

function openForm(row) {
  dialog.id = row?.id || null;
  dialog.form = row ? { ...row } : { name: '', role: '', department: '', email: '', phone: '' };
  dialog.show = true;
}

async function save() {
  if (!dialog.form.name || !dialog.form.role) return ElMessage.warning('请填写姓名和角色');
  if (dialog.id) await api.put(`/members/${dialog.id}`, dialog.form);
  else await api.post('/members', dialog.form);
  ElMessage.success('已保存');
  dialog.show = false;
  load();
}

async function remove(row) {
  await api.delete(`/members/${row.id}`);
  ElMessage.success('已删除');
  load();
}

async function viewMember(row) {
  const data = await api.get(`/members/${row.id}`);
  detail.member = data;
  detail.projects = data.projects || [];
  detail.show = true;
}

function goProject(id) {
  detail.show = false;
  router.push(`/projects/${id}`);
}

onMounted(load);
</script>
