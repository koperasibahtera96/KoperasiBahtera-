"use client";

import LandingNavbar from "@/components/landing/LandingNavbar";
import FilterSidebar from "@/components/checker/FilterSidebar";
import { Badge } from "@/components/ui-staff/badge";
import { Button } from "@/components/ui-staff/button";
import { Input } from "@/components/ui-staff/input";
import type { PlantInstance, PlantHistory } from "@/types/checker";
// For grouping
//test
type AssignmentGroup = {
  groupName: string;
  groupId: string;
  plantIds: string[];
  role?: "asisten" | "mandor";
  assignedById?: string;
};
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Leaf,
  MapPin,
  Search,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const statusColors: Record<string, string> = {
  // === General ===
  "Kontrak Baru": "bg-gray-100 text-gray-800 border border-gray-300",

  // === Alpukat, Aren, Jengkol, Gaharu (ada overlap status) ===
  Penanaman: "bg-green-50 text-green-600 border border-green-200",
  Penyiraman: "bg-cyan-50 text-cyan-600 border border-cyan-200",
  Pemupukan: "bg-yellow-50 text-yellow-600 border border-yellow-200",
  "Penyiangan Gulma": "bg-lime-50 text-lime-700 border border-lime-200",
  "Penyemprotan Hama": "bg-red-50 text-red-600 border border-red-200",
  "Pemangkasan cabang": "bg-purple-50 text-purple-600 border border-purple-200",
  "Pemangkasan daun":
    "bg-emerald-50 text-emerald-600 border border-emerald-200",
  "Perawatan pelepah": "bg-teal-50 text-teal-600 border border-teal-200",
  "Cek kesehatan": "bg-indigo-50 text-indigo-600 border border-indigo-200",
  Panen: "bg-pink-50 text-pink-600 border border-pink-200",
  Sakit: "bg-rose-50 text-rose-600 border border-rose-200",
  Lainnya: "bg-slate-50 text-slate-600 border border-slate-200",

  // === Gaharu specific ===
  "Inokulasi gaharu": "bg-orange-50 text-orange-600 border border-orange-200",

  // === Bibit & Lahan (khusus awal) ===
  "Tanam Bibit": "bg-amber-50 text-amber-700 border border-amber-200",
  "Persiapan Bibit": "bg-sky-50 text-sky-600 border border-sky-200",
  "Buka Lahan": "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200",
};

const PLANTS_PER_PAGE = 6;

