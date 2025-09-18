"use client";

import { ChevronLeft, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

type IncomeRecord = {
  id: string;
  date: string;
  description: string;
  amount: number;
  addedBy?: string;
  addedAt?: string;
};

type Pagination = {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export default function IncomeHistory({
  plantId,
  userRole,
}: {
  plantId: string;
  userRole?: string;
}) {
  const [list, setList] = useState<IncomeRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [month, setMonth] = useState<string>("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<IncomeRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // GRAND TOTAL (semua halaman)
  const [grandTotal, setGrandTotal] = useState<number>(0);

  const load = async (p = page, m = month) => {
    const monthParam = m ? `&month=${m}` : "";
    const res = await fetch(
      `/api/plants/${plantId}/income?page=${p}&limit=5${monthParam}`
    );
    if (res.ok) {
      const json = await res.json();
      setList(json.records || []);
      setPagination(json.pagination || null);
    }
  };

  const loadTotal = async (m = month) => {
    const monthParam = m ? `?month=${m}` : "";
    const res = await fetch(
      `/api/plants/${plantId}/income/total${monthParam}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      const j = await res.json();
      setGrandTotal(Number(j?.total || 0));
    } else {
      setGrandTotal(0);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load(1, month);
    loadTotal(month);
    setPage(1);
  }, [month]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load(page, month);
  }, [page, month]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load(1, month);
    loadTotal(month);
  }, [plantId]); // ganti plant

  const canEdit = userRole !== "staff_finance";

  const onSave = async () => {
    await fetch(`/api/plants/${plantId}/income/${editing?.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    load();
    loadTotal();
  };

  const onDelete = async () => {
    if (!deleting) return;
    await fetch(`/api/plants/${plantId}/income/${deleting}`, {
      method: "DELETE",
    });
    setDeleting(null);
    load();
    loadTotal();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-lg font-semibold text-[#324D3E] dark:text-white flex items-center gap-2">
          <Plus className="w-5 h-5" /> Riwayat Pemasukan
        </h4>
        <div className="flex gap-2 items-center">
          <span className="text-[#889063] dark:text-gray-200 text-sm">
            Filter Bulan:
          </span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white px-3 py-2 rounded-xl text-sm border border-[#324D3E]/20 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40"
          >
            <option value="">Semua Bulan</option>
            {[
              "01",
              "02",
              "03",
              "04",
              "05",
              "06",
              "07",
              "08",
              "09",
              "10",
              "11",
              "12",
            ].map((m, i) => (
              <option key={m} value={m}>
                {new Date(2000, i, 1).toLocaleDateString("id-ID", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-[#889063] dark:text-gray-200 text-center py-8 bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl rounded-2xl border border-[#324D3E]/10 dark:border-gray-600/30">
          Belum ada pemasukan untuk investasi ini
        </p>
      ) : (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-[#324D3E]/10 dark:border-gray-700 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[#324D3E]/10 dark:border-gray-600/30 bg-[#324D3E]/5 dark:bg-gray-700/20">
                  <th className="text-left py-3 px-4 text-[#324D3E] dark:text-white font-semibold">
                    Tanggal
                  </th>
                  <th className="text-left py-3 px-4 text-[#324D3E] dark:text-white font-semibold">
                    Deskripsi
                  </th>
                  <th className="text-right py-3 px-4 text-[#324D3E] dark:text-white font-semibold">
                    Jumlah
                  </th>
                  {canEdit && (
                    <th className="text-center py-3 px-4 text-[#324D3E] dark:text-white font-semibold">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {list.map((income: IncomeRecord, index: number) => (
                  <tr
                    key={income.id}
                    className={`border-b border-[#324D3E]/5 dark:border-gray-600/20 ${
                      index % 2 === 0
                        ? "bg-white/40 dark:bg-gray-700/20"
                        : "bg-[#324D3E]/5 dark:bg-gray-700/40"
                    } hover:bg-[#324D3E]/10 dark:hover:bg-gray-600/40 transition-colors duration-200`}
                  >
                    <td className="py-3 px-4 text-[#324D3E] dark:text-white">
                      {new Date(income.date).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-[#324D3E] dark:text-white">
                      {income.description}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600 dark:text-emerald-400 font-medium">
                      {fmtIDR(income.amount)}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => setEditing(income)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(income.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 bg-[#324D3E]/5 dark:bg-gray-700/20 border-t border-[#324D3E]/10 dark:border-gray-600/30 flex justify-between items-center">
              <span className="text-[#889063] dark:text-gray-200 text-sm">
                Halaman {pagination.currentPage} dari {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="p-2 bg-white/80 dark:bg-gray-700/80 hover:bg-[#324D3E] dark:hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-[#324D3E] dark:text-white rounded-xl transition-all duration-200 border border-[#324D3E]/20 dark:border-gray-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  className="p-2 bg-white/80 dark:bg-gray-700/80 hover:bg-[#324D3E] dark:hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-[#324D3E] dark:text-white rounded-xl transition-all duration-200 border border-[#324D3E]/20 dark:border-gray-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="p-4 bg-[#324D3E]/5 dark:bg-gray-700/20 border-t border-[#324D3E]/10 dark:border-gray-600/30">
            <div className="flex justify-between items-center">
              <span className="text-[#324D3E] dark:text-white font-medium">
                Total Pemasukan:
              </span>
              <span className="text-green-600 dark:text-emerald-400 font-bold text-lg">
                {fmtIDR(grandTotal)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit */}
      {canEdit && editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md border border-[#324D3E]/10 dark:border-gray-700 shadow-2xl">
            <h3 className="text-lg font-bold text-[#324D3E] dark:text-white mb-4">
              Edit Pemasukan
            </h3>
            <div className="space-y-4">
              <Row label="Deskripsi">
                <input
                  className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl border border-[#324D3E]/20 dark:border-gray-600 rounded-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40"
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </Row>
              <Row label="Jumlah (Rp)">
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl border border-[#324D3E]/20 dark:border-gray-600 rounded-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40"
                  value={editing.amount}
                  onChange={(e) =>
                    setEditing({ ...editing, amount: Number(e.target.value) })
                  }
                />
              </Row>
              <Row label="Tanggal">
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl border border-[#324D3E]/20 dark:border-gray-600 rounded-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40"
                  value={editing.date}
                  onChange={(e) =>
                    setEditing({ ...editing, date: e.target.value })
                  }
                />
              </Row>
              <div className="flex gap-3">
                <button
                  onClick={onSave}
                  className="flex-1 px-4 py-2 bg-[#324D3E] hover:bg-[#4C3D19] text-white rounded-xl font-medium transition-all duration-200"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 px-4 py-2 bg-[#324D3E]/10 dark:bg-gray-700/50 hover:bg-[#324D3E]/20 dark:hover:bg-gray-600/50 text-[#324D3E] dark:text-white rounded-xl font-medium transition-all duration-200"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal delete */}
      {canEdit && deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/95 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md border border-[#324D3E]/10 dark:border-gray-700 shadow-2xl">
            <h3 className="text-lg font-bold text-[#324D3E] dark:text-white mb-4">
              Konfirmasi Hapus
            </h3>
            <p className="text-[#889063] dark:text-gray-200 mb-6">
              Apakah Anda yakin ingin menghapus pemasukan ini?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-all duration-200"
              >
                Hapus
              </button>
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 px-4 py-2 bg-[#324D3E]/10 dark:bg-gray-700/50 hover:bg-[#324D3E]/20 dark:hover:bg-gray-600/50 text-[#324D3E] dark:text-white rounded-xl font-medium transition-all duration-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#324D3E] dark:text-white mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}
