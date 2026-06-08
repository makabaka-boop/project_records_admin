import request from '@/utils/request'

export const authApi = {
  login: (data) => request.post('/auth/login', data),
  getCurrentUser: () => request.get('/auth/me')
}

export const projectApi = {
  getList: (params) => request.get('/projects', { params }),
  getDetail: (id) => request.get(`/projects/${id}`),
  create: (data) => request.post('/projects', data),
  update: (id, data) => request.put(`/projects/${id}`, data),
  delete: (id) => request.delete(`/projects/${id}`),
  addMember: (id, data) => request.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => request.delete(`/projects/${id}/members/${userId}`),
  getStats: () => request.get('/projects/stats')
}

export const userApi = {
  getList: (params) => request.get('/users', { params }),
  getDetail: (id) => request.get(`/users/${id}`),
  create: (data) => request.post('/users', data),
  update: (id, data) => request.put(`/users/${id}`, data),
  delete: (id) => request.delete(`/users/${id}`)
}

export const nodeApi = {
  getList: (params) => request.get('/nodes', { params }),
  getDetail: (id) => request.get(`/nodes/${id}`),
  create: (data) => request.post('/nodes', data),
  update: (id, data) => request.put(`/nodes/${id}`, data),
  updateStatus: (id, data) => request.put(`/nodes/${id}/status`, data),
  delete: (id) => request.delete(`/nodes/${id}`),
  getLogs: (id) => request.get(`/nodes/${id}/logs`)
}

export const approvalApi = {
  getList: (params) => request.get('/approvals', { params }),
  getDetail: (id) => request.get(`/approvals/${id}`),
  create: (data) => request.post('/approvals', data),
  approve: (id, data) => request.post(`/approvals/${id}/approve`, data),
  reject: (id, data) => request.post(`/approvals/${id}/reject`, data)
}
