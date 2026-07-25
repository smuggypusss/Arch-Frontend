import { useRef, useEffect, useState, useCallback } from 'react'
import api from '../../services/api'

interface Region {
  id: string
  type: string
  polygon: { x: number; y: number }[]
  area_sqft: number | null
  selected_material: string | null
  notes: string
}

interface Props {
  imagePath: string
  regions: Region[]
  onRegionsChange: (regions: Region[]) => void
  onContinue: () => void
}

const REGION_TYPES = [
  { value: 'wall',     label: 'Exterior Wall',      color: '#f5a623' },
  { value: 'window',   label: 'Window / Trim',       color: '#10b981' },
  { value: 'balcony',  label: 'Balcony / Railing',   color: '#3b82f6' },
  { value: 'pillar',   label: 'Pillar / Column',     color: '#ec4899' },
  { value: 'parapet',  label: 'Parapet / Terrace',   color: '#8b5cf6' },
  { value: 'gate',     label: 'Gate / Entrance',     color: '#f43f5e' },
  { value: 'roof',     label: 'Roof / Eaves',        color: '#06b6d4' },
]

let idCounter = Date.now()

const btnBase: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
  cursor: 'pointer', border: '1px solid #2d3748', display: 'inline-flex',
  alignItems: 'center', gap: 8, transition: 'all 0.15s',
}

