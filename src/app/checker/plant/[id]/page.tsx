"use client";

import LandingNavbar from "@/components/landing/LandingNavbar";
import { Badge } from "@/components/ui-staff/badge";
import { Button } from "@/components/ui-staff/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui-staff/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-staff/select";
import { Textarea } from "@/components/ui-staff/textarea";
import { useAlert } from "@/components/ui/Alert";
import type { PlantRequestFormData } from "@/types/admin";
import type {
  PlantHistory,
  PlantInstance,
  StatusOption,
} from "@/types/checker";
import jsPDF from "jspdf";
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
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import ImageKit from "imagekit-javascript";

// ===== Helper: deteksi URL video
const isVideoUrl = (url?: string) =>
  !!url && /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(url);

const statusColors: Record<string, string> = {
  "Tanam Bibit": "bg-[#4C3D19]/10 text-[#4C3D19] border border-[#4C3D19]/20",
  "Persiapan Bibit": "bg-blue-50 text-blue-600 border border-blue-200",
  "Buka Lahan": "bg-orange-50 text-orange-600 border border-orange-200",
  "Kontrak Baru": "bg-[#324D3E]/10 text-[#324D3E] border border-[#324D3E]/20",
  Pemupukan: "bg-yellow-50 text-yellow-600 border border-yellow-200",
  Panen: "bg-red-50 text-red-600 border border-red-200",
  Penyiraman: "bg-cyan-50 text-cyan-600 border border-cyan-200",
  Pemangkasan: "bg-pink-50 text-pink-600 border border-pink-200",
};

const statusOptions: StatusOption[] = [
  { value: "tanam-bibit", label: "Tanam Bibit" },
  { value: "pemupukan", label: "Pemupukan" },
  { value: "penyiraman", label: "Penyiraman" },
  { value: "pemangkasan", label: "Pemangkasan" },
  { value: "panen", label: "Panen" },
  { value: "sakit", label: "Sakit" },
  { value: "lainnya", label: "Lainnya" },
];

