import { useState } from 'react'

interface Region {
  id: string
  type: string
  polygon: { x: number; y: number }[]
  area_sqft: number | null
  selected_material: string | null
  notes: string
}

interface Material {
  id: number
  name: string
  category: string
  applicable_regions: string[]
  material_rate: number
  labor_rate: number
  coverage_value: number
  coverage_unit: string
  durability: string
  maintenance: string
  description: string
}

interface Props {
  regions: Region[]
  materials: Material[]
  onAssign: (regionId: string, materialId: string | null) => void
  onBack: () => void
  onContinue: () => void
}

const REGION_TYPES = ['wall', 'window', 'balcony', 'pillar', 'parapet', 'gate', 'roof']
const REGION_LABELS: Record<string, string> = {
  wall: 'Wall', window: 'Window', balcony: 'Balcony', pillar: 'Pillar',
  parapet: 'Parapet', gate: 'Gate', roof: 'Roof',
}

const chipBase: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700,
  cursor: 'pointer', border: '1px solid #2d3748', background: '#111827',
  color: '#94a3b8', transition: 'all 0.15s', textTransform: 'capitalize',
}

export default function MaterialCatalog({ regions, materials, onAssign, onBack, onContinue }: Props) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(regions[0]?.id || null)
  const [regionFilter, setRegionFilter] = useState<string>('')

  const region = regions.find((r) => r.id === selectedRegion)
  const activeFilter = regionFilter || region?.type || ''

  const filtered = activeFilter
    ? materials.filter((m) => m.applicable_regions.includes(activeFilter))
    : materials

  const assignedCount = regions.filter((r) => r.selected_material).length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>
            Choose Materials & Textures
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Materials are filtered by the selected surface region type.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#111827', border: '1px solid #1f2937', padding: '8px 14px', borderRadius: 12 }}>
          <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
            Assigned: <span style={{ color: '#f5a623', fontWeight: 700 }}>{assignedCount}/{regions.length}</span>
          </span>
          <div style={{ width: 64, height: 6, background: '#0f172a', borderRadius: 999, overflow: 'hidden', border: '1px solid #1f2937' }}>
            <div style={{ height: '100%', background: '#f5a623', width: `${regions.length > 0 ? (assignedCount / regions.length) * 100 : 0}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        {/* Region Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>
            Select Surface Region
          </p>
          {regions.map((r, i) => {
            const mat = materials.find((m) => String(m.id) === r.selected_material)
            const isSel = selectedRegion === r.id
            return (
              <button
                key={r.id}
                onClick={() => { setSelectedRegion(r.id); setRegionFilter('') }}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12, fontSize: 12,
                  background: isSel ? '#1e2a45' : '#111827',
                  border: `1px solid ${isSel ? '#f5a623' : '#1f2937'}`,
                  color: isSel ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer', fontWeight: isSel ? 700 : 500,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#ffffff', fontWeight: 700, textTransform: 'capitalize' }}>#{i + 1} {r.type}</span>
                  {mat ? (
                    <span style={{ fontSize: 9, background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 999, padding: '2px 8px', fontWeight: 700 }}>
                      Assigned
                    </span>
                  ) : (
                    <span style={{ fontSize: 9, background: '#0f172a', color: '#64748b', borderRadius: 999, padding: '2px 8px' }}>
                      Empty
                    </span>
                  )}
                </div>
                {mat && (
                  <span style={{ display: 'block', fontSize: 11, color: '#f5a623', marginTop: 4, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {mat.name}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Material Grid */}
        <div>
          {region && (
            <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, padding: '8px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#fcd34d', fontWeight: 600 }}>
                Assigning finish for: <strong style={{ color: '#ffffff', textTransform: 'capitalize' }}>{region.type}</strong>
              </span>
              {region.selected_material && (
                <button
                  onClick={() => onAssign(selectedRegion!, null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 12, fontWeight: 600, textDecoration: 'underline' }}
                >
                  Clear Selection
                </button>
              )}
            </div>
          )}

          {/* Region Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filter by surface:
            </span>
            <button
              onClick={() => setRegionFilter('')}
              style={{ ...chipBase, background: !regionFilter ? '#f5a623' : '#111827', color: !regionFilter ? '#090d16' : '#94a3b8', borderColor: !regionFilter ? '#f5a623' : '#2d3748' }}
            >
              Recommended for {region ? region.type : 'All'}
            </button>
            {REGION_TYPES.map((rt) => {
              const count = materials.filter((m) => m.applicable_regions.includes(rt)).length
              return (
                <button
                  key={rt}
                  onClick={() => setRegionFilter(rt)}
                  style={{ ...chipBase, background: regionFilter === rt ? '#f5a623' : '#111827', color: regionFilter === rt ? '#090d16' : '#94a3b8', borderColor: regionFilter === rt ? '#f5a623' : '#2d3748' }}
                >
                  {REGION_LABELS[rt] || rt} <span style={{ opacity: 0.7, marginLeft: 4 }}>({count})</span>
                </button>
              )
            })}
          </div>

          {/* Material Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {filtered.map((mat) => {
              const matId = String(mat.id)
              const isSel = region?.selected_material === matId
              return (
                <div
                  key={matId}
                  onClick={() => selectedRegion && onAssign(selectedRegion, matId)}
                  style={{
                    background: isSel ? 'rgba(245,166,35,0.12)' : '#111827',
                    border: `1px solid ${isSel ? '#f5a623' : '#1f2937'}`,
                    borderRadius: 16, padding: '14px 12px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    transition: 'all 0.15s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                      <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#ffffff', fontSize: 13, margin: 0, lineHeight: 1.3 }}>
                        {mat.name}
                      </h4>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: '#1e2a45', color: '#fcd34d', border: '1px solid #2d3748', flexShrink: 0, textTransform: 'uppercase' }}>
                        {mat.category}
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 11, margin: '0 0 10px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {mat.description || 'Premium exterior finish.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1f2937', paddingTop: 8 }}>
                    <span style={{ color: '#f5a623', fontWeight: 800, fontSize: 12 }}>
                      ₹{mat.material_rate} <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 400 }}>/ sqft</span>
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>{mat.durability || '10+ Yrs'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{ padding: '9px 20px', background: '#111827', color: '#e2e8f0', fontWeight: 600, fontSize: 13, borderRadius: 12, border: '1px solid #2d3748', cursor: 'pointer' }}
        >
          ← Back to Surface Mapping
        </button>
        <button
          onClick={onContinue}
          disabled={assignedCount === 0}
          style={{
            padding: '9px 22px', background: assignedCount > 0 ? '#f5a623' : '#3a3a3a',
            color: assignedCount > 0 ? '#090d16' : '#666', fontWeight: 700, fontSize: 13,
            borderRadius: 12, border: 'none', cursor: assignedCount > 0 ? 'pointer' : 'not-allowed',
            boxShadow: assignedCount > 0 ? '0 4px 14px rgba(245,166,35,0.3)' : 'none',
          }}
        >
          Preview Design ({assignedCount} Assigned) →
        </button>
      </div>
    </div>
  )
}