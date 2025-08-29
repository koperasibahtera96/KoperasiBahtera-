"use client"

import { CheckerLayout } from "@/components/admin/CheckerLayout"
import { Badge } from "@/components/ui-staff/badge"
import { Button } from "@/components/ui-staff/button"
import { Input } from "@/components/ui-staff/input"
import type { Plant } from "@/types/checker"
import Image from "next/image"
import Link from "next/link"
import type React from "react"
import { useEffect, useState } from "react"

const User = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const MapPin = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M21 10A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const Calendar = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
)

const Leaf = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const Search = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const ChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="15,18 9,12 15,6" />
  </svg>
)

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="9,18 15,12 9,6" />
  </svg>
)

const statusColors: Record<string, string> = {
  "Tanam Bibit": "bg-green-100 text-green-800",
  "Kontrak Baru": "bg-purple-100 text-purple-800",
  Panen: "bg-red-100 text-red-800",
  Pemupukan: "bg-yellow-100 text-yellow-800",
}

const PLANTS_PER_PAGE = 9

export default function StaffDashboard() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("Semua Tanaman")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPlantName, setSelectedPlantName] = useState("")
  const [plantFilterScrollPosition, setPlantFilterScrollPosition] = useState(0)

  useEffect(() => {
    fetchPlants()
  }, [])
