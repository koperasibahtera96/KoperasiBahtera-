"use client";

import { useAlert } from "@/components/ui/Alert";
import { DualSignatureInput } from "@/components/ui/dual-signature-input";
import jsPDF from "jspdf";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ContractData {
  investor: {
    name: string;
    email: string;
    phoneNumber?: string;
    address?: string;
  };
  investment: {
    investmentId: string;
    productName: string;
    totalAmount: number;
    amountPaid: number;
    paymentType: "full" | "cicilan";
    plantInstanceId: string;
    investmentDate: string;
  };
  plantInstance: {
    instanceName: string;
    plantType: string;
    baseAnnualROI: number;
    location?: string;
  };
  contractNumber: string;
  contractDate: string;
}

export default function ContractPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading contract data..."
  );
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const { showError, AlertComponent } = useAlert();

  useEffect(() => {
    if (contractId) {
      fetchContractData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const fetchContractData = async (retryCount = 0) => {
    try {
      setLoading(true);

      // Try new contract system first
      let response = await fetch(`/api/contract/${contractId}`);

      // If not found, try the old system for backward compatibility
      if (response.status === 404) {
        response = await fetch(`/api/contract/${contractId}/view`);
      }

      if (response.ok) {
        const result = await response.json();
        setContractData(result.contractData || result.data);
        if (result.signatureData) {
          setSignatureData(result.signatureData);
        }
      } else if (response.status === 404 && retryCount < 10) {
        // Contract data not ready yet, webhook might still be processing
        setLoadingMessage(
          `Processing your payment... Please wait (${retryCount + 1}/10)`
        );
        console.log(
          `Contract data not ready, retrying in 2 seconds... (attempt ${
            retryCount + 1
          }/10)`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fetchContractData(retryCount + 1);
      } else {
        console.error("Failed to fetch contract data");

        // Check if it's a 400 error (contract already signed)
        if (response.status === 400) {
          const errorData = await response.json();
          if (errorData.error?.includes("no longer available for signing")) {
            showError(
              "Kontrak Sudah Ditandatangani",
              "Kontrak ini sudah ditandatangani. Anda akan diarahkan ke halaman pembayaran."
            );
            // Redirect to payments page after 3 seconds
            setTimeout(() => {
              window.location.href = "/payments";
            }, 3000);
            return;
          }
        }

        showError(
          "Error",
          "Failed to load contract data. Please refresh the page."
        );
      }
    } catch (error) {
      console.error("Error fetching contract data:", error);
      if (retryCount < 10) {
        setLoadingMessage(`Connecting... Please wait (${retryCount + 1}/10)`);
        console.log(
          `Network error, retrying in 2 seconds... (attempt ${
            retryCount + 1
          }/10)`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fetchContractData(retryCount + 1);
      } else {
        showError(
          "Error",
          "Failed to load contract data after multiple attempts. Please refresh the page."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = (newSignatureData: string | null) => {
    setSignatureData(newSignatureData);
  };

  const generatePDF = async () => {
    if (!contractData) {
      showError("Data kontrak tidak ditemukan", "Silakan refresh halaman.");
      return;
    }
    if (!signatureData) {
      showError("Tanda Tangan Tidak Tersedia", "Tanda tangan digital tidak ditemukan untuk kontrak ini.");
      return;
    }

    setSigning(true);

    try {
      // Use the signature data from the backend if available
      const signatureDataURL = signatureData;

      // Create PDF
      const pdf = new jsPDF();

      // Set font
      pdf.setFont("helvetica");

      // Add logo header - positioned first
      let headerYPosition = 15;

      try {
        // Load logo image
        const logoResponse = await fetch("/images/koperasi-logo.jpg");
        const logoBlob = await logoResponse.blob();
        const logoDataURL = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });

        // Add logo centered at top (40x40 for better visibility)
        pdf.addImage(logoDataURL, "JPEG", 85, headerYPosition, 40, 40);
        headerYPosition += 45; // Move down after logo
      } catch (logoError) {
        console.warn("Could not load logo:", logoError);
        headerYPosition += 10; // Small space if no logo
      }

      // Header text positioned below logo
      pdf.setFontSize(18);
      pdf.setTextColor(50, 77, 62); // #324D3E
      pdf.text("SURAT PERJANJIAN HAK KEPEMILIKAN POHON", 105, headerYPosition, {
        align: "center",
      });

      pdf.setFontSize(14);
      pdf.text("KOPERASI BINTANG MERAH SEJAHTERA", 105, headerYPosition + 10, {
        align: "center",
      });

      // Start content below header
      let yPosition = headerYPosition + 20;
      const leftMargin = 20;
      const rightMargin = 190;

      // Header separator line
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(50, 77, 62);
      pdf.line(leftMargin, yPosition, rightMargin, yPosition);
      yPosition += 15;

      // Contract Information Box
      pdf.setFillColor(50, 77, 62);
      pdf.rect(leftMargin, yPosition, 170, 25, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("INFORMASI KONTRAK", leftMargin + 5, yPosition + 8);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Nomor: ${contractData.contractNumber}`,
        leftMargin + 5,
        yPosition + 16
      );
      pdf.text(
        `Tanggal: ${new Date(contractData.contractDate).toLocaleDateString(
          "id-ID"
        )}`,
        leftMargin + 90,
        yPosition + 16
      );

      yPosition += 35;

      // Investor Information Section
      pdf.setTextColor(0, 0, 0);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(leftMargin, yPosition, 170, 35, "F");

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("DATA INVESTOR", leftMargin + 5, yPosition + 8);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Nama: ${contractData.investor.name}`,
        leftMargin + 5,
        yPosition + 18
      );
      pdf.text(
        `Email: ${contractData.investor.email}`,
        leftMargin + 5,
        yPosition + 26
      );
      if (contractData.investor.phoneNumber) {
        pdf.text(
          `Telepon: ${contractData.investor.phoneNumber}`,
          leftMargin + 90,
          yPosition + 18
        );
      }

      yPosition += 45;

      // Investment Details Section
      pdf.setFillColor(240, 248, 255);
      pdf.rect(leftMargin, yPosition, 170, 45, "F");

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("DETAIL INVESTASI", leftMargin + 5, yPosition + 8);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `ID Investasi: ${contractData.investment.investmentId}`,
        leftMargin + 5,
        yPosition + 18
      );
      pdf.text(
        `Produk: ${contractData.investment.productName}`,
        leftMargin + 5,
        yPosition + 26
      );
      pdf.text(
        `Jenis Pohon: ${contractData.plantInstance.plantType.toUpperCase()}`,
        leftMargin + 5,
        yPosition + 34
      );

      pdf.text(
        `Total Investasi: Rp ${contractData.investment.totalAmount.toLocaleString(
          "id-ID"
        )}`,
        leftMargin + 90,
        yPosition + 18
      );
      pdf.text(
        `ROI Tahunan: ${contractData.plantInstance.baseAnnualROI}%`,
        leftMargin + 90,
        yPosition + 26
      );
      pdf.text(
        `Status: ${
          contractData.investment.paymentType === "full" ? "LUNAS" : "CICILAN"
        }`,
        leftMargin + 90,
        yPosition + 34
      );

      yPosition += 55;

      // Terms and Conditions Section
      // Check if we have enough space for header + at least 10 lines of content (about 70 units)
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFillColor(255, 248, 240);
      pdf.rect(leftMargin, yPosition, 170, 8, "F");

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("KETENTUAN DAN SYARAT", leftMargin + 5, yPosition + 6);

      yPosition += 15;

      // Terms content with proper formatting
      const termsContent = [
        "HAK KEPEMILIKAN INVESTOR:",
        "• Berhak atas hasil panen sesuai persentase investasi yang dibayarkan",
        "• Mendapat laporan perkembangan pohon secara berkala",
        "• Dapat mengunjungi lokasi pohon dengan pemberitahuan sebelumnya",
        "• Menerima bagi hasil sesuai persentase kepemilikan",
        "",
        "KEWAJIBAN KOPERASI BINTANG MERAH SEJAHTERA:",
        "• Merawat dan memelihara pohon hingga masa panen",
        "• Memberikan laporan berkala tentang kondisi pohon",
        "• Membagikan hasil panen sesuai kesepakatan",
        "• Menyediakan akses informasi kondisi pohon",
        "",
        "KETENTUAN UMUM:",
        "• Kontrak berlaku hingga masa panen selesai",
        "• Perselisihan diselesaikan secara musyawarah mufakat",
        "• Kedua pihak terikat pada ketentuan yang telah disepakati",
      ];

      pdf.setFontSize(9);
      termsContent.forEach((line) => {
        // Only add new page if we're really running out of space (leave room for signatures)
        if (yPosition > 260) {
          pdf.addPage();
          yPosition = 20;
        }

        if (line.includes(":") && !line.startsWith("•")) {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(50, 77, 62);
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0, 0, 0);
        }

        pdf.text(line, leftMargin + (line.startsWith("•") ? 5 : 0), yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Signature Section
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }

      // Signature header
      pdf.setFillColor(50, 77, 62);
      pdf.rect(leftMargin, yPosition, 170, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("PENANDATANGANAN", leftMargin + 5, yPosition + 6);

      yPosition += 20;

      // Signature boxes
      pdf.setTextColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(200, 200, 200);

      // Left signature box - Koperasi
      pdf.rect(leftMargin, yPosition, 80, 40);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("KOPERASI BINTANG MERAH", leftMargin + 5, yPosition + 6);
      pdf.text("SEJAHTERA", leftMargin + 5, yPosition + 11);

      pdf.setFont("helvetica", "normal");
      pdf.text("Ketua Koperasi", leftMargin + 5, yPosition + 32);
      pdf.text("H. Budi Santoso, S.E.", leftMargin + 5, yPosition + 37);

      // Right signature box - Investor
      pdf.rect(leftMargin + 90, yPosition, 80, 40);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("PIHAK INVESTOR", leftMargin + 95, yPosition + 8);

      pdf.setFont("helvetica", "normal");
      pdf.text("Investor", leftMargin + 95, yPosition + 32);
      pdf.text(
        `${contractData.investor.name}`,
        leftMargin + 95,
        yPosition + 37
      );

      // Add investor signature
      if (signatureDataURL) {
        try {
          // Show alert with the first 100 chars for debugging
          showError("Signature Data (first 100 chars)", signatureDataURL.slice(0, 100));
          if (!signatureDataURL.startsWith("data:image/png;base64,")) {
            throw new Error("signatureDataURL is not a valid PNG base64 string");
          }
          pdf.addImage(
            signatureDataURL,
            "PNG",
            leftMargin + 95,
            yPosition + 12,
            70,
            15
          );
        } catch (err: any) {
          showError("Failed to add signature image to PDF", err?.message || String(err));
        }
      }

      yPosition += 50;

      // Footer with validation info
      pdf.setFillColor(250, 250, 250);
      pdf.rect(leftMargin, yPosition, 170, 15, "F");

      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        `Ditandatangani secara digital pada: ${new Date().toLocaleString(
          "id-ID"
        )}`,
        leftMargin + 5,
        yPosition + 5
      );
      pdf.text(`Lokasi: Jakarta, Indonesia`, leftMargin + 5, yPosition + 10);
      pdf.text(
        `Dokumen ini sah dan mengikat kedua belah pihak`,
        leftMargin + 90,
        yPosition + 8
      );

      // Save PDF
      pdf.save(
        `Kontrak_${contractData.contractNumber}_${contractData.investor.name}.pdf`
      );

      // Call API to mark contract as signed in database
      const response = await fetch(`/api/contract/${contractId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signatureData: signatureDataURL,
          contractNumber: contractData.contractNumber,
        }),
      });

      if (response.ok) {
        setSigned(true);
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("Contract signing API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to save contract signing status: ${errorData?.error || response.statusText}`);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError(
        "Error",
        "Terjadi kesalahan saat membuat PDF. Silakan coba lagi."
      );
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#324D3E] mx-auto"></div>
          <p className="text-[#324D3E] mt-4 text-lg">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Data Kontrak Tidak Ditemukan
          </h1>
          <p className="text-gray-600">
            Silakan hubungi customer service kami.
          </p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-[#324D3E] mb-4">
            Kontrak Berhasil Ditandatangani!
          </h1>
          <p className="text-gray-600 mb-6">
            Kontrak kepemilikan pohon Anda telah berhasil dibuat dan diunduh.
            Terima kasih atas kepercayaan Anda kepada Koperasi Bintang Merah
            Sejahtera.
          </p>
          <button
            onClick={() => (window.location.href = "/payments")}
            className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200"
          >
            Masuk ke pembayaran
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 py-12">
      <AlertComponent />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4">
            <Image
              width={96}
              height={96}
              src="/images/koperasi-logo.jpg"
              alt="Koperasi Bintang Merah Sejahtera"
              className="w-24 h-24 rounded-full object-cover shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#324D3E] mb-2">
            Surat Perjanjian Hak Kepemilikan Pohon
          </h1>
          <p className="text-[#889063]">Koperasi Bintang Merah Sejahtera</p>
        </div>

        {/* Contract Preview */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#324D3E]/10 mb-8">
          <div className="p-8">
            {/* Contract Header */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-[#324D3E]">
                    Nomor Kontrak: {contractData.contractNumber}
                  </h2>
                  <p className="text-[#889063]">
                    Tanggal:{" "}
                    {new Date(contractData.contractDate).toLocaleDateString(
                      "id-ID"
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#889063]">ID Investasi</p>
                  <p className="font-semibold text-[#324D3E]">
                    {contractData.investment.investmentId}
                  </p>
                </div>
              </div>
            </div>

            {/* Investor Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-lg font-semibold text-[#324D3E] mb-4">
                  Data Investor
                </h3>
                <div className="space-y-2">
                  <p>
                    <span className="text-[#889063]">Nama:</span>{" "}
                    <span className="font-medium">
                      {contractData.investor.name}
                    </span>
                  </p>
                  <p>
                    <span className="text-[#889063]">Email:</span>{" "}
                    <span className="font-medium">
                      {contractData.investor.email}
                    </span>
                  </p>
                  {contractData.investor.phoneNumber && (
                    <p>
                      <span className="text-[#889063]">Telepon:</span>{" "}
                      <span className="font-medium">
                        {contractData.investor.phoneNumber}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[#324D3E] mb-4">
                  Detail Investasi
                </h3>
                <div className="space-y-2">
                  <p>
                    <span className="text-[#889063]">Produk:</span>{" "}
                    <span className="font-medium">
                      {contractData.investment.productName}
                    </span>
                  </p>
                  <p>
                    <span className="text-[#889063]">Jenis Pohon:</span>{" "}
                    <span className="font-medium">
                      {contractData.plantInstance.plantType.toUpperCase()}
                    </span>
                  </p>
                  <p>
                    <span className="text-[#889063]">Instansi:</span>{" "}
                    <span className="font-medium">
                      {contractData.plantInstance.instanceName}
                    </span>
                  </p>
                  <p>
                    <span className="text-[#889063]">Total:</span>{" "}
                    <span className="font-medium">
                      Rp{" "}
                      {contractData.investment.totalAmount.toLocaleString(
                        "id-ID"
                      )}
                    </span>
                  </p>
                  <p>
                    <span className="text-[#889063]">ROI:</span>{" "}
                    <span className="font-medium">
                      {contractData.plantInstance.baseAnnualROI * 100}%/tahun
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Contract Terms (Summary) */}
            <div className="bg-[#324D3E]/5 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-[#324D3E] mb-4">
                Ringkasan Ketentuan
              </h3>
              <ul className="space-y-2 text-sm text-[#324D3E]">
                <li>
                  • Investor berhak atas hasil panen sesuai persentase investasi
                </li>
                <li>
                  • Hak kepemilikan berlaku setelah pembayaran lunas dan
                  penandatanganan kontrak
                </li>
                <li>
                  • Investor berhak mendapat laporan perkembangan pohon secara
                  berkala
                </li>
                <li>• Koperasi berkewajiban merawat pohon hingga masa panen</li>
                <li>• Hasil panen dibagi sesuai persentase kepemilikan</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#324D3E]/10">
          <div className="p-8">
            <h3 className="text-xl font-semibold text-[#324D3E] mb-6 text-center">
              Tanda Tangan Digital
            </h3>

            <div className="max-w-lg mx-auto">
              <p className="text-[#889063] text-center mb-6">
                Silakan tanda tangan pada area di bawah ini untuk menyetujui kontrak.
                Anda dapat menggambar tanda tangan atau upload gambar tanda tangan.
              </p>

              <DualSignatureInput
                onSignatureChange={handleSignatureChange}
                label="Tanda Tangan Digital"
                required
                disabled={signing}
                className="mb-6"
              />

              <div className="flex gap-4">
                <button
                  onClick={generatePDF}
                  disabled={signing || !signatureData}
                  className="w-full bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Membuat PDF...
                    </span>
                  ) : (
                    "Tanda Tangan & Download"
                  )}
                </button>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-[#889063]">
                Dengan menandatangani kontrak ini, Anda menyetujui semua
                ketentuan yang berlaku
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}