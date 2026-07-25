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
  const [aiProgress, setAiProgress] = useState(0)
  const [aiStatus, setAiStatus] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiGenerated, setAiGenerated] = useState(!!generatedImage)
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
    setAiProgress(0)
    setAiStatus('Initializing AI engine & analyzing facades...')

    const assigned = regions.filter((r) => r.selected_material)
    const totalSteps = assigned.length

    let currentProgress = 5
    const progressInterval = setInterval(() => {
      if (currentProgress < 15) {
        currentProgress += Math.random() * 3 + 1
        setAiStatus('Initializing AI Engine and preparing high-fidelity masks...')
      } else if (currentProgress < 85) {
        const regionIndex = Math.min(
          Math.floor(((currentProgress - 15) / 70) * totalSteps),
          totalSteps - 1
        )
        const activeRegion = assigned[regionIndex]
        if (activeRegion) {
          const mat = materials.find((m) => String(m.id) === activeRegion.selected_material)
          const matName = mat?.name || 'materials'
          setAiStatus(`Redesigning ${activeRegion.type} surface with ${matName}...`)
        }
        currentProgress += Math.random() * 2 + 0.5
      } else if (currentProgress < 95) {
        currentProgress += Math.random() * 0.8 + 0.2
        setAiStatus('Blending generated textures and computing photorealistic shadows...')
      } else if (currentProgress < 99) {
        currentProgress += 0.1
        setAiStatus('Finalizing high-resolution rendering exports...')
      }
      setAiProgress(Math.min(99, Math.round(currentProgress)))
    }, 280)

    try {
      const payload = assigned.map((r) => {
        const mat = materials.find((m) => String(m.id) === r.selected_material)
        return {
          type: r.type,
          selected_material: mat?.name || 'Unknown',
          polygon: r.polygon || [],
        }
      })
      const result = await generateAIPreview(imagePath, payload)
      clearInterval(progressInterval)

      if (result.success && result.generated_image_url) {
        setAiProgress(100)
        setAiStatus('AI Generation Successful!')
        setAiGenerated(true)
        setPreview(result.generated_image_url)
        onGenerated(result.generated_image_url)
      } else {
        setAiError(result.error || 'AI generation failed')
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      setAiError(err.response?.data?.detail || err.message || 'AI generation failed')
    } finally {
      setAiGenerating(false)
    }
  }

  const assignedCount = regions.filter((r) => r.selected_material).length

  useEffect(() => {
    if (assignedCount > 0 && !preview && !generating && !aiGenerating && !aiGenerated) {
      handleGenerate()
    }
  }, [assignedCount, preview, generating, aiGenerating, aiGenerated])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Interactive Design
            </span>
            <span className="px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Ready
            </span>
          </div>
          <h2 className="font-display text-2xl font-black text-white mt-1.5">Visual Preview Comparison</h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Drag the handle horizontally to interactively compare your original building exterior with the photorealistic AI-redesigned premium rendering.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {preview && (
            <button
              onClick={handleGenerate}
              disabled={generating || aiGenerating}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700/80 hover:bg-slate-700 hover:text-white transition-all duration-200 disabled:opacity-30"
            >
              {generating ? 'Updating...' : 'Texture Overlay'}
            </button>
          )}
          <button
            onClick={handleAIGenerate}
            disabled={aiGenerating || assignedCount === 0}
            className="px-6 py-2.5 rounded-xl text-xs font-black tracking-wide text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 active:scale-98 shadow-lg shadow-amber-500/20 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
          >
            <span>🤖</span> Generate AI Photo
          </button>
        </div>
      </div>

      {aiError && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-4 rounded-xl flex items-center gap-2.5">
          <span className="text-lg">⚠️</span>
          <div>
            <span className="font-bold">Generation Unsuccessful:</span> {aiError}
          </div>
        </div>
      )}

      {/* RENDER DYNAMIC PROGRESS LOADER OVERLAY */}
      {aiGenerating ? (
        <div className="w-full min-h-[400px] sm:min-h-[480px] rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
          {/* Glowing absolute backgrounds */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-indigo-500/5 rounded-full blur-[60px]" />

          <div className="relative z-10 w-full max-w-md text-center space-y-6">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
              <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-amber-400 animate-spin" />
              <span className="text-2xl animate-pulse">✨</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-extrabold text-lg tracking-tight">E2M Intelligent Renovation</h3>
              <p className="text-slate-400 text-xs min-h-[32px] leading-relaxed transition-all duration-300 px-4">
                {aiStatus}
              </p>
            </div>

            {/* PROGRESS BAR BAR */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-500 font-medium">Processing facades</span>
                <span className="text-amber-400 font-black">{aiProgress}%</span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full border border-slate-800 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all duration-300 ease-out"
                  style={{ width: `${aiProgress}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
              <span>⚡</span> Highly optimized AI synthesis takes approx. 10-15 seconds.
            </div>
          </div>
        </div>
      ) : preview ? (
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
            className="comparison-slider relative w-full h-[400px] sm:h-[480px] overflow-hidden rounded-2xl bg-[#090e1a] cursor-ew-resize select-none border border-[#1e2a45] shadow-2xl"
          >
            <img
              src={`/uploads/${imagePath}`}
              alt="Original Exterior"
              className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
            />
            <div
              className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none border-r border-amber-400"
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
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-amber-400 border-4 border-slate-950 text-slate-950 font-black rounded-full shadow-2xl flex items-center justify-center text-sm transform hover:scale-110 active:scale-95 transition-all">
                ⟷
              </div>
            </div>
            <div className="absolute top-4 left-4 bg-slate-950/80 border border-slate-800 text-white text-[11px] font-extrabold tracking-wider uppercase px-3 py-1.5 rounded-lg z-10 backdrop-blur-sm shadow-md">
              Original Photo
            </div>
            <div className="absolute top-4 right-4 bg-amber-400 border border-amber-500 text-slate-950 text-[11px] font-black tracking-wider uppercase px-3 py-1.5 rounded-lg z-10 shadow-md">
              Redesigned Preview
            </div>
          </div>

          <div className="flex items-center justify-center">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-all duration-200"
            >
              🔄 Refresh Preview Overlay
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-[#0e1726]/40 rounded-2xl border border-slate-800/80 max-w-md mx-auto shadow-xl backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-3xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            ✨
          </div>
          <h3 className="text-white font-black text-xl mb-1.5 tracking-tight">Ready to generate your preview</h3>
          <p className="text-slate-400 text-xs mb-6 max-w-xs mx-auto leading-relaxed">
            Click below to instantly apply chosen premium materials to each mapped exterior facade using smart design overlays.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating || assignedCount === 0}
            className="px-6 py-3 rounded-xl text-xs font-black tracking-wider uppercase text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 active:scale-98 shadow-lg shadow-amber-500/20 transition-all duration-200 disabled:opacity-30"
          >
            {generating ? 'Generating Visual Preview...' : 'Generate Visual Preview →'}
          </button>
        </div>
      )}

      {assignedCount > 0 && (
        <div className="bg-[#0f172a]/50 backdrop-blur-sm rounded-2xl border border-slate-800 p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h4 className="text-white font-extrabold text-sm tracking-wide">Renovation Surface Details</h4>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
              {assignedCount} surfaces mapped
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regions.filter((r) => r.selected_material).map((r) => {
              const mat = materials.find((m) => String(m.id) === r.selected_material)
              return (
                <div key={r.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-900 rounded-xl px-4 py-3 hover:border-slate-800 transition-all duration-150">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[mat?.category || 'paint'] || 'rgba(245, 166, 35, 0.75)' }}
                    />
                    <span className="text-slate-300 text-xs font-semibold capitalize">{r.type}</span>
                  </div>
                  <span className="text-amber-400 text-xs font-extrabold bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
                    {mat?.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-800/80 pt-6">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 hover:text-white hover:bg-slate-800 transition-all"
        >
          ← Back to Material Catalog
        </button>
        <button
          onClick={onContinue}
          className="px-6 py-3 rounded-xl text-xs font-black tracking-wider uppercase text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 active:scale-98 shadow-lg shadow-amber-500/10 transition-all duration-200"
        >
          View Cost Estimate & PDF →
        </button>
      </div>
    </div>
  )
}
