// app/anggota/[id]/page.tsx
"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { useAlert } from "@/components/ui/Alert";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Mail,
  Phone,
  TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

// dynamic import components that already contain month filter + pagination
const IncomeHistory = dynamic(
  () => import("@/components/finance/IncomeHistory"),
  { ssr: false }
);
const ExpenseHistory = dynamic(
  () => import("@/components/finance/ExpenseHistory"),
  { ssr: false }
);

// Lazy import xlsx-js-style only when needed (client side)
let XLSXMod: any;
async function getXLSX() {
  if (XLSXMod) return XLSXMod;
  XLSXMod = await import("xlsx-js-style");
  return XLSXMod as any;
}

type Investment = {
  plantId: string;
  plantName: string;
  amount: number;
  profit: number;
  roi: number;
  investDate: string;
  totalUang?: number;
};
type MemberSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  totalInvestment: number;
  totalProfit: number;
  overallROI: number;
};
type MonthlyRow = {
  month: string;
  income: number;
  expense: number;
  profit: number;
};
type InstanceDetail = {
  id: string;
  instanceName: string;
  incomeRecords: {
    id: string;
    date: string;
    description: string;
    amount: number;
    addedBy?: string;
  }[];
  operationalCosts: {
    id: string;
    date: string;
    description: string;
    amount: number;
    addedBy?: string;
  }[];
};

const PIE_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#A78BFA",
  "#F87171",
  "#34D399",
];

