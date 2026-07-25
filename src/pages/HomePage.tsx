import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f8fafc', minHeight: 'calc(100vh - 3.5rem)', position: 'relative', overflow: 'hidden' }}>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px 56px', textAlign: 'center' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 999,
          background: '#111827', border: '1px solid #f5a623',
          color: '#f5a623', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5a623', display: 'inline-block' }} />
          Next-Gen Exterior Renovation Planner
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.15, color: '#ffffff', marginBottom: 16 }}>
          See your home{' '}
          <span style={{ color: '#f5a623' }}>before you build it</span>
        </h1>

        {/* Subtext */}
        <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, maxWidth: 520, margin: '0 auto 36px' }}>
          Upload a photo, choose materials, and get a realistic preview of your exterior renovation — with a detailed cost estimate before a single brick is laid.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to={user ? '/project/new' : '/register'}
            style={{
              display: 'inline-block', padding: '11px 28px',
              background: '#f5a623', color: '#090d16',
              fontWeight: 700, fontSize: 14, borderRadius: 12,
              textDecoration: 'none', border: '2px solid #f5a623',
              boxShadow: '0 4px 16px rgba(245,166,35,0.35)',
            }}
          >
            {user ? 'Start a New Project →' : 'Get Started Free →'}
          </Link>
          <Link
            to="/login"
            style={{
              display: 'inline-block', padding: '11px 28px',
              background: 'transparent', color: '#e2e8f0',
              fontWeight: 600, fontSize: 14, borderRadius: 12,
              textDecoration: 'none', border: '1.5px solid #374151',
            }}
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px', borderTop: '1px solid #1f2937' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>
            From photo to plan in three steps
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>
            Streamline your exterior design process with interactive surface mapping and automated rate estimation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { step: '1', title: 'Share your house photo', desc: 'Take a clear photo of your house exterior. Our system validates the image quality automatically.' },
            { step: '2', title: 'Choose materials', desc: 'Browse paints, stone cladding, tiles, railings. Apply them to walls, pillars, balconies in real time.' },
            { step: '3', title: 'Get your cost breakdown', desc: 'Receive a detailed estimate with material quantities, labor, and total cost. Download as PDF.' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 20, padding: '24px 20px' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#f5a623', color: '#090d16',
                fontWeight: 800, fontSize: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                fontFamily: 'Outfit, sans-serif',
              }}>
                {item.step}
              </div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>
                {item.title}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature Highlights ───────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px', borderTop: '1px solid #1f2937' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { icon: '📍', title: 'Surface Mapping', desc: 'Draw polygons over walls, pillars, railings, and roofs.' },
            { icon: '🎨', title: 'Material Swatches', desc: 'Assign textures, paint, stone cladding, and tiles to mapped areas.' },
            { icon: '🎚️', title: 'Before & After Slider', desc: 'Drag and compare original photo with redesigned preview.' },
            { icon: '📑', title: 'PDF Estimates', desc: 'Generate material & labor estimates with PDF export.' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: '16px 14px' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
              <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#ffffff', fontSize: 13, marginBottom: 4 }}>{f.title}</h4>
              <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 56px' }}>
        <div style={{
          background: '#111827', border: '1px solid #2d3748',
          borderRadius: 20, padding: '48px 32px', textAlign: 'center',
          boxShadow: '0 0 40px rgba(245,166,35,0.08)',
        }}>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
            Ready to redesign your home?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 440, margin: '0 auto 28px' }}>
            Create your account today and start mapping your renovation project in minutes.
          </p>
          <Link
            to={user ? '/project/new' : '/register'}
            style={{
              display: 'inline-block', padding: '12px 32px',
              background: '#f5a623', color: '#090d16',
              fontWeight: 700, fontSize: 14, borderRadius: 12,
              textDecoration: 'none', border: '2px solid #f5a623',
              boxShadow: '0 4px 20px rgba(245,166,35,0.4)',
            }}
          >
            {user ? 'New Renovation Plan' : 'Get Started Free Now'}
          </Link>
        </div>
      </section>
    </div>
  )
}