"use client"

import { CheckerLayout } from "@/components/admin/CheckerLayout"
import { Badge } from "@/components/ui-staff/badge"
import { Button } from "@/components/ui-staff/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-staff/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-staff/select"
import { Textarea } from "@/components/ui-staff/textarea"
import type { Plant, PlantHistory, StatusOption } from "@/types/checker"
import jsPDF from "jspdf"
import {
  ArrowLeft,
  Camera,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Leaf,
  MapPin,
  QrCode,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { use, useEffect, useState } from "react"

const statusColors: Record<string, string> = {
  "Tanam Bibit": "bg-green-100 text-green-800",
  "Persiapan Bibit": "bg-blue-100 text-blue-800",
  "Buka Lahan": "bg-orange-100 text-orange-800",
  "Kontrak Baru": "bg-purple-100 text-purple-800",
  Pemupukan: "bg-yellow-100 text-yellow-800",
  Panen: "bg-red-100 text-red-800",
  Penyiraman: "bg-cyan-100 text-cyan-800",
  Pemangkasan: "bg-pink-100 text-pink-800",
}

const statusOptions: StatusOption[] = [
  { value: "tanam-bibit", label: "Tanam Bibit" },
  { value: "pemupukan", label: "Pemupukan" },
  { value: "penyiraman", label: "Penyiraman" },
  { value: "pemangkasan", label: "Pemangkasan" },
  { value: "panen", label: "Panen" },
]

export default function PlantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [plantData, setPlantData] = useState<Plant | null>(null)
  const [reportStatus, setReportStatus] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedHistory, setSelectedHistory] = useState<PlantHistory | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editNotes, setEditNotes] = useState("")

  useEffect(() => {
    fetchPlantData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchPlantData = async () => {
    try {
      const response = await fetch(`/api/plants/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPlantData(data)
      }
    } catch (error) {
      console.error("Error fetching plant data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.size <= 2 * 1024 * 1024) {
      setSelectedFile(file)
    } else {
      alert("File terlalu besar. Maksimal 2MB.")
    }
  }

  const handleSubmit = async () => {
    if (!reportStatus || !notes) {
      alert("Mohon lengkapi status dan catatan laporan.")
      return
    }

    setIsSubmitting(true)

    try {
      let imageUrl: string | null = null

      if (selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          imageUrl = uploadResult.imageUrl
        } else {
          const errorData = await uploadResponse.json()
          throw new Error(`Failed to upload image: ${errorData.details || errorData.error}`)
        }
      }

      const newHistoryEntry: PlantHistory = {
        id: Date.now(),
        type: statusOptions.find((s) => s.value === reportStatus)?.label || reportStatus,
        date: new Date().toLocaleDateString("id-ID"),
        description: notes,
        hasImage: !!selectedFile,
        imageUrl: imageUrl || undefined,
      }

      if (plantData) {
        const updatedPlant: Plant = {
          ...plantData,
          status: newHistoryEntry.type,
          lastUpdate: newHistoryEntry.date,
          history: [newHistoryEntry, ...plantData.history],
        }

        const response = await fetch(`/api/plants/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPlant),
        })

        if (response.ok) {
          setPlantData(updatedPlant)
          setReportStatus("")
          setNotes("")
          setSelectedFile(null)
          alert("Laporan berhasil disimpan!")
        } else {
          throw new Error("Failed to save report")
        }
      }
    } catch (error: unknown) {
      console.error("Error saving report:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      alert(`Gagal menyimpan laporan: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewDetail = (historyItem: PlantHistory) => {
    setSelectedHistory(historyItem)
    setShowModal(true)
    setIsEditing(false)
  }

  const handleUpdateHistory = async () => {
    if (!editNotes.trim() || !selectedHistory || !plantData) {
      alert("Catatan tidak boleh kosong.")
      return
    }

    try {
      const updatedHistory = plantData.history.map((item) =>
        item.id === selectedHistory.id ? { ...item, description: editNotes } : item,
      )

      const updatedPlant: Plant = { ...plantData, history: updatedHistory }

      const response = await fetch(`/api/plants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlant),
      })

      if (response.ok) {
        setPlantData(updatedPlant)
        setSelectedHistory({ ...selectedHistory, description: editNotes })
        setIsEditing(false)
        alert("Catatan berhasil diperbarui!")
      }
    } catch {
      console.error("Error updating history")
      alert("Gagal memperbarui catatan.")
    }
  }

  const handleDeleteHistory = async (historyId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus riwayat ini?") || !plantData) return

    try {
      const updatedHistory = plantData.history.filter((item) => item.id !== historyId)
      const updatedPlant: Plant = { ...plantData, history: updatedHistory }

      const response = await fetch(`/api/plants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlant),
      })

      if (response.ok) {
        setPlantData(updatedPlant)
        setShowModal(false)
        alert("Riwayat berhasil dihapus!")
      }
    } catch {
      console.error("Error deleting history")
      alert("Gagal menghapus riwayat.")
    }
  }

  const handleDownloadPhoto = () => {
    if (selectedHistory?.imageUrl) {
      const link = document.createElement("a")
      link.href = selectedHistory.imageUrl
      link.download = `${plantData?.instanceName || plantData?.name}-${selectedHistory.type}-${selectedHistory.date}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleDownloadHistoryPDF = async () => {
    if (!plantData) return

    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      try {
        const logoResponse = await fetch("/images/koperasi-logo.jpg")
        const logoBlob = await logoResponse.blob()
        const logoReader = new FileReader()

        await new Promise<void>((resolve) => {
          logoReader.onload = () => {
            const logoData = logoReader.result as string
            pdf.addImage(logoData, "JPEG", 20, yPosition, 30, 30)
            resolve()
          }
          logoReader.readAsDataURL(logoBlob)
        })

        pdf.setFontSize(16)
        pdf.setFont("helvetica", "bold")
        pdf.text("Koperasi Bintang Merah Sejahtera", 60, yPosition + 15)

        yPosition += 40
        pdf.line(20, yPosition, pageWidth - 20, yPosition)
        yPosition += 15
      } catch {
        pdf.setFontSize(16)
        pdf.setFont("helvetica", "bold")
        pdf.text("Koperasi Bintang Merah Sejahtera", 20, yPosition)
        yPosition += 20
      }

      pdf.setFontSize(18)
      pdf.setFont("helvetica", "bold")
      pdf.text(`Riwayat Tanaman: ${plantData.instanceName || plantData.name}`, 20, yPosition)
      yPosition += 10

      pdf.setFontSize(12)
      pdf.setFont("helvetica", "normal")
      pdf.text(`QR Code: ${plantData.qrCode}`, 20, yPosition)
      yPosition += 6
      pdf.text(`Pemilik: ${plantData.owner}`, 20, yPosition)
      yPosition += 6
      pdf.text(`Lokasi: ${plantData.location}`, 20, yPosition)
      yPosition += 15

      const sortedHistory = [...plantData.history].sort((a, b) => {
        const dateA = new Date(a.date.split("/").reverse().join("-"))
        const dateB = new Date(b.date.split("/").reverse().join("-"))
        return dateA.getTime() - dateB.getTime()
      })

      for (let i = 0; i < sortedHistory.length; i++) {
        const item = sortedHistory[i]

        if (yPosition > pageHeight - 60) {
          pdf.addPage()
          yPosition = 20
        }

        pdf.setFontSize(14)
        pdf.setFont("helvetica", "bold")
        pdf.text(`${i + 1}. ${item.type}`, 20, yPosition)
        yPosition += 8

        pdf.setFontSize(10)
        pdf.setFont("helvetica", "normal")
        pdf.text(`Tanggal: ${item.date}`, 20, yPosition)
        yPosition += 8

        if (item.imageUrl) {
          try {
            const response = await fetch(item.imageUrl)
            const blob = await response.blob()
            const reader = new FileReader()

            await new Promise<void>((resolve) => {
              reader.onload = () => {
                const imgData = reader.result as string
                const imgWidth = 60
                const imgHeight = 60

                if (yPosition + imgHeight > pageHeight - 20) {
                  pdf.addPage()
                  yPosition = 20
                }

                pdf.addImage(imgData, "JPEG", 20, yPosition, imgWidth, imgHeight)
                resolve()
              }
              reader.readAsDataURL(blob)
            })

            yPosition += 65
          } catch {
            pdf.text("Gambar tidak dapat dimuat", 20, yPosition)
            yPosition += 8
          }
        }

        pdf.setFontSize(10)
        pdf.setFont("helvetica", "bold")
        pdf.text("Catatan =", 20, yPosition)
        yPosition += 6

        pdf.setFont("helvetica", "normal")
        const splitDescription = pdf.splitTextToSize(item.description, pageWidth - 40)
        pdf.text(splitDescription, 20, yPosition)
        yPosition += splitDescription.length * 5 + 10

        pdf.line(20, yPosition, pageWidth - 20, yPosition)
        yPosition += 10
      }

      pdf.save(`Riwayat-${plantData.instanceName || plantData.name}-${plantData.qrCode}.pdf`)
    } catch {
      console.error("Error generating PDF")
      alert("Gagal membuat PDF. Silakan coba lagi.")
    }
  }

  if (loading) {
    return (
      <CheckerLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Detail Tanaman</h1>
            <p className="text-gray-600 mt-2">Memuat data tanaman...</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data tanaman...</p>
          </div>
        </div>
      </CheckerLayout>
    )
  }

  if (!plantData) {
    return (
      <CheckerLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Detail Tanaman</h1>
            <p className="text-gray-600 mt-2">Tanaman tidak ditemukan</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Tanaman Tidak Ditemukan</h1>
            <Link href="/checker" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Kembali ke Dashboard
            </Link>
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
          <Link href="/checker" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Detail Tanaman</h1>
          <p className="text-gray-600 mt-2">
            Monitor dan kelola tanaman {plantData.instanceName || plantData.name}
          </p>
        </div>

        {/* Plant Info Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              {/* Plant Avatar */}
              <div className="relative w-12 h-12 bg-emerald-500 rounded-lg overflow-hidden">
                {plantData.fotoGambar ? (
                  <Image
                    src={plantData.fotoGambar}
                    alt={plantData?.instanceName || plantData?.name || "Foto tanaman"}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <Leaf className="w-6 h-6 text-white absolute inset-0 m-auto" />
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600">Jenis Tanaman</p>
                <h2 className="text-xl font-bold text-gray-900">
                  {plantData.instanceName || plantData.name}
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">QR Code</p>
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-gray-900">{plantData.qrCode}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">No. Kontrak</p>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-gray-900">{plantData.contractNumber}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Pemilik</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-gray-900">{plantData.owner}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Lokasi Tanam</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-gray-900">{plantData.location}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-1 rounded border border-gray-200">
                  <Image
                    unoptimized
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                      `${typeof window !== "undefined" ? window.location.origin : ""}/checker/plant/${id}`,
                    )}`}
                    alt="QR Code"
                    className="w-16 h-16"
                    width={64}
                    height={64}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                        `${typeof window !== "undefined" ? window.location.origin : ""}/checker/plant/${id}`,
                      )}`

                      const response = await fetch(qrUrl)
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)

                      const link = document.createElement("a")
                      link.href = url
                      link.download = `QR-${plantData.instanceName || plantData.name}-${plantData.qrCode}.png`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)

                      window.URL.revokeObjectURL(url)
                    } catch (error) {
                      console.error("Error downloading QR code:", error)
                      alert("Gagal mendownload QR code")
                    }
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-2 py-1"
                >
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Laporan & Perawatan */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-600">
                <FileText className="w-5 h-5" />
                Form Laporan & Perawatan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto Tanaman (Wajib, Max 2MB)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-emerald-600 mb-2">
                      {selectedFile ? selectedFile.name : "Klik untuk upload atau seret foto"}
                    </p>
                    {selectedFile && (
                      <p className="text-sm text-gray-500">
                        Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </label>
                </div>
              </div>

              {/* Status Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status Laporan</label>
                <Select value={reportStatus} onValueChange={setReportStatus}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Pilih status..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-gray-900">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                <Textarea
                  placeholder="Contoh: Pemupukan NPK dosis 10gr atau Laporan tanaman terkena banjir..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white border-gray-300 min-h-[120px] text-gray-900 placeholder:text-gray-500"
                />
              </div>

              <Button
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Laporan"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Clock className="w-5 h-5" />
                  Riwayat Tanaman
                </CardTitle>
                <Button
                  onClick={handleDownloadHistoryPDF}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plantData.history.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.imageUrl ? (
                        <Image
                          unoptimized
                          src={item.imageUrl || "/placeholder.svg"}
                          alt="Plant photo"
                          className="w-full h-full object-cover rounded-lg"
                          width={64}
                          height={64}
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`${statusColors[item.type] || "bg-gray-100 text-gray-800"}`}>{item.type}</Badge>
                        <span className="text-sm text-gray-500">{item.date}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{item.description}</p>
                      {/* Action buttons for each history item */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetail(item)}
                            className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Detail
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedHistory(item)
                              setEditNotes(item.description)
                              setIsEditing(true)
                              setShowModal(true)
                            }}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Update
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteHistory(item.id)}
                          className="bg-red-500 hover:bg-red-600 text-white border-red-500 p-2 min-w-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal for history detail view and editing */}
        {showModal && selectedHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{isEditing ? "Edit Riwayat" : "Detail Riwayat"}</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowModal(false)
                      setIsEditing(false)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Large Image Display */}
                  <div className="space-y-4">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {selectedHistory.imageUrl ? (
                        <Image
                          unoptimized
                          src={selectedHistory.imageUrl || "/placeholder.svg"}
                          alt="Plant photo"
                          className="w-full h-full object-cover"
                          width={64}
                          height={64}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <Card className="bg-gray-50 border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`${statusColors[selectedHistory.type] || "bg-gray-100 text-gray-800"}`}>
                            {selectedHistory.type}
                          </Badge>
                          <span className="text-sm text-gray-500">{selectedHistory.date}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-4">
                    <Card className="bg-gray-50 border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-gray-900">Catatan</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isEditing ? (
                          <div className="space-y-4">
                            <Textarea
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              className="bg-white text-gray-900 border-gray-300 min-h-[120px]"
                              placeholder="Masukkan catatan..."
                            />
                            <div className="flex gap-2">
                              <Button onClick={handleUpdateHistory} className="bg-emerald-500 hover:bg-emerald-600">
                                Simpan
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                                className="border-gray-300 text-gray-700"
                              >
                                Batal
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">{selectedHistory.description}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Optional actions */}
                <div className="flex items-center justify-end gap-2 mt-6">
                  {selectedHistory?.imageUrl && (
                    <Button onClick={handleDownloadPhoto} className="bg-emerald-500 hover:bg-emerald-600">
                      Download Foto
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CheckerLayout>
  )
}
