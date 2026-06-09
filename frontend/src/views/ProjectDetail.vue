<template>
  <div class="project-detail" v-loading="loading">
    <el-page-header @back="goBack" :content="project?.name">
      <template #extra>
        <el-button type="primary" @click="handleEditProject">
          <el-icon><Edit /></el-icon>
          编辑项目
        </el-button>
      </template>
    </el-page-header>

    <el-row :gutter="20" class="content-row">
      <el-col :span="16">
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
              <el-tag :type="STATUS_MAP[project?.status]?.type" size="large">
                {{ STATUS_MAP[project?.status]?.label }}
              </el-tag>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="项目名称">{{ project?.name }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ project?.creator_name }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(project?.created_at) }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatDate(project?.updated_at) }}</el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">
              {{ project?.description || '暂无描述' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="nodes-card">
          <template #header>
            <div class="card-header">
              <span>任务节点</span>
              <el-button type="primary" size="small" @click="handleAddNode">
                <el-icon><Plus /></el-icon>
                添加节点
              </el-button>
            </div>
          </template>
          <el-table :data="project?.nodes" stripe>
            <el-table-column type="index" label="序号" width="60" />
            <el-table-column prop="name" label="节点名称" min-width="150" />
            <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
            <el-table-column prop="assignee_name" label="负责人" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="STATUS_MAP[row.status]?.type" size="small">
                  {{ STATUS_MAP[row.status]?.label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleEditNode(row)">编辑</el-button>
                <el-button type="primary" link size="small" @click="handleStatusChange(row)">状态流转</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteNode(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card class="approvals-card">
          <template #header>
            <span>最近审批记录</span>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="item in project?.recentApprovals"
              :key="item.id"
              :timestamp="formatDate(item.created_at)"
              placement="top"
            >
              <el-card shadow="never" class="timeline-card">
                <div class="approval-header">
                  <span class="operator">{{ item.operator_name }}</span>
                  <el-tag v-if="item.new_status" :type="STATUS_MAP[item.new_status]?.type" size="small">
                    {{ STATUS_MAP[item.new_status]?.label }}
                  </el-tag>
                </div>
                <div class="approval-content">
                  <span v-if="item.node_name">节点：{{ item.node_name }}</span>
                  <p v-if="item.remark">{{ item.remark }}</p>
                </div>
              </el-card>
            </el-timeline-item>
            <el-timeline-item v-if="!project?.recentApprovals?.length">
              暂无审批记录
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="members-card">
          <template #header>
            <div class="card-header">
              <span>项目成员</span>
              <el-button type="primary" size="small" @click="handleAddMember">
                <el-icon><Plus /></el-icon>
                添加
              </el-button>
            </div>
          </template>
          <div class="member-list">
            <div v-for="member in project?.members" :key="member.id" class="member-item">
              <el-avatar :size="36" class="member-avatar">
                {{ member.name?.charAt(0) }}
              </el-avatar>
              <div class="member-info">
                <div class="member-name">
                  {{ member.name }}
                  <el-tag :type="MEMBER_ROLE_MAP[member.role]?.type" size="small" style="margin-left: 8px">
                    {{ MEMBER_ROLE_MAP[member.role]?.label }}
                  </el-tag>
                </div>
                <div class="member-username">{{ member.username }}</div>
              </div>
              <el-button type="danger" link size="small" @click="handleRemoveMember(member)">
                移除
              </el-button>
            </div>
            <el-empty v-if="!project?.members?.length" description="暂无成员" :image-size="80" />
          </div>
        </el-card>

        <el-card class="stats-card">
          <template #header>
            <span>项目统计</span>
          </template>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ project?.nodes?.length || 0 }}</div>
              <div class="stat-label">总节点数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value success">
                {{ project?.nodes?.filter(n => n.status === 'completed')?.length || 0 }}
              </div>
              <div class="stat-label">已完成</div>
            </div>
            <div class="stat-item">
              <div class="stat-value primary">
                {{ project?.nodes?.filter(n => n.status === 'in_progress')?.length || 0 }}
              </div>
              <div class="stat-label">进行中</div>
            </div>
            <div class="stat-item">
              <div class="stat-value warning">
                {{ project?.nodes?.filter(n => n.status === 'pending_approval')?.length || 0 }}
              </div>
              <div class="stat-label">待审批</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="editProjectVisible" title="编辑项目" width="500px">
      <el-form :model="projectForm" :rules="projectFormRules" ref="projectFormRef" label-width="80px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="projectForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="projectForm.status" style="width: 100%">
            <el-option v-for="(item, key) in STATUS_MAP" :key="key" :label="item.label" :value="key" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editProjectVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProject" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="nodeDialogVisible" :title="isEditNode ? '编辑节点' : '添加节点'" width="500px">
      <el-form :model="nodeForm" :rules="nodeFormRules" ref="nodeFormRef" label-width="80px">
        <el-form-item label="节点名称" prop="name">
          <el-input v-model="nodeForm.name" placeholder="请输入节点名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="nodeForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="负责人" prop="assignee_id">
          <el-select v-model="nodeForm.assignee_id" placeholder="请选择负责人" style="width: 100%" clearable>
            <el-option v-for="user in userList" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="nodeForm.sort_order" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nodeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNode" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="statusDialogVisible" title="状态流转" width="500px">
      <el-form :model="statusForm" :rules="statusFormRules" ref="statusFormRef" label-width="80px">
        <el-form-item label="当前状态">
          <el-tag :type="STATUS_MAP[currentNode?.status]?.type">
            {{ STATUS_MAP[currentNode?.status]?.label }}
          </el-tag>
        </el-form-item>
        <el-form-item label="目标状态" prop="status">
          <el-select v-model="statusForm.status" style="width: 100%" placeholder="请选择目标状态">
            <el-option v-for="(item, key) in STATUS_MAP" :key="key" :label="item.label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="statusForm.remark" type="textarea" :rows="3" placeholder="请输入备注说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStatus" :loading="submitting">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="memberDialogVisible" title="添加成员" width="400px">
      <el-form :model="memberForm" :rules="memberFormRules" ref="memberFormRef" label-width="80px">
        <el-form-item label="选择用户" prop="user_id">
          <el-select v-model="memberForm.user_id" placeholder="请选择用户" style="width: 100%" filterable>
            <el-option v-for="user in availableUsers" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="memberForm.role" style="width: 100%">
            <el-option label="负责人" value="leader" />
            <el-option label="成员" value="member" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMember" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  getProjectDetail, updateProject, 
  addProjectMember, removeProjectMember 
} from '@/api/projects'
import { 
  createTaskNode, updateTaskNode, deleteTaskNode, updateTaskNodeStatus 
} from '@/api/taskNodes'
import { getUserList } from '@/api/users'
import { STATUS_MAP, MEMBER_ROLE_MAP } from '@/constants'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const project = ref(null)
const userList = ref([])
const submitting = ref(false)

const editProjectVisible = ref(false)
const nodeDialogVisible = ref(false)
const isEditNode = ref(false)
const currentNode = ref(null)
const statusDialogVisible = ref(false)
const memberDialogVisible = ref(false)

const projectFormRef = ref(null)
const nodeFormRef = ref(null)
const statusFormRef = ref(null)
const memberFormRef = ref(null)

const projectForm = reactive({
  name: '',
  description: '',
  status: 'pending'
})

const nodeForm = reactive({
  id: null,
  name: '',
  description: '',
  assignee_id: null,
  sort_order: 0
})

const statusForm = reactive({
  status: '',
  remark: ''
})

const memberForm = reactive({
  user_id: null,
  role: 'member'
})

const projectFormRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const nodeFormRules = {
  name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }]
}

