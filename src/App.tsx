import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'

const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))

function SkeletonPage() {
  return (
    <div style={{ backgroundColor: '#090d16', minHeight: '100vh', padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ height: 40, width: 256, background: '#1f2937', borderRadius: 8 }} />
      <div style={{ height: 384, width: '100%', maxWidth: 768, background: '#1f2937', borderRadius: 12 }} />
      <div style={{ height: 192, width: '100%', maxWidth: 512, background: '#1f2937', borderRadius: 12 }} />
    </div>
  )
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()
  if (loading) return <SkeletonPage />
  if (!user) return <Navigate to="/login" />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/project/:id" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
          <Route path="/project/new" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  )
}