// src/components/sidebar/SidebarKpis.tsx
"use client"

import React from "react"

function formatPct(n: number) {
  if (!isFinite(n)) return "0%"
  return `${n.toFixed(1)}%`
}
function formatCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.max(0, Number(n) || 0),
  )
}

type Summary = {
  averageRoi: number
  aum: number
}

export default function SidebarKpis() {
  const [roiAvg, setRoiAvg] = React.useState(0)
  const [aum, setAum] = React.useState(0)

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/finance/summary", { cache: "no-store" })
        if (!res.ok) return
        const data: Summary = await res.json()
        setRoiAvg(data.averageRoi || 0)
        setAum(data.aum || 0)
      } catch {}
    })()
  }, [])

  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      <div className="rounded-md bg-muted px-3 py-2">
        <div className="text-xs text-emerald-500 font-semibold leading-tight">ROI Rata-rata</div>
        <div className="text-lg font-bold">{formatPct(roiAvg)}</div>
      </div>
      <div className="rounded-md bg-muted px-3 py-2">
        <div className="text-xs text-blue-600 font-semibold leading-tight">Total AUM</div>
        <div className="text-lg font-bold">{formatCompact(aum)}</div>
      </div>
    </div>
  )
}
