"use client"

import LandingNavbar from '@/components/landing/LandingNavbar'
import { Badge } from "@/components/ui-staff/badge"
import { Button } from "@/components/ui-staff/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-staff/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-staff/select"
import { Textarea } from "@/components/ui-staff/textarea"
import type { PlantInstance, PlantHistory, StatusOption } from "@/types/checker"
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
  "Tanam Bibit": "bg-[#4C3D19]/10 text-[#4C3D19] border border-[#4C3D19]/20",
  "Persiapan Bibit": "bg-blue-50 text-blue-600 border border-blue-200",
  "Buka Lahan": "bg-orange-50 text-orange-600 border border-orange-200",
  "Kontrak Baru": "bg-[#324D3E]/10 text-[#324D3E] border border-[#324D3E]/20",
  Pemupukan: "bg-yellow-50 text-yellow-600 border border-yellow-200",
  Panen: "bg-red-50 text-red-600 border border-red-200",
  Penyiraman: "bg-cyan-50 text-cyan-600 border border-cyan-200",
  Pemangkasan: "bg-pink-50 text-pink-600 border border-pink-200",
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
  const [plantData, setPlantData] = useState<PlantInstance | null>(null)
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

      const newHistoryEntry: any = {
        id: Date.now(),
        type: statusOptions.find((s) => s.value === reportStatus)?.label || reportStatus,
        date: new Date().toLocaleDateString("id-ID"),
        description: notes,
        hasImage: !!selectedFile,
        imageUrl: imageUrl || undefined,
      }

      if (plantData) {
        const updatedPlant: PlantInstance = {
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

      const updatedPlant: PlantInstance = { ...plantData, history: updatedHistory }

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
      const updatedPlant: PlantInstance = { ...plantData, history: updatedHistory }

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
      link.download = `${plantData?.instanceName || ""}-${selectedHistory.type}-${selectedHistory.date}.jpg`
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
      pdf.text(`Riwayat Tanaman: ${plantData.instanceName || ""}`, 20, yPosition)
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

      pdf.save(`Riwayat-${plantData.instanceName || ""}-${plantData.qrCode}.pdf`)
    } catch {
      console.error("Error generating PDF")
      alert("Gagal membuat PDF. Silakan coba lagi.")
    }
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
              <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">Detail Tanaman</h1>
              <p className="text-[#889063] text-lg">Memuat data tanaman...</p>
            </div>
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#324D3E] mx-auto mb-6"></div>
              <p className="text-[#889063] text-lg">Memuat data tanaman...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!plantData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-[family-name:var(--font-poppins)]">
        <header className="w-full fixed top-0 z-50">
          <LandingNavbar hideNavigation={true} />
        </header>
        
        <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="space-y-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">Detail Tanaman</h1>
              <p className="text-[#889063] text-lg">Tanaman tidak ditemukan</p>
            </div>
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-12 text-center">
              <h2 className="text-2xl font-bold text-[#324D3E] mb-4">Tanaman Tidak Ditemukan</h2>
              <Link href="/checker" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white font-medium rounded-2xl hover:shadow-lg transition-all duration-300">
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </Link>
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
          <div className="text-center">
            <Link href="/checker" className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-lg text-[#324D3E] hover:bg-[#324D3E] hover:text-white font-medium rounded-2xl border border-[#324D3E]/20 mb-6 transition-all duration-300">
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </Link>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">Detail Tanaman</h1>
            <p className="text-[#889063] text-lg">
              Monitor dan kelola tanaman {plantData.instanceName ||""}
            </p>
          </div>

          {/* Plant Info Header */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center gap-4">
                {/* Plant Avatar */}
                <div className="relative w-16 h-16 bg-gradient-to-br from-[#324D3E] to-[#4C3D19] rounded-2xl overflow-hidden shadow-lg">
                  {plantData.fotoGambar ? (
                    <Image
                      src={plantData.fotoGambar}
                      alt={plantData?.instanceName ||  "Foto tanaman"}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <Leaf className="w-8 h-8 text-white absolute inset-0 m-auto" />
                  )}
                </div>

                <div>
                  <p className="text-sm text-[#889063] mb-1">Jenis Tanaman</p>
                  <h2 className="text-2xl font-bold text-[#324D3E]">
                    {plantData.instanceName || ""}
                  </h2>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                  <p className="text-sm text-[#889063] mb-1">QR Code</p>
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#4C3D19]" />
                    <span className="font-semibold text-[#324D3E]">{plantData.qrCode}</span>
                  </div>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                  <p className="text-sm text-[#889063] mb-1">No. Kontrak</p>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4C3D19]" />
                    <span className="font-semibold text-[#324D3E]">{plantData.contractNumber}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                    <p className="text-sm text-[#889063] mb-1">Pemilik</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#4C3D19]" />
                      <span className="font-semibold text-[#324D3E]">{plantData.owner}</span>
                    </div>
                  </div>

                  <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                    <p className="text-sm text-[#889063] mb-1">Lokasi Tanam</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#4C3D19]" />
                      <span className="font-semibold text-[#324D3E]">{plantData.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white/80 p-3 rounded-2xl border border-[#324D3E]/20 shadow-lg">
                    <Image
                      unoptimized
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                        `${typeof window !== "undefined" ? window.location.origin : ""}/checker/plant/${id}`,
                      )}`}
                      alt="QR Code"
                      className="w-20 h-20"
                      width={80}
                      height={80}
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
                        link.download = `QR-${plantData.instanceName || ""}-${plantData.qrCode}.png`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)

                        window.URL.revokeObjectURL(url)
                      } catch (error) {
                        console.error("Error downloading QR code:", error)
                        alert("Gagal mendownload QR code")
                      }
                    }}
                    className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:shadow-lg text-white text-xs px-4 py-2 rounded-xl transition-all duration-300"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Laporan & Perawatan */}
            <Card className="bg-white/90 backdrop-blur-xl border-[#324D3E]/10 rounded-3xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#324D3E] text-xl">
                  <FileText className="w-6 h-6" />
                  Form Laporan & Perawatan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] mb-3">Foto Tanaman (Wajib, Max 2MB)</label>
                  <div className="border-2 border-dashed border-[#324D3E]/30 rounded-2xl p-8 text-center hover:border-[#324D3E] hover:bg-[#324D3E]/5 transition-all duration-300 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-[#889063]" />
                      <p className="text-[#324D3E] mb-2 font-medium">
                        {selectedFile ? selectedFile.name : "Klik untuk upload atau seret foto"}
                      </p>
                      {selectedFile && (
                        <p className="text-sm text-[#889063]">
                          Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </label>
                  </div>
                </div>

                {/* Status Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] mb-3">Status Laporan</label>
                  <Select value={reportStatus} onValueChange={setReportStatus}>
                    <SelectTrigger className="bg-white border-[#324D3E]/20 text-[#324D3E] rounded-xl h-12 focus:ring-2 focus:ring-[#324D3E]/20">
                      <SelectValue placeholder="Pilih status..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#324D3E]/20 rounded-xl">
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-[#324D3E]">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] mb-3">Catatan</label>
                  <Textarea
                    placeholder="Contoh: Pemupukan NPK dosis 10gr atau Laporan tanaman terkena banjir..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white border-[#324D3E]/20 min-h-[120px] text-[#324D3E] placeholder:text-[#889063] rounded-xl focus:ring-2 focus:ring-[#324D3E]/20"
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:shadow-lg disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-all duration-300"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Laporan"}
                </Button>
            </CardContent>
          </Card>

            <Card className="bg-white/90 backdrop-blur-xl border-[#324D3E]/10 rounded-3xl shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-[#324D3E] text-xl">
                    <Clock className="w-6 h-6" />
                    Riwayat Tanaman
                  </CardTitle>
                  <Button
                    onClick={handleDownloadHistoryPDF}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-lg text-white rounded-xl"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {plantData.history.map((item) => (
                    <div key={item.id} className="flex gap-4 p-6 bg-white/60 rounded-2xl border border-[#324D3E]/10 hover:bg-white/80 transition-all duration-300">
                      <div className="w-20 h-20 bg-[#324D3E]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        {item.imageUrl ? (
                          <Image
                            unoptimized
                            src={item.imageUrl || "/placeholder.svg"}
                            alt="Plant photo"
                            className="w-full h-full object-cover rounded-2xl"
                            width={80}
                            height={80}
                          />
                        ) : (
                          <Camera className="w-6 h-6 text-[#889063]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`${statusColors[item.type] || "bg-gray-100 text-gray-800"} rounded-xl px-3 py-1`}>{item.type}</Badge>
                          <span className="text-sm text-[#889063]">{item.date}</span>
                        </div>
                        <p className="text-sm text-[#324D3E] mb-3">{item.description}</p>
                        {/* Action buttons for each history item */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetail(item)}
                              className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500 rounded-xl"
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
                              className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 rounded-xl"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Update
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteHistory(item.id)}
                            className="bg-red-500 hover:bg-red-600 text-white border-red-500 p-2 min-w-0 rounded-xl"
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#324D3E]/10">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-[#324D3E]">{isEditing ? "Edit Riwayat" : "Detail Riwayat"}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowModal(false)
                        setIsEditing(false)
                      }}
                      className="text-[#889063] hover:text-[#324D3E] hover:bg-[#324D3E]/10 rounded-xl"
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
                      <Button onClick={handleDownloadPhoto} className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:shadow-lg text-white rounded-xl">
                        <Download className="w-4 h-4 mr-2" />
                        Download Foto
                      </Button>
                    )}
                  </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  )
}