const statusFormRules = {
  status: [{ required: true, message: '请选择目标状态', trigger: 'change' }]
}

const memberFormRules = {
  user_id: [{ required: true, message: '请选择用户', trigger: 'change' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const availableUsers = computed(() => {
  if (!project.value?.members) return userList.value
  const memberIds = project.value.members.map(m => m.user_id)
  return userList.value.filter(u => !memberIds.includes(u.id))
})

function formatDate(date) {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'
}

function goBack() {
  router.push('/projects')
}

async function loadProject() {
  loading.value = true
  try {
    const res = await getProjectDetail(route.params.id)
    project.value = res.data
  } catch (error) {
    console.error('加载项目详情失败:', error)
  } finally {
    loading.value = false
  }
}

async function loadUsers() {
  try {
    const res = await getUserList()
    userList.value = res.data
  } catch (error) {
    console.error('加载用户列表失败:', error)
  }
}

function handleEditProject() {
  projectForm.name = project.value.name
  projectForm.description = project.value.description
  projectForm.status = project.value.status
  editProjectVisible.value = true
}

async function submitProject() {
  if (!projectFormRef.value) return
  
  await projectFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await updateProject(route.params.id, projectForm)
      ElMessage.success('更新成功')
      editProjectVisible.value = false
      loadProject()
    } catch (error) {
      console.error('更新失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

function handleAddNode() {
  isEditNode.value = false
  nodeForm.id = null
  nodeForm.name = ''
  nodeForm.description = ''
  nodeForm.assignee_id = null
  nodeForm.sort_order = 0
  nodeDialogVisible.value = true
  nodeFormRef.value?.resetFields()
}

function handleEditNode(row) {
  isEditNode.value = true
  nodeForm.id = row.id
  nodeForm.name = row.name
  nodeForm.description = row.description
  nodeForm.assignee_id = row.assignee_id
  nodeForm.sort_order = row.sort_order
  nodeDialogVisible.value = true
}

async function submitNode() {
  if (!nodeFormRef.value) return
  
  await nodeFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      if (isEditNode.value) {
        await updateTaskNode(nodeForm.id, nodeForm)
        ElMessage.success('更新成功')
      } else {
        await createTaskNode({
          ...nodeForm,
          project_id: route.params.id
        })
        ElMessage.success('添加成功')
      }
      nodeDialogVisible.value = false
      loadProject()
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

async function handleDeleteNode(row) {
  try {
    await ElMessageBox.confirm(`确定要删除节点「${row.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteTaskNode(row.id)
    ElMessage.success('删除成功')
    loadProject()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除失败:', e)
    }
  }
}

function handleStatusChange(row) {
  currentNode.value = row
  statusForm.status = ''
  statusForm.remark = ''
  statusDialogVisible.value = true
}

async function submitStatus() {
  if (!statusFormRef.value) return
  
  await statusFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await updateTaskNodeStatus(currentNode.value.id, statusForm)
      ElMessage.success('状态更新成功')
      statusDialogVisible.value = false
      loadProject()
    } catch (error) {
      console.error('状态更新失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

function handleAddMember() {
  memberForm.user_id = null
  memberForm.role = 'member'
  memberDialogVisible.value = true
  memberFormRef.value?.resetFields()
}

async function submitMember() {
  if (!memberFormRef.value) return
  
  await memberFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await addProjectMember(route.params.id, memberForm)
      ElMessage.success('添加成功')
      memberDialogVisible.value = false
      loadProject()
    } catch (error) {
      console.error('添加成员失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

async function handleRemoveMember(member) {
  try {
    await ElMessageBox.confirm(`确定要移除成员「${member.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await removeProjectMember(route.params.id, member.id)
    ElMessage.success('移除成功')
    loadProject()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('移除失败:', e)
    }
  }
}

onMounted(() => {
  loadProject()
  loadUsers()
})
</script>

<style scoped>
.project-detail {
  min-height: 100%;
}

.content-row {
  margin-top: 20px;
}

.info-card, .nodes-card, .approvals-card, .members-card, .stats-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-card {
  margin: 0;
  background: #f5f7fa;
  border: none;
}

.approval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.operator {
  font-weight: 500;
  color: #303133;
}

.approval-content {
  font-size: 14px;
  color: #606266;
}

.approval-content p {
  margin: 4px 0 0 0;
}

.member-list {
  max-height: 400px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.member-item:last-child {
  border-bottom: none;
}

.member-avatar {
  margin-right: 12px;
  background: #409EFF;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.member-username {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.stat-value.success {
  color: #67C23A;
}

.stat-value.primary {
  color: #409EFF;
}

.stat-value.warning {
  color: #E6A23C;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}
</style>
