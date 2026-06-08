<template>
  <div class="page-card">
    <div class="page-toolbar">
      <h3 class="section-title">项目管理</h3>
      <el-button type="primary" @click="openForm()">新建项目</el-button>
    </div>
    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="code" label="编号" width="140" />
      <el-table-column prop="name" label="项目名称" min-width="180">
        <template #default="{ row }">
          <el-link type="primary" @click="goDetail(row.id)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="owner_name" label="负责人" width="120" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="节点进度" width="180">
        <template #default="{ row }">
          <el-progress
            :percentage="row.node_total ? Math.round((row.node_done / row.node_total) * 100) : 0"
            :format="() => `${row.node_done}/${row.node_total}`"
          />
        </template>
      </el-table-column>
      <el-table-column prop="start_date" label="开始" width="120" />
      <el-table-column prop="end_date" label="结束" width="120" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="goDetail(row.id)">详情</el-button>
          <el-button size="small" @click="openForm(row)">编辑</el-button>
          <el-popconfirm title="确认删除该项目？" @confirm="remove(row)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialog.show" :title="dialog.id ? '编辑项目' : '新建项目'" width="540px">
      <el-form :model="dialog.form" label-width="90px">
        <el-form-item label="项目名称"><el-input v-model="dialog.form.name" /></el-form-item>
        <el-form-item label="项目编号"><el-input v-model="dialog.form.code" /></el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="dialog.form.owner_id" placeholder="请选择" clearable style="width:100%">
            <el-option v-for="m in members" :key="m.id" :label="`${m.name}（${m.role}）`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期"><el-date-picker v-model="dialog.form.start_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="结束日期"><el-date-picker v-model="dialog.form.end_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="项目描述"><el-input v-model="dialog.form.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.show = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
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
const members = ref([]);
const loading = ref(false);
const dialog = reactive({ show: false, id: null, form: {} });

async function load() {
  loading.value = true;
  try {
    list.value = await api.get('/projects');
  } finally {
    loading.value = false;
  }
}
async function loadMembers() {
  members.value = await api.get('/members');
}

function openForm(row) {
  dialog.id = row?.id || null;
  dialog.form = row
    ? { ...row }
    : { name: '', code: '', description: '', owner_id: null, start_date: '', end_date: '' };
  dialog.show = true;
}

async function save() {
  if (!dialog.form.name) return ElMessage.warning('请填写项目名称');
  if (dialog.id) {
    await api.put(`/projects/${dialog.id}`, dialog.form);
    ElMessage.success('已更新');
  } else {
    await api.post('/projects', dialog.form);
    ElMessage.success('已创建');
  }
  dialog.show = false;
  load();
}

async function remove(row) {
  await api.delete(`/projects/${row.id}`);
  ElMessage.success('已删除');
  load();
}

function goDetail(id) {
  router.push(`/projects/${id}`);
}

onMounted(() => {
  load();
  loadMembers();
});
</script>
