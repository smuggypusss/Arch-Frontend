import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api, { getAssetURL } from '../services/api'

interface Project {
  id: number
  name: string
  original_image: string
  status: string
  cost_estimate: { grand_total: number } | null
  created_at: string
  updated_at: string
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft:              { label: 'Uploaded',       bg: 'rgba(59,130,246,0.15)',  color: '#93c5fd', border: 'rgba(59,130,246,0.4)' },
  regions_mapped:     { label: 'Regions Mapped', bg: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: 'rgba(139,92,246,0.4)' },
  materials_selected: { label: 'Materials Set',  bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: 'rgba(245,158,11,0.4)' },
  visualized:         { label: 'Preview Ready',  bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: 'rgba(16,185,129,0.4)' },
  completed:          { label: 'Complete',        bg: 'rgba(16,185,129,0.25)', color: '#a7f3d0', border: 'rgba(16,185,129,0.6)' },
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/projects')
      .then((res) => setProjects(res.data))
      .catch((err) => console.error('Failed to load projects:', err))
      .finally(() => setLoading(false))
  }, [])

  const deleteProject = async (id: number) => {
    if (!confirm('Delete this renovation project?')) return
    try {
      await api.delete(`/projects/${id}`)
      setProjects(projects.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', minHeight: 'calc(100vh - 3.5rem)' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #1f2937' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 800, color: '#ffffff', margin: 0, marginBottom: 4 }}>
            My Renovation Projects
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Manage your saved house exterior plans, material specs, and estimates
          </p>
        </div>
        <Link
          to="/project/new"
          style={{
            display: 'inline-block', padding: '10px 22px',
            background: '#f5a623', color: '#090d16',
            fontWeight: 700, fontSize: 13, borderRadius: 12,
            textDecoration: 'none', border: '2px solid #f5a623',
            boxShadow: '0 4px 14px rgba(245,166,35,0.3)',
          }}
        >
          + Create New Project
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 240, background: '#111827', border: '1px solid #1f2937', borderRadius: 18, animation: 'pulse 1.8s ease-in-out infinite' }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div style={{ maxWidth: 480, margin: '48px auto', background: '#111827', border: '1px solid #1f2937', borderRadius: 20, padding: '56px 40px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            🏡
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '0 0 10px' }}>No projects yet</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, margin: '0 0 24px' }}>
            Upload your first exterior building photo to start mapping surfaces, choosing paint &amp; stone cladding, and generating instant PDF estimates.
          </p>
          <Link
            to="/project/new"
            style={{
              display: 'inline-block', padding: '11px 28px',
              background: '#f5a623', color: '#090d16',
              fontWeight: 700, fontSize: 14, borderRadius: 12,
              textDecoration: 'none', border: '2px solid #f5a623',
              boxShadow: '0 4px 16px rgba(245,166,35,0.35)',
            }}
          >
            Start Your First Renovation →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
          {projects.map((p) => {
            const st = STATUS_MAP[p.status] || { label: p.status, bg: '#1f2937', color: '#94a3b8', border: '#374151' }
            return (
              <div key={p.id} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Thumbnail */}
                <div style={{ height: 176, background: '#090d16', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.original_image ? (
                    <img
                      src={getAssetURL(`/uploads/${p.original_image}`)}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <span style={{ color: '#475569', fontSize: 12, fontWeight: 600 }}>No Image Preview</span>
                  )}
                  <div style={{ position: 'absolute', top: 10, right: 10, background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderRadius: 999, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}>
                    {st.label}
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: '16px 16px 12px', flex: 1 }}>
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, fontWeight: 700, color: '#ffffff', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </h3>
                  {p.cost_estimate?.grand_total ? (
                    <p style={{ margin: 0, color: '#f5a623', fontWeight: 700, fontSize: 16 }}>
                      ₹{p.cost_estimate.grand_total.toLocaleString()}
                      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 400, marginLeft: 6 }}>est. cost</span>
                    </p>
                  ) : (
                    <p style={{ margin: 0, color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>Cost estimate pending</p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Link
                    to={`/project/${p.id}`}
                    style={{ color: '#f5a623', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}
                  >
                    Open Project →
                  </Link>
                  <button
                    onClick={() => deleteProject(p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 6 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}