export default function RegionCanvas({ imagePath, regions, onRegionsChange, onContinue }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [selectedType, setSelectedType] = useState('wall')
  const [drawing, setDrawing] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState<{ x: number; y: number }[]>([])
  const [imageLoaded, setImageLoaded] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = `/uploads/${imagePath}`
    img.onload = () => {
      imgRef.current = img
      setImageLoaded(true)
    }
  }, [imagePath])

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
    regions.forEach((region) => {
      if (region.polygon.length < 2) return
      const typeInfo = REGION_TYPES.find((t) => t.value === region.type)
      const color = typeInfo?.color || '#f5a623'
      ctx.beginPath()
      ctx.moveTo(region.polygon[0].x, region.polygon[0].y)
      for (let i = 1; i < region.polygon.length; i++) ctx.lineTo(region.polygon[i].x, region.polygon[i].y)
      ctx.closePath()
      ctx.fillStyle = color + '40'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.stroke()
      const avgX = region.polygon.reduce((s, p) => s + p.x, 0) / region.polygon.length
      const avgY = region.polygon.reduce((s, p) => s + p.y, 0) / region.polygon.length
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Inter, sans-serif'
      ctx.shadowColor = '#000'
      ctx.shadowBlur = 4
      ctx.fillText(typeInfo?.label || region.type, avgX - 25, avgY)
      ctx.shadowBlur = 0
    })
    if (currentPolygon.length > 0) {
      ctx.beginPath()
      ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y)
      for (let i = 1; i < currentPolygon.length; i++) ctx.lineTo(currentPolygon[i].x, currentPolygon[i].y)
      ctx.strokeStyle = '#f5a623'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 6])
      ctx.stroke()
      ctx.setLineDash([])
      currentPolygon.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI)
        ctx.fillStyle = '#f5a623'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      })
    }
  }, [regions, currentPolygon])

  useEffect(() => { if (imageLoaded) drawAll() }, [imageLoaded, drawAll])

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = (imgRef.current?.width || 1) / rect.width
    const scaleY = (imgRef.current?.height || 1) / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawing) {
      const { x, y } = getCanvasCoords(e)
      setCurrentPolygon((prev) => [...prev, { x, y }])
    }
  }

  const handleDoubleClick = () => {
    if (currentPolygon.length >= 3) {
      const newRegion: Region = {
        id: `region_${idCounter++}`,
        type: selectedType,
        polygon: currentPolygon,
        area_sqft: null,
        selected_material: null,
        notes: '',
      }
      onRegionsChange([...regions, newRegion])
    }
    setCurrentPolygon([])
    setDrawing(false)
  }

  const removeRegion = (id: string) => onRegionsChange(regions.filter((r) => r.id !== id))
  const removeLastRegion = () => { if (regions.length > 0) onRegionsChange(regions.slice(0, -1)) }
  const clearAll = () => { if (confirm('Clear all mapped surface regions?')) onRegionsChange([]) }

  const handleAutoDetect = async () => {
    setDetectError('')
    setDetecting(true)
    try {
      const res = await api.post('/ai/detect-regions', { image_url: `/uploads/${imagePath}` })
      if (res.data.success && res.data.regions) {
        // AI returns regions; if they contain mask data, convert to bounding polygon
        // SAM-2 may return masks or boxes — we map them to polygon outlines
        const detected = res.data.regions.map((r: any, idx: number) => {
          // Determine region type based on heuristics or default to 'wall'
          let regionType = 'wall'
          const label = (r.label || r.type || '').toLowerCase()
          if (label.includes('window') || label.includes('trim')) regionType = 'window'
          else if (label.includes('roof') || label.includes('eave')) regionType = 'roof'
          else if (label.includes('balcony') || label.includes('rail')) regionType = 'balcony'
          else if (label.includes('pillar') || label.includes('column')) regionType = 'pillar'
          else if (label.includes('parapet') || label.includes('terrace')) regionType = 'parapet'
          else if (label.includes('gate') || label.includes('entrance')) regionType = 'gate'

          // Convert bbox/mask to polygon points
          let polygon: { x: number; y: number }[] = []
          if (r.bbox) {
            // bbox = [x1, y1, x2, y2]
            const [x1, y1, x2, y2] = r.bbox
            polygon = [
              { x: x1, y: y1 },
              { x: x2, y: y1 },
              { x: x2, y: y2 },
              { x: x1, y: y2 },
            ]
          } else if (r.polygon) {
            polygon = r.polygon
          } else if (r.mask) {
            // If raw mask, create a bounding box from mask extents
            // This is a simplification — ideally we'd run contour detection
            polygon = [
              { x: r.x || 0, y: r.y || 0 },
              { x: (r.x || 0) + (r.width || 200), y: r.y || 0 },
              { x: (r.x || 0) + (r.width || 200), y: (r.y || 0) + (r.height || 200) },
              { x: r.x || 0, y: (r.y || 0) + (r.height || 200) },
            ]
          } else if (r.points && Array.isArray(r.points)) {
            polygon = r.points.map((p: any) => ({ x: p.x ?? p[0], y: p.y ?? p[1] }))
          } else {
            // Fallback: create a placeholder rectangle spread across the image
            const w = imgRef.current?.width || 800
            const h = imgRef.current?.height || 600
            const offset = idx * 60
            polygon = [
              { x: 50 + offset, y: 50 + offset },
              { x: 150 + offset, y: 50 + offset },
              { x: 150 + offset, y: 150 + offset },
              { x: 50 + offset, y: 150 + offset },
            ]
          }

          return {
            id: `ai_region_${Date.now()}_${idx}`,
            type: regionType,
            polygon,
            area_sqft: r.area || null,
            selected_material: null,
            notes: r.label || r.type || '',
          }
        })

        if (detected.length > 0) {
          onRegionsChange(detected)
          setDetectError(`AI detected ${detected.length} regions. Review and adjust as needed.`)
        } else {
          setDetectError('AI found no regions. Please map surfaces manually.')
        }
      } else {
        setDetectError(res.data.message || 'AI detection unavailable. Please map surfaces manually.')
      }
    } catch (err: any) {
      setDetectError(err.response?.data?.error || 'AI detection failed. Please map surfaces manually.')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>Map Building Surfaces</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Select a surface category, click points to map surfaces, double-click to finish each region.
          </p>
        </div>
        <button
          onClick={onContinue}
          disabled={regions.length === 0}
          style={{
            padding: '9px 20px', background: regions.length > 0 ? '#f5a623' : '#3a3a3a',
            color: regions.length > 0 ? '#090d16' : '#666', fontWeight: 700, fontSize: 13,
            borderRadius: 12, border: 'none', cursor: regions.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: regions.length > 0 ? '0 4px 14px rgba(245,166,35,0.3)' : 'none',
          }}
        >
          Continue to Materials ({regions.length}) →
        </button>
      </div>

      {/* Surface Type Selector */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
          Select Surface Category
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REGION_TYPES.map((t) => {
            const isSel = selectedType === t.value
            return (
              <button
                key={t.value}
                onClick={() => setSelectedType(t.value)}
                style={{
                  ...btnBase,
                  background: isSel ? '#1e2a45' : '#111827',
                  color: isSel ? '#ffffff' : '#94a3b8',
                  borderColor: isSel ? '#f5a623' : '#2d3748',
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, display: 'inline-block', flexShrink: 0 }} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleAutoDetect}
            disabled={detecting}
            style={{
              ...btnBase,
              background: detecting ? '#1e2a45' : 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
              color: '#ffffff',
              borderColor: 'transparent',
              opacity: detecting ? 0.6 : 1,
            }}
          >
            {detecting ? '⏳ Detecting...' : '🤖 Auto-Detect Surfaces'}
          </button>
          <button
            onClick={() => { setDrawing(!drawing); setCurrentPolygon([]) }}
            style={{
              ...btnBase,
              background: drawing ? 'rgba(239,68,68,0.12)' : '#f5a623',
              color: drawing ? '#f87171' : '#090d16',
              borderColor: drawing ? 'rgba(239,68,68,0.4)' : '#f5a623',
            }}
          >
            {drawing ? 'Cancel Drawing' : '+ Draw Manually'}
          </button>
          {drawing && (
            <span style={{ color: '#f5a623', fontSize: 12, fontWeight: 600 }}>
              Click points around surface. Double-click to close boundary.
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={removeLastRegion}
            disabled={regions.length === 0}
            style={{ ...btnBase, background: 'transparent', color: regions.length > 0 ? '#94a3b8' : '#374151', borderColor: 'transparent' }}
          >
            Undo Last
          </button>
          <button
            onClick={clearAll}
            disabled={regions.length === 0}
            style={{ ...btnBase, background: 'transparent', color: regions.length > 0 ? '#f87171' : '#374151', borderColor: 'transparent' }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* AI Detection Status */}
      {detectError && (
        <div style={{
          marginBottom: 12, padding: '8px 14px', borderRadius: 10,
          background: detectError.startsWith('AI detected') ? 'rgba(16,185,129,0.08)' : 'rgba(245,166,35,0.08)',
          border: `1px solid ${detectError.startsWith('AI detected') ? 'rgba(16,185,129,0.3)' : 'rgba(245,166,35,0.3)'}`,
          color: detectError.startsWith('AI detected') ? '#6ee7b7' : '#fcd34d',
          fontSize: 12, fontWeight: 500,
        }}>
          {detectError}
        </div>
      )}

      {/* Canvas */}
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #1f2937', background: '#090d16', minHeight: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!imageLoaded && (
          <div style={{ color: '#64748b', fontSize: 13 }}>Loading building image for mapping...</div>
        )}
        <canvas
          ref={canvasRef}
          onClick={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{ width: '100%', height: 'auto', cursor: 'crosshair', maxHeight: 520, objectFit: 'contain', display: imageLoaded ? 'block' : 'none' }}
        />
      </div>

      {/* Mapped Region Badges */}
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
          Mapped Surfaces ({regions.length})
        </p>
        {regions.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
            No surfaces mapped yet. Click "Start Drawing Polygon" above to outline walls, pillars, or balconies.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {regions.map((r, idx) => {
              const typeInfo = REGION_TYPES.find((x) => x.value === r.type)
              return (
                <div
                  key={r.id}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 10, background: '#111827', border: '1px solid #1f2937', fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: typeInfo?.color || '#f5a623', display: 'inline-block' }} />
                  <span>#{idx + 1} {typeInfo?.label || r.type}</span>
                  <button
                    onClick={() => removeRegion(r.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 700, fontSize: 14, padding: 0 }}
                    title="Delete Region"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}