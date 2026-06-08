<template>
  <div>
    <el-page-header @back="$router.push('/projects')" :content="data.name || '项目详情'" />

    <div class="page-card" style="margin-top:14px;">
      <el-descriptions :column="3" border>
        <el-descriptions-item label="项目编号">{{ data.code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="负责人">{{ data.owner_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(data.status)" size="small">{{ data.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="开始日期">{{ data.start_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="结束日期">{{ data.end_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ data.created_at }}</el-descriptions-item>
        <el-descriptions-item label="项目描述" :span="3">{{ data.description || '-' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <el-row :gutter="14" style="margin-top:14px;">
      <el-col :span="12">
        <div class="page-card">
          <div class="page-toolbar">
            <h3 class="section-title">项目成员（{{ data.members?.length || 0 }}）</h3>
            <el-button size="small" type="primary" @click="addMember.show = true">添加成员</el-button>
          </div>
          <el-table :data="data.members" size="small">
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="role" label="角色" width="120" />
            <el-table-column prop="duty" label="项目分工" />
            <el-table-column label="操作" width="80">
              <template #default="{ row }">
                <el-popconfirm title="移除该成员？" @confirm="removeMember(row.id)">
                  <template #reference>
                    <el-button size="small" type="danger" link>移除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="page-card">
          <h3 class="section-title">最近审批记录</h3>
          <el-table :data="data.approvals" size="small">
            <el-table-column prop="created_at" label="时间" width="160" />
            <el-table-column prop="node_name" label="节点" />
            <el-table-column label="变更" width="160">
              <template #default="{ row }">
                <el-tag size="small">{{ row.from_status || '-' }}</el-tag>
                →
                <el-tag size="small" :type="statusType(row.to_status)">{{ row.to_status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operator" label="操作人" width="100" />
          </el-table>
        </div>
      </el-col>
    </el-row>

    <div class="page-card" style="margin-top:14px;">
      <div class="page-toolbar">
        <h3 class="section-title">任务节点（{{ data.nodes?.length || 0 }}）</h3>
        <el-button size="small" type="primary" @click="openNodeForm()">新增节点</el-button>
      </div>
      <el-table :data="data.nodes" size="small">
        <el-table-column prop="sort_order" label="序号" width="70" />
        <el-table-column prop="name" label="节点名称" min-width="160" />
        <el-table-column prop="assignee_name" label="负责人" width="120" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="160">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" />
          </template>
        </el-table-column>
        <el-table-column prop="due_date" label="截止" width="120" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openTransition(row)">状态流转</el-button>
            <el-button size="small" @click="openNodeForm(row)">编辑</el-button>
            <el-popconfirm title="删除该节点？" @confirm="removeNode(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 添加成员 -->
    <el-dialog v-model="addMember.show" title="添加成员" width="420px">
      <el-form label-width="90px">
        <el-form-item label="选择成员">
          <el-select v-model="addMember.member_id" style="width:100%" placeholder="请选择">
            <el-option
              v-for="m in availableMembers"
              :key="m.id"
              :label="`${m.name}（${m.role}）`"
              :value="m.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="项目分工">
          <el-input v-model="addMember.duty" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addMember.show = false">取消</el-button>
        <el-button type="primary" @click="submitAddMember">确定</el-button>
      </template>
    </el-dialog>

    <!-- 节点表单 -->
    <el-dialog v-model="nodeDialog.show" :title="nodeDialog.id ? '编辑节点' : '新增节点'" width="520px">
      <el-form :model="nodeDialog.form" label-width="90px">
        <el-form-item label="节点名称"><el-input v-model="nodeDialog.form.name" /></el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="nodeDialog.form.assignee_id" style="width:100%" clearable>
            <el-option v-for="m in data.members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期"><el-date-picker v-model="nodeDialog.form.start_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="截止日期"><el-date-picker v-model="nodeDialog.form.due_date" value-format="YYYY-MM-DD" style="width:100%" /></el-form-item>
        <el-form-item label="进度">
          <el-slider v-model="nodeDialog.form.progress" />
        </el-form-item>
        <el-form-item label="序号">
          <el-input-number v-model="nodeDialog.form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="节点描述"><el-input v-model="nodeDialog.form.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nodeDialog.show = false">取消</el-button>
        <el-button type="primary" @click="saveNode">保存</el-button>
      </template>
    </el-dialog>

    <!-- 状态流转 -->
    <el-dialog v-model="trans.show" title="节点状态流转" width="480px">
      <el-form label-width="90px">
        <el-form-item label="当前状态">
          <el-tag :type="statusType(trans.fromStatus)">{{ trans.fromStatus }}</el-tag>
        </el-form-item>
        <el-form-item label="目标状态">
          <el-select v-model="trans.form.to_status" style="width:100%">
            <el-option v-for="s in STATUS_LIST" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-input v-model="trans.form.action" placeholder="如：审批通过" />
        </el-form-item>
        <el-form-item label="审批意见">
          <el-input v-model="trans.form.comment" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="trans.show = false">取消</el-button>
        <el-button type="primary" @click="submitTransition">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api';
import { statusType, STATUS_LIST } from '../utils/status';

const route = useRoute();
const projectId = Number(route.params.id);
const data = ref({ members: [], nodes: [], approvals: [] });
const allMembers = ref([]);

const addMember = reactive({ show: false, member_id: null, duty: '' });
const nodeDialog = reactive({ show: false, id: null, form: {} });
const trans = reactive({ show: false, id: null, fromStatus: '', form: { to_status: '', action: '', comment: '' } });

const availableMembers = computed(() => {
  const ids = (data.value.members || []).map(m => m.id);
  return allMembers.value.filter(m => !ids.includes(m.id));
});

async function load() {
  data.value = await api.get(`/projects/${projectId}`);
}
async function loadMembers() {
  allMembers.value = await api.get('/members');
}

async function submitAddMember() {
  if (!addMember.member_id) return ElMessage.warning('请选择成员');
  await api.post(`/projects/${projectId}/members`, {
    member_id: addMember.member_id,
    duty: addMember.duty
  });
  ElMessage.success('已添加');
  addMember.show = false;
  addMember.member_id = null;
  addMember.duty = '';
  load();
}

async function removeMember(memberId) {
  await api.delete(`/projects/${projectId}/members/${memberId}`);
  ElMessage.success('已移除');
  load();
}

function openNodeForm(row) {
  nodeDialog.id = row?.id || null;
  nodeDialog.form = row
    ? { ...row }
    : { name: '', description: '', assignee_id: null, start_date: '', due_date: '', progress: 0, sort_order: (data.value.nodes?.length || 0) + 1 };
  nodeDialog.show = true;
}

async function saveNode() {
  if (!nodeDialog.form.name) return ElMessage.warning('请填写节点名称');
  if (nodeDialog.id) {
    await api.put(`/nodes/${nodeDialog.id}`, nodeDialog.form);
  } else {
    await api.post('/nodes', { ...nodeDialog.form, project_id: projectId });
  }
  ElMessage.success('已保存');
  nodeDialog.show = false;
  load();
}

async function removeNode(id) {
  await api.delete(`/nodes/${id}`);
  ElMessage.success('已删除');
  load();
}

function openTransition(row) {
  trans.id = row.id;
  trans.fromStatus = row.status;
  trans.form = { to_status: '', action: '', comment: '' };
  trans.show = true;
}

async function submitTransition() {
  if (!trans.form.to_status) return ElMessage.warning('请选择目标状态');
  await api.post(`/nodes/${trans.id}/transition`, trans.form);
  ElMessage.success('状态已更新');
  trans.show = false;
  load();
}

onMounted(() => {
  load();
  loadMembers();
});
</script>
