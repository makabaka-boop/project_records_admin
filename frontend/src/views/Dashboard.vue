<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon project-icon">
              <el-icon size="40"><FolderOpened /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalProjects || 0 }}</div>
              <div class="stat-label">项目总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon node-icon">
              <el-icon size="40"><List /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalNodes || 0 }}</div>
              <div class="stat-label">节点总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon approval-icon">
              <el-icon size="40"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pendingApprovals || 0 }}</div>
              <div class="stat-label">待审批</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon member-icon">
              <el-icon size="40"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalMembers || 0 }}</div>
              <div class="stat-label">成员数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>项目状态分布</span>
          </template>
          <div class="status-list">
            <div v-for="item in projectStatusList" :key="item.status" class="status-item">
              <div class="status-label">
                <el-tag :type="PROJECT_STATUS_MAP[item.status]?.type" size="small">
                  {{ PROJECT_STATUS_MAP[item.status]?.label }}
                </el-tag>
              </div>
              <el-progress :percentage="getPercent(item.count, stats.totalProjects)" :status="getProgressColor(item.status)" />
              <span class="status-count">{{ item.count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>任务节点状态</span>
          </template>
          <div class="status-list">
            <div v-for="item in nodeStatusList" :key="item.status" class="status-item">
              <div class="status-label">
                <el-tag :type="NODE_STATUS_MAP[item.status]?.type" size="small">
                  {{ NODE_STATUS_MAP[item.status]?.label }}
                </el-tag>
              </div>
              <el-progress :percentage="getPercent(item.count, stats.totalNodes)" :status="getProgressColor(item.status)" />
              <span class="status-count">{{ item.count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row style="margin-top: 20px">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="$router.push('/projects')">
              <el-icon><Plus /></el-icon>
              新建项目
            </el-button>
            <el-button type="success" @click="$router.push('/members')">
              <el-icon><UserFilled /></el-icon>
              添加成员
            </el-button>
            <el-button type="warning" @click="$router.push('/approvals')">
              <el-icon><DocumentChecked /></el-icon>
              审批处理
            </el-button>
            <el-button type="info" @click="$router.push('/nodes')">
              <el-icon><Management /></el-icon>
              节点管理
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { projectApi } from '@/api'
import { PROJECT_STATUS_MAP, NODE_STATUS_MAP } from '@/utils/constants'

const stats = ref({})

const projectStatusList = computed(() => {
  const all = Object.keys(PROJECT_STATUS_MAP).map(status => {
    const found = (stats.value.projectStatus || []).find(s => s.status === status)
    return { status, count: found ? found.count : 0 }
  })
  return all
})

const nodeStatusList = computed(() => {
  const all = Object.keys(NODE_STATUS_MAP).map(status => {
    const found = (stats.value.nodeStatus || []).find(s => s.status === status)
    return { status, count: found ? found.count : 0 }
  })
  return all
})

const getPercent = (count, total) => {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

const getProgressColor = (status) => {
  const map = {
    pending: '',
    in_progress: '',
    pending_approval: 'warning',
    rejected: 'exception',
    completed: 'success',
    archived: ''
  }
  return map[status] || ''
}

const loadStats = async () => {
  stats.value = await projectApi.getStats()
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.stat-card {
  cursor: pointer;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 70px;
  height: 70px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.project-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.node-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.approval-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.member-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info .stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.stat-info .stat-label {
  color: #999;
  font-size: 14px;
  margin-top: 4px;
}

.status-list {
  padding: 0;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.status-label {
  width: 80px;
}

.status-item :deep(.el-progress) {
  flex: 1;
}

.status-count {
  width: 40px;
  text-align: right;
  font-weight: bold;
  color: #666;
}

.quick-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}
</style>
