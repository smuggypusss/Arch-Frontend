import axios from 'axios'

// Use VITE_API_URL environment variable in production, fall back to /api proxy in dev
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    // If the configured URL is missing the '/api' prefix, append it automatically
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`
  }
  // Bulletproof fallback to the live Cloud Run backend URL if running on a deployed cloud host
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://arch-backend-133093946118.europe-west1.run.app/api'
  }
  // In development, use the Vite proxy (baseURL = /api)
  return '/api'
}

export const getAssetURL = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  // If we are in local development and not using a remote backend, use relative path
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    const envUrl = import.meta.env.VITE_API_URL
    if (!envUrl) {
      return path
    }
  }
  
  const envUrl = import.meta.env.VITE_API_URL
  const baseUrl = envUrl 
    ? (envUrl.endsWith('/api') ? envUrl.slice(0, -4) : envUrl)
    : 'https://arch-backend-133093946118.europe-west1.run.app'
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
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

export const generateAIPreview = async (imagePath: string, regions: { type: string; selected_material: string; polygon?: { x: number; y: number }[] }[]) => {
  const response = await api.post('/ai/generate-preview', { image_path: imagePath, regions })
  return response.data
}

export const refineRegions = async (imagePath: string, regions: { type: string; polygon: { x: number; y: number }[] }[]) => {
  const response = await api.post('/ai/refine-regions', { image_path: imagePath, regions })
  return response.data
}

export default api
