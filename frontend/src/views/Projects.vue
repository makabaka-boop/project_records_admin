<template>
  <div class="projects-page">
    <el-card>
      <div class="page-header">
        <div class="search-bar">
          <el-input
            v-model="keyword"
            placeholder="搜索项目名称"
            clearable
            style="width: 250px"
            @keyup.enter="loadProjects"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-select v-model="statusFilter" placeholder="项目状态" clearable style="width: 150px; margin-left: 10px">
            <el-option
              v-for="(item, key) in PROJECT_STATUS_MAP"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
          <el-button type="primary" style="margin-left: 10px" @click="loadProjects">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
        </div>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          新建项目
        </el-button>
      </div>

      <el-table :data="projectList" v-loading="loading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="项目名称" min-width="200" />
        <el-table-column prop="description" label="项目描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="PROJECT_STATUS_MAP[row.status]?.type">
              {{ PROJECT_STATUS_MAP[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="member_count" label="成员数" width="100" align="center" />
        <el-table-column prop="node_count" label="节点数" width="100" align="center" />
        <el-table-column label="待审批" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.pending_approvals > 0" type="warning">{{ row.pending_approvals }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创建人" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="$router.push(`/projects/${row.id}`)">查看</el-button>
            <el-button type="warning" link @click="openEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该项目吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑项目' : '新建项目'" width="600px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="项目状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option
              v-for="(item, key) in PROJECT_STATUS_MAP"
              :key="key"
              :label="item.label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="start_date">
          <el-date-picker v-model="form.start_date" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="结束日期" prop="end_date">
          <el-date-picker v-model="form.end_date" type="date" placeholder="选择日期" style="width: 100%" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { projectApi } from '@/api'
import { PROJECT_STATUS_MAP } from '@/utils/constants'

const keyword = ref('')
const statusFilter = ref('')
const projectList = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const submitting = ref(false)
const currentId = ref(null)

const form = reactive({
  name: '',
  description: '',
  status: 'pending',
  start_date: '',
  end_date: ''
})

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
}

const loadProjects = async () => {
  loading.value = true
  try {
    const data = await projectApi.getList({ keyword: keyword.value, status: statusFilter.value })
    projectList.value = data.projects
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  isEdit.value = false
  currentId.value = null
  Object.assign(form, {
    name: '',
    description: '',
    status: 'pending',
    start_date: '',
    end_date: ''
  })
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  currentId.value = row.id
  Object.assign(form, {
    name: row.name,
    description: row.description,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date
  })
  dialogVisible.value = true
}

const validateDateRange = () => {
  if (form.start_date && form.end_date && form.start_date > form.end_date) {
    ElMessage.warning('开始日期不能晚于结束日期')
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (!validateDateRange()) return
      
      submitting.value = true
      try {
        if (isEdit.value) {
          await projectApi.update(currentId.value, form)
          ElMessage.success('更新成功')
        } else {
          await projectApi.create(form)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadProjects()
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleDelete = async (id) => {
  await projectApi.delete(id)
  ElMessage.success('删除成功')
  loadProjects()
}

onMounted(() => {
  loadProjects()
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
