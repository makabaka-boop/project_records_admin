<template>
  <div class="project-detail">
    <el-page-header @back="$router.back()" :content="project?.name || '项目详情'" />

    <el-tabs v-model="activeTab" style="margin-top: 20px">
      <el-tab-pane label="项目信息" name="info">
        <el-card v-loading="loading">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="项目名称">{{ project?.name }}</el-descriptions-item>
            <el-descriptions-item label="项目状态">
              <el-tag :type="PROJECT_STATUS_MAP[project?.status]?.type">
                {{ PROJECT_STATUS_MAP[project?.status]?.label }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="开始日期">{{ project?.start_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="结束日期">{{ project?.end_date || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ project?.creator_name }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ project?.created_at }}</el-descriptions-item>
            <el-descriptions-item label="项目描述" :span="2">{{ project?.description || '无' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="项目成员" name="members">
        <el-card>
          <div style="margin-bottom: 15px">
            <el-button type="primary" size="small" @click="addMemberDialogVisible = true">
              <el-icon><Plus /></el-icon>
              添加成员
            </el-button>
          </div>
          <el-table :data="members" border>
            <el-table-column prop="name" label="姓名" />
            <el-table-column prop="username" label="用户名" />
            <el-table-column prop="email" label="邮箱" />
            <el-table-column label="项目角色">
              <template #default="{ row }">
                <el-tag size="small">{{ row.role === 'owner' ? '负责人' : '成员' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="joined_at" label="加入时间" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-popconfirm title="确定移除该成员？" @confirm="removeMember(row.user_id)">
                  <template #reference>
                    <el-button type="danger" size="small" link>移除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="任务节点" name="nodes">
        <el-card>
          <div style="margin-bottom: 15px">
            <el-button type="primary" size="small" @click="openNodeDialog()">
              <el-icon><Plus /></el-icon>
              添加节点
            </el-button>
          </div>
          <el-table :data="nodes" border>
            <el-table-column prop="name" label="节点名称" min-width="150" />
            <el-table-column prop="assignee_name" label="负责人" width="120" />
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="NODE_STATUS_MAP[row.status]?.type" size="small">
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
            <el-table-column label="操作" width="280">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="openNodeDialog(row)">编辑</el-button>
                <el-button type="success" size="small" link @click="openStatusDialog(row)">状态流转</el-button>
                <el-popconfirm title="确定删除该节点？" @confirm="deleteNode(row.id)">
                  <template #reference>
                    <el-button type="danger" size="small" link>删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="审批记录" name="approvals">
        <el-card>
          <el-table :data="approvals" border>
            <el-table-column prop="node_name" label="关联节点" />
            <el-table-column prop="applicant_name" label="申请人" width="120" />
            <el-table-column prop="content" label="审批内容" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="APPROVAL_STATUS_MAP[row.status]?.type" size="small">
                  {{ APPROVAL_STATUS_MAP[row.status]?.label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="approver_name" label="审批人" width="120" />
            <el-table-column prop="remark" label="审批意见" min-width="150" show-overflow-tooltip />
            <el-table-column prop="created_at" label="申请时间" width="170" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="addMemberDialogVisible" title="添加成员" width="500px">
      <el-form label-width="100px">
        <el-form-item label="选择成员">
          <el-select v-model="selectedMember" placeholder="请选择成员" style="width: 100%" filterable>
            <el-option
              v-for="user in allUsers"
              :key="user.id"
              :label="`${user.name} (${user.username})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addMemberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addMember">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="nodeDialogVisible" :title="editingNode ? '编辑节点' : '添加节点'" width="550px">
      <el-form ref="nodeFormRef" :model="nodeForm" :rules="nodeFormRules" label-width="100px">
        <el-form-item label="节点名称" prop="name">
          <el-input v-model="nodeForm.name" />
        </el-form-item>
        <el-form-item label="节点描述">
          <el-input v-model="nodeForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="nodeForm.assignee_id" placeholder="请选择" style="width: 100%" clearable>
            <el-option
              v-for="m in members"
              :key="m.user_id"
              :label="m.name"
              :value="m.user_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="进度">
          <el-slider v-model="nodeForm.progress" :max="100" show-input />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="nodeForm.due_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nodeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitNode">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="statusDialogVisible" title="节点状态流转" width="500px">
      <el-form label-width="100px">
        <el-form-item label="当前状态">
          <el-tag :type="NODE_STATUS_MAP[selectedNode?.status]?.type">
            {{ NODE_STATUS_MAP[selectedNode?.status]?.label }}
          </el-tag>
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
        <el-form-item label="进度更新">
          <el-slider v-model="statusProgress" :max="100" show-input />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="statusRemark" type="textarea" :rows="3" placeholder="请输入备注说明" />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { projectApi, userApi, nodeApi } from '@/api'
import { PROJECT_STATUS_MAP, NODE_STATUS_MAP, APPROVAL_STATUS_MAP } from '@/utils/constants'

const route = useRoute()
const projectId = route.params.id

const loading = ref(false)
const activeTab = ref('info')
const project = ref(null)
const members = ref([])
const nodes = ref([])
const approvals = ref([])
const allUsers = ref([])

const addMemberDialogVisible = ref(false)
const selectedMember = ref(null)

const nodeDialogVisible = ref(false)
const editingNode = ref(null)
const nodeFormRef = ref(null)
const nodeForm = reactive({
  name: '',
  description: '',
  assignee_id: null,
  progress: 0,
  due_date: ''
})
const nodeFormRules = {
  name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }]
}

const statusDialogVisible = ref(false)
const selectedNode = ref(null)
const targetStatus = ref('')
const statusProgress = ref(0)
const statusRemark = ref('')

const loadDetail = async () => {
  loading.value = true
  try {
    const data = await projectApi.getDetail(projectId)
    project.value = data.project
    members.value = data.members
    nodes.value = data.nodes
    approvals.value = data.approvals
  } finally {
    loading.value = false
  }
}

const loadAllUsers = async () => {
  const data = await userApi.getList()
  allUsers.value = data.users
}

const addMember = async () => {
  if (!selectedMember.value) {
    ElMessage.warning('请选择成员')
    return
  }
  await projectApi.addMember(projectId, { user_id: selectedMember.value })
  ElMessage.success('添加成功')
  addMemberDialogVisible.value = false
  selectedMember.value = null
  loadDetail()
}

const removeMember = async (userId) => {
  await projectApi.removeMember(projectId, userId)
  ElMessage.success('移除成功')
  loadDetail()
}

const openNodeDialog = (node) => {
  editingNode.value = node
  if (node) {
    Object.assign(nodeForm, {
      name: node.name,
      description: node.description,
      assignee_id: node.assignee_id,
      progress: node.progress,
      due_date: node.due_date
    })
  } else {
    Object.assign(nodeForm, {
      name: '',
      description: '',
      assignee_id: null,
      progress: 0,
      due_date: ''
    })
  }
  nodeDialogVisible.value = true
}

const submitNode = async () => {
  if (!nodeFormRef.value) return
  await nodeFormRef.value.validate(async (valid) => {
    if (valid) {
      if (editingNode.value) {
        await nodeApi.update(editingNode.value.id, nodeForm)
        ElMessage.success('更新成功')
      } else {
        await nodeApi.create({ ...nodeForm, project_id: parseInt(projectId) })
        ElMessage.success('创建成功')
      }
      nodeDialogVisible.value = false
      loadDetail()
    }
  })
}

const deleteNode = async (id) => {
  await nodeApi.delete(id)
  ElMessage.success('删除成功')
  loadDetail()
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
  loadDetail()
}

onMounted(() => {
  loadDetail()
  loadAllUsers()
})
</script>
