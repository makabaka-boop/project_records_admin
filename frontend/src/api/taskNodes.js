import request from '@/utils/request'

export function getTaskNodeList(params) {
  return request({
    url: '/task-nodes',
    method: 'get',
    params
  })
}

export function getTaskNodesByProject(projectId, params) {
  return request({
    url: `/task-nodes/project/${projectId}`,
    method: 'get',
    params
  })
}

export function getTaskNodeDetail(id) {
  return request({
    url: `/task-nodes/${id}`,
    method: 'get'
  })
}

export function createTaskNode(data) {
  return request({
    url: '/task-nodes',
    method: 'post',
    data
  })
}

export function updateTaskNode(id, data) {
  return request({
    url: `/task-nodes/${id}`,
    method: 'put',
    data
  })
}

export function deleteTaskNode(id) {
  return request({
    url: `/task-nodes/${id}`,
    method: 'delete'
  })
}

export function updateTaskNodeStatus(id, data) {
  return request({
    url: `/task-nodes/${id}/status`,
    method: 'post',
    data
  })
}
