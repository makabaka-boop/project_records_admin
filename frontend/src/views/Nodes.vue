<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>任务节点列表</span>
          <div>
            <el-select v-model="filterProjectId" placeholder="按项目筛选" clearable style="width: 200px; margin-right: 10px" @change="fetchNodes">
              <el-option v-for="p in projects" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
            <el-select v-model="filterStatus" placeholder="按状态筛选" clearable style="width: 120px; margin-right: 10px" @change="fetchNodes">
              <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
          </div>
        </div>
      </template>
      <el-table :data="filteredNodes" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="project_name" label="所属项目" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="$router.push(`/projects/${row.project_id}`)">{{ row.project_name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="节点名称" min-width="140" />
        <el-table-column prop="description" label="节点描述" min-width="160" show-overflow-tooltip />
        <el-table-column prop="assignee_name" label="负责人" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_MAP[row.status]?.type" size="small">{{ STATUS_MAP[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止日期" width="110" />
        <el-table-column prop="updated_at" label="更新时间" width="170">
          <template #default="{ row }">{{ formatTime(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showLogs(row)">状态记录</el-button>
            <el-dropdown trigger="click" @command="(cmd) => handleStatus(row, cmd)">
              <el-button link type="primary">更新状态<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="s in availableStatuses(row.status)" :key="s.value" :command="s.value">
                    {{ s.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="logsVisible" :title="`${currentNode?.name} - 状态变更记录`" width="650px">
      <el-timeline>
        <el-timeline-item
          v-for="log in nodeLogs"
          :key="log.id"
          :timestamp="formatTime(log.created_at)"
          :type="STATUS_MAP[log.to_status]?.type || 'primary'"
        >
          <div style="margin-bottom: 5px">
            <strong>{{ log.operator_name }}</strong>
            <span v-if="log.from_status">将状态从</span>
            <el-tag v-if="log.from_status" :type="STATUS_MAP[log.from_status]?.type" size="small" style="margin: 0 4px">
              {{ STATUS_MAP[log.from_status]?.label }}
            </el-tag>
            <span v-if="log.from_status">改为</span>
            <el-tag :type="STATUS_MAP[log.to_status]?.type" size="small" style="margin: 0 4px">
              {{ STATUS_MAP[log.to_status]?.label }}
            </el-tag>
          </div>
          <div v-if="log.remark" style="color: #606266; font-size: 13px">
            备注：{{ log.remark }}
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>

    <el-dialog v-model="statusDialogVisible" title="更新节点状态" width="400px">
      <el-form :model="statusForm" label-width="80px">
        <el-form-item label="目标状态">
          <el-tag :type="STATUS_MAP[statusForm.toStatus]?.type">{{ STATUS_MAP[statusForm.toStatus]?.label }}</el-tag>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="statusForm.remark" type="textarea" :rows="3" placeholder="请输入状态变更说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStatusChange">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { nodeApi, projectApi } from '@/api'
import { STATUS_MAP } from '@/utils/status'

const nodes = ref([])
const projects = ref([])
const loading = ref(false)
const filterProjectId = ref('')
const filterStatus = ref('')
const logsVisible = ref(false)
const currentNode = ref(null)
const nodeLogs = ref([])
const statusDialogVisible = ref(false)
const statusForm = reactive({ nodeId: null, toStatus: '', remark: '' })

const statusOptions = Object.keys(STATUS_MAP).map(key => ({ value: key, label: STATUS_MAP[key].label }))

const filteredNodes = computed(() => {
  let list = nodes.value
  if (filterProjectId.value) list = list.filter(n => n.project_id === filterProjectId.value)
  if (filterStatus.value) list = list.filter(n => n.status === filterStatus.value)
  return list
})

const fetchData = async () => {
  loading.value = true
  try {
    const [nodesRes, projRes] = await Promise.all([nodeApi.list(), projectApi.list()])
    nodes.value = nodesRes.data
    projects.value = projRes.data
  } finally {
    loading.value = false
  }
}

const fetchNodes = async () => {
  loading.value = true
  try {
    const res = await nodeApi.list(filterProjectId.value ? { project_id: filterProjectId.value } : {})
    nodes.value = res.data
  } finally {
    loading.value = false
  }
}

const availableStatuses = (currentStatus) => {
  return statusOptions.filter(s => s.value !== currentStatus && s.value !== 'rejected')
}

const showLogs = async (row) => {
  currentNode.value = row
  const res = await nodeApi.get(row.id)
  nodeLogs.value = res.data.logs || []
  logsVisible.value = true
}

const handleStatus = (row, status) => {
  statusForm.nodeId = row.id
  statusForm.toStatus = status
  statusForm.remark = ''
  statusDialogVisible.value = true
}

const submitStatusChange = async () => {
  await nodeApi.updateStatus(statusForm.nodeId, { status: statusForm.toStatus, remark: statusForm.remark })
  ElMessage.success('状态更新成功')
  statusDialogVisible.value = false
  fetchNodes()
}

const formatTime = (time) => new Date(time).toLocaleString('zh-CN')

onMounted(fetchData)
</script>
