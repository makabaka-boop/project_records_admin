<template>
  <div class="page-container">
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-number" style="color: #409eff">{{ stats.projectCount || 0 }}</div>
            <div class="stat-label">
              <el-icon><Folder /></el-icon> 项目总数
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-number" style="color: #67c23a">{{ stats.userCount || 0 }}</div>
            <div class="stat-label">
              <el-icon><User /></el-icon> 成员总数
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-number" style="color: #e6a23c">{{ stats.nodeCount || 0 }}</div>
            <div class="stat-label">
              <el-icon><List /></el-icon> 节点总数
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-number" style="color: #f56c6c">{{ stats.approvalCount || 0 }}</div>
            <div class="stat-label">
              <el-icon><DocumentChecked /></el-icon> 审批记录
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>项目状态分布</template>
          <div ref="projectChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>节点状态分布</template>
          <div ref="nodeChartRef" style="height: 300px"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" style="margin-top: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>待审批节点</template>
          <el-table :data="stats.pendingApprovals || []" size="small">
            <el-table-column prop="project_name" label="项目名称" />
            <el-table-column prop="node_name" label="节点名称" />
            <el-table-column prop="updated_at" label="提交时间" width="170" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-button type="primary" link @click="goToApprovals">处理</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>最近活动</template>
          <div style="max-height: 300px; overflow-y: auto">
            <div v-for="item in stats.recentActivities || []" :key="item.id" class="activity-item">
              <div style="display: flex; justify-content: space-between; align-items: start">
                <div>
                  <strong>{{ item.operator_name }}</strong>
                  <span style="margin-left: 5px">{{ formatStatusChange(item) }}</span>
                </div>
                <span style="color: #909399; font-size: 12px">{{ formatTime(item.created_at) }}</span>
              </div>
              <div style="color: #606266; font-size: 13px; margin-top: 4px">
                {{ item.project_name }} - {{ item.node_name }}
              </div>
              <div v-if="item.remark" style="color: #909399; font-size: 12px; margin-top: 2px">
                备注：{{ item.remark }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { statsApi } from '@/api'
import { STATUS_MAP } from '@/utils/status'

const router = useRouter()
const stats = ref({})
const projectChartRef = ref(null)
const nodeChartRef = ref(null)

const fetchData = async () => {
  const res = await statsApi.overview()
  stats.value = res.data
  await nextTick()
  initCharts()
}

const initCharts = () => {
  if (projectChartRef.value) {
    const chart = echarts.init(projectChartRef.value)
    const data = stats.value.projectStatusStats || []
    chart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: data.map(item => ({
          name: STATUS_MAP[item.status]?.label || item.status,
          value: item.count
        }))
      }]
    })
  }
  if (nodeChartRef.value) {
    const chart = echarts.init(nodeChartRef.value)
    const data = stats.value.nodeStatusStats || []
    chart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map(item => STATUS_MAP[item.status]?.label || item.status)
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: data.map(item => item.count),
        itemStyle: { color: '#409eff' }
      }]
    })
  }
}

const formatStatusChange = (item) => {
  const fromLabel = item.from_status ? STATUS_MAP[item.from_status]?.label : ''
  const toLabel = STATUS_MAP[item.to_status]?.label
  if (fromLabel) {
    return `将状态从「${fromLabel}」改为「${toLabel}」`
  }
  return `创建了节点，状态为「${toLabel}」`
}

const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN')
}

const goToApprovals = () => {
  router.push('/approvals')
}

onMounted(() => {
  fetchData()
})
</script>
