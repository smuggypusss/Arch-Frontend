import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: '#0f172a', border: '1px solid #2d3748',
  color: '#ffffff', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#090d16', minHeight: 'calc(100vh - 3.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f5a623', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#090d16', fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 900 }}>E2M</span>
            </div>
            <span style={{ color: '#ffffff', fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700 }}>Exterior Planner</span>
          </Link>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 700, color: '#ffffff', margin: 0, marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Sign in to continue your renovation projects</p>
        </div>

        {/* Card */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 20, padding: '32px 28px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, padding: '10px 14px', borderRadius: 10 }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Email Address
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Password
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, marginTop: 4,
                background: loading ? '#7a5210' : '#f5a623', color: '#090d16',
                fontWeight: 700, fontSize: 14, border: '2px solid #f5a623',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(245,166,35,0.3)',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard →'}
            </button>

            <div style={{ borderTop: '1px solid #1f2937', paddingTop: 16, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#f5a623', fontWeight: 700, textDecoration: 'none' }}>Create one free</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}