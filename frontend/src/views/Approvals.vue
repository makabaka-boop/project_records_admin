<template>
  <div class="approvals-page">
    <el-card>
      <div class="page-header">
        <div class="search-bar">
          <el-select v-model="statusFilter" placeholder="审批状态" clearable style="width: 150px">
            <el-option
              v-for="(item, key) in APPROVAL_STATUS_MAP"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
          <el-button type="primary" style="margin-left: 10px" @click="loadApprovals">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </div>
      </div>

      <el-table :data="approvalList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="project_name" label="所属项目" min-width="150" />
        <el-table-column prop="node_name" label="关联节点" min-width="150" />
        <el-table-column prop="applicant_name" label="申请人" width="100" />
        <el-table-column prop="content" label="审批内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="APPROVAL_STATUS_MAP[row.status]?.type">
              {{ APPROVAL_STATUS_MAP[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="approver_name" label="审批人" width="100" />
        <el-table-column prop="remark" label="审批意见" min-width="150" show-overflow-tooltip />
        <el-table-column prop="created_at" label="申请时间" width="170" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="success" link @click="openApproveDialog(row)">通过</el-button>
              <el-button type="danger" link @click="openRejectDialog(row)">退回</el-button>
            </template>
            <el-button v-else type="info" link @click="viewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="approveDialogVisible" title="审批通过" width="500px">
      <el-form label-width="100px">
        <el-form-item label="审批内容">
          <span>{{ currentApproval?.content }}</span>
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="approveRemark" type="textarea" :rows="3" placeholder="请输入审批意见（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approveDialogVisible = false">取消</el-button>
        <el-button type="success" @click="handleApprove">确认通过</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectDialogVisible" title="审批退回" width="500px">
      <el-form label-width="100px">
        <el-form-item label="审批内容">
          <span>{{ currentApproval?.content }}</span>
        </el-form-item>
        <el-form-item label="退回原因">
          <el-input v-model="rejectRemark" type="textarea" :rows="3" placeholder="请输入退回原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleReject">确认退回</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailDialogVisible" title="审批详情" width="500px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="所属项目">{{ currentApproval?.project_name }}</el-descriptions-item>
        <el-descriptions-item label="关联节点">{{ currentApproval?.node_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentApproval?.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="审批内容">{{ currentApproval?.content }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="APPROVAL_STATUS_MAP[currentApproval?.status]?.type">
            {{ APPROVAL_STATUS_MAP[currentApproval?.status]?.label }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审批人">{{ currentApproval?.approver_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="审批意见">{{ currentApproval?.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ currentApproval?.created_at }}</el-descriptions-item>
        <el-descriptions-item label="处理时间">{{ currentApproval?.approved_at || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { approvalApi } from '@/api'
import { APPROVAL_STATUS_MAP } from '@/utils/constants'

const approvalList = ref([])
const loading = ref(false)
const statusFilter = ref('')

const approveDialogVisible = ref(false)
const rejectDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentApproval = ref(null)
const approveRemark = ref('')
const rejectRemark = ref('')

const loadApprovals = async () => {
  loading.value = true
  try {
    const data = await approvalApi.getList({ status: statusFilter.value })
    approvalList.value = data.approvals
  } finally {
    loading.value = false
  }
}

const openApproveDialog = (row) => {
  currentApproval.value = row
  approveRemark.value = ''
  approveDialogVisible.value = true
}

const openRejectDialog = (row) => {
  currentApproval.value = row
  rejectRemark.value = ''
  rejectDialogVisible.value = true
}

const viewDetail = (row) => {
  currentApproval.value = row
  detailDialogVisible.value = true
}

const handleApprove = async () => {
  await approvalApi.approve(currentApproval.value.id, { remark: approveRemark.value })
  ElMessage.success('审批通过成功')
  approveDialogVisible.value = false
  loadApprovals()
}

const handleReject = async () => {
  if (!rejectRemark.value) {
    ElMessage.warning('请输入退回原因')
    return
  }
  await approvalApi.reject(currentApproval.value.id, { remark: rejectRemark.value })
  ElMessage.success('已退回')
  rejectDialogVisible.value = false
  loadApprovals()
}

onMounted(() => {
  loadApprovals()
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
