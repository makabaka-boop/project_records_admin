<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>审批记录</span>
              <el-select v-model="filterProjectId" placeholder="按项目筛选" clearable style="width: 200px" @change="fetchApprovals">
                <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
              </el-select>
            </div>
          </template>
          <el-table :data="approvals" v-loading="loading" stripe>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="project_name" label="项目名称" min-width="150">
              <template #default="{ row }">
                <el-link type="primary" @click="$router.push(`/projects/${row.project_id}`)">{{ row.project_name }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="node_name" label="节点名称" min-width="120" />
            <el-table-column label="审批结果" width="90">
              <template #default="{ row }">
                <el-tag :type="row.action === 'approve' ? 'success' : 'danger'" size="small">
                  {{ row.action === 'approve' ? '通过' : '退回' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="approver_name" label="审批人" width="90" />
            <el-table-column prop="remark" label="审批意见" min-width="150" show-overflow-tooltip />
            <el-table-column prop="created_at" label="审批时间" width="170">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card>
          <template #header><el-icon><Clock /></el-icon> 待审批节点</template>
          <div v-if="pendingNodes.length === 0" style="text-align: center; color: #909399; padding: 30px">
            暂无待审批节点
          </div>
          <div v-for="node in pendingNodes" :key="node.id" style="padding: 12px 0; border-bottom: 1px solid #ebeef5">
            <div style="display: flex; justify-content: space-between; align-items: center">
              <div>
                <div style="font-weight: 500">{{ node.name }}</div>
                <div style="color: #909399; font-size: 12px; margin-top: 4px">{{ getProjectName(node.project_id) }}</div>
              </div>
              <el-button type="primary" size="small" @click="openApproval(node)">审批</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" title="审批处理" width="450px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="项目">{{ currentNode?.project_name }}</el-form-item>
        <el-form-item label="节点">{{ currentNode?.name }}</el-form-item>
        <el-form-item label="负责人">{{ currentNode?.assignee_name || '未分配' }}</el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入审批意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitApproval('reject')">退回</el-button>
        <el-button type="success" @click="submitApproval('approve')">通过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { approvalApi, projectApi, nodeApi } from '@/api'

const router = useRouter()
const approvals = ref([])
const projects = ref([])
const pendingNodes = ref([])
const loading = ref(false)
const filterProjectId = ref('')
const dialogVisible = ref(false)
const currentNode = ref(null)
const form = reactive({ remark: '' })

const fetchData = async () => {
  loading.value = true
  try {
    const [apprRes, projRes] = await Promise.all([
      approvalApi.list(filterProjectId.value ? { project_id: filterProjectId.value } : {}),
      projectApi.list()
    ])
    approvals.value = apprRes.data
    projects.value = projRes.data
    const nodesRes = await nodeApi.list(filterProjectId.value ? { project_id: filterProjectId.value } : {})
    pendingNodes.value = nodesRes.data.filter(n => n.status === 'pending_approval')
  } finally {
    loading.value = false
  }
}

const fetchApprovals = async () => {
  loading.value = true
  try {
    const [apprRes, nodesRes] = await Promise.all([
      approvalApi.list(filterProjectId.value ? { project_id: filterProjectId.value } : {}),
      nodeApi.list(filterProjectId.value ? { project_id: filterProjectId.value } : {})
    ])
    approvals.value = apprRes.data
    pendingNodes.value = nodesRes.data.filter(n => n.status === 'pending_approval')
  } finally {
    loading.value = false
  }
}

const getProjectName = (id) => projects.value.find(p => p.id === id)?.name || ''

const openApproval = async (node) => {
  const res = await nodeApi.get(node.id)
  currentNode.value = res.data
  form.remark = ''
  dialogVisible.value = true
}

const submitApproval = async (action) => {
  await approvalApi.create({ node_id: currentNode.value.id, action, remark: form.remark })
  ElMessage.success(action === 'approve' ? '审批通过' : '已退回')
  dialogVisible.value = false
  fetchData()
}

const formatTime = (time) => new Date(time).toLocaleString('zh-CN')

onMounted(fetchData)
</script>