export default function PlantDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session } = useSession();
  const { id } = use(params);

  const [plantData, setPlantData] = useState<PlantInstance | null>(null);
  const [reportStatus, setReportStatus] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [notes, setNotes] = useState("");

  // ===== NEW: toggle & 2 state terpisah (foto/video)
  const [uploadMode, setUploadMode] = useState<"photo" | "video">("photo");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<PlantHistory | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState<PlantRequestFormData>({
    requestType: "delete",
    deleteReason: "",
    historyId: undefined,
    originalDescription: "",
    newDescription: "",
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editLocationValue, setEditLocationValue] = useState("");
  const { showError, showSuccess, showConfirmation, AlertComponent } =
    useAlert();

  // ===== ImageKit client untuk direct upload VIDEO
  const IK_PUBLIC =
    (process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY as string) ||
    (process.env.IMAGEKIT_PUBLIC_KEY as string);
  const IK_URL =
    (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT as string) ||
    (process.env.IMAGEKIT_URL_ENDPOINT as string);

  const ik = useMemo(() => {
    if (!IK_PUBLIC || !IK_URL) return null;
    return new ImageKit({
      publicKey: IK_PUBLIC,
      urlEndpoint: IK_URL,
      authenticationEndpoint: "/api/video-auth",
    });
  }, [IK_PUBLIC, IK_URL]);

  const uploadVideoDirect = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!ik) {
        reject(new Error("ImageKit belum terkonfigurasi"));
        return;
      }
      ik.upload(
        {
          file,
          fileName: file.name,
          folder: "/plant-photos", // sama seperti foto (boleh ubah)
          useUniqueFileName: true,
          tags: ["checker", "video"],
        },
        (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res.url as string);
        }
      );
    });

  useEffect(() => {
    fetchPlantData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPlantData = async () => {
    try {
      const response = await fetch(`/api/plants/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPlantData(data);
      }
    } catch (error) {
      console.error("Error fetching plant data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ===== Handler FOTO (tetap 2MB)
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showError("Tipe tidak didukung", "Pilih file gambar.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError("File terlalu besar", "Maksimal ukuran foto 2MB.");
      return;
    }
    setSelectedPhoto(file);
  };

  // ===== Handler VIDEO (tanpa limit MB, cek durasi ≤ 30s)
  const handleVideoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      showError("Tipe tidak didukung", "Pilih file video.");
      return;
    }

    const getDuration = (f: File) =>
      new Promise<number>((resolve, reject) => {
        const url = URL.createObjectURL(f);
        const v = document.createElement("video");
        v.preload = "metadata";
        v.src = url;
        v.onloadedmetadata = () => {
          const d = v.duration;
          URL.revokeObjectURL(url);
          resolve(d);
        };
        v.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Gagal membaca durasi video"));
        };
      });

    try {
      const duration = await getDuration(file);
      if (!Number.isFinite(duration)) {
        showError("Video tidak valid", "Durasi video tidak dapat dibaca.");
        return;
      }
      if (duration > 30) {
        showError("Video kepanjangan", "Durasi video maksimal 30 detik.");
        return;
      }
      setSelectedVideo(file);
    } catch {
      showError("Video tidak valid", "Gagal membaca durasi video.");
    }
  };

  const handleSubmit = async () => {
    if (!reportStatus || !notes) {
      showError(
        "Mohon lengkapi data",
        "Status dan catatan laporan harus diisi."
      );
      return;
    }
    if (reportStatus === "lainnya" && !customStatus.trim()) {
      showError(
        "Mohon lengkapi status custom",
        "Status custom harus diisi jika memilih 'Lainnya'."
      );
      return;
    }

    // wajib salah satu: foto / video
    const currentFile =
      uploadMode === "video"
        ? selectedVideo || selectedPhoto // fallback kalau user sudah pilih foto
        : selectedPhoto || selectedVideo; // fallback kalau user sudah pilih video

    if (!currentFile) {
      showError(
        "Lampiran kosong",
        "Pilih Foto (≤2MB) atau Video (≤30 detik)."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | null = null;

      if (currentFile.type.startsWith("video/")) {
        // === VIDEO: direct upload ke ImageKit (tanpa limit MB server)
        imageUrl = await uploadVideoDirect(currentFile);
      } else {
        // === FOTO: tetap pakai API lama /api/upload
        const formData = new FormData();
        formData.append("file", currentFile);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.imageUrl;
        } else {
          const errorData = await uploadResponse.json();
          throw new Error(
            `Failed to upload image: ${errorData.details || errorData.error}`
          );
        }
      }

      const finalStatus =
        reportStatus === "lainnya"
          ? customStatus
          : statusOptions.find((s) => s.value === reportStatus)?.label ||
            reportStatus;

      const newHistoryEntry: any = {
        id: Date.now(),
        type: finalStatus,
        action: finalStatus,
        date: new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        description: notes,
        hasImage: true,
        imageUrl: imageUrl || undefined,
        addedBy: session?.user?.name || "Unknown User",
        addedAt: new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      };

      if (plantData) {
        const updatedPlant: PlantInstance = {
          ...plantData,
          status: newHistoryEntry.type,
          lastUpdate: newHistoryEntry.date,
          history: [newHistoryEntry, ...plantData.history],
        };

        const response = await fetch(`/api/plants/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPlant),
        });

        if (response.ok) {
          setPlantData(updatedPlant);
          setReportStatus("");
          setCustomStatus("");
          setNotes("");
          setSelectedPhoto(null);
          setSelectedVideo(null);
          showSuccess("Berhasil!", "Laporan berhasil disimpan!");
        } else {
          throw new Error("Failed to save report");
        }
      }
    } catch (error: unknown) {
      console.error("Error saving report:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showError("Gagal menyimpan", `Gagal menyimpan laporan: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetail = (historyItem: PlantHistory) => {
    setSelectedHistory(historyItem);
    setShowModal(true);
    setIsEditing(false);
  };

  const handleUpdateHistory = async () => {
    if (!editNotes.trim() || !selectedHistory || !plantData) {
      showError("Catatan kosong", "Catatan tidak boleh kosong.");
      return;
    }

    try {
      const updatedHistory = plantData.history.map((item) =>
        item.id === selectedHistory.id
          ? { ...item, description: editNotes }
          : item
      );

      const updatedPlant: PlantInstance = {
        ...plantData,
        history: updatedHistory,
      };

      const response = await fetch(`/api/plants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlant),
      });

      if (response.ok) {
        setPlantData(updatedPlant);
        setSelectedHistory({ ...selectedHistory, description: editNotes });
        setIsEditing(false);
        showSuccess("Berhasil!", "Catatan berhasil diperbarui!");
      }
    } catch {
      console.error("Error updating history");
      showError("Gagal memperbarui", "Gagal memperbarui catatan.");
    }
  };

  const handleDeleteHistoryItem = async (historyId: number) => {
    if (!plantData) return;

    if (session?.user.role === "admin") {
      const confirmed = await showConfirmation(
        "Hapus Riwayat",
        "Apakah Anda yakin ingin menghapus riwayat ini?",
        {
          confirmText: "Hapus",
          cancelText: "Batal",
          type: "danger",
        }
      );
      if (!confirmed) return;

      try {
        const updatedHistory = plantData.history.filter(
          (item) => item.id !== historyId
        );
        const updatedPlant: PlantInstance = {
          ...plantData,
          history: updatedHistory,
        };

        const response = await fetch(`/api/plants/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPlant),
        });

        if (response.ok) {
          setPlantData(updatedPlant);
          setShowModal(false);
          showSuccess("Berhasil!", "Riwayat berhasil dihapus!");
        }
      } catch {
        console.error("Error deleting history");
        showError("Gagal menghapus", "Gagal menghapus riwayat.");
      }
    } else if (session?.user.role === "spv_staff") {
      setRequestFormData({
        requestType: "delete_history",
        deleteReason: "",
        historyId,
        originalDescription: "",
        newDescription: "",
      });
      setShowRequestModal(true);
    }
  };

  const handleDeletePlant = async () => {
    if (session?.user.role === "admin") {
      const confirmed = await showConfirmation(
        "Hapus Tanaman",
        "Apakah Anda yakin ingin menghapus tanaman ini? Aksi ini tidak dapat dibatalkan.",
        {
          confirmText: "Hapus",
          cancelText: "Batal",
          type: "danger",
        }
      );
      if (!confirmed) return;

      try {
        const response = await fetch(`/api/plants/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          showSuccess("Berhasil!", "Tanaman berhasil dihapus!");
          window.location.href = "/checker";
        } else {
          const errorData = await response.json();
          throw new Error(errorData.details || "Failed to delete plant");
        }
      } catch (error: unknown) {
        console.error("Error deleting plant:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        showError(
          "Gagal menghapus",
          `Gagal menghapus tanaman: ${errorMessage}`
        );
      }
    } else if (session?.user.role === "spv_staff") {
      setRequestFormData({
        requestType: "delete",
        deleteReason: "",
        historyId: undefined,
        originalDescription: "",
        newDescription: "",
      });
      setShowRequestModal(true);
    }
  };

  const handleDownloadPhoto = () => {
    if (selectedHistory?.imageUrl) {
      const link = document.createElement("a");
      link.href = selectedHistory.imageUrl;
      const match = selectedHistory.imageUrl.match(
        /\.(mp4|webm|mov|m4v|ogg|png|jpe?g|webp|gif)(\?|#|$)/i
      );
      const ext = match ? match[1] : "bin";
      link.download = `${plantData?.instanceName || ""}-${selectedHistory.type}-${selectedHistory.date}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleRequestAction = async () => {
    if (!requestFormData.requestType) {
      showError("Error", "Tipe permintaan harus dipilih");
      return;
    }

    if (
      requestFormData.requestType === "delete" &&
      !requestFormData.deleteReason?.trim()
    ) {
      showError("Error", "Alasan penghapusan harus diisi");
      return;
    }

    if (
      requestFormData.requestType === "update_history" &&
      !requestFormData.newDescription?.trim()
    ) {
      showError("Error", "Deskripsi baru harus diisi");
      return;
    }

    setSubmittingRequest(true);

    try {
      const response = await fetch("/api/admin/plant-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plantId: id,
          ...requestFormData,
        }),
      });

      if (response.ok) {
        showSuccess(
          "Berhasil!",
          "Permintaan berhasil diajukan dan akan direview oleh admin"
        );
        setShowRequestModal(false);
        setRequestFormData({
          requestType: "delete",
          deleteReason: "",
          historyId: undefined,
          originalDescription: "",
          newDescription: "",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit request");
      }
    } catch (error: unknown) {
      console.error("Error submitting request:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showError(
        "Gagal mengajukan",
        `Gagal mengajukan permintaan: ${errorMessage}`
      );
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRequestHistoryUpdate = (historyItem: PlantHistory) => {
    setRequestFormData({
      requestType: "update_history",
      deleteReason: "",
      historyId: historyItem.id,
      originalDescription: historyItem.description,
      newDescription: historyItem.description,
    });
    setShowRequestModal(true);
  };

  const handleLocationUpdate = async () => {
    if (!editLocationValue.trim() || !plantData) {
      showError("Lokasi kosong", "Lokasi tidak boleh kosong.");
      return;
    }

    try {
      const updatedPlant: PlantInstance = {
        ...plantData,
        location: editLocationValue.trim(),
      };

      const response = await fetch(`/api/plants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPlant),
      });

      if (response.ok) {
        setPlantData(updatedPlant);
        setIsEditingLocation(false);
        showSuccess("Berhasil!", "Lokasi tanaman berhasil diperbarui!");
      } else {
        throw new Error("Failed to update location");
      }
    } catch (error) {
      console.error("Error updating location:", error);
      showError("Gagal memperbarui", "Gagal memperbarui lokasi tanaman.");
    }
  };

  const handleLocationEditStart = () => {
    setEditLocationValue(plantData?.location || "");
    setIsEditingLocation(true);
  };

  const handleLocationEditCancel = () => {
    setIsEditingLocation(false);
    setEditLocationValue("");
  };

  const handleDownloadHistoryPDF = async () => {
    if (!plantData) return;

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      try {
        const logoResponse = await fetch("/images/koperasi-logo.jpg");
        const logoBlob = await logoResponse.blob();
        const logoReader = new FileReader();

        await new Promise<void>((resolve) => {
          logoReader.onload = () => {
            const logoData = logoReader.result as string;
            pdf.addImage(logoData, "JPEG", 20, yPosition, 30, 30);
            resolve();
          };
          logoReader.readAsDataURL(logoBlob);
        });

        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Koperasi Bintang Merah Sejahtera", 60, yPosition + 15);

        yPosition += 40;
        pdf.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      } catch {
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text("Koperasi Bintang Merah Sejahtera", 20, yPosition);
        yPosition += 20;
      }

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Riwayat Tanaman: ${plantData.instanceName || ""}`,
        20,
        yPosition
      );
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`QR Code: ${plantData.qrCode}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Pemilik: ${plantData.owner}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Lokasi: ${plantData.location}`, 20, yPosition);
      yPosition += 15;

      const sortedHistory = [...plantData.history].sort((a, b) => {
        const dateA = new Date(a.date.split("/").reverse().join("-"));
        const dateB = new Date(b.date.split("/").reverse().join("-"));
        return dateA.getTime() - dateB.getTime();
      });

      for (let i = 0; i < sortedHistory.length; i++) {
        const item = sortedHistory[i];

        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${i + 1}. ${item.type}`, 20, yPosition);
        yPosition += 8;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Tanggal: ${item.date}`, 20, yPosition);
        yPosition += 8;

        if (item.imageUrl) {
          if (isVideoUrl(item.imageUrl)) {
            pdf.setFontSize(10);
            pdf.text("Media: VIDEO (lihat di aplikasi)", 20, yPosition);
            yPosition += 10;
          } else {
            try {
              const response = await fetch(item.imageUrl);
              const blob = await response.blob();
              const reader = new FileReader();

              await new Promise<void>((resolve) => {
                reader.onload = () => {
                  const imgData = reader.result as string;
                  const imgWidth = 60;
                  const imgHeight = 60;

                  if (yPosition + imgHeight > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                  }

                  pdf.addImage(
                    imgData,
                    "JPEG",
                    20,
                    yPosition,
                    imgWidth,
                    imgHeight
                  );
                  resolve();
                };
                reader.readAsDataURL(blob);
              });

              yPosition += 65;
            } catch {
              pdf.text("Gambar tidak dapat dimuat", 20, yPosition);
              yPosition += 8;
            }
          }
        }

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.text("Catatan =", 20, yPosition);
        yPosition += 6;

        pdf.setFont("helvetica", "normal");
        const splitDescription = pdf.splitTextToSize(
          item.description,
          pageWidth - 40
        );
        pdf.text(splitDescription, 20, yPosition);
        yPosition += splitDescription.length * 5 + 10;

        pdf.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 10;
      }

      pdf.save(
        `Riwayat-${plantData.instanceName || ""}-${plantData.qrCode}.pdf`
      );
    } catch {
      console.error("Error generating PDF");
      showError("Gagal membuat PDF", "Gagal membuat PDF. Silakan coba lagi.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-[family-name:var(--font-poppins)]">
        <AlertComponent />
        <header className="w-full fixed top-0 z-50">
          <LandingNavbar hideNavigation={true} />
        </header>

        <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="space-y-8 py-8">
            <div className="text-center">
              <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">
                Detail Tanaman
              </h1>
              <p className="text-[#889063] text-lg">Memuat data tanaman...</p>
            </div>
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#324D3E] mx-auto mb-6"></div>
              <p className="text-[#889063] text-lg">Memuat data tanaman...</p>
            </div>
          </div>
        </main>
      </div>
    );
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
              <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">
                Detail Tanaman
              </h1>
              <p className="text-[#889063] text-lg">Tanaman tidak ditemukan</p>
            </div>
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-12 text-center">
              <h2 className="text-2xl font-bold text-[#324D3E] mb-4">
                Tanaman Tidak Ditemukan
              </h2>
              <Link
                href="/checker"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white font-medium rounded-2xl hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-[family-name:var(--font-poppins)]">
      <AlertComponent />
      <header className="w-full fixed top-0 z-50">
        <LandingNavbar hideNavigation={true} />
      </header>

      <main className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="space-y-8 py-8">
          {/* Page Header */}
          <div className="text-center">
            <Link
              href="/checker"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-lg text-[#324D3E] hover:bg-[#324D3E] hover:text-white font-medium rounded-2xl border border-[#324D3E]/20 mb-6 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </Link>
            <h1 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-4">
              Detail Tanaman
            </h1>
            <p className="text-[#889063] text-lg">
              Monitor dan kelola tanaman {plantData.instanceName || ""}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-[#324D3E]/10 p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 bg-gradient-to-br from-[#324D3E] to-[#4C3D19] rounded-2xl overflow-hidden shadow-lg">
                  {plantData.fotoGambar ? (
                    <Image
                      src={plantData.fotoGambar}
                      alt={plantData?.instanceName || "Foto tanaman"}
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
                    <span className="font-semibold text-[#324D3E]">
                      {plantData.qrCode}
                    </span>
                  </div>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                  <p className="text-sm text-[#889063] mb-1">No. Kontrak</p>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4C3D19]" />
                    <span className="font-semibold text-[#324D3E]">
                      {plantData.contractNumber}
                    </span>
                  </div>
                </div>
              </div>

<<<<<<< Updated upstream
              <div className="space-y-4">
                <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                  <p className="text-sm text-[#889063] mb-1">Pemilik</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#4C3D19]" />
                    <span className="font-semibold text-[#324D3E]">
                      {plantData.owner}
                    </span>
=======
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                    <p className="text-sm text-[#889063] mb-1">Pemilik</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#4C3D19]" />
                      <span className="font-semibold text-[#324D3E]">
                        {plantData.owner}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                    <p className="text-sm text-[#889063] mb-1">Lokasi Tanam</p>
                    {isEditingLocation && session?.user.role === "admin" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#4C3D19]" />
                          <input
                            type="text"
                            value={editLocationValue}
                            onChange={(e) => setEditLocationValue(e.target.value)}
                            className="flex-1 bg-white border border-[#324D3E]/20 rounded-lg px-3 py-1 text-[#324D3E] text-sm focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40"
                            placeholder="Masukkan lokasi tanaman..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleLocationUpdate();
                              } else if (e.key === "Escape") {
                                handleLocationEditCancel();
                              }
                            }}
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleLocationUpdate}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-lg"
                          >
                            Simpan
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleLocationEditCancel}
                            className="border-gray-300 text-gray-700 text-xs px-3 py-1 rounded-lg"
                          >
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#4C3D19]" />
                        <span className="font-semibold text-[#324D3E] flex-1">
                          {plantData.location}
                        </span>
                        {session?.user.role === "admin" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleLocationEditStart}
                            className="text-[#324D3E] hover:text-[#4C3D19] hover:bg-[#324D3E]/10 p-1 rounded-lg"
                            title="Edit lokasi"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
>>>>>>> Stashed changes
                  </div>
                </div>

                <div className="bg-white/60 rounded-2xl p-4 border border-[#324D3E]/10">
                  <p className="text-sm text-[#889063] mb-1">Lokasi Tanam</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#4C3D19]" />
                    <span className="font-semibold text-[#324D3E]">
                      {plantData.location}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRID */}
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
                {/* Toggle Foto / Video */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#889063]">
                    Wajib lampirkan salah satu: <b>Foto ≤2MB</b> atau <b>Video ≤30 detik</b>
                  </span>
                  <div className="inline-flex overflow-hidden rounded-xl border border-[#324D3E]/20">
                    <button
                      type="button"
                      onClick={() => setUploadMode("photo")}
                      className={`px-4 py-2 text-sm ${
                        uploadMode === "photo"
                          ? "bg-[#324D3E] text-white"
                          : "bg-white text-[#324D3E]"
                      }`}
                    >
                      Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("video")}
                      className={`px-4 py-2 text-sm ${
                        uploadMode === "video"
                          ? "bg-[#324D3E] text-white"
                          : "bg-white text-[#324D3E]"
                      }`}
                    >
                      Video
                    </button>
                  </div>
                </div>

                {/* Uploader sesuai mode */}
                {uploadMode === "photo" ? (
                  <div>
                    <label className="block text-sm font-medium text-[#324D3E] mb-3">
                      Foto Tanaman (Wajib, Max 2MB)
                    </label>
                    <div className="border-2 border-dashed border-[#324D3E]/30 rounded-2xl p-8 text-center hover:border-[#324D3E] hover:bg-[#324D3E]/5 transition-all duration-300 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-[#889063]" />
                        <p className="text-[#324D3E] mb-2 font-medium">
                          {selectedPhoto
                            ? selectedPhoto.name
                            : "Klik untuk upload atau seret foto"}
                        </p>
                        {selectedPhoto && (
                          <p className="text-sm text-[#889063]">
                            Ukuran: {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-[#324D3E] mb-3">
                      Video Laporan (Durasi maksimal 30 detik)
                    </label>
                    <div className="border-2 border-dashed border-[#324D3E]/30 rounded-2xl p-8 text-center hover:border-[#324D3E] hover:bg-[#324D3E]/5 transition-all duration-300 cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-[#889063]" />
                        <p className="text-[#324D3E] mb-2 font-medium">
                          {selectedVideo
                            ? selectedVideo.name
                            : "Klik untuk upload atau seret video"}
                        </p>
                        {selectedVideo && (
                          <p className="text-sm text-[#889063]">
                            Ukuran: {(selectedVideo.size / 1024 / 1024).toFixed(2)} MB • Maks 30 detik
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] mb-3">
                    Status Laporan
                  </label>
                  <Select
                    value={reportStatus}
                    onValueChange={(value) => {
                      setReportStatus(value);
                      if (value !== "lainnya") {
                        setCustomStatus("");
                      }
                    }}
                  >
                    <SelectTrigger className="bg-white border-[#324D3E]/20 text-[#324D3E] rounded-xl h-12 focus:ring-2 focus:ring-[#324D3E]/20">
                      <SelectValue placeholder="Pilih status..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#324D3E]/20 rounded-xl">
                      {statusOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-[#324D3E]"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Status */}
                {reportStatus === "lainnya" && (
                  <div>
                    <label className="block text-sm font-medium text-[#324D3E] mb-3">
                      Status Custom
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan status custom..."
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                      className="w-full bg-white border border-[#324D3E]/20 rounded-xl px-4 py-3 text-[#324D3E] placeholder:text-[#889063] focus:outline-none focus:ring-2 focus:ring-[#324D3E]/20 focus:border-[#324D3E]/40"
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[#324D3E] mb-3">
                    Catatan
                  </label>
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

            {/* Riwayat */}
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
                  {(session?.user.role === "admin" ||
                    session?.user.role === "spv_staff") && (
                    <Button
                      onClick={() => handleDeletePlant()}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg text-white rounded-xl"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {session?.user.role === "admin"
                        ? "Delete Plant"
                        : "Request Delete"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {plantData.history.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-4 p-6 bg-white/60 rounded-2xl border border-[#324D3E]/10 hover:bg-white/80 transition-all duration-300"
                    >
                      <div className="w-20 h-20 bg-[#324D3E]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        {item.imageUrl ? (
                          isVideoUrl(item.imageUrl) ? (
                            <video
                              src={item.imageUrl}
                              className="w-full h-full object-cover rounded-2xl"
                              controls
                              preload="metadata"
                            />
                          ) : (
                            <Image
                              unoptimized
                              src={item.imageUrl || "/placeholder.svg"}
                              alt="Plant media"
                              className="w-full h-full object-cover rounded-2xl"
                              width={80}
                              height={80}
                            />
                          )
                        ) : (
                          <Camera className="w-6 h-6 text-[#889063]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            className={`${
                              statusColors[item.type] ||
                              "bg-gray-100 text-gray-800"
                            } rounded-xl px-3 py-1`}
                          >
                            {item.type}
                          </Badge>

                          <div className="flex items-center gap-2 text-sm text-[#889063]">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {item.addedBy}
                            </span>
                            <span className="text-[#324D3E]/30">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {item.date}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-[#324D3E] mb-3">
                          {item.description}
                        </p>
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
                            {(session?.user.role === "admin" ||
                              session?.user.role === "spv_staff") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (session?.user.role === "admin") {
                                    setSelectedHistory(item);
                                    setEditNotes(item.description);
                                    setIsEditing(true);
                                    setShowModal(true);
                                  } else {
                                    handleRequestHistoryUpdate(item);
                                  }
                                }}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 rounded-xl"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                {session?.user.role === "admin"
                                  ? "Update"
                                  : "Request Update"}
                              </Button>
                            )}
                          </div>
                          {(session?.user.role === "admin" ||
                            session?.user.role === "spv_staff") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteHistoryItem(item.id)}
                              className="bg-red-500 hover:bg-red-600 text-white border-red-500 p-2 min-w-0 rounded-xl"
                              title={
                                session?.user.role === "admin"
                                  ? "Delete"
                                  : "Request Delete"
                              }
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Modal Detail */}
          {showModal && selectedHistory && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#324D3E]/10">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-[#324D3E]">
                      {isEditing ? "Edit Riwayat" : "Detail Riwayat"}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowModal(false);
                        setIsEditing(false);
                      }}
                      className="text-[#889063] hover:text-[#324D3E] hover:bg-[#324D3E]/10 rounded-xl"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        {selectedHistory.imageUrl ? (
                          isVideoUrl(selectedHistory.imageUrl) ? (
                            <video
                              src={selectedHistory.imageUrl}
                              className="w-full h-full object-cover"
                              controls
                              preload="metadata"
                            />
                          ) : (
                            <Image
                              unoptimized
                              src={selectedHistory.imageUrl || "/placeholder.svg"}
                              alt="Plant media"
                              className="w-full h-full object-cover"
                              width={64}
                              height={64}
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-16 h-16 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <Card className="bg-gray-50 border-gray-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              className={`${
                                statusColors[selectedHistory.type] ||
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {selectedHistory.type}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {selectedHistory.date}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-4">
                      <Card className="bg-gray-50 border-gray-200">
                        <CardHeader>
                          <CardTitle className="text-lg text-gray-900">
                            Catatan
                          </CardTitle>
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
                                <Button
                                  onClick={handleUpdateHistory}
                                  className="bg-emerald-500 hover:bg-emerald-600"
                                >
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
                              <p className="text-gray-700 leading-relaxed">
                                {selectedHistory.description}
                              </p>
                              {session?.user.role === "admin" && (
                                <Button
                                  onClick={() => setIsEditing(true)}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Ubah Catatan
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-6">
                    {selectedHistory?.imageUrl && (
                      <Button
                        onClick={handleDownloadPhoto}
                        className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:shadow-lg text-white rounded-xl"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Foto/Video
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Request Modal */}
          {showRequestModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#324D3E]/10">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[#324D3E]">
                      Ajukan Permintaan
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowRequestModal(false)}
                      className="text-[#889063] hover:text-[#324D3E] hover:bg-[#324D3E]/10 rounded-xl"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRequestAction();
                    }}
                    className="space-y-4"
                  >
                    {requestFormData.requestType === "delete" && (
                      <div>
                        <label className="block text-sm font-medium text-[#324D3E] mb-2">
                          Alasan Penghapusan Tanaman
                        </label>
                        <Textarea
                          value={requestFormData.deleteReason || ""}
                          onChange={(e) =>
                            setRequestFormData((prev) => ({
                              ...prev,
                              deleteReason: e.target.value,
                            }))
                          }
                          placeholder="Jelaskan alasan mengapa tanaman perlu dihapus..."
                          className="bg-white border-[#324D3E]/20 min-h-[100px] text-[#324D3E] placeholder:text-[#889063] rounded-xl focus:ring-2 focus:ring-[#324D3E]/20"
                          required
                        />
                      </div>
                    )}

                    {requestFormData.requestType === "update_history" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-[#324D3E] mb-2">
                            Catatan Asli
                          </label>
                          <Textarea
                            value={requestFormData.originalDescription || ""}
                            readOnly
                            className="bg-gray-50 border-[#324D3E]/20 min-h-[80px] text-[#324D3E] rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#324D3E] mb-2">
                            Catatan Baru
                          </label>
                          <Textarea
                            value={requestFormData.newDescription || ""}
                            onChange={(e) =>
                              setRequestFormData((prev) => ({
                                ...prev,
                                newDescription: e.target.value,
                              }))
                            }
                            placeholder="Masukkan catatan yang baru..."
                            className="bg-white border-[#324D3E]/20 min-h-[100px] text-[#324D3E] placeholder:text-[#889063] rounded-xl focus:ring-2 focus:ring-[#324D3E]/20"
                            required
                          />
                        </div>
                      </>
                    )}

                    {requestFormData.requestType === "delete_history" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <p className="text-sm text-yellow-800">
                          Anda akan mengajukan permintaan untuk menghapus
                          riwayat tanaman ini. Admin akan meninjau permintaan
                          Anda sebelum menghapus riwayat.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRequestModal(false)}
                        className="flex-1 border-[#324D3E]/20 text-[#324D3E] hover:bg-[#324D3E]/10 hover:border-[#324D3E] rounded-xl"
                        disabled={submittingRequest}
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={submittingRequest}
                        className="flex-1 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] hover:from-[#4C3D19] hover:to-[#324D3E] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {submittingRequest
                          ? "Mengajukan..."
                          : "Ajukan Permintaan"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
