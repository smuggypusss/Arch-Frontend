import { Outlet, Link } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer style={{ backgroundColor: '#090d16', borderTop: '1px solid #1f2937', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12 }}>
            <span style={{ color: '#f5a623', fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 14 }}>E2M</span>
            <span>— Exterior Building Renovation Planner & Cost Estimator</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, color: '#64748b' }}>
            <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}>Home</Link>
            <Link to="/dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>Dashboard</Link>
            <span>© {new Date().getFullYear()} E2M</span>
          </div>
        </div>
      </footer>
    </div>
  )
}