import { useState, useRef, DragEvent } from 'react'
import api from '../../services/api'

interface Props {
  onUploaded: (filename: string) => void
  existingImage?: string
}

export default function ImageUploader({ onUploaded, existingImage }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(existingImage ? `/uploads/${existingImage}` : '')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError('')
    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      setError('Please upload a valid JPG, PNG, or WebP image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file must be under 10MB.')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = URL.createObjectURL(file)
      setPreview(url)
      onUploaded(res.data.filename || res.data.path)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Image upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '8px 0' }}>
      <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 22, fontWeight: 700, color: '#ffffff', margin: '0 0 8px' }}>
        Upload your house exterior photo
      </h2>
      <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' }}>
        Upload a clear, front-facing exterior photo. Our tool will let you map surfaces and try different paint, stone cladding, and textures.
      </p>

      {preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 440, borderRadius: 16, overflow: 'hidden', border: '1px solid #1f2937', background: '#090d16' }}>
            <img
              src={preview}
              alt="House Exterior Preview"
              style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
              onError={() => setError('Failed to load image preview')}
            />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(9,13,22,0.75)',
              opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
            >
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  padding: '8px 20px', background: '#f5a623', color: '#090d16',
                  fontWeight: 700, fontSize: 13, borderRadius: 10, border: 'none', cursor: 'pointer',
                }}
              >
                Change Photo
              </button>
            </div>
          </div>
          <p style={{ color: '#f5a623', fontSize: 12, fontWeight: 700, margin: 0 }}>
            ✓ Photo uploaded successfully. Proceeding to surface mapping...
          </p>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#f5a623' : '#2d3748'}`,
            borderRadius: 18, padding: '48px 32px', cursor: 'pointer',
            background: dragging ? 'rgba(245,166,35,0.06)' : '#0f172a',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            📸
          </div>
          <h3 style={{ fontFamily: 'Outfit, sans-serif', color: '#ffffff', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
            Drag &amp; drop your house exterior photo here
          </h3>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 14px' }}>
            or <span style={{ color: '#f5a623', fontWeight: 600, textDecoration: 'underline' }}>click to browse</span> from your computer
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: '#111827', border: '1px solid #1f2937', color: '#94a3b8', fontSize: 11 }}>
            <span>Formats: JPG, PNG, WebP</span>
            <span>•</span>
            <span>Max Size: 10MB</span>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {uploading && (
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#f5a623', fontSize: 12, fontWeight: 600 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #f5a623', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Uploading image...
        </div>
      )}

      {error && (
        <div style={{ marginTop: 14, display: 'inline-block', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 12, padding: '8px 18px', borderRadius: 10 }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}