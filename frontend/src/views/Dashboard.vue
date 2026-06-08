<template>
  <div>
    <el-row :gutter="14">
      <el-col :span="6" v-for="item in cards" :key="item.label">
        <div class="stat-card" :style="{ background: item.bg }">
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-value">{{ item.value }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="14" style="margin-top:14px;">
      <el-col :span="12">
        <div class="page-card">
          <h3 class="section-title">项目状态分布</h3>
          <el-table :data="data.projectStatus" size="small">
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="c" label="数量" width="120" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-card">
          <h3 class="section-title">节点状态分布</h3>
          <el-table :data="data.nodeStatus" size="small">
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="c" label="数量" width="120" />
          </el-table>
        </div>
      </el-col>
    </el-row>

    <div class="page-card" style="margin-top:14px;">
      <h3 class="section-title">最近审批/状态流转</h3>
      <el-table :data="data.recentApprovals" size="small">
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column prop="project_name" label="项目" />
        <el-table-column prop="node_name" label="节点" />
        <el-table-column label="状态变更" width="220">
          <template #default="{ row }">
            <el-tag size="small">{{ row.from_status || '-' }}</el-tag>
            <span style="margin:0 6px;">→</span>
            <el-tag size="small" :type="statusType(row.to_status)">{{ row.to_status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120" />
        <el-table-column prop="operator" label="操作人" width="120" />
        <el-table-column prop="comment" label="备注" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';
import { statusType } from '../utils/status';

const data = ref({ counts: {}, projectStatus: [], nodeStatus: [], recentApprovals: [] });

const cards = computed(() => [
  { label: '项目总数', value: data.value.counts.projectTotal || 0, bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
  { label: '成员总数', value: data.value.counts.memberTotal || 0, bg: 'linear-gradient(135deg,#10b981,#047857)' },
  { label: '节点总数', value: data.value.counts.nodeTotal || 0, bg: 'linear-gradient(135deg,#f59e0b,#b45309)' },
  { label: '审批记录', value: data.value.counts.approvalTotal || 0, bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }
]);

async function load() {
  data.value = await api.get('/stats/overview');
}
onMounted(load);
</script>

<style scoped>
.stat-card {
  color: #fff;
  border-radius: 8px;
  padding: 18px 20px;
  height: 90px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.stat-label { font-size: 13px; opacity: 0.85; }
.stat-value { font-size: 28px; font-weight: 700; margin-top: 6px; }
</style>
