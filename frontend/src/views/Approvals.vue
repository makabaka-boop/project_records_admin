<template>
  <div class="approvals-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="项目">
          <el-select v-model="filterForm.project_id" placeholder="全部项目" clearable style="width: 200px">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option v-for="(item, key) in STATUS_MAP" :key="key" :label="item.label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-select v-model="filterForm.operator_id" placeholder="全部" clearable style="width: 150px">
            <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadApprovals">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <span>审批记录列表</span>
      </template>

      <el-table :data="approvals" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="project_name" label="项目名称" min-width="150" />
        <el-table-column prop="node_name" label="节点名称" min-width="150" />
        <el-table-column label="状态变更" width="200">
          <template #default="{ row }">
            <div class="status-change">
              <el-tag v-if="row.previous_status" :type="STATUS_MAP[row.previous_status]?.type" size="small">
                {{ STATUS_MAP[row.previous_status]?.label }}
              </el-tag>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
              <el-tag v-if="row.new_status" :type="STATUS_MAP[row.new_status]?.type" size="small">
                {{ STATUS_MAP[row.new_status]?.label }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column prop="created_at" label="操作时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.node_id && row.node_current_status === 'pending_approval'" type="success" link size="small" @click="handleApprove(row)">通过</el-button>
            <el-button v-if="row.node_id && row.node_current_status === 'pending_approval'" type="danger" link size="small" @click="handleReject(row)">
              退回
            </el-button>
            <span v-else-if="row.new_status === 'pending_approval'" style="color: #909399; font-size: 12px;">已处理</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="remarkDialogVisible" :title="isApprove ? '审批通过' : '审批退回'" width="400px">
      <el-form :model="remarkForm" label-width="80px">
        <el-form-item label="备注">
          <el-input v-model="remarkForm.remark" type="textarea" :rows="3" placeholder="请输入备注说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="remarkDialogVisible = false">取消</el-button>
        <el-button :type="isApprove ? 'success' : 'danger'" @click="submitApproval" :loading="submitting">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjectList } from '@/api/projects'
import { getUserList } from '@/api/users'
import { getApprovalList, approveApproval, rejectApproval } from '@/api/approvals'
import { STATUS_MAP } from '@/constants'
import dayjs from 'dayjs'

const loading = ref(false)
const submitting = ref(false)
const approvals = ref([])
const projects = ref([])
const users = ref([])
const remarkDialogVisible = ref(false)
const isApprove = ref(false)
const currentApproval = ref(null)

const showApproveActions = computed(() => approvals.value.some(a => a.new_status === 'pending_approval'))

const filterForm = reactive({
  project_id: '',
  status: '',
  operator_id: ''
})

const remarkForm = reactive({
  remark: ''
})

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

async function loadProjects() {
  try {
    const res = await getProjectList()
    projects.value = res.data
  } catch (error) {
    console.error('加载项目列表失败:', error)
  }
}

async function loadUsers() {
  try {
    const res = await getUserList()
    users.value = res.data
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

async function loadApprovals() {
  loading.value = true
  try {
    const params = {}
    if (filterForm.project_id) params.project_id = filterForm.project_id
    if (filterForm.status) params.status = filterForm.status
    if (filterForm.operator_id) params.operator_id = filterForm.operator_id
    
    const res = await getApprovalList(params)
    approvals.value = res.data
  } catch (error) {
    console.error('加载审批记录失败:', error)
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterForm.project_id = ''
  filterForm.status = ''
  filterForm.operator_id = ''
  loadApprovals()
}

function handleApprove(row) {
  currentApproval.value = row
  isApprove.value = true
  remarkForm.remark = ''
  remarkDialogVisible.value = true
}

function handleReject(row) {
  currentApproval.value = row
  isApprove.value = false
  remarkForm.remark = ''
  remarkDialogVisible.value = true
}

async function submitApproval() {
  submitting.value = true
  try {
    if (isApprove.value) {
      await approveApproval(currentApproval.value.id, remarkForm)
      ElMessage.success('审批通过')
    } else {
      await rejectApproval(currentApproval.value.id, remarkForm)
      ElMessage.success('已退回')
    }
    remarkDialogVisible.value = false
    loadApprovals()
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadProjects()
  loadUsers()
  loadApprovals()
})
</script>

<style scoped>
.approvals-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-change {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrow-icon {
  color: #909399;
}
</style>
