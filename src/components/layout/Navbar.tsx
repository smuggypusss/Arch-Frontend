import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: '#090d16', borderBottom: '1px solid #1f2937',
      height: 56, display: 'flex', alignItems: 'center',
    }}>
      <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#f5a623', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(245,166,35,0.3)',
          }}>
            <span style={{ color: '#090d16', fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 900 }}>E2M</span>
          </div>
          <div>
            <div style={{ color: '#ffffff', fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, lineHeight: 1 }}>
              Exterior Renovation
            </div>
            <div style={{ color: '#f5a623', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
              AI Planner & Estimator
            </div>
          </div>
        </Link>

        {/* Nav Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <Link to="/dashboard" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8 }}>
                My Projects
              </Link>
              <Link
                to="/project/new"
                style={{
                  display: 'inline-block', padding: '7px 16px',
                  background: '#f5a623', color: '#090d16',
                  fontWeight: 700, fontSize: 13, borderRadius: 10,
                  textDecoration: 'none', border: '2px solid #f5a623',
                  boxShadow: '0 2px 10px rgba(245,166,35,0.3)',
                }}
              >
                + New Project
              </Link>
              <button
                onClick={() => { logout(); navigate('/login') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, fontWeight: 500, padding: '6px 12px' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8 }}>
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  display: 'inline-block', padding: '7px 16px',
                  background: '#f5a623', color: '#090d16',
                  fontWeight: 700, fontSize: 13, borderRadius: 10,
                  textDecoration: 'none', border: '2px solid #f5a623',
                  boxShadow: '0 2px 10px rgba(245,166,35,0.3)',
                }}
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}