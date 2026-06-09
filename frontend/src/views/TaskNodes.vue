<template>
  <div class="task-nodes-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="所属项目">
          <el-select v-model="filterForm.project_id" placeholder="全部项目" clearable style="width: 200px" @change="loadNodes">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 150px" @change="loadNodes">
            <el-option v-for="(item, key) in STATUS_MAP" :key="key" :label="item.label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadNodes">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>任务节点列表</span>
          <el-button type="primary" @click="handleAdd" :disabled="!filterForm.project_id">
            <el-icon><Plus /></el-icon>
            新增节点
          </el-button>
        </div>
      </template>

      <el-table :data="nodes" v-loading="loading" stripe>
        <el-table-column prop="project_name" label="所属项目" min-width="150" />
        <el-table-column prop="name" label="节点名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column prop="assignee_name" label="负责人" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_MAP[row.status]?.type">
              {{ STATUS_MAP[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleStatusChange(row)">状态流转</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑节点' : '新增节点'" width="500px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="80px">
        <el-form-item v-if="!isEdit" label="所属项目" prop="project_id">
          <el-select v-model="form.project_id" style="width: 100%" placeholder="请选择项目">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="节点名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入节点名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="负责人" prop="assignee_id">
          <el-select v-model="form.assignee_id" placeholder="请选择负责人" style="width: 100%" clearable>
            <el-option v-for="user in users" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort_order">
          <el-input-number v-model="form.sort_order" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjectList } from '@/api/projects'
import { getUserList } from '@/api/users'
import { 
  getTaskNodeList, createTaskNode, 
  updateTaskNode, deleteTaskNode, updateTaskNodeStatus 
} from '@/api/taskNodes'
import { STATUS_MAP } from '@/constants'
import dayjs from 'dayjs'

const loading = ref(false)
const submitting = ref(false)
const nodes = ref([])
const projects = ref([])
const users = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentNode = ref(null)
const statusDialogVisible = ref(false)
const formRef = ref(null)
const statusFormRef = ref(null)

const filterForm = reactive({
  project_id: '',
  status: ''
})

const form = reactive({
  id: null,
  project_id: null,
  name: '',
  description: '',
  assignee_id: null,
  sort_order: 0
})

const statusForm = reactive({
  status: '',
  remark: ''
})

const formRules = {
  project_id: [{ required: true, message: '请选择项目', trigger: 'change' }],
  name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }]
}

const statusFormRules = {
  status: [{ required: true, message: '请选择目标状态', trigger: 'change' }]
}

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

async function loadNodes() {
  loading.value = true
  try {
    const params = {}
    if (filterForm.project_id) {
      params.project_id = filterForm.project_id
    }
    if (filterForm.status) {
      params.status = filterForm.status
    }
    const res = await getTaskNodeList(params)
    nodes.value = res.data
  } catch (error) {
    console.error('加载节点列表失败:', error)
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterForm.project_id = ''
  filterForm.status = ''
  loadNodes()
}

function handleAdd() {
  isEdit.value = false
  form.id = null
  form.project_id = filterForm.project_id
  form.name = ''
  form.description = ''
  form.assignee_id = null
  form.sort_order = 0
  dialogVisible.value = true
  formRef.value?.resetFields()
}

function handleEdit(row) {
  isEdit.value = true
  form.id = row.id
  form.project_id = row.project_id
  form.name = row.name
  form.description = row.description
  form.assignee_id = row.assignee_id
  form.sort_order = row.sort_order
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      if (isEdit.value) {
        await updateTaskNode(form.id, form)
        ElMessage.success('更新成功')
      } else {
        await createTaskNode(form)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadNodes()
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除节点「${row.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteTaskNode(row.id)
    ElMessage.success('删除成功')
    loadNodes()
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
      loadNodes()
    } catch (error) {
      console.error('状态更新失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

onMounted(() => {
  loadProjects()
  loadUsers()
  loadNodes()
})
</script>

<style scoped>
.task-nodes-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
