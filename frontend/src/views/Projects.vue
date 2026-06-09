<template>
  <div class="projects-page">
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="项目名称">
          <el-input v-model="filterForm.keyword" placeholder="请输入关键词" clearable @keyup.enter="loadProjects" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部" clearable style="width: 150px">
            <el-option v-for="(item, key) in STATUS_MAP" :key="key" :label="item.label" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadProjects">
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
          <span>项目列表</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新建项目
          </el-button>
        </div>
      </template>

      <el-table :data="projects" v-loading="loading" stripe>
        <el-table-column prop="name" label="项目名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="goToDetail(row.id)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_MAP[row.status]?.type">
              {{ STATUS_MAP[row.status]?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="creator_name" label="创建人" width="100" />
        <el-table-column label="成员数" width="80">
          <template #default="{ row }">{{ row.member_count || 0 }}</template>
        </el-table-column>
        <el-table-column label="节点进度" width="150">
          <template #default="{ row }">
            <span v-if="row.node_count > 0">
              {{ row.completed_node_count || 0 }}/{{ row.node_count }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="goToDetail(row.id)">详情</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑项目' : '新建项目'" width="500px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="80px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="请输入项目描述" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="(item, key) in STATUS_MAP" :key="key" :label="item.label" :value="key" />
          </el-select>
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
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjectList, createProject, updateProject, deleteProject } from '@/api/projects'
import { STATUS_MAP } from '@/constants'
import dayjs from 'dayjs'

const router = useRouter()

const loading = ref(false)
const projects = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref(null)

const filterForm = reactive({
  keyword: '',
  status: ''
})

const form = reactive({
  id: null,
  name: '',
  description: '',
  status: 'pending'
})

const formRules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

async function loadProjects() {
  loading.value = true
  try {
    const res = await getProjectList(filterForm)
    projects.value = res.data
  } catch (error) {
    console.error('加载项目列表失败:', error)
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filterForm.keyword = ''
  filterForm.status = ''
  loadProjects()
}

function handleAdd() {
  isEdit.value = false
  form.id = null
  form.name = ''
  form.description = ''
  form.status = 'pending'
  dialogVisible.value = true
  formRef.value?.resetFields()
}

function handleEdit(row) {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.description = row.description
  form.status = row.status
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      if (isEdit.value) {
        await updateProject(form.id, form)
        ElMessage.success('更新成功')
      } else {
        await createProject(form)
        ElMessage.success('创建成功')
      }
      dialogVisible.value = false
      loadProjects()
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      submitting.value = false
    }
  })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除项目「${row.name}」吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteProject(row.id)
    ElMessage.success('删除成功')
    loadProjects()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除失败:', e)
    }
  }
}

function goToDetail(id) {
  router.push(`/projects/${id}`)
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.projects-page {
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
