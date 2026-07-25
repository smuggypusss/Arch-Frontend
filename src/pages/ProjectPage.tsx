import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../services/api'
import ImageUploader from '../components/upload/ImageUploader'
import RegionCanvas from '../components/regions/RegionCanvas'
import MaterialCatalog from '../components/materials/MaterialCatalog'
import BeforeAfter from '../components/visualization/BeforeAfter'
import CostBreakdown from '../components/cost/CostBreakdown'

interface Region {
  id: string
  type: string
  polygon: { x: number; y: number }[]
  area_sqft: number | null
  selected_material: string | null
  notes: string
}

interface Project {
  id: number
  name: string
  original_image: string
  regions: Region[]
  generated_image: string | null
  cost_estimate: any
  status: string
}

const STEPS = ['Upload Photo', 'Map Surfaces', 'Pick Materials', 'Visual Preview', 'Cost Breakdown']
const STEP_STATUS = ['draft', 'regions_mapped', 'materials_selected', 'visualized', 'completed']

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagePath, setImagePath] = useState('')
  const [materials, setMaterials] = useState<any[]>([])

  useEffect(() => {
    api.get('/materials')
      .then((r) => setMaterials(r.data))
      .catch((err) => console.error('Failed to load materials:', err))
  }, [])

  useEffect(() => {
    if (id && id !== 'new') {
      api.get(`/projects/${id}`).then((r) => {
        setProject(r.data)
        setImagePath(r.data.original_image)
        const stepIdx = STEP_STATUS.indexOf(r.data.status)
        setActiveStep(stepIdx >= 0 ? stepIdx : 0)
      }).catch((err) => {
        console.error('Failed to fetch project:', err)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [id])

  const saveProject = useCallback(async (updates: any) => {
    if (saving) return
    setSaving(true)
    try {
      if (project?.id) {
        const res = await api.put(`/projects/${project.id}`, updates)
        setProject(res.data)
        return res.data
      } else {
        const payload: any = {
          name: updates.name || 'My Exterior Renovation',
          original_image: updates.original_image || imagePath,
        }
        // Include status if provided (e.g. advancing to regions_mapped after upload)
        if (updates.status) payload.status = updates.status
        const res = await api.post('/projects', payload)
        setProject(res.data)
        // Don't navigate — stay on current page so activeStep isn't reset
        return res.data
      }
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }, [project, saving, imagePath, navigate])

  const handleImageUploaded = async (filename: string) => {
    setImagePath(filename)
    await saveProject({ name: 'My Exterior Renovation', original_image: filename, status: 'regions_mapped' })
    setActiveStep(1)
  }

  const handleRegionsUpdated = async (regions: Region[]) => {
    await saveProject({ regions, status: 'regions_mapped' })
  }

  const handleMaterialAssigned = async (regionId: string, materialId: string | null) => {
    if (!project) return
    const updated = (project.regions || []).map((r) =>
      r.id === regionId ? { ...r, selected_material: materialId } : r
    )
    const allAssigned = updated.length > 0 && updated.every((r) => r.selected_material)
    await saveProject({
      regions: updated,
      status: allAssigned ? 'materials_selected' : 'regions_mapped',
    })
  }

  const handleVisualizationGenerated = async (generatedImage: string) => {
    await saveProject({ generated_image: generatedImage, status: 'visualized' })
  }

  const handleCostEstimated = async (estimate: any) => {
    await saveProject({ cost_estimate: estimate, status: 'completed' })
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ height: 40, width: 320, background: '#1f2937', borderRadius: 8, marginBottom: 20 }} />
        <div style={{ height: 450, background: '#111827', border: '1px solid #1f2937', borderRadius: 18 }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', minHeight: 'calc(100vh - 3.5rem)' }}>

      {/* Back & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/dashboard"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: '#111827', border: '1px solid #1f2937',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#cbd5e1', textDecoration: 'none', fontSize: 14, fontWeight: 700,
            }}
            title="Back to Dashboard"
          >
            ←
          </Link>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {project?.name || 'New Renovation Plan'}
            </h1>
            <p style={{ fontSize: 11, color: saving ? '#f5a623' : '#64748b', margin: 0 }}>
              {saving ? 'Saving changes...' : 'All changes saved automatically'}
            </p>
          </div>
        </div>
      </div>

      {/* Step Wizard */}
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 14, padding: '14px 20px', marginBottom: 24, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 580 }}>
          {STEPS.map((label, i) => {
            const isCompleted = i < activeStep
            const isActive = i === activeStep
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <button
                  onClick={() => i <= activeStep && setActiveStep(i)}
                  disabled={i > activeStep}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 700,
                    border: 'none', cursor: i <= activeStep ? 'pointer' : 'not-allowed',
                    background: isCompleted ? 'rgba(16,185,129,0.2)' : isActive ? '#f5a623' : '#1f2937',
                    color: isCompleted ? '#10b981' : isActive ? '#090d16' : '#64748b',
                    outline: isCompleted ? '2px solid #10b981' : 'none',
                  }}
                >
                  {isCompleted ? '✓' : i + 1}
                </button>
                <div style={{ marginLeft: 10, marginRight: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, margin: 0, color: isActive ? '#f5a623' : isCompleted ? '#10b981' : '#64748b' }}>
                    Step {i + 1}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', color: isActive ? '#ffffff' : isCompleted ? '#e2e8f0' : '#64748b' }}>
                    {label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: isCompleted ? '#10b981' : '#1f2937', margin: '0 8px', flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Container */}
      <div style={{ position: 'relative', background: '#111827', border: '1px solid #1f2937', borderRadius: 20, padding: '28px 32px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        {activeStep === 0 && (
          <ImageUploader onUploaded={handleImageUploaded} existingImage={imagePath} />
        )}
        {activeStep === 1 && (
          <RegionCanvas
            imagePath={imagePath}
            regions={project?.regions || []}
            onRegionsChange={handleRegionsUpdated}
            onContinue={() => setActiveStep(2)}
          />
        )}
        {activeStep === 2 && project && (
          <MaterialCatalog
            regions={project.regions || []}
            materials={materials}
            imagePath={imagePath}
            onAssign={handleMaterialAssigned}
            onBack={() => setActiveStep(1)}
            onContinue={() => setActiveStep(3)}
          />
        )}
        {activeStep === 3 && project && (
          <BeforeAfter
            imagePath={imagePath}
            regions={project.regions || []}
            materials={materials}
            generatedImage={project.generated_image}
            onGenerated={handleVisualizationGenerated}
            onBack={() => setActiveStep(2)}
            onContinue={() => setActiveStep(4)}
          />
        )}
        {activeStep === 4 && project && (
          <CostBreakdown
            regions={project.regions || []}
            materials={materials}
            estimate={project.cost_estimate}
            onEstimate={handleCostEstimated}
            onBack={() => setActiveStep(3)}
            projectName={project.name}
          />
        )}

        {/* Saving indicator */}
        {saving && (
          <div style={{
            position: 'absolute', top: 12, right: 16,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)',
            borderRadius: 999, padding: '4px 12px', fontSize: 11, color: '#f5a623', fontWeight: 600,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5a623', display: 'inline-block', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }} />
            Saving...
          </div>
        )}
      </div>
    </div>
  )
}