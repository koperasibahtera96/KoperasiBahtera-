// app/manajemen-anggota/page.tsx
"use client";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

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
  Search as SearchIcon,
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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [plantType, setPlantType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<
    {
      instanceId: string;
      contractNumber?: string;
      memberName: string;
      memberId: string;
      blok?: string | null;
      kavling?: string | null;
    }[]
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

  // user login name for addedBy
  const [currentUserName, setCurrentUserName] = useState<string>("");

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
    setTimeout(() => setToast((s) => ({ ...s, open: false })), 2500);
  };

  useEffect(() => {
    setMounted(true);
    // Ambil nama user login (optional, aman bila endpoint tidak ada)
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          const nm =
            j?.name ||
            j?.user?.name ||
            j?.profile?.name ||
            j?.data?.name ||
            "";
          if (nm) setCurrentUserName(String(nm));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Theme-aware helper function
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
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

  // === DI-UBAH: enrich Kav/Blok via /api/kv ===
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
        items: {
          instanceId: string;
          contractNumber?: string;
          memberName: string;
          memberId: string;
        }[];
      } = await r.json();

      const baseItems = data.items || [];

      // enrich kav/blok dari /api/kv (sama seperti di laporan-harian)
      let enriched = baseItems.map((x) => ({ ...x, blok: null as any, kavling: null as any }));
      if (baseItems.length) {
        const idsParam = baseItems.map((x) => x.instanceId).join(",");
        const kvRes = await fetch(`/api/manajemen-anggota/kv?ids=${encodeURIComponent(idsParam)}`, {
          cache: "no-store",
        });
        if (kvRes.ok) {
          const kvJson: {
            items: { instanceId: string; blok: string | null; kavling: string | null }[];
          } = await kvRes.json();
          const kvMap = new Map(
            (kvJson.items || []).map((k) => [String(k.instanceId), k])
          );
          enriched = baseItems.map((x) => {
            const hit = kvMap.get(String(x.instanceId));
            return { ...x, blok: hit?.blok ?? null, kavling: hit?.kavling ?? null };
          });
        }
      }

      setInstances(enriched);
      setRows(
        enriched.map((x) => ({
          instanceId: x.instanceId,
          income: 0,
          expense: 0,
          note: "",
          checked: true,
        }))
      );

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
        // addedBy dari user login (UI only; server boleh abaikan bila tidak dipakai)
        addedBy: currentUserName || undefined,
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

  // Apakah perlu scroll untuk daftar bulk (>4 baris)?
  const needScroll = instances.length > 4;

  return (
    <>
      <ToastBox
        toast={toast}
        onClose={() => setToast((s) => ({ ...s, open: false }))}
      />

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
              <SelectTrigger
                className={getThemeClasses(
                  "w-full bg-white dark:bg-gray-700 border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white",
                  "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d]"
                )}
              >
                <SelectValue placeholder="Pilih jenis tanaman" />
              </SelectTrigger>
              <SelectContent
                className={getThemeClasses(
                  "bg-white dark:bg-gray-700 border-[#324D3E]/20 dark:border-gray-600",
                  "!bg-white/95 !border-[#FFC1CC]/30"
                )}
              >
                {/* sesuaikan daftar berikut dengan PlantType di sistemmu */}
                <SelectItem
                  value="alpukat"
                  className={getThemeClasses(
                    "text-[#324D3E] dark:text-white hover:bg-[#324D3E]/10 dark:hover:bg-gray-600",
                    "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                  )}
                >
                  Alpukat
                </SelectItem>
                <SelectItem
                  value="aren"
                  className={getThemeClasses(
                    "text-[#324D3E] dark:text-white hover:bg-[#324D3E]/10 dark:hover:bg-gray-600",
                    "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                  )}
                >
                  Aren
                </SelectItem>
                <SelectItem
                  value="gaharu"
                  className={getThemeClasses(
                    "text-[#324D3E] dark:text-white hover:bg-[#324D3E]/10 dark:hover:bg-gray-600",
                    "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                  )}
                >
                  Gaharu
                </SelectItem>
                <SelectItem
                  value="jengkol"
                  className={getThemeClasses(
                    "text-[#324D3E] dark:text-white hover:bg-[#324D3E]/10 dark:hover:bg-gray-600",
                    "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                  )}
                >
                  Jengkol
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 sm:items-end">
            <div>
              <label className="text-sm font-medium text-[#324D3E] dark:text-gray-100 mb-1 min-h-[2.5rem] flex items-end">
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
              <label className="text-sm font-medium text-[#324D3E] dark:text-gray-100 mb-1 min-h-[2.5rem] flex items-end">
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
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-[#324D3E] dark:text-gray-100 mb-1 min-h-[2.5rem] flex items-end">
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
        <div
          className={`mt-4 overflow-x-auto rounded-xl border border-[#324D3E]/10 dark:border-gray-700 ${
            instances.length > 4 ? "max-h-[360px] overflow-y-auto" : ""
          }`}
        >
          <table className="min-w-full text-sm">
            <thead className="bg-[#324D3E]/5 dark:bg-gray-700/50 sticky top-0 z-10">
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
                <th className="p-3 text-left">INV</th>
                <th className="p-3 text-left">Kav/Blok</th>
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
                    <td className="p-3 font-medium">
                      {it.contractNumber || it.instanceId}
                    </td>
                    <td className="p-3">
                      {(it.kavling ?? "-") + " / " + (it.blok ?? "-")}
                    </td>
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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [_, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Theme-aware helper function
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const [kpi, setKpi] = useState({
    totalInvestment: 0,
    totalProfit: 0,
    avgROI: 0,
    investors: 0,
    loading: true,
  });

  // ========= NEW: search anggota =========
  const [memberQuery, setMemberQuery] = useState("");

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
        enrichedOnceRef.current = true;
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  // ===== Filter by search name =====
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberQuery.trim().toLowerCase())
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / membersPerPage)
  );
  const startIndex = (currentPage - 1) * membersPerPage;
  const currentMembers = filteredMembers.slice(
    startIndex,
    startIndex + membersPerPage
  );

  // reset page jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [memberQuery]);

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
                className={getThemeClasses(
                  "group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-all duration-300 self-start",
                  "!bg-white/95 !border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC] hover:!text-white"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-sm sm:text-base">Kembali</span>
              </motion.button>
            </Link>
          </div>

          <div className="mb-6">
            <h1
              className={getThemeClasses(
                "text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white mb-2 transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              Manajemen Anggota
            </h1>
            <p
              className={getThemeClasses(
                "text-[#889063] dark:text-gray-200 text-sm sm:text-base lg:text-lg transition-colors duration-300",
                "!text-[#6b7280]"
              )}
            >
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

        {/* ======= Pembatas UI (garis + spasi) sebelum Bulk ======= */}
        <div className="border-t border-[#324D3E]/10 dark:border-gray-700 my-2" />

        {/* === Bulk Input === */}
        <BulkFinanceBar />

        {/* Member List */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2
              className={getThemeClasses(
                "text-xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              Daftar Anggota ({filteredMembers.length})
            </h2>

            {/* Search anggota by name */}
            <div className="relative w-full max-w-xs">
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Cari nama anggota…"
                className="pl-9"
              />
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
            <>
              <div className="space-y-4">
                {currentMembers.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
                {currentMembers.length === 0 && (
                  <div className="text-sm text-[#889063] dark:text-gray-300">
                    Tidak ada anggota yang cocok dengan pencarian.
                  </div>
                )}
              </div>

              {/* ===== Pagination dipindah ke bawah ===== */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className={getThemeClasses(
                    "border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-colors duration-300",
                    "!border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC] hover:!text-white"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span
                  className={getThemeClasses(
                    "text-sm text-[#889063] dark:text-gray-200 px-2 transition-colors duration-300",
                    "!text-[#6b7280]"
                  )}
                >
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className={getThemeClasses(
                    "border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-colors duration-300",
                    "!border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC] hover:!text-white"
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </>
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
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  const colors = {
    "text-chart-1": {
      bg:
        mounted && theme === "pink"
          ? "bg-[#FFC1CC]"
          : "bg-[#324D3E]/10 dark:bg-[#324D3E]/20",
      text:
        mounted && theme === "pink"
          ? "text-black"
          : "text-[#324D3E] dark:text-white",
      hover:
        mounted && theme === "pink"
          ? "group-hover:bg-[#4c1d1d]"
          : "group-hover:bg-[#324D3E]/20 dark:group-hover:bg-[#324D3E]/30",
    },
    "text-chart-2": {
      bg:
        mounted && theme === "pink"
          ? "bg-[#B5EAD7]"
          : "bg-green-500/10 dark:bg-green-900/30",
      text:
        mounted && theme === "pink"
          ? "text-black"
          : "text-green-600 dark:text-emerald-400",
      hover:
        mounted && theme === "pink"
          ? "group-hover:bg-[#059669]"
          : "group-hover:bg-green-500/20 dark:group-hover:bg-green-800/40",
    },
    "text-chart-3": {
      bg:
        mounted && theme === "pink"
          ? "bg-[#C7CEEA]"
          : "bg-blue-500/10 dark:bg-blue-900/30",
      text:
        mounted && theme === "pink"
          ? "text-black"
          : "text-blue-600 dark:text-blue-400",
      hover:
        mounted && theme === "pink"
          ? "group-hover:bg-[#7c3aed]"
          : "group-hover:bg-blue-500/20 dark:group-hover:bg-blue-800/40",
    },
    "text-chart-4": {
      bg:
        mounted && theme === "pink"
          ? "bg-[#FFF5BA]"
          : "bg-purple-500/10 dark:bg-purple-900/30",
      text:
        mounted && theme === "pink"
          ? "text-black"
          : "text-purple-600 dark:text-purple-400",
      hover:
        mounted && theme === "pink"
          ? "group-hover:bg-[#d97706]"
          : "group-hover:bg-purple-500/20 dark:group-hover:bg-purple-800/40",
    },
  };

  const color =
    colors[colorClass as keyof typeof colors] || colors["text-chart-1"];

  return (
    <div
      className={getThemeClasses(
        "group rounded-3xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
        "!bg-white/95 !border-[#FFC1CC]/30"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color.bg} ${color.text} ${color.hover} transition-all duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      <div className="space-y-2">
        <p
          className={getThemeClasses(
            "text-sm font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300",
            "!text-[#6b7280]"
          )}
        >
          {title}
        </p>
        <p
          className={getThemeClasses(
            "text-2xl font-bold text-[#324D3E] dark:text-white group-hover:text-[#4C3D19] dark:group-hover:text-gray-200 transition-colors duration-300",
            "!text-[#4c1d1d] group-hover:!text-[#6b7280]"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function MemberCard({ member }: { member: Member }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  return (
    <div
      className={getThemeClasses(
        "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:border-[#324D3E]/30 dark:hover:border-gray-600 transition-all duration-300",
        "!bg-white/95 !border-[#FFC1CC]/30 hover:!border-[#FFC1CC]/50"
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className={getThemeClasses(
              "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#324D3E] text-white font-bold text-lg",
              "!bg-[#FFC1CC] !text-black"
            )}
          >
            {member.name.charAt(0)}
          </div>
          <div>
            <h3
              className={getThemeClasses(
                "text-xl font-bold text-[#324D3E] dark:text-white mb-1 transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              {member.name}
            </h3>
            <div
              className={getThemeClasses(
                "flex items-center gap-4 text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300",
                "!text-[#6b7280]"
              )}
            >
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
            className={getThemeClasses(
              "bg-[#324D3E] hover:bg-[#4C3D19] text-white",
              "!bg-[#FFC1CC] hover:!bg-[#4c1d1d] !text-black hover:!text-white"
            )}
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
          <div
            className={getThemeClasses(
              "flex items-center gap-2 text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300",
              "!text-[#6b7280]"
            )}
          >
            <Calendar className="h-4 w-4" />
            <span>
              Bergabung: {new Date(member.joinDate).toLocaleDateString("id-ID")}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p
              className={getThemeClasses(
                "text-sm font-medium text-[#889063] dark:text-gray-200 mb-1 transition-colors duration-300",
                "!text-[#6b7280]"
              )}
            >
              Investasi
            </p>
            <p
              className={getThemeClasses(
                "text-lg font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              {formatCurrency(member.totalInvestment)}
            </p>
          </div>
          <div>
            <p
              className={getThemeClasses(
                "text-sm font-medium text-[#889063] dark:text-gray-200 mb-1 transition-colors duration-300",
                "!text-[#6b7280]"
              )}
            >
              Keuntungan
            </p>
            <p
              className={getThemeClasses(
                "text-lg font-bold text-green-600 dark:text-emerald-400 transition-colors duration-300",
                "!text-[#059669]"
              )}
            >
              {formatCurrency(member.totalProfit)}
            </p>
          </div>
          <div>
            <p
              className={getThemeClasses(
                "text-sm font-medium text-[#889063] dark:text-gray-200 mb-1 transition-colors duration-300",
                "!text-[#6b7280]"
              )}
            >
              ROI
            </p>
            <p
              className={getThemeClasses(
                "text-lg font-bold text-blue-600 dark:text-blue-400 transition-colors durataion-300",
                "!text-[#7c3aed]"
              )}
            >
              {formatPercentage(member.overallROI)}
            </p>
          </div>
        </div>
      </div>

      {/* Investment Details */}
      <div
        className={getThemeClasses(
          "bg-[#324D3E]/5 dark:bg-gray-700/50 rounded-2xl p-4 border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
          "!bg-[#FFC1CC]/10 !border-[#FFC1CC]/30"
        )}
      >
        <h4
          className={getThemeClasses(
            "text-sm font-bold text-[#324D3E] dark:text-white mb-3 transition-colors durataion-300",
            "!text-[#4c1d1d]"
          )}
        >
          Portfolio Investasi ({member.investments.length} tanaman)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {member.investments.map((investment, index) => (
            <div
              key={index}
              className={getThemeClasses(
                "bg-white/80 dark:bg-gray-600/80 backdrop-blur-xl rounded-xl p-3 border border-[#324D3E]/10 dark:border-gray-500 transition-colors duration-300",
                "!bg-white/90 !border-[#FFC1CC]/30"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={getThemeClasses(
                    "text-sm font-medium text-[#324D3E] dark:text-white transition-colors durataion-300",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {investment.investmentId} - {member.name}
                </span>
                <span
                  className={getThemeClasses(
                    "text-xs text-blue-600 dark:text-blue-400 transition-colors durataion-300",
                    "!text-[#7c3aed]"
                  )}
                >
                  {formatPercentage(investment.roi)}
                </span>
              </div>
              <div
                className={getThemeClasses(
                  "text-xs text-[#889063] dark:text-gray-200 space-y-1 transition-colors durataion-300",
                  "!text-[#6b7280]"
                )}
              >
                <div>Investasi: {formatCurrency(investment.amount)}</div>
                <div>
                  Profit:{" "}
                  <span
                    className={getThemeClasses(
                      "text-green-600 dark:text-emerald-400 transition-colors durataion-300",
                      "!text-[#059669]"
                    )}
                  >
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
