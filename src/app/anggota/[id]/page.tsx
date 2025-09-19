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
  Search,
  FileDown,
  RotateCcw, // reset pencarian dropdown
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
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

  // ⬇️ field opsional tambahan untuk kebutuhan ekspor detail
  productName?: string;
  investmentId?: string;
  investmentDate?: string;
  status?: string;
  plantInstanceId?: string;
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

  // ⬇️ untuk No Anggota
  userCode?: string;
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
  contractNumber?: string; // ⬅️ jangan dihapus
  // ⬇️ opsional untuk bantu isi "Tanaman/Produk"
  plantType?: string;

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
export default function MemberDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const { data: session } = useSession();

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

  // 🔎 Pencarian dropdown (klik "Cari" untuk menerapkan)
  const [instanceQueryInput, setInstanceQueryInput] = useState("");
  const [instanceQuery, setInstanceQuery] = useState("");

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

    // Helper agar mulai dari kolom B (kolom A kosong untuk spacing)
    const B = (...cols: any[]) => ["", ...cols];

    // Map bantu untuk cari plantType dari instances
    const plantTypeById = new Map<string, string>();
    instances.forEach((p) => {
      if (p?.id) plantTypeById.set(p.id, (p as any).plantType || "-");
    });

    const wsData: any[][] = [];

    // ====== HEADER ======
    wsData.push(B("LAPORAN DETAIL ANGGOTA"));
    wsData.push(B("")); // spacer

    // ====== DATA PRIBADI ======
    wsData.push(B("Keterangan", "Nilai"));
    wsData.push(B("Nama", member!.name));
    wsData.push(B("No Anggota", member!.userCode || "-"));
    wsData.push(B("Email", member!.email));
    wsData.push(B("Telepon", member!.phone || "-"));
    wsData.push(B("Lokasi", member!.location || "-"));
    wsData.push(
      B(
        "Tanggal Bergabung",
        member!.joinDate
          ? new Date(member!.joinDate).toLocaleDateString("id-ID")
          : "-"
      )
    );

    wsData.push(B("")); // spacer

    // ====== RINGKASAN INVESTASI ======
    wsData.push(B("RINGKASAN INVESTASI"));
    wsData.push(B("Keterangan", "Nilai"));
    wsData.push(B("Total Investasi", member!.totalInvestment));
    wsData.push(B("Total Keuntungan", member!.totalProfit));
    wsData.push(
      B(
        "ROI Keseluruhan",
        `${(
          (member!.totalProfit / (member!.totalInvestment || 1)) *
          100
        ).toFixed(2)}%`
      )
    );
    wsData.push(B("Jumlah Investasi", investments.length));

    wsData.push(B("")); // spacer

    // ====== DETAIL INVESTASI PER TANAMAN (format baru) ======
    wsData.push(B("DETAIL INVESTASI PER TANAMAN"));
    wsData.push(
      B(
        "No",
        "No Anggota",
        "Nama User",
        "Kode Blok/Paket",
        "Tanaman/Produk",
        "Tanggal",
        "Invoice",
        "Jumlah Investasi",
        "Keuntungan",
        "ROI",
        "Status"
      )
    );

    investments.forEach((inv, idx) => {
      const tanggalSrc = inv.investmentDate || inv.investDate;
      const tanggal = tanggalSrc
        ? new Date(tanggalSrc).toLocaleDateString("id-ID")
        : "-";
      const invoice = inv.investmentId || "-";
      const kodePaket = inv.productName || "-";
      const status = inv.status || "Aktif";

      // plantType berdasarkan plantInstanceId -> instances map (fallback "-")
      const tanamanProduk =
        (inv.plantInstanceId && plantTypeById.get(inv.plantInstanceId)) ||
        "-";

      const roiStr = `${(inv.roi ?? 0).toFixed(2)}%`;

      wsData.push(
        B(
          idx + 1,
          member!.userCode || "-",
          member!.name || "-",
          kodePaket,
          tanamanProduk,
          tanggal,
          invoice,
          inv.amount || 0,
          inv.profit || 0,
          roiStr,
          status
        )
      );
    });

    wsData.push(B("")); // spacer

    // ====== LAPORAN BULANAN (tahun sebelumnya) ======
    function pushMonthlyTable(title: string, rows: MonthlyRow[]) {
      wsData.push(B(title));
      wsData.push(B("Bulan", "Pemasukan", "Pengeluaran", "Keuntungan Bersih", "ROI"));
      rows.forEach((r) => {
        const roi = r.income > 0 ? (r.profit / r.income) * 100 : 0;
        const bulanLabel = new Date(r.month + "-01").toLocaleDateString(
          "id-ID",
          { month: "long", year: "numeric" }
        );
        wsData.push(
          B(bulanLabel, r.income, r.expense, r.profit, `${roi.toFixed(2)}%`)
        );
      });
      wsData.push(B("")); // spacer
    }

    pushMonthlyTable(`LAPORAN BULANAN ${prevYear}`, monthlyPrev);
    pushMonthlyTable(`LAPORAN BULANAN ${year}`, monthly);

    const XLSXAny: any = XLSX;
    const ws = XLSXAny.utils.aoa_to_sheet(wsData);

    // Lebarkan kolom agar rapi (ingat ada 1 kolom kosong di A)
    ws["!cols"] = [
      { wch: 2 }, // spacer kolom A
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
    ];

    // Styler
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
    const rowIndex = (label: string) => rows.findIndex((r) => r.includes(label));

    // Judul
    const headerRow = 0;
    styleRange(ws, headerRow, 1, headerRow, 1, {
      font: { ...bold, sz: 14 },
      alignment: center,
    });

    // Tabel "Keterangan | Nilai" (data pribadi)
    const ketRow = rowIndex("|Keterangan|Nilai");
    if (ketRow >= 0)
      styleRange(ws, ketRow, 1, ketRow, 2, {
        font: { ...bold },
        alignment: center,
        border: borderAll,
      });

    // "RINGKASAN INVESTASI"
    const ringkasanRow = rowIndex("|RINGKASAN INVESTASI");
    if (ringkasanRow >= 0)
      styleRange(ws, ringkasanRow, 1, ringkasanRow, 1, { font: { ...bold, sz: 12 } });

    // Header "DETAIL INVESTASI PER TANAMAN"
    const detailRow = rowIndex("|DETAIL INVESTASI PER TANAMAN");
    if (detailRow >= 0)
      styleRange(ws, detailRow, 1, detailRow, 1, { font: { ...bold, sz: 12 } });

    const detailHeader = detailRow + 1;
    styleRange(ws, detailHeader, 1, detailHeader, 11, {
      font: { ...bold },
      alignment: center,
      border: borderAll,
    });

    // Border simpel untuk semua sel berisi
    for (let r = 0; r < wsData.length; r++) {
      for (let c = 1; c < 12; c++) {
        const cell = ws[XLSXAny.utils.encode_cell({ r, c })];
        if (!cell) continue;
        cell.s = { ...(cell.s || {}), border: borderAll };
      }
    }

    XLSXAny.utils.book_append_sheet(wb, ws, "Detail Anggota");
    XLSXAny.writeFile(
      wb,
      `detail-anggota-${(member!.name || "anggota").replace(/\s+/g, "-")}.xlsx`
    );
  }

  // ======== Download Invoice untuk 1 kontrak (kanan) ========
  async function downloadContractInvoice() {
    if (!selectedPlant) return;
    const XLSX = await getXLSX();
    const inst = instances.find((p) => p.id === selectedPlant);
    if (!inst) return;

    const title = `Invoice-${inst.contractNumber || inst.id}`;
    const wb = XLSX.utils.book_new();
    const sheetData: any[][] = [];

    sheetData.push(["", title]);
    sheetData.push(["", ""]);
    sheetData.push(["", "Kontrak", inst.contractNumber || "-"]);
    sheetData.push(["", "Instance", inst.instanceName || "-"]);
    sheetData.push(["", ""]);

    sheetData.push(["", "PEMASUKAN"]);
    sheetData.push(["", "Tanggal", "Deskripsi", "Jumlah"]);
    inst.incomeRecords
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((r) => {
        sheetData.push([
          "",
          new Date(r.date).toLocaleDateString("id-ID"),
          r.description,
          r.amount,
        ]);
      });
    sheetData.push(["", ""]);

    sheetData.push(["", "PENGELUARAN"]);
    sheetData.push(["", "Tanggal", "Deskripsi", "Jumlah"]);
    inst.operationalCosts
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((r) => {
        sheetData.push([
          "",
          new Date(r.date).toLocaleDateString("id-ID"),
          r.description,
          r.amount,
        ]);
      });

    const ws = (XLSX as any).utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 2 }, { wch: 16 }, { wch: 40 }, { wch: 18 }];

    (XLSX as any).utils.book_append_sheet(wb, ws, "Invoice");
    (XLSX as any).writeFile(wb, `${title}.xlsx`);
  }

  // ------ quick add forms ------
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

  // =========================
  // ==== BULK INPUT NEW  ====
  // =========================
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState<"income" | "expense">("income");
  const [bulkDate, setBulkDate] = useState<string>("");
  const [bulkAmount, setBulkAmount] = useState<string>("");
  const [bulkNote, setBulkNote] = useState<string>("");        // untuk income
  const [bulkCategory, setBulkCategory] = useState<string>("Operasional"); // untuk expense
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});

  // Group instances by plantType (untuk checkbox grup: Aren/Jengkol/…)
  const bulkGroups = useMemo(() => {
    const g = new Map<string, InstanceDetail[]>();
    for (const it of instances) {
      const key = (it.plantType ?? "lainnya").toLowerCase();
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(it);
    }
    return Array.from(g.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([plantType, list]) => ({
        plantType,
        list: list.slice().sort((a, b) => (a.instanceName ?? "").localeCompare(b.instanceName ?? "")),
      }));
  }, [instances]);

  const bulkSelectedCount = useMemo(
    () => Object.values(bulkSelected).filter(Boolean).length,
    [bulkSelected]
  );

  function toggleBulkOne(id: string, checked: boolean) {
    setBulkSelected(prev => ({ ...prev, [id]: checked }));
  }
  function toggleBulkGroup(groupKey: string, checked: boolean) {
    setBulkSelected(prev => {
      const clone = { ...prev };
      const grp = bulkGroups.find(g => g.plantType === groupKey);
      if (grp) for (const it of grp.list) clone[it.id] = checked;
      return clone;
    });
  }
  function toggleBulkAll(checked: boolean) {
    setBulkSelected(prev => {
      const clone = { ...prev };
      for (const it of instances) clone[it.id] = checked;
      return clone;
    });
  }

