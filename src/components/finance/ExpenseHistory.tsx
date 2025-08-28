"use client"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Edit, Trash2, X } from "lucide-react"

const fmtIDR = (n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Math.round(n))

export default function ExpenseHistory({ plantId }: { plantId: string }) {
  const [list, setList] = useState<any[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [month, setMonth] = useState<string>("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async (p = page, m = month) => {
    const monthParam = m ? `&month=${m}` : ""
    const res = await fetch(`/api/plants/${plantId}/costs?page=${p}&limit=5${monthParam}`)
    if (res.ok) {
      const json = await res.json()
      setList(json.records || [])
      setPagination(json.pagination || null)
    }
  }

  useEffect(() => { load(1, month); setPage(1) }, [month])
  useEffect(() => { load(page, month) }, [page])
  useEffect(() => { load(1, month) }, [plantId])

  const onSave = async () => {
    await fetch(`/api/plants/${plantId}/costs/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    })
    setEditing(null)
    load()
  }
  const onDelete = async () => {
    if (!deleting) return
    await fetch(`/api/plants/${plantId}/costs?costId=${deleting}`, { method: "DELETE" })
    setDeleting(null)
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-lg font-semibold text-red-400 flex items-center gap-2">
          <X className="w-5 h-5" /> Riwayat Pengeluaran
        </h4>
        <div className="flex gap-2 items-center">
          <span className="text-slate-400 text-sm">Filter Bulan:</span>
          <select value={month} onChange={(e)=>setMonth(e.target.value)}
            className="bg-slate-700 text-white px-3 py-1 rounded text-sm border border-slate-600 focus:outline-none">
            <option value="">Semua Bulan</option>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m,i)=>(
              <option key={m} value={m}>{new Date(2000,i,1).toLocaleDateString("id-ID",{month:"long"})}</option>
            ))}
          </select>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-slate-400 text-center py-8 bg-slate-700 rounded-xl">Belum ada pengeluaran untuk investasi ini</p>
      ) : (
        <div className="bg-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600 bg-slate-600">
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Tanggal</th>
                  <th className="text-left py-3 px-4 text-slate-300 font-medium">Deskripsi</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-medium">Jumlah</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium">Kategori</th>
                  <th className="text-center py-3 px-4 text-slate-300 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((cost:any)=>(
                  <tr key={cost.id} className="border-b border-slate-600 hover:bg-slate-600">
                    <td className="py-3 px-4 text-white">{new Date(cost.date).toLocaleDateString("id-ID")}</td>
                    <td className="py-3 px-4 text-white">{cost.description}</td>
                    <td className="py-3 px-4 text-right text-red-400 font-medium">{fmtIDR(cost.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs">
                        {cost.category || "Operasional"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={()=>setEditing(cost)} className="p-1 text-blue-400 hover:text-blue-300 hover:bg-slate-600 rounded" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={()=>setDeleting(cost.id)} className="p-1 text-red-400 hover:text-red-300 hover:bg-slate-600 rounded" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination?.totalPages > 1 && (
            <div className="p-4 bg-slate-600 border-t border-slate-500 flex justify-between items-center">
              <span className="text-slate-300 text-sm">Halaman {pagination.currentPage} dari {pagination.totalPages}</span>
              <div className="flex gap-2">
                <button onClick={()=>setPage(p=>Math.max(1, p-1))} disabled={!pagination.hasPrevPage}
                  className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={()=>setPage(p=>p+1)} disabled={!pagination.hasNextPage}
                  className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-600 border-t border-slate-500">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-medium">Total Pengeluaran:</span>
              <span className="text-red-400 font-bold text-lg">{fmtIDR(list.reduce((s,x)=>s+x.amount,0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Edit Pengeluaran</h3>
            <div className="space-y-4">
              <Row label="Deskripsi">
                <input className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  value={editing.description} onChange={(e)=>setEditing({...editing, description:e.target.value})}/>
              </Row>
              <Row label="Jumlah (Rp)">
                <input type="number" className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  value={editing.amount} onChange={(e)=>setEditing({...editing, amount:Number(e.target.value)})}/>
              </Row>
              <Row label="Tanggal">
                <input type="date" className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  value={editing.date} onChange={(e)=>setEditing({...editing, date:e.target.value})}/>
              </Row>
              <Row label="Kategori">
                <input className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  value={editing.category || ""} onChange={(e)=>setEditing({...editing, category:e.target.value})}/>
              </Row>
              <div className="flex gap-3">
                <button onClick={onSave} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Simpan</button>
                <button onClick={()=>setEditing(null)} className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal delete */}
      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Konfirmasi Hapus</h3>
            <p className="text-slate-300 mb-6">Apakah Anda yakin ingin menghapus pengeluaran ini?</p>
            <div className="flex gap-3">
              <button onClick={onDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Hapus</button>
              <button onClick={()=>setDeleting(null)} className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({label, children}:{label:string; children:React.ReactNode}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      {children}
    </div>
  )
}