// NOTE: In Next.js 15, params is a Promise in client components.
// We must unwrap with React.use()
export default function MemberDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);

  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [member, setMember] = useState<MemberSummary | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [pie, setPie] = useState<{ name: string; value: number }[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [instances, setInstances] = useState<InstanceDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showError, AlertComponent } = useAlert();

  const [selectedPlant, setSelectedPlant] = useState<string>("");

  async function fetchDetail(targetYear = year) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/investors/${id}?format=rich&year=${targetYear}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to load detail");
      const data = await res.json();
      setMember(data.member);
      setInvestments(data.investments);
      setPie(data.pie);
      setMonthly(data.monthly);
      setInstances(data.instances);
      setYear(data.year);
      setSelectedPlant((p) => p || data.investments?.[0]?.plantId || "");
      setError(null);

      console.log(data, "data fetch detail ivnestor");
    } catch (e) {
      console.error(e);
      setError("Gagal memuat detail anggota");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const totals = useMemo(() => {
    if (!member) return { invest: 0, profit: 0, roi: 0 };
    const invest = member.totalInvestment || 0;
    const profit = member.totalProfit || 0;
    const roi = invest > 0 ? (profit / invest) * 100 : 0;
    return { invest, profit, roi };
  }, [member]);

  // ---------- XLSX Export (styled) ----------
  async function exportXLSX() {
    if (!member) return;
    const XLSX = await getXLSX();
    const prevYear = year - 1;
    const resPrev = await fetch(
      `/api/investors/${id}?format=rich&year=${prevYear}`,
      { cache: "no-store" }
    );
    const dataPrev = resPrev.ok ? await resPrev.json() : null;
    const monthlyPrev: MonthlyRow[] = dataPrev?.monthly || [];

    const wb = XLSX.utils.book_new();
    const borderAll = {
      top: { style: "thin" },
      right: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
    };
    const bold = { bold: true };
    const center = { horizontal: "center", vertical: "center" };

    const wsData: any[][] = [];
    wsData.push(["LAPORAN DETAIL ANGGOTA"]);
    wsData.push([]);
    wsData.push(["Keterangan", "Nilai"]);
    wsData.push(["Nama", member.name]);
    wsData.push(["Email", member.email]);
    wsData.push(["Telepon", member.phone || "-"]);
    wsData.push(["Lokasi", member.location || "-"]);
    wsData.push([
      "Tanggal Bergabung",
      member.joinDate
        ? new Date(member.joinDate).toLocaleDateString("id-ID")
        : "-",
    ]);
    wsData.push([]);
    wsData.push(["RINGKASAN INVESTASI"]);
    wsData.push(["Keterangan", "Nilai"]);
    wsData.push(["Total Investasi", member.totalInvestment]);
    wsData.push(["Total Keuntungan", member.totalProfit]);
    wsData.push([
      "ROI Keseluruhan",
      `${((member.totalProfit / (member.totalInvestment || 1)) * 100).toFixed(
        2
      )}%`,
    ]);
    wsData.push(["Jumlah Investasi", investments.length]);
    wsData.push([]);
    wsData.push(["DETAIL INVESTASI PER TANAMAN"]);
    wsData.push([
      "Nama Tanaman",
      "Jumlah Investasi",
      "Keuntungan",
      "ROI",
      "Status",
    ]);
    investments.forEach((inv) => {
      wsData.push([
        inv.plantName,
        inv.amount,
        inv.profit,
        `${inv.roi.toFixed(2)}%`,
        "Aktif",
      ]);
    });
    wsData.push([]);

    function pushMonthlyTable(title: string, rows: MonthlyRow[]) {
      wsData.push([title]);
      wsData.push([
        "Bulan",
        "Pemasukan",
        "Pengeluaran",
        "Keuntungan Bersih",
        "ROI",
      ]);
      rows.forEach((r) => {
        const roi = r.income > 0 ? (r.profit / r.income) * 100 : 0;
        const bulanLabel = new Date(r.month + "-01").toLocaleDateString(
          "id-ID",
          { month: "long", year: "numeric" }
        );
        wsData.push([
          bulanLabel,
          r.income,
          r.expense,
          r.profit,
          `${roi.toFixed(2)}%`,
        ]);
      });
      wsData.push([]);
    }

    pushMonthlyTable(`LAPORAN BULANAN ${prevYear}`, monthlyPrev);
    pushMonthlyTable(`LAPORAN BULANAN ${year}`, monthly);

    const XLSXAny: any = XLSX;
    const ws = XLSXAny.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 12 },
    ];

    function styleRange(
      s: any,
      r1: number,
      c1: number,
      r2: number,
      c2: number,
      style: any
    ) {
      for (let R = r1; R <= r2; R++) {
        for (let C = c1; C <= c2; C++) {
          const cell = s[XLSXAny.utils.encode_cell({ r: R, c: C })];
          if (!cell) continue;
          cell.s = { ...(cell.s || {}), ...style };
        }
      }
    }

    const rows = wsData.map((row) => (row && row.join("|")) || "");
    const rowIndex = (label: string) =>
      rows.findIndex((r) => r.includes(label));

    const headerRow = 0;
    styleRange(ws, headerRow, 0, headerRow, 0, {
      font: { ...bold, sz: 14 },
      alignment: center,
    });

    const ketRow = rowIndex("Keterangan|Nilai");
    if (ketRow >= 0)
      styleRange(ws, ketRow, 0, ketRow, 1, {
        font: bold,
        alignment: center,
        border: borderAll,
      });

    const ringkasanRow = rowIndex("RINGKASAN INVESTASI");
    if (ringkasanRow >= 0)
      styleRange(ws, ringkasanRow, 0, ringkasanRow, 0, {
        font: { ...bold, sz: 12 },
      });

    const detailRow = rowIndex("DETAIL INVESTASI PER TANAMAN");
    if (detailRow >= 0)
      styleRange(ws, detailRow, 0, detailRow, 0, { font: { ...bold, sz: 12 } });
    const detailHeader = detailRow + 1;
    styleRange(ws, detailHeader, 0, detailHeader, 4, {
      font: bold,
      alignment: center,
      border: borderAll,
    });

    // Borders for whole sheet (simple)
    for (let r = 0; r < wsData.length; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = ws[XLSXAny.utils.encode_cell({ r, c })];
        if (!cell) continue;
        cell.s = { ...(cell.s || {}), border: borderAll };
      }
    }

    XLSXAny.utils.book_append_sheet(wb, ws, "Detail Anggota");
    XLSXAny.writeFile(
      wb,
      `detail-anggota-${member.name.replace(/\s+/g, "-")}.xlsx`
    );
  }

  // ------ quick add forms (selalu tampak) ------
  const [incForm, setIncForm] = useState({
    date: "",
    description: "",
    amount: "",
  });
  const [expForm, setExpForm] = useState({
    date: "",
    description: "",
    amount: "",
  });
  async function submitIncome(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlant) return;
    const body = {
      id: crypto.randomUUID(),
      date: incForm.date || new Date().toISOString().split("T")[0],
      description: incForm.description || "Pemasukan",
      amount: Number(incForm.amount.replace(/\./g, "")) || 0,
      addedBy: member?.name || "system",
      addedAt: new Date().toISOString(),
    };
    const res = await fetch(`/api/plants/${selectedPlant}/income`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setIncForm({ date: "", description: "", amount: "" });
      await fetchDetail(year);
    } else {
      showError("Error", "Gagal menyimpan pemasukan");
    }
  }
  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlant) return;
    const body = {
      id: crypto.randomUUID(),
      date: expForm.date || new Date().toISOString().split("T")[0],
      description: expForm.description || "Pengeluaran",
      amount: Number(expForm.amount.replace(/\./g, "")) || 0,
      addedBy: member?.name || "system",
      addedAt: new Date().toISOString(),
    };
    const res = await fetch(`/api/plants/${selectedPlant}/costs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setExpForm({ date: "", description: "", amount: "" });
      await fetchDetail(year);
    } else {
      showError("Error", "Gagal menyimpan pengeluaran");
    }
  }

  if (loading)
    return (
      <FinanceSidebar>
        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] dark:border-white mx-auto mb-4"></div>
            <p className="text-[#889063] dark:text-gray-200 text-lg transition-colors duration-300">Memuat data anggota...</p>
          </div>
        </div>
      </FinanceSidebar>
    );

  if (error || !member)
    return (
      <FinanceSidebar>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-6 text-center transition-colors duration-300">
            <p className="text-red-600 dark:text-red-400 text-lg mb-4 transition-colors duration-300">
              {error || "Anggota tidak ditemukan."}
            </p>
            <Link
              href="/manajemen-anggota"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#324D3E] text-white rounded-xl hover:bg-[#4C3D19] transition-colors duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Link>
          </div>
        </div>
      </FinanceSidebar>
    );

  return (
    <FinanceSidebar>
      <AlertComponent />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/manajemen-anggota">
            <motion.button
              className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-[#324D3E]/10 dark:border-gray-700 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white transition-all duration-300 self-start"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm sm:text-base">Kembali</span>
            </motion.button>
          </Link>
          <motion.button
            onClick={exportXLSX}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" /> Download
          </motion.button>
        </motion.div>

        {/* Card identitas */}
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#324D3E] grid place-items-center text-lg font-semibold text-white">
              {member.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1">
              <div className="text-xl sm:text-2xl font-semibold text-[#324D3E] dark:text-white transition-colors duration-300">
                {member.name}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#889063] dark:text-gray-200 mt-2 transition-colors duration-300">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {member.email || "-"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {member.phone || "-"}
                </span>
                {member.joinDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Bergabung:{" "}
                    {new Date(member.joinDate).toLocaleDateString("id-ID")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Summary boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">Total Investasi</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#324D3E]/10 dark:bg-[#324D3E]/20 text-[#324D3E] dark:text-white transition-colors duration-300">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300">
              {formatCurrency(totals.invest)}
            </div>
          </motion.div>
          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">Total Keuntungan</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 dark:bg-green-900/30 text-green-600 dark:text-emerald-400 transition-colors duration-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-emerald-400 transition-colors duration-300">
              {formatCurrency(totals.profit)}
            </div>
          </motion.div>
          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">ROI</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors duration-300">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300">
              {totals.roi.toFixed(1)}%
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="text-lg font-semibold mb-4 text-[#324D3E] dark:text-white transition-colors duration-300">
              Distribusi Investasi
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" label>
                    {pie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip formatter={(v: any) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-[#324D3E] dark:text-white transition-colors duration-300">
                Ringkasan Bulanan
              </div>
              <select
                className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300"
                value={year}
                onChange={(e) => fetchDetail(Number(e.target.value))}
              >
                {Array.from(
                  { length: 5 },
                  (_, k) => new Date().getFullYear() - k
                ).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="i1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="i2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="i3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Pemasukan"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#i1)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Pengeluaran"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#i2)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#i3)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Tabel bulanan dengan filter tahun */}
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-[#324D3E] dark:text-white transition-colors duration-300">
              Tabel Bulanan
            </div>
            <select
              className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300"
              value={year}
              onChange={(e) => fetchDetail(Number(e.target.value))}
            >
              {Array.from(
                { length: 5 },
                (_, k) => new Date().getFullYear() - k
              ).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#324D3E]/10 dark:border-gray-600/30 transition-colors duration-300">
                  <th className="text-left py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                    Bulan
                  </th>
                  <th className="text-right py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                    Pemasukan
                  </th>
                  <th className="text-right py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                    Pengeluaran
                  </th>
                  <th className="text-right py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                    Keuntungan Bersih
                  </th>
                  <th className="text-right py-3 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300">
                    ROI
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((r, index) => {
                  const roi = r.income > 0 ? (r.profit / r.income) * 100 : 0;
                  const label = new Date(r.month + "-01").toLocaleDateString(
                    "id-ID",
                    { month: "long", year: "numeric" }
                  );
                  return (
                    <tr
                      key={r.month}
                      className={`border-b border-[#324D3E]/5 dark:border-gray-600/20 transition-colors duration-300 ${
                        index % 2 === 0 ? "bg-white/40 dark:bg-gray-700/20" : "bg-[#324D3E]/5 dark:bg-gray-700/40"
                      }`}
                    >
                      <td className="py-3 text-[#324D3E] dark:text-white transition-colors duration-300">{label}</td>
                      <td className="py-3 text-right text-green-600 dark:text-emerald-400 font-medium transition-colors duration-300">
                        {formatCurrency(r.income)}
                      </td>
                      <td className="py-3 text-right text-red-600 dark:text-red-400 font-medium transition-colors duration-300">
                        {formatCurrency(r.expense)}
                      </td>
                      <td className="py-3 text-right text-blue-600 dark:text-blue-400 font-medium transition-colors duration-300">
                        {formatCurrency(r.profit)}
                      </td>
                      <td className="py-3 text-right text-[#324D3E] dark:text-white font-medium transition-colors duration-300">
                        {roi.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Kelola Keuangan */}
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-6 border border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="text-lg font-semibold mb-4 text-[#324D3E] dark:text-white transition-colors duration-300">
            Kelola Keuangan
          </div>
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300"
            >
              <option value="">Pilih Tanaman</option>
              {instances.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.instanceName} ({p.id})
                </option>
              ))}
            </select>
          </div>

          {!selectedPlant ? (
            <div className="text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300">
              Pilih tanaman terlebih dahulu.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pemasukan side */}
              <div className="rounded-2xl border border-[#324D3E]/10 dark:border-gray-600/30 p-4 bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl transition-colors duration-300">
                <div className="font-medium mb-2 text-[#324D3E] dark:text-white transition-colors duration-300">
                  Tambah Pemasukan
                </div>
                <form
                  onSubmit={submitIncome}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
                >
                  <input
                    type="date"
                    value={incForm.date}
                    onChange={(e) =>
                      setIncForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300"
                  />
                  <input
                    value={incForm.description}
                    onChange={(e) =>
                      setIncForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300"
                    placeholder="Deskripsi"
                  />
                  <input
                    value={incForm.amount}
                    onChange={(e) => {
                      const formatted = formatNumber(e.target.value);
                      setIncForm((f) => ({ ...f, amount: formatted }));
                    }}
                    className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2
                            bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white
                            focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20
                            focus:border-[#324D3E]/40 transition-colors duration-300"
                    placeholder="Jumlah"
                    inputMode="numeric"
                  />
                  <button className="rounded-xl border border-[#324D3E]/20 dark:border-gray-600 px-3 py-2 text-sm hover:bg-[#324D3E] hover:text-white text-[#324D3E] dark:text-white bg-white/20 dark:bg-gray-700/50 backdrop-blur-xl transition-all duration-300">
                    Simpan
                  </button>
                </form>

                <div className="font-medium mb-2 text-[#324D3E] dark:text-white transition-colors duration-300">
                  Riwayat Pemasukan
                </div>
                <IncomeHistory plantId={selectedPlant} />
              </div>

              {/* Pengeluaran side */}
              <div className="rounded-2xl border border-[#324D3E]/10 dark:border-gray-600/30 p-4 bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl transition-colors duration-300">
                <div className="font-medium mb-2 text-[#324D3E] dark:text-white transition-colors duration-300">
                  Tambah Pengeluaran
                </div>
                <form
                  onSubmit={submitExpense}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
                >
                  <input
                    type="date"
                    value={expForm.date}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300"
                  />
                  <input
                    value={expForm.description}
                    onChange={(e) =>
                      setExpForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40 transition-colors duration-300"
                    placeholder="Deskripsi"
                  />
                  <input
                    value={expForm.amount}
                    onChange={(e) => {
                      const formatted = formatNumber(e.target.value);
                      setExpForm((f) => ({ ...f, amount: formatted }));
                    }}
                    className="border border-[#324D3E]/20 dark:border-gray-600 rounded-xl px-3 py-2
                            bg-white/80 dark:bg-gray-700/80 backdrop-blur-xl text-[#324D3E] dark:text-white
                            focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20
                            focus:border-[#324D3E]/40 transition-colors duration-300"
                    placeholder="Jumlah"
                    inputMode="numeric"
                  />
                  <button className="rounded-xl border border-[#324D3E]/20 dark:border-gray-600 px-3 py-2 text-sm hover:bg-[#324D3E] hover:text-white text-[#324D3E] dark:text-white bg-white/20 dark:bg-gray-700/50 backdrop-blur-xl transition-all duration-300">
                    Simpan
                  </button>
                </form>

                <div className="font-medium mb-2 text-[#324D3E] dark:text-white transition-colors duration-300">
                  Riwayat Pengeluaran
                </div>
                <ExpenseHistory plantId={selectedPlant} />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </FinanceSidebar>
  );
}
