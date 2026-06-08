export const STATUS_MAP = {
  pending: { label: '待开始', type: 'info' },
  in_progress: { label: '进行中', type: 'primary' },
  pending_approval: { label: '待审批', type: 'warning' },
  rejected: { label: '已退回', type: 'danger' },
  completed: { label: '已完成', type: 'success' },
  archived: { label: '已归档', type: '' }
}

export const ROLE_MAP = {
  admin: { label: '管理员', type: 'danger' },
  manager: { label: '项目经理', type: 'primary' },
  approver: { label: '审批人', type: 'warning' },
  member: { label: '成员', type: 'info' }
}

export const USER_ROLES = [
  { value: 'admin', label: '管理员' },
  { value: 'approver', label: '审批人' },
  { value: 'member', label: '普通成员' }
]

export const MEMBER_ROLES = [
  { value: 'manager', label: '项目经理' },
  { value: 'member', label: '项目成员' },
  { value: 'approver', label: '审批人' }
]

export const NODE_STATUSES = [
  { value: 'pending', label: '待开始' },
  { value: 'in_progress', label: '进行中' },
  { value: 'pending_approval', label: '提交审批' },
  { value: 'rejected', label: '' },
  { value: 'completed', label: '' }
]
