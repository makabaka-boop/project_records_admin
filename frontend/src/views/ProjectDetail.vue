<template>
  <div class="page-container">
    <el-page-header @back="goBack" :content="project?.name || '项目详情'" style="margin-bottom: 20px">
      <template #extra>
        <el-tag :type="STATUS_MAP[project?.status]?.type" size="large">
          {{ STATUS_MAP[project?.status]?.label }}
        </el-tag>
      </template>
    </el-page-header>

    <el-row :gutter="20">
      <el-col :span="16">
        <el-card style="margin-bottom: 20px">
          <template #header>
            <div class="card-header">
              <span><el-icon><List /></el-icon> 任务节点</span>
              <el-button type="primary" size="small" @click="showNodeDialog()">添加节点</el-button>
            </div>
          </template>
          <el-table :data="project?.nodes || []" stripe size="small">
            <el-table-column prop="sort_order" label="序号" width="60" />
            <el-table-column prop="name" label="节点名称" min-width="140" />
            <el-table-column prop="assignee_name" label="负责人" width="90" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="STATUS_MAP[row.status]?.type" size="small">{{ STATUS_MAP[row.status]?.label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="showNodeDialog(row)">编辑</el-button>
                <el-dropdown trigger="click" @command="(cmd) => handleNodeStatus(row, cmd)">
                  <el-button link type="primary">更新状态<el-icon><ArrowDown /></el-icon></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item v-for="s in availableStatuses(row.status)" :key="s.value" :command="s.value">
                        {{ s.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-button v-if="row.status === 'pending_approval'" link type="warning" @click="showApprovalDialog(row)">审批</el-button>
                <el-popconfirm title="确定删除？" @confirm="deleteNode(row.id)">
                  <template #reference><el-button link type="danger">删除</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card>
          <template #header><span><el-icon><DocumentChecked /></el-icon> 审批记录摘要</span></template>
          <el-table :data="approvals" size="small">
            <el-table-column prop="node_name" label="节点" width="120" />
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-tag :type="row.action === 'approve' ? 'success' : 'danger'" size="small">
                  {{ row.action === 'approve' ? '通过' : '退回' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="approver_name" label="审批人" width="90" />
            <el-table-column prop="remark" label="意见" show-overflow-tooltip />
            <el-table-column prop="created_at" label="时间" width="160">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card style="margin-bottom: 20px">
          <template #header>项目信息</template>
          <el-descriptions :column="1" size="small">
            <el-descriptions-item label="项目描述">{{ project?.description || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ project?.creator_name }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(project?.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="审批次数">{{ project?.approval_count }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card>
          <template #header>
            <div class="card-header">
              <span><el-icon><User /></el-icon> 项目成员</span>
              <el-button type="primary" size="small" @click="showMemberDialog">添加成员</el-button>
            </div>
          </template>
          <div style="margin-bottom: 10px">
            <el-tag v-for="m in project?.members || []" :key="m.id" closable @close="removeMember(m.id)" style="margin: 3px">
              {{ m.name }}
              <span style="color: #909399; font-size: 12px; margin-left: 4px">({{ ROLE_MAP[m.member_role]?.label }})</span>
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="nodeDialogVisible" :title="editingNode ? '编辑节点' : '添加节点'" width="500px">
      <el-form ref="nodeFormRef" :model="nodeForm" :rules="nodeRules" label-width="80px">
        <el-form-item label="节点名称" prop="name">
          <el-input v-model="nodeForm.name" />
        </el-form-item>
        <el-form-item label="节点描述">
          <el-input v-model="nodeForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="nodeForm.assignee_id" placeholder="选择负责人" clearable>
            <el-option v-for="m in project?.members || []" :key="m.user_id" :label="m.name" :value="m.user_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="nodeForm.deadline" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="nodeForm.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nodeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNode">确定</el-button>
      </template>
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

    <el-dialog v-model="memberDialogVisible" title="添加项目成员" width="400px">
      <el-form :model="memberForm" label-width="80px">
        <el-form-item label="选择成员">
          <el-select v-model="memberForm.user_id" placeholder="选择成员" style="width: 100%">
            <el-option v-for="u in allUsers" :key="u.id" :label="u.name" :value="u.id" :disabled="isMember(u.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目角色">
          <el-select v-model="memberForm.role" style="width: 100%">
            <el-option v-for="r in MEMBER_ROLES" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddMember">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="approvalDialogVisible" title="审批处理" width="450px">
      <el-form :model="approvalForm" label-width="80px">
        <el-form-item label="节点">{{ approvalForm.nodeName }}</el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="approvalForm.remark" type="textarea" :rows="3" placeholder="请输入审批意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approvalDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitApproval('reject')">退回</el-button>
        <el-button type="success" @click="submitApproval('approve')">通过</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { projectApi, nodeApi, userApi, approvalApi } from '@/api'
import { STATUS_MAP, ROLE_MAP, MEMBER_ROLES } from '@/utils/status'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

const project = ref(null)
const allUsers = ref([])
const approvals = ref([])
const nodeDialogVisible = ref(false)
const editingNode = ref(null)
const nodeFormRef = ref(null)
const nodeForm = reactive({ name: '', description: '', assignee_id: null, deadline: null, sort_order: 0 })
const nodeRules = { name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }] }

const statusDialogVisible = ref(false)
const statusForm = reactive({ nodeId: null, toStatus: '', remark: '' })
const memberDialogVisible = ref(false)
const memberForm = reactive({ user_id: null, role: 'member' })
const approvalDialogVisible = ref(false)
const approvalForm = reactive({ nodeId: null, nodeName: '', remark: '' })

const fetchData = async () => {
  const res = await projectApi.get(projectId)
  project.value = res.data
  const apprRes = await approvalApi.list({ project_id: projectId })
  approvals.value = apprRes.data
  const usersRes = await userApi.list()
  allUsers.value = usersRes.data
}

const goBack = () => router.push('/projects')

const availableStatuses = (currentStatus) => {
  const all = [
    { value: 'pending', label: '待开始' },
    { value: 'in_progress', label: '进行中' },
    { value: 'pending_approval', label: '待审批' },
    { value: 'completed', label: '已完成' },
    { value: 'archived', label: '已归档' }
  ]
  return all.filter(s => s.value !== currentStatus && s.value !== 'rejected')
}

const showNodeDialog = (row = null) => {
  editingNode.value = row
  if (row) {
    Object.assign(nodeForm, {
      name: row.name,
      description: row.description,
      assignee_id: row.assignee_id,
      deadline: row.deadline,
      sort_order: row.sort_order
    })
  } else {
    Object.assign(nodeForm, { name: '', description: '', assignee_id: null, deadline: null, sort_order: (project.value?.nodes?.length || 0) + 1 })
  }
  nodeDialogVisible.value = true
}

const submitNode = async () => {
  await nodeFormRef.value.validate()
  const data = { ...nodeForm, project_id: Number(projectId) }
  if (editingNode.value) {
    await nodeApi.update(editingNode.value.id, data)
    ElMessage.success('更新成功')
  } else {
    await nodeApi.create(data)
    ElMessage.success('创建成功')
  }
  nodeDialogVisible.value = false
  fetchData()
}

const handleNodeStatus = (row, status) => {
  statusForm.nodeId = row.id
  statusForm.toStatus = status
  statusForm.remark = ''
  statusDialogVisible.value = true
}

const submitStatusChange = async () => {
  await nodeApi.updateStatus(statusForm.nodeId, { status: statusForm.toStatus, remark: statusForm.remark })
  ElMessage.success('状态更新成功')
  statusDialogVisible.value = false
  fetchData()
}

const deleteNode = async (id) => {
  await nodeApi.delete(id)
  ElMessage.success('删除成功')
  fetchData()
}

const isMember = (userId) => project.value?.members?.some(m => m.user_id === userId)

const showMemberDialog = () => {
  memberForm.user_id = null
  memberForm.role = 'member'
  memberDialogVisible.value = true
}

const submitAddMember = async () => {
  if (!memberForm.user_id) return ElMessage.warning('请选择成员')
  await projectApi.addMember(projectId, memberForm)
  ElMessage.success('添加成功')
  memberDialogVisible.value = false
  fetchData()
}

const removeMember = async (memberId) => {
  await projectApi.removeMember(projectId, memberId)
  ElMessage.success('移除成功')
  fetchData()
}

const showApprovalDialog = (row) => {
  approvalForm.nodeId = row.id
  approvalForm.nodeName = row.name
  approvalForm.remark = ''
  approvalDialogVisible.value = true
}

const submitApproval = async (action) => {
  await approvalApi.create({ node_id: approvalForm.nodeId, action, remark: approvalForm.remark })
  ElMessage.success(action === 'approve' ? '审批通过' : '已退回')
  approvalDialogVisible.value = false
  fetchData()
}

const formatTime = (time) => time ? new Date(time).toLocaleString('zh-CN') : '-'

onMounted(fetchData)
</script>
