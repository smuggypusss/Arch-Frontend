import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  background: '#0f172a', border: '1px solid #2d3748',
  color: '#ffffff', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('homeowner')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password, role)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
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
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 26, fontWeight: 700, color: '#ffffff', margin: 0, marginBottom: 6 }}>Create your account</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Start planning your exterior building renovation</p>
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
                Full Name
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required style={inputStyle} placeholder="John Doe" />
            </div>

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
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={inputStyle} placeholder="Min 6 characters" />
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                I am a
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {['homeowner', 'contractor', 'architect'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    style={{
                      padding: '8px 4px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      textTransform: 'capitalize', cursor: 'pointer',
                      background: role === r ? '#f5a623' : '#0f172a',
                      color: role === r ? '#090d16' : '#94a3b8',
                      border: role === r ? '2px solid #f5a623' : '1px solid #2d3748',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
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
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>

            <div style={{ borderTop: '1px solid #1f2937', paddingTop: 16, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#f5a623', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}