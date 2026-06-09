<template>
  <div class="members-page">
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span>成员列表</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增成员
          </el-button>
        </div>
      </template>

      <el-table :data="members" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="ROLE_MAP[row.role]?.type">
              {{ ROLE_MAP[row.role]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewProjects(row)">参与项目</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑成员' : '新增成员'" width="500px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
          <span v-if="isEdit" style="color: #909399; font-size: 12px;">不修改密码请留空</span>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="projectsDialogVisible" title="参与的项目" width="700px">
      <el-table :data="userProjects" v-loading="projectsLoading" stripe>
        <el-table-column prop="name" label="项目名称" />
        <el-table-column prop="member_role" label="角色">
          <template #default="{ row }">
            <el-tag :type="MEMBER_ROLE_MAP[row.member_role]?.type">
              {{ MEMBER_ROLE_MAP[row.member_role]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="STATUS_MAP[row.status]?.type" size="small">
              {{ STATUS_MAP[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="joined_at" label="加入时间">
          <template #default="{ row }">
            {{ formatDate(row.joined_at) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList, createUser, updateUser, deleteUser, getUserProjects } from '@/api/users'
import { STATUS_MAP, ROLE_MAP, MEMBER_ROLE_MAP } from '@/constants'
import dayjs from 'dayjs'

const loading = ref(false)
const submitting = ref(false)
const members = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)

const projectsDialogVisible = ref(false)
const projectsLoading = ref(false)
const userProjects = ref([])
const currentUser = ref(null)

const form = reactive({
  id: null,
  username: '',
  name: '',
  password: '',
  role: 'user'
})

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

async function loadMembers() {
  loading.value = true
  try {
    const res = await getUserList()
    members.value = res.data
  } catch (error) {
    console.error('加载成员列表失败:', error)
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  isEdit.value = false
  form.id = null
  form.username = ''
  form.name = ''
  form.password = ''
  form.role = 'user'
  dialogVisible.value = true
  
  formRules.password = [{ required: true, message: '请输入密码', trigger: 'blur' }]
  formRef.value?.resetFields()
}

function handleEdit(row) {
  isEdit.value = true
  form.id = row.id
  form.username = row.username
  form.name = row.name
  form.password = ''
  form.role = row.role
  dialogVisible.value = true
  
  formRules.password = []
}

async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      if (isEdit.value) {
        const updateData = { name: form.name, role: form.role }
        if (form.password) {
          updateData.password = form.password
        }
        await updateUser(form.id, updateData)
        ElMessage.success('更新成功')
      } else {
        await createUser(form)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadMembers()
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除成员「${row.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    loadMembers()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除失败:', e)
    }
  }
}

async function handleViewProjects(row) {
  currentUser.value = row
  projectsDialogVisible.value = true
  projectsLoading.value = true
  try {
    const res = await getUserProjects(row.id)
    userProjects.value = res.data
  } catch (error) {
    console.error('加载用户项目失败:', error)
  } finally {
    projectsLoading.value = false
  }
}

onMounted(() => {
  loadMembers()
})
</script>

<style scoped>
.members-page {
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
