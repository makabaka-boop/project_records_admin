<template>
  <div class="dashboard-page" v-loading="loading">
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <p class="stat-label">项目总数</p>
              <p class="stat-value">{{ stats?.projectStats?.total || 0 }}</p>
            </div>
            <div class="stat-icon primary">
              <el-icon :size="32"><Folder /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <p class="stat-label">任务节点</p>
              <p class="stat-value">{{ stats?.nodeStats?.total || 0 }}</p>
            </div>
            <div class="stat-icon success">
              <el-icon :size="32"><List /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <p class="stat-label">系统用户</p>
              <p class="stat-value">{{ stats?.userCount || 0 }}</p>
            </div>
            <div class="stat-icon warning">
              <el-icon :size="32"><User /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <p class="stat-label">审批记录</p>
              <p class="stat-value">{{ stats?.approvalCount || 0 }}</p>
            </div>
            <div class="stat-icon danger">
              <el-icon :size="32"><DocumentChecked /></el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>项目状态分布</span>
          </template>
          <div ref="projectChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>节点状态分布</span>
          </template>
          <div ref="nodeChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="list-row">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近项目</span>
          </template>
          <el-table :data="stats?.recentProjects || []" size="small">
            <el-table-column prop="name" label="项目名称" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="STATUS_MAP[row.status]?.type" size="small">
                  {{ STATUS_MAP[row.status]?.label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="creator_name" label="创建人" width="100" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>最近审批</span>
          </template>
          <el-table :data="stats?.recentApprovals || []" size="small">
            <el-table-column prop="project_name" label="项目" />
            <el-table-column prop="operator_name" label="操作人" width="100" />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.new_status" :type="STATUS_MAP[row.new_status]?.type" size="small">
                  {{ STATUS_MAP[row.new_status]?.label }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getOverviewStats } from '@/api/stats'
import { STATUS_MAP } from '@/constants'

const loading = ref(false)
const stats = ref(null)
const projectChartRef = ref(null)
const nodeChartRef = ref(null)
let projectChart = null
let nodeChart = null

async function loadStats() {
  loading.value = true
  try {
    const res = await getOverviewStats()
    stats.value = res.data
    nextTick(() => {
      initProjectChart()
      initNodeChart()
    })
  } catch (error) {
    console.error('加载统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

function initProjectChart() {
  if (!projectChartRef.value) return
  
  if (projectChart) {
    projectChart.dispose()
  }
  
  projectChart = echarts.init(projectChartRef.value)
  
  const data = [
    { value: stats.value.projectStats.pending || 0, name: STATUS_MAP.pending.label, itemStyle: { color: STATUS_MAP.pending.color } },
    { value: stats.value.projectStats.in_progress || 0, name: STATUS_MAP.in_progress.label, itemStyle: { color: STATUS_MAP.in_progress.color } },
    { value: stats.value.projectStats.pending_approval || 0, name: STATUS_MAP.pending_approval.label, itemStyle: { color: STATUS_MAP.pending_approval.color } },
    { value: stats.value.projectStats.rejected || 0, name: STATUS_MAP.rejected.label, itemStyle: { color: STATUS_MAP.rejected.color } },
    { value: stats.value.projectStats.completed || 0, name: STATUS_MAP.completed.label, itemStyle: { color: STATUS_MAP.completed.color } },
    { value: stats.value.projectStats.archived || 0, name: STATUS_MAP.archived.label, itemStyle: { color: STATUS_MAP.archived.color } }
  ].filter(item => item.value > 0)
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      bottom: '0',
      left: 'center'
    },
    series: [
      {
        name: '项目状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data.length > 0 ? data : [{ value: 1, name: '暂无数据', itemStyle: { color: '#f0f0f0' } }]
      }
    ]
  }
  
  projectChart.setOption(option)
}

function initNodeChart() {
  if (!nodeChartRef.value) return
  
  if (nodeChart) {
    nodeChart.dispose()
  }
  
  nodeChart = echarts.init(nodeChartRef.value)
  
  const data = [
    { value: stats.value.nodeStats.pending || 0, name: STATUS_MAP.pending.label, itemStyle: { color: STATUS_MAP.pending.color } },
    { value: stats.value.nodeStats.in_progress || 0, name: STATUS_MAP.in_progress.label, itemStyle: { color: STATUS_MAP.in_progress.color } },
    { value: stats.value.nodeStats.pending_approval || 0, name: STATUS_MAP.pending_approval.label, itemStyle: { color: STATUS_MAP.pending_approval.color } },
    { value: stats.value.nodeStats.rejected || 0, name: STATUS_MAP.rejected.label, itemStyle: { color: STATUS_MAP.rejected.color } },
    { value: stats.value.nodeStats.completed || 0, name: STATUS_MAP.completed.label, itemStyle: { color: STATUS_MAP.completed.color } },
    { value: stats.value.nodeStats.archived || 0, name: STATUS_MAP.archived.label, itemStyle: { color: STATUS_MAP.archived.color } }
  ].filter(item => item.value > 0)
  
  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      bottom: '0',
      left: 'center'
    },
    series: [
      {
        name: '节点状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data.length > 0 ? data : [{ value: 1, name: '暂无数据', itemStyle: { color: '#f0f0f0' } }]
      }
    ]
  }
  
  nodeChart.setOption(option)
}

function handleResize() {
  projectChart?.resize()
  nodeChart?.resize()
}

onMounted(() => {
  loadStats()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  projectChart?.dispose()
  nodeChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-row {
  margin-bottom: 0;
}

.stat-card {
  border-radius: 8px;
}

.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin: 0 0 8px 0;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin: 0;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.success {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon.warning {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-icon.danger {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.charts-row {
  margin-bottom: 0;
}

.chart-container {
  height: 300px;
}

.list-row {
  margin-bottom: 0;
}
</style>
