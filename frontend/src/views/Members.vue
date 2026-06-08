<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>成员列表</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon> 添加成员
          </el-button>
        </div>
      </template>
      <el-table :data="members" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="ROLE_MAP[row.role]?.type" size="small">{{ ROLE_MAP[row.role]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="showProjects(row)">参与项目</el-button>
            <el-button link type="primary" @click="showEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除此成员？" @confirm="handleDelete(row.id)">
              <template #reference><el-button link type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑成员' : '添加成员'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option v-for="r in USER_ROLES" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="初始密码">
          <el-input v-model="form.password" placeholder="默认：123456" show-password />
        </el-form-item>
        <el-form-item v-if="isEdit" label="重置密码">
          <el-input v-model="form.password" placeholder="留空则不修改" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="projectsVisible" :title="`${currentUser?.name} 参与的项目`" width="600px">
      <el-table :data="userProjects" size="small">
        <el-table-column prop="name" label="项目名称" />
        <el-table-column label="项目角色" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ ROLE_MAP[row.member_role]?.label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="node_count" label="节点数" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_MAP[row.status]?.type" size="small">{{ STATUS_MAP[row.status]?.label }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '@/api'
import { STATUS_MAP, ROLE_MAP, USER_ROLES } from '@/utils/status'

const members = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const projectsVisible = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const formRef = ref(null)
const currentUser = ref(null)
const userProjects = ref([])

const form = reactive({ username: '', name: '', role: 'member', email: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const fetchMembers = async () => {
  loading.value = true
  try {
    const res = await userApi.list()
    members.value = res.data
  } finally {
    loading.value = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  editId.value = null
  Object.assign(form, { username: '', name: '', role: 'member', email: '', password: '' })
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  isEdit.value = true
  editId.value = row.id
  Object.assign(form, { username: row.username, name: row.name, role: row.role, email: row.email, password: '' })
  dialogVisible.value = true
}

const showProjects = async (row) => {
  currentUser.value = row
  const res = await userApi.getProjects(row.id)
  userProjects.value = res.data
  projectsVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value.validate()
  if (isEdit.value) {
    const data = { name: form.name, role: form.role, email: form.email }
    if (form.password) data.password = form.password
    await userApi.update(editId.value, data)
    ElMessage.success('更新成功')
  } else {
    await userApi.create(form)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  fetchMembers()
}

const handleDelete = async (id) => {
  await userApi.delete(id)
  ElMessage.success('删除成功')
  fetchMembers()
}

const formatTime = (time) => new Date(time).toLocaleString('zh-CN')

onMounted(fetchMembers)
</script>
