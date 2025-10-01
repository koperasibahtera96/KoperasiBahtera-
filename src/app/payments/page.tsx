"use client";

import LandingHeader from "@/components/landing/LandingHeader";
import { useAlert } from "@/components/ui/Alert";
import { DualSignatureInput } from "@/components/ui/dual-signature-input";
import { downloadInvoiceImage } from "@/lib/invoiceImage";
import { CicilanGroup, CicilanInstallmentWithPayment } from "@/types/cicilan";
import { useLanguage } from "@/contexts/LanguageContext";
import jsPDF from "jspdf";
import {
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Search,
  TrendingUp,
  Upload,
  Edit3,
  X,
  Download,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

// Type alias for backward compatibility
type Installment = CicilanInstallmentWithPayment;

interface FullPaymentContract {
  contractId: string;
  // corresponding payment record id (if a payment record was created for this full investment)
  paymentId?: string;
  productName: string;
  productId: string;
  totalAmount: number;
  paymentType: string;
  paymentUrl?: string;
  adminApprovalStatus:
    | "pending"
    | "approved"
    | "rejected"
    | "permanently_rejected";
  adminApprovedDate?: Date | string;
  status:
    | "draft"
    | "signed"
    | "approved"
    | "rejected"
    | "permanently_rejected"
    | "paid";
  contractNumber: string;
  contractDate: Date | string;
  dueDate: Date | string; // Due date for payment
  paymentAllowed: boolean;
  paymentCompleted: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Contract retry information
  currentAttempt: number;
  maxAttempts: number;
  signatureAttemptsCount: number;
  hasEverSigned: boolean;
  isMaxRetryReached: boolean;
  isPermanentlyRejected: boolean;
  // Referral code for this investment
  referralCode?: string;
}

export default function PaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [groupedInstallments, setGroupedInstallments] = useState<
    CicilanGroup[]
  >([]);
  const [fullPaymentContracts, setFullPaymentContracts] = useState<
    FullPaymentContract[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "active" | "completed" | "overdue" | "full-payment" | "installment"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Function to toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // fetchInstallments: fetches user cicilan and full payment data from server
  const fetchInstallments = useCallback(async () => {
    try {
      // Build query params from current searchTerm and filter
      const params = new URLSearchParams();
      if (searchTerm && searchTerm.trim() !== "") {
        params.append("search", searchTerm.trim());
      }
      if (filter && filter !== "all") {
        params.append("filter", filter);
      }
      const url =
        "/api/cicilan/user" +
        (params.toString() ? `?${params.toString()}` : "");

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setGroupedInstallments(data.cicilanGroups);
        setFullPaymentContracts(data.fullPaymentContracts || []);
      } else {
        console.error("Failed to fetch installments");
      }
    } catch (error) {
      console.error("Error fetching installments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filter]);

  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    installment: Installment | null;
  }>({ isOpen: false, installment: null });
  const [retryModal, setRetryModal] = useState<{
    isOpen: boolean;
    contractId: string | null;
    contractType: "installment" | "full-payment" | null;
    productName: string | null;
  }>({
    isOpen: false,
    contractId: null,
    contractType: null,
    productName: null,
  });
  const { showSuccess, showError, AlertComponent } = useAlert();

  const handleFullPayment = async (contract: FullPaymentContract) => {
    try {
      const response = await fetch("/api/payment/create-investment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: {
            name: contract.productName,
            price: contract.totalAmount,
          },
          user: {
            email: session?.user?.email,
          },
          contractId: contract.contractId,
          referralCode: contract.referralCode, // Include referral code if set
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.redirect_url) {
        // Open the Midtrans payment URL
        window.open(data.data.redirect_url, "_blank");
      } else {
        showError(
          t("payments.errors.paymentFailed"),
          data.error || t("payments.errors.paymentFailedMessage")
        );
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      showError(
        t("payments.errors.general"),
        t("payments.errors.generalMessage")
      );
    }
  };

  const handleDownloadInvoice = (
    installment: Installment,
    group: CicilanGroup
  ) => {
    // Prepare payment data for invoice
    const paymentData = {
      orderId: installment.orderId || group.cicilanOrderId,
      userName: session?.user?.name || "—",
      userCode: session?.user?.userCode || "—",
      amount: installment.amount,
      itemName: `${group.productName} - Cicilan #${installment.installmentNumber}`,
      paymentType: "cicilan-installment",
      transactionStatus:
        installment.status === "approved" ? "settlement" : installment.status,
      updatedAt: installment.paidDate || installment.updatedAt,
      createdAt: installment.createdAt,
      installmentNumber: installment.installmentNumber,
      totalInstallments: group.installments.length,
      billingPeriod:
        group.paymentTerm === "monthly"
          ? t("payments.billingPeriod.monthly")
          : group.paymentTerm === "quarterly"
          ? t("payments.billingPeriod.quarterly")
          : t("payments.billingPeriod.yearly"),
      ref: installment._id,
    };

    downloadInvoiceImage(paymentData);
  };

  const handleDownloadFullPaymentInvoice = (contract: FullPaymentContract) => {
    // Prepare payment data for invoice
    const paymentData = {
      orderId: contract.contractId,
      userName: session?.user?.name || "—",
      userCode: session?.user?.userCode || "—",
      amount: contract.totalAmount,
      itemName: contract.productName,
      paymentType: "full-investment",
      transactionStatus: contract.paymentCompleted ? "settlement" : "pending",
      updatedAt: contract.updatedAt,
      createdAt: contract.createdAt,
      // Prefer the payment record id (if available) as the reference. Fall back to contractId.
      ref: contract.paymentId || contract.contractId,
    };

    downloadInvoiceImage(paymentData);
  };

  const handleDownloadContract = async (contractId: string) => {
    try {
      // First get the contract data to generate the PDF
      const response = await fetch(`/api/contract/${contractId}/download`, {
        method: "GET",
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          // Create PDF with the signature data (may be null for some contracts)
          await generateContractPDF(data.contractData, data.signatureData);
        } else {
          showError(
            t("payments.errors.general"),
            data.error || t("payments.errors.contractDownloadFailed")
          );
        }
      } else {
        showError(
          t("payments.errors.general"),
          t("payments.errors.contractDataFailed")
        );
      }
    } catch (error) {
      console.error("Error downloading contract:", error);
      showError(
        t("payments.errors.general"),
        t("payments.errors.contractDownloadError")
      );
    }
  };

  // Function to generate PDF from contract data
  // Helper function to convert number to Indonesian words
  const convertNumberToWords = (num: number): string => {
    if (num === 0) return "nol rupiah";

    const units = ["", "ribu", "juta", "miliar", "triliun"];
    const ones = [
      "",
      "satu",
      "dua",
      "tiga",
      "empat",
      "lima",
      "enam",
      "tujuh",
      "delapan",
      "sembilan",
    ];
    const teens = [
      "sepuluh",
      "sebelas",
      "dua belas",
      "tiga belas",
      "empat belas",
      "lima belas",
      "enam belas",
      "tujuh belas",
      "delapan belas",
      "sembilan belas",
    ];
    const tens = [
      "",
      "",
      "dua puluh",
      "tiga puluh",
      "empat puluh",
      "lima puluh",
      "enam puluh",
      "tujuh puluh",
      "delapan puluh",
      "sembilan puluh",
    ];

    function convertHundreds(n: number): string {
      let result = "";

      if (n >= 100) {
        if (Math.floor(n / 100) === 1) {
          result += "seratus ";
        } else {
          result += ones[Math.floor(n / 100)] + " ratus ";
        }
        n %= 100;
      }

      if (n >= 20) {
        result += tens[Math.floor(n / 10)];
        if (n % 10 !== 0) {
          result += " " + ones[n % 10];
        }
      } else if (n >= 10) {
        result += teens[n - 10];
      } else if (n > 0) {
        result += ones[n];
      }

      return result.trim();
    }

    let result = "";
    let unitIndex = 0;

    while (num > 0) {
      const chunk = num % 1000;
      if (chunk > 0) {
        let chunkText = convertHundreds(chunk);
        if (unitIndex === 1 && chunk === 1) {
          chunkText = "se";
        }
        if (unitIndex > 0) {
          chunkText += " " + units[unitIndex];
        }
        result = chunkText + (result ? " " + result : "");
      }
      num = Math.floor(num / 1000);
      unitIndex++;
    }

    return result + " rupiah";
  };

  // Function to generate PDF from contract data
  const generateContractPDF = async (
    contractData: any,
    signatureData: string | null
  ) => {
    if (!contractData) {
      showError(
        t("payments.errors.general"),
        t("payments.errors.contractNotAvailable")
      );
      return;
    }

    try {
      const pdf = new jsPDF();
      pdf.setFont("helvetica");

      const addPageNumber = () => {
        const pageNumber = (pdf.internal as any).getNumberOfPages();
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(128, 128, 128);
        const pageText = `- ${pageNumber} -`;
        const pageWidth = pdf.internal.pageSize.width;
        const textWidth = pdf.getTextWidth(pageText);
        pdf.text(
          pageText,
          (pageWidth - textWidth) / 2,
          pdf.internal.pageSize.height - 10
        );
        pdf.setTextColor(0, 0, 0);
      };

      let headerYPosition = 15;

      try {
        const logoResponse = await fetch("/images/koperasi-logo.jpg");
        const logoBlob = await logoResponse.blob();
        const logoDataURL = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });

        pdf.addImage(logoDataURL, "JPEG", 85, headerYPosition, 40, 40);
        headerYPosition += 45;
      } catch (logoError) {
        console.warn("Could not load logo:", logoError);
        headerYPosition += 10;
      }

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text("SURAT PERJANJIAN KERJASAMA", 105, headerYPosition, {
        align: "center",
      });
      pdf.text("(KONTRAK)", 105, headerYPosition + 8, { align: "center" });

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Nomor: ${contractData.contractNumber}`,
        105,
        headerYPosition + 18,
        { align: "center" }
      );

      let yPosition = headerYPosition + 30;
      const leftMargin = 20;
      const rightMargin = 190;

      pdf.setLineWidth(1);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(leftMargin, yPosition, rightMargin, yPosition);
      yPosition += 15;

      const contractDate = new Date(contractData.contractDate);
      const dayName = contractDate.toLocaleDateString("id-ID", {
        weekday: "long",
      });
      const day = contractDate.getDate();
      const monthName = contractDate.toLocaleDateString("id-ID", {
        month: "long",
      });
      const year = contractDate.getFullYear();
      const dayStr = day.toString().padStart(2, "0");
      const monthStr = (contractDate.getMonth() + 1)
        .toString()
        .padStart(2, "0");

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      const dateText = `Pada hari ini, ${dayName} Tanggal ${day} Bulan ${monthName} Tahun ${year}, (${dayStr}-${monthStr}-${year}) yang bertandatangan dibawah ini:`;
      const dateLines = pdf.splitTextToSize(dateText, rightMargin - leftMargin);
      pdf.text(dateLines, leftMargin, yPosition);
      yPosition += 6 * dateLines.length + 8;

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      const lineHeight = 5;
      const colonPosition = leftMargin + 70;

      pdf.text(t("payments.pdf.name"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        `${contractData.investor.name || ""}`,
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      pdf.text("NIK", leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        `${contractData.investor.nik || ""}`,
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      let dobText = "";
      if (contractData.investor.dateOfBirth) {
        const dob = new Date(contractData.investor.dateOfBirth);
        dobText = dob.toLocaleDateString("id-ID");
      }
      pdf.text(t("payments.pdf.birthPlace"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(`${dobText}`, colonPosition + 5, yPosition);
      yPosition += lineHeight;

      pdf.text(t("payments.pdf.email"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        `${contractData.investor.email || ""}`,
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      pdf.text(t("payments.pdf.contact"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        `${contractData.investor.phoneNumber || ""}`,
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      pdf.text(t("payments.pdf.job"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        `${contractData.investor.occupation || ""}`,
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      let fullAddress = contractData.investor.address || "";
      if (contractData.investor.village)
        fullAddress += `, ${contractData.investor.village}`;
      if (contractData.investor.city)
        fullAddress += `, ${contractData.investor.city}`;
      if (contractData.investor.province)
        fullAddress += `, ${contractData.investor.province}`;
      if (contractData.investor.postalCode)
        fullAddress += ` ${contractData.investor.postalCode}`;

      pdf.text(t("payments.pdf.address"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      const addressLines = pdf.splitTextToSize(
        `${fullAddress}`,
        rightMargin - colonPosition - 5
      );
      pdf.text(addressLines, colonPosition + 5, yPosition);
      yPosition += lineHeight * addressLines.length + 8;

      const pihakPertamaText =
        "Bertindak untuk dan atas nama diri sendiri. selanjutnya disebut sebagai Pihak Pertama.";
      const pihakPertamaLines = pdf.splitTextToSize(
        pihakPertamaText,
        rightMargin - leftMargin
      );
      pdf.text(pihakPertamaLines, leftMargin, yPosition);
      yPosition += lineHeight * pihakPertamaLines.length + 8;

      pdf.text(t("payments.pdf.name"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        "Halim Perdana Kusuma, S.H., M.H.",
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      pdf.text(t("payments.pdf.birthPlace"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text("Sukaraja, 11 September 1986", colonPosition + 5, yPosition);
      yPosition += lineHeight;

      pdf.text(t("payments.pdf.address"), leftMargin, yPosition);
      pdf.text(":", colonPosition, yPosition);
      const koprasi_address =
        "Komplek Taman Mutiara Indah blok J3 No.17 RT004 RW017 Kaligandu, Kota Serang, Banten";
      const koperasiAddressLines = pdf.splitTextToSize(
        koprasi_address,
        rightMargin - colonPosition - 5
      );
      pdf.text(koperasiAddressLines, colonPosition + 5, yPosition);
      yPosition += lineHeight * koperasiAddressLines.length + 5;

      const pihakKeduaText =
        "Bertindak untuk dan atas nama KOPERASI BINTANG MERAH SEJAHTERA, selanjutnya disebut sebagai Pihak Kedua.";
      const pihakKeduaLines = pdf.splitTextToSize(
        pihakKeduaText,
        rightMargin - leftMargin
      );
      pdf.text(pihakKeduaLines, leftMargin, yPosition);
      yPosition += lineHeight * pihakKeduaLines.length + 6;

      const totalAmountText = `Rp${contractData.investment.totalAmount.toLocaleString(
        "id-ID"
      )},-`;
      const totalAmountWords = convertNumberToWords(
        contractData.investment.totalAmount
      );

      let plantTypesText = "GAHARU, ALPUKAT, JENGKOL, AREN, KELAPA";
      if (contractData.investment.productName) {
        const productName = contractData.investment.productName.toLowerCase();
        if (productName.includes("alpukat")) {
          plantTypesText = "ALPUKAT";
        } else if (productName.includes("gaharu")) {
          plantTypesText = "GAHARU";
        } else if (productName.includes("jengkol")) {
          plantTypesText = "JENGKOL";
        } else if (productName.includes("aren")) {
          plantTypesText = "AREN";
        } else if (productName.includes("kelapa")) {
          plantTypesText = "KELAPA";
        }
      }

      const preambleIntroText =
        "Bahwa sebelum ditandatanganinya Surat Perjanjian ini, Para pihak terlebih dahulu menerangkan hal–hal sebagai berikut:";
      const preambleIntroLines = pdf.splitTextToSize(
        preambleIntroText,
        rightMargin - leftMargin
      );
      pdf.text(preambleIntroLines, leftMargin, yPosition);
      yPosition += lineHeight * preambleIntroLines.length + 3;

      const preambleTexts = [
        `1. Bahwa Pihak Pertama adalah selaku yang memiliki modal sebesar ${totalAmountText} (${totalAmountWords}) untuk selanjutnya disebut sebagai MODAL KERJASAMA untuk project (${plantTypesText});`,
        `2. Bahwa Pihak Kedua adalah Pengelola Dana Kerjasama untuk project (${plantTypesText}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
        `3. Bahwa Pihak Pertama dan Pihak Kedua setuju untuk saling mengikatkan diri dalam suatu perjanjian Kerjasama di project (${plantTypesText}) sesuai dengan ketentuan hukum yang berlaku.`,
        `4. Bahwa berdasarkan hal-hal tersebut di atas, kedua belah pihak menyatakan sepakat dan setuju untuk mengadakan Perjanjian Kerjasama ini yang dilaksanakan dengan ketentuan dan syarat-syarat sebagai berikut:`,
      ];

      preambleTexts.forEach((text) => {
        if (yPosition > 250) {
          addPageNumber();
          pdf.addPage();
          yPosition = 20;
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
        }

        if (text === "") {
          yPosition += 2;
          return;
        }

        const lines = pdf.splitTextToSize(text, rightMargin - leftMargin);
        pdf.text(lines, leftMargin, yPosition);
        yPosition += lineHeight * lines.length + 2;
      });

      yPosition += 4;

      const articles = [
        {
          title: "PASAL I\nDEFINISI",
          content: [
            "Dalam perjanjian ini, istilah-istilah berikut mempunyai arti sebagai berikut:",
            "",
            `Paket Penanaman adalah unit usaha yang terdiri dari 10 (sepuluh) pohon (${plantTypesText}) yang ditanam, dirawat, dan dipanen oleh PIHAK PERTAMA.`,
            "Dana Investasi adalah sejumlah uang yang diserahkan PIHAK KEDUA kepada PIHAK PERTAMA untuk mendanai pembelian bibit, penanaman, perawatan, serta biaya operasional hingga pemanenan pohon.",
            "Keuntungan adalah hasil bersih dari penjualan panen setelah dikurangi biaya operasional yang sah.",
            "Kerugian adalah nilai minus yang timbul akibat berkurangnya hasil panen atau biaya operasional yang lebih besar daripada pendapatan.",
            "Laporan Usaha adalah laporan tertulis dan/atau elektronik yang disampaikan PIHAK PERTAMA kepada PIHAK KEDUA secara periodik.",
            "Masa Perawatan adalah periode sejak bibit ditanam hingga pohon siap dipanen.",
            "Force Majeure adalah keadaan di luar kemampuan Para Pihak yang menyebabkan salah satu pihak tidak dapat melaksanakan kewajibannya.",
            "Para Pihak adalah PIHAK PERTAMA dan PIHAK KEDUA yang menandatangani perjanjian ini.",
          ],
        },
        {
          title: "PASAL II\nMAKSUD DAN TUJUAN",
          content: [
            `Pihak Pertama dalam perjanjian ini memberi DANA KERJASAMA kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords}) untuk 1 (satu) paket penanaman dan Pihak Kedua dengan ini telah menerima penyerahan DANA KERJASAMA tersebut dari Pihak Pertama serta menyanggupi untuk melaksanakan pengelolaan DANA KERJASAMA tersebut.`,
          ],
        },
        {
          title: "PASAL III\nRUANG LINGKUP",
          content: [
            `Dalam pelaksanaan perjanjian ini, Pihak Pertama memberi DANA kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords}) untuk 1 (satu) paket penanaman dan Pihak Kedua dengan ini telah menerima penyerahan DANA tersebut dari Pihak Pertama serta menyanggupi untuk melaksanakan pengelolaan DANA.`,
            `Pihak Kedua dengan ini berjanji dan mengikatkan diri untuk melaksanakan perputaran DANA pada Usaha Peningkatan Modal di project (${plantTypesText}) yang berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan setelah ditandatanganinya perjanjian ini.`,
            "Pihak Kedua dengan ini berjanji dan mengikatkan diri untuk memberikan keuntungan kepada Pihak Pertama di mulai dari setelah masa panen pertama;",
          ],
        },
        {
          title: "PASAL IV\nJANGKA WAKTU KERJASAMA",
          content: [
            "Perjanjian kerjasama ini dilakukan dan diterima untuk jangka waktu 10 (sepuluh puluh) tahun, terhitung sejak tanggal di tanda tanganinya perjanjian ini;",
          ],
        },
        {
          title: "PASAL V\nHAK DAN KEWAJIBAN PIHAK PERTAMA",
          content: [
            "Dalam Perjanjian Kerjasama ini, Pihak Pertama memiliki Hak dan Kewajiban sebagai berikut:",
            `Memberikan DANA kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords}) untuk 1 (satu) paket penanaman;`,
            "Menerima hasil keuntungan atas pengelolaan DANA;",
            "Menerima laporan perkembangan usaha secara berkala;",
            "Melakukan pengawasan terhadap usaha dengan pemberitahuan terlebih dahulu;",
            "Tidak melakukan intervensi teknis dalam pengelolaan usaha;",
            "Menjaga kerahasiaan informasi terkait operasional usaha.",
          ],
        },
        {
          title: "PASAL VI\nHAK DAN KEWAJIBAN PIHAK KEDUA",
          content: [
            "Dalam Perjanjian Kerjasama ini, Pihak Kedua memiliki Hak dan Kewajiban sebagai berikut :",
            `Menerima DANA dari Pihak Pertama sebesar ${totalAmountText} (${totalAmountWords}) untuk 1 (satu) paket penanaman;`,
            "Memberikan bagian hasil keuntungan kepada Pihak Pertama;",
            "Memperoleh bagian keuntungan dari pengelolaan usaha;",
            "Menentukan metode teknis penanaman, perawatan, dan pemanenan pohon;",
            "Menyediakan bibit pohon sesuai jumlah paket yang dibeli PIHAK KEDUA;",
            "Melaksanakan penanaman, perawatan, hingga pemanenan pohon sesuai standar;",
            "Memberikan laporan perkembangan usaha;",
            "Membagi keuntungan kepada PIHAK KEDUA sesuai dengan jadwal yang ditentukan;",
            "Menjaga transparansi penggunaan dana dan membuka akses audit.",
          ],
        },
        {
          title: "PASAL VII\nPEMBAGIAN HASIL",
          content: [
            "Dalam Perjanjian Kerjasama ini, kedua belah pihak sepakat didalam hal pembagian hasil penyertaan dana sebagai berikut:",
            `Kedua belah pihak sepakat dan setuju bahwa perjanjian kerjasama ini dilakukan dengan cara pemberian keuntungan yang diperoleh dalam Usaha Peningkatan Modal Usaha di project (${plantTypesText}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
            "Keuntungan yang akan di Terima Pihak Pertama dibagi dengan skema: 70% (tujuh puluh persen) untuk PIHAK PERTAMA dan 30% (tiga puluh persen) untuk PIHAK KEDUA;",
            "Pembagian keuntungan dilakukan paling lambat 7 (tujuh) hari Kerja setelah masa panen.",
            "Pembayaran keuntungan dilakukan melalui transfer ke rekening PIHAK KEDUA.",
          ],
        },
        {
          title: "PASAL VIII\nKEADAAN MEMAKSA (FORCE MAJEURE)",
          content: [
            "Yang termasuk dalam Force Majeure adalah akibat dari kejadian-kejadian diluar kuasa dan kehendak dari kedua belah pihak diantaranya termasuk tidak terbatas bencana alam, banjir, badai, topan, gempa bumi, kebakaran, perang, huru-hara, pemberontakan, demonstrasi, pemogokan, kegagalan koperasi.",
            "Pihak yang mengalami Force Majeure wajib memberitahukan secara tertulis kepada pihak lainnya selambat-lambatnya 7 (tujuh) hari sejak terjadinya keadaan tersebut dengan bukti pendukung yang sah.",
            "Apabila Force Majeure berlangsung tidak lebih dari 30 (tiga puluh) hari, kewajiban para pihak ditunda hingga keadaan berakhir.",
            "Apabila Force Majeure berlangsung lebih dari 90 (Sembilan puluh) hari sehingga pelaksanaan perjanjian tidak mungkin dilanjutkan, maka para pihak sepakat untuk membicarakan kembali atau mengakhiri perjanjian tanpa tuntutan ganti rugi.",
          ],
        },
        {
          title: "PASAL IX\nWANPRESTASI",
          content: [
            "Dalam hal salah satu pihak telah melanggar kewajibannya yang tercantum dalam salah satu Pasal perjanjian ini, telah cukup bukti dan tanpa perlu dibuktikan lebih lanjut, bahwa pihak yang melanggar tersebut telah melakukan tindakan Wanprestasi.",
            "Pihak yang merasa dirugikan atas tindakan Wanprestasi tersebut dalam ayat 1 diatas, berhak meminta ganti kerugian dari pihak yang melakukan wanprestasi tersebut atas sejumlah kerugian yang dideritanya, kecuali dalam hal kerugian tersebut disebabkan karena adanya suatu keadaan memaksa, seperti tercantum dalam Pasal VIII.",
          ],
        },
        {
          title: "PASAL X\nPERSELISIHAN",
          content: [
            "Bilamana dalam pelaksanaan perjanjian Kerjasama ini terdapat perselisihan antara kedua belah pihak baik dalam pelaksanaannya ataupun dalam penafsiran salah satu Pasal dalam perjanjian ini, maka kedua belah pihak sepakat untuk sedapat mungkin menyelesaikan perselisihan tersebut dengan cara musyawarah. Apabila musyawarah telah dilakukan oleh kedua belah pihak, namun ternyata tidak berhasil mencapai suatu kemufakatan maka Para Pihak sepakat bahwa semua sengketa yang timbul dari perjanjian ini akan diselesaikan pada Kantor Kepaniteraan Pengadilan Negeri Jakarta Selatan.",
          ],
        },
        {
          title: "PASAL XI\nATURAN PENUTUP",
          content: [
            "Hal-hal yang belum diatur atau belum cukup diatur dalam perjanjian ini apabila dikemudian hari dibutuhkan dan dipandang perlu akan ditetapkan tersendiri secara musyawarah dan selanjutnya akan ditetapkan dalam suatu ADDENDUM yang berlaku mengikat bagi kedua belah pihak, yang akan direkatkan dan merupakan bagian yang tidak terpisahkan dari Perjanjian ini.",
            "",
            "Demikianlah surat perjanjian kerjasama ini dibuat dalam rangkap 2 (dua), untuk masing-masing pihak, yang ditandatangani di atas kertas bermaterai cukup, yang masing-masing mempunyai kekuatan hukum yang sama dan berlaku sejak ditandatangani.",
          ],
        },
      ];

      pdf.setFontSize(10);
      articles.forEach((article) => {
        if (yPosition > 250) {
          addPageNumber();
          pdf.addPage();
          yPosition = 20;
          pdf.setFontSize(10);
        }

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        const titleLines = article.title.split("\n");
        titleLines.forEach((titleLine) => {
          pdf.text(titleLine, leftMargin, yPosition);
          yPosition += lineHeight;
        });
        yPosition += lineHeight * 0.5;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        article.content.forEach((paragraph) => {
          if (paragraph === "") {
            yPosition += lineHeight * 0.5;
            return;
          }

          if (yPosition > 260) {
            addPageNumber();
            pdf.addPage();
            yPosition = 20;
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
          }

          const lines = pdf.splitTextToSize(
            paragraph,
            rightMargin - leftMargin
          );
          pdf.text(lines, leftMargin, yPosition);
          yPosition += lineHeight * (lines.length + 0.3);
        });

        yPosition += lineHeight;
      });

      const closingDate = new Date(contractData.contractDate);
      const closingDateStr = closingDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      if (yPosition > 220) {
        addPageNumber();
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Jakarta, ${closingDateStr}`, leftMargin, yPosition);
      yPosition += lineHeight * 2;

      if (yPosition > 180) {
        addPageNumber();
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      const pihakPertamaX = leftMargin + 30;
      const pihakKeduaX = leftMargin + 120;

      pdf.text("Pihak Pertama", pihakPertamaX, yPosition);
      pdf.text("Pihak Kedua", pihakKeduaX, yPosition);

      yPosition += lineHeight * 2;

      const signatureAreaWidth = 80;
      const signatureAreaHeight = 25;
      const signatureAreaX = pihakKeduaX - 25;
      const signatureStartY = yPosition;

      const nameYPosition =
        signatureStartY + signatureAreaHeight + lineHeight * 1;

      if (signatureData) {
        try {
          if (!signatureData.startsWith("data:image/png;base64,")) {
            throw new Error("signatureData is not a valid PNG base64 string");
          }

          const signatureCenterX =
            signatureAreaX + signatureAreaWidth / 2 - 60 / 2;
          const signatureCenterY =
            signatureStartY + signatureAreaHeight / 2 - 15 / 2;

          pdf.addImage(
            signatureData,
            "PNG",
            signatureCenterX,
            signatureCenterY,
            60,
            15
          );
        } catch (err: any) {
          showError(
            "Failed to add signature image to PDF",
            err?.message || String(err)
          );
        }
      } else {
        const placeholderX = signatureAreaX + signatureAreaWidth / 2 - 40;
        const placeholderY = signatureStartY + signatureAreaHeight / 2;
        pdf.text("_________________", placeholderX, placeholderY);
      }

      const halimX = leftMargin + 5;
      pdf.text("Halim Perdana Kusuma, S.H., M.H.", halimX, nameYPosition);
      pdf.text(`${contractData.investor.name}`, pihakKeduaX, nameYPosition);

      yPosition = nameYPosition;
      yPosition += lineHeight;

      pdf.text("Ketua Koperasi", halimX, yPosition);

      yPosition += 50;

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

      addPageNumber();

      pdf.save(
        `Kontrak_${contractData.contractNumber}_${contractData.investor.name}.pdf`
      );

      showSuccess("Berhasil", "Kontrak berhasil diunduh");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showError(
        t("payments.errors.general"),
        t("payments.errors.pdfGenerationFailed")
      );
    }
  };

  // Handle payment success/error/pending from Midtrans redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get("paymentSuccess");
    const paymentError = urlParams.get("paymentError");
    const paymentPending = urlParams.get("paymentPending");

    if (paymentSuccess) {
      showSuccess(
        "Pembayaran Berhasil!",
        "Cicilan Anda telah berhasil dibayar. Data sedang diperbarui...",
        { autoClose: false }
      );
      // Refresh data after successful payment
      setTimeout(() => {
        fetchInstallments();
      }, 2000);

      // Clean URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (paymentError) {
      showError(
        t("payments.errors.paymentFailed"),
        t("payments.errors.paymentProcessError")
      );
      // Clean URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (paymentPending) {
      showSuccess(
        "Pembayaran Pending",
        "Pembayaran Anda sedang diproses. Mohon tunggu konfirmasi.",
        { autoClose: false }
      );
      // Clean URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fix scroll height calculation issues
  useEffect(() => {
    // Ensure proper scroll behavior and prevent layout issues
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflowX = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Debounce searchTerm so we don't flood the server on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInstallments();
    }, 250);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Fetch immediately when filter changes
  useEffect(() => {
    fetchInstallments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleUploadProof = async (
    paymentId: string,
    file: File,
    description: string
  ) => {
    setUploadingProof(paymentId);
    try {
      // First upload the image
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("orderId", `payment-${paymentId}`);

      const uploadResponse = await fetch("/api/cicilan/upload-proof", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadData.success) {
        showError(t("payments.errors.uploadImageFailed"), uploadData.error);
        return;
      }

      // Then submit the proof
      const submitResponse = await fetch(
        "/api/cicilan/submit-installment-proof",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentId,
            proofImageUrl: uploadData.imageUrl,
            proofDescription: description,
            referralCode:
              groupedInstallments.find(
                (g) =>
                  g.cicilanOrderId ===
                  (uploadModal as any).installment?.cicilanOrderId
              )?.referralCode || "",
          }),
        }
      );

      const submitData = await submitResponse.json();

      if (submitData.success) {
        showSuccess("Berhasil!", "Bukti pembayaran berhasil dikirim!");
        await fetchInstallments(); // Refresh data
      } else {
        showError(t("payments.errors.general"), submitData.error);
      }
    } catch (error) {
      console.error("Error uploading proof:", error);
      showError(
        "Kesalahan",
        "Terjadi kesalahan saat mengunggah bukti pembayaran"
      );
    } finally {
      setUploadingProof(null);
    }
  };

  // New function to handle Midtrans payment for installments
  const handlePayInstallment = async (
    paymentId: string,
    installmentNumber: number
  ) => {
    try {
      setUploadingProof(paymentId); // Reuse loading state

      const response = await fetch("/api/payment/create-installment-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentId }),
      });

      const data = await response.json();

      if (data.success) {
        // Open Midtrans payment page in new tab
        window.open(data.data.paymentUrl, "_blank");
        showSuccess(
          "Pembayaran Dibuka!",
          `Halaman pembayaran cicilan ${installmentNumber} telah dibuka di tab baru. Selesaikan pembayaran untuk melanjutkan.`
        );
      } else {
        showError(t("payments.errors.paymentFailed"), data.error);
      }
    } catch (error) {
      console.error("Error creating installment payment:", error);
      showError("Kesalahan", "Terjadi kesalahan saat membuat pembayaran");
    } finally {
      setUploadingProof(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 text-[#324D3E] border border-[#324D3E]/20";
      case "submitted":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border border-amber-200";
      case "approved":
      case "completed":
        return "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200";
      case "rejected":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200";
      case "overdue":
        return "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200";
      case "not_created":
        return "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200";
      default:
        return "bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 text-[#324D3E] border border-[#324D3E]/20";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return t("payments.status.pending");
      case "submitted":
        return t("payments.status.submitted");
      case "approved":
        return t("payments.status.approved");
      case "completed":
        return t("payments.status.completed");
      case "rejected":
        return t("payments.status.rejected");
      case "overdue":
        return t("payments.status.overdue");
      case "not_created":
        return t("payments.status.notCreated");
      default:
        return status;
    }
  };

  const isOverdue = (dueDate: Date | string) => {
    return (
      new Date(dueDate) < new Date() &&
      new Date(dueDate).toDateString() !== new Date().toDateString()
    );
  };

  const canPayInstallment = (installment: Installment, group?: any) => {
    // Don't allow payment if contract is permanently rejected
    if (group?.isPermanentlyRejected) {
      return false;
    }

    // Don't allow payment if contract hasn't been signed yet
    if (!group?.hasEverSigned) {
      return false;
    }

    // Only allow payment for pending installments that exist
    return (
      installment.status === "pending" && (installment as any).exists !== false
    );
  };

  // Keep old function for backward compatibility with existing proof uploads
  const canSubmitProof = (installment: Installment, group?: any) => {
    // This function is now only for old manual upload system
    // New cicilan should use canPayInstallment instead

    // Don't allow upload if contract is permanently rejected
    if (group?.isPermanentlyRejected) {
      return false;
    }

    // Don't allow upload if contract hasn't been signed yet
    if (!group?.hasEverSigned) {
      return false;
    }

    // Only show for old cicilan orders that still use manual upload
    // New orders will use Midtrans payment
    const isOldOrder =
      installment.orderId && installment.orderId.startsWith("CIC-CONTRACT-");

    if (!isOldOrder) {
      return false; // New orders use Midtrans payment
    }

    // Don't show upload button if proof is already uploaded and pending review
    if (installment.proofImageUrl && installment.adminStatus === "pending") {
      return false;
    }

    return (
      (installment.status === "pending" || installment.status === "rejected") &&
      (installment as any).exists !== false
    );
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calculate portfolio statistics
  const getPortfolioStats = () => {
    const totalInvestments =
      groupedInstallments.length + fullPaymentContracts.length;
    const totalAmount =
      groupedInstallments.reduce((sum, group) => sum + group.totalAmount, 0) +
      fullPaymentContracts.reduce(
        (sum, contract) => sum + contract.totalAmount,
        0
      );
    const totalPaid =
      groupedInstallments.reduce((sum, group) => {
        return (
          sum +
          group.installments
            .filter(
              (inst) =>
                inst.status === "approved" || inst.status === "completed"
            )
            .reduce((installSum, inst) => installSum + inst.amount, 0)
        );
      }, 0) +
      fullPaymentContracts.reduce(
        (sum, contract) =>
          sum + (contract.paymentCompleted ? contract.totalAmount : 0),
        0
      );

    const allInstallments = groupedInstallments.flatMap(
      (group) => group.installments
    );
    const overdueCount =
      allInstallments.filter(
        (inst) =>
          inst.dueDate && isOverdue(inst.dueDate) && inst.status === "pending"
      ).length +
      fullPaymentContracts.filter((contract) => {
        if (!contract.paymentCompleted && contract.dueDate) {
          return isOverdue(contract.dueDate);
        }
        return false;
      }).length;
    const upcomingCount =
      allInstallments.filter(
        (inst) =>
          inst.dueDate && !isOverdue(inst.dueDate) && inst.status === "pending"
      ).length +
      fullPaymentContracts.filter((contract) => !contract.paymentCompleted)
        .length;

    return {
      totalInvestments,
      totalAmount,
      totalPaid,
      overdueCount,
      upcomingCount,
    };
  };

  // Filter and search functionality
  const getFilteredInstallments = () => {
    let filtered = groupedInstallments.filter((group) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = group.productName
          ? group.productName.toLowerCase().includes(q)
          : false;
        const idMatch = (group.contractId || group.cicilanOrderId || "")
          .toLowerCase()
          .includes(q);
        return nameMatch || idMatch;
      }
      return true;
    });

    if (filter !== "all" && filter !== "full-payment") {
      filtered = filtered.filter((group) => {
        const approvedCount = group.installments.filter(
          (inst) => inst.status === "approved" || inst.status === "completed"
        ).length;
        const totalCount = group.installments.length;
        const hasOverdue = group.installments.some(
          (inst) =>
            inst.dueDate && isOverdue(inst.dueDate) && inst.status === "pending"
        );

        switch (filter) {
          case "completed":
            return approvedCount === totalCount;
          case "overdue":
            return hasOverdue;
          case "active":
            return approvedCount < totalCount && !hasOverdue;
          case "installment":
            return true; // Show all installments when installment filter is selected
          default:
            return true;
        }
      });
    } else if (filter === "full-payment") {
      // Hide installments when full-payment filter is selected
      filtered = [];
    }

    return filtered;
  };

  // Filter full payment contracts
  const getFilteredFullPayments = (): FullPaymentContract[] => {
    let filtered = fullPaymentContracts.filter((contract) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = contract.productName
          ? contract.productName.toLowerCase().includes(q)
          : false;
        const idMatch = (contract.contractId || contract.paymentId || "")
          .toLowerCase()
          .includes(q);
        return nameMatch || idMatch;
      }
      return true;
    });

    if (filter !== "all" && filter !== "installment") {
      filtered = filtered.filter((contract) => {
        switch (filter) {
          case "completed":
            return contract.paymentCompleted;
          case "overdue":
            // Full payments are overdue if not completed and past due date
            if (!contract.paymentCompleted && contract.dueDate) {
              return isOverdue(contract.dueDate);
            }
            return false;
          case "active":
            return !contract.paymentCompleted;
          case "full-payment":
            return true; // Show all full payments when full-payment filter is selected
          default:
            return true;
        }
      });
    } else if (filter === "installment") {
      // Hide full payments when installment filter is selected
      filtered = [];
    }

    return filtered;
  };

  // Combine and sort all contracts by creation date
  const getAllSortedContracts = () => {
    const installments = getFilteredInstallments();
    const fullPayments = getFilteredFullPayments();

    // Create a combined array with type indicators
    const combined = [
      ...installments.map((item) => ({
        ...item,
        type: "installment" as const,
      })),
      ...fullPayments.map((item) => ({
        ...item,
        type: "fullPayment" as const,
      })),
    ];

    // Sort by creation date (newest first)
    return combined.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  if (status === "loading" || isLoading) {
    return (
      <>
        <AlertComponent />
        <LandingHeader />
        <div className="relative py-16" style={{ minHeight: "100vh" }}>
          {/* Blurred background image */}
          <div
            className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
            style={{
              backgroundImage: "url(/landing/hero-bg.png)",
              filter: "blur(5px) brightness(0.7)",
            }}
          />

          <div className="flex items-center justify-center h-ful w-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#324D3E] mx-auto"></div>
              <p className="mt-4 text-white font-poppins">
                Memuat data pembayaran...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AlertComponent />
      <LandingHeader />
      <div className="relative py-16" style={{ minHeight: "100vh" }}>
        {/* Blurred background image */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{
            backgroundImage: "url(/landing/hero-bg.png)",
            filter: "blur(8px)",
            transform: "scale(1.1)", // Prevent blur edge artifacts
          }}
        ></div>
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black/30 -z-10"></div>
        <div className="max-w-7xl mx-auto px-4 mt-12 relative z-10">
          {/* Dashboard Overview */}
          {(groupedInstallments.length > 0 ||
            fullPaymentContracts.length > 0) && (
            <div className="mb-8">
              <PortfolioOverview stats={getPortfolioStats()} />
            </div>
          )}

          {/* Search and Filter Controls */}
          {(groupedInstallments.length > 0 ||
            fullPaymentContracts.length > 0) && (
            <div className="mb-6">
              <SearchAndFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filter={filter}
                setFilter={setFilter}
                stats={getPortfolioStats()}
                groupedInstallments={groupedInstallments}
                fullPaymentContracts={fullPaymentContracts}
              />
            </div>
          )}

          {groupedInstallments.length === 0 &&
          fullPaymentContracts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-lg">
              <div className="flex justify-center text-[#324D3E] mb-4">
                <CreditCard size={64} />
              </div>
              <h3 className="text-xl font-semibold text-[#324D3E] mb-2 font-poppins">
                {t("payments.empty.noPayments")}
              </h3>
              <p className="text-gray-600 mb-6 font-poppins">
                {t("payments.empty.startPurchase")}
              </p>
              <button
                onClick={() => router.push("/#produk")}
                className="px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
              >
                {t("payments.empty.viewPackages")}
              </button>
            </div>
          ) : (
            <div className="space-y-12 pb-16">
              {getAllSortedContracts().map((item) => {
                if (item.type === "installment") {
                  const group = item;
                  return (
                    <div
                      key={group.cicilanOrderId}
                      className="bg-gradient-to-br from-[#FFFCE3] to-white rounded-3xl shadow-lg border-2 border-[#324D3E]/20 p-8 hover:shadow-xl transition-shadow duration-200"
                    >
                      {/* Cicilan Header */}
                      <div className="mb-8">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                          <div className="flex-1">
                            <h2 className="text-2xl font-bold text-[#324D3E] font-poppins">
                              {group.productName}
                            </h2>
                            <p className="text-sm text-gray-600 font-poppins">
                              Order ID: {group.cicilanOrderId}
                            </p>
                            <p className="text-lg font-semibold text-[#4C3D19] mt-1 font-poppins">
                              {t("payments.cards.totalPackage")} Rp{" "}
                              {group.totalAmount.toLocaleString("id-ID")}
                              <span className="text-sm text-gray-500 ml-2 font-normal">
                                {t("payments.cards.created")}{" "}
                                {new Date(group.createdAt).toLocaleDateString(
                                  "id-ID"
                                )}{" "}
                                {new Date(group.createdAt).toLocaleTimeString(
                                  "id-ID",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 font-poppins">
                              <span className="flex items-center justify-center gap-2">
                                <Calendar size={16} />
                                {group.paymentTerm === "monthly"
                                  ? "Bulanan"
                                  : group.paymentTerm === "quarterly"
                                  ? "Triwulan"
                                  : "Tahunan"}
                              </span>
                              <span className="flex items-center justify-center gap-2">
                                <DollarSign size={16} />
                                Rp{" "}
                                {group.installmentAmount.toLocaleString(
                                  "id-ID"
                                )}
                                /cicilan
                              </span>
                            </div>
                          </div>
                          <div className="lg:text-right">
                            <div
                              className={`text-sm font-poppins ${
                                // Check if any installment is overdue
                                group.installments.some(
                                  (inst) =>
                                    inst.dueDate &&
                                    isOverdue(inst.dueDate) &&
                                    inst.status === "pending"
                                )
                                  ? "text-red-600" // Red text for overdue
                                  : "text-gray-600" // Original gray text
                              }`}
                            >
                              {t("payments.progress.title")}
                            </div>
                            <div
                              className={`text-2xl font-bold font-poppins ${
                                // Check if any installment is overdue
                                group.installments.some(
                                  (inst) =>
                                    inst.dueDate &&
                                    isOverdue(inst.dueDate) &&
                                    inst.status === "pending"
                                )
                                  ? "text-red-600" // Red text for overdue
                                  : "text-[#324D3E]" // Original green text
                              }`}
                            >
                              {
                                group.installments.filter(
                                  (i) =>
                                    i.status === "approved" ||
                                    i.status === "completed"
                                ).length
                              }
                              /{group.installments.length}
                            </div>
                            <div className="w-full lg:w-32 bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className={`h-2 rounded-full ${
                                  // Check if any installment is overdue
                                  group.installments.some(
                                    (inst) =>
                                      inst.dueDate &&
                                      isOverdue(inst.dueDate) &&
                                      inst.status === "pending"
                                  )
                                    ? "bg-gradient-to-r from-red-500 to-red-600" // Red gradient for overdue
                                    : "bg-gradient-to-r from-[#324D3E] to-[#4C3D19]" // Original green gradient
                                }`}
                                style={{
                                  width: `${
                                    (group.installments.filter(
                                      (i) =>
                                        i.status === "approved" ||
                                        i.status === "completed"
                                    ).length /
                                      group.installments.length) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contract Approval Status */}
                      {group.contractApprovalStatus === "pending" && (
                        <>
                          {!group.hasEverSigned ? (
                            <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-200 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-100 rounded-full p-2">
                                  <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-blue-800 font-poppins">
                                    {t("payments.contract.notSigned")}
                                  </h4>
                                  <p className="text-sm text-blue-700 font-poppins">
                                    {t("payments.contract.notSignedMessage")}
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/contract/${group.contractId}`
                                        )
                                      }
                                      className="text-blue-800 underline hover:text-blue-900 font-semibold ml-1"
                                    >
                                      {t("payments.contract.signHere")}
                                    </button>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-4 border border-amber-200 mb-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="bg-amber-100 rounded-full p-2">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-amber-800 font-poppins">
                                      {t(
                                        "payments.cards.contractPendingApproval"
                                      )}
                                    </h4>
                                    <p className="text-sm text-amber-700 font-poppins">
                                      {t("payments.cards.canMakePayment")}
                                    </p>
                                  </div>
                                </div>
                                {group.contractStatus !== "draft" && (
                                  <button
                                    onClick={() =>
                                      handleDownloadContract(
                                        group.contractId || ""
                                      )
                                    }
                                    className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                  >
                                    <span className="flex items-center justify-center sm:justify-center gap-2">
                                      <Download size={16} />
                                      <span className="truncate">
                                        {t("payments.contract.download")}
                                      </span>
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {group.contractApprovalStatus === "approved" && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 mb-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 rounded-full p-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-green-800 font-poppins">
                                  {t("payments.approval.contractApproved")}
                                </h4>
                                <p className="text-sm text-green-700 font-poppins">
                                  {t("payments.approval.approvedOn")}{" "}
                                  {group.contractApprovedDate
                                    ? formatDate(group.contractApprovedDate)
                                    : "Tidak diketahui"}
                                </p>
                              </div>
                            </div>
                            {group.contractStatus !== "draft" && (
                              <button
                                onClick={() =>
                                  handleDownloadContract(group.contractId || "")
                                }
                                className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                              >
                                <span className="flex items-center justify-center gap-2">
                                  <Download size={16} />
                                  <span className="truncate">
                                    {t("payments.contract.download")}
                                  </span>
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {group.contractApprovalStatus === "rejected" && (
                        <>
                          {group.isPermanentlyRejected ? (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="bg-red-100 rounded-full p-2">
                                  <Clock className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-red-800 font-poppins">
                                    {t("payments.contract.rejectedPermanent")}
                                  </h4>
                                  <p className="text-sm text-red-700 font-poppins">
                                    {t(
                                      "payments.contract.rejectedPermanentMessage",
                                      {
                                        maxAttempts: String(
                                          group.maxAttempts || 3
                                        ),
                                      }
                                    )}
                                  </p>
                                  <p className="text-xs text-red-600 font-poppins mt-1">
                                    {t("payments.contract.attemptsCount", {
                                      current: String(
                                        group.currentAttempt || 0
                                      ),
                                      max: String(group.maxAttempts || 3),
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : group.isMaxRetryReached ? (
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="bg-orange-100 rounded-full p-2">
                                  <Clock className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-orange-800 font-poppins">
                                    {t("payments.contract.needsReview")}
                                  </h4>
                                  <p className="text-sm text-orange-700 font-poppins">
                                    {t("payments.contract.needsReviewMessage", {
                                      current: String(
                                        group.currentAttempt || 0
                                      ),
                                      max: String(group.maxAttempts || 3),
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200 mb-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="bg-red-100 rounded-full p-2">
                                    <Clock className="w-5 h-5 text-red-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-red-800 font-poppins">
                                      {t("payments.contract.rejectedByAdmin")}
                                    </h4>
                                    <p className="text-sm text-red-700 font-poppins">
                                      {t(
                                        "payments.contract.rejectedByAdminMessage",
                                        {
                                          current: String(
                                            group.currentAttempt || 0
                                          ),
                                          max: String(group.maxAttempts || 3),
                                        }
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setRetryModal({
                                      isOpen: true,
                                      contractId:
                                        group.contractId ||
                                        group.cicilanOrderId,
                                      contractType: "installment",
                                      productName: group.productName,
                                    })
                                  }
                                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                >
                                  <span className="flex items-center justify-center gap-2">
                                    <Edit3 size={16} />
                                    <span className="truncate">
                                      {t("payments.contract.resubmit")}
                                    </span>
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Referral Code Section - Display only if it exists */}
                      {(group as any).referralCode && (
                        <div className="max-w-md bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 mb-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="bg-green-100 rounded-full p-1.5">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-green-800 font-poppins text-sm">
                                {t("payments.cards.referralCodeRegistered")}
                              </h4>
                              <p className="text-xs text-green-700 font-poppins">
                                <span className="font-mono font-bold">
                                  {(group as any).referralCode}
                                </span>{" "}
                                - {t("payments.ui.referralCodeUsed")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Individual Installment Cards */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[#324D3E] mb-4 font-poppins">
                          {t("payments.installments.scheduleTitle", {
                            count: group.installments.length.toString(),
                          })}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {(() => {
                            // Filter installments first
                            const filteredInstallments =
                              group.installments.filter((installment) => {
                                // Show all paid/submitted/rejected installments
                                if (
                                  installment.status === "approved" ||
                                  installment.status === "completed" ||
                                  installment.status === "submitted" ||
                                  installment.status === "rejected"
                                ) {
                                  return true;
                                }

                                // Show current pending installment (first unpaid)
                                if (
                                  installment.status === "pending" &&
                                  installment.exists !== false
                                ) {
                                  const pendingInstallments =
                                    group.installments.filter(
                                      (inst) =>
                                        inst.status === "pending" &&
                                        inst.exists !== false
                                    );
                                  return (
                                    installment.installmentNumber ===
                                    Math.min(
                                      ...pendingInstallments.map(
                                        (inst) => inst.installmentNumber
                                      )
                                    )
                                  );
                                }

                                // Show next placeholder installment (only one)
                                if (installment.status === "not_created") {
                                  const notCreatedInstallments =
                                    group.installments.filter(
                                      (inst) => inst.status === "not_created"
                                    );
                                  return (
                                    installment.installmentNumber ===
                                    Math.min(
                                      ...notCreatedInstallments.map(
                                        (inst) => inst.installmentNumber
                                      )
                                    )
                                  );
                                }

                                return false;
                              });

                            // Sort installments: unpaid first (ascending), then paid ones at the end (descending)
                            const sortedInstallments =
                              filteredInstallments.sort((a, b) => {
                                const aIsPaid =
                                  a.status === "approved" ||
                                  a.status === "completed";
                                const bIsPaid =
                                  b.status === "approved" ||
                                  b.status === "completed";

                                // If payment status is different, unpaid comes first
                                if (aIsPaid !== bIsPaid) {
                                  return aIsPaid ? 1 : -1;
                                }

                                // If same payment status
                                if (aIsPaid && bIsPaid) {
                                  // For paid installments, sort in descending order (newest first)
                                  return (
                                    b.installmentNumber - a.installmentNumber
                                  );
                                } else {
                                  // For unpaid installments, sort in ascending order (oldest first)
                                  return (
                                    a.installmentNumber - b.installmentNumber
                                  );
                                }
                              });

                            // Determine if we should show limited or all installments
                            const isExpanded = expandedGroups.has(
                              group.cicilanOrderId
                            );
                            const maxVisibleCards = 6; // Show max 6 cards initially
                            const shouldShowLimitedView =
                              sortedInstallments.length > maxVisibleCards &&
                              !isExpanded;
                            const visibleInstallments = shouldShowLimitedView
                              ? sortedInstallments.slice(0, maxVisibleCards)
                              : sortedInstallments;

                            return (
                              <>
                                {visibleInstallments.map((installment) => {
                                  const overdue = installment.dueDate
                                    ? isOverdue(installment.dueDate)
                                    : false;
                                  // Determine effective status based on proof upload and admin review
                                  let effectiveStatus = installment.status;

                                  // If proof is uploaded but not reviewed, show as submitted
                                  if (
                                    installment.proofImageUrl &&
                                    installment.adminStatus === "pending"
                                  ) {
                                    effectiveStatus = "submitted";
                                  }
                                  // If overdue and no proof uploaded, show as overdue
                                  else if (
                                    overdue &&
                                    installment.status === "pending" &&
                                    !installment.proofImageUrl
                                  ) {
                                    effectiveStatus = "overdue";
                                  }

                                  return (
                                    <div
                                      key={`${group.cicilanOrderId}-${installment.installmentNumber}`}
                                      className={`relative border-2 rounded-2xl p-6 pb-20 transition-shadow duration-200 hover:shadow-lg ${
                                        effectiveStatus === "approved"
                                          ? "bg-gradient-to-br from-emerald-50/90 to-green-50/90 border-emerald-200"
                                          : effectiveStatus === "submitted"
                                          ? "bg-gradient-to-br from-yellow-50/90 to-amber-50/90 border-amber-200"
                                          : effectiveStatus === "overdue"
                                          ? "bg-gradient-to-br from-red-50/90 to-rose-50/90 border-red-200"
                                          : effectiveStatus === "rejected"
                                          ? "bg-gradient-to-br from-red-50/90 to-rose-50/90 border-red-200"
                                          : "bg-gradient-to-br from-[#FFFCE3]/90 to-white/90 border-[#324D3E]/20"
                                      }`}
                                    >
                                      <div className="flex justify-between items-start mb-3">
                                        <div>
                                          <div className="text-lg font-bold text-[#324D3E] font-poppins">
                                            {t(
                                              "payments.installments.installmentNumber"
                                            )}
                                            {installment.installmentNumber}
                                          </div>
                                          <div className="text-sm text-gray-600 font-poppins">
                                            {t("payments.cards.dueDate")}{" "}
                                            {installment.dueDate
                                              ? formatDate(installment.dueDate)
                                              : t("payments.willBeDetermined")}
                                          </div>
                                        </div>
                                        <span
                                          className={`px-3 py-2 text-xs font-bold rounded-full ${getStatusColor(
                                            effectiveStatus
                                          )}`}
                                        >
                                          {getStatusText(effectiveStatus)}
                                        </span>
                                      </div>

                                      <div className="mb-4">
                                        <div className="text-2xl font-bold text-[#4C3D19] font-poppins">
                                          Rp{" "}
                                          {installment.amount.toLocaleString(
                                            "id-ID"
                                          )}
                                        </div>
                                      </div>

                                      {/* Status Details */}
                                      {installment.paidDate && (
                                        <div className="text-sm text-green-600 mb-2 font-poppins">
                                          <span className="flex items-center gap-1">
                                            <CheckCircle size={14} />
                                            Dibayar:{" "}
                                            {formatDate(installment.paidDate)}
                                          </span>
                                        </div>
                                      )}

                                      {installment.submissionDate &&
                                        installment.orderId &&
                                        installment.orderId.startsWith(
                                          "CIC-CONTRACT-"
                                        ) && (
                                          <div className="text-sm text-gray-600 mb-2 font-poppins">
                                            📤 Dikirim:{" "}
                                            {formatDate(
                                              installment.submissionDate
                                            )}
                                          </div>
                                        )}

                                      {installment.adminNotes &&
                                        installment.orderId &&
                                        installment.orderId.startsWith(
                                          "CIC-CONTRACT-"
                                        ) && (
                                          <div className="bg-yellow-50/80 p-2 rounded-lg text-xs text-yellow-800 mb-3 font-poppins">
                                            <strong>
                                              {t("payments.ui.adminNote")}
                                            </strong>{" "}
                                            {installment.adminNotes}
                                          </div>
                                        )}

                                      {/* Action Buttons */}
                                      <div className="absolute bottom-6 left-6 right-6">
                                        {canPayInstallment(
                                          installment,
                                          group
                                        ) && (
                                          <button
                                            onClick={() =>
                                              handlePayInstallment(
                                                installment._id!,
                                                installment.installmentNumber!
                                              )
                                            }
                                            className="w-full px-3 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                            disabled={
                                              uploadingProof === installment._id
                                            }
                                          >
                                            <span className="flex items-center justify-center gap-2">
                                              <CreditCard size={16} />
                                              {uploadingProof ===
                                              installment._id
                                                ? "Membuat Pembayaran..."
                                                : t("payments.buttons.payNow")}
                                            </span>
                                          </button>
                                        )}

                                        {/* Old upload button for backward compatibility */}
                                        {canSubmitProof(installment, group) && (
                                          <button
                                            onClick={() =>
                                              setUploadModal({
                                                isOpen: true,
                                                installment,
                                              })
                                            }
                                            className="w-full px-3 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                            disabled={
                                              uploadingProof === installment._id
                                            }
                                          >
                                            <span className="flex items-center justify-center gap-2">
                                              <Upload size={16} />
                                              {uploadingProof ===
                                              installment._id
                                                ? "Mengunggah..."
                                                : "Upload Bukti Bayar"}
                                            </span>
                                          </button>
                                        )}

                                        {/* Download Invoice Button for Successful Payments */}
                                        {(installment.status === "approved" ||
                                          installment.status ===
                                            "completed") && (
                                          <button
                                            onClick={() =>
                                              handleDownloadInvoice(
                                                installment,
                                                group
                                              )
                                            }
                                            className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                          >
                                            <span className="flex items-center justify-center gap-2">
                                              <Download size={16} />
                                              Download Invoice
                                            </span>
                                          </button>
                                        )}
                                      </div>

                                      {/* Proof Image Preview */}
                                      {installment.proofImageUrl && (
                                        <div className="mt-3">
                                          <div className="text-xs text-gray-600 mb-1 font-poppins">
                                            Bukti Pembayaran:
                                          </div>
                                          <Image
                                            src={installment.proofImageUrl}
                                            alt="Bukti Pembayaran"
                                            width={100}
                                            height={100}
                                            className="w-full h-20 object-cover rounded-xl border cursor-pointer hover:shadow-lg transition-all duration-300"
                                            onClick={() =>
                                              window.open(
                                                installment.proofImageUrl,
                                                "_blank"
                                              )
                                            }
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Lihat Semua Button */}
                                {shouldShowLimitedView && (
                                  <div className="col-span-full flex justify-center mt-6">
                                    <button
                                      onClick={() =>
                                        toggleGroupExpansion(
                                          group.cicilanOrderId
                                        )
                                      }
                                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                    >
                                      <span>
                                        {t("payments.ui.viewAll", {
                                          count: (
                                            sortedInstallments.length -
                                            maxVisibleCards
                                          ).toString(),
                                        })}
                                      </span>
                                      <svg
                                        className="w-4 h-4 transform transition-transform duration-200"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 9l-7 7-7-7"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                )}

                                {/* Show Less Button */}
                                {isExpanded &&
                                  sortedInstallments.length >
                                    maxVisibleCards && (
                                    <div className="col-span-full flex justify-center mt-6">
                                      <button
                                        onClick={() =>
                                          toggleGroupExpansion(
                                            group.cicilanOrderId
                                          )
                                        }
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                      >
                                        <span>{t("payments.ui.viewLess")}</span>
                                        <svg
                                          className="w-4 h-4 transform rotate-180 transition-transform duration-200"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Full Payment Contract
                  const contract = item;
                  return (
                    <div
                      key={contract.contractId}
                      className={`bg-gradient-to-br rounded-3xl shadow-lg border-2 p-8 transition-shadow duration-200 ${
                        contract.isPermanentlyRejected
                          ? "from-gray-50 to-gray-100 border-gray-300/50 opacity-75"
                          : "from-[#FFFCE3] to-white border-[#324D3E]/20 hover:shadow-xl"
                      }`}
                    >
                      {/* Full Payment Header */}
                      <div className="mb-8">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4 gap-4">
                          <div className="flex-1">
                            <h2 className="text-2xl font-bold text-[#324D3E] font-poppins">
                              {contract.productName}
                            </h2>
                            <p className="text-sm text-gray-600 font-poppins">
                              {t("payments.cards.contractId")}{" "}
                              {contract.contractId}
                            </p>
                            <p className="text-lg font-semibold text-[#4C3D19] mt-1 font-poppins">
                              {t("payments.cards.totalPackage")} Rp{" "}
                              {contract.totalAmount.toLocaleString("id-ID")}
                              <span className="text-sm text-gray-500 ml-2 font-normal">
                                {t("payments.cards.created")}{" "}
                                {new Date(
                                  contract.createdAt
                                ).toLocaleDateString("id-ID")}{" "}
                                {new Date(
                                  contract.createdAt
                                ).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 font-poppins">
                              <span className="flex items-center justify-center gap-2">
                                <Calendar size={16} />
                                {t("payments.cards.fullPayment")}
                              </span>
                              <span className="flex items-center justify-center gap-2">
                                <DollarSign size={16} />
                                Rp{" "}
                                {contract.totalAmount.toLocaleString("id-ID")}
                              </span>
                            </div>
                          </div>
                          <div className="lg:text-right">
                            <div
                              className={`text-sm font-poppins ${
                                // Check if contract is overdue
                                !contract.paymentCompleted &&
                                contract.dueDate &&
                                isOverdue(contract.dueDate)
                                  ? "text-red-600" // Red text for overdue
                                  : "text-gray-600" // Original gray text
                              }`}
                            >
                              {t("payments.cards.paymentStatus")}
                            </div>
                            <div
                              className={`text-2xl font-bold font-poppins ${
                                // Check if contract is overdue
                                !contract.paymentCompleted &&
                                contract.dueDate &&
                                isOverdue(contract.dueDate)
                                  ? "text-red-600" // Red text for overdue
                                  : "text-[#324D3E]" // Original green text
                              }`}
                            >
                              {contract.paymentCompleted
                                ? "Selesai"
                                : (() => {
                                    // Check if contract is overdue using actual dueDate
                                    const isContractOverdue =
                                      contract.dueDate &&
                                      isOverdue(contract.dueDate);
                                    return isContractOverdue
                                      ? t("payments.status.overdue")
                                      : t("payments.status.pending");
                                  })()}
                            </div>
                            <div className="w-full lg:w-32 bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="bg-gradient-to-r from-[#324D3E] to-[#4C3D19] h-2 rounded-full"
                                style={{
                                  width: contract.paymentCompleted
                                    ? "100%"
                                    : "0%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contract Approval Status */}
                      {contract.adminApprovalStatus === "pending" && (
                        <>
                          {!contract.hasEverSigned ? (
                            <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-2xl p-4 border border-blue-200 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-100 rounded-full p-2">
                                  <Clock className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-blue-800 font-poppins">
                                    {t("payments.contract.notSigned")}
                                  </h4>
                                  <p className="text-sm text-blue-700 font-poppins">
                                    {t("payments.contract.notSignedMessage")}
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/contract/${contract.contractId}`
                                        )
                                      }
                                      className="text-blue-800 underline hover:text-blue-900 font-semibold ml-1"
                                    >
                                      {t("payments.contract.signHere")}
                                    </button>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-4 border border-amber-200 mb-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="bg-amber-100 rounded-full p-2">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-amber-800 font-poppins">
                                      {t(
                                        "payments.cards.contractPendingApproval"
                                      )}
                                    </h4>
                                    <p className="text-sm text-amber-700 font-poppins">
                                      {t("payments.cards.canMakePayment")}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    handleDownloadContract(contract.contractId)
                                  }
                                  className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                >
                                  <span className="flex items-center justify-center gap-2">
                                    <Download size={16} />
                                    {t("payments.contract.download")}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {contract.adminApprovalStatus === "approved" && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 mb-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-100 rounded-full p-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-green-800 font-poppins">
                                  {t("payments.approval.contractApproved")}
                                </h4>
                                <p className="text-sm text-green-700 font-poppins">
                                  {t("payments.approval.approvedOn")}{" "}
                                  {contract.adminApprovedDate
                                    ? formatDate(contract.adminApprovedDate)
                                    : "Tidak diketahui"}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleDownloadContract(contract.contractId)
                              }
                              className="w-full sm:w-auto px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                            >
                              <span className="flex items-center justify-center gap-2">
                                <Download size={16} />
                                {t("payments.contract.download")}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {contract.adminApprovalStatus === "rejected" && (
                        <>
                          {contract.isPermanentlyRejected ? (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="bg-red-100 rounded-full p-2">
                                  <Clock className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-red-800 font-poppins">
                                    {t("payments.contract.rejectedPermanent")}
                                  </h4>
                                  <p className="text-sm text-red-700 font-poppins">
                                    {t(
                                      "payments.contract.rejectedPermanentMessage",
                                      {
                                        maxAttempts: String(
                                          contract.maxAttempts || 3
                                        ),
                                      }
                                    )}
                                  </p>
                                  <p className="text-xs text-red-600 font-poppins mt-1">
                                    {t("payments.contract.attemptsCount", {
                                      current: String(
                                        contract.currentAttempt || 0
                                      ),
                                      max: String(contract.maxAttempts || 3),
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : contract.isMaxRetryReached ? (
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200 mb-6">
                              <div className="flex items-center gap-3">
                                <div className="bg-orange-100 rounded-full p-2">
                                  <Clock className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-orange-800 font-poppins">
                                    {t("payments.contract.needsReview")}
                                  </h4>
                                  <p className="text-sm text-orange-700 font-poppins">
                                    {t("payments.contract.needsReviewMessage", {
                                      current: String(
                                        contract.currentAttempt || 0
                                      ),
                                      max: String(contract.maxAttempts || 3),
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-200 mb-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="bg-red-100 rounded-full p-2">
                                    <Clock className="w-5 h-5 text-red-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-red-800 font-poppins">
                                      {t("payments.contract.rejectedByAdmin")}
                                    </h4>
                                    <p className="text-sm text-red-700 font-poppins">
                                      {t(
                                        "payments.contract.rejectedByAdminMessage",
                                        {
                                          current: String(
                                            contract.currentAttempt || 0
                                          ),
                                          max: String(
                                            contract.maxAttempts || 3
                                          ),
                                        }
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    setRetryModal({
                                      isOpen: true,
                                      contractId: contract.contractId,
                                      contractType: "full-payment",
                                      productName: contract.productName,
                                    })
                                  }
                                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                >
                                  <span className="flex items-center justify-center gap-2">
                                    <Edit3 size={16} />
                                    {t("payments.contract.resubmit")}
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Referral Code Section - Display only if it exists */}
                      {(contract as any).referralCode && (
                        <div className="max-w-md bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 mb-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="bg-green-100 rounded-full p-1.5">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-green-800 font-poppins text-sm">
                                {t("payments.cards.referralCodeRegistered")}
                              </h4>
                              <p className="text-xs text-green-700 font-poppins">
                                <span className="font-mono font-bold">
                                  {(contract as any).referralCode}
                                </span>{" "}
                                - {t("payments.ui.referralCodeUsed")}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[#324D3E] mb-4 font-poppins">
                          {t("payments.cards.fullPayment")}
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          <div
                            className={`relative border-2 rounded-2xl p-6 pb-20 transition-shadow duration-200 hover:shadow-lg ${
                              contract.paymentCompleted
                                ? "bg-gradient-to-br from-emerald-50/90 to-green-50/90 border-emerald-200"
                                : (() => {
                                    // Check if contract is overdue using actual dueDate
                                    const isContractOverdue =
                                      contract.dueDate &&
                                      isOverdue(contract.dueDate);
                                    return isContractOverdue
                                      ? "bg-gradient-to-br from-red-50/90 to-rose-50/90 border-red-200"
                                      : "bg-gradient-to-br from-[#FFFCE3]/90 to-white/90 border-[#324D3E]/20";
                                  })()
                            }`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="text-lg font-bold text-[#324D3E] font-poppins">
                                  {t("payments.cards.totalPayment")}
                                </div>
                                <div className="text-sm text-gray-600 font-poppins">
                                  {t("payments.cards.dueDate")}{" "}
                                  {formatDate(
                                    contract.dueDate || contract.contractDate
                                  )}
                                </div>
                              </div>
                              <span
                                className={`px-3 py-2 text-xs font-bold rounded-full ${
                                  contract.paymentCompleted
                                    ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-200"
                                    : (() => {
                                        // Check if contract is overdue using actual dueDate
                                        const isContractOverdue =
                                          contract.dueDate &&
                                          isOverdue(contract.dueDate);
                                        return isContractOverdue
                                          ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200"
                                          : "bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 text-[#324D3E] border border-[#324D3E]/20";
                                      })()
                                }`}
                              >
                                {contract.paymentCompleted
                                  ? "Selesai"
                                  : (() => {
                                      // Check if contract is overdue using actual dueDate
                                      const isContractOverdue =
                                        contract.dueDate &&
                                        isOverdue(contract.dueDate);
                                      return isContractOverdue
                                        ? t("payments.status.overdue")
                                        : t("payments.status.pending");
                                    })()}
                              </span>
                            </div>

                            <div className="mb-4">
                              <div className="text-2xl font-bold text-[#4C3D19] font-poppins">
                                Rp{" "}
                                {contract.totalAmount.toLocaleString("id-ID")}
                              </div>
                            </div>

                            {/* Payment Status Details */}
                            {contract.paymentCompleted && (
                              <div className="text-sm text-green-600 mb-2 font-poppins">
                                <span className="flex items-center gap-1">
                                  <CheckCircle size={14} />
                                  {t("payments.cards.paymentCompleted")}
                                </span>
                              </div>
                            )}

                            {/* Action Button */}
                            <div className="absolute bottom-6 left-6 right-6">
                              {!contract.paymentCompleted &&
                                !contract.isPermanentlyRejected &&
                                contract.hasEverSigned && (
                                  <button
                                    onClick={() => handleFullPayment(contract)}
                                    className="w-full px-3 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                  >
                                    <span className="flex items-center justify-center gap-2">
                                      <CreditCard size={16} />
                                      {t("payments.buttons.payNow")}
                                    </span>
                                  </button>
                                )}

                              {/* Disabled Payment Button for Permanently Rejected Contracts */}
                              {!contract.paymentCompleted &&
                                (contract.isPermanentlyRejected ||
                                  !contract.hasEverSigned) && (
                                  <button
                                    disabled
                                    className="w-full px-3 py-2 bg-gray-400 text-gray-200 text-sm rounded-full cursor-not-allowed font-poppins font-medium opacity-60"
                                  >
                                    <span className="flex items-center justify-center gap-2">
                                      <CreditCard size={16} />
                                      {contract.isPermanentlyRejected
                                        ? "Pembayaran Dinonaktifkan"
                                        : "Kontrak Belum Ditandatangani"}
                                    </span>
                                  </button>
                                )}

                              {/* Download Invoice Button for Completed Payments */}
                              {contract.paymentCompleted && (
                                <button
                                  onClick={() =>
                                    handleDownloadFullPaymentInvoice(contract)
                                  }
                                  className="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 font-poppins font-medium"
                                >
                                  <span className="flex items-center justify-center gap-2">
                                    <Download size={16} />
                                    Download Invoice
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Retry Signature Modal */}
        <ContractRetrySignatureModal
          isOpen={retryModal.isOpen}
          contractId={retryModal.contractId}
          contractType={retryModal.contractType}
          productName={retryModal.productName}
          onClose={() =>
            setRetryModal({
              isOpen: false,
              contractId: null,
              contractType: null,
              productName: null,
            })
          }
          onSuccess={() => {
            setRetryModal({
              isOpen: false,
              contractId: null,
              contractType: null,
              productName: null,
            });
            fetchInstallments(); // Refresh data
          }}
        />

        {/* Upload Modal - Rendered outside investment groups */}
        <InstallmentProofUploadModal
          isOpen={uploadModal.isOpen}
          installment={uploadModal.installment}
          onClose={() => setUploadModal({ isOpen: false, installment: null })}
          onUpload={handleUploadProof}
          isUploading={uploadingProof === uploadModal.installment?._id}
        />
      </div>
    </>
  );
}

interface ContractRetrySignatureModalProps {
  isOpen: boolean;
  contractId: string | null;
  contractType: "installment" | "full-payment" | null;
  productName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ContractRetrySignatureModal({
  isOpen,
  contractId,
  contractType,
  productName,
  onClose,
  onSuccess,
}: ContractRetrySignatureModalProps) {
  const { t } = useLanguage();
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [retryData, setRetryData] = useState<{
    currentAttempt: number;
    maxAttempts: number;
    canRetry: boolean;
    lastRejectionReason?: string;
    lastRejectionAdminNotes?: string;
  } | null>(null);
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    if (isOpen && contractId) {
      fetchRetryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractId]);

  const fetchRetryData = async () => {
    try {
      const response = await fetch(`/api/contract/${contractId}/retry-status`);
      if (response.ok) {
        const data = await response.json();
        setRetryData(data);
      }
    } catch (error) {
      console.error("Error fetching retry data:", error);
    }
  };

  const handleSignatureChange = (newSignatureData: string | null) => {
    setSignatureData(newSignatureData);
  };

  const handleRetrySubmit = async () => {
    if (!signatureData || !contractId) {
      showError(
        t("payments.retry.signatureRequired"),
        t("payments.retry.signatureRequiredMessage")
      );
      return;
    }

    setSigning(true);
    try {
      const response = await fetch(`/api/contract/${contractId}/retry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signatureData: signatureData,
          contractType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSuccess(
          t("payments.success.title"),
          t("payments.success.contractResubmitted")
        );
        onSuccess();
      } else {
        showError(
          t("payments.errors.general"),
          data.error || t("payments.errors.generalMessage")
        );
      }
    } catch (error) {
      console.error("Error submitting retry:", error);
      showError(t("payments.retry.error"), t("payments.retry.errorMessage"));
    } finally {
      setSigning(false);
    }
  };

  if (!isOpen) return null;

  const canRetry =
    retryData?.canRetry !== false &&
    (retryData?.currentAttempt || 0) < (retryData?.maxAttempts || 3);

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#324D3E] font-poppins">
              {t("payments.retry.title")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Contract Info */}
          <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-4 rounded-2xl mb-6">
            <h4 className="font-semibold text-[#324D3E] font-poppins mb-2">
              {t("payments.form.contractInfo")}
            </h4>
            <p className="text-gray-700 font-poppins">
              <strong>{t("payments.form.product")}</strong> {productName}
            </p>
            <p className="text-gray-700 font-poppins">
              <strong>{t("payments.form.contractId")}</strong> {contractId}
            </p>
            <p className="text-gray-700 font-poppins">
              <strong>{t("payments.form.type")}</strong>{" "}
              {contractType === "installment"
                ? t("payments.form.typeInstallment")
                : t("payments.form.typeFullPayment")}
            </p>
          </div>

          {/* Retry Status */}
          {retryData && (
            <div className="bg-blue-50 p-4 rounded-2xl mb-6 border border-blue-200">
              <h4 className="font-semibold text-blue-800 font-poppins mb-2">
                {t("payments.retry.resubmissionStatus")}
              </h4>
              <p className="text-blue-700 font-poppins text-sm">
                <strong>{t("payments.retry.attempts")}</strong>{" "}
                {retryData.currentAttempt || 0} {t("payments.retry.of")}{" "}
                {retryData.maxAttempts || 3}
              </p>
              {retryData.lastRejectionReason && (
                <>
                  <p className="text-red-700 font-poppins text-sm mt-2">
                    <strong>{t("payments.retry.lastRejectionReason")}</strong>{" "}
                    {retryData.lastRejectionReason}
                  </p>
                  <p className="text-red-700 font-poppins text-sm mt-2">
                    <strong>{t("payments.retry.adminNotes")}</strong>{" "}
                    {retryData.lastRejectionAdminNotes
                      ? retryData.lastRejectionAdminNotes
                      : "-"}
                  </p>
                </>
              )}
            </div>
          )}

          {!canRetry ? (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center">
              <p className="text-red-800 font-poppins font-semibold">
                {t("payments.retry.maxAttemptsReached")}
              </p>
              <p className="text-red-700 font-poppins text-sm mt-2">
                {t("payments.retry.contactAdmin")}
              </p>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="mb-6">
                <h4 className="font-semibold text-[#324D3E] font-poppins mb-3">
                  {t("payments.retry.instructionsTitle")}
                </h4>
                <ul className="list-disc list-inside text-gray-700 font-poppins text-sm space-y-1">
                  <li>{t("payments.retry.instruction1")}</li>
                  <li>{t("payments.retry.instruction2")}</li>
                  <li>{t("payments.retry.instruction3")}</li>
                  <li>{t("payments.retry.instruction4")}</li>
                </ul>
              </div>

              {/* Signature Input */}
              <div className="mb-6">
                <DualSignatureInput
                  onSignatureChange={handleSignatureChange}
                  label={t("payments.retry.signatureLabel")}
                  required
                  disabled={signing}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 font-poppins font-medium transition-all duration-300"
                >
                  {t("payments.retry.cancel")}
                </button>
                <button
                  onClick={handleRetrySubmit}
                  disabled={signing || !signatureData}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full hover:shadow-lg disabled:opacity-50 font-poppins font-medium transition-all duration-300"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Edit3 size={16} />
                    {signing
                      ? t("payments.retry.submitting")
                      : t("payments.retry.submit")}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface InstallmentProofUploadModalProps {
  isOpen: boolean;
  installment: Installment | null;
  onClose: () => void;
  onUpload: (
    paymentId: string,
    file: File,
    description: string
  ) => Promise<void>;
  isUploading: boolean;
}

function InstallmentProofUploadModal({
  isOpen,
  installment,
  onClose,
  onUpload,
  isUploading,
}: InstallmentProofUploadModalProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !installment) return;

    await onUpload(installment._id!, file, description);
    onClose();
    setFile(null);
    setDescription("");
  };

  if (!isOpen || !installment) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#324D3E] font-poppins">
              Upload Bukti Pembayaran #{installment.installmentNumber}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-3 rounded-2xl mb-4">
            <div className="text-sm text-gray-600 font-poppins">
              {t("payments.installments.installmentNumber")}
              {installment.installmentNumber}
            </div>
            <div className="text-lg font-semibold text-[#324D3E] font-poppins">
              Rp {installment.amount.toLocaleString("id-ID")}
            </div>
            <div className="text-sm text-gray-600 font-poppins">
              {t("payments.cards.dueDate")}{" "}
              {installment.dueDate
                ? formatDate(installment.dueDate)
                : t("payments.willBeDetermined")}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#324D3E] mb-2 font-poppins">
                Upload Gambar Bukti Pembayaran *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-xl p-2 font-poppins focus:border-[#324D3E] focus:ring-1 focus:ring-[#324D3E]"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[#324D3E] mb-2 font-poppins">
                Keterangan (opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-2 h-20 font-poppins focus:border-[#324D3E] focus:ring-1 focus:ring-[#324D3E]"
                placeholder="Tambahkan keterangan tentang pembayaran..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 font-poppins font-medium transition-all duration-300"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!file || isUploading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full hover:shadow-lg disabled:opacity-50 font-poppins font-medium transition-all duration-300"
              >
                <span className="flex items-center justify-center gap-2">
                  <Upload size={16} />
                  {isUploading ? "Mengunggah..." : "Upload"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  function formatDate(dateString: Date | string) {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

// Portfolio Overview Component
interface PortfolioOverviewProps {
  stats: {
    totalInvestments: number;
    totalAmount: number;
    totalPaid: number;
    overdueCount: number;
    upcomingCount: number;
  };
}

function PortfolioOverview({ stats }: PortfolioOverviewProps) {
  const { t } = useLanguage();
  const completionPercentage =
    stats.totalAmount > 0 ? (stats.totalPaid / stats.totalAmount) * 100 : 0;

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-[#324D3E] font-poppins mb-6">
        {t("payments.portfolio.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Investments */}
        <div className="bg-gradient-to-br from-[#324D3E]/10 to-[#4C3D19]/10 rounded-2xl p-4">
          <div className="text-[#324D3E] mb-2">
            <TrendingUp size={32} />
          </div>
          <div className="text-2xl font-bold text-[#324D3E] font-poppins">
            {stats.totalInvestments}
          </div>
          <div className="text-sm text-gray-600 font-poppins">
            {t("payments.stats.totalPackages")}
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
          <div className="text-[#324D3E] mb-2">
            <DollarSign size={32} />
          </div>
          <div className="text-2xl font-bold text-[#324D3E] font-poppins">
            Rp {stats.totalAmount.toLocaleString("id-ID")}
          </div>
          <div className="text-sm text-gray-600 font-poppins">
            {t("payments.stats.paymentValue")}
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4">
          <div className="text-[#324D3E] mb-2">
            <CheckCircle size={32} />
          </div>
          <div className="text-2xl font-bold text-green-600 font-poppins">
            Rp {stats.totalPaid.toLocaleString("id-ID")}
          </div>
          <div className="text-sm text-gray-600 font-poppins">
            {t("payments.stats.paid")}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4">
          <div className="text-[#324D3E] mb-2">
            <Clock size={32} />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-bold text-red-600 font-poppins">
                {stats.overdueCount}
              </div>
              <div className="text-xs text-gray-600 font-poppins">
                {t("payments.stats.overdue")}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600 font-poppins">
                {stats.upcomingCount}
              </div>
              <div className="text-xs text-gray-600 font-poppins">
                {t("payments.stats.upcoming")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Search and Filter Component
interface SearchAndFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filter:
    | "all"
    | "active"
    | "completed"
    | "overdue"
    | "full-payment"
    | "installment";
  setFilter: (
    filter:
      | "all"
      | "active"
      | "completed"
      | "overdue"
      | "full-payment"
      | "installment"
  ) => void;
  stats: {
    totalInvestments: number;
    totalAmount: number;
    totalPaid: number;
    overdueCount: number;
    upcomingCount: number;
  };
  groupedInstallments: CicilanGroup[];
  fullPaymentContracts: FullPaymentContract[];
}

function SearchAndFilter({
  searchTerm,
  setSearchTerm,
  filter,
  setFilter,
  stats,
  groupedInstallments,
  fullPaymentContracts,
}: SearchAndFilterProps) {
  const { t } = useLanguage();
  const filters = [
    {
      key: "all",
      label: t("payments.filters.all"),
      count: stats.totalInvestments,
    },
    {
      key: "active",
      label: t("payments.filters.active"),
      count:
        groupedInstallments.filter((group) => {
          const approvedCount = group.installments.filter(
            (inst) => inst.status === "approved" || inst.status === "completed"
          ).length;
          return approvedCount < group.installments.length;
        }).length +
        fullPaymentContracts.filter((contract) => !contract.paymentCompleted)
          .length,
    },
    {
      key: "overdue",
      label: t("payments.filters.overdue"),
      count: stats.overdueCount > 0 ? 1 : 0,
    },
    {
      key: "completed",
      label: t("payments.filters.completed"),
      count:
        groupedInstallments.filter((group) => {
          const approvedCount = group.installments.filter(
            (inst) => inst.status === "approved" || inst.status === "completed"
          ).length;
          return approvedCount === group.installments.length;
        }).length +
        fullPaymentContracts.filter((contract) => contract.paymentCompleted)
          .length,
    },
    {
      key: "installment",
      label: t("payments.filters.installment"),
      count: groupedInstallments.length,
    },
    {
      key: "full-payment",
      label: t("payments.filters.fullPayment"),
      count: fullPaymentContracts.length,
    },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Cari pembayaran/paket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#324D3E] focus:border-[#324D3E] font-poppins"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key as any)}
              className={`px-4 py-2 rounded-full font-medium transition-all duration-300 font-poppins text-sm ${
                filter === filterOption.key
                  ? "bg-[#324D3E] text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filterOption.label} ({filterOption.count})
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
