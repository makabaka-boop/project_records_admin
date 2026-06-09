import request from '@/utils/request'

export function getApprovalList(params) {
  return request({
    url: '/approvals',
    method: 'get',
    params
  })
}

export function getApprovalDetail(id) {
  return request({
    url: `/approvals/${id}`,
    method: 'get'
  })
}

export function approveApproval(id, data) {
  return request({
    url: `/approvals/${id}/approve`,
    method: 'post',
    data
  })
}

export function rejectApproval(id, data) {
  return request({
    url: `/approvals/${id}/reject`,
    method: 'post',
    data
  })
}
