"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui-staff/button"
import { Input } from "@/components/ui-staff/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui-staff/select"
import { useAlert } from "@/components/ui/Alert"

type Instance = {
  _id: string
  instanceName?: string
  plantType?: string
}

export default function BulkFinanceInput({
  instances,
  onSuccess,
}: {
  instances: Instance[]
  onSuccess?: () => void
}) {
  const { showAlert } = useAlert()
  const [open, setOpen] = useState(false)

  const [type, setType] = useState<"income" | "expense">("income")
  const [date, setDate] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [note, setNote] = useState<string>("")
  const [category, setCategory] = useState<string>("Operasional")

  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const groups = useMemo(() => {
    const g = new Map<string, Instance[]>()
    for (const it of instances) {
      const key = (it.plantType ?? "Lainnya").toLowerCase()
      if (!g.has(key)) g.set(key, [])
      g.get(key)!.push(it)
    }
    // urutkan nama grup
    return Array.from(g.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([plantType, list]) => ({
        plantType,
        list: list.sort((a, b) => (a.instanceName ?? "").localeCompare(b.instanceName ?? "")),
      }))
  }, [instances])

  const allSelectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  )

  function toggleAllInGroup(groupKey: string, check: boolean) {
    setSelected((prev) => {
      const clone = { ...prev }
      const grp = groups.find((g) => g.plantType === groupKey)
      if (grp) for (const it of grp.list) clone[it._id] = check
      return clone
    })
  }

  function toggleOne(id: string, check: boolean) {
    setSelected((prev) => ({ ...prev, [id]: check }))
  }

  async function submit() {
    try {
      const ids = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k)
      if (ids.length === 0) {
        showAlert("warning", "Error", "Pilih minimal satu tanaman/kontrak dulu.")
        return
      }
      const amt = Number(amount)
      if (!amt || amt <= 0) {
        showAlert("warning", "Error", "Nominal harus > 0",)
        return
      }

      const res = await fetch("/api/finance/bulk-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          plantInstanceIds: ids,
          amount: amt,
          date: date || undefined,
          note: type === "income" ? note : undefined,
          category: type === "expense" ? (category || "Operasional") : undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Gagal menyimpan")

      showAlert("success", "Berhasil ",`Berhasil menambah ${type === "income" ? "pendapatan" : "pengeluaran"} ke ${json.modified ?? ids.length} tanaman.`)
      // reset ringan (pilihan tetap biar enak input berulang)
      setAmount("")
      setNote("")
      if (onSuccess) onSuccess()
    } catch (e: any) {
      showAlert("error", "Error", e.message || "Terjadi kesalahan")
    }
  }

  return (
    <div className="rounded-2xl border p-4 mt-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Bulk Input Keuangan</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">{open ? "Tutup" : "Buka"}</span>
          <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
            {open ? "Sembunyikan" : "Tampilkan"}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-6">
          {/* Form kontrol */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs opacity-70">Jenis Input</label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Pendapatan</SelectItem>
                  <SelectItem value="expense">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs opacity-70">Tanggal</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs opacity-70">Nominal (IDR)</label>
              <Input inputMode="numeric" placeholder="cth: 250000"
                     value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
            </div>
            {type === "income" ? (
              <div className="md:col-span-1">
                <label className="text-xs opacity-70">Catatan (opsional)</label>
                <Input placeholder="Misal: Penjualan panen" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            ) : (
              <div className="md:col-span-1">
                <label className="text-xs opacity-70">Kategori Biaya</label>
                <Input placeholder="Operasional / Pupuk / Transport"
                       value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
            )}
          </div>

          {/* Checklist grouped by plantType */}
          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Pilih Tanaman / Kontrak</div>
              <div className="text-xs opacity-70">
                Dipilih: <b>{allSelectedCount}</b>
              </div>
            </div>
            <div className="mt-3 grid gap-4">
              {groups.map((g) => (
                <div key={g.plantType} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold capitalize">{g.plantType}</div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs underline"
                        onClick={() => toggleAllInGroup(g.plantType, true)}
                      >
                        Pilih semua
                      </button>
                      <span className="opacity-40">|</span>
                      <button
                        className="text-xs underline"
                        onClick={() => toggleAllInGroup(g.plantType, false)}
                      >
                        Hapus semua
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {g.list.map((it) => (
                      <label key={it._id} className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selected[it._id]}
                          onChange={(e) => toggleOne(it._id, e.target.checked)}
                        />
                        <span className="text-sm">{it.instanceName ?? it._id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="text-sm opacity-70">Tidak ada PlantInstance.</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs opacity-70">
              Aksi ini akan menambahkan <b>{type === "income" ? "pendapatan" : "pengeluaran"}</b>
              {" "}ke semua tanaman yang dicentang. (Tidak mengubah record lain.)
            </div>
            <Button onClick={submit} disabled={allSelectedCount === 0 || !amount}>
              Tambahkan ke {allSelectedCount} tanaman
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
