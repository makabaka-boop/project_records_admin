<template>
  <div class="page-card">
    <div class="page-toolbar">
      <h3 class="section-title">任务节点</h3>
      <div>
        <el-select v-model="filter.project_id" placeholder="按项目筛选" clearable style="width:200px;margin-right:8px;" @change="load">
          <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-select v-model="filter.status" placeholder="按状态筛选" clearable style="width:160px" @change="load">
          <el-option v-for="s in STATUS_LIST" :key="s" :label="s" :value="s" />
        </el-select>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="project_name" label="所属项目" min-width="160">
        <template #default="{ row }">
          <el-link type="primary" @click="$router.push(`/projects/${row.project_id}`)">{{ row.project_name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="节点" min-width="160" />
      <el-table-column prop="assignee_name" label="负责人" width="120" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="进度" width="160">
        <template #default="{ row }">
          <el-progress :percentage="row.progress" />
        </template>
      </el-table-column>
      <el-table-column prop="start_date" label="开始" width="110" />
      <el-table-column prop="due_date" label="截止" width="110" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openTransition(row)">状态流转</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="trans.show" title="节点状态流转" width="480px">
      <el-form label-width="90px">
        <el-form-item label="所属项目">
          <span>{{ trans.row?.project_name }}</span>
        </el-form-item>
        <el-form-item label="节点">
          <span>{{ trans.row?.name }}</span>
        </el-form-item>
        <el-form-item label="当前状态">
          <el-tag :type="statusType(trans.row?.status)">{{ trans.row?.status }}</el-tag>
        </el-form-item>
        <el-form-item label="目标状态">
          <el-select v-model="trans.form.to_status" style="width:100%">
            <el-option v-for="s in STATUS_LIST" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-input v-model="trans.form.action" placeholder="如：启动节点 / 提交审批" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="trans.form.comment" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="trans.show = false">取消</el-button>
        <el-button type="primary" @click="submitTransition">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';
import { statusType, STATUS_LIST } from '../utils/status';

const list = ref([]);
const projects = ref([]);
const loading = ref(false);
const filter = reactive({ project_id: null, status: null });
const trans = reactive({ show: false, row: null, form: { to_status: '', action: '', comment: '' } });

async function load() {
  loading.value = true;
  try {
    const params = {};
    if (filter.project_id) params.project_id = filter.project_id;
    if (filter.status) params.status = filter.status;
    list.value = await api.get('/nodes', { params });
  } finally {
    loading.value = false;
  }
}

async function loadProjects() {
  projects.value = await api.get('/projects');
}

function openTransition(row) {
  trans.row = row;
  trans.form = { to_status: '', action: '', comment: '' };
  trans.show = true;
}

async function submitTransition() {
  if (!trans.form.to_status) return ElMessage.warning('请选择目标状态');
  await api.post(`/nodes/${trans.row.id}/transition`, trans.form);
  ElMessage.success('状态已更新');
  trans.show = false;
  load();
}

onMounted(() => {
  loadProjects();
  load();
});
</script>
