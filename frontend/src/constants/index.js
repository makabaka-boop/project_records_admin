export const STATUS_MAP = {
  pending: {
    label: '待开始',
    type: 'info',
    color: '#909399'
  },
  in_progress: {
    label: '进行中',
    type: 'primary',
    color: '#409EFF'
  },
  pending_approval: {
    label: '待审批',
    type: 'warning',
    color: '#E6A23C'
  },
  rejected: {
    label: '已退回',
    type: 'danger',
    color: '#F56C6C'
  },
  completed: {
    label: '已完成',
    type: 'success',
    color: '#67C23A'
  },
  archived: {
    label: '已归档',
    type: '',
    color: '#606266'
  }
}

export const ROLE_MAP = {
  admin: {
    label: '管理员',
    type: 'danger'
  },
  user: {
    label: '普通用户',
    type: 'primary'
  }
}

export const MEMBER_ROLE_MAP = {
  leader: {
    label: '负责人',
    type: 'danger'
  },
  member: {
    label: '成员',
    type: 'primary'
  }
}
