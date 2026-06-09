import request from '@/utils/request'

export function getOverviewStats() {
  return request({
    url: '/stats/overview',
    method: 'get'
  })
}
