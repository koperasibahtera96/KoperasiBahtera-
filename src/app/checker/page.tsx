"use client"

import LandingNavbar from '@/components/landing/LandingNavbar'
import { Badge } from "@/components/ui-staff/badge"
import { Button } from "@/components/ui-staff/button"
import { Input } from "@/components/ui-staff/input"
import type { PlantInstance } from "@/types/checker"
import { Calendar, ChevronLeft, ChevronRight, Leaf, MapPin, Search, User } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"
import type React from "react"
import { useEffect, useState } from "react"


const statusColors: Record<string, string> = {
  "Tanam Bibit": "bg-[#4C3D19]/10 text-[#4C3D19] border border-[#4C3D19]/20",
  "Kontrak Baru": "bg-[#324D3E]/10 text-[#324D3E] border border-[#324D3E]/20",
  Panen: "bg-red-50 text-red-600 border border-red-200",
  Pemupukan: "bg-yellow-50 text-yellow-600 border border-yellow-200",
}

const PLANTS_PER_PAGE = 9

export default function StaffDashboard() {
  const [plants, setPlants] = useState<PlantInstance[]>([])
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
    const uniqueNames = [...new Set(plants.map((plant) => plant.instanceName))].sort()
    return uniqueNames
  }

  const filteredPlants = plants.filter((plant) => {
    const matchesSearch =
      plant.instanceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plant.memberId.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeFilter === "Semua Tanaman") return matchesSearch
    if (activeFilter === "Berdasarkan Tanaman") {
      if (selectedPlantName) {
        return matchesSearch && plant.instanceName === selectedPlantName
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-[family-name:var(--font-poppins)]">
        <header className="w-full fixed top-0 z-50">
          <LandingNavbar hideNavigation={true} />
        </header>

        <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="space-y-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">Dashboard Staff Lapangan</h1>
              <p className="text-[#889063] text-lg">Memuat data tanaman...</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map((i) => (
                <div key={i} className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg border border-[#324D3E]/10 p-8 animate-pulse hover:shadow-2xl hover:scale-105 transition-all duration-300">
                  <div className="h-4 bg-[#324D3E]/20 rounded-full w-1/2 mb-3"></div>
                  <div className="h-8 bg-[#324D3E]/20 rounded-full w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-[family-name:var(--font-poppins)]">
      <header className="w-full fixed top-0 z-50">
        <LandingNavbar hideNavigation={true} />
      </header>

      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-8 py-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">Dashboard Staff Lapangan</h1>
            <p className="text-[#889063] text-lg">Kelola dan monitor tanaman investasi di lapangan</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="group bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <p className="text-sm font-medium text-[#889063] mb-2">Total Tanaman</p>
                <p className="text-3xl font-bold text-[#324D3E] group-hover:text-[#4C3D19] transition-colors">{plants.length}</p>
              </div>
            </div>

            <div className="group bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <p className="text-sm font-medium text-[#889063] mb-2">Tanaman Sehat</p>
                <p className="text-3xl font-bold text-[#4C3D19] group-hover:text-green-600 transition-colors">{plants.filter(p => p.status === "Tanam Bibit" || p.status === "Tumbuh Sehat").length}</p>
              </div>
            </div>

            <div className="group bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <p className="text-sm font-medium text-[#889063] mb-2">Perlu Perawatan</p>
                <p className="text-3xl font-bold text-yellow-600 group-hover:text-orange-600 transition-colors">{plants.filter(p => p.status === "Perlu Perawatan").length}</p>
              </div>
            </div>

            <div className="group bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-6 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="text-center">
                <p className="text-sm font-medium text-[#889063] mb-2">Update Terbaru</p>
                <p className="text-3xl font-bold text-[#324D3E] group-hover:text-blue-600 transition-colors">{plants.filter(p => isRecentlyUpdated(p.lastUpdate)).length}</p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-8 mb-8">
            <div className="flex flex-col gap-8">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  variant={activeFilter === "Semua Tanaman" ? "default" : "outline"}
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
                  variant={activeFilter === "Berdasarkan Tanaman" ? "default" : "outline"}
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

              {/* Plant Name Filters */}
              {activeFilter === "Berdasarkan Tanaman" && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-semibold text-[#324D3E] text-center">Pilih Jenis Tanaman</h3>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scrollPlantFilters("left")}
                      className="h-12 w-12 p-0 border-2 border-[#324D3E]/30 hover:bg-[#324D3E]/10 hover:border-[#324D3E] flex-shrink-0 rounded-2xl group transition-all duration-300"
                      disabled={plantFilterScrollPosition === 0}
                    >
                      <ChevronLeft className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </Button>

                    <div className="flex-1 overflow-hidden">
                      <div
                        id="plant-filters-container"
                        className="flex gap-4 overflow-x-hidden transition-transform duration-500 ease-out"
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
                            className={`whitespace-nowrap flex-shrink-0 px-4 py-2 rounded-xl font-medium transition-all duration-300 min-w-[120px] ${
                              selectedPlantName === plantName
                                ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                                : "border border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate text-sm">{plantName}</span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scrollPlantFilters("right")}
                      className="h-12 w-12 p-0 border-2 border-[#324D3E]/30 hover:bg-[#324D3E]/10 hover:border-[#324D3E] flex-shrink-0 rounded-2xl group transition-all duration-300"
                      disabled={plantFilterScrollPosition >= (getUniquePlantNames().length - 8) * 136}
                    >
                      <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </Button>
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

          {/* Results Summary */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-[#324D3E]/10 p-4 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 text-center lg:text-left">
              <p className="text-[#324D3E] font-medium">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredPlants.length)} dari {filteredPlants.length} tanaman
              </p>
              <p className="text-[#889063]">
                Halaman {currentPage} dari {totalPages}
              </p>
            </div>
          </div>

          {/* Plants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {currentPlants.map((plant) => {
              const isRecent = isRecentlyUpdated(plant.lastUpdate)
              const cardBgColor = isRecent
                ? "bg-gradient-to-br from-[#4C3D19]/5 via-white/90 to-green-50/80 border-[#4C3D19]/30"
                : "bg-gradient-to-br from-white/90 via-white/80 to-gray-50/80 border-[#324D3E]/20"

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
                                src={plant.fotoGambar || "/placeholder.svg"}
                                alt={plant.instanceName}
                                fill
                                sizes="48px"
                                className="object-cover"
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
                            <h3 className="font-bold text-lg text-[#324D3E] group-hover:text-[#4C3D19] transition-colors mb-1">{plant.instanceName}</h3>
                            <p className="text-xs text-[#889063]">QR: {plant.qrCode}</p>
                          </div>
                        </div>

                        <Badge className={`${statusColors[plant.status] || "bg-gray-100 text-gray-800"} shadow-sm px-2 py-1 text-xs font-medium rounded-lg`}>
                          {plant.status}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#4C3D19]" />
                          <span className="text-[#324D3E]">
                            Pemilik: <span className="font-medium">{plant.owner}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#4C3D19]" />
                            <span className="text-[#324D3E]">
                              Lokasi: <span className="font-medium">{plant.location}</span>
                            </span>
                          </div>
                          <div className="text-xs text-[#889063]">
                            ID: {plant.memberId}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[#324D3E]/10">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#889063]" />
                            <span className="text-[#889063] text-xs">Update: {plant.lastUpdate}</span>
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
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#324D3E]/10 p-6 mt-8">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] disabled:opacity-50 transition-all duration-300"
                >
                  <div className="flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" />
                    <span>Sebelumnya</span>
                  </div>
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-xl font-medium transition-all duration-300 ${
                        currentPage === page
                          ? "bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white shadow-lg"
                          : "border border-[#324D3E]/30 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E]"
                      }`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
      </main>
    </div>
  )
}

const isRecentlyUpdated = (lastUpdate: string): boolean => {
  const updateDate = new Date(lastUpdate.split("/").reverse().join("-"))
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  return updateDate >= oneMonthAgo
}