const fetchPlants = async () => {
  try {
    const res = await fetch("/api/plants", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch /api/plants");

    const json = await res.json();

    // Terima dua format: array langsung ATAU { data: [...] }
    const raw: any[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];

    // Normalisasi properti yang dipakai UI (tanpa mengubah layout/logic lain)
    const normalized = raw.map((p: any) => ({
      ...p,
      name: p.name ?? p.instanceName ?? "", // UI pakai 'name'
      owner: p.owner ?? "",
      memberId: p.memberId ?? "",
      location: p.location ?? "",
      status: p.status ?? "Kontrak Baru",
      lastUpdate: p.lastUpdate ?? "",
      fotoGambar: p.fotoGambar ?? "",
    }));

    setPlants(normalized);
  } catch (err) {
    console.error("Error fetching plants:", err);
    setPlants([]); // biar UI tetap jalan
  } finally {
    setLoading(false);
  }
};


  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const getUniquePlantNames = (): string[] => {
    const uniqueNames = [...new Set(plants.map((plant) => plant.name))].sort()
    return uniqueNames
  }

  const filteredPlants = plants.filter((plant) => {
    const matchesSearch =
      plant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.memberId.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeFilter === "Semua Tanaman") return matchesSearch
    if (activeFilter === "Berdasarkan Tanaman") {
      if (selectedPlantName) {
        return matchesSearch && plant.name === selectedPlantName
      }
      return matchesSearch
    }

    return matchesSearch
  })

  const totalPages = Math.ceil(filteredPlants.length / PLANTS_PER_PAGE)
  const startIndex = (currentPage - 1) * PLANTS_PER_PAGE
  const endIndex = startIndex + PLANTS_PER_PAGE
  const currentPlants = filteredPlants.slice(startIndex, endIndex)

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    setCurrentPage(1)
    if (filter !== "Berdasarkan Tanaman") {
      setSelectedPlantName("")
    }
  }

  const handlePlantNameFilter = (plantName: string) => {
    setSelectedPlantName(selectedPlantName === plantName ? "" : plantName)
    setCurrentPage(1)
  }

  const scrollPlantFilters = (direction: "left" | "right") => {
    const buttonWidth = 136 // 128px width + 8px gap
    const visibleButtons = 8
    const maxScroll = Math.max(0, (getUniquePlantNames().length - visibleButtons) * buttonWidth)

    let newPosition = plantFilterScrollPosition

    if (direction === "left") {
      newPosition = Math.max(0, plantFilterScrollPosition - buttonWidth * 2)
    } else {
      newPosition = Math.min(maxScroll, plantFilterScrollPosition + buttonWidth * 2)
    }

    setPlantFilterScrollPosition(newPosition)
  }

  if (loading) {
    return (
      <CheckerLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard Staff Lapangan</h1>
            <p className="text-gray-600 mt-2">Memuat data tanaman...</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </CheckerLayout>
    )
  }

  return (
    <CheckerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard Staff Lapangan</h1>
          <p className="text-gray-600 mt-2">Kelola dan monitor tanaman investasi di lapangan</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">🌳 Total Tanaman</p>
              <p className="text-2xl font-bold text-gray-900">{plants.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">✅ Tanaman Sehat</p>
              <p className="text-2xl font-bold text-green-600">{plants.filter(p => p.status === "Tanam Bibit" || p.status === "Tumbuh Sehat").length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">⚠️ Perlu Perawatan</p>
              <p className="text-2xl font-bold text-yellow-600">{plants.filter(p => p.status === "Perlu Perawatan").length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div>
              <p className="text-sm font-medium text-gray-600">🔄 Update Terbaru</p>
              <p className="text-2xl font-bold text-blue-600">{plants.filter(p => isRecentlyUpdated(p.lastUpdate)).length}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              variant={activeFilter === "Semua Tanaman" ? "default" : "outline"}
              onClick={() => handleFilterChange("Semua Tanaman")}
              className={
                activeFilter === "Semua Tanaman"
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }
            >
              <Leaf className="w-4 h-4 mr-2" />
              Semua Tanaman
            </Button>
            <Button
              variant={activeFilter === "Berdasarkan Tanaman" ? "default" : "outline"}
              onClick={() => handleFilterChange("Berdasarkan Tanaman")}
              className={
                activeFilter === "Berdasarkan Tanaman"
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }
            >
              <Leaf className="w-4 h-4 mr-2" />
              Berdasarkan Tanaman
            </Button>
          </div>

          {activeFilter === "Berdasarkan Tanaman" && (
            <div className="mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrollPlantFilters("left")}
                  className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 flex-shrink-0"
                  disabled={plantFilterScrollPosition === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex-1 overflow-hidden">
                  <div
                    id="plant-filters-container"
                    className="flex gap-2 overflow-x-hidden transition-transform duration-300 ease-in-out"
                    style={{
                      transform: `translateX(-${plantFilterScrollPosition}px)`,
                      width: "max-content",
                    }}
                  >
                    {getUniquePlantNames().map((plantName) => (
                      <Button
                        key={plantName}
                        variant={selectedPlantName === plantName ? "default" : "outline"}
                        onClick={() => handlePlantNameFilter(plantName)}
                        className={`whitespace-nowrap flex-shrink-0 px-4 py-2 w-32 ${
                          selectedPlantName === plantName
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="truncate">{plantName}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrollPlantFilters("right")}
                  className="h-8 w-8 p-0 border-gray-300 hover:bg-gray-50 flex-shrink-0"
                  disabled={plantFilterScrollPosition >= (getUniquePlantNames().length - 8) * 136}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Cari tanaman, pemilik, atau ID anggota..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-12 h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 rounded-lg shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <p className="text-gray-600">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredPlants.length)} dari {filteredPlants.length} tanaman
            </p>
            <p className="text-gray-600">
              Halaman {currentPage} dari {totalPages}
            </p>
          </div>
        </div>

        {/* Plants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentPlants.map((plant) => {
            const isRecent = isRecentlyUpdated(plant.lastUpdate)
            const cardBgColor = isRecent
              ? "bg-green-50 border-green-200"
              : "bg-white border-gray-200"

            return (
              <Link key={plant.id} href={`/checker/plant/${plant.id}`}>
                <div
                  className={`${cardBgColor} border rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group overflow-hidden`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative w-12 h-12 rounded-xl bg-emerald-500 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                          {plant.fotoGambar ? (
                            <Image
                              src={plant.fotoGambar || "/placeholder.svg"}
                              alt={plant.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <Leaf className="w-7 h-7 text-white absolute inset-0 m-auto" />
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{plant.name}</h3>
                          <p className="text-sm text-gray-500">QR: {plant.qrCode}</p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[plant.status] || "bg-gray-100 text-gray-800"} shadow-sm`}>
                        {plant.status}
                      </Badge>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-gray-700">
                        <User className="w-4 h-4 text-emerald-500" />
                        <span>
                          Pemilik: <span className="font-medium">{plant.owner}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-gray-700">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                          <span>
                            Lokasi: <span className="font-medium">{plant.location}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <span className="text-emerald-500 font-bold">#</span>
                          <span className="text-xs">ID: {plant.memberId}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-gray-500 pt-3 border-t border-gray-200">
                        <Calendar className="w-4 h-4" />
                        <span>Update terakhir: {plant.lastUpdate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:p-6">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Sebelumnya
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                    className={
                      currentPage === page
                        ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white w-10 h-10"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50 w-10 h-10"
                    }
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </CheckerLayout>
  )
}

const isRecentlyUpdated = (lastUpdate: string): boolean => {
  const updateDate = new Date(lastUpdate.split("/").reverse().join("-"))
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  return updateDate >= oneMonthAgo
}
