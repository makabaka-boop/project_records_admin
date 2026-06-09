import { defineStore } from 'pinia'
import { login, getProfile } from '@/api/auth'

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
    async login(loginData) {
      const res = await login(loginData)
      this.token = res.token
      this.user = res.user
      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))
      return res
    },
    
    async fetchProfile() {
      const res = await getProfile()
      this.user = res.user
      localStorage.setItem('user', JSON.stringify(res.user))
      return res
    },
    
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }
})