// ganti seluruh fungsi submitBulk dengan versi ini
async function submitBulk() {
  try {
    const ids = Object.entries(bulkSelected)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .filter((k) => /^[0-9a-fA-F]{24}$/.test(k)); // pastikan ObjectId valid

    if (ids.length === 0) {
      showError("Peringatan", "Pilih minimal satu tanaman/kontrak terlebih dahulu.");
      return;
    }
    const amt = Number(bulkAmount.replace(/\./g, ""));
    if (!amt || amt <= 0) {
      showError("Peringatan", "Nominal harus lebih dari 0.");
      return;
    }

    const res = await fetch("/api/finance/bulk-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: bulkType,
        plantInstanceIds: ids,
        amount: amt,
        date: bulkDate || undefined,
        note: bulkType === "income" ? (bulkNote || "Pemasukan (bulk)") : undefined,
        category: bulkType === "expense" ? (bulkCategory || "Operasional") : undefined,
        createdBy: member?.name || "system", // ⬅️ penting: sama seperti input manual
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Gagal menyimpan data bulk.");

    setBulkAmount("");
    setBulkNote("");
    await fetchDetail(year);
  } catch (e: any) {
    showError("Error", e?.message ?? "Terjadi kesalahan saat bulk input.");
  }
}


  if (loading)
    return (
      <FinanceSidebar>
        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] dark:border-white mx-auto mb-4"></div>
            <p className="text-[#889063] dark:text-gray-200 text-lg">
              Memuat data anggota...
            </p>
          </div>
        </div>
      </FinanceSidebar>
    );

  if (error || !member)
    return (
      <FinanceSidebar>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400 text-lg mb-4">
              {error || "Anggota tidak ditemukan."}
            </p>
            <Link
              href="/manajemen-anggota"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#324D3E] text-white rounded-xl hover:bg-[#4C3D19]"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Link>
          </div>
        </div>
      </FinanceSidebar>
    );

  // filter dropdown berdasarkan query yang dikonfirmasi (klik tombol cari)
  const filteredInstances =
    instanceQuery.trim() === ""
      ? instances
      : instances.filter((p) => {
          const key = `${p.contractNumber || ""} ${p.instanceName || ""}`.toLowerCase();
          return key.includes(instanceQuery.toLowerCase());
        });

  return (
    <FinanceSidebar>
      <AlertComponent />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header atas */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link href="/manajemen-anggota">
            <motion.button
              className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/90 dark:bg-gray-800/90 rounded-xl sm:rounded-2xl shadow-lg border border-[#324D3E]/10 text-[#324D3E] dark:text-white hover:bg-[#324D3E] hover:text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm sm:text-base">Kembali</span>
            </motion.button>
          </Link>

        <motion.button
            onClick={exportXLSX}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-white shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download className="w-4 h-4" /> Download
          </motion.button>
        </motion.div>

        {/* Identitas */}
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#324D3E] grid place-items-center text-lg font-semibold text-white">
              {member.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="flex-1">
              <div className="text-xl sm:text-2xl font-semibold text-[#324D3E] dark:text-white">
                {member.name}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[#889063] dark:text-gray-200 mt-2">
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
                    Bergabung: {new Date(member.joinDate).toLocaleDateString("id-ID")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg hover:shadow-xl hover:scale-105"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[#889063]">Total Investasi</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#324D3E]/10 text-[#324D3E]">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#324D3E]">{formatCurrency(totals.invest)}</div>
          </motion.div>

          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg hover:shadow-xl hover:scale-105"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[#889063]">Total Keuntungan</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 text-green-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.profit)}</div>
          </motion.div>
          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg hover:shadow-xl hover:scale-105"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-[#889063]">ROI</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totals.roi.toFixed(1)}%</div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="text-lg font-semibold mb-4 text-[#324D3E]">Distribusi Investasi</div>
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
            className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-[#324D3E]">Ringkasan Bulanan</div>
              <select
                className="border border-[#324D3E]/20 rounded-xl px-3 py-2 text-sm bg-white/80"
                value={year}
                onChange={(e) => fetchDetail(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, k) => new Date().getFullYear() - k).map((y) => (
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
                  <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#10b981" fillOpacity={1} fill="url(#i1)" />
                  <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#ef4444" fillOpacity={1} fill="url(#i2)" />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" fillOpacity={1} fill="url(#i3)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Tabel bulanan */}
        <motion.div
          className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-[#324D3E]">Tabel Bulanan</div>
            <select
              className="border border-[#324D3E]/20 rounded-xl px-3 py-2 text-sm bg-white/80"
              value={year}
              onChange={(e) => fetchDetail(Number(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, k) => new Date().getFullYear() - k).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#324D3E]/10">
                  <th className="text-left py-3 text-[#324D3E] font-semibold">Bulan</th>
                  <th className="text-right py-3 text-[#324D3E] font-semibold">Pemasukan</th>
                  <th className="text-right py-3 text-[#324D3E] font-semibold">Pengeluaran</th>
                  <th className="text-right py-3 text-[#324D3E] font-semibold">Keuntungan Bersih</th>
                  <th className="text-right py-3 text-[#324D3E] font-semibold">ROI</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((r, idx) => {
                  const roi = r.income > 0 ? (r.profit / r.income) * 100 : 0;
                  const label = new Date(r.month + "-01").toLocaleDateString("id-ID", {
                    month: "long",
                    year: "numeric",
                  });
                  return (
                    <tr
                      key={r.month}
                      className={`border-b border-[#324D3E]/5 ${idx % 2 === 0 ? "bg-white/40" : "bg-[#324D3E]/5"}`}
                    >
                      <td className="py-3 text-[#324D3E]">{label}</td>
                      <td className="py-3 text-right text-green-600 font-medium">
                        {formatCurrency(r.income)}
                      </td>
                      <td className="py-3 text-right text-red-600 font-medium">
                        {formatCurrency(r.expense)}
                      </td>
                      <td className="py-3 text-right text-blue-600 font-medium">
                        {formatCurrency(r.profit)}
                      </td>
                      <td className="py-3 text-right text-[#324D3E] font-medium">
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
          className="bg-white/90 dark:bg-gray-800/90 rounded-3xl p-6 border border-[#324D3E]/10 shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="text-lg font-semibold mb-4 text-[#324D3E]">Kelola Keuangan</div>

          {/* ======== (NEW) Toggle Bulk Input ======== */}
          <div className="rounded-2xl border border-[#324D3E]/10 p-4 mb-6 bg-white/70">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-[#324D3E]">Bulk Input Keuangan</div>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#324D3E]/20 hover:bg-[#324D3E] hover:text-white"
                onClick={() => setBulkOpen(v => !v)}
              >
                {bulkOpen ? "Sembunyikan" : "Tampilkan"}
              </button>
            </div>

            {bulkOpen && (
              <div className="mt-4 grid gap-6">
                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <select
                    className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as "income" | "expense")}
                  >
                    <option value="income">Pendapatan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>

                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                  />

                  <input
                    value={bulkAmount}
                    onChange={(e) => {
                      const formatted = formatNumber(e.target.value);
                      setBulkAmount(formatted);
                    }}
                    placeholder="Nominal (IDR)"
                    inputMode="numeric"
                    className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                  />

                  {bulkType === "income" ? (
                    <input
                      value={bulkNote}
                      onChange={(e) => setBulkNote(e.target.value)}
                      placeholder="Catatan (opsional)"
                      className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                    />
                  ) : (
                    <input
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      placeholder="Kategori (Operasional/Pupuk/...)"
                      className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                    />
                  )}

                  <button
                    onClick={submitBulk}
                    className="rounded-xl border border-[#324D3E]/20 px-3 py-2 text-sm bg-[#324D3E] text-white disabled:opacity-50"
                    disabled={!bulkAmount || bulkSelectedCount === 0}
                    title="Tambahkan ke semua yang tercentang"
                  >
                    Tambahkan ke {bulkSelectedCount} tanaman
                  </button>
                </div>

                {/* Checklist grouped by plantType */}
                <div className="rounded-xl border border-[#324D3E]/10 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-[#324D3E]">Pilih Tanaman / Kontrak</div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="opacity-70">Dipilih: <b>{bulkSelectedCount}</b></span>
                      <button
                        className="underline"
                        onClick={() => toggleBulkAll(true)}
                      >
                        Pilih semua
                      </button>
                      <span className="opacity-40">|</span>
                      <button
                        className="underline"
                        onClick={() => toggleBulkAll(false)}
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-4">
                    {bulkGroups.map((g) => (
                      <div key={g.plantType} className="rounded-lg border border-[#324D3E]/10 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold capitalize text-[#324D3E]">{g.plantType}</div>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              className="underline"
                              onClick={() => toggleBulkGroup(g.plantType, true)}
                            >
                              Pilih {g.plantType}
                            </button>
                            <span className="opacity-40">|</span>
                            <button
                              className="underline"
                              onClick={() => toggleBulkGroup(g.plantType, false)}
                            >
                              Hapus {g.plantType}
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {g.list.map((it) => (
                            <label key={it.id} className="flex items-center gap-2 rounded-lg border border-[#324D3E]/10 p-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!bulkSelected[it.id]}
                                onChange={(e) => toggleBulkOne(it.id, e.target.checked)}
                              />
                              <span className="text-sm">
                                {it.contractNumber ? `${it.contractNumber} ` : ""}({it.instanceName})
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {bulkGroups.length === 0 && (
                      <div className="text-sm opacity-70">Tidak ada PlantInstance.</div>
                    )}
                  </div>
                </div>

                <div className="text-xs opacity-70">
                  Aksi ini <b>menambahkan</b> {bulkType === "income" ? "pendapatan" : "pengeluaran"} dengan nominal yang sama ke semua tanaman yang dicentang.
                  Data lain tidak diubah. (Ditandai <code>source: &quot;bulk&quot;</code> pada record.)
                </div>
              </div>
            )}
          </div>
          {/* ======== END Bulk Input ======== */}

          {/* Bar kontrol: Search ➜ Cari ➜ Reset ➜ Select ➜ Download Invoice (paling kanan) */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 gap-3 mb-4">
            <div className="flex items-center gap-2 w-full lg:max-w-md">
              <input
                value={instanceQueryInput}
                onChange={(e) => setInstanceQueryInput(e.target.value)}
                placeholder="Cari kontrak / nama instance"
                className="w-full border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
              />
              <button
                onClick={() => setInstanceQuery(instanceQueryInput.trim())}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#324D3E]/20 hover:bg-[#324D3E] hover:text-white"
                title="Cari"
              >
                <Search className="w-4 h-4" />
                Cari
              </button>
              {/* RESET PENCARIAN */}
              <button
                onClick={() => {
                  setInstanceQueryInput("");
                  setInstanceQuery("");
                }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#324D3E]/20 hover:bg-[#324D3E] hover:text-white"
                title="Reset pencarian"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="flex-1 border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
            >
              <option value="">Pilih Tanaman / Kontrak</option>
              {filteredInstances.length === 0 && (
                <option value="" disabled>
                  Tidak ada hasil
                </option>
              )}
              {filteredInstances.map((p, index) => (
                <option key={`${p.id}-${p.contractNumber}-${index}`} value={p.id}>
                  {p.contractNumber} ({p.instanceName})
                </option>
              ))}
            </select>

            <button
              onClick={downloadContractInvoice}
              disabled={!selectedPlant}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#324D3E] to-[#4C3D19] disabled:opacity-50 px-4 py-2 text-sm font-medium text-white shadow-lg"
              title="Download invoice kontrak ini"
            >
              <FileDown className="w-4 h-4" />
              Download Invoice
            </button>
          </div>

          {!selectedPlant ? (
            <div className="text-sm text-[#889063]">Pilih tanaman terlebih dahulu.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pemasukan side */}
              <div className="rounded-2xl border border-[#324D3E]/10 dark:border-gray-600/30 p-4 bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl transition-colors duration-300">
                {/* Hide income form for staff-finance users */}
                {session?.user?.role !== 'staff_finance' && (
                  <>
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
                        onChange={(e) => setIncForm((f) => ({ ...f, date: e.target.value }))}
                        className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                      />
                      <input
                        value={incForm.description}
                        onChange={(e) => setIncForm((f) => ({ ...f, description: e.target.value }))}
                        className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                        placeholder="Deskripsi"
                      />
                      <input
                        value={incForm.amount}
                        onChange={(e) => {
                          const formatted = formatNumber(e.target.value);
                          setIncForm((f) => ({ ...f, amount: formatted }));
                        }}
                        className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                        placeholder="Jumlah"
                        inputMode="numeric"
                      />
                      <button className="rounded-xl border border-[#324D3E]/20 px-3 py-2 text-sm hover:bg-[#324D3E] hover:text-white">
                        Simpan
                      </button>
                    </form>
                  </>
                )}

                <div className="font-medium mb-2 text-[#324D3E] dark:text-white transition-colors duration-300">
                  Riwayat Pemasukan
                </div>
                <IncomeHistory plantId={selectedPlant} userRole={session?.user?.role} />
              </div>

              {/* Pengeluaran side */}
              <div className="rounded-2xl border border-[#324D3E]/10 dark:border-gray-600/30 p-4 bg-white/60 dark:bg-gray-700/60 backdrop-blur-xl transition-colors duration-300">
                {/* Hide expense form for staff-finance users */}
                {session?.user?.role !== 'staff_finance' && (
                  <>
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
                        onChange={(e) => setExpForm((f) => ({ ...f, date: e.target.value }))}
                        className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                      />
                      <input
                        value={expForm.description}
                        onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))}
                        className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                        placeholder="Deskripsi"
                      />
                      <input
                        value={expForm.amount}
                        onChange={(e) => {
                          const formatted = formatNumber(e.target.value);
                          setExpForm((f) => ({ ...f, amount: formatted }));
                        }}
                        className="border border-[#324D3E]/20 rounded-xl px-3 py-2 bg-white/80"
                        placeholder="Jumlah"
                        inputMode="numeric"
                      />
                      <button className="rounded-xl border border-[#324D3E]/20 px-3 py-2 text-sm hover:bg-[#324D3E] hover:text-white">
                        Simpan
                      </button>
                    </form>
                  </>
                )}

                <div className="font-medium mb-2 text-[#324D3E] dark:text-white transition-colors duration-300">
                  Riwayat Pengeluaran
                </div>
                <ExpenseHistory plantId={selectedPlant} userRole={session?.user?.role} />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </FinanceSidebar>
  );
}
