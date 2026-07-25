import { useState, useRef, useEffect, useCallback } from 'react'
import { generateAIPreview } from '../../services/api'

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
}

interface Props {
  imagePath: string
  regions: Region[]
  materials: Material[]
  generatedImage: string | null
  onGenerated: (imagePath: string) => void
  onBack: () => void
  onContinue: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  paint: 'rgba(245, 166, 35, 0.75)',
  texture: 'rgba(217, 119, 6, 0.8)',
  cladding: 'rgba(168, 162, 158, 0.85)',
  tile: 'rgba(16, 185, 129, 0.8)',
  panel: 'rgba(59, 130, 246, 0.85)',
  railing: 'rgba(244, 63, 94, 0.85)',
}

function createPattern(ctx: CanvasRenderingContext2D, category: string, color: string): CanvasPattern | null {
  const canvas = document.createElement('canvas')
  const c = canvas.getContext('2d')!
  if (category === 'cladding') {
    canvas.width = 20; canvas.height = 10
    c.fillStyle = color; c.fillRect(0, 0, 20, 10)
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.strokeRect(0, 0, 20, 10)
  } else if (category === 'tile') {
    canvas.width = 16; canvas.height = 16
    c.fillStyle = color; c.fillRect(0, 0, 16, 16)
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.strokeRect(0, 0, 16, 16)
  } else if (category === 'panel') {
    canvas.width = 40; canvas.height = 8
    c.fillStyle = color; c.fillRect(0, 0, 40, 8)
    c.fillStyle = 'rgba(255,255,255,0.1)'; c.fillRect(0, 0, 40, 2)
  } else if (category === 'railing') {
    canvas.width = 12; canvas.height = 12
    c.fillStyle = color; c.fillRect(0, 0, 12, 12)
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(6, 0); c.lineTo(6, 12); c.stroke()
  } else if (category === 'texture') {
    canvas.width = 8; canvas.height = 8
    c.fillStyle = color; c.fillRect(0, 0, 8, 8)
    c.fillStyle = 'rgba(0,0,0,0.12)'
    for (let i = 0; i < 8; i += 2) for (let j = 0; j < 8; j += 2) if ((i + j) % 4 === 0) c.fillRect(i, j, 1, 1)
  } else {
    canvas.width = 4; canvas.height = 4
    c.fillStyle = color; c.fillRect(0, 0, 4, 4)
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 0, 2, 2)
  }
  return ctx.createPattern(canvas, 'repeat')
}

