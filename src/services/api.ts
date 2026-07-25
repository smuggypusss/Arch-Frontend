import axios from 'axios'

// Use VITE_API_URL environment variable in production, fall back to /api proxy in dev
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // Bulletproof fallback to the live Cloud Run backend URL if running on a deployed cloud host
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://arch-backend-133093946118.europe-west1.run.app'
  }
  // In development, use the Vite proxy (baseURL = /api)
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const generateAIPreview = async (imagePath: string, regions: { type: string; selected_material: string }[]) => {
  const response = await api.post('/ai/generate-preview', { image_path: imagePath, regions })
  return response.data
}

export default api
