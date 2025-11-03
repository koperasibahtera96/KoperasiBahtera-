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
  
  processedText = processedText.replace(forceMajeureRegex, '{{ITALIC:Force Majeure}}');
  processedText = processedText.replace(modalKerjasamaRegex, '{{BOLD:MODAL KERJASAMA}}');
  processedText = processedText.replace(halimRegex, '{{BOLD:Halim Perdana Kusuma, S.H., M.H.}}');
  processedText = processedText.replace(pihakPertamaLabelRegex, '{{BOLD:Pihak Pertama}}');
  processedText = processedText.replace(pihakKeduaLabelRegex, '{{BOLD:Pihak Kedua}}');
  processedText = processedText.replace(priceRegex, '{{BOLD:$1}}');
  processedText = processedText.replace(plantRegex, '{{BOLD:$1}}');
  
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

      // Header text positioned below logo
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "bold");
      pdf.text("SURAT PERJANJIAN KERJASAMA", 105, headerYPosition, {
        align: "center",
      });
      pdf.text("(KONTRAK)", 105, headerYPosition + 8, {
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

      const pihakPertamaText =
        "Bertindak untuk dan atas nama diri sendiri. selanjutnya disebut sebagai Pihak Pertama.";
      const pihakPertamaLines = pdf.splitTextToSize(
        pihakPertamaText,
        rightMargin - leftMargin - 10
      );
      pdf.text(pihakPertamaLines, leftMargin + 10, yPosition);
      yPosition += lineHeight * pihakPertamaLines.length + 8;

    // Pihak Kedua - numbered section 2
    pdf.setFont("helvetica", "bold");
    pdf.text("2.", leftMargin, yPosition);
    pdf.setFont("helvetica", "normal");
    pdf.text("Nama", leftMargin + 10, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.setFont("helvetica", "bold");
      pdf.text("Halim Perdana Kusuma, S.H., M.H.", colonPosition + 5, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(
        "Halim Perdana Kusuma, S.H., M.H.",
        colonPosition + 5,
        yPosition
      );
      yPosition += lineHeight;

      pdf.text("Tempat/Tgl Lahir", leftMargin + 10, yPosition);
      pdf.text(":", colonPosition, yPosition);
      pdf.text("Sukaraja, 11 September 1986", colonPosition + 5, yPosition);
      yPosition += lineHeight;

      pdf.text("Alamat", leftMargin + 10, yPosition);
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
        rightMargin - leftMargin - 10
      );
      pdf.text(pihakKeduaLines, leftMargin + 10, yPosition);
      yPosition += lineHeight * pihakKeduaLines.length + 6;

      // Contract preamble with exact formatting
      const totalAmountText = `Rp${contractData.investment.totalAmount.toLocaleString(
        "id-ID"
      )},-`;
      const totalAmountWords = convertNumberToWords(
        contractData.investment.totalAmount
      );

      // Extract plant type from productName (e.g., "Paket 10 Pohon Alpukat - 10 Pohon" -> "ALPUKAT")
      let plantTypesText = "GAHARU, ALPUKAT, JENGKOL, AREN, KELAPA"; // Default fallback
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
      `1. Bahwa Pihak Pertama adalah selaku yang memiliki modal sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk selanjutnya disebut sebagai MODAL KERJASAMA untuk project (${plantTypesText});`,
        `2. Bahwa Pihak Kedua adalah Pengelola Dana Kerjasama untuk project (${plantTypesText}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
        `3. Bahwa Pihak Pertama dan Pihak Kedua setuju untuk saling mengikatkan diri dalam suatu perjanjian Kerjasama di project (${plantTypesText}) sesuai dengan ketentuan hukum yang berlaku.`,
        `4. Bahwa berdasarkan hal-hal tersebut di atas, kedua belah pihak menyatakan sepakat dan setuju untuk mengadakan Perjanjian Kerjasama ini yang dilaksanakan dengan ketentuan dan syarat-syarat sebagai berikut:`,
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

      yPosition += 4;

      // Complete Legal Articles
      const articles = [
        {
          title: "PASAL I\nDEFINISI",
          content: [
            "Dalam perjanjian ini, istilah-istilah berikut mempunyai arti sebagai berikut:",
            "",
            `1. Paket Penanaman adalah unit usaha yang terdiri dari 10 (sepuluh) pohon (${plantTypesText}) yang ditanam, dirawat, dan dipanen oleh Pihak Pertama.`,
            `2. Dana Investasi adalah sejumlah uang yang diserahkan Pihak Kedua kepada Pihak Pertama untuk mendanai pembelian bibit, penanaman, perawatan, serta biaya operasional hingga pemanenan pohon.`,
            `3. Keuntungan adalah hasil bersih dari penjualan panen setelah dikurangi biaya operasional yang sah.`,
            `4. Kerugian adalah nilai minus yang timbul akibat berkurangnya hasil panen atau biaya operasional yang lebih besar daripada pendapatan.`,
            `5. Laporan Usaha adalah laporan tertulis dan/atau elektronik yang disampaikan Pihak Pertama kepada Pihak Kedua secara periodik.`,
            `6. Masa Perawatan adalah periode sejak bibit ditanam hingga pohon siap dipanen.`,
            `7. Force Majeure adalah keadaan di luar kemampuan Para Pihak yang menyebabkan salah satu pihak tidak dapat melaksanakan kewajibannya.`,
            `8. Para Pihak adalah Pihak Pertama dan Pihak Kedua yang menandatangani perjanjian ini.`,
          ],
        },
        {
          title: "PASAL II\nMAKSUD DAN TUJUAN",
          content: [
            `Pihak Pertama dalam perjanjian ini memberi dana kerjasama kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman dan Pihak Kedua dengan ini telah menerima penyerahan DANA KERJASAMA tersebut dari Pihak Pertama serta menyanggupi untuk melaksanakan pengelolaan DANA KERJASAMA tersebut.`,
          ],
        },
        {
          title: "PASAL III\nRUANG LINGKUP",
          content: [
            `1. Dalam pelaksanaan perjanjian ini, Pihak Pertama memberi dana kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman dan Pihak Kedua dengan ini telah menerima penyerahan dana tersebut dari Pihak Pertama serta menyanggupi untuk melaksanakan pengelolaan dana.`,
            `2. Pihak Kedua dengan ini berjanji dan mengikatkan diri untuk melaksanakan perputaran dana pada Usaha Peningkatan Modal di project (${plantTypesText}) yang berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan setelah ditandatanganinya perjanjian ini.`,
            `3. Pihak Kedua dengan ini berjanji dan mengikatkan diri untuk memberikan keuntungan kepada Pihak Pertama di mulai dari setelah masa panen pertama;`,
          ],
        },
        {
          title: "PASAL IV\nTATA CARA PEMBAYARAN",
          content: [
            "Bahwa Para Pihak sepakat mengenai tata cara pembayaran terhadap Kerjasama dengan cara:",
            "",
            `1. Pihak Pertama membayar sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) ${contractData.investment.paymentType === 'full' ? 'sekali bayar' : 'dengan cara dicicil'};`,
          ],
        },
        {
          title: "PASAL V\nJANGKA WAKTU KERJASAMA",
          content: [
            "Perjanjian kerjasama ini dilakukan dan diterima untuk jangka waktu 20 (dua puluh) tahun, terhitung sejak tanggal di tanda tanganinya perjanjian ini;",
          ],
        },
        {
          title: "PASAL VI\nHAK DAN KEWAJIBAN PIHAK PERTAMA",
          content: [
            "Dalam Perjanjian Kerjasama ini, Pihak Pertama memiliki Hak dan Kewajiban sebagai berikut:",
            `1. Memberikan dana kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman;`,
            `2. Menerima hasil keuntungan atas pengelolaan dana;`,
            `3. Menerima laporan perkembangan usaha secara berkala;`,
            `4. Melakukan pengawasan terhadap usaha dengan pemberitahuan terlebih dahulu;`,
            `5. Tidak melakukan intervensi teknis dalam pengelolaan usaha;`,
            `6. Menjaga kerahasiaan informasi terkait operasional usaha.`,
          ],
        },
        {
          title: "PASAL VII\nHAK DAN KEWAJIBAN PIHAK KEDUA",
          content: [
            "Dalam Perjanjian Kerjasama ini, Pihak Kedua memiliki Hak dan Kewajiban sebagai berikut :",
            `1. Menerima dana dari Pihak Pertama sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman;`,
            `2. Memberikan bagian hasil keuntungan kepada Pihak Pertama;`,
            `3. Memperoleh bagian keuntungan dari pengelolaan usaha;`,
            `4. Menentukan metode teknis penanaman, perawatan, dan pemanenan pohon;`,
            `5. Menyediakan bibit pohon sesuai jumlah paket yang dibeli Pihak Pertama;`,
            `6. Melaksanakan penanaman, perawatan, hingga pemanenan pohon sesuai standar;`,
            `7. Memberikan laporan perkembangan usaha;`,
            `8. Membagi keuntungan kepada Pihak Pertama sesuai dengan jadwal yang ditentukan;`,
            `9. Menjaga transparansi penggunaan dana dan membuka akses audit.`,
          ],
        },
        {
          title: "PASAL VIII\nPEMBAGIAN HASIL",
          content: [
            "Dalam Perjanjian Kerjasama ini, kedua belah pihak sepakat didalam hal pembagian hasil penyertaan dana sebagai berikut:",
            `1. Kedua belah pihak sepakat dan setuju bahwa perjanjian kerjasama ini dilakukan dengan cara pemberian keuntungan yang diperoleh dalam Usaha Peningkatan Modal Usaha di project (${plantTypesText}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
            `2. Keuntungan yang akan di Terima Pihak Pertama dibagi dengan skema: 30% (tiga puluh persen) untuk Pihak Pertama dan 70% (tujuh puluh persen) untuk Pihak Kedua;`,
            `3. Pembagian keuntungan dilakukan paling lambat 7 (tujuh) hari Kerja setelah masa panen dan penjualan telah selesai dilaksanakan.`,
            `4. Pembayaran keuntungan dilakukan melalui transfer ke rekening Pihak Pertama.`,
          ],
        },
        {
          title: "PASAL IX\nPENGALIHAN",
          content: [
            `1. Pihak Pertama dilarang menyerahkan sebagian atau keseluruhan hak atau kewajibannya dalam perjanjian ini kepada Pihak Ketiga atau Pihak Lain tanpa terlebih dahulu mendapatkan persetujuan tertulis dari Pihak Kedua.`,
            `2. Apabila Pihak Pertama meninggal dunia ahli waris dapat melanjutkan perjanjian ini dengan terlebih dahulu mendapatkan persetujuan tertulis dari Pihak Kedua;`,
          ],
        },
        {
          title: "PASAL X\nPENGAKHIRAN dan PENGHENTIAN PERJANJIAN",
          content: [
            "Para Pihak setuju bahwa perjanjian ini dapat diakhiri apabila terjadi hal-hal sebagai berikut:",
            `1. Berakhirnya masa kontrak kerjasama para pihak sesuai perjanjian yang tertuang dalam Perjanjian Kerjasama ini.`,
            `2. Kesepakatan bersama yang dilakukan sewaktu-waktu oleh Para Pihak baik secara tertulis untuk mengakhiri perjanjian ini.`,
            "",
            "Apabila Pihak Pertama menghentikan kerja sama sebelum jangka waktu yang telah disepakati tanpa persetujuan tertulis dari Pihak Kedua, maka:",
            `1. Dana yang telah disetorkan tidak dapat dikembalikan secara penuh.`,
            `2. Pengembalian dana hanya akan dilakukan setelah dikurangi dengan biaya administrasi, biaya operasional yang telah dikeluarkan, serta potongan lain.`,
            `3. Apabila Pihak Pertama menunjuk atau menghadirkan pihak pengganti yang disetujui oleh Pihak Kedua untuk melanjutkan kerja sama, maka dana yang dikembalikan kepada Pihak Pertama hanya sebesar selisih nilai setelah memperhitungkan kewajiban dan/atau biaya-biaya yang timbul.`,
            `4. Pihak kedua berhak menunjuk atau menghadirkan Pihak pengganti untuk melanjutkan kerja sama.`,
            `5. Pihak Kedua berhak menahan Sebagian dan/atau keseluruhan dana sebagai bentuk kompensasi atas kerugian, biaya, maupun potensi kehilangan manfaat akibat penghentian sepihak tersebut.`,
          ],
        },
        {
          title: "PASAL XI\nKEADAAN MEMAKSA (FORCE MAJEURE)",
          content: [
            `1. Yang termasuk dalam Force Majeure adalah akibat dari kejadian-kejadian diluar kuasa dan kehendak dari kedua belah pihak diantaranya termasuk tidak terbatas bencana alam, banjir, badai, topan, gempa bumi, kebakaran, perang, huru-hara, pemberontakan, demonstrasi, pemogokan, kegagalan koperasi.`,
            `2. Pihak yang mengalami Force Majeure wajib memberitahukan secara tertulis kepada pihak lainnya selambat-lambatnya 7 (tujuh) hari sejak terjadinya keadaan tersebut dengan bukti pendukung yang sah.`,
            `3. Apabila Force Majeure berlangsung tidak lebih dari 30 (tiga puluh) hari, kewajiban para pihak ditunda hingga keadaan berakhir.`,
            `4. Apabila Force Majeure berlangsung lebih dari 90 (Sembilan puluh) hari sehingga pelaksanaan perjanjian tidak mungkin dilanjutkan, maka para pihak sepakat untuk membicarakan kembali atau mengakhiri perjanjian tanpa tuntutan ganti rugi.`,
          ],
        },
        {
          title: "PASAL XII\nWANPRESTASI",
          content: [
            `1. Dalam hal salah satu pihak telah melanggar kewajibannya yang tercantum dalam salah satu Pasal perjanjian ini, telah cukup bukti dan tanpa perlu dibuktikan lebih lanjut, bahwa pihak yang melanggar tersebut telah melakukan tindakan Wanprestasi.`,
            `2. Pihak yang merasa dirugikan atas tindakan Wanprestasi tersebut dalam ayat 1 diatas, berhak meminta ganti kerugian dari pihak yang melakukan wanprestasi tersebut atas sejumlah kerugian yang dideritanya, kecuali dalam hal kerugian tersebut disebabkan karena adanya suatu keadaan memaksa, seperti tercantum dalam Pasal VIII.`,
          ],
        },
        {
          title: "PASAL XIII\nPERSELISIHAN",
          content: [
            "Bilamana dalam pelaksanaan perjanjian Kerjasama ini terdapat perselisihan antara kedua belah pihak baik dalam pelaksanaannya ataupun dalam penafsiran salah satu Pasal dalam perjanjian ini, maka kedua belah pihak sepakat untuk sedapat mungkin menyelesaikan perselisihan tersebut dengan cara musyawarah. Apabila musyawarah telah dilakukan oleh kedua belah pihak, namun ternyata tidak berhasil mencapai suatu kemufakatan maka Para Pihak sepakat bahwa semua sengketa yang timbul dari perjanjian ini akan diselesaikan pada Kantor Kepaniteraan Pengadilan Negeri Jakarta Selatan.",
          ],
        },
        {
          title: "PASAL XIV\nATURAN PENUTUP",
          content: [
            "Hal-hal yang belum diatur atau belum cukup diatur dalam perjanjian ini apabila dikemudian hari dibutuhkan dan dipandang perlu akan ditetapkan tersendiri secara musyawarah dan selanjutnya akan ditetapkan dalam suatu ADDENDUM yang berlaku mengikat bagi kedua belah pihak, yang akan direkatkan dan merupakan bagian yang tidak terpisahkan dari Perjanjian ini.",
            "",
            "Demikianlah surat perjanjian kerjasama ini dibuat, untuk masing-masing pihak, yang ditandatangani dan bermaterai cukup, yang masing-masing mempunyai kekuatan hukum yang sama dan berlaku sejak ditandatangani.",
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

        // Article title - centered
        pdf.setFontSize(10); // Ensure consistent font size
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        const titleLines = article.title.split("\n");
        titleLines.forEach((titleLine) => {
          pdf.text(titleLine, 105, yPosition, { align: "center" });
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
        addPageNumber(); // Add page number to current page before adding new page
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10); // Ensure consistent font size
      pdf.setFont("helvetica", "normal");
      pdf.text(`Jakarta, ${closingDateStr}`, leftMargin, yPosition);
      yPosition += lineHeight * 2;

      // Signature Section (updated format)
      if (yPosition > 180) {
        addPageNumber(); // Add page number to current page before adding new page
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10); // Ensure consistent font size
      pdf.setFont("helvetica", "normal");

      // Main signature headers - align them properly
      const pihakPertamaX = leftMargin + 30;
      const pihakKeduaX = leftMargin + 120;

      pdf.text("Pihak Pertama", pihakPertamaX, yPosition);
      pdf.text("Pihak Kedua", pihakKeduaX, yPosition);

      yPosition += lineHeight * 2; // Space after headers

      // Define the signature area dimensions and position
      const signatureAreaWidth = 80;
      const signatureAreaHeight = 25;
      const signatureAreaX = pihakKeduaX - 25; // Move more to the left
      const signatureStartY = yPosition;

      // Names position (will be placed after signature area)
      const nameYPosition =
        signatureStartY + signatureAreaHeight + lineHeight * 1;

      // Right side - Investor signature (centered in the allocated space)
      if (signatureDataURL) {
        try {
          if (!signatureDataURL.startsWith("data:image/png;base64,")) {
            throw new Error(
              "signatureDataURL is not a valid PNG base64 string"
            );
          }

          // Center the signature both horizontally and vertically in the allocated space
          // The signature should maintain its canvas positioning but be centered in the area
          const signatureCenterX =
            signatureAreaX + signatureAreaWidth / 2 - 60 / 2; // 60 is signature width
          const signatureCenterY =
            signatureStartY + signatureAreaHeight / 2 - 15 / 2; // 15 is signature height

          pdf.addImage(
            signatureDataURL,
            "PNG",
            signatureCenterX,
            signatureCenterY,
            60, // Reasonable signature width
            15 // Reasonable signature height
          );
        } catch (err: any) {
          showError(
            "Failed to add signature image to PDF",
            err?.message || String(err)
          );
        }
      } else {
        // Show placeholder line if no signature
        const placeholderX = signatureAreaX + signatureAreaWidth / 2 - 40;
        const placeholderY = signatureStartY + signatureAreaHeight / 2;
        pdf.text("_________________", placeholderX, placeholderY);
      }

      // Names under signatures - left aligned for Halim, aligned for investor with "Pihak Kedua"
      const halimX = leftMargin + 5;
      pdf.setFont("helvetica", "bold");
      pdf.text("Halim Perdana Kusuma, S.H., M.H.", halimX, nameYPosition);
      pdf.setFont("helvetica", "normal");

      // Align investor name to start at the same position as "Pihak Kedua" text
      pdf.text(`${contractData.investor.name}`, pihakKeduaX, nameYPosition);

      yPosition = nameYPosition;

      yPosition += lineHeight;

      // Align "Ketua Koperasi" with the Halim text (same left position)
      pdf.text("Ketua Koperasi", halimX, yPosition);

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
            Surat Perjanjian Hak Kepemilikan Pohon
          </h1>
          <p className="text-[#889063]">Koperasi Bintang Merah Sejahtera</p>
        </div>

        {/* Full Contract Preview */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#324D3E]/10 mb-8">
          <div className="p-8">
            {/* Contract Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-[#324D3E] mb-2">
                SURAT PERJANJIAN KERJASAMA
              </h1>
              <h2 className="text-xl font-bold text-[#324D3E] mb-2">
                (KONTRAK)
              </h2>
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

                <p className="mb-4">
                  Bertindak untuk dan atas nama diri sendiri. selanjutnya
                  disebut sebagai <strong>Pihak Pertama</strong>.
                </p>

                {/* Pihak Kedua - Koperasi */}
                <div className="mb-6 space-y-1">
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Nama</span>
                    <span>: Halim Perdana Kusuma, S.H., M.H.</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Tempat/Tgl Lahir</span>
                    <span>: Sukaraja, 11 September 1986</span>
                  </div>
                  <div className="grid grid-cols-[120px_1fr]">
                    <span className="font-medium">Alamat</span>
                    <span>
                      : Komplek Taman Mutiara Indah blok J3 No.17 RT004 RW017
                      Kaligandu, Kota Serang, Banten
                    </span>
                  </div>
                </div>

                <p className="mb-6">
                  Bertindak untuk dan atas nama{" "}
                  <strong>KOPERASI BINTANG MERAH SEJAHTERA</strong>, selanjutnya
                  disebut sebagai <strong>Pihak Kedua</strong>.
                </p>

                {/* Preamble */}
                <div className="space-y-4">
                  <p>
                    Bahwa sebelum ditandatanganinya Surat Perjanjian ini, Para
                    pihak terlebih dahulu menerangkan hal–hal sebagai berikut:
                  </p>

                  {(() => {
                    const totalAmountText = `Rp${contractData.investment.totalAmount.toLocaleString(
                      "id-ID"
                    )},-`;
                    const totalAmountWords = convertNumberToWords(
                      contractData.investment.totalAmount
                    );
                    let plantTypesText =
                      "GAHARU, ALPUKAT, JENGKOL, AREN, KELAPA";
                    if (contractData.investment.productName) {
                      const productName =
                        contractData.investment.productName.toLowerCase();
                      if (productName.includes("alpukat"))
                        plantTypesText = "ALPUKAT";
                      else if (productName.includes("gaharu"))
                        plantTypesText = "GAHARU";
                      else if (productName.includes("jengkol"))
                        plantTypesText = "JENGKOL";
                      else if (productName.includes("aren"))
                        plantTypesText = "AREN";
                      else if (productName.includes("kelapa"))
                        plantTypesText = "KELAPA";
                    }

                    return (
                      <div className="space-y-3">
                        <p>
                          1. Bahwa Pihak Pertama adalah selaku yang memiliki
                          modal sebesar {totalAmountText} ({totalAmountWords.toLowerCase()})
                          untuk selanjutnya disebut sebagai MODAL KERJASAMA
                          untuk project ({plantTypesText});
                        </p>
                        <p>
                          2. Bahwa Pihak Kedua adalah Pengelola Dana Kerjasama
                          untuk project ({plantTypesText}) berlokasi di Kabupten
                          Musi Rawas Utara Provinsi Sumatera Selatan;
                        </p>
                        <p>
                          3. Bahwa Pihak Pertama dan Pihak Kedua setuju untuk
                          saling mengikatkan diri dalam suatu perjanjian
                          Kerjasama di project ({plantTypesText}) sesuai dengan
                          ketentuan hukum yang berlaku.
                        </p>
                        <p>
                          4. Bahwa berdasarkan hal-hal tersebut di atas, kedua
                          belah pihak menyatakan sepakat dan setuju untuk
                          mengadakan Perjanjian Kerjasama ini yang dilaksanakan
                          dengan ketentuan dan syarat-syarat sebagai berikut:
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
                    let plantTypesText =
                      "GAHARU, ALPUKAT, JENGKOL, AREN, KELAPA";
                    if (contractData.investment.productName) {
                      const productName =
                        contractData.investment.productName.toLowerCase();
                      if (productName.includes("alpukat"))
                        plantTypesText = "ALPUKAT";
                      else if (productName.includes("gaharu"))
                        plantTypesText = "GAHARU";
                      else if (productName.includes("jengkol"))
                        plantTypesText = "JENGKOL";
                      else if (productName.includes("aren"))
                        plantTypesText = "AREN";
                      else if (productName.includes("kelapa"))
                        plantTypesText = "KELAPA";
                    }

                    const articles = [
                      {
                        title: "PASAL I\nDEFINISI",
                        content: [
                          "Dalam perjanjian ini, istilah-istilah berikut mempunyai arti sebagai berikut:",
                          "",
                          `1. Paket Penanaman adalah unit usaha yang terdiri dari 10 (sepuluh) pohon (${plantTypesText}) yang ditanam, dirawat, dan dipanen oleh Pihak Pertama.`,
                          `2. Dana Investasi adalah sejumlah uang yang diserahkan Pihak Kedua kepada Pihak Pertama untuk mendanai pembelian bibit, penanaman, perawatan, serta biaya operasional hingga pemanenan pohon.`,
                          `3. Keuntungan adalah hasil bersih dari penjualan panen setelah dikurangi biaya operasional yang sah.`,
                          `4. Kerugian adalah nilai minus yang timbul akibat berkurangnya hasil panen atau biaya operasional yang lebih besar daripada pendapatan.`,
                          `5. Laporan Usaha adalah laporan tertulis dan/atau elektronik yang disampaikan Pihak Pertama kepada Pihak Kedua secara periodik.`,
                          `6. Masa Perawatan adalah periode sejak bibit ditanam hingga pohon siap dipanen.`,
                          `7. Force Majeure adalah keadaan di luar kemampuan Para Pihak yang menyebabkan salah satu pihak tidak dapat melaksanakan kewajibannya.`,
                          `8. Para Pihak adalah Pihak Pertama dan Pihak Kedua yang menandatangani perjanjian ini.`,
                        ],
                      },
                      {
                        title: "PASAL II\nMAKSUD DAN TUJUAN",
                        content: [
                          `Pihak Pertama dalam perjanjian ini memberi dana kerjasama kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman dan Pihak Kedua dengan ini telah menerima penyerahan DANA KERJASAMA tersebut dari Pihak Pertama serta menyanggupi untuk melaksanakan pengelolaan DANA KERJASAMA tersebut.`,
                        ],
                      },
                      {
                        title: "PASAL III\nRUANG LINGKUP",
                        content: [
                          `1. Dalam pelaksanaan perjanjian ini, Pihak Pertama memberi dana kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman dan Pihak Kedua dengan ini telah menerima penyerahan dana tersebut dari Pihak Pertama serta menyanggupi untuk melaksanakan pengelolaan dana.`,
                          `2. Pihak Kedua dengan ini berjanji dan mengikatkan diri untuk melaksanakan perputaran dana pada Usaha Peningkatan Modal di project (${plantTypesText}) yang berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan setelah ditandatanganinya perjanjian ini.`,
                          `3. Pihak Kedua dengan ini berjanji dan mengikatkan diri untuk memberikan keuntungan kepada Pihak Pertama di mulai dari setelah masa panen pertama;`,
                        ],
                      },
                      {
                        title: "PASAL IV\nTATA CARA PEMBAYARAN",
                        content: [
                          "Bahwa Para Pihak sepakat mengenai tata cara pembayaran terhadap Kerjasama dengan cara:",
                          "",
                          `1. Pihak Pertama membayar sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) ${contractData.investment.paymentType === 'full' ? 'sekali bayar' : 'dengan cara dicicil'};`,
                        ],
                      },
                      {
                        title: "PASAL V\nJANGKA WAKTU KERJASAMA",
                        content: [
                          "Perjanjian kerjasama ini dilakukan dan diterima untuk jangka waktu 20 (dua puluh) tahun, terhitung sejak tanggal di tanda tanganinya perjanjian ini;",
                        ],
                      },
                      {
                        title: "PASAL VI\nHAK DAN KEWAJIBAN PIHAK PERTAMA",
                        content: [
                          "Dalam Perjanjian Kerjasama ini, Pihak Pertama memiliki Hak dan Kewajiban sebagai berikut:",
                          `1. Memberikan dana kepada Pihak Kedua sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman;`,
                          `2. Menerima hasil keuntungan atas pengelolaan dana;`,
                          `3. Menerima laporan perkembangan usaha secara berkala;`,
                          `4. Melakukan pengawasan terhadap usaha dengan pemberitahuan terlebih dahulu;`,
                          `5. Tidak melakukan intervensi teknis dalam pengelolaan usaha;`,
                          `6. Menjaga kerahasiaan informasi terkait operasional usaha.`,
                        ],
                      },
                      {
                        title: "PASAL VII\nHAK DAN KEWAJIBAN PIHAK KEDUA",
                        content: [
                          "Dalam Perjanjian Kerjasama ini, Pihak Kedua memiliki Hak dan Kewajiban sebagai berikut :",
                          `1. Menerima dana dari Pihak Pertama sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman;`,
                          `2. Memberikan bagian hasil keuntungan kepada Pihak Pertama;`,
                          `3. Memperoleh bagian keuntungan dari pengelolaan usaha;`,
                          `4. Menentukan metode teknis penanaman, perawatan, dan pemanenan pohon;`,
                          `5. Menyediakan bibit pohon sesuai jumlah paket yang dibeli Pihak Pertama;`,
                          `6. Melaksanakan penanaman, perawatan, hingga pemanenan pohon sesuai standar;`,
                          `7. Memberikan laporan perkembangan usaha;`,
                          `8. Membagi keuntungan kepada Pihak Pertama sesuai dengan jadwal yang ditentukan;`,
                          `9. Menjaga transparansi penggunaan dana dan membuka akses audit.`,
                        ],
                      },
                      {
                        title: "PASAL VIII\nPEMBAGIAN HASIL",
                        content: [
                          "Dalam Perjanjian Kerjasama ini, kedua belah pihak sepakat didalam hal pembagian hasil penyertaan dana sebagai berikut:",
                          `1. Kedua belah pihak sepakat dan setuju bahwa perjanjian kerjasama ini dilakukan dengan cara pemberian keuntungan yang diperoleh dalam Usaha Peningkatan Modal Usaha di project (${plantTypesText}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
                          `2. Keuntungan yang akan di Terima Pihak Pertama dibagi dengan skema: 30% (tiga puluh persen) untuk Pihak Pertama dan 70% (tujuh puluh persen) untuk Pihak Kedua;`,
                          `3. Pembagian keuntungan dilakukan paling lambat 7 (tujuh) hari Kerja setelah masa panen dan penjualan telah selesai dilaksanakan.`,
                          `4. Pembayaran keuntungan dilakukan melalui transfer ke rekening Pihak Pertama.`,
                        ],
                      },
                      {
                        title: "PASAL IX\nPENGALIHAN",
                        content: [
                          `1. Pihak Pertama dilarang menyerahkan sebagian atau keseluruhan hak atau kewajibannya dalam perjanjian ini kepada Pihak Ketiga atau Pihak Lain tanpa terlebih dahulu mendapatkan persetujuan tertulis dari Pihak Kedua.`,
                          `2. Apabila Pihak Pertama meninggal dunia ahli waris dapat melanjutkan perjanjian ini dengan terlebih dahulu mendapatkan persetujuan tertulis dari Pihak Kedua;`,
                        ],
                      },
                      {
                        title: "PASAL X\nPENGAKHIRAN dan PENGHENTIAN PERJANJIAN",
                        content: [
                          "Para Pihak setuju bahwa perjanjian ini dapat diakhiri apabila terjadi hal-hal sebagai berikut:",
                          `1. Berakhirnya masa kontrak kerjasama para pihak sesuai perjanjian yang tertuang dalam Perjanjian Kerjasama ini.`,
                          `2. Kesepakatan bersama yang dilakukan sewaktu-waktu oleh Para Pihak baik secara tertulis untuk mengakhiri perjanjian ini.`,
                          "",
                          "Apabila Pihak Pertama menghentikan kerja sama sebelum jangka waktu yang telah disepakati tanpa persetujuan tertulis dari Pihak Kedua, maka:",
                          `1. Dana yang telah disetorkan tidak dapat dikembalikan secara penuh.`,
                          `2. Pengembalian dana hanya akan dilakukan setelah dikurangi dengan biaya administrasi, biaya operasional yang telah dikeluarkan, serta potongan lain.`,
                          `3. Apabila Pihak Pertama menunjuk atau menghadirkan pihak pengganti yang disetujui oleh Pihak Kedua untuk melanjutkan kerja sama, maka dana yang dikembalikan kepada Pihak Pertama hanya sebesar selisih nilai setelah memperhitungkan kewajiban dan/atau biaya-biaya yang timbul.`,
                          `4. Pihak kedua berhak menunjuk atau menghadirkan Pihak pengganti untuk melanjutkan kerja sama.`,
                          `5. Pihak Kedua berhak menahan Sebagian dan/atau keseluruhan dana sebagai bentuk kompensasi atas kerugian, biaya, maupun potensi kehilangan manfaat akibat penghentian sepihak tersebut.`,
                        ],
                      },
                      {
                        title: "PASAL XI\nKEADAAN MEMAKSA (FORCE MAJEURE)",
                        content: [
                          `1. Yang termasuk dalam Force Majeure adalah akibat dari kejadian-kejadian diluar kuasa dan kehendak dari kedua belah pihak diantaranya termasuk tidak terbatas bencana alam, banjir, badai, topan, gempa bumi, kebakaran, perang, huru-hara, pemberontakan, demonstrasi, pemogokan, kegagalan koperasi.`,
                          `2. Pihak yang mengalami Force Majeure wajib memberitahukan secara tertulis kepada pihak lainnya selambat-lambatnya 7 (tujuh) hari sejak terjadinya keadaan tersebut dengan bukti pendukung yang sah.`,
                          `3. Apabila Force Majeure berlangsung tidak lebih dari 30 (tiga puluh) hari, kewajiban para pihak ditunda hingga keadaan berakhir.`,
                          `4. Apabila Force Majeure berlangsung lebih dari 90 (Sembilan puluh) hari sehingga pelaksanaan perjanjian tidak mungkin dilanjutkan, maka para pihak sepakat untuk membicarakan kembali atau mengakhiri perjanjian tanpa tuntutan ganti rugi.`,
                        ],
                      },
                      {
                        title: "PASAL XII\nWANPRESTASI",
                        content: [
                          `1. Dalam hal salah satu pihak telah melanggar kewajibannya yang tercantum dalam salah satu Pasal perjanjian ini, telah cukup bukti dan tanpa perlu dibuktikan lebih lanjut, bahwa pihak yang melanggar tersebut telah melakukan tindakan Wanprestasi.`,
                          `2. Pihak yang merasa dirugikan atas tindakan Wanprestasi tersebut dalam ayat 1 diatas, berhak meminta ganti kerugian dari pihak yang melakukan wanprestasi tersebut atas sejumlah kerugian yang dideritanya, kecuali dalam hal kerugian tersebut disebabkan karena adanya suatu keadaan memaksa, seperti tercantum dalam Pasal VIII.`,
                        ],
                      },
                      {
                        title: "PASAL XIII\nPERSELISIHAN",
                        content: [
                          "Bilamana dalam pelaksanaan perjanjian Kerjasama ini terdapat perselisihan antara kedua belah pihak baik dalam pelaksanaannya ataupun dalam penafsiran salah satu Pasal dalam perjanjian ini, maka kedua belah pihak sepakat untuk sedapat mungkin menyelesaikan perselisihan tersebut dengan cara musyawarah. Apabila musyawarah telah dilakukan oleh kedua belah pihak, namun ternyata tidak berhasil mencapai suatu kemufakatan maka Para Pihak sepakat bahwa semua sengketa yang timbul dari perjanjian ini akan diselesaikan pada Kantor Kepaniteraan Pengadilan Negeri Jakarta Selatan.",
                        ],
                      },
                      {
                        title: "PASAL XIV\nATURAN PENUTUP",
                        content: [
                          "Hal-hal yang belum diatur atau belum cukup diatur dalam perjanjian ini apabila dikemudian hari dibutuhkan dan dipandang perlu akan ditetapkan tersendiri secara musyawarah dan selanjutnya akan ditetapkan dalam suatu ADDENDUM yang berlaku mengikat bagi kedua belah pihak, yang akan direkatkan dan merupakan bagian yang tidak terpisahkan dari Perjanjian ini.",
                          "",
                          "Demikianlah surat perjanjian kerjasama ini dibuat, untuk masing-masing pihak, yang ditandatangani dan bermaterai cukup, yang masing-masing mempunyai kekuatan hukum yang sama dan berlaku sejak ditandatangani.",
                        ],
                      },
                    ];

                    return articles.map((article, index) => (
                      <div key={index} className="mb-6">
                        <h3 className="font-bold text-[#324D3E] mb-3 whitespace-pre-line">
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
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                {/* Closing */}
                <div className="mt-8 pt-6 border-t border-gray-300">
                  <p className="text-center text-sm">
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

                  <div className="mt-8 grid grid-cols-2 gap-8">
                    <div className="text-center">
                      <p className="font-medium">Pihak Pertama</p>
                      <div className="h-16 mb-2"></div>
                      <p className="text-sm">
                        Halim Perdana Kusuma, S.H., M.H.
                      </p>
                      <p className="text-xs text-gray-600">Ketua Koperasi</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Pihak Kedua</p>
                      <div className="h-16 mb-2 bg-yellow-50 border-2 border-dashed border-yellow-300 rounded flex items-center justify-center">
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
