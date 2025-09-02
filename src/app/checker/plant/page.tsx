"use client"

import { Badge } from "@/components/ui-staff/badge"
import { Button } from "@/components/ui-staff/button"
import { Card, CardContent, CardHeader } from "@/components/ui-staff/card"
import { Input } from "@/components/ui-staff/input"
import { useAlert } from "@/components/ui/Alert"
import { Calendar } from "lucide-react"
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

// const Calendar = ({ className }: { className?: string }) => (
//   <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//     <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
//     <line x1="16" x2="16" y1="2" y2="6" />
//     <line x1="8" x2="8" y1="2" y2="6" />
//     <line x1="3" x2="21" y1="10" y2="10" />
//   </svg>
// )

const LogOut = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" x2="9" y1="12" y2="12" />
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



const statusColors = {
  "Tanam Bibit": "bg-primary text-primary-foreground",
  "Kontrak Baru": "bg-secondary text-secondary-foreground",
  Panen: "bg-accent text-accent-foreground",
  Pemupukan: "bg-chart-4 text-white",
}

const PLANTS_PER_PAGE = 9

export default function StaffDashboard() {
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState("Semua Tanaman")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [_migrating, _setMigrating] = useState(false)
  const [_seeding, _setSeeding] = useState(false)
  const [selectedPlantName, setSelectedPlantName] = useState("")
  const [plantFilterScrollPosition, setPlantFilterScrollPosition] = useState(0)
  const { showSuccess, showError, AlertComponent } = useAlert()

  useEffect(() => {
    fetchPlants()
  }, [])

  const fetchPlants = async () => {
    try {
      const response = await fetch("/api/plants")
      if (response.ok) {
        const data = await response.json()
        setPlants(data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    } finally {
      setLoading(false)
    }
  }

  // const handleMigrate = async () => {
  //   setMigrating(true)
  //   try {
  //     const response = await fetch("/api/migrate", { method: "POST" })
  //     const result = await response.json()

  //     if (response.ok) {
  //       alert(`Migration successful! ${result.count} plants migrated to MongoDB.`)
  //       await fetchPlants()
  //     } else {
  //       alert(`Migration failed: ${result.error}`)
  //     }
  //   } catch (error) {
  //     console.error("Migration error:", error)
  //     alert("Migration failed: Network error")
  //   } finally {
  //     setMigrating(false)
  //   }
  // }

  // const handleSeedGaharu = async () => {
  //   setSeeding(true)
  //   try {
  //     const response = await fetch("/api/plants/seed-gaharu", { method: "POST" })
  //     const result = await response.json()

  //     if (response.ok) {
  //       alert(`Success! ${result.plants.length} new Gaharu plants added to database.`)
  //       await fetchPlants()
  //     } else {
  //       alert(`Failed to add Gaharu plants: ${result.error}`)
  //     }
  //   } catch (error) {
  //     console.error("Seeding error:", error)
  //     alert("Failed to add Gaharu plants: Network error")
  //   } finally {
  //     setSeeding(false)
  //   }
  // }

  const handleAddFotoGambar = async () => {
    try {
      const response = await fetch("/api/plants/add-foto-gambar", { method: "POST" })
      const result = await response.json()

      if (response.ok) {
        showSuccess('Success!', `Added fotoGambar field to ${result.modifiedCount} plants.`)
        await fetchPlants()
      } else {
        showError('Failed', `Failed to add fotoGambar field: ${result.error}`)
      }
    } catch (error) {
      console.error("Add fotoGambar error:", error)
      showError('Network Error', 'Failed to add fotoGambar field: Network error')
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const getUniquePlantNames = () => {
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
      <div className="min-h-screen bg-background text-foreground dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Memuat data tanaman...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <AlertComponent />
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <Leaf className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">Koperasi Tani Digital</h1>
                <p className="text-muted-foreground">
                  Selamat datang, <span className="text-primary font-medium">staff</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddFotoGambar} className="bg-blue-600 hover:bg-blue-700 text-white">
                Add FotoGambar Field
              </Button>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            variant={activeFilter === "Semua Tanaman" ? "default" : "outline"}
            onClick={() => handleFilterChange("Semua Tanaman")}
            className={
              activeFilter === "Semua Tanaman"
                ? "bg-primary text-primary-foreground shadow-md"
                : "border-border text-muted-foreground hover:bg-muted"
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
                ? "bg-primary text-primary-foreground shadow-md"
                : "border-border text-muted-foreground hover:bg-muted"
            }
          >
            <Leaf className="w-4 h-4 mr-2" />
            Berdasarkan Tanaman
          </Button>
        </div>

        {activeFilter === "Berdasarkan Tanaman" && (
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollPlantFilters("left")}
                className="h-8 w-8 p-0 border-border hover:bg-muted flex-shrink-0"
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
                      className={`whitespace-nowrap flex-shrink-0 px-4 py-2 w-32 ${selectedPlantName === plantName
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "border-border text-muted-foreground hover:bg-muted"
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
                className="h-8 w-8 p-0 border-border hover:bg-muted flex-shrink-0"
                disabled={plantFilterScrollPosition >= (getUniquePlantNames().length - 8) * 136}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Cari tanaman, pemilik, atau ID anggota..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-12 h-12 bg-input border-border text-foreground placeholder:text-muted-foreground rounded-xl shadow-sm"
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredPlants.length)} dari {filteredPlants.length}{" "}
            tanaman
          </p>
          <p className="text-muted-foreground">
            Halaman {currentPage} dari {totalPages}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {currentPlants.map((plant) => {
            const isRecent = isRecentlyUpdated(plant.lastUpdate)
            const cardBgColor = isRecent
              ? "bg-green-500/10 border-green-500/20"
              : "bg-yellow-400/15 border-yellow-400/30"

            return (
              <Link key={plant.id} href={`/staff/plant/${plant.id}`}>
                <Card
                  className={`${cardBgColor} hover:shadow-lg transition-all duration-200 cursor-pointer group rounded-xl overflow-hidden`}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        {/* === AVATAR: foto memenuhi penuh kotak hijau === */}
                        <div className="relative w-12 h-12 rounded-xl bg-primary shadow-md group-hover:scale-105 transition-transform overflow-hidden">
                          {plant.fotoGambar ? (
                            <Image
                              src={plant.fotoGambar || "/placeholder.svg"}
                              alt={plant.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <Leaf className="w-7 h-7 text-primary-foreground absolute inset-0 m-auto" />
                          )}
                        </div>
                        {/* === /AVATAR === */}

                        <div>
                          <h3 className="font-bold text-lg text-card-foreground">{plant.name}</h3>
                          <p className="text-sm text-muted-foreground">QR: {plant.qrCode}</p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[plant.status as keyof typeof statusColors]} shadow-sm`}>{plant.status}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-card-foreground">
                        <User className="w-4 h-4 text-primary" />
                        <span>
                          Pemilik: <span className="font-medium">{plant.owner}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-card-foreground">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>
                            Lokasi: <span className="font-medium">{plant.location}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-primary font-bold">#</span>
                          <span className="text-xs">ID: {plant.memberId}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground pt-3 border-t border-border">
                        <Calendar className="w-4 h-4" />
                        <span>Update terakhir: {plant.lastUpdate}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
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
                      ? "bg-primary text-primary-foreground w-10 h-10"
                      : "border-border text-muted-foreground hover:bg-muted w-10 h-10"
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
              className="border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Selanjutnya
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

const isRecentlyUpdated = (lastUpdate: string) => {
  const updateDate = new Date(lastUpdate.split("/").reverse().join("-"))
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  return updateDate >= oneMonthAgo
}