export default function BeforeAfter({
  imagePath,
  regions,
  materials,
  generatedImage,
  onGenerated,
  onBack,
  onContinue,
}: Props) {
  const [sliderPos, setSliderPos] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiGenerated, setAiGenerated] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [preview, setPreview] = useState(generatedImage || '')

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth)
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    setSliderPos(x)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => { if (isDragging) handleMove(e.clientX) }
  const handleTouchMove = (e: React.TouchEvent) => { if (e.touches.length > 0) handleMove(e.touches[0].clientX) }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const canvas = document.createElement('canvas')
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = `/uploads/${imagePath}`

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)

          regions.forEach((region) => {
            if (!region.selected_material || region.polygon.length < 3) return
            const mat = materials.find((m) => String(m.id) === region.selected_material)
            if (!mat) return

            const color = CATEGORY_COLORS[mat.category] || 'rgba(245, 166, 35, 0.55)'

            ctx.save()
            ctx.beginPath()
            ctx.moveTo(region.polygon[0].x, region.polygon[0].y)
            for (let i = 1; i < region.polygon.length; i++) ctx.lineTo(region.polygon[i].x, region.polygon[i].y)
            ctx.closePath()
            ctx.clip()

            const pattern = createPattern(ctx, mat.category, color)
            ctx.fillStyle = pattern || color
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            ctx.strokeStyle = 'rgba(245, 166, 35, 0.8)'
            ctx.lineWidth = 3
            ctx.stroke()

            const centroid = region.polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
            centroid.x /= region.polygon.length
            centroid.y /= region.polygon.length

            const text = mat.name
            const width = ctx.measureText(text).width + 8
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
            ctx.fillRect(centroid.x - 4, centroid.y - 14, width, 20)
            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 12px sans-serif'
            ctx.fillText(text, centroid.x, centroid.y)

            ctx.restore()
          })

          const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
          // Don't overwrite AI-generated preview with texture overlay
          if (!aiGenerated) {
            setPreview(dataUrl)
            onGenerated(dataUrl)
          }
          resolve()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleAIGenerate = async () => {
    setAiGenerating(true)
    setAiError(null)
    try {
      const payload = regions
        .filter((r) => r.selected_material)
        .map((r) => {
          const mat = materials.find((m) => String(m.id) === r.selected_material)
          return {
            type: r.type,
            selected_material: mat?.name || 'Unknown',
            polygon: r.polygon || [],
          }
        })
      const result = await generateAIPreview(imagePath, payload)
      if (result.success && result.generated_image_url) {
        setAiGenerated(true)
        setPreview(result.generated_image_url)
        onGenerated(result.generated_image_url)
      } else {
        setAiError(result.error || 'AI generation failed')
      }
    } catch (err: any) {
      setAiError(err.response?.data?.detail || err.message || 'AI generation failed')
    } finally {
      setAiGenerating(false)
    }
  }

  const assignedCount = regions.filter((r) => r.selected_material).length

  // Auto-generate texture preview on mount if materials assigned
  // Skip if AI has already generated a preview
  useEffect(() => {
    if (assignedCount > 0 && !preview && !generating && !aiGenerating && !aiGenerated) {
      handleGenerate()
    }
  }, [assignedCount, preview, generating, aiGenerating, aiGenerated])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Visual Preview Comparison</h2>
          <p className="text-slate-300 text-sm mt-1">
            Slide horizontally to compare the original building photo with your redesigned material preview.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!preview && (
            <button
              onClick={handleGenerate}
              disabled={generating || assignedCount === 0}
              className="btn-secondary px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-30"
            >
              {generating ? 'Generating...' : 'Texture Overlay'}
            </button>
          )}
          <button
            onClick={handleAIGenerate}
            disabled={aiGenerating || assignedCount === 0}
            className="btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-md disabled:opacity-30 shrink-0"
          >
            {aiGenerating ? 'Generating AI Photo...' : '🤖 Generate AI Photo'}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs p-3 rounded-xl">
          {aiError}
        </div>
      )}

      {preview ? (
        <div className="space-y-4">
          <div
            ref={containerRef}
            onMouseDown={(e) => { setIsDragging(true); handleMove(e.clientX) }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
            onTouchStart={(e) => { setIsDragging(true); handleMove(e.touches[0].clientX) }}
            onTouchEnd={() => setIsDragging(false)}
            onTouchMove={handleTouchMove}
            className="comparison-slider relative w-full h-[400px] sm:h-[480px] overflow-hidden rounded-2xl bg-[#090e1a] cursor-ew-resize select-none border border-[#253556] shadow-xl"
          >
            <img
              src={`/uploads/${imagePath}`}
              alt="Original Exterior"
              className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
            />
            <div
              className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={preview}
                alt="Redesigned Exterior"
                className="absolute top-0 left-0 h-full max-w-none object-contain pointer-events-none"
                style={{ width: containerWidth ? `${containerWidth}px` : '100%' }}
              />
            </div>
            <div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 cursor-ew-resize z-20 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-amber-500 border-2 border-[#0b0f19] text-[#0b0f19] font-bold rounded-full shadow-lg flex items-center justify-center text-xs">
                ⟷
              </div>
            </div>
            <div className="absolute top-3 left-3 bg-[#0b0f19]/90 border border-[#253556] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg z-10">
              Original Photo
            </div>
            <div className="absolute top-3 right-3 bg-amber-500 text-[#0b0f19] text-[11px] font-extrabold px-2.5 py-1 rounded-lg z-10">
              Redesigned Preview
            </div>
          </div>

          <div className="flex items-center justify-center">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-secondary px-4 py-2 rounded-xl text-xs font-bold"
            >
              🔄 Refresh Preview Overlay
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-14 bg-[#141d30] rounded-2xl border border-[#253556] max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-2xl flex items-center justify-center mx-auto mb-4">
            ✨
          </div>
          <h3 className="text-white font-bold text-lg mb-1">Ready to generate your preview</h3>
          <p className="text-slate-300 text-xs mb-5 max-w-xs mx-auto leading-relaxed">
            Click below to apply selected materials onto your mapped building surfaces.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating || assignedCount === 0}
            className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-md disabled:opacity-30"
          >
            {generating ? 'Generating Visual Preview...' : 'Generate Visual Preview →'}
          </button>
        </div>
      )}

      {assignedCount > 0 && (
        <div className="bg-[#141d30] rounded-2xl border border-[#253556] p-4">
          <h4 className="text-white font-bold text-sm mb-3">Applied Materials</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {regions.filter((r) => r.selected_material).map((r) => {
              const mat = materials.find((m) => String(m.id) === r.selected_material)
              return (
                <div key={r.id} className="flex items-center justify-between bg-[#0b0f19] rounded-lg px-3 py-2">
                  <span className="text-slate-300 text-xs capitalize">{r.type}</span>
                  <span className="text-amber-400 text-xs font-bold">{mat?.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#1e2a45] pt-4">
        <button onClick={onBack} className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">
          ← Back to Material Catalog
        </button>
        <button onClick={onContinue} className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-md">
          View Cost Estimate & PDF →
        </button>
      </div>
    </div>
  )
}
