<template>
  <div>
    <div class="page-card" v-if="pendingNodes.length">
      <div class="page-toolbar">
        <h3 class="section-title">待审批节点（{{ pendingNodes.length }}）</h3>
      </div>
      <el-table :data="pendingNodes" size="small" stripe>
        <el-table-column prop="project_name" label="项目" min-width="150" />
        <el-table-column prop="name" label="节点" min-width="140" />
        <el-table-column prop="assignee_name" label="负责人" width="110" />
        <el-table-column label="当前状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="due_date" label="截止" width="120" />
        <el-table-column label="审批处理" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="openHandle(row, '审批通过', '已完成')">通过</el-button>
            <el-button size="small" type="danger" @click="openHandle(row, '审批退回', '已退回')">退回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="page-card" :style="pendingNodes.length ? 'margin-top:14px;' : ''">
      <div class="page-toolbar">
        <h3 class="section-title">审批记录</h3>
        <div>
          <el-select v-model="filter.project_id" placeholder="按项目筛选" clearable style="width:220px" @change="load">
            <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </div>
      </div>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column prop="project_name" label="项目" min-width="160">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/projects/${row.project_id}`)">{{ row.project_name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="node_name" label="节点" min-width="140" />
        <el-table-column label="状态变更" width="220">
          <template #default="{ row }">
            <el-tag size="small">{{ row.from_status || '-' }}</el-tag>
            <span style="margin: 0 6px">→</span>
            <el-tag size="small" :type="statusType(row.to_status)">{{ row.to_status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120" />
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="comment" label="审批意见" min-width="200" />
      </el-table>
    </div>

    <el-dialog v-model="handle.show" :title="handle.action" width="480px">
      <el-form label-width="90px">
        <el-form-item label="项目">
          <span>{{ handle.row?.project_name }}</span>
        </el-form-item>
        <el-form-item label="节点">
          <span>{{ handle.row?.name }}</span>
        </el-form-item>
        <el-form-item label="目标状态">
          <el-tag :type="statusType(handle.toStatus)">{{ handle.toStatus }}</el-tag>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="handle.comment" type="textarea" :rows="3" placeholder="请填写审批意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handle.show = false">取消</el-button>
        <el-button type="primary" @click="submitHandle">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';
import { statusType } from '../utils/status';

const list = ref([]);
const projects = ref([]);
const pendingNodes = ref([]);
const loading = ref(false);
const filter = reactive({ project_id: null });
const handle = reactive({ show: false, row: null, action: '', toStatus: '', comment: '' });

async function load() {
  loading.value = true;
  try {
    const params = {};
    if (filter.project_id) params.project_id = filter.project_id;
    list.value = await api.get('/approvals', { params });
  } finally {
    loading.value = false;
  }
}

async function loadProjects() {
  projects.value = await api.get('/projects');
}

async function loadPending() {
  pendingNodes.value = await api.get('/nodes', { params: { status: '待审批' } });
}

function openHandle(row, action, toStatus) {
  handle.row = row;
  handle.action = action;
  handle.toStatus = toStatus;
  handle.comment = '';
  handle.show = true;
}

async function submitHandle() {
  await api.post(`/nodes/${handle.row.id}/transition`, {
    to_status: handle.toStatus,
    action: handle.action,
    comment: handle.comment
  });
  ElMessage.success('已处理');
  handle.show = false;
  await Promise.all([load(), loadPending(), loadProjects()]);
}

onMounted(() => {
  loadProjects();
  loadPending();
  load();
});
</script>
