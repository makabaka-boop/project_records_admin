import { defineStore } from 'pinia'
import { authApi } from '@/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token,
    userName: (state) => state.user?.name || '',
    userRole: (state) => state.user?.role || ''
  },
  
  actions: {
    async login(username, password) {
      const data = await authApi.login({ username, password })
      this.token = data.token
      this.user = data.user
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      return data
    },
    
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})
