import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { jsPDF } from 'jspdf'

const round = (val: number, decimals: number) => {
  const factor = Math.pow(10, decimals)
  return Math.round(val * factor) / factor
}

interface Region {
  id: string
  type: string
  polygon: { x: number; y: number }[]
  area_sqft: number | null
  selected_material: string | null
  notes: string
}

interface Material {
  _id: string
  name: string
  category: string
  material_rate: number
  labor_rate: number
  coverage_value: number
  coverage_unit: string
  wastage_percent: number
}

interface Props {
  regions: Region[]
  materials: Material[]
  estimate: any
  onEstimate: (estimate: any) => void
  onBack: () => void
  projectName: string
}

export default function CostBreakdown({
  regions,
  materials,
  estimate,
  onEstimate,
  onBack,
  projectName,
}: Props) {
  const [calculating, setCalculating] = useState(false)
  const [areas, setAreas] = useState<Record<string, number>>({})
  const [cost, setCost] = useState<any>(estimate || null)
  const [editableRates, setEditableRates] = useState<Record<string, { mat: number; lab: number }>>({})
  const [ratesChanged, setRatesChanged] = useState(false)

  useEffect(() => {
    if (!estimate) {
      calculateEstimate()
    } else {
      if (estimate.areas) setAreas(estimate.areas)
      const rates: Record<string, { mat: number; lab: number }> = {}
      if (estimate.materials) {
        estimate.materials.forEach((m: any) => {
          rates[m.material_id] = { mat: m.rate, lab: m.rate * 0.3 }
        })
      }
      setEditableRates(rates)
    }
  }, [])

  const calculateEstimate = async () => {
    setCalculating(true)
    try {
      const res = await api.post('/estimate/calculate', {
        regions,
        reference_height_ft: 7,
        reference_pixels: 100,
      })
      setAreas(res.data.areas || {})
      setCost(res.data.cost)
      onEstimate(res.data.cost)

      const rates: Record<string, { mat: number; lab: number }> = {}
      if (res.data.cost?.materials) {
        res.data.cost.materials.forEach((m: any) => {
          rates[m.material_id] = { mat: m.rate, lab: m.rate * 0.3 }
        })
      }
      setEditableRates(rates)
      setRatesChanged(false)
    } catch (err) {
      console.error('Calculation error:', err)
    } finally {
      setCalculating(false)
    }
  }

  // Recalculate subtotals and totals based on editable rates
  const recalculateFromRates = () => {
    if (!cost) return

    const newMaterials = cost.materials.map((m: any) => {
      const newRate = editableRates[m.material_id]?.mat ?? m.rate
      const newTotal = round(m.quantity * newRate, 2)
      return { ...m, rate: newRate, total: newTotal }
    })

    const newLabor = cost.labor.map((l: any) => {
      const matchingMat = cost.materials.find((m: any) =>
        l.category.includes(m.name)
      )
      const newRate = matchingMat
        ? (editableRates[matchingMat.material_id]?.lab ?? l.rate)
        : l.rate
      const originalArea = l.total / l.rate
      const newTotal = round(originalArea * newRate, 2)
      return { ...l, rate: newRate, total: newTotal }
    })

    const matSubtotal = round(
      newMaterials.reduce((s: number, m: any) => s + (m.total || 0), 0),
      2
    )
    const labSubtotal = round(
      newLabor.reduce((s: number, l: any) => s + (l.total || 0), 0),
      2
    )
    const wastage = round(cost.wastage || 0, 2)
    const grandTotal = round(matSubtotal + labSubtotal + wastage, 2)

    const newCost = {
      ...cost,
      materials: newMaterials,
      labor: newLabor,
      grand_total: grandTotal,
    }

    setCost(newCost)
    onEstimate(newCost)
    setRatesChanged(false)
  }

  const handleRateChange = (materialId: string, field: 'mat' | 'lab', value: number) => {
    const newRates = { ...editableRates }
    if (!newRates[materialId]) {
      newRates[materialId] = { mat: 0, lab: 0 }
    }
    newRates[materialId][field] = value
    setEditableRates(newRates)
    setRatesChanged(true)
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(20)
    doc.text('Exterior Renovation Cost Estimate', 20, y)
    y += 10
    doc.setFontSize(12)
    doc.text(`Project: ${projectName}`, 20, y)
    y += 7
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y)
    y += 12

    doc.setFontSize(14)
    doc.text('Material Quantities & Costs', 20, y)
    y += 8
    doc.setFontSize(10)

    if (cost?.materials) {
      cost.materials.forEach((m: any) => {
        doc.text(`${m.name}: ${m.quantity} ${m.unit} x Rs.${m.rate} = Rs.${m.total.toLocaleString()}`, 20, y)
        y += 6
      })
    }

    y += 6
    doc.setFontSize(12)
    doc.text(`Wastage Allowance: Rs.${(cost?.wastage || 0).toLocaleString()}`, 20, y)
    y += 8
    doc.text(`Grand Total Estimate: Rs.${(cost?.grand_total || 0).toLocaleString()}`, 20, y)
    y += 14
    doc.setFontSize(8)
    doc.text('This estimate is advisory and calculated based on user polygon surface area inputs.', 20, y)

    doc.save(`renovation-estimate-${projectName.replace(/\s+/g, '-')}.pdf`)
  }

  // Compute derived totals from current cost state
  const materialSubtotal = useMemo(() => {
    return round(
      (cost?.materials?.reduce((s: number, m: any) => s + (m.total || 0), 0) || 0),
      2
    )
  }, [cost?.materials])

  const laborSubtotal = useMemo(() => {
    return round(
      (cost?.labor?.reduce((s: number, l: any) => s + (l.total || 0), 0) || 0),
      2
    )
  }, [cost?.labor])

  return (
    <div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Cost Breakdown & Quantity Takeoff</h2>
          <p className="text-slate-300 text-xs mt-0.5">
            Automated material quantity calculations and labor estimates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={calculateEstimate}
            disabled={calculating}
            className="btn-secondary px-3.5 py-2 rounded-xl text-xs font-semibold"
          >
            {calculating ? 'Calculating...' : '🔄 Recalculate'}
          </button>
          {ratesChanged && (
            <button
              onClick={recalculateFromRates}
              className="btn-primary px-4 py-2 rounded-xl text-xs font-bold shadow-md"
            >
              ✓ Apply Rate Changes
            </button>
          )}
          <button
            onClick={downloadPDF}
            disabled={!cost}
            className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-30"
          >
            📄 Download PDF Report
          </button>
        </div>
      </div>

      {calculating ? (
        <div className="space-y-3 py-6">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-48 w-full" />
        </div>
      ) : cost ? (
        <div className="space-y-6">
          {/* Surface Area Cards */}
          <div className="bg-[#141d30] rounded-2xl p-5 border border-[#253556]">
            <h3 className="font-display font-bold text-white text-sm mb-3 flex items-center gap-2">
              <span>📏</span> Calculated Surface Areas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(areas).map(([id, area]) => {
                const region = regions.find((r) => r.id === id)
                return (
                  <div key={id} className="bg-[#0b0f19] border border-[#253556] rounded-xl p-3">
                    <p className="text-xs text-slate-300 capitalize font-medium">{region?.type || id}</p>
                    <p className="font-display text-lg font-bold text-amber-400 mt-0.5">
                      {area} <span className="text-[11px] font-normal text-slate-300">sqft</span>
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Material Costs Table */}
          <div className="bg-[#141d30] rounded-2xl p-5 border border-[#253556] overflow-hidden">
            <h3 className="font-display font-bold text-white text-sm mb-3 flex items-center gap-2">
              <span>🧱</span> Material Costs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#253556] text-slate-300 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Calculated Quantity</th>
                    <th className="py-2.5 px-3">Rate (₹/Unit)</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#253556] text-slate-200">
                  {cost.materials?.map((m: any, i: number) => {
                    const editedRate = editableRates[m.material_id]?.mat ?? m.rate
                    const editedTotal = round(m.quantity * editedRate, 2)
                    return (
                      <tr key={i} className="hover:bg-[#1e2a45]">
                        <td className="py-3 px-3 font-semibold text-white">{m.name}</td>
                        <td className="py-3 px-3 text-amber-400 font-bold">
                          {m.quantity} {m.unit}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={editedRate}
                            onChange={(e) =>
                              handleRateChange(m.material_id, 'mat', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 glass-input rounded-lg text-xs font-bold text-amber-300"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-white">
                          ₹{editedTotal.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Labor Costs Table */}
          <div className="bg-[#141d30] rounded-2xl p-5 border border-[#253556] overflow-hidden">
            <h3 className="font-display font-bold text-white text-sm mb-3 flex items-center gap-2">
              <span>👷</span> Labor & Application Costs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#253556] text-slate-300 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Labor Rate (₹/sqft)</th>
                    <th className="py-2.5 px-3 text-right">Labor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#253556] text-slate-200">
                  {cost.labor?.map((l: any, i: number) => {
                    const matchingMat = cost.materials.find((m: any) =>
                      l.category.includes(m.name)
                    )
                    const editedRate = matchingMat
                      ? (editableRates[matchingMat.material_id]?.lab ?? l.rate)
                      : l.rate
                    const originalArea = l.total / l.rate
                    const editedTotal = round(originalArea * editedRate, 2)
                    return (
                      <tr key={i} className="hover:bg-[#1e2a45]">
                        <td className="py-3 px-3 font-semibold text-white capitalize">{l.category}</td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={editedRate}
                            onChange={(e) => {
                              if (matchingMat) {
                                handleRateChange(matchingMat.material_id, 'lab', parseFloat(e.target.value) || 0)
                              }
                            }}
                            disabled={!matchingMat}
                            className="w-20 px-2 py-1 glass-input rounded-lg text-xs font-bold text-amber-300 disabled:opacity-50"
                          />
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-white">
                          ₹{editedTotal.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grand Totals Summary Card */}
          <div className="rounded-2xl bg-[#141d30] border border-amber-500/40 p-6 shadow-xl">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Material Subtotal</span>
                <span className="text-white font-semibold">
                  ₹{materialSubtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Labor & Workmanship Subtotal</span>
                <span className="text-white font-semibold">
                  ₹{laborSubtotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Wastage Allowance</span>
                <span className="text-white font-semibold">
                  ₹{(cost.wastage || 0).toLocaleString()}
                </span>
              </div>

              <div className="pt-3 border-t border-[#253556] flex justify-between items-center">
                <div>
                  <p className="font-display text-lg font-bold text-white">Estimated Grand Total</p>
                  <p className="text-[10px] text-slate-300">Includes materials, labor & wastage buffer</p>
                </div>
                <div className="font-display text-2xl md:text-3xl font-extrabold text-amber-400">
                  ₹{(materialSubtotal + laborSubtotal + (cost.wastage || 0)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic text-center">
            * Note: Estimate is calculated advisory pricing based on user polygon surface area. Final contractor rates may vary based on local site conditions.
          </p>
        </div>
      ) : null}

      {/* Footer Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-[#1e2a45] pt-4">
        <button
          onClick={onBack}
          className="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold"
        >
          ← Back to Visual Preview
        </button>
      </div>
    </div>
  )
}
