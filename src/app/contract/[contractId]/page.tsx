"use client";

import { useAlert } from "@/components/ui/Alert";
import { DualSignatureInput } from "@/components/ui/dual-signature-input";
import jsPDF from "jspdf";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ContractData {
  investor: {
    name: string;
    memberNumber?: string;
    email: string;
    phoneNumber?: string;
    nik?: string;
    dateOfBirth?: Date;
    occupation?: string;
    address?: string;
    village?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  investment: {
    investmentId: string;
    productName: string;
    totalAmount: number;
    amountPaid: number;
    paymentType: "full" | "cicilan";
    paymentTerm?: "monthly" | "quarterly" | "semiannual" | "annual";
    totalInstallments?: number;
    durationYears?: number;
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

// Helper function to render numbered text with hanging indent
function renderNumberedTextWithIndent(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const numberMatch = text.match(/^(\d+\.\s)/);

  if (!numberMatch) {
    return renderTextWithFormatting(pdf, text, x, y, maxWidth, lineHeight);
  }

  const numberPart = numberMatch[1];
  const textPart = text.substring(numberPart.length);
  const numberWidth = pdf.getTextWidth(numberPart);
  const indentX = x + numberWidth;
  const textMaxWidth = maxWidth - numberWidth;

  pdf.text(numberPart, x, y);

  const heightUsed = renderTextWithFormatting(
    pdf,
    textPart,
    indentX,
    y,
    textMaxWidth,
    lineHeight
  );

  return heightUsed;
}

// Helper function to render text with inline bold and italic formatting
function renderTextWithFormatting(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const parts: { text: string; bold?: boolean; italic?: boolean }[] = [];

  let processedText = text;
  const forceMajeureRegex = /Force Majeure/g;
  const modalKerjasamaRegex = /MODAL KERJASAMA/g;
  const halimRegex = /Halim Perdana Kusuma, S\.H\., M\.H\./g;
  // Only match "Pihak Pertama" and "Pihak Kedua" when preceded by "disebut sebagai"
  const pihakPertamaLabelRegex = /(?<=disebut sebagai )(Pihak Pertama)/g;
  const pihakKeduaLabelRegex = /(?<=disebut sebagai )(Pihak Kedua)/g;
  const priceRegex = /(Rp[\d\.,]+-)/g;
  const plantRegex = /\b(GAHARU|ALPUKAT|JENGKOL|AREN|KELAPA)\b/g;
  // Match amount in words (Indonesian number words like "satu juta", "dua puluh ribu", etc.)
  const amountWordsRegex = /([a-z\s]+rupiah)/gi;
  // Match payment type phrases
  const paymentTypeRegex = /(sekali bayar|dengan cara dicicil)/gi;

  processedText = processedText.replace(forceMajeureRegex, '{{ITALIC:Force Majeure}}');
  processedText = processedText.replace(modalKerjasamaRegex, '{{BOLD:MODAL KERJASAMA}}');
  processedText = processedText.replace(halimRegex, '{{BOLD:Halim Perdana Kusuma, S.H., M.H.}}');
  processedText = processedText.replace(pihakPertamaLabelRegex, '{{BOLD:Pihak Pertama}}');
  processedText = processedText.replace(pihakKeduaLabelRegex, '{{BOLD:Pihak Kedua}}');
  processedText = processedText.replace(priceRegex, '{{BOLD:$1}}');
  processedText = processedText.replace(plantRegex, '{{BOLD:$1}}');
  processedText = processedText.replace(amountWordsRegex, '{{BOLD:$1}}');
  processedText = processedText.replace(paymentTypeRegex, '{{BOLD:$1}}');

  const markerRegex = /\{\{(BOLD|ITALIC):([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = markerRegex.exec(processedText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: processedText.substring(lastIndex, match.index) });
    }
    parts.push({
      text: match[2],
      bold: match[1] === 'BOLD',
      italic: match[1] === 'ITALIC'
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < processedText.length) {
    parts.push({ text: processedText.substring(lastIndex) });
  }

  if (parts.length === 0 || (parts.length === 1 && !parts[0].bold && !parts[0].italic)) {
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return lineHeight * lines.length;
  }

  let currentY = y;
  let currentX = x;
  const pageWidth = maxWidth;

  parts.forEach(part => {
    const style = part.italic ? 'italic' : (part.bold ? 'bold' : 'normal');
    pdf.setFont('helvetica', style);

    const words = part.text.split(' ');
    words.forEach((word, idx) => {
      const wordWithSpace = idx < words.length - 1 ? word + ' ' : word;
      const wordWidth = pdf.getTextWidth(wordWithSpace);

      if (currentX + wordWidth > x + pageWidth && currentX > x) {
        currentY += lineHeight;
        currentX = x;
      }

      pdf.text(wordWithSpace, currentX, currentY);
      currentX += wordWidth;
    });
  });

  pdf.setFont('helvetica', 'normal');
  return currentY - y + lineHeight;
}

// Helper function to convert number to Indonesian words
function convertNumberToWords(num: number): string {
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
        chunkText = "se"; // "seribu" instead of "satu ribu"
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
}

type PlantMetadata = {
  label: string;
  family: string;
  alias: string;
  scientificName: string;
  usesText: string;
};

function getPlantMetadata(productName?: string): PlantMetadata {
  const normalized = (productName || "").toLowerCase();
  if (normalized.includes("alpukat")) {
    return {
      label: "Alpukat",
      family: "Lauraceae",
      alias: "avokad",
      scientificName: "Persea americana",
      usesText: "buahnya untuk konsumsi, serta daunnya untuk pemanfaatan tertentu",
    };
  }
  if (normalized.includes("gaharu")) {
    return {
      label: "Gaharu",
      family: "Thymelaeaceae",
      alias: "agarwood",
      scientificName: "Aquilaria malaccensis",
      usesText: "resinnya untuk bahan baku parfum, dupa, dan produk turunannya",
    };
  }
  if (normalized.includes("jengkol")) {
    return {
      label: "Jengkol",
      family: "Fabaceae",
      alias: "jering",
      scientificName: "Archidendron pauciflorum",
      usesText: "bijinya sebagai bahan pangan dan bagian tanamannya untuk pemanfaatan pendukung",
    };
  }
  if (normalized.includes("kelapa")) {
    return {
      label: "Kelapa",
      family: "Arecaceae",
      alias: "nyiur",
      scientificName: "Cocos nucifera",
      usesText: "buah, air, sabut, dan bagian lainnya untuk kebutuhan pangan maupun turunan usaha",
    };
  }

  return {
    label: "Aren",
    family: "Arecaceae",
    alias: "enau",
    scientificName: "Arenga pinnata",
    usesText: "nira untuk gula aren, ijuk dan lidi, serta buahnya (kolang-kaling)",
  };
}

function getPlantTypesText(productName?: string): string {
  const normalized = (productName || "").toLowerCase();
  if (normalized.includes("alpukat")) return "ALPUKAT";
  if (normalized.includes("gaharu")) return "GAHARU";
  if (normalized.includes("jengkol")) return "JENGKOL";
  if (normalized.includes("aren")) return "AREN";
  if (normalized.includes("kelapa")) return "KELAPA";
  return "GAHARU, ALPUKAT, JENGKOL, AREN, KELAPA";
}

function convertNumberToUnitWords(num: number): string {
  return convertNumberToWords(num).replace(/\s+rupiah$/i, "").trim();
}

function getPaymentClauseText(params: {
  paymentType: "full" | "cicilan";
  paymentTerm?: "monthly" | "quarterly" | "semiannual" | "annual";
  totalAmountText: string;
  totalAmountWords: string;
  totalInstallments?: number;
  durationYears?: number;
  wrapValue?: (value: string) => string;
}): string {
  const wrap = params.wrapValue || ((value: string) => value);
  const amountWords = params.totalAmountWords.toLowerCase();

  if (params.paymentType === "full") {
    return `1. Membayar sebesar ${wrap(params.totalAmountText)} (${wrap(amountWords)}) sekali bayar;`;
  }

  if (params.paymentTerm === "annual" && params.durationYears) {
    const yearsWords = convertNumberToUnitWords(params.durationYears).toLowerCase();
    return `1. Membayar sebesar ${wrap(params.totalAmountText)} (${wrap(amountWords)}) dengan cara dicicil selama ${wrap(String(params.durationYears))} (${wrap(yearsWords)}) tahun, dibayar setiap tahun di tanggal dan bulan yang sama pada saat melakukan pembayaran pertama;`;
  }

  if (params.totalInstallments) {
    const monthsWords = convertNumberToUnitWords(params.totalInstallments).toLowerCase();
    return `1. Membayar sebesar ${wrap(params.totalAmountText)} (${wrap(amountWords)}) dengan cara dicicil selama ${wrap(String(params.totalInstallments))} (${wrap(monthsWords)}) bulan dibayar setiap bulan pada tanggal yang sama saat pembayaran pertama;`;
  }

  return `1. Membayar sebesar ${wrap(params.totalAmountText)} (${wrap(amountWords)}) dengan cara dicicil selama ${wrap("60")} (${wrap("enam puluh")}) bulan dibayar setiap bulan pada tanggal yang sama saat pembayaran pertama;`;
}

export default function ContractPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.contractId as string;
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading contract data..."
  );
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
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

  // Deprecated: Now redirects to payment method selection instead
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const createPaymentAndRedirect = async () => {
    if (!contractData) {
      showError("Error", "Contract data not available for payment creation.");
      return;
    }

    try {
      setCreatingPayment(true);

      if (contractData.investment.paymentType === "full") {
        // For full payment: use create-investment API
        const paymentData = {
          plan: {
            name: contractData.investment.productName,
            price: contractData.investment.totalAmount,
          },
          user: {
            email: contractData.investor.email,
            name: contractData.investor.name,
          },
          contractId: contractId,
          referralCode: null, // Can be added if available
        };

        const response = await fetch("/api/payment/create-investment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        });

        if (response.ok) {
          const result = await response.json();

          // Check for redirect URL in the data object
          if (result.data?.redirect_url) {
            window.location.href = result.data.redirect_url;
          }
        }
      } else {
        // For installment payment: fetch and pay the first installment automatically
        // Fetch all cicilan data for the user
        const cicilanResponse = await fetch("/api/cicilan/user");

        if (cicilanResponse.ok) {
          const cicilanData = await cicilanResponse.json();

          // Find the cicilan group that matches this contractId
          const cicilanGroup = cicilanData.cicilanGroups?.find(
            (g: any) =>
              g.cicilanOrderId === contractId || g.contractId === contractId
          );

          if (cicilanGroup && cicilanGroup.installments) {
            // Find the first installment (installmentNumber === 1)
            const firstInstallment = cicilanGroup.installments.find(
              (inst: any) =>
                inst.installmentNumber === 1 && inst.exists === true
            );

            if (firstInstallment && firstInstallment._id) {
              // Call create-installment-payment API with the first installment's paymentId
              const response = await fetch(
                "/api/payment/create-installment-payment",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    paymentId: firstInstallment._id,
                  }),
                }
              );

              if (response.ok) {
                const result = await response.json();

                // Redirect to Midtrans payment page
                if (result.data?.paymentUrl) {
                  window.location.href = result.data.paymentUrl;
                } else if (result.redirectUrl) {
                  window.location.href = result.redirectUrl;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      showError(
        "Error",
        "Terjadi kesalahan saat memproses pembayaran. Anda akan diarahkan ke halaman pembayaran."
      );
    } finally {
      setCreatingPayment(false);
    }
  };

  const generatePDF = async () => {
    if (!contractData) {
      showError("Data kontrak tidak ditemukan", "Silakan refresh halaman.");
      return;
    }
    if (!signatureData) {
      showError(
        "Tanda Tangan Tidak Tersedia",
        "Tanda tangan digital tidak ditemukan untuk kontrak ini."
      );
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

      // Function to add page number at bottom center
      const addPageNumber = () => {
        const pageNumber = (pdf.internal as any).getNumberOfPages();
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(128, 128, 128); // Gray color
        const pageText = `- ${pageNumber} -`;
        const pageWidth = pdf.internal.pageSize.width;
        const textWidth = pdf.getTextWidth(pageText);
        pdf.text(
          pageText,
          (pageWidth - textWidth) / 2,
          pdf.internal.pageSize.height - 10
        );
        pdf.setTextColor(0, 0, 0); // Reset to black
      };

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
      // Persetujuan Pengelolaan Simpanan Anggota
      // Header text positioned below logo
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text("PERSETUJUAN PENGELOLAAN SIMPANAN ANGGOTA", 105, headerYPosition, {
        align: "center",
      });

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        `Nomor: ${contractData.contractNumber}`,
        105,
        headerYPosition + 18,
        {
          align: "center",
        }
      );

      // Start content below header
      let yPosition = headerYPosition + 30;
      const leftMargin = 20;
      const rightMargin = 190;

      // Add horizontal line
      pdf.setLineWidth(1);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(leftMargin, yPosition, rightMargin, yPosition);
      yPosition += 15;

      // Date section with exact format from DOCX
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

      // Personal Information Section (exact DOCX format)
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      const lineHeight = 5;
      const colonPosition = leftMargin + 70;

    // Pihak Pertama - numbered section 1
    pdf.setFont("helvetica", "bold");
    pdf.text("1.", leftMargin, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.text("Nama", leftMargin + 10, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        `${contractData.investor.name || ""}`,
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      pdf.text("NIK", leftMargin + 10, yPosition);
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
      pdf.text("Tempat/Tgl Lahir", leftMargin + 10, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(`${dobText}`, colonPosition + 5, yPosition);
      yPosition += lineHeight;

      pdf.text("Email", leftMargin + 10, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        `${contractData.investor.email || ""}`,
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      pdf.text("Nomor Kontak", leftMargin + 10, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text(
        `${contractData.investor.phoneNumber || ""}`,
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      pdf.text("Pekerjaan", leftMargin + 10, yPosition);
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

      pdf.text("Alamat", leftMargin + 10, yPosition);
      pdf.text(":", colonPosition, yPosition);
      const addressLines = pdf.splitTextToSize(
        `${fullAddress}`,
        rightMargin - colonPosition - 5
      );
      pdf.text(addressLines, colonPosition + 5, yPosition);
      yPosition += lineHeight * addressLines.length + 8;

      // Contract preamble with revised wording
      const totalAmountText = `Rp${contractData.investment.totalAmount.toLocaleString(
        "id-ID"
      )},-`;
      const totalAmountWords = convertNumberToWords(
        contractData.investment.totalAmount
      );

      const plantTypesText = getPlantTypesText(contractData.investment.productName);
      const plantMetadata = getPlantMetadata(contractData.investment.productName);
      const memberNumber = contractData.investor.memberNumber || "-";

      // Helper function to wrap dynamic values in bold markers
      const wrapBold = (text: string) => `{{BOLD:${text}}}`;

      const preambleIntroText =
        `Bahwa sebelum ditandatanganinya Surat Persetujuan ini, saya selaku anggota koperasi dengan nomor anggota ${wrapBold(memberNumber)} menerangkan hal–hal sebagai berikut:`;
      const preambleIntroLines = pdf.splitTextToSize(
        preambleIntroText,
        rightMargin - leftMargin
      );
      pdf.text(preambleIntroLines, leftMargin, yPosition);
      yPosition += lineHeight * preambleIntroLines.length + 3;

      const preambleTexts = [
        `1. Bahwa saya anggota dari Koperasi Bintang Merah Sejahtera dan selaku yang memiliki simpanan anggota sebesar ${wrapBold(totalAmountText)} (${wrapBold(totalAmountWords.toLowerCase())}) untuk selanjutnya disebut sebagai Simpanan Anggota untuk project (${wrapBold(plantTypesText)});`,
        `2. Bahwa Koperasi adalah Koperasi Pengelola untuk project (${wrapBold(plantTypesText)}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
        `3. Bahwa Anggota Koperasi dan Koperasi setuju untuk pengelolaan simpanan anggota dalam usaha (${wrapBold(plantTypesText)}) sesuai dengan ketentuan hukum yang berlaku.`,
      ];

      preambleTexts.forEach((text) => {
        if (yPosition > 250) {
          addPageNumber(); // Add page number to current page before adding new page
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

      const agreementIntro =
        "Persetujuan Pengelolaan Simpanan Anggota ini yang dilaksanakan dengan ketentuan dan syarat-syarat sebagai berikut:";
      const agreementIntroLines = pdf.splitTextToSize(
        agreementIntro,
        rightMargin - leftMargin
      );
      pdf.text(agreementIntroLines, leftMargin, yPosition);
      yPosition += lineHeight * agreementIntroLines.length + 8;

      const paymentClause = getPaymentClauseText({
        paymentType: contractData.investment.paymentType,
        paymentTerm: contractData.investment.paymentTerm,
        totalAmountText,
        totalAmountWords,
        totalInstallments: contractData.investment.totalInstallments,
        durationYears: contractData.investment.durationYears,
        wrapValue: wrapBold,
      });

      // Revised contract points
      const articles = [
        {
          title: "POIN I (DEFINISI)",
          content: [
            "Dalam persetujuan ini, istilah-istilah berikut mempunyai arti sebagai berikut:",
            "1. Koperasi adalah Koperasi Bintang Merah Sejahtera;",
            "2. Pengurus Koperasi adalah organ koperasi yang sah sesuai Anggaran Dasar dan Anggaran Rumah Tangga;",
            "3. Simpanan Anggota adalah simpanan pokok, simpanan wajib, dan/atau simpanan sukarela yang dinilai dalam rupiah;",
            "4. Sisa Hasil Usaha (SHU) adalah hasil yang diperoleh masing-masing anggota setelah satu tahun buku setelah seluruh pendapatan dikurangi biaya, penyusutan, dan kewajiban lainnya, termasuk pajak;",
            "5. Diskon adalah pengurangan harga, potongan nominal, atau persentase yang diberikan;",
            `6. ${wrapBold(plantMetadata.label)} adalah nama pohon dari keluarga ${wrapBold(plantMetadata.family)} yang juga dikenal sebagai ${wrapBold(plantMetadata.alias)}, dengan nama ilmiah ${wrapBold(plantMetadata.scientificName)}. Pohon ini sangat serbaguna dan hampir seluruh bagiannya dapat dimanfaatkan, termasuk ${wrapBold(plantMetadata.usesText)};`,
            `7. Paket Penanaman adalah unit usaha penanaman 10 (sepuluh) pohon (${wrapBold(plantTypesText)}) yang dikelola oleh koperasi;`,
            "8. Masa Panen adalah periode waktu di mana hasil dipanen dan dikumpulkan dari lahan;",
            "9. Laporan Usaha adalah laporan tertulis dan/atau elektronik yang disampaikan Koperasi kepada Anggota Koperasi secara periodik;",
            "10. Masa Perawatan adalah periode sejak bibit ditanam hingga pohon siap dipanen;",
            "11. Force Majeure adalah keadaan di luar kemampuan yang menyebabkan tidak dapat melaksanakan kewajibannya;",
          ],
        },
        {
          title: "POIN II (RUANG LINGKUP)",
          content: [
            `1. Dalam persetujuan pengelolaan simpanan anggota ini menyatakan agar Koperasi Bintang Merah sebagai Pengelola simpanan wajib anggota sebesar ${wrapBold(totalAmountText)} (${wrapBold(totalAmountWords.toLowerCase())}) untuk 1 (satu) paket penanaman (${wrapBold(plantTypesText)}) dan Koperasi dengan ini telah menerima penyerahan simpanan tersebut dari Anggota Koperasi serta menyanggupi untuk melaksanakan pengelolaan simpanan anggota;`,
            `2. Koperasi melaksanakan pengelolaan simpanan anggota pada Usaha Peningkatan Modal di project (${wrapBold(plantTypesText)}) yang berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan setelah ditandatanganinya persetujuan ini;`,
            "3. Koperasi dengan ini akan membagikan Sisa Hasil Usaha (SHU) kepada Anggota Koperasi di mulai dari setelah masa panen pertama atau setelah tanaman dapat menghasilkan;",
          ],
        },
        {
          title: "POIN III (TATA CARA SIMPANAN ANGGOTA)",
          content: [
            "Mengenai tata cara Simpanan Anggota dengan cara sebagai berikut:",
            paymentClause,
          ],
        },
        {
          title: "POIN IV (JANGKA WAKTU)",
          content: [
            "Persetujuan ini dilakukan dan diterima untuk jangka waktu 12 (dua belas) tahun, terhitung sejak tanggal di tanda tanganinya persetujuan ini;",
          ],
        },
        {
          title: "POIN V (SISA HASIL USAHA (SHU))",
          content: [
            "Dalam Persetujuan ini, didalam hal pembagian hasil penyertaan simpanan anggota sebagai berikut:",
            `1. Persetujuan ini dilakukan dengan cara pemberian Sisa Hasil Usaha (SHU) yang diperoleh dalam Usaha Peningkatan Modal Usaha di project (${wrapBold(plantTypesText)}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
            "2. Sisa Hasil Usaha (SHU) yang akan di bagikan kepada Anggota Koperasi adalah:",
            "2.1. Sebesar 100% (seratus persen) dari hasil yang di dapatkan koperasi;",
            "2.2. Perhitungan Sisa Hasil Usaha (SHU) koperasi didasarkan pada pendapatan dikurangi biaya operasional dan kewajiban selama satu tahun buku;",
            "3. Pembagian Sisa Hasil Usaha (SHU) dilakukan paling lambat 7 (tujuh) hari Kerja setelah masa panen dan penjualan telah selesai dilaksanakan;",
            "4. Pembayaran Sisa Hasil Usaha (SHU) dilakukan melalui transfer ke rekening ANGGOTA KOPERASI.",
          ],
        },
        {
          title: "POIN VI (PENGALIHAN)",
          content: [
            "1. Anggota Koperasi dilarang menyerahkan sebagian atau keseluruhan hak atau kewajibannya dalam persetujuan ini kepada Pihak Ketiga atau Pihak Lain tanpa terlebih dahulu mendapatkan persetujuan tertulis dari Koperasi.",
            "2. Apabila Anggota Koperasi meninggal dunia, maka ahli waris dapat melanjutkan dengan terlebih dahulu mendapatkan persetujuan tertulis dari Koperasi dan dibuktikan dengan surat pernyataan waris yang berlaku;",
          ],
        },
        {
          title: "POIN VII (PENGAKHIRAN DAN PENGHENTIAN)",
          content: [
            "Bahwa Persetujuan ini dapat berakhir apabila terjadi hal-hal sebagai berikut:",
            "1. Anggota Koperasi tidak lagi menjadi anggota Koperasi Bintang Merah Sejahtera;",
            "2. Berakhirnya masa sesuai yang tertuang dalam Persetujuan ini.",
            "",
            "Apabila Anggota Koperasi berhenti sebelum jangka waktu yang ada tanpa persetujuan tertulis dari Koperasi, maka:",
            "1. Simpanan anggota yang telah disetorkan tidak dapat dikembalikan secara penuh.",
            "2. Pengembalian simpanan anggota hanya akan dilakukan setelah dikurangi dengan biaya administrasi, biaya operasional yang telah dikeluarkan, serta potongan lain.",
            "3. Apabila Anggota Koperasi menunjuk atau menghadirkan pengganti yang disetujui oleh Koperasi untuk melanjutkan kerjasama, maka yang dikembalikan kepada Anggota Koperasi hanya sebesar selisih nilai setelah memperhitungkan kewajiban dan/atau biaya-biaya yang timbul.",
            "4. Koperasi berhak menunjuk atau menghadirkan pengganti;",
            "5. Koperasi berhak menahan Sebagian dan/atau keseluruhan simpanan anggota sebagai bentuk kompensasi atas kerugian, biaya, maupun potensi kehilangan manfaat akibat penghentian tersebut.",
          ],
        },
        {
          title: "POIN XI (KEADAAN MEMAKSA (FORCE MAJEURE))",
          content: [
            "1. Yang termasuk dalam Force Majeure adalah akibat dari kejadian-kejadian diluar kuasa dan kehendak dari Koperasi diantaranya termasuk tidak terbatas bencana alam, banjir, badai, topan, gempa bumi, kebakaran, perang, huru-hara, pemberontakan, demonstrasi, pemogokan, kegagalan koperasi.",
            "2. Apabila terjadi Force Majeure wajib memberitahukan secara tertulis kepada anggota selambat-lambatnya 7 (tujuh) hari sejak terjadinya keadaan tersebut dengan bukti pendukung yang sah.",
            "3. Apabila Force Majeure berlangsung tidak lebih dari 30 (tiga puluh) hari, kewajiban koperasi ditunda hingga keadaan berakhir.",
            "4. Apabila Force Majeure berlangsung lebih dari 90 (Sembilan puluh) hari sehingga pelaksanaan tidak mungkin dilanjutkan, maka untuk membicarakan kembali atau mengakhiri tanpa tuntutan ganti rugi.",
          ],
        },
        {
          title: "POIN XIV (PENUTUP)",
          content: [
            "Segala ketentuan yang ada dalam persetujuan ini tunduk pada ketentuan terkait Koperasi dan peraturan perundang-undangan yang berlaku.",
            "Demikianlah surat Persetujuan Pengelolaan Simpanan Anggota ini dibuat, yang ditandatangani dan bermaterai cukup dan berlaku sejak ditandatangani.",
          ],
        },
      ];

      // Add all articles
      pdf.setFontSize(10);
      articles.forEach((article) => {
        // Check space for article title
        if (yPosition > 250) {
          addPageNumber(); // Add page number to current page before adding new page
          pdf.addPage();
          yPosition = 20;
          // Reset font size after new page
          pdf.setFontSize(10);
        }

        // Article title - left aligned
        pdf.setFontSize(10); // Ensure consistent font size
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        const titleLines = article.title.split("\n");
        titleLines.forEach((titleLine) => {
          pdf.text(titleLine, leftMargin, yPosition);
          yPosition += lineHeight;
        });
        yPosition += lineHeight * 0.5;

        // Article content
        pdf.setFontSize(10); // Ensure consistent font size
        pdf.setFont("helvetica", "normal");
        article.content.forEach((paragraph) => {
          if (paragraph === "") {
            yPosition += lineHeight * 0.5;
            return;
          }

          if (yPosition > 260) {
            addPageNumber(); // Add page number to current page before adding new page
            pdf.addPage();
            yPosition = 20;
            // Reset font size after new page
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
          }

          const heightUsed = renderNumberedTextWithIndent(
            pdf,
            paragraph,
            leftMargin,
            yPosition,
            rightMargin - leftMargin,
            lineHeight
          );
          yPosition += heightUsed + lineHeight * 0.3;
        });

        yPosition += lineHeight;
      });

      // Add closing location and date
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
      const pageWidth = pdf.internal.pageSize.width;
      pdf.text(`Jakarta, ${closingDateStr}`, pageWidth - leftMargin, yPosition, { align: "right" });
      yPosition += lineHeight * 2;

      if (yPosition > 180) {
        addPageNumber();
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      const centerX = pageWidth / 2;

      pdf.text("Anggota Koperasi", centerX, yPosition, { align: "center" });

      yPosition += lineHeight * 2;

      const signatureAreaHeight = 25;
      const signatureStartY = yPosition;

      const nameYPosition =
        signatureStartY + signatureAreaHeight + lineHeight * 1;

      if (signatureDataURL) {
        try {
          if (!signatureDataURL.startsWith("data:image/png;base64,")) {
            throw new Error(
              "signatureDataURL is not a valid PNG base64 string"
            );
          }

          const signatureCenterX = centerX - 30;
          const signatureCenterY =
            signatureStartY + signatureAreaHeight / 2 - 15 / 2;

          pdf.addImage(
            signatureDataURL,
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
        const placeholderX = centerX - 40;
        const placeholderY = signatureStartY + signatureAreaHeight / 2;
        pdf.text("_________________", placeholderX, placeholderY);
      }

      pdf.text(`${contractData.investor.name}`, centerX, nameYPosition, { align: "center" });

      yPosition = nameYPosition;

      yPosition += lineHeight;

      yPosition += 50;

      // Footer with validation info
      pdf.setFillColor(250, 250, 250);
      pdf.rect(leftMargin, yPosition, 170, 15, "F");

      pdf.setFontSize(8); // Footer uses smaller font size (this is intentional)
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

      // Add page number to the final page
      addPageNumber();

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
        // Redirect to payment method selection page
        router.push(`/contract/${contractId}/payment-method`);
      } else {
        const errorData = await response.json().catch(() => null);
        console.error("Contract signing API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          `Failed to save contract signing status: ${
            errorData?.error || response.statusText
          }`
        );
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

  if (signed || creatingPayment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            {creatingPayment ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : (
              <span className="text-white text-3xl">✓</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#324D3E] mb-4">
            {creatingPayment
              ? "Memproses Pembayaran..."
              : "Kontrak Berhasil Ditandatangani!"}
          </h1>
          <p className="text-gray-600 mb-6">
            {creatingPayment
              ? "Membuat pembayaran dan mengarahkan ke halaman pembayaran..."
              : "Kontrak kepemilikan pohon Anda telah berhasil dibuat dan diunduh. Anda akan segera diarahkan ke halaman pembayaran."}
          </p>
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
          Persetujuan Pengelolaan Simpanan Anggota
          </h1>
          <p className="text-[#889063]">Koperasi Bintang Merah Sejahtera</p>
        </div>

        {/* Full Contract Preview */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#324D3E]/10 mb-8">
          <div className="p-8">
            {/* Contract Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#324D3E] mb-2">
                PERSETUJUAN PENGELOLAAN SIMPANAN ANGGOTA
              </h1>
              <p className="text-[#889063] mb-4">
                Nomor: {contractData.contractNumber}
              </p>
              <hr className="border-[#324D3E] border-t-2 mb-6" />
            </div>

            {/* Contract Content */}
            <div className="space-y-6 text-sm text-[#324D3E]">
              {/* Date and Parties */}
              <div>
                <p className="mb-4">
                  Pada hari ini,{" "}
                  {new Date(contractData.contractDate).toLocaleDateString(
                    "id-ID",
                    {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )}
                  , (
                  {new Date(contractData.contractDate).toLocaleDateString(
                    "id-ID",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )}
                  ) yang bertandatangan dibawah ini:
                </p>

                {/* Pihak Pertama - Investor */}
                <div className="mb-6 space-y-1">
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Nama</span>
                    <span>: {contractData.investor.name}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">NIK</span>
                    <span>: {contractData.investor.nik || ""}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Tempat/Tgl Lahir</span>
                    <span>
                      :{" "}
                      {contractData.investor.dateOfBirth
                        ? new Date(
                            contractData.investor.dateOfBirth
                          ).toLocaleDateString("id-ID")
                        : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Email</span>
                    <span>: {contractData.investor.email}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Nomor Kontak</span>
                    <span>: {contractData.investor.phoneNumber || ""}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Pekerjaan</span>
                    <span>: {contractData.investor.occupation || ""}</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Alamat</span>
                    <span>
                      :{" "}
                      {[
                        contractData.investor.address,
                        contractData.investor.village,
                        contractData.investor.city,
                        contractData.investor.province,
                        contractData.investor.postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                </div>

                {/* Preamble */}
                <div className="space-y-4">
                  <p>
                    Bahwa sebelum ditandatanganinya Surat Persetujuan ini, saya
                    selaku anggota koperasi dengan nomor anggota{" "}
                    <strong>{contractData.investor.memberNumber || "-"}</strong>{" "}
                    menerangkan hal–hal sebagai berikut:
                  </p>

                  {(() => {
                    const totalAmountText = `Rp${contractData.investment.totalAmount.toLocaleString(
                      "id-ID"
                    )},-`;
                    const totalAmountWords = convertNumberToWords(
                      contractData.investment.totalAmount
                    );
                    const plantTypesText = getPlantTypesText(
                      contractData.investment.productName
                    );

                    return (
                      <div className="space-y-3">
                        <p>
                          1. Bahwa saya anggota dari Koperasi Bintang Merah
                          Sejahtera dan selaku yang memiliki simpanan anggota
                          sebesar {totalAmountText} ({totalAmountWords.toLowerCase()})
                          untuk selanjutnya disebut sebagai Simpanan Anggota
                          untuk project ({plantTypesText});
                        </p>
                        <p>
                          2. Bahwa Koperasi adalah Koperasi Pengelola untuk
                          project ({plantTypesText}) berlokasi di Kabupten Musi
                          Rawas Utara Provinsi Sumatera Selatan;
                        </p>
                        <p>
                          3. Bahwa Anggota Koperasi dan Koperasi setuju untuk
                          pengelolaan simpanan anggota dalam usaha (
                          {plantTypesText}) sesuai dengan ketentuan hukum yang
                          berlaku.
                        </p>
                        <p>
                          Persetujuan Pengelolaan Simpanan Anggota ini yang
                          dilaksanakan dengan ketentuan dan syarat-syarat
                          sebagai berikut:
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* All Articles in a scrollable area */}
              <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                <div className="space-y-6">
                  {/* Article content will be generated dynamically */}
                  {(() => {
                    const totalAmountText = `Rp${contractData.investment.totalAmount.toLocaleString(
                      "id-ID"
                    )},-`;
                    const totalAmountWords = convertNumberToWords(
                      contractData.investment.totalAmount
                    );
                    const plantTypesText = getPlantTypesText(
                      contractData.investment.productName
                    );
                    const plantMetadata = getPlantMetadata(
                      contractData.investment.productName
                    );

                    // Helper function to wrap dynamic values in strong tags for HTML preview
                    const wrapStrong = (text: string) => `<strong>${text}</strong>`;

                    const paymentClause = getPaymentClauseText({
                      paymentType: contractData.investment.paymentType,
                      paymentTerm: contractData.investment.paymentTerm,
                      totalAmountText,
                      totalAmountWords,
                      totalInstallments:
                        contractData.investment.totalInstallments,
                      durationYears: contractData.investment.durationYears,
                      wrapValue: wrapStrong,
                    });

                    const articles = [
                      {
                        title: "POIN I (DEFINISI)",
                        content: [
                          "Dalam persetujuan ini, istilah-istilah berikut mempunyai arti sebagai berikut:",
                          "1. Koperasi adalah Koperasi Bintang Merah Sejahtera;",
                          "2. Pengurus Koperasi adalah organ koperasi yang sah sesuai Anggaran Dasar dan Anggaran Rumah Tangga;",
                          "3. Simpanan Anggota adalah simpanan pokok, simpanan wajib, dan/atau simpanan sukarela yang dinilai dalam rupiah;",
                          "4. Sisa Hasil Usaha (SHU) adalah hasil yang diperoleh masing-masing anggota setelah satu tahun buku setelah seluruh pendapatan dikurangi biaya, penyusutan, dan kewajiban lainnya, termasuk pajak;",
                          "5. Diskon adalah pengurangan harga, potongan nominal, atau persentase yang diberikan;",
                          `6. ${wrapStrong(plantMetadata.label)} adalah nama pohon dari keluarga ${wrapStrong(plantMetadata.family)} yang juga dikenal sebagai ${wrapStrong(plantMetadata.alias)}, dengan nama ilmiah ${wrapStrong(plantMetadata.scientificName)}. Pohon ini sangat serbaguna dan hampir seluruh bagiannya dapat dimanfaatkan, termasuk ${wrapStrong(plantMetadata.usesText)};`,
                          `7. Paket Penanaman adalah unit usaha penanaman 10 (sepuluh) pohon (${wrapStrong(plantTypesText)}) yang dikelola oleh koperasi;`,
                          "8. Masa Panen adalah periode waktu di mana hasil dipanen dan dikumpulkan dari lahan;",
                          "9. Laporan Usaha adalah laporan tertulis dan/atau elektronik yang disampaikan Koperasi kepada Anggota Koperasi secara periodik;",
                          "10. Masa Perawatan adalah periode sejak bibit ditanam hingga pohon siap dipanen;",
                          "11. Force Majeure adalah keadaan di luar kemampuan yang menyebabkan tidak dapat melaksanakan kewajibannya;",
                        ],
                      },
                      {
                        title: "POIN II (RUANG LINGKUP)",
                        content: [
                          `1. Dalam persetujuan pengelolaan simpanan anggota ini menyatakan agar Koperasi Bintang Merah sebagai Pengelola simpanan wajib anggota sebesar ${wrapStrong(totalAmountText)} (${wrapStrong(totalAmountWords.toLowerCase())}) untuk 1 (satu) paket penanaman (${wrapStrong(plantTypesText)}) dan Koperasi dengan ini telah menerima penyerahan simpanan tersebut dari Anggota Koperasi serta menyanggupi untuk melaksanakan pengelolaan simpanan anggota;`,
                          `2. Koperasi melaksanakan pengelolaan simpanan anggota pada Usaha Peningkatan Modal di project (${wrapStrong(plantTypesText)}) yang berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan setelah ditandatanganinya persetujuan ini;`,
                          "3. Koperasi dengan ini akan membagikan Sisa Hasil Usaha (SHU) kepada Anggota Koperasi di mulai dari setelah masa panen pertama atau setelah tanaman dapat menghasilkan;",
                        ],
                      },
                      {
                        title: "POIN III (TATA CARA SIMPANAN ANGGOTA)",
                        content: [
                          "Mengenai tata cara Simpanan Anggota dengan cara sebagai berikut:",
                          paymentClause,
                        ],
                      },
                      {
                        title: "POIN IV (JANGKA WAKTU)",
                        content: [
                          "Persetujuan ini dilakukan dan diterima untuk jangka waktu 12 (dua belas) tahun, terhitung sejak tanggal di tanda tanganinya persetujuan ini;",
                        ],
                      },
                      {
                        title: "POIN V (SISA HASIL USAHA (SHU))",
                        content: [
                          "Dalam Persetujuan ini, didalam hal pembagian hasil penyertaan simpanan anggota sebagai berikut:",
                          `1. Persetujuan ini dilakukan dengan cara pemberian Sisa Hasil Usaha (SHU) yang diperoleh dalam Usaha Peningkatan Modal Usaha di project (${wrapStrong(plantTypesText)}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
                          "2. Sisa Hasil Usaha (SHU) yang akan di bagikan kepada Anggota Koperasi adalah:",
                          "2.1. Sebesar 100% (seratus persen) dari hasil yang di dapatkan koperasi;",
                          "2.2. Perhitungan Sisa Hasil Usaha (SHU) koperasi didasarkan pada pendapatan dikurangi biaya operasional dan kewajiban selama satu tahun buku;",
                          "3. Pembagian Sisa Hasil Usaha (SHU) dilakukan paling lambat 7 (tujuh) hari Kerja setelah masa panen dan penjualan telah selesai dilaksanakan.",
                          "4. Pembayaran Sisa Hasil Usaha (SHU) dilakukan melalui transfer ke rekening ANGGOTA KOPERASI.",
                        ],
                      },
                      {
                        title: "POIN VI (PENGALIHAN)",
                        content: [
                          "1. Anggota Koperasi dilarang menyerahkan sebagian atau keseluruhan hak atau kewajibannya dalam persetujuan ini kepada Pihak Ketiga atau Pihak Lain tanpa terlebih dahulu mendapatkan persetujuan tertulis dari Koperasi.",
                          "2. Apabila Anggota Koperasi meninggal dunia, maka ahli waris dapat melanjutkan dengan terlebih dahulu mendapatkan persetujuan tertulis dari Koperasi dan dibuktikan dengan surat pernyataan waris yang berlaku;",
                        ],
                      },
                      {
                        title: "POIN VII (PENGAKHIRAN DAN PENGHENTIAN)",
                        content: [
                          "Bahwa Persetujuan ini dapat berakhir apabila terjadi hal-hal sebagai berikut:",
                          "1. Anggota Koperasi tidak lagi menjadi anggota Koperasi Bintang Merah Sejahtera;",
                          "2. Berakhirnya masa sesuai yang tertuang dalam Persetujuan ini.",
                          "",
                          "Apabila Anggota Koperasi berhenti sebelum jangka waktu yang ada tanpa persetujuan tertulis dari Koperasi, maka:",
                          "1. Simpanan anggota yang telah disetorkan tidak dapat dikembalikan secara penuh.",
                          "2. Pengembalian simpanan anggota hanya akan dilakukan setelah dikurangi dengan biaya administrasi, biaya operasional yang telah dikeluarkan, serta potongan lain.",
                          "3. Apabila Anggota Koperasi menunjuk atau menghadirkan pengganti yang disetujui oleh Koperasi untuk melanjutkan kerjasama, maka yang dikembalikan kepada Anggota Koperasi hanya sebesar selisih nilai setelah memperhitungkan kewajiban dan/atau biaya-biaya yang timbul.",
                          "4. Koperasi berhak menunjuk atau menghadirkan pengganti;",
                          "5. Koperasi berhak menahan Sebagian dan/atau keseluruhan simpanan anggota sebagai bentuk kompensasi atas kerugian, biaya, maupun potensi kehilangan manfaat akibat penghentian tersebut.",
                        ],
                      },
                      {
                        title: "POIN XI (KEADAAN MEMAKSA (FORCE MAJEURE))",
                        content: [
                          "1. Yang termasuk dalam Force Majeure adalah akibat dari kejadian-kejadian diluar kuasa dan kehendak dari Koperasi diantaranya termasuk tidak terbatas bencana alam, banjir, badai, topan, gempa bumi, kebakaran, perang, huru-hara, pemberontakan, demonstrasi, pemogokan, kegagalan koperasi.",
                          "2. Apabila terjadi Force Majeure wajib memberitahukan secara tertulis kepada anggota selambat-lambatnya 7 (tujuh) hari sejak terjadinya keadaan tersebut dengan bukti pendukung yang sah.",
                          "3. Apabila Force Majeure berlangsung tidak lebih dari 30 (tiga puluh) hari, kewajiban koperasi ditunda hingga keadaan berakhir.",
                          "4. Apabila Force Majeure berlangsung lebih dari 90 (Sembilan puluh) hari sehingga pelaksanaan tidak mungkin dilanjutkan, maka untuk membicarakan kembali atau mengakhiri tanpa tuntutan ganti rugi.",
                        ],
                      },
                      {
                        title: "POIN XIV (PENUTUP)",
                        content: [
                          "Segala ketentuan yang ada dalam persetujuan ini tunduk pada ketentuan terkait Koperasi dan peraturan perundang-undangan yang berlaku.",
                          "Demikianlah surat Persetujuan Pengelolaan Simpanan Anggota ini dibuat, yang ditandatangani dan bermaterai cukup dan berlaku sejak ditandatangani.",
                        ],
                      },
                    ];

                    return articles.map((article, index) => (
                      <div key={index} className="mb-6">
                        <h3 className="font-bold text-[#324D3E] mb-3 whitespace-pre-line text-left">
                          {article.title}
                        </h3>
                        <div className="space-y-2">
                          {article.content.map((paragraph, pIndex) => (
                            <p
                              key={pIndex}
                              className={
                                paragraph === ""
                                  ? "h-2"
                                  : "text-xs leading-relaxed"
                              }
                              dangerouslySetInnerHTML={{ __html: paragraph }}
                            />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Closing */}
                <div className="mt-8 pt-6 border-t border-gray-300">
                  <p className="text-right text-sm">
                    Jakarta,{" "}
                    {new Date(contractData.contractDate).toLocaleDateString(
                      "id-ID",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>

                  <div className="mt-8 flex justify-center">
                    <div className="text-center">
                      <p className="font-medium">Anggota Koperasi</p>
                      <div className="h-16 mb-2 bg-yellow-50 border-2 border-dashed border-yellow-300 rounded flex items-center justify-center px-8">
                        <span className="text-xs text-yellow-600">
                          Area Tanda Tangan
                        </span>
                      </div>
                      <p className="text-sm">{contractData.investor.name}</p>
                    </div>
                  </div>
                </div>
              </div>
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
                Silakan tanda tangan pada area di bawah ini untuk menyetujui
                kontrak. Anda dapat menggambar tanda tangan atau upload gambar
                tanda tangan.
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
