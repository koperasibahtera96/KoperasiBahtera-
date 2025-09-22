"use client";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { Button } from "@/components/ui-finance/button";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Eye,
  Mail,
  Phone,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import Link from "next/link";

import { Input } from "@/components/ui-staff/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui-staff/select";
import { Checkbox } from "@/components/ui-staff/checkbox";

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  investments: {
    plantId: string;
    plantName: string;
    amount: number;
    profit: number;
    roi: number;
    investDate: string;
    investmentId: string;
  }[];
  totalInvestment: number;
  totalProfit: number;
  overallROI: number;
};

/* ===== util format angka untuk UI saja ===== */
const toID = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString("id-ID") : "";
const fromID = (s: string) => {
  if (!s) return 0;
  const clean = s.replace(/[^\d-]/g, "");
  const num = Number(clean);
  return Number.isFinite(num) ? num : 0;
};

/* ===== toast mini (UI) ===== */
type Toast = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message?: string;
};
function ToastBox({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  if (!toast.open) return null;
  const isSuccess = toast.type === "success";
  return (
    <div className="fixed top-4 right-4 z-[60]">
      <div
        className={`flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg border ${
          isSuccess
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-red-50 border-red-200 text-red-900"
        }`}
      >
        <div className="mt-0.5">
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div className="pr-6">
          <div className="font-semibold">{toast.title}</div>
          {toast.message ? (
            <div className="text-sm opacity-90">{toast.message}</div>
          ) : null}
        </div>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 rounded-md p-1 hover:bg-black/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ==================== Bulk Finance Bar ==================== */
function BulkFinanceBar() {
  const [plantType, setPlantType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<
    { instanceId: string; memberName: string; memberId: string }[]
  >([]);
  const [rows, setRows] = useState<
    {
      instanceId: string;
      income: number;
      expense: number;
      note: string;
      checked: boolean;
    }[]
  >([]);

  // UI states: input atas (string terformat) + toast
  const [bulkIncomeStr, setBulkIncomeStr] = useState("");
  const [bulkExpenseStr, setBulkExpenseStr] = useState("");
  const [toast, setToast] = useState<Toast>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const showToast = (t: Omit<Toast, "open">) => {
    setToast({ open: true, ...t });
    // auto close
    setTimeout(() => setToast((s) => ({ ...s, open: false })), 2500);
  };

  const allChecked = rows.length > 0 && rows.every((r) => r.checked);
  const someChecked = rows.some((r) => r.checked) && !allChecked;

  const toggleAll = () => {
    const next = !allChecked;
    setRows((prev) => prev.map((r) => ({ ...r, checked: next })));
  };

  const applyAll = (
    field: "income" | "expense" | "note",
    value: number | string
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.checked ? { ...r, [field]: value } : r))
    );
  };

  const fetchInstances = async (pt: string) => {
    if (!pt) return;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/manajemen-anggota/instances-by-planttype?plantType=${encodeURIComponent(
          pt
        )}`,
        { cache: "no-store" }
      );
      if (!r.ok) throw new Error("gagal load instances");
      const data: {
        items: { instanceId: string; memberName: string; memberId: string }[];
      } = await r.json();
      setInstances(data.items || []);
      setRows(
        (data.items || []).map((x) => ({
          instanceId: x.instanceId,
          income: 0,
          expense: 0,
          note: "",
          checked: true,
        }))
      );
      // reset header inputs
      setBulkIncomeStr("");
      setBulkExpenseStr("");
    } catch (e) {
      console.error(e);
      setInstances([]);
      setRows([]);
      showToast({
        type: "error",
        title: "Gagal memuat instance",
        message: "Coba ganti PlantType atau muat ulang.",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitBulk = async () => {
    const updates = rows
      .filter((r) => r.checked && (r.income > 0 || r.expense > 0))
      .map((r) => ({
        instanceId: r.instanceId,
        income: r.income,
        expense: r.expense,
        note: r.note?.trim() || "Bulk input",
      }));

    if (!plantType || updates.length === 0) {
      showToast({
        type: "error",
        title: "Belum ada data",
        message:
          "Pilih plant type dan centang minimal satu baris dengan nilai > 0.",
      });
      return;
    }

    try {
      const res = await fetch("/api/manajemen-anggota/bulk-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const j = await res.json();
      if (!res.ok) {
        showToast({
          type: "error",
          title: "Gagal menyimpan",
          message: j?.error || j?.details || "Terjadi kesalahan.",
        });
        return;
      }
      const updated = j?.updated ?? j?.results?.length ?? updates.length;
      showToast({
        type: "success",
        title: "Berhasil",
        message: `Berhasil update ${updated} instance.`,
      });
      // Refresh setelah sukses agar data baru terlihat
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 900);
    } catch (e: any) {
      showToast({
        type: "error",
        title: "Gagal menyimpan",
        message: e?.message || "Terjadi kesalahan jaringan.",
      });
    }
  };

  return (
    <>
      <ToastBox toast={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />
      <div className="bg-white/90 dark:bg-gray-800/90 border border-[#324D3E]/10 dark:border-gray-700 rounded-3xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="sm:w-60">
            <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-100 mb-1">
              Pilih PlantType
            </label>
            <Select
              value={plantType}
              onValueChange={(v) => {
                setPlantType(v);
                fetchInstances(v);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih jenis tanaman" />
              </SelectTrigger>
              <SelectContent>
                {/* sesuaikan daftar berikut dengan PlantType di sistemmu */}
                <SelectItem value="alpukat">Alpukat</SelectItem>
                <SelectItem value="aren">Aren</SelectItem>
                <SelectItem value="gaharu">Gaharu</SelectItem>
                <SelectItem value="jengkol">Jengkol</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-100 mb-1">
                Set Pendapatan (semua tercentang)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={bulkIncomeStr}
                onChange={(e) => {
                  const n = fromID(e.target.value);
                  setBulkIncomeStr(n ? toID(n) : "");
                  applyAll("income", n);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-100 mb-1">
                Set Pengeluaran (semua tercentang)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={bulkExpenseStr}
                onChange={(e) => {
                  const n = fromID(e.target.value);
                  setBulkExpenseStr(n ? toID(n) : "");
                  applyAll("expense", n);
                }}
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-[#324D3E] dark:text-gray-100 mb-1">
                Set Catatan (semua tercentang)
              </label>
              <Input
                placeholder="Contoh: Panen minggu 3"
                onChange={(e) => applyAll("note", e.target.value)}
              />
            </div>
            <div className="sm:col-span-4">
              <Button
                className="w-full bg-[#324D3E] hover:bg-[#4C3D19] text-white"
                disabled={loading || !plantType}
                onClick={submitBulk}
              >
                Simpan Bulk
              </Button>
            </div>
          </div>
        </div>

        {/* Tabel Instance + checkbox header & per baris */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#324D3E]/10 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-[#324D3E]/5 dark:bg-gray-700/50">
              <tr>
                <th className="p-3 text-left">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={toggleAll}
                      aria-checked={someChecked ? "mixed" : allChecked}
                    />
                    <span className="font-semibold">✔</span>
                  </div>
                </th>
                <th className="p-3 text-left">Instance</th>
                <th className="p-3 text-left">Anggota</th>
                <th className="p-3 text-left">Pendapatan</th>
                <th className="p-3 text-left">Pengeluaran</th>
                <th className="p-3 text-left">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#324D3E]/10 dark:divide-gray-700 bg-white/80 dark:bg-gray-800/60">
              {instances.map((it, i) => {
                const r = rows[i];
                return (
                  <tr key={it.instanceId}>
                    <td className="p-3">
                      <Checkbox
                        checked={r?.checked ?? false}
                        onCheckedChange={(v: any) =>
                          setRows((prev) => {
                            const copy = [...prev];
                            copy[i] = { ...copy[i], checked: !!v };
                            return copy;
                          })
                        }
                      />
                    </td>
                    <td className="p-3 font-medium">{it.instanceId}</td>
                    <td className="p-3">{it.memberName}</td>
                    <td className="p-3">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={toID(r?.income ?? 0)}
                        onChange={(e) =>
                          setRows((prev) => {
                            const copy = [...prev];
                            copy[i] = {
                              ...copy[i],
                              income: fromID(e.target.value),
                            };
                            return copy;
                          })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={toID(r?.expense ?? 0)}
                        onChange={(e) =>
                          setRows((prev) => {
                            const copy = [...prev];
                            copy[i] = {
                              ...copy[i],
                              expense: fromID(e.target.value),
                            };
                            return copy;
                          })
                        }
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        value={r?.note ?? ""}
                        placeholder="Catatan baris ini"
                        onChange={(e) =>
                          setRows((prev) => {
                            const copy = [...prev];
                            copy[i] = { ...copy[i], note: e.target.value };
                            return copy;
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="p-4 text-sm text-[#889063] dark:text-gray-300">
              Pilih PlantType terlebih dahulu untuk menampilkan daftar instance.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
/* ================== END BulkFinanceBar ================== */

export default function ManajemenAnggotaPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [_, setError] = useState<string | null>(null);

  const [kpi, setKpi] = useState({
    totalInvestment: 0,
    totalProfit: 0,
    avgROI: 0,
    investors: 0,
    loading: true,
  });

  const membersPerPage = 5;

  // 1) Ambil daftar anggota (bentuk yang dipakai UI)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/investors?format=membersLike", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load investors");
        const data: Member[] = await res.json();
        setMembers(data);
        setError(null);
      } catch (e) {
        console.error(e);
        setError("Gagal memuat data anggota");
        setMembers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) KPI & metrik per-anggota dari summary
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/investors/summary", { cache: "no-store" });
        if (!r.ok) throw new Error("fail summary");
        const d = await r.json();
        if (!alive) return;

        const totals = d?.totals ?? {};
        setKpi({
          totalInvestment: Number(totals.totalInvestment || 0),
          totalProfit: Number(totals.totalProfit || 0),
          avgROI: Number(totals.avgROI || 0),
          investors: Number(totals.membersCount || 0),
          loading: false,
        });

        const arr: Array<{
          id: string;
          totalInvestment: number;
          totalProfit: number;
          roi: number;
        }> = Array.isArray(d?.members)
          ? d.members.map((m: any) => ({
              id: String(m.id || m._id || ""),
              totalInvestment: Number(m.totalInvestment || 0),
              totalProfit: Number(m.totalProfit || 0),
              roi: Number(m.roi || 0),
            }))
          : [];

        if (arr.length) {
          const map = new Map(arr.map((x) => [x.id, x]));
          setMembers((prev) =>
            prev.map((m) => {
              const met = map.get(m.id);
              if (!met) return m;
              return {
                ...m,
                totalInvestment: met.totalInvestment,
                totalProfit: met.totalProfit,
                overallROI: met.roi,
              };
            })
          );
        }
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setKpi((s) => ({ ...s, loading: false }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 3) Perkaya detail per-anggota dari /api/investors/:id (sekali saja -> anti spam)
  const enrichedOnceRef = useRef(false);
  useEffect(() => {
    if (enrichedOnceRef.current) return;
    if (members.length === 0) return;
    (async () => {
      try {
        const resps = await Promise.all(
          members.map((m) =>
            fetch(`/api/investors/${encodeURIComponent(m.id)}`, {
              cache: "no-store",
            })
          )
        );
        const details = await Promise.all(
          resps.map((r) => (r.ok ? r.json() : null))
        );

        setMembers((prev) =>
          prev.map((m, i) => {
            const det = details[i];
            if (!det) return m;

            const detInvs: any[] = Array.isArray(det?.investments)
              ? det.investments
              : [];
            const updated = m.investments.map((iv) => {
              const byId = detInvs.find(
                (x: any) => String(x?.plantInstanceId ?? "") === iv.plantId
              );
              if (!byId) return iv;
              return {
                ...iv,
                profit: Number(byId?.profit || 0),
                roi: Number(byId?.roi || 0),
              };
            });

            return {
              ...m,
              investments: updated,
              totalProfit: Number(det?.totalProfit || m.totalProfit),
              overallROI: Number(det?.overallROI || m.overallROI),
            };
          })
        );
      } catch (e) {
        console.warn("[manajemen-anggota] enrich gagal:", e);
      } finally {
        // kunci supaya efek ini TIDAK jalan berulang-ulang
        enrichedOnceRef.current = true;
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  const totalPages = Math.ceil(members.length / membersPerPage);
  const startIndex = (currentPage - 1) * membersPerPage;
  const currentMembers = members.slice(startIndex, startIndex + membersPerPage);

  return (
    <FinanceSidebar>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href="/finance">
              <motion.button
                className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-all duration-300 self-start"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm sm:text-base">Kembali</span>
              </motion.button>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-2 transition-colors duration-300">
              Manajemen Anggota
            </h1>
            <p className="text-[#889063] dark:text-gray-200 text-sm sm:text-base lg:text-lg transition-colors duration-300">
              Kelola data investor dan kontrak investasi
            </p>
          </div>

          {/* Summary Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-600 animate-pulse transition-colors duration-300"
                >
                  <div className="h-12 w-12 bg-[#324D3E]/20 dark:bg-gray-600/50 rounded-2xl mb-4"></div>
                  <div className="h-4 bg-[#324D3E]/20 rounded-full mb-2"></div>
                  <div className="h-8 bg-[#324D3E]/20 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              <SummaryCard
                title="Total Anggota"
                value={members.length.toString()}
                icon={<Users className="h-5 w-5" />}
                colorClass="text-chart-1"
              />
              <SummaryCard
                title="Total Investasi"
                value={kpi.loading ? "…" : formatCurrency(kpi.totalInvestment)}
                icon={<DollarSign className="h-5 w-5" />}
                colorClass="text-chart-2"
              />
              <SummaryCard
                title="Total Keuntungan"
                value={kpi.loading ? "…" : formatCurrency(kpi.totalProfit)}
                icon={<TrendingUp className="h-5 w-5" />}
                colorClass="text-chart-3"
              />
              <SummaryCard
                title="Rata-rata ROI"
                value={kpi.loading ? "…" : formatPercentage(kpi.avgROI)}
                icon={<BarChart3 className="h-5 w-5" />}
                colorClass="text-chart-4"
              />
            </div>
          )}
        </motion.header>

        {/* === Bulk Input === */}
        <BulkFinanceBar />

        {/* Member List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
              Daftar Anggota ({members.length})
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-colors duration-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-[#889063] dark:text-gray-200 px-2 transition-colors duration-300">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-colors duration-300"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Member Cards */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-600 animate-pulse transition-colors duration-300"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-[#324D3E]/20 rounded-2xl"></div>
                      <div>
                        <div className="h-6 bg-[#324D3E]/20 rounded-full mb-2 w-32"></div>
                        <div className="h-4 bg-[#324D3E]/20 rounded-full w-48"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-16 bg-[#324D3E]/20 rounded-xl"></div>
                      <div className="h-8 w-8 bg-[#324D3E]/20 rounded-xl"></div>
                      <div className="h-8 w-8 bg-[#324D3E]/20 rounded-xl"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {currentMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      </div>
    </FinanceSidebar>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  colorClass,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  colorClass: string;
}) {
  const colors = {
    "text-chart-1": {
      bg: "bg-[#324D3E]/10 dark:bg-[#324D3E]/20",
      text: "text-[#324D3E] dark:text-white",
      hover: "group-hover:bg-[#324D3E]/20 dark:group-hover:bg-[#324D3E]/30",
    },
    "text-chart-2": {
      bg: "bg-green-500/10 dark:bg-green-900/30",
      text: "text-green-600 dark:text-emerald-400",
      hover: "group-hover:bg-green-500/20 dark:group-hover:bg-green-800/40",
    },
    "text-chart-3": {
      bg: "bg-blue-500/10 dark:bg-blue-900/30",
      text: "text-blue-600 dark:text-blue-400",
      hover: "group-hover:bg-blue-500/20 dark:group-hover:bg-blue-800/40",
    },
    "text-chart-4": {
      bg: "bg-purple-500/10 dark:bg-purple-900/30",
      text: "text-purple-600 dark:text-purple-400",
      hover: "group-hover:bg-purple-500/20 dark:group-hover:bg-purple-800/40",
    },
  };

  const color =
    colors[colorClass as keyof typeof colors] || colors["text-chart-1"];

  return (
    <div className="group rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color.bg} ${color.text} ${color.hover} transition-all duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300">
          {title}
        </p>
        <p className="text-2xl font-bold text-[#324D3E] dark:text-white group-hover:text-[#4C3D19] dark:group-hover:text-gray-200 transition-colors duration-300">
          {value}
        </p>
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:border-[#324D3E]/30 dark:hover:border-gray-600 transition-all duration-300">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#324D3E] text-white font-bold text-lg">
            {member.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#324D3E] dark:text-white mb-1 transition-colors duration-300">
              {member.name}
            </h3>
            <div className="flex items-center gap-4 text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {member.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {member.phone}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            asChild
            className="bg-[#324D3E] hover:bg-[#4C3D19] text-white"
          >
            <Link href={`/anggota/${member.id}`} className="gap-2">
              <Eye className="w-4 h-4" />
              Detail
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
            <Calendar className="h-4 w-4" />
            <span>
              Bergabung: {new Date(member.joinDate).toLocaleDateString("id-ID")}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-[#889063] dark:text-gray-200 mb-1 transition-colors duration-300">
              Investasi
            </p>
            <p className="text-lg font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
              {formatCurrency(member.totalInvestment)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#889063] dark:text-gray-200 mb-1 transition-colors duration-300">
              Keuntungan
            </p>
            <p className="text-lg font-bold text-green-600 dark:text-emerald-400 transition-colors duration-300">
              {formatCurrency(member.totalProfit)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#889063] dark:text-gray-200 mb-1 transition-colors duration-300">
              ROI
            </p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">
              {formatPercentage(member.overallROI)}
            </p>
          </div>
        </div>
      </div>

      {/* Investment Details */}
      <div className="bg-[#324D3E]/5 dark:bg-gray-700/50 rounded-2xl p-4 border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300">
        <h4 className="text-sm font-bold text-[#324D3E] dark:text-white mb-3 transition-colors duration-300">
          Portfolio Investasi ({member.investments.length} tanaman)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {member.investments.map((investment, index) => (
            <div
              key={index}
              className="bg-white/80 dark:bg-gray-600/80 backdrop-blur-xl rounded-xl p-3 border border-[#324D3E]/10 dark:border-gray-500 transition-colors duration-300"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
                  {investment.investmentId} - {member.name}
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-400 transition-colors duration-300">
                  {formatPercentage(investment.roi)}
                </span>
              </div>
              <div className="text-xs text-[#889063] dark:text-gray-200 space-y-1 transition-colors duration-300">
                <div>Investasi: {formatCurrency(investment.amount)}</div>
                <div>
                  Profit:{" "}
                  <span className="text-green-600 dark:text-emerald-400 transition-colors duration-300">
                    {formatCurrency(investment.profit)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
