export const STATUS_LIST = ['待开始', '进行中', '待审批', '已退回', '已完成', '已归档'];

export function statusType(status) {
  switch (status) {
    case '待开始': return 'info';
    case '进行中': return 'primary';
    case '待审批': return 'warning';
    case '已退回': return 'danger';
    case '已完成': return 'success';
    case '已归档': return '';
    default: return 'info';
  }
}

export const ACTION_OPTIONS = [
  { value: '启动节点', from: '待开始', to: '进行中' },
  { value: '提交审批', from: '进行中', to: '待审批' },
  { value: '审批通过', from: '待审批', to: '已完成' },
  { value: '审批退回', from: '待审批', to: '已退回' },
  { value: '继续处理', from: '已退回', to: '进行中' },
  { value: '归档', from: '已完成', to: '已归档' }
];
