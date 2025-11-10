"use client";

import { FinanceSidebar } from "@/components/finance/FinanceSidebar";
import { Button } from "@/components/ui-finance/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui-finance/card";
import { useAlert } from "@/components/ui/Alert";
import type { PlantInstance } from "@/lib/api";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Filter,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import * as React from "react";

/* ⬇️ Tambahan import untuk dropdown & router (UI saja) */
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui-finance/dropdown-menu";
import { useRouter } from "next/navigation";
/* ⬆️ */

const BRUTALIST_COLORS = [
  "#FF6B35",
  "#F7931E",
  "#FFD23F",
  "#06FFA5",
  "#118AB2",
  "#073B4C",
  "#EF476F",
  "#FFB3C6",
];

interface PlantType {
  id: string;
  name: string;
  displayName: string;
}

type AnyRecord = {
  amount: number;
  date: string | Date;
  description?: string;
  addedBy?: string;
  // untuk mode "Semua" agar bisa warnai baris per jenis
  _kind?: "expense" | "income";
  [k: string]: any;
};

export default function LaporanPengeluaranPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [plantInstances, setPlantInstances] = useState<PlantInstance[]>([]);
  const [plantTypes, setPlantTypes] = useState<PlantType[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string>("all");

  // --- NEW: Rentang tanggal ala mutasi bank ---
  const [startDate, setStartDate] = useState<string>(""); // ISO yyyy-mm-dd atau ""
  const [endDate, setEndDate] = useState<string>(""); // ISO yyyy-mm-dd atau ""

  const [loading, setLoading] = useState(true);
  const { showError, AlertComponent } = useAlert();
  const [totalIncomingPaid, setTotalIncomingPaid] = useState(0);
  const [totalPendaftaran, setTotalPendaftaran] = useState(0);
  const { theme, systemTheme } = useTheme();
  const isDark = (theme === "system" ? systemTheme : theme) === "dark";
  const [mounted, setMounted] = React.useState(false);

  /* ⬇️ Router dipakai oleh dropdown */
  const router = useRouter();
  /* ⬆️ */

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Helper theme-aware classes
  const getThemeClasses = (baseClasses: string, pinkClasses: string = "") => {
    if (mounted && theme === "pink" && pinkClasses) {
      return `${baseClasses} ${pinkClasses}`;
    }
    return baseClasses;
  };

  // === Toggle Laporan ===  (TAMBAHAN: "all" jadi default)
  const [mode, setMode] = useState<"all" | "expense" | "income">("all");

  useEffect(() => {
    loadData();
  }, []);

  // Load total amountPaid from daily-incoming-investor (use summary if provided, fallback sum rows)
  async function loadTotalIncomingPaid() {
    try {
      const qs = new URLSearchParams();
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);

      // jangan kirim perPage/page — biarkan backend yang meng-handle pagination / summary
      const url = `/api/daily-incoming-investor${
        qs.toString() ? "?" + qs.toString() : ""
      }`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch daily incoming");
      const json = await res.json();

      let total = 0;
      // prioritas: gunakan summary jika disediakan backend
      if (json?.summary && typeof json.summary.totalSudahDibayar === "number") {
        total = json.summary.totalSudahDibayar;
      } else if (Array.isArray(json.rows) && json.rows.length) {
        total = json.rows.reduce(
          (s: number, r: any) => s + (Number(r?.amountPaid ?? 0) || 0),
          0
        );
      } else if (Array.isArray(json) && json.length) {
        total = json.reduce(
          (s: number, r: any) => s + (Number(r?.amountPaid ?? 0) || 0),
          0
        );
      } else {
        // fallback: jika backend mengembalikan object dengan data prop
        const list = json?.data || json?.items || json?.rows || [];
        if (Array.isArray(list) && list.length) {
          total = list.reduce(
            (s: number, r: any) => s + (Number(r?.amountPaid ?? 0) || 0),
            0
          );
        }
      }

      setTotalIncomingPaid(Math.round(total));
    } catch (e) {
      console.error("loadTotalIncomingPaid:", e);
      setTotalIncomingPaid(0);
    }
  }

  // Load total biaya pendaftaran (registration fees) — prefer summary, fallback sum payments.amount
  async function loadTotalPendaftaran() {
    try {
      const qs = new URLSearchParams();
      if (startDate) qs.set("startDate", startDate);
      if (endDate) qs.set("endDate", endDate);
      const url = `/api/pendaftaran2${qs.toString() ? "?" + qs.toString() : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch pendaftaran");
      const json = await res.json();

      // prefer explicit summary from backend if available
      if (json?.summary) {
        const sum =
          (json.summary as any).totalRegistration ??
          (json.summary as any).totalAmount ??
          (json.summary as any).total ??
          null;
        if (typeof sum === "number") {
          setTotalPendaftaran(Math.round(sum));
          return;
        }
      }

      // normalize list: check payments (invoice proxy), rows, array, data/items
      const list = Array.isArray((json as any).payments)
        ? (json as any).payments
        : Array.isArray((json as any).rows)
        ? (json as any).rows
        : Array.isArray(json)
        ? json
        : json?.data || json?.items || [];

      const total = (list as any[]).reduce((s: number, r: any) => {
        // prioritaskan amount (sesuai DB) lalu fallback ke gross/total/amountPaid
        const v = Number(
          r?.amount ??
            r?.gross_amount ??
            r?.totalAmount ??
            r?.total ??
            r?.amountPaid ??
            0
        );
        return s + (isFinite(v) ? v : 0);
      }, 0);

      setTotalPendaftaran(Math.round(total));
    } catch (e) {
      console.error("loadTotalPendaftaran:", e);
      setTotalPendaftaran(0);
    }
  }

  useEffect(() => {
    // load both totals when date filters change
    loadTotalIncomingPaid();
    loadTotalPendaftaran();
    // reload when filter range changes
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch plant instances for expense/income data
      const plantsResponse = await fetch("/api/plants");
      if (!plantsResponse.ok) throw new Error("Failed to fetch plants");
      const instances = await plantsResponse.json();
      setPlantInstances(instances);

      // Fetch plant types
      try {
        const typesResponse = await fetch("/api/plant-types");
        if (typesResponse.ok) {
          const types = await typesResponse.json();
          setPlantTypes(types);
        } else {
          const uniqueTypes = Array.from(
            new Set(instances.map((plant: PlantInstance) => plant.plantType))
          ).map((type: any) => ({
            id: type,
            name: type,
            displayName: type.charAt(0).toUpperCase() + type.slice(1),
          }));
          setPlantTypes(uniqueTypes);
        }
      } catch {
        const uniqueTypes = Array.from(
          new Set(instances.map((plant: PlantInstance) => plant.plantType))
        ).map((type: any) => ({
          id: type,
          name: type,
          displayName: type.charAt(0).toUpperCase() + type.slice(1),
        }));
        setPlantTypes(uniqueTypes);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setPlantInstances([]);
      setPlantTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("IDR", "Rp");
  };

  // --- Helpers tanggal/range ---
  const toStart = (iso: string) => new Date(`${iso}T00:00:00`);
  const toEnd = (iso: string) => new Date(`${iso}T23:59:59`);

  const inRange = (d: Date) => {
    if (startDate && d < toStart(startDate)) return false;
    if (endDate && d > toEnd(endDate)) return false;
    return true;
  };

  // Ambil semua tanggal dari data terfilter plant & mode saat ini (untuk label Periode & tren bulanan)
  const allRelevantDates: Date[] = useMemo(() => {
    const arr: Date[] = [];
    const modes: Array<"operationalCosts" | "incomeRecords"> =
      mode === "all"
        ? ["operationalCosts", "incomeRecords"]
        : [mode === "expense" ? "operationalCosts" : "incomeRecords"];
    plantInstances
      .filter((p) => selectedPlant === "all" || p.plantType === selectedPlant)
      .forEach((plant) => {
        modes.forEach((pick) => {
          (plant[pick] || []).forEach((rec: AnyRecord) => {
            const d = new Date(rec.date);
            if (inRange(d)) arr.push(d);
          });
        });
      });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantInstances, selectedPlant, mode, startDate, endDate]);

  const getPeriodLabel = () => {
    if (!startDate && !endDate) return "Semua";
    if (allRelevantDates.length === 0 && startDate && endDate) {
      // tetap tampilkan range meski kosong
      const s = new Date(startDate);
      const e = new Date(endDate);
      const sameYear = s.getFullYear() === e.getFullYear();
      return sameYear
        ? `${s.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })} – ${e.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}`
        : `${s.getFullYear()} & ${e.getFullYear()}`;
    }

    const years = Array.from(
      new Set(allRelevantDates.map((d) => d.getFullYear()))
    ).sort();

    if (years.length > 1) {
      // Tampilkan "2024 & 2025" dst
      return years.join(" & ");
    }

    // Satu tahun saja -> tampilkan range tanggal jika keduanya ada
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? new Date(endDate) : null;
    if (s && e) {
      return `${s.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })} – ${e.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
    }
    // Jika hanya salah satu, tampilkan yang ada
    if (s && !e) {
      return `≥ ${s.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
    }
    if (!s && e) {
      return `≤ ${e.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
    }
    return "Semua";
  };

  // ===================== EXPENSE (filtered by date range) =====================
  const filteredExpenses = useMemo(() => {
    return plantInstances
      .filter(
        (plant) => selectedPlant === "all" || plant.plantType === selectedPlant
      )
      .flatMap((plant) =>
        (plant.operationalCosts || [])
          .filter((cost: AnyRecord) => {
            const costDate = new Date(cost.date);
            return inRange(costDate);
          })
          .map((cost: AnyRecord) => ({
            ...cost,
            plantName: plant.instanceName,
            plantType: plant.plantType,
            _kind: "expense" as const,
          }))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantInstances, selectedPlant, startDate, endDate]);

  const totalExpenses = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [filteredExpenses]
  );

  const expensesByPlant = useMemo(() => {
    return plantTypes.map((plantType) => {
      const typeExpenses = plantInstances
        .filter((plant) => plant.plantType === plantType.name)
        .flatMap((plant) => plant.operationalCosts || [])
        .filter((cost: AnyRecord) => inRange(new Date(cost.date)))
        .reduce((sum, cost: AnyRecord) => sum + (cost.amount || 0), 0);

      return {
        name: plantType.displayName,
        value: typeExpenses,
        color:
          BRUTALIST_COLORS[
            plantTypes.indexOf(plantType) % BRUTALIST_COLORS.length
          ],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantTypes, plantInstances, startDate, endDate]);

  // ===================== INCOME (filtered by date range) =====================
  const filteredIncome = useMemo(() => {
    return plantInstances
      .filter(
        (plant) => selectedPlant === "all" || plant.plantType === selectedPlant
      )
      .flatMap((plant) =>
        (plant.incomeRecords || [])
          .filter((inc: AnyRecord) => {
            const d = new Date(inc.date);
            return inRange(d);
          })
          .map((inc: AnyRecord) => ({
            ...inc,
            plantName: plant.instanceName,
            plantType: plant.plantType,
            _kind: "income" as const,
          }))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantInstances, selectedPlant, startDate, endDate]);

  const totalIncome = useMemo(
    () => filteredIncome.reduce((sum, e) => sum + (e.amount || 0), 0),
    [filteredIncome]
  );

  const incomeByPlant = useMemo(() => {
    return plantTypes.map((plantType) => {
      const typeIncome = plantInstances
        .filter((plant) => plant.plantType === plantType.name)
        .flatMap((plant) => plant.incomeRecords || [])
        .filter((inc: AnyRecord) => inRange(new Date(inc.date)))
        .reduce((sum, inc: AnyRecord) => sum + (inc.amount || 0), 0);

      return {
        name: plantType.displayName,
        value: typeIncome,
        color:
          BRUTALIST_COLORS[
            plantTypes.indexOf(plantType) % BRUTALIST_COLORS.length
          ],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantTypes, plantInstances, startDate, endDate]);

  // ===================== MODE "ALL" (gabungan) =====================
  const filteredAll = useMemo(
    () =>
      [...filteredIncome, ...filteredExpenses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [filteredIncome, filteredExpenses]
  );
  const totalAll = useMemo(
    () => totalIncome + totalExpenses,
    [totalIncome, totalExpenses]
  );

  const pieAllByPlant = useMemo(() => {
    return plantTypes.map((plantType) => {
      const exp = plantInstances
        .filter((p) => p.plantType === plantType.name)
        .flatMap((p) => p.operationalCosts || [])
        .filter((r: AnyRecord) => inRange(new Date(r.date)))
        .reduce((s, r) => s + (r.amount || 0), 0);
      const inc = plantInstances
        .filter((p) => p.plantType === plantType.name)
        .flatMap((p) => p.incomeRecords || [])
        .filter((r: AnyRecord) => inRange(new Date(r.date)))
        .reduce((s, r) => s + (r.amount || 0), 0);
      return {
        name: plantType.displayName,
        value: exp + inc,
        color:
          BRUTALIST_COLORS[
            plantTypes.indexOf(plantType) % BRUTALIST_COLORS.length
          ],
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantTypes, plantInstances, startDate, endDate]);

  // ===================== Tren Bulanan (mengikuti rentang tanggal) =====================
  const monthBuckets = useMemo(() => {
    // Tentukan from-to untuk bucket:
    // - Jika user set start/end → gunakan itu
    // - Kalau kosong, ambil min & max dari data sesuai mode/plant
    const dates = allRelevantDates
      .slice()
      .sort((a, b) => a.getTime() - b.getTime());
    let from: Date, to: Date;

    if (startDate) from = toStart(startDate);
    else
      from = dates[0]
        ? new Date(dates[0])
        : new Date(new Date().getFullYear(), 0, 1);

    if (endDate) to = toEnd(endDate);
    else
      to = dates[dates.length - 1]
        ? new Date(dates[dates.length - 1])
        : new Date(new Date().getFullYear(), 11, 31);

    // Normalisasi ke awal & akhir bulan
    const first = new Date(from.getFullYear(), from.getMonth(), 1);
    const last = new Date(to.getFullYear(), to.getMonth(), 1);

    // Buat bucket per bulan
    const buckets: { key: string; label: string; y: number; m: number }[] = [];
    let cursor = new Date(first);
    while (cursor <= last) {
      buckets.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth() + 1}`,
        label: cursor.toLocaleDateString("id-ID", {
          month: "short",
          year: "2-digit",
        }),
        y: cursor.getFullYear(),
        m: cursor.getMonth() + 1,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return buckets;
  }, [allRelevantDates, startDate, endDate]);

  const monthlyTrends = useMemo(() => {
    // expenses
    return monthBuckets.map((b) => {
      const monthExpenses = filteredExpenses
        .filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === b.y && d.getMonth() + 1 === b.m;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      return { month: b.label, expenses: monthExpenses };
    });
  }, [monthBuckets, filteredExpenses]);

  const monthlyTrendsIncome = useMemo(() => {
    // income
    return monthBuckets.map((b) => {
      const monthIncome = filteredIncome
        .filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === b.y && d.getMonth() + 1 === b.m;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      // gunakan key "expenses" agar chart lama tetap jalan tanpa ubah prop
      return { month: b.label, expenses: monthIncome };
    });
  }, [monthBuckets, filteredIncome]);

  const monthlyTrendsAll = useMemo(() => {
    return monthBuckets.map((b) => {
      const vExp = filteredExpenses
        .filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === b.y && d.getMonth() + 1 === b.m;
        })
        .reduce((s, e) => s + (e.amount || 0), 0);
      const vInc = filteredIncome
        .filter((e) => {
          const d = new Date(e.date);
          return d.getFullYear() === b.y && d.getMonth() + 1 === b.m;
        })
        .reduce((s, e) => s + (e.amount || 0), 0);
      return { month: b.label, expenses: vExp + vInc };
    });
  }, [monthBuckets, filteredExpenses, filteredIncome]);

  // ===================== EXPORT (mengikuti rentang tanggal + mode all) =====================
  const handleExportCSV = async () => {
    try {
      const allPlantsResponse = await fetch("/api/plants");
      const allPlants: PlantInstance[] = await allPlantsResponse.json();

      const relevantPlants =
        selectedPlant === "all"
          ? allPlants
          : allPlants.filter((plant) => plant.plantType === selectedPlant);

      const inRangeRecord = (rec: AnyRecord) => {
        const d = new Date(rec.date);
        return inRange(d);
      };

      let total = 0;
      let totalTransactions = 0;

      if (mode === "expense" || mode === "income") {
        const isExpense = mode === "expense";
        total = relevantPlants.reduce((sum, plant) => {
          const arr = isExpense
            ? plant.operationalCosts || []
            : plant.incomeRecords || [];
          const subtotal = arr
            .filter(inRangeRecord)
            .reduce((s, it) => s + (it.amount || 0), 0);
          return sum + subtotal;
        }, 0);
        totalTransactions = relevantPlants.reduce((sum, plant) => {
          const arr = isExpense
            ? plant.operationalCosts || []
            : plant.incomeRecords || [];
          const count = arr.filter(inRangeRecord).length;
          return sum + count;
        }, 0);
      } else {
        // mode "all"
        const sumExp = relevantPlants.reduce((sum, plant) => {
          const arr = plant.operationalCosts || [];
          const subtotal = arr
            .filter(inRangeRecord)
            .reduce((s, it) => s + (it.amount || 0), 0);
          return sum + subtotal;
        }, 0);
        const sumInc = relevantPlants.reduce((sum, plant) => {
          const arr = plant.incomeRecords || [];
          const subtotal = arr
            .filter(inRangeRecord)
            .reduce((s, it) => s + (it.amount || 0), 0);
          return sum + subtotal;
        }, 0);
        total = sumExp + sumInc;
        const countExp = relevantPlants.reduce(
          (sum, plant) =>
            sum + (plant.operationalCosts || []).filter(inRangeRecord).length,
          0
        );
        const countInc = relevantPlants.reduce(
          (sum, plant) =>
            sum + (plant.incomeRecords || []).filter(inRangeRecord).length,
          0
        );
        totalTransactions = countExp + countInc;
      }

      const average = totalTransactions > 0 ? total / totalTransactions : 0;

      const buckets = monthBuckets;
      const monthlyRows = buckets.map((b) => {
        let mTotal = 0;
        let mCount = 0;

        if (mode === "expense" || mode === "income") {
          const isExpense = mode === "expense";
          relevantPlants.forEach((plant) => {
            const arr = isExpense
              ? plant.operationalCosts || []
              : plant.incomeRecords || [];
            const filtered = arr.filter((it) => {
              const d = new Date(it.date);
              return (
                inRange(d) &&
                d.getFullYear() === b.y &&
                d.getMonth() + 1 === b.m
              );
            });
            mTotal += filtered.reduce((s, it) => s + (it.amount || 0), 0);
            mCount += filtered.length;
          });
        } else {
          relevantPlants.forEach((plant) => {
            const exp = (plant.operationalCosts || []).filter((it) => {
              const d = new Date(it.date);
              return (
                inRange(d) &&
                d.getFullYear() === b.y &&
                d.getMonth() + 1 === b.m
              );
            });
            const inc = (plant.incomeRecords || []).filter((it) => {
              const d = new Date(it.date);
              return (
                inRange(d) &&
                d.getFullYear() === b.y &&
                d.getMonth() + 1 === b.m
              );
            });
            mTotal += exp.reduce((s, it) => s + (it.amount || 0), 0);
            mTotal += inc.reduce((s, it) => s + (it.amount || 0), 0);
            mCount += exp.length + inc.length;
          });
        }

        return {
          monthName: b.label,
          expenses: mTotal,
          transactions: mCount,
        };
      });

      const allRows =
        mode === "expense"
          ? filteredExpenses
          : mode === "income"
          ? filteredIncome
          : filteredAll;

      const title =
        mode === "expense"
          ? "Laporan Pengeluaran"
          : mode === "income"
          ? "Laporan Pendapatan"
          : "Laporan Semua";

      const labelValue =
        mode === "expense"
          ? "Pengeluaran"
          : mode === "income"
          ? "Pendapatan"
          : "Nominal";

      let html = `
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th { background-color: #90EE90; font-weight: bold; padding: 8px; border: 2px solid #000000; text-align: left; }
            td { padding: 8px; border: 1px solid #000000; }
            .header { font-size: 18px; font-weight: bold; margin: 20px 0 10px 0; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .period { font-size: 14px; margin-bottom: 20px; color: #666; }
          </style>
        </head>
        <body>
      `;

      html += `<div class="title">${title} - ${
        selectedPlant === "all"
          ? "Semua Tanaman"
          : selectedPlant.charAt(0).toUpperCase() + selectedPlant.slice(1)
      }</div>`;
      html += `<div class="period">Periode: ${getPeriodLabel()}</div>`;

      // RINGKASAN
      html += `<div class="header">RINGKASAN ${labelValue.toUpperCase()}</div>`;
      html += `<table>`;
      html += `<tr><th>Keterangan</th><th>Nilai</th></tr>`;
      if (mode === "all") {
        html += `<tr><td>Total Pendapatan</td><td>Rp ${totalIncome.toLocaleString(
          "id-ID"
        )}</td></tr>`;
        html += `<tr><td>Total Pengeluaran</td><td>Rp ${totalExpenses.toLocaleString(
          "id-ID"
        )}</td></tr>`;
      } else {
        html += `<tr><td>Total ${labelValue}</td><td>Rp ${total.toLocaleString(
          "id-ID"
        )}</td></tr>`;
      }
      html += `<tr><td>Jumlah Transaksi</td><td>${totalTransactions}</td></tr>`;
      html += `<tr><td>Rata-rata per Transaksi</td><td>Rp ${average.toLocaleString(
        "id-ID"
      )}</td></tr>`;
      html += `<tr><td>Periode</td><td>${getPeriodLabel()}</td></tr>`;
      html += `</table>`;

      // BULANAN
      html += `<div class="header">${labelValue.toUpperCase()} BULANAN</div>`;
      html += `<table>`;
      html += `<tr><th>Bulan</th><th>Total ${labelValue}</th><th>Jumlah Transaksi</th><th>Rata-rata per Transaksi</th></tr>`;
      monthlyRows.forEach((data) => {
        const avgPerTransaction =
          data.transactions > 0 ? data.expenses / data.transactions : 0;
        html += `<tr><td>${
          data.monthName
        }</td><td>Rp ${data.expenses.toLocaleString("id-ID")}</td><td>${
          data.transactions
        }</td><td>Rp ${avgPerTransaction.toLocaleString("id-ID")}</td></tr>`;
      });
      html += `</table>`;

      // DETAIL
      html += `<div class="header">DETAIL TRANSAKSI ${labelValue.toUpperCase()}</div>`;
      html += `<table>`;
      html += `<tr><th>Tanggal</th><th>Deskripsi</th><th>Jumlah</th><th>Input Oleh</th></tr>`;
      allRows.forEach((row: AnyRecord) => {
        html += `<tr><td>${new Date(row.date).toLocaleDateString(
          "id-ID"
        )}</td><td>${row.description || ""}</td><td>Rp ${Number(
          row.amount || 0
        ).toLocaleString("id-ID")}</td><td>${row.addedBy || ""}</td></tr>`;
      });
      html += `</table>`;

      html += `</body></html>`;

      const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      const excelFilename =
        mode === "expense"
          ? "laporan-pengeluaran.xls"
          : mode === "income"
          ? "laporan-pendapatan.xls"
          : "laporan-semua.xls";
      link.setAttribute("href", url);
      link.setAttribute("download", excelFilename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
      showError("Error", "Gagal mengekspor data. Silakan coba lagi.");
    }
  };

  if (loading) {
    return (
      <FinanceSidebar>
        <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div
              className={getThemeClasses(
                "animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] dark:border-white mx-auto mb-4",
                "!border-[#FFC1CC]"
              )}
            ></div>
            <p
              className={getThemeClasses(
                "text-[#889063] dark:text-gray-200 text-lg",
                "!text-[#6b7280]"
              )}
            >
              Memuat laporan pengeluaran...
            </p>
          </div>
        </div>
      </FinanceSidebar>
    );
  }

  // ===== Helper pembalik data & label berdasar mode (UI tetap) =====
  const isExpense = mode === "expense";
  const isIncome = mode === "income";
  const isAll = mode === "all";

  const totalPrimary = isExpense
    ? totalExpenses
    : isIncome
    ? totalIncome
    : totalAll;
  const listPrimary = isExpense
    ? filteredExpenses
    : isIncome
    ? filteredIncome
    : filteredAll;
  const piePrimary = isExpense
    ? expensesByPlant
    : isIncome
    ? incomeByPlant
    : pieAllByPlant;
  const trendPrimary = isExpense
    ? monthlyTrends
    : isIncome
    ? monthlyTrendsIncome
    : monthlyTrendsAll;

  const headerTitle = isExpense
    ? "Laporan Pengeluaran"
    : isIncome
    ? "Laporan Pendapatan"
    : "Laporan Semua";
  const headerDesc = isExpense
    ? "Analisis dan manajemen pengeluaran operasional per tanaman"
    : isIncome
    ? "Analisis dan manajemen pendapatan per tanaman"
    : "Analisis gabungan pendapatan dan pengeluaran Tanaman";

  const itemsPerPage = 10; // Definisikan sebagai konstanta

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = listPrimary.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(listPrimary.length / itemsPerPage);

  // Add Pagination Controls component
  const PaginationControls = () => {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-white border border-gray-300 disabled:opacity-50"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-white border border-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
        </div>

        <span className="text-sm font-medium">
          Page {currentPage} of {totalPages}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-white border border-gray-300 disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-white border border-gray-300 disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  return (
    <FinanceSidebar>
      <AlertComponent />
      <div className="p-4 sm:p-6 lg:p-8">
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-4">
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
            <div>
              <h1
                className={getThemeClasses(
                  "text-2xl sm:text-3xl lg:text-4xl font-bold text-[#324D3E] dark:text-white transition-colors duration-300",
                  "!text-[#4c1d1d]"
                )}
              >
                {headerTitle}
              </h1>
              <p
                className={getThemeClasses(
                  "text-[#889063] dark:text-gray-200 mt-1 text-sm sm:text-base lg:text-lg transition-colors duration-300",
                  "!text-[#6b7280]"
                )}
              >
                {headerDesc}
              </p>
              {/* Secondary nav lama: Laporan <-> Pendaftaran (dipertahankan, disembunyikan) */}
              <div className="mt-3 hidden">
                <div
                  className={getThemeClasses(
                    "inline-flex overflow-hidden rounded-2xl border border-black/10 dark:border-gray-600 bg-white/80 dark:bg-gray-700/80 backdrop-blur px-1 py-1 transition-colors duration-300",
                    "!border-[#FFC1CC]/30 !bg-white/90"
                  )}
                >
                  <button
                    className={getThemeClasses(
                      "px-3 py-1 text-xs font-bold rounded-xl bg-black/5 dark:bg-gray-600/50 cursor-default text-[#324D3E] dark:text-white transition-colors duration-300",
                      "!bg-[#FFC1CC]/20 !text-[#4c1d1d]"
                    )}
                    disabled
                    title="Halaman Laporan"
                  >
                    Laporan
                  </button>
                  <Link href="/pendaftaran" className="contents">
                    <button
                      className={getThemeClasses(
                        "px-3 py-1 text-xs font-bold rounded-xl hover:bg-black/5 dark:hover:bg-gray-600/50 text-[#324D3E] dark:text-white transition-colors duration-300",
                        "!text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                      )}
                      title="Ke halaman Pendaftaran"
                    >
                      Pendaftaran
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Kanan: grup mode + dropdown di bawahnya + Export */}
          <div className="flex gap-3 items-start">
            <div className="flex flex-col">
              {/* Toggle kecil – ditambah tombol "Semua" */}
              <div
                className={getThemeClasses(
                  "inline-flex rounded-2xl overflow-hidden border border-black/60 dark:border-gray-600 transition-colors duration-300",
                  "!border-[#FFC1CC]/50"
                )}
              >
                <button
                  className={getThemeClasses(
                    `px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                      isAll
                        ? "bg-[#E9FFEF] text-[#324D3E] dark:bg-emerald-500/30 dark:text-white"
                        : "bg-white text-[#324D3E] dark:bg-gray-700 dark:text-white"
                    }`,
                    isAll
                      ? "!bg-[#FFDEE9] !text-[#4c1d1d]"
                      : "!bg-white !text-[#4c1d1d]"
                  )}
                  onClick={() => setMode("all")}
                  title="Lihat Semua"
                >
                  Semua
                </button>
                <button
                  className={getThemeClasses(
                    `px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                      isExpense
                        ? "bg-[#FFEAA7] text-[#324D3E] dark:bg-red-500/30 dark:text-white"
                        : "bg-white text-[#324D3E] dark:bg-gray-700 dark:text-white"
                    }`,
                    isExpense
                      ? "!bg-[#FFDEE9] !text-[#4c1d1d]"
                      : "!bg-white !text-[#4c1d1d]"
                  )}
                  onClick={() => setMode("expense")}
                  title="Lihat Pengeluaran"
                >
                  Pengeluaran
                </button>
                <button
                  className={getThemeClasses(
                    `px-3 py-1 text-xs font-bold transition-colors duration-300 ${
                      isIncome
                        ? "bg-[#C2F5C0] text-[#324D3E] dark:bg-green-500/30 dark:text-white"
                        : "bg-white text-[#324D3E] dark:bg-gray-700 dark:text-white"
                    }`,
                    isIncome
                      ? "!bg-[#B5EAD7] !text-[#4c1d1d]"
                      : "!bg-white !text-[#4c1d1d]"
                  )}
                  onClick={() => setMode("income")}
                  title="Lihat Pendapatan"
                >
                  Pendapatan
                </button>
              </div>

              {/* ⬇️ Dropdown Menu Laporan tepat di bawah grup mode */}
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={getThemeClasses(
                        "px-4 py-2 text-sm font-semibold rounded-2xl border transition-colors duration-200",
                        "bg-white hover:bg-gray-100 text-[#324D3E] border-gray-300"
                      )}
                    >
                      Laporan ▼
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className={getThemeClasses(
                      "mt-2 rounded-xl border shadow-lg bg-white dark:bg-gray-800",
                      "!border-[#FFC1CC]/40"
                    )}
                    align="start"
                  >
                    <DropdownMenuItem
                      onClick={() => router.push("/laporan-pengeluaran")}
                      className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-gray-100"
                    >
                      📄 Laporan
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push("/pendaftaran")}
                      className="cursor-pointer px-3 py-2 text-sm font-medium hover:bg-gray-100"
                    >
                      🧾 Pendaftaran
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* ⬆️ */}
            </div>

            <motion.button
              onClick={handleExportCSV}
              className={getThemeClasses(
                "inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-[#324D3E] hover:from-green-600 hover:to-[#4C3D19] px-4 py-2 text-sm font-medium text-white transition-all duration-300 shadow-lg hover:shadow-xl dark:from-emerald-600 dark:to-gray-700 dark:hover:from-emerald-500 dark:hover:to-gray-600",
                "!bg-gradient-to-r !from-[#FFC1CC] !to-[#FFDEE9] !text-[#4c1d1d] hover:!from-[#FFDEE9] hover:!to-[#FFF5BA]"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </motion.button>
          </div>
        </motion.div>

        {/* ===== FILTER: Rentang Tanggal (Bank-style) ===== */}
        <Card
          className={getThemeClasses(
            "bg-white/90 dark:bg-gray-800/90 mb-6 border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300",
            "!bg-white/95 !border-[#FFC1CC]/30"
          )}
        >
          <CardHeader>
            <CardTitle
              className={getThemeClasses(
                "text-black dark:text-white flex items-center gap-2 transition-colors duration-300",
                "!text-[#4c1d1d]"
              )}
            >
              <Filter className="h-5 w-5" />
              Filter Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label
                  className={getThemeClasses(
                    "block text-sm font-medium text-black dark:text-white mb-2 transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}
                >
                  Tanggal Awal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={getThemeClasses(
                    "w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300",
                    "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]"
                  )}
                />
              </div>

              <div>
                <label
                  className={getThemeClasses(
                    "block text-sm font-medium text-black dark:text-white mb-2 transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}
                >
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={getThemeClasses(
                    "w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-300",
                    "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]"
                  )}
                />
              </div>

              <div>
                <label
                  className={getThemeClasses(
                    "block text-sm font-medium text-black dark:text-white mb-2 transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}
                >
                  Tanaman
                </label>
                <div className="relative">
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className={getThemeClasses(
                      "w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-colors duration-300",
                      "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] focus:!ring-[#FFC1CC]"
                    )}
                  >
                    <option value="all">Semua Tanaman</option>
                    {plantTypes.map((plantType) => (
                      <option key={plantType.id} value={plantType.name}>
                        {plantType.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setSelectedPlant("all");
                    setMode("all");
                  }}
                  variant="outline"
                  className={getThemeClasses(
                    "w-full border bg-white/90 dark:bg-gray-700/80 border-gray-200 dark:border-gray-600 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300",
                    "!bg-white/90 !border-[#FFC1CC]/30 !text-[#4c1d1d] hover:!bg-[#FFC1CC]/20"
                  )}
                >
                  Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Saat mode=all, tampilkan 2 kartu total di depan */}
          {isAll ? (
            <>
              {/* Total Pendapatan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                <Card
                  className={getThemeClasses(
                    "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
                    "!bg-white/95 !border-[#FFC1CC]/30"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={getThemeClasses(
                          "text-sm text-[#889063] dark:text-gray-200",
                          "!text-[#6b7280]"
                        )}
                      >
                        Total Pendapatan Tanaman
                      </div>
                      <div
                        className={getThemeClasses(
                          "flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 text-green-600",
                          "!bg-[#B5EAD7]/50 !text-[#059669]"
                        )}
                      >
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <div
                      className={getThemeClasses(
                        "text-2xl font-bold text-green-600 dark:text-emerald-400",
                        "!text-[#059669]"
                      )}
                    >
                      {formatCurrency(totalIncome)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Total Pengeluaran */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card
                  className={getThemeClasses(
                    "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
                    "!bg-white/95 !border-[#FFC1CC]/30"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={getThemeClasses(
                          "text-sm text-[#889063] dark:text-gray-200",
                          "!text-[#6b7280]"
                        )}
                      >
                        Total Biaya Operasional Tanaman
                      </div>
                      <div
                        className={getThemeClasses(
                          "flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-600",
                          "!bg-[#FFDEE9]/50 !text-[#dc2626]"
                        )}
                      >
                        <TrendingDown className="h-5 w-5" />
                      </div>
                    </div>
                    <div
                      className={getThemeClasses(
                        "text-2xl font-bold text-red-600 dark:text-red-400",
                        "!text-[#dc2626]"
                      )}
                    >
                      {formatCurrency(totalExpenses)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          ) : (
            // Jika bukan mode all: satu kartu total sesuai mode (tetap seperti sebelumnya)
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card
                className={getThemeClasses(
                  "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
                  "!bg-white/95 !border-[#FFC1CC]/30"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={getThemeClasses(
                        "text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300",
                        "!text-[#6b7280]"
                      )}
                    >
                      {isExpense ? "Total Biaya Operasional Tanaman " : "Total Pendapatan Tanaman"}
                    </div>
                    <div
                      className={getThemeClasses(
                        `flex h-10 w-10 items-center justify-center rounded-2xl ${
                          isExpense
                            ? "bg-red-500/10 text-red-600"
                            : "bg-green-500/10 text-green-600"
                        }`,
                        isExpense
                          ? "!bg-[#FFDEE9]/50 !text-[#dc2626]"
                          : "!bg-[#B5EAD7]/50 !text-[#059669]"
                      )}
                    >
                      {isExpense ? (
                        <TrendingDown className="h-5 w-5" />
                      ) : (
                        <TrendingUp className="h-5 w-5" />
                      )}
                    </div>
                  </div>
                  <div
                    className={getThemeClasses(
                      `text-2xl font-bold ${
                        isExpense
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-emerald-400"
                      } transition-colors duration-300`,
                      isExpense ? "!text-[#dc2626]" : "!text-[#059669]"
                    )}
                  >
                    {formatCurrency(totalPrimary)}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Jumlah Transaksi */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card
              className={getThemeClasses(
                "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={getThemeClasses(
                      "text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300",
                      "!text-[#6b7280]"
                    )}
                  >
                    Jumlah Transaksi
                  </div>
                  <div
                    className={getThemeClasses(
                      "flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600",
                      "!bg-[#C7CEEA]/50 !text-[#7c3aed]"
                    )}
                  >
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div
                  className={getThemeClasses(
                    "text-2xl font-bold text-blue-600 dark:text-blue-400 transition-colors duration-300",
                    "!text-[#7c3aed]"
                  )}
                >
                  {listPrimary.length}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rata-rata per Transaksi */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card
              className={getThemeClasses(
                "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={getThemeClasses(
                      "text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300",
                      "!text-[#6b7280]"
                    )}
                  >
                    Rata-rata per Transaksi
                  </div>
                  <div
                    className={getThemeClasses(
                      "flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-500/10 text-yellow-600",
                      "!bg-[#FFF5BA]/70 !text-[#d97706]"
                    )}
                  >
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div
                  className={getThemeClasses(
                    "text-2xl font-bold text-yellow-600 dark:text-yellow-400 transition-colors duration-300",
                    "!text-[#d97706]"
                  )}
                >
                  {listPrimary.length > 0
                    ? formatCurrency(totalPrimary / listPrimary.length)
                    : "Rp 0"}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Periode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card
              className={getThemeClasses(
                "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
            >
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={getThemeClasses(
                      "text-sm text-[#889063] dark:text-gray-200 transition-colors duration-300",
                      "!text-[#6b7280]"
                    )}
                  >
                    Periode
                  </div>
                  <div
                    className={getThemeClasses(
                      "flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 text-green-600",
                      "!bg-[#B5EAD7]/50 !text-[#059669]"
                    )}
                  >
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
                <div
                  className={getThemeClasses(
                    "text-2xl font-bold text-green-600 dark:text-emerald-400 transition-colors duration-300",
                    "!text-[#059669]"
                  )}
                >
                  {getPeriodLabel()}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Pendapatan New – hanya tampil kalau ALL */}
          {isAll && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
            >
              <Card
                className={getThemeClasses(
                  "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300",
                  "!bg-white/95 !border-[#FFC1CC]/30"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={getThemeClasses(
                        "text-sm text-[#889063] dark:text-gray-200",
                        "!text-[#6b7280]"
                      )}
                    >
                      Total Pendapatan , Pendaftaran , Daily Pemasukan Investor 
                    </div>
                    <div
                      className={getThemeClasses(
                        "flex h-10 w-10 items-center justify-center rounded-2xl bg-green-500/10 text-green-600",
                        "!bg-[#B5EAD7]/50 !text-[#059669]"
                      )}
                    >
                      <DollarSign className="h-5 w-5" />
                    </div>
                  </div>
                  <div
                    className={getThemeClasses(
                      "text-2xl font-bold text-green-600 dark:text-emerald-400 transition-colors duration-300",
                      "!text-[#059669]"
                    )}
                  >
                    {formatCurrency(
                      totalIncome + totalIncomingPaid + totalPendaftaran
                    )}
                  </div>
                  {/* <div className="mt-2 text-xs text-gray-500">
                    <div>Pendapatan Tanaman: {formatCurrency(totalIncome)}</div>
                    <div>
                      Total amountPaid (daily-incoming):{" "}
                      {formatCurrency(totalIncomingPaid)}
                    </div>
                    <div>
                      Total Biaya Pendaftaran:{" "}
                      {formatCurrency(totalPendaftaran)}
                    </div>
                  </div> */}
                </CardContent>
              </Card>
            </motion.div>
          )}
          {/* end Total Pendapatan New */}
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card
              className={getThemeClasses(
                "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
            >
              <CardHeader>
                <CardTitle
                  className={getThemeClasses(
                    "text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {isExpense
                    ? "Pengeluaran per Tanaman"
                    : isIncome
                    ? "Pendapatan per Tanaman"
                    : "Nominal per Tanaman"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={piePrimary.filter((plant) => plant.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="#000"
                        strokeWidth={3}
                      >
                        {piePrimary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          isExpense
                            ? "Pengeluaran"
                            : isIncome
                            ? "Pendapatan"
                            : "Nominal",
                        ]}
                        contentStyle={{
                          backgroundColor: isDark ? "#111827" : "#ffffff",
                          border: isDark
                            ? "3px solid #374151"
                            : "3px solid #000000",
                          borderRadius: "8px",
                          color: isDark ? "#ffffff" : "#000000",
                          fontWeight: "bold",
                          boxShadow:
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Card
              className={getThemeClasses(
                "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300",
                "!bg-white/95 !border-[#FFC1CC]/30"
              )}
            >
              <CardHeader>
                <CardTitle
                  className={getThemeClasses(
                    "text-[#324D3E] dark:text-white transition-colors duration-300",
                    "!text-[#4c1d1d]"
                  )}
                >
                  {isExpense
                    ? `Tren Pengeluaran Bulanan`
                    : isIncome
                    ? `Tren Pendapatan Bulanan`
                    : `Tren Nominal Bulanan`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendPrimary}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDark ? "#4b5563" : "#374151"}
                      />
                      <XAxis
                        dataKey="month"
                        stroke={isDark ? "#d1d5db" : "#9ca3af"}
                        style={{ fontSize: "12px", fontWeight: "bold" }}
                      />
                      <YAxis
                        stroke={isDark ? "#d1d5db" : "#9ca3af"}
                        style={{ fontSize: "12px", fontWeight: "bold" }}
                        tickFormatter={(value) =>
                          `${(value / 1000000).toFixed(0)}M`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatCurrency(value),
                          isExpense
                            ? "Pengeluaran"
                            : isIncome
                            ? "Pendapatan"
                            : "Nominal",
                        ]}
                        contentStyle={{
                          backgroundColor: isDark ? "#111827" : "#ffffff",
                          border: isDark
                            ? "3px solid #374151"
                            : "3px solid #000000",
                          borderRadius: "8px",
                          color: isDark ? "#ffffff" : "#000000",
                          fontWeight: "bold",
                          boxShadow:
                            "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke={
                          isExpense
                            ? isDark
                              ? "#f87171"
                              : "#ef4444"
                            : isIncome
                            ? isDark
                              ? "#34d399"
                              : "#10b981"
                            : isDark
                            ? "#60a5fa"
                            : "#2563eb"
                        }
                        strokeWidth={4}
                        dot={{
                          fill: isExpense
                            ? isDark
                              ? "#f87171"
                              : "#ef4444"
                            : isIncome
                            ? isDark
                              ? "#34d399"
                              : "#10b981"
                            : isDark
                            ? "#60a5fa"
                            : "#2563eb",
                          strokeWidth: 3,
                          stroke: isDark ? "#d1d5db" : "#000",
                          r: 6,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* TABLE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Card
            className={getThemeClasses(
              "bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-[#324D3E]/10 dark:border-gray-700 shadow-lg transition-colors duration-300",
              "!bg-white/95 !border-[#FFC1CC]/30"
            )}
          >
            <CardHeader>
              <CardTitle
                className={getThemeClasses(
                  "text-[#324D3E] dark:text-white transition-colors duration-300",
                  "!text-[#4c1d1d]"
                )}
              >
                {isExpense
                  ? "Detail Pengeluaran"
                  : isIncome
                  ? "Detail Pendapatan"
                  : "Detail Semua"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {listPrimary.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr
                        className={getThemeClasses(
                          "border-b-2 border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
                          "!border-[#FFC1CC]/30"
                        )}
                      >
                        <th
                          className={getThemeClasses(
                            "text-left py-3 px-4 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          Tanggal
                        </th>
                        <th
                          className={getThemeClasses(
                            "text-left py-3 px-4 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          Deskripsi
                        </th>
                        <th
                          className={getThemeClasses(
                            "text-right py-3 px-4 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          Jumlah
                        </th>
                        <th
                          className={getThemeClasses(
                            "text-left py-3 px-4 text-[#324D3E] dark:text-white font-semibold transition-colors duration-300",
                            "!text-[#4c1d1d]"
                          )}
                        >
                          Input Oleh
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentItems.map((row: any, index: number) => (
                        <tr
                          key={index}
                          className={getThemeClasses(
                            "border-b border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300",
                            "!border-[#FFC1CC]/30"
                          )}
                        >
                          <td className="py-3 px-4">
                            {new Date(row.date).toLocaleDateString("id-ID")}
                          </td>
                          <td className="py-3 px-4">
                            {row.description || "-"}
                          </td>
                          <td
                            className={`py-3 px-4 text-right ${
                              isAll
                                ? row._kind === "expense"
                                  ? "text-red-600"
                                  : "text-green-600"
                                : ""
                            }`}
                          >
                            {formatCurrency(row.amount)}
                          </td>
                          <td className="py-3 px-4">
                            {row.addedBy || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className={getThemeClasses(
                    "text-center py-8 text-[#889063] dark:text-gray-200 transition-colors duration-300",
                    "!text-[#6b7280]"
                  )}
                >
                  {isExpense ? (
                    <TrendingDown
                      className={getThemeClasses(
                        "h-12 w-12 mx-auto mb-4 opacity-50 text-[#324D3E] dark:text-white transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    />
                  ) : (
                    <TrendingUp
                      className={getThemeClasses(
                        "h-12 w-12 mx-auto mb-4 opacity-50 text-[#324D3E] dark:text-white transition-colors duration-300",
                        "!text-[#4c1d1d]"
                      )}
                    />
                  )}
                  <p>
                    {isExpense
                      ? "Tidak ada pengeluaran ditemukan untuk filter yang dipilih"
                      : isIncome
                      ? "Tidak ada pendapatan ditemukan untuk filter yang dipilih"
                      : "Tidak ada data ditemukan untuk filter yang dipilih"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pagination Controls */}
        {listPrimary.length > 0 && <PaginationControls />}
      </div>
    </FinanceSidebar>
  );
}
