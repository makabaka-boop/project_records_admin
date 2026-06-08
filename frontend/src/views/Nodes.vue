<template>
  <div class="nodes-page">
    <el-card>
      <div class="page-header">
        <div class="search-bar">
          <el-select v-model="projectFilter" placeholder="选择项目" clearable style="width: 200px" @change="loadNodes">
            <el-option
              v-for="p in projects"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
          <el-select v-model="statusFilter" placeholder="节点状态" clearable style="width: 150px; margin-left: 10px">
            <el-option
              v-for="(item, key) in NODE_STATUS_MAP"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
          <el-button type="primary" style="margin-left: 10px" @click="loadNodes">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </div>
      </div>

      <el-table :data="nodeList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="project_name" label="所属项目" min-width="180" />
        <el-table-column prop="name" label="节点名称" min-width="180" />
        <el-table-column prop="assignee_name" label="负责人" width="120" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="NODE_STATUS_MAP[row.status]?.type">
              {{ NODE_STATUS_MAP[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="180">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" />
          </template>
        </el-table-column>
        <el-table-column prop="due_date" label="截止日期" width="120" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewLogs(row)">状态日志</el-button>
            <el-button type="success" link @click="openStatusDialog(row)">更新状态</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="statusDialogVisible" title="更新节点状态" width="500px">
      <el-form label-width="100px">
        <el-form-item label="当前状态">
          <el-tag :type="NODE_STATUS_MAP[selectedNode?.status]?.type">
            {{ NODE_STATUS_MAP[selectedNode?.status]?.label }}
          </el-tag>
        </el-form-item>
        <el-form-item label="节点名称">
          <span>{{ selectedNode?.name }}</span>
        </el-form-item>
        <el-form-item label="目标状态">
          <el-select v-model="targetStatus" placeholder="请选择" style="width: 100%">
            <el-option
              v-for="(item, key) in NODE_STATUS_MAP"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="进度">
          <el-slider v-model="statusProgress" :max="100" show-input />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="statusRemark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStatusChange">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="logsDialogVisible" title="状态变更日志" width="700px">
      <el-timeline>
        <el-timeline-item
          v-for="log in nodeLogs"
          :key="log.id"
          :timestamp="log.created_at"
          placement="top"
        >
          <el-card shadow="never">
            <div style="display: flex; align-items: center; gap: 10px">
              <span>{{ log.operator_name }}</span>
              <el-tag v-if="log.from_status" size="small" :type="NODE_STATUS_MAP[log.from_status]?.type">
                {{ NODE_STATUS_MAP[log.from_status]?.label }}
              </el-tag>
              <el-icon><Right /></el-icon>
              <el-tag size="small" :type="NODE_STATUS_MAP[log.to_status]?.type">
                {{ NODE_STATUS_MAP[log.to_status]?.label }}
              </el-tag>
            </div>
            <div v-if="log.remark" style="margin-top: 8px; color: #666">
              {{ log.remark }}
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { nodeApi, projectApi } from '@/api'
import { NODE_STATUS_MAP } from '@/utils/constants'

const projects = ref([])
const nodeList = ref([])
const loading = ref(false)
const projectFilter = ref('')
const statusFilter = ref('')

const statusDialogVisible = ref(false)
const selectedNode = ref(null)
const targetStatus = ref('')
const statusProgress = ref(0)
const statusRemark = ref('')

const logsDialogVisible = ref(false)
const nodeLogs = ref([])

const loadProjects = async () => {
  const data = await projectApi.getList()
  projects.value = data.projects
}

const loadNodes = async () => {
  loading.value = true
  try {
    const data = await nodeApi.getList({
      project_id: projectFilter.value,
      status: statusFilter.value
    })
    nodeList.value = data.nodes
  } finally {
    loading.value = false
  }
}

const openStatusDialog = (node) => {
  selectedNode.value = node
  targetStatus.value = node.status
  statusProgress.value = node.progress
  statusRemark.value = ''
  statusDialogVisible.value = true
}

const submitStatusChange = async () => {
  await nodeApi.updateStatus(selectedNode.value.id, {
    status: targetStatus.value,
    progress: statusProgress.value,
    remark: statusRemark.value
  })
  ElMessage.success('状态更新成功')
  statusDialogVisible.value = false
  loadNodes()
}

const viewLogs = async (node) => {
  const data = await nodeApi.getLogs(node.id)
  nodeLogs.value = data.logs
  logsDialogVisible.value = true
}

onMounted(() => {
  loadProjects()
  loadNodes()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  display: flex;
  align-items: center;
}
</style>