/* ===================== Helpers ===================== */
const parseIDDate = (d: string): Date => {
  // format dd/mm/yyyy
  const [dd, mm, yyyy] = d.split("/");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
};
const isWithinDays = (dateStr: string, days: number): boolean => {
  const d = parseIDDate(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const limit = days * 24 * 60 * 60 * 1000;
  return diff >= 0 && diff <= limit;
};
const getLatestHistoryByDate = (history: PlantHistory[] = []) => {
  if (!history.length) return undefined;
  return [...history].sort((a, b) => {
    const ta = parseIDDate(a.date).getTime();
    const tb = parseIDDate(b.date).getTime();
    if (ta !== tb) return tb - ta; // terbaru dulu
    return (b.id ?? 0) - (a.id ?? 0);
  })[0];
};

// cek status "baru" (ada Kontrak Baru < 14 hari)
// cek status "baru" (ada Pending Contract Approval < 14 hari)
const isPlantNew = (p: PlantInstance): boolean => {
  const pending = (p.history || []).find((h: any) => {
    const t = String(h?.type || "").toLowerCase();
    const a = String(h?.action || "").toLowerCase();
    return t === "pending contract" || a === "pending contract";
  });

  return !!(pending && pending.date && isWithinDays(pending.date, 14));
};

// cek status "bermasalah" (riwayat terakhir adalah Sakit)
const isPlantProblem = (p: PlantInstance): boolean => {
  const last = getLatestHistoryByDate(p.history || []);
  return !!(last && (last.type || "").toLowerCase() === "sakit");
};

// avatar default berbasis plantType (mengarah ke /public/*.jpg)
const getPlantTypeImage = (plantType?: string): string | null => {
  const pt = (plantType || "").toLowerCase();
  if (pt === "alpukat") return "/alpukat1.jpg";
  if (pt === "aren") return "/aren.jpg";
  if (pt === "jengkol") return "/jengkol.jpg";
  if (pt === "gaharu") return "/gaharu.jpg";
  if (pt === "kelapa") return "/kelapa.jpg";
  return null;
};
/* =================================================== */

export default function StaffDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const [plants, setPlants] = useState<PlantInstance[]>([]);
  // For grouping
  const [assignmentGroups, setAssignmentGroups] = useState<AssignmentGroup[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [_assignedPlantIds, setAssignedPlantIds] = useState<string[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);

  // Sidebar filter state
  const [sidebarFilter, setSidebarFilter] = useState<{
    role: "asisten" | "mandor" | "no-group" | null;
    userId: string | null;
  }>({ role: "no-group", userId: null });

  // Filter utama
  const [activeFilter, setActiveFilter] = useState("Semua Tanaman");

  // Filter berdasarkan plantType (Aren, Alpukat, Jengkol, Gaharu)
  const [selectedPlantType, setSelectedPlantType] = useState("");

  // Filter dari kartu statistik: all | new | problem
  const [statsFilter, setStatsFilter] = useState<"all" | "new" | "problem">(
    "all"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination state
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlants, setTotalPlants] = useState(0);
  
  // Total stats for manajer (all plants, not filtered)
  const [totalAllPlants, setTotalAllPlants] = useState(0);
  const [totalNewPlants, setTotalNewPlants] = useState(0);
  const [totalProblemPlants, setTotalProblemPlants] = useState(0);

  useEffect(() => {
    if (session?.user) {
      fetchAssignmentsAndGroups();
      // Fetch total stats for manajer
      const userRole = (session?.user as any)?.role;
      if (userRole === "manajer") {
        fetchManajerTotalStats();
      }
    } else if (sessionStatus === "unauthenticated") {
      setAssignmentsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, sessionStatus]);

  useEffect(() => {
    // Fetch plants when filters change
    if (assignmentsLoaded) {
      setCurrentPage(1); // Reset to page 1 when filters change
      fetchPlants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assignmentsLoaded,
    sidebarFilter,
    searchQuery,
    selectedPlantType,
    statsFilter,
  ]);

  useEffect(() => {
    // Fetch plants when page changes
    if (assignmentsLoaded) {
      fetchPlants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Fetch total stats for manajer (all plants regardless of filters)
  const fetchManajerTotalStats = async () => {
    try {
      const res = await fetch("/api/plants?limit=0", {
        cache: "no-store",
      });
      if (res.ok) {
        const allPlants = await res.json();
        const plantsList = Array.isArray(allPlants) ? allPlants : [];
        
        setTotalAllPlants(plantsList.length);
        setTotalNewPlants(
          plantsList.filter((p: any) => isPlantNew(p)).length
        );
        setTotalProblemPlants(
          plantsList.filter((p: any) => isPlantProblem(p)).length
        );
      }
    } catch (error) {
      console.error("Error fetching manajer stats:", error);
    }
  };

  // Fetch assignments and build groups for asisten/manajer/mandor
  const fetchAssignmentsAndGroups = async () => {
    try {
      const userRole = (session?.user as any)?.role;
      const userId = (session?.user as any)?.id;

      if (
        userRole === "asisten" ||
        userRole === "manajer" ||
        userRole === "mandor"
      ) {
        // Fetch assignments for all three roles
        const res = await fetch("/api/assignments");
        if (res.ok) {
          const data = await res.json();
          const assignments = data.assignments || [];

          // For asisten: group by assignedTo (mandor), for manajer: group by assignedTo (asisten)
          let groups: AssignmentGroup[] = [];
          let myPlantIds: string[] = [];

          if (userRole === "asisten") {
            // Find MY assignment (where I am assignedTo)
            const myAssignment = assignments.find(
              (a: any) =>
                a.assignedRole === "asisten" && a.assignedTo?._id === userId
            );

            // All plants assigned to me
            myPlantIds = myAssignment?.plantInstanceIds || [];

            // Mandor assignments I created
            const mandorAssignments = assignments.filter(
              (a: any) =>
                a.assignedRole === "mandor" && a.assignedBy?._id === userId
            );
            groups = mandorAssignments.map((a: any) => ({
              groupName: a.assignedTo?.fullName || "Mandor",
              groupId: a.assignedTo?._id || a.assignedTo,
              plantIds: a.plantInstanceIds || [],
            }));
          } else if (userRole === "manajer") {
            // Get both asisten and mandor assignments for manajer
            const asistenAssignments = assignments.filter(
              (a: any) => a.assignedRole === "asisten"
            );
            const asistenGroups = asistenAssignments.map((a: any) => ({
              groupName: a.assignedTo?.fullName || "Asisten",
              groupId: a.assignedTo?._id || a.assignedTo,
              plantIds: a.plantInstanceIds || [],
              role: "asisten" as const,
              assignedById: a.assignedBy?._id,
            }));
            
            // Also store mandor assignments with assignedBy reference
            const mandorAssignments = assignments.filter(
              (a: any) => a.assignedRole === "mandor"
            );
            const mandorGroups = mandorAssignments.map((a: any) => ({
              groupName: a.assignedTo?.fullName || "Mandor",
              groupId: a.assignedTo?._id || a.assignedTo,
              plantIds: a.plantInstanceIds || [],
              role: "mandor" as const,
              assignedById: a.assignedBy?._id,
            }));
            
            // Store both asisten and mandor groups
            groups = [...asistenGroups, ...mandorGroups];
            // Manajer sees all plants
            myPlantIds = [];
          } else if (userRole === "mandor") {
            // Find MY assignment (where I am assignedTo as mandor)
            const myAssignment = assignments.find(
              (a: any) =>
                a.assignedRole === "mandor" && a.assignedTo?._id === userId
            );
            myPlantIds = myAssignment?.plantInstanceIds || [];
          }

          setAssignmentGroups(groups);
          setAssignedPlantIds(myPlantIds);
        }
      }
      setAssignmentsLoaded(true);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignmentsLoaded(true);
    }
  };

  const fetchPlants = async () => {
    try {
      setLoading(true);

      // Build query params for server-side filtering
      const params = new URLSearchParams();

      // Pagination
      params.append("page", currentPage.toString());
      params.append("limit", PLANTS_PER_PAGE.toString());

      // Search
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      // PlantType filter
      if (selectedPlantType) {
        params.append("plantType", selectedPlantType);
      }

      // Status filter
      if (statsFilter !== "all") {
        params.append("statusFilter", statsFilter);
      }

      // Sidebar filter by asisten/mandor
      if (sidebarFilter.role && sidebarFilter.role !== "no-group") {
        params.append("filterByRole", sidebarFilter.role);
        if (sidebarFilter.userId) {
          params.append("filterByUserId", sidebarFilter.userId);
        }
      } else if (sidebarFilter.role === "no-group") {
        // For "no-group", we'll fetch all and filter on client
        // since we need to exclude assigned plants
        params.append(
          "statusFilter",
          statsFilter === "all" ? "all" : statsFilter
        );
      }

      const res = await fetch(`/api/plants?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed to fetch /api/plants");

      const json = await res.json();

      // Handle paginated response
      let plantsData: any[];
      if (json.plants && json.pagination) {
        plantsData = json.plants;
        setTotalPlants(json.pagination.total);
        setTotalPages(json.pagination.totalPages);
      } else {
        // Backward compatibility for non-paginated response
        plantsData = Array.isArray(json) ? json : [];
        setTotalPlants(plantsData.length);
        setTotalPages(Math.ceil(plantsData.length / PLANTS_PER_PAGE));
      }

      // Normalize plant properties
      const normalized = plantsData.map((p: any) => ({
        ...p,
        name: p.name ?? p.instanceName ?? "",
        owner: p.owner ?? "",
        memberId: p.memberId ?? "",
        location: p.location ?? "",
        status: p.status ?? "Kontrak Baru",
        lastUpdate: p.lastUpdate ?? "",
        fotoGambar: p.fotoGambar ?? "",
        plantType: p.plantType ?? "",
        history: Array.isArray(p.history) ? p.history : [],
      }));

      // Handle "no-group" filter on client side
      if (sidebarFilter.role === "no-group") {
        // Get all assigned plant IDs
        const allAssignedPlantIds = assignmentGroups.flatMap((g) => g.plantIds);
        // Filter out assigned plants
        const unassignedPlants = normalized.filter(
          (p: any) => !allAssignedPlantIds.includes(p.id)
        );
        setPlants(unassignedPlants);
        // Update pagination info for no-group filtering
        setTotalPlants(unassignedPlants.length);
        setTotalPages(Math.ceil(unassignedPlants.length / PLANTS_PER_PAGE));
      } else {
        setPlants(normalized);
      }
    } catch (err) {
      console.error("Error fetching plants:", err);
      setPlants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Kumpulan plantType yang ada (dibatasi ke 4 kategori)
  const getPlantTypes = (): string[] => {
    return ["Aren", "Alpukat", "Jengkol", "Gaharu", "Kelapa"];
  };

  // Plants are already filtered server-side, no need for client filtering
  const currentPlants = plants; // Already paginated by server

  const userRole = (session?.user as any)?.role;

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);
    if (filter !== "Berdasarkan Tanaman") {
      setSelectedPlantType("");
    }
  };

  const handlePlantTypeFilter = (plantType: string) => {
    setSelectedPlantType(selectedPlantType === plantType ? "" : plantType);
    setCurrentPage(1);
  };

  // ====== KARTU STAT: perhitungan ======
  // For manajer: use total counts from all plants
  // For asisten/mandor: use filtered counts
  const totalPaket = userRole === "manajer" ? totalAllPlants : totalPlants;
  const paketAktif = userRole === "manajer" ? totalAllPlants : totalPlants;
  const paketBaru = userRole === "manajer" ? totalNewPlants : plants.reduce(
    (acc, p) => (isPlantNew(p) ? acc + 1 : acc),
    0
  );
  const paketBermasalah = userRole === "manajer" ? totalProblemPlants : plants.reduce(
    (acc, p) => (isPlantProblem(p) ? acc + 1 : acc),
    0
  );

  // ====== Handlers klik kartu (jadi filter) ======
  const clickTotal = () => {
    setStatsFilter("all");
    setActiveFilter("Semua Tanaman");
    setSelectedPlantType("");
    setCurrentPage(1);
  };
  const clickAktif = () => {
    setStatsFilter("all"); // sesuai permintaan, menampilkan keseluruhan
    setActiveFilter("Semua Tanaman");
    setSelectedPlantType("");
    setCurrentPage(1);
  };
  const clickBaru = () => {
    setStatsFilter("new");
    setActiveFilter("Semua Tanaman");
    setSelectedPlantType("");
    setCurrentPage(1);
  };
  const clickBermasalah = () => {
    setStatsFilter("problem");
    setActiveFilter("Semua Tanaman");
    setSelectedPlantType("");
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-[family-name:var(--font-poppins)]">
        <header className="w-full fixed top-0 z-50">
          <LandingNavbar hideNavigation={true} />
        </header>

        <main className="pt-20 px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto">
          <div className="space-y-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">
                Dashboard Staff Lapangan
              </h1>
              <p className="text-[#889063] text-lg">Memuat data tanaman...</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-[#324D3E]/10 p-8 animate-pulse hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  <div className="h-4 bg-[#324D3E]/20 rounded-full w-1/2 mb-3"></div>
                  <div className="h-8 bg-[#324D3E]/20 rounded-full w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-[family-name:var(--font-poppins)]">
      <header className="w-full fixed top-0 z-50">
        <LandingNavbar hideNavigation={true} />
      </header>

      <main className="pt-20 px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto">
        <div className="space-y-8 py-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">
              Dashboard Staff Lapangan
            </h1>
            <p className="text-[#889063] text-lg">
              Kelola dan monitor tanaman investasi di lapangan
            </p>
          </div>

          {/* Stats Cards - warna + klik = filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Total Paket Tanaman (kuning) */}
            <button
              onClick={clickTotal}
              className={`group bg-yellow-50 backdrop-blur-xl rounded-3xl shadow-xl border p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left ${
                statsFilter === "all"
                  ? "border-yellow-400 ring-2 ring-yellow-300"
                  : "border-yellow-200"
              }`}
            >
              <div className="text-center">
                <p className="text-sm font-medium text-yellow-700 mb-2">
                  Total Paket Tanaman
                </p>
                <p className="text-3xl font-bold text-yellow-700">
                  {totalPaket}
                </p>
              </div>
            </button>

            {/* Paket Tanaman Aktif (hijau) */}
            <button
              onClick={clickAktif}
              className={`group bg-green-50 backdrop-blur-xl rounded-3xl shadow-xl border p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left ${
                statsFilter === "all"
                  ? "border-green-400 ring-2 ring-green-300"
                  : "border-green-200"
              }`}
              title="Klik untuk menampilkan semua tanaman"
            >
              <div className="text-center">
                <p className="text-sm font-medium text-green-700 mb-2">
                  Paket Tanaman Aktif
                </p>
                <p className="text-3xl font-bold text-green-700">
                  {paketAktif}
                </p>
              </div>
            </button>

            {/* Paket Tanaman Baru (biru) */}
            <button
              onClick={clickBaru}
              className={`group bg-blue-50 backdrop-blur-xl rounded-3xl shadow-xl border p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left ${
                statsFilter === "new"
                  ? "border-blue-400 ring-2 ring-blue-300"
                  : "border-blue-200"
              }`}
              title="Klik untuk menampilkan tanaman baru (14 hari terakhir)"
            >
              <div className="text-center">
                <p className="text-sm font-medium text-blue-700 mb-2">
                  Paket Tanaman Baru
                </p>
                <p className="text-3xl font-bold text-blue-700">
                  {paketBaru}
                  {paketBaru > 0 ? "+" : ""}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Penambahan dalam 14 hari terakhir
                </p>
              </div>
            </button>

            {/* Paket Tanaman Bermasalah (merah) */}
            <button
              onClick={clickBermasalah}
              className={`group bg-rose-50 backdrop-blur-xl rounded-3xl shadow-xl border p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300 text-left ${
                statsFilter === "problem"
                  ? "border-rose-400 ring-2 ring-rose-300"
                  : "border-rose-200"
              }`}
              title="Klik untuk menampilkan tanaman bermasalah (riwayat terakhir Sakit)"
            >
              <div className="text-center">
                <p className="text-sm font-medium text-rose-700 mb-2">
                  Paket Tanaman Bermasalah
                </p>
                <p className="text-3xl font-bold text-rose-700">
                  {paketBermasalah}
                </p>
              </div>
            </button>
          </div>

          {/* Filters and Search */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-8 mb-8">
            <div className="flex flex-col gap-8">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  variant={
                    activeFilter === "Semua Tanaman" ? "default" : "outline"
                  }
                  onClick={() => handleFilterChange("Semua Tanaman")}
                  className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    activeFilter === "Semua Tanaman"
                      ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                      : "border-2 border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    <span>Semua Tanaman</span>
                  </div>
                </Button>
                <Button
                  variant={
                    activeFilter === "Berdasarkan Tanaman"
                      ? "default"
                      : "outline"
                  }
                  onClick={() => handleFilterChange("Berdasarkan Tanaman")}
                  className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                    activeFilter === "Berdasarkan Tanaman"
                      ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                      : "border-2 border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    <span>Berdasarkan Tanaman</span>
                  </div>
                </Button>
              </div>

              {/* PlantType Filters (Aren, Alpukat, Jengkol, Gaharu) */}
              {activeFilter === "Berdasarkan Tanaman" && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-semibold text-[#324D3E] text-center">
                    Pilih Jenis Tanaman
                  </h3>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {getPlantTypes().map((pt) => (
                      <Button
                        key={pt}
                        variant={
                          selectedPlantType === pt ? "default" : "outline"
                        }
                        onClick={() => handlePlantTypeFilter(pt)}
                        className={`whitespace-nowrap px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                          selectedPlantType === pt
                            ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                            : "border border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate text-sm">{pt}</span>
                        </div>
                      </Button>
                    ))}
                    {getPlantTypes().length === 0 && (
                      <div className="text-sm text-[#889063]">
                        Belum ada data jenis tanaman.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Search Input */}
              <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-[#889063]" />
                </div>
                <Input
                  placeholder="Cari tanaman, pemilik, atau ID anggota..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-12 pr-6 h-12 bg-white/80 backdrop-blur-lg border border-[#324D3E]/20 text-[#324D3E] placeholder:text-[#889063] rounded-2xl shadow-md font-medium focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E] transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Sidebar + Content Layout */}
          <div className="flex gap-6">
            {/* Sidebar - only for manajer and asisten */}
            {(userRole === "manajer" || userRole === "asisten") && (
              <FilterSidebar
                userRole={userRole}
                selectedFilter={sidebarFilter}
                onFilterChange={(filter) => {
                  setSidebarFilter(filter);
                  setCurrentPage(1);
                }}
              />
            )}

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
              {/* Results Summary */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-[#324D3E]/10 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-center lg:text-left">
                  <p className="text-[#324D3E] font-medium">
                    Menampilkan{" "}
                    {totalPlants === 0
                      ? 0
                      : (currentPage - 1) * PLANTS_PER_PAGE + 1}
                    -{Math.min(currentPage * PLANTS_PER_PAGE, totalPlants)} dari{" "}
                    {totalPlants} tanaman
                  </p>
                  <p className="text-[#889063]">
                    Halaman {currentPage} dari {Math.max(totalPages, 1)}
                  </p>
                </div>
              </div>

              {/* Plants Grid - No Grouping */}
              {currentPlants.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-12 text-center">
                  <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#324D3E]/10 to-[#4C3D19]/10 flex items-center justify-center">
                      <Leaf className="w-12 h-12 text-[#324D3E]/40" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-[#324D3E]">
                        Tidak Ada Data Tanaman
                      </h3>
                      <p className="text-[#889063] text-lg">
                        {searchQuery
                          ? `Tidak ditemukan tanaman yang cocok dengan pencarian "${searchQuery}"`
                          : statsFilter === "new"
                          ? "Tidak ada tanaman baru dalam 14 hari terakhir"
                          : statsFilter === "problem"
                          ? "Tidak ada tanaman yang bermasalah saat ini"
                          : selectedPlantType
                          ? `Tidak ada tanaman ${selectedPlantType} yang tersedia`
                          : "Belum ada data tanaman yang tersedia untuk ditampilkan"}
                      </p>
                    </div>
                    {(searchQuery ||
                      statsFilter !== "all" ||
                      selectedPlantType) && (
                      <Button
                        onClick={() => {
                          setSearchQuery("");
                          setStatsFilter("all");
                          setSelectedPlantType("");
                          setActiveFilter("Semua Tanaman");
                          setCurrentPage(1);
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-2xl font-semibold hover:shadow-lg transition-all duration-300"
                      >
                        Reset Filter
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {currentPlants.map((plant) => {
                    const isRecent = isRecentlyUpdated(plant.lastUpdate);
                    const cardBgColor = isRecent
                      ? "bg-gradient-to-br from-[#4C3D19]/5 via-white/90 to-green-50/80 border-[#4C3D19]/30"
                      : "bg-gradient-to-br from-white/90 via-white/80 to-gray-50/80 border-[#324D3E]/20";

                    // avatar source: fotoGambar -> default plantType image -> Leaf icon
                    const typeImage = getPlantTypeImage(plant.plantType);

                    return (
                      <Link key={plant.id} href={`/checker/plant/${plant.id}`}>
                        <div
                          className={`group ${cardBgColor} backdrop-blur-xl border rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden`}
                        >
                          <div className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-[#324D3E] to-[#4C3D19] shadow-lg group-hover:scale-110 transition-all duration-300 overflow-hidden">
                                  {plant.fotoGambar ? (
                                    <Image
                                      src={
                                        plant.fotoGambar || "/placeholder.svg"
                                      }
                                      alt={plant.instanceName}
                                      fill
                                      sizes="48px"
                                      className="object-cover"
                                    />
                                  ) : typeImage ? (
                                    <Image
                                      src={typeImage}
                                      alt={plant.plantType || "Plant type"}
                                      fill
                                      sizes="48px"
                                      className="object-cover"
                                      priority={false}
                                    />
                                  ) : (
                                    <Leaf className="w-6 h-6 text-white absolute inset-0 m-auto" />
                                  )}
                                  {isRecent && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                                      <div className="w-1 h-1 bg-white rounded-full absolute inset-0 m-auto animate-pulse"></div>
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h3 className="font-bold text-lg text-[#324D3E] group-hover:text-[#4C3D19] transition-colors mb-1">
                                    {plant.instanceName}
                                  </h3>
                                  <p className="text-xs text-[#889063]">
                                    QR: {plant.qrCode}
                                  </p>
                                </div>
                              </div>

                              <Badge
                                className={`${
                                  statusColors[plant.status] ||
                                  "bg-gray-100 text-gray-800"
                                } shadow-sm px-2 py-1 text-xs font-medium rounded-lg`}
                              >
                                {plant.status}
                              </Badge>
                            </div>

                            {/* Content */}
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-[#4C3D19]" />
                                <span className="text-[#324D3E]">
                                  Pemilik:{" "}
                                  <span className="font-medium">
                                    {plant.owner}
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-[#4C3D19]" />
                                  <span className="text-[#324D3E]">
                                    Lokasi:{" "}
                                    <span className="font-medium">
                                      {plant.location}
                                    </span>
                                  </span>
                                </div>
                                <div className="text-xs text-[#889063]">
                                  Contract ID: <br />
                                  {String(plant.contractNumber || "").slice(-9)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-[#324D3E]/10">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-[#889063]" />
                                  <span className="text-[#889063] text-xs">
                                    Update: {plant.lastUpdate}
                                  </span>
                                </div>
                                {isRecent && (
                                  <div className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium">
                                    Baru
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 mt-8">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl border border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] disabled:opacity-50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-1">
                        <ChevronLeft className="w-4 h-4" />
                        <span>Sebelumnya</span>
                      </div>
                    </Button>

                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-xl font-medium transition-all duration-300 ${
                              currentPage === page
                                ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                                : "border border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E]"
                            }`}
                          >
                            {page}
                          </Button>
                        )
                      )}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-xl border border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] disabled:opacity-50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-1">
                        <span>Selanjutnya</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const isRecentlyUpdated = (lastUpdate: string): boolean => {
  if (!lastUpdate) return false;
  const updateDate = new Date(lastUpdate.split("/").reverse().join("-"));
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return updateDate >= oneMonthAgo;
};
