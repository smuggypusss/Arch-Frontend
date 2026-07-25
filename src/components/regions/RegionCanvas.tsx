import React, { useRef, useEffect, useState, useCallback } from 'react'
import api, { getAssetURL, refineRegions } from '../../services/api'

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

const VERTEX_HIT_THRESHOLD = 40 // pixels in image coordinates
const PADDING = 30 // canvas padding around the image so edge vertices are fully clickable

function pointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function getVertexAtPoint(
  x: number, y: number,
  polygon: { x: number; y: number }[],
  threshold: number,
): number | null {
  for (let i = 0; i < polygon.length; i++) {
    const dx = polygon[i].x - x
    const dy = polygon[i].y - y
    if (Math.sqrt(dx * dx + dy * dy) <= threshold) return i
  }
  return null
}

export default function RegionCanvas({ imagePath, regions, onRegionsChange, onContinue }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [selectedType, setSelectedType] = useState('wall')
  const [drawing, setDrawing] = useState(false)
  const [bboxDrawing, setBboxDrawing] = useState(false)
  const [currentPolygon, setCurrentPolygon] = useState<{ x: number; y: number }[]>([])
  const [bboxStart, setBboxStart] = useState<{ x: number; y: number } | null>(null)
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  // Local state for vertex editing - avoids calling onRegionsChange on every mouse move
  const [editingPolygon, setEditingPolygon] = useState<{ x: number; y: number }[] | null>(null)
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null)
  const editingVertexRef = useRef<number | null>(null)
  const [refining, setRefining] = useState(false)
  const [refineError, setRefineError] = useState('')

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = getAssetURL(`/uploads/${imagePath}`)
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
    // Add padding around the image so edge vertices are fully clickable
    canvas.width = img.width + PADDING * 2
    canvas.height = img.height + PADDING * 2
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, PADDING, PADDING)
    regions.forEach((region) => {
      if (region.polygon.length < 2) return
      const typeInfo = REGION_TYPES.find((t) => t.value === region.type)
      const color = typeInfo?.color || '#f5a623'
      const isSelected = region.id === selectedRegionId
      // Use editing polygon if this region is being edited
      const polygon = (editingRegionId === region.id && editingPolygon) ? editingPolygon : region.polygon
      if (polygon.length < 2) return
      ctx.beginPath()
      ctx.moveTo(polygon[0].x + PADDING, polygon[0].y + PADDING)
      for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x + PADDING, polygon[i].y + PADDING)
      ctx.closePath()
      ctx.fillStyle = color + (isSelected ? '60' : '40')
      ctx.fill()
      ctx.strokeStyle = isSelected ? '#ffffff' : color
      ctx.lineWidth = isSelected ? 4 : 3
      ctx.stroke()
      const avgX = polygon.reduce((s: number, p: { x: number; y: number }) => s + p.x, 0) / polygon.length
      const avgY = polygon.reduce((s: number, p: { x: number; y: number }) => s + p.y, 0) / polygon.length
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px Inter, sans-serif'
      ctx.shadowColor = '#000'
      ctx.shadowBlur = 4
      ctx.fillText(typeInfo?.label || region.type, avgX + PADDING - 25, avgY + PADDING)
      ctx.shadowBlur = 0

      // Draw vertex handles for selected region
      if (isSelected) {
        polygon.forEach((p: { x: number; y: number }) => {
          ctx.beginPath()
          ctx.arc(p.x + PADDING, p.y + PADDING, 6, 0, 2 * Math.PI)
          ctx.fillStyle = '#f5a623'
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()
        })
      }
    })
    if (currentPolygon.length > 0) {
      ctx.beginPath()
      ctx.moveTo(currentPolygon[0].x + PADDING, currentPolygon[0].y + PADDING)
      for (let i = 1; i < currentPolygon.length; i++) ctx.lineTo(currentPolygon[i].x + PADDING, currentPolygon[i].y + PADDING)
      ctx.strokeStyle = '#f5a623'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 6])
      ctx.stroke()
      ctx.setLineDash([])
      currentPolygon.forEach((p: { x: number; y: number }) => {
        ctx.beginPath()
        ctx.arc(p.x + PADDING, p.y + PADDING, 6, 0, 2 * Math.PI)
        ctx.fillStyle = '#f5a623'
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      })
    }
    // Draw live bounding box preview
    if (bboxDrawing && bboxStart && currentRect) {
      const rect = currentRect
      ctx.save()
      ctx.strokeStyle = '#f5a623'
      ctx.lineWidth = 3
      ctx.setLineDash([8, 6])
      ctx.strokeRect(rect.x + PADDING, rect.y + PADDING, rect.w, rect.h)
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(245,166,35,0.1)'
      ctx.fillRect(rect.x + PADDING, rect.y + PADDING, rect.w, rect.h)
      ctx.restore()
    }
  }, [regions, currentPolygon, selectedRegionId, editingPolygon, editingRegionId, bboxDrawing, bboxStart, currentRect])

  useEffect(() => { if (imageLoaded) drawAll() }, [imageLoaded, drawAll])

  const getCanvasCoords = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    // Map from CSS pixels to canvas pixels, then subtract padding to get image-space coords
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX - PADDING,
      y: (e.clientY - rect.top) * scaleY - PADDING,
    }
  }

  // Vertex detection BEFORE polygon selection - checks ALL regions (reverse order for topmost)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (drawing) return
    if (bboxDrawing) {
      const { x, y } = getCanvasCoords(e)
      setBboxStart({ x, y })
      setCurrentRect({ x, y, w: 0, h: 0 })
      return
    }
    const { x, y } = getCanvasCoords(e)
    // Look through every region in reverse (most recently drawn = topmost)
    for (const region of [...regions].reverse()) {
      const vertexIdx = getVertexAtPoint(x, y, region.polygon, VERTEX_HIT_THRESHOLD)
      if (vertexIdx !== null) {
        setSelectedRegionId(region.id)
        setEditingRegionId(region.id)
        setEditingPolygon([...region.polygon])
        editingVertexRef.current = vertexIdx
        return
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!editingPolygon || !editingRegionId || editingVertexRef.current === null) {
      // Handle live bounding box preview
      if (bboxDrawing && bboxStart) {
        const { x, y } = getCanvasCoords(e)
        const rect = {
          x: Math.min(bboxStart.x, x),
          y: Math.min(bboxStart.y, y),
          w: Math.abs(x - bboxStart.x),
          h: Math.abs(y - bboxStart.y),
        }
        setCurrentRect(rect)
      }
      return
    }
    const { x, y } = getCanvasCoords(e)
    setEditingPolygon((prev: { x: number; y: number }[] | null) => {
      if (!prev) return prev
      const newPolygon = [...prev]
      newPolygon[editingVertexRef.current!] = { x, y }
      return newPolygon
    })
  }

  const handleCanvasMouseUp = () => {
    if (editingPolygon && editingRegionId) {
      const newRegions = regions.map((r) =>
        r.id === editingRegionId ? { ...r, polygon: editingPolygon } : r
      )
      onRegionsChange(newRegions)
    }
    if (bboxDrawing && bboxStart && currentRect) {
      // Create a rectangular region from the bounding box
      const rect = currentRect
      const newRegion: Region = {
        id: `region_${idCounter++}`,
        type: selectedType,
        polygon: [
          { x: rect.x, y: rect.y },
          { x: rect.x + rect.w, y: rect.y },
          { x: rect.x + rect.w, y: rect.y + rect.h },
          { x: rect.x, y: rect.y + rect.h },
        ],
        area_sqft: null,
        selected_material: null,
        notes: '',
      }
      onRegionsChange([...regions, newRegion])
      setSelectedRegionId(newRegion.id)
    }
    setEditingPolygon(null)
    setEditingRegionId(null)
    editingVertexRef.current = null
    setBboxDrawing(false)
    setBboxStart(null)
    setCurrentRect(null)
  }

  // Click for polygon selection (reverse order for topmost) - ignores clicks while dragging a vertex
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (drawing) {
      const { x, y } = getCanvasCoords(e)
      setCurrentPolygon((prev: { x: number; y: number }[]) => [...prev, { x, y }])
      return
    }
    // Ignore click if we were dragging a vertex
    if (editingVertexRef.current !== null) return
    const { x, y } = getCanvasCoords(e)
    // Search in reverse so the topmost (most recently drawn) region is selected
    const clickedRegion = [...regions].reverse().find((r) => pointInPolygon(x, y, r.polygon))
    setSelectedRegionId(clickedRegion ? clickedRegion.id : null)
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

  const removeRegion = (id: string) => {
    onRegionsChange(regions.filter((r) => r.id !== id))
    setSelectedRegionId(null)
    setEditingRegionId(null)
    setEditingPolygon(null)
  }
  const removeLastRegion = () => { if (regions.length > 0) onRegionsChange(regions.slice(0, -1)) }
  const clearAll = () => { if (confirm('Clear all mapped surface regions?')) onRegionsChange([]) }

  const handleAutoDetect = async () => {
    setDetectError('')
    setDetecting(true)
    try {
      const res = await api.post('/ai/detect-regions', { image_url: `/uploads/${imagePath}` })
      if (res.data.success && res.data.regions) {
        const detected = res.data.regions.map((r: any, idx: number) => {
          let regionType = 'wall'
          const label = (r.label || r.type || '').toLowerCase()
          if (label.includes('window') || label.includes('trim')) regionType = 'window'
          else if (label.includes('roof') || label.includes('eave')) regionType = 'roof'
          else if (label.includes('balcony') || label.includes('rail')) regionType = 'balcony'
          else if (label.includes('pillar') || label.includes('column')) regionType = 'pillar'
          else if (label.includes('parapet') || label.includes('terrace')) regionType = 'parapet'
          else if (label.includes('gate') || label.includes('entrance')) regionType = 'gate'

          let polygon: { x: number; y: number }[] = []
          if (r.bbox) {
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
            polygon = [
              { x: r.x || 0, y: r.y || 0 },
              { x: (r.x || 0) + (r.width || 200), y: r.y || 0 },
              { x: (r.x || 0) + (r.width || 200), y: (r.y || 0) + (r.height || 200) },
              { x: r.x || 0, y: (r.y || 0) + (r.height || 200) },
            ]
          } else if (r.points && Array.isArray(r.points)) {
            polygon = r.points.map((p: any) => ({ x: p.x ?? p[0], y: p.y ?? p[1] }))
          } else {
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

  const handleRefineWithAI = async () => {
    if (regions.length === 0) return
    setRefineError('')
    setRefining(true)
    try {
      const payload = regions
        .filter((r) => r.polygon.length >= 3)
        .map((r) => ({ type: r.type, polygon: r.polygon }))
      const result = await refineRegions(imagePath, payload)
      if (result.success && result.regions) {
        const refined = result.regions.map((r: any, idx: number) => {
          let regionType = r.type || 'wall'
          let polygon: { x: number; y: number }[] = []
          if (r.polygon) {
            polygon = r.polygon
          } else if (r.bbox) {
            const [x1, y1, x2, y2] = r.bbox
            polygon = [
              { x: x1, y: y1 },
              { x: x2, y: y1 },
              { x: x2, y: y2 },
              { x: x1, y: y2 },
            ]
          } else {
            const existing = regions[idx] || regions[0]
            polygon = existing.polygon
          }
          const existing = regions[idx]
          return {
            id: existing ? existing.id : `refined_${Date.now()}_${idx}`,
            type: regionType,
            polygon,
            area_sqft: r.area || existing?.area_sqft || null,
            selected_material: existing?.selected_material || null,
            notes: r.label || existing?.notes || '',
          }
        })
        onRegionsChange(refined)
        setRefineError(`AI refined ${refined.length} regions. Review and adjust as needed.`)
      } else {
        setRefineError(result.error || 'AI refinement failed. Please try again.')
      }
    } catch (err: any) {
      setRefineError(err.response?.data?.detail || err.message || 'AI refinement failed. Please try again.')
    } finally {
      setRefining(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>Map Building Surfaces</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Click a region to select, drag vertex handles to adjust. Use "Add Bounding Box" for quick rectangular surfaces.
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
            {detecting ? '⏳ Detecting...' : 'Auto-Detect Surfaces'}
          </button>
          <button
            onClick={() => { setBboxDrawing(true); setBboxStart(null); setCurrentRect(null); setSelectedRegionId(null); setEditingRegionId(null); setEditingPolygon(null); editingVertexRef.current = null }}
            style={{
              ...btnBase,
              background: bboxDrawing ? 'rgba(46,204,113,0.12)' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              borderColor: 'transparent',
            }}
          >
            {bboxDrawing ? '✏️ Click & Drag...' : '➕ Add Bounding Box'}
          </button>
          <button
            onClick={() => { setDrawing(!drawing); setCurrentPolygon([]); setSelectedRegionId(null); setEditingRegionId(null); setEditingPolygon(null); editingVertexRef.current = null }}
            style={{
              ...btnBase,
              background: drawing ? 'rgba(239,68,68,0.12)' : '#f5a623',
              color: drawing ? '#f87171' : '#090d16',
              borderColor: drawing ? 'rgba(239,68,68,0.4)' : '#f5a623',
            }}
          >
            {drawing ? 'Cancel Drawing' : '✏️ Draw Manually'}
          </button>
          {regions.length > 0 && (
            <button
              onClick={handleRefineWithAI}
              disabled={refining || regions.length === 0}
              style={{
                ...btnBase,
                background: refining ? '#1e2a45' : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                borderColor: 'transparent',
                opacity: refining ? 0.6 : 1,
              }}
            >
              {refining ? '⏳ Refining...' : 'Refine with AI'}
            </button>
          )}
          {drawing && (
            <span style={{ color: '#f5a623', fontSize: 12, fontWeight: 600 }}>
              Click points around surface. Double-click to close boundary.
            </span>
          )}
          {bboxDrawing && (
            <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>
              Click and drag to draw a rectangular surface.
            </span>
          )}
          {!drawing && !bboxDrawing && regions.length > 0 && (
            <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>
              Click a region to select, drag vertex handles to adjust.
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

      {/* Refine Status */}
      {refineError && (
        <div style={{
          marginBottom: 12, padding: '8px 14px', borderRadius: 10,
          background: refineError.startsWith('AI refined') ? 'rgba(16,185,129,0.08)' : 'rgba(245,166,35,0.08)',
          border: `1px solid ${refineError.startsWith('AI refined') ? 'rgba(16,185,129,0.3)' : 'rgba(245,166,35,0.3)'}`,
          color: refineError.startsWith('AI refined') ? '#6ee7b7' : '#fcd34d',
          fontSize: 12, fontWeight: 500,
        }}>
          {refineError}
        </div>
      )}

      {/* Canvas - overflow:visible so padding area (with edge vertex handles) is clickable */}
      <div style={{ borderRadius: 14, overflow: 'visible', border: '1px solid #1f2937', background: '#090d16', minHeight: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!imageLoaded && (
          <div style={{ color: '#64748b', fontSize: 13 }}>Loading building image for mapping...</div>
        )}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{ maxWidth: '100%', height: 'auto', cursor: drawing ? 'crosshair' : (bboxDrawing ? 'crosshair' : (editingPolygon ? 'grabbing' : 'pointer')), maxHeight: 520, display: imageLoaded ? 'block' : 'none' }}
        />
      </div>

      {/* Mapped Region Badges */}
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
          Mapped Surfaces ({regions.length})
        </p>
        {regions.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>
            No surfaces mapped yet. Use "Add Bounding Box" for quick rectangular surfaces, or "Draw Manually" for custom shapes.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {regions.map((r, idx) => {
              const typeInfo = REGION_TYPES.find((x) => x.value === r.type)
              const isSelected = r.id === selectedRegionId
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8,
                    background: isSelected ? '#1e2a45' : '#111827',
                    border: `1px solid ${isSelected ? '#f5a623' : '#1f2937'}`,
                    fontSize: 11, color: '#e2e8f0', fontWeight: 500,
                    maxWidth: '100%', boxSizing: 'border-box',
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeInfo?.color || '#f5a623', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>#{idx + 1} {typeInfo?.label || r.type}</span>
                  <button
                    onClick={() => removeRegion(r.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: 700, fontSize: 14, padding: '0 0 0 4px', lineHeight: 1 }}
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
