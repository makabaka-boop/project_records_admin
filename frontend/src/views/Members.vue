<template>
  <div class="members-page">
    <el-card>
      <div class="page-header">
        <div class="search-bar">
          <el-input
            v-model="keyword"
            placeholder="搜索成员"
            clearable
            style="width: 250px"
            @keyup.enter="loadUsers"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="roleFilter" placeholder="角色筛选" clearable style="width: 150px; margin-left: 10px">
            <el-option
              v-for="(item, key) in USER_ROLE_MAP"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
          <el-button type="primary" style="margin-left: 10px" @click="loadUsers">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </div>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          添加成员
        </el-button>
      </div>

      <el-table :data="userList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="USER_ROLE_MAP[row.role]?.type">
              {{ USER_ROLE_MAP[row.role]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="project_count" label="参与项目数" width="120" align="center" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewProjects(row)">查看项目</el-button>
            <el-button type="warning" link @click="openEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该成员吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑成员' : '添加成员'" width="550px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" :prop="isEdit ? '' : 'password'">
          <el-input v-model="form.password" type="password" :placeholder="isEdit ? '不修改请留空' : '请输入密码'" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="(item, key) in USER_ROLE_MAP"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="projectDialogVisible" title="参与项目" width="700px">
      <el-table :data="userProjects" border>
        <el-table-column prop="name" label="项目名称" />
        <el-table-column label="项目状态" width="120">
          <template #default="{ row }">
            <el-tag :type="PROJECT_STATUS_MAP[row.status]?.type" size="small">
              {{ PROJECT_STATUS_MAP[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="项目角色" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.project_role === 'owner' ? '负责人' : '成员' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="joined_at" label="加入时间" width="180" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api'
import { USER_ROLE_MAP, PROJECT_STATUS_MAP } from '@/utils/constants'

const keyword = ref('')
const roleFilter = ref('')
const userList = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const projectDialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const submitting = ref(false)
const currentId = ref(null)
const userProjects = ref([])

const form = reactive({
  username: '',
  name: '',
  password: '',
  role: 'member',
  email: ''
})

const formRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const loadUsers = async () => {
  loading.value = true
  try {
    const data = await userApi.getList({ keyword: keyword.value, role: roleFilter.value })
    userList.value = data.users
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  currentId.value = null
  Object.assign(form, {
    username: '',
    name: '',
    password: '',
    role: 'member',
    email: ''
  })
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, {
    username: row.username,
    name: row.name,
    password: '',
    role: row.role,
    email: row.email
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const submitData = { ...form }
        if (isEdit.value && !submitData.password) {
          delete submitData.password
        }
        if (isEdit.value) {
          await userApi.update(currentId.value, submitData)
          ElMessage.success('更新成功')
        } else {
          await userApi.create(submitData)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadUsers()
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleDelete = async (id) => {
  await userApi.delete(id)
  ElMessage.success('删除成功')
  loadUsers()
}

const viewProjects = async (user) => {
  const data = await userApi.getDetail(user.id)
  userProjects.value = data.projects
  projectDialogVisible.value = true
}

onMounted(() => {
  loadUsers()
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
