export const NODE_STATUS_MAP = {
  pending: { label: '待开始', type: 'info' },
  in_progress: { label: '进行中', type: 'primary' },
  pending_approval: { label: '待审批', type: 'warning' },
  rejected: { label: '已退回', type: 'danger' },
  completed: { label: '已完成', type: 'success' },
  archived: { label: '已归档', type: 'info' }
}

export const PROJECT_STATUS_MAP = {
  pending: { label: '待开始', type: 'info' },
  in_progress: { label: '进行中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  archived: { label: '已归档', type: 'info' }
}

export const APPROVAL_STATUS_MAP = {
  pending: { label: '待审批', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已退回', type: 'danger' }
}

export const USER_ROLE_MAP = {
  admin: { label: '管理员', type: 'danger' },
  manager: { label: '项目经理', type: 'warning' },
  member: { label: '成员', type: 'info' }
}
