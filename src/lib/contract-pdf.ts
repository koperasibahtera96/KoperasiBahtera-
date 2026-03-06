/**
 * Server-side Contract PDF Generator
 * Generates contract PDFs on the server using the same logic as client-side
 * This is used for e-materai stamping after payment
 */

import jsPDF from "jspdf";
import { readFileSync } from "fs";
import { join } from "path";

interface ContractData {
  contractNumber: string;
  contractDate: Date;
  investment: {
    productName: string;
    totalAmount: number;
  };
  investor: {
    name: string;
    memberNumber?: string;
    nik?: string;
    dateOfBirth?: Date;
    email: string;
    phoneNumber: string;
    occupation?: string;
    address?: string;
    village?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  signatureDataURL?: string; // Approved signature from database
  // Payment terms for PASAL IV
  paymentType: 'full' | 'cicilan';
  paymentTerm?: 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  totalInstallments?: number;
  durationYears?: number;
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
  // Check if text starts with a number pattern like "1. ", "2. ", etc.
  const numberMatch = text.match(/^(\d+\.\s)/);

  if (!numberMatch) {
    // Not a numbered item, render normally
    return renderTextWithFormatting(pdf, text, x, y, maxWidth, lineHeight);
  }

  const numberPart = numberMatch[1];
  const textPart = text.substring(numberPart.length);
  const numberWidth = pdf.getTextWidth(numberPart);
  const indentX = x + numberWidth;
  const textMaxWidth = maxWidth - numberWidth;

  // Render the number
  pdf.text(numberPart, x, y);

  // Render the text with hanging indent
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
  // Split text by formatting markers
  const parts: { text: string; bold?: boolean; italic?: boolean }[] = [];

  // Replace special terms with markers
  let processedText = text;
  const forceMajeureRegex = /Force Majeure/g;
  const modalKerjasamaRegex = /MODAL KERJASAMA/g;
  const halimRegex = /Halim Perdana Kusuma, S\.H\., M\.H\./g;
  // Only match "Pihak Pertama" and "Pihak Kedua" when preceded by "disebut sebagai"
  const pihakPertamaLabelRegex = /(?<=disebut sebagai )(Pihak Pertama)/g;
  const pihakKeduaLabelRegex = /(?<=disebut sebagai )(Pihak Kedua)/g;
  const priceRegex = /(Rp[\d\.,]+-)/g;
  const plantRegex = /\b(GAHARU|ALPUKAT|JENGKOL|AREN|KELAPA)\b/g;

  // Mark Force Majeure for italic
  processedText = processedText.replace(forceMajeureRegex, '{{ITALIC:Force Majeure}}');
  // Mark bold items
  processedText = processedText.replace(modalKerjasamaRegex, '{{BOLD:MODAL KERJASAMA}}');
  processedText = processedText.replace(halimRegex, '{{BOLD:Halim Perdana Kusuma, S.H., M.H.}}');
  processedText = processedText.replace(pihakPertamaLabelRegex, '{{BOLD:Pihak Pertama}}');
  processedText = processedText.replace(pihakKeduaLabelRegex, '{{BOLD:Pihak Kedua}}');
  processedText = processedText.replace(priceRegex, '{{BOLD:$1}}');
  processedText = processedText.replace(plantRegex, '{{BOLD:$1}}');

  // Parse the markers
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

  // If no formatting, just render normally
  if (parts.length === 0 || (parts.length === 1 && !parts[0].bold && !parts[0].italic)) {
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return lineHeight * lines.length;
  }

  // Render with mixed formatting
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

// Number to words converter for Indonesian
function convertNumberToWords(num: number): string {
  const units = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
  ];
  const teens = [
    "Sepuluh",
    "Sebelas",
    "Dua Belas",
    "Tiga Belas",
    "Empat Belas",
    "Lima Belas",
    "Enam Belas",
    "Tujuh Belas",
    "Delapan Belas",
    "Sembilan Belas",
  ];
  const tens = [
    "",
    "",
    "Dua Puluh",
    "Tiga Puluh",
    "Empat Puluh",
    "Lima Puluh",
    "Enam Puluh",
    "Tujuh Puluh",
    "Delapan Puluh",
    "Sembilan Puluh",
  ];

  if (num === 0) return "Nol Rupiah";

  function convertLessThanThousand(n: number): string {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      return tens[ten] + (unit > 0 ? " " + units[unit] : "");
    }
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const hundredWord = hundred === 1 ? "Seratus" : units[hundred] + " Ratus";
    return hundredWord + (rest > 0 ? " " + convertLessThanThousand(rest) : "");
  }

  function convert(n: number): string {
    if (n < 1000) return convertLessThanThousand(n);

    const billion = Math.floor(n / 1000000000);
    const million = Math.floor((n % 1000000000) / 1000000);
    const thousand = Math.floor((n % 1000000) / 1000);
    const remainder = n % 1000;

    let result = "";

    if (billion > 0) {
      result +=
        (billion === 1 ? "Satu" : convertLessThanThousand(billion)) + " Miliar";
    }

    if (million > 0) {
      if (result) result += " ";
      result +=
        (million === 1 ? "Satu" : convertLessThanThousand(million)) + " Juta";
    }

    if (thousand > 0) {
      if (result) result += " ";
      result +=
        thousand === 1 ? "Seribu" : convertLessThanThousand(thousand) + " Ribu";
    }

    if (remainder > 0) {
      if (result) result += " ";
      result += convertLessThanThousand(remainder);
    }

    return result;
  }

  return convert(num) + " Rupiah";
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
  return convertNumberToWords(num).replace(/\s+Rupiah$/i, "").trim();
}

function getPaymentClauseText(params: {
  paymentType: "full" | "cicilan";
  paymentTerm?: "monthly" | "quarterly" | "semiannual" | "annual";
  totalAmountText: string;
  totalAmountWords: string;
  totalInstallments?: number;
  durationYears?: number;
}): string {
  const amountWords = params.totalAmountWords.toLowerCase();

  if (params.paymentType === "full") {
    return `1. Membayar sebesar ${params.totalAmountText} (${amountWords}) sekali bayar;`;
  }

  if (params.paymentTerm === "annual" && params.durationYears) {
    const yearsWords = convertNumberToUnitWords(params.durationYears).toLowerCase();
    return `1. Membayar sebesar ${params.totalAmountText} (${amountWords}) dengan cara dicicil selama ${params.durationYears} (${yearsWords}) tahun, dibayar setiap tahun di tanggal dan bulan yang sama pada saat melakukan pembayaran pertama;`;
  }

  if (params.totalInstallments) {
    const installmentsWords = convertNumberToUnitWords(
      params.totalInstallments
    ).toLowerCase();
    return `1. Membayar sebesar ${params.totalAmountText} (${amountWords}) dengan cara dicicil selama ${params.totalInstallments} (${installmentsWords}) bulan dibayar setiap bulan pada tanggal yang sama saat pembayaran pertama;`;
  }

  return `1. Membayar sebesar ${params.totalAmountText} (${amountWords}) dengan cara dicicil selama 60 (enam puluh) bulan dibayar setiap bulan pada tanggal yang sama saat pembayaran pertama;`;
}

type GeneratedContractPDF = {
  buffer: Buffer;
  totalPages: number;
};

/**
 * Generate contract PDF buffer with metadata (server-side)
 * Returns PDF buffer and total page count for downstream stamp placement.
 */
export async function generateContractPDFBufferWithMeta(
  contractData: ContractData
): Promise<GeneratedContractPDF> {
  const pdf = new jsPDF();

  // Set font
  pdf.setFont("helvetica");

  // Function to add page number at bottom center
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

  // Add logo header
  let headerYPosition = 15;

  try {
    // Load logo from public folder (server-side)
    const logoPath = join(
      process.cwd(),
      "public",
      "images",
      "koperasi-logo.jpg"
    );
    const logoBuffer = readFileSync(logoPath);
    const logoDataURL = `data:image/jpeg;base64,${logoBuffer.toString(
      "base64"
    )}`;

    pdf.addImage(logoDataURL, "JPEG", 85, headerYPosition, 40, 40);
    headerYPosition += 45;
  } catch (logoError) {
    console.warn("Could not load logo for PDF:", logoError);
    headerYPosition += 10;
  }

  // Header text positioned below logo
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.text("PERSETUJUAN PENGELOLAAN SIMPANAN ANGGOTA", 105, headerYPosition, {
    align: "center",
  });

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Nomor: ${contractData.contractNumber}`, 105, headerYPosition + 18, {
    align: "center",
  });

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
  const monthStr = (contractDate.getMonth() + 1).toString().padStart(2, "0");

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
  pdf.text(`${contractData.investor.name || ""}`, colonPosition + 5, yPosition);
  yPosition += lineHeight;

  pdf.text("NIK", leftMargin + 10, yPosition);
  pdf.text(":", colonPosition, yPosition);
  pdf.text(`${contractData.investor.nik || ""}`, colonPosition + 5, yPosition);
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
  const memberNumber = (contractData.investor as any).memberNumber || "-";

  const preambleIntroText =
    `Bahwa sebelum ditandatanganinya Surat Persetujuan ini, saya selaku anggota koperasi dengan nomor anggota ${memberNumber} menerangkan hal–hal sebagai berikut:`;
  const preambleIntroLines = pdf.splitTextToSize(
    preambleIntroText,
    rightMargin - leftMargin
  );
  pdf.text(preambleIntroLines, leftMargin, yPosition);
  yPosition += lineHeight * preambleIntroLines.length + 3;

  const preambleTexts = [
    `1. Bahwa saya anggota dari Koperasi Bintang Merah Sejahtera dan selaku yang memiliki simpanan anggota sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk selanjutnya disebut sebagai Simpanan Anggota untuk project (${plantTypesText});`,
    `2. Bahwa Koperasi adalah Koperasi Pengelola untuk project (${plantTypesText}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
    `3. Bahwa Anggota Koperasi dan Koperasi setuju untuk pengelolaan simpanan anggota dalam usaha (${plantTypesText}) sesuai dengan ketentuan hukum yang berlaku.`,
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

    // Use numbered text rendering with hanging indent
    const heightUsed = renderNumberedTextWithIndent(
      pdf,
      text,
      leftMargin,
      yPosition,
      rightMargin - leftMargin,
      lineHeight
    );
    yPosition += heightUsed + 3;
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
    paymentType: contractData.paymentType,
    paymentTerm: contractData.paymentTerm,
    totalAmountText,
    totalAmountWords,
    totalInstallments: contractData.totalInstallments,
    durationYears: contractData.durationYears,
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
        `6. ${plantMetadata.label} adalah nama pohon dari keluarga ${plantMetadata.family} yang juga dikenal sebagai ${plantMetadata.alias}, dengan nama ilmiah ${plantMetadata.scientificName}. Pohon ini sangat serbaguna dan hampir seluruh bagiannya dapat dimanfaatkan, termasuk ${plantMetadata.usesText};`,
        `7. Paket Penanaman adalah unit usaha penanaman 10 (sepuluh) pohon (${plantTypesText}) yang dikelola oleh koperasi;`,
        "8. Masa Panen adalah periode waktu di mana hasil dipanen dan dikumpulkan dari lahan;",
        "9. Laporan Usaha adalah laporan tertulis dan/atau elektronik yang disampaikan Koperasi kepada Anggota Koperasi secara periodik;",
        "10. Masa Perawatan adalah periode sejak bibit ditanam hingga pohon siap dipanen;",
        "11. Force Majeure adalah keadaan di luar kemampuan yang menyebabkan tidak dapat melaksanakan kewajibannya;",
      ],
    },
    {
      title: "POIN II (RUANG LINGKUP)",
      content: [
        `1. Dalam persetujuan pengelolaan simpanan anggota ini menyatakan agar Koperasi Bintang Merah sebagai Pengelola simpanan wajib anggota sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk 1 (satu) paket penanaman (${plantTypesText}) dan Koperasi dengan ini telah menerima penyerahan simpanan tersebut dari Anggota Koperasi serta menyanggupi untuk melaksanakan pengelolaan simpanan anggota;`,
        `2. Koperasi melaksanakan pengelolaan simpanan anggota pada Usaha Peningkatan Modal di project (${plantTypesText}) yang berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan setelah ditandatanganinya persetujuan ini;`,
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
        `1. Persetujuan ini dilakukan dengan cara pemberian Sisa Hasil Usaha (SHU) yang diperoleh dalam Usaha Peningkatan Modal Usaha di project (${plantTypesText}) berlokasi di Kabupten Musi Rawas Utara Provinsi Sumatera Selatan;`,
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

  // Add all articles
  pdf.setFontSize(10);
  articles.forEach((article) => {
    // Check space for article title
    if (yPosition > 250) {
      addPageNumber();
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(10);
    }

    // Article title - left aligned
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    const titleLines = article.title.split("\n");
    titleLines.forEach((titleLine) => {
      pdf.text(titleLine, leftMargin, yPosition);
      yPosition += lineHeight;
    });
    yPosition += lineHeight * 1; // Increased spacing after title

    // Article content
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

      // Use numbered text rendering with hanging indent
      const heightUsed = renderNumberedTextWithIndent(
        pdf,
        paragraph,
        leftMargin,
        yPosition,
        rightMargin - leftMargin,
        lineHeight
      );
      yPosition += heightUsed + lineHeight * 0.4; // Increased line spacing
    });

    yPosition += lineHeight * 1.5; // Increased spacing between articles
  });

  // Add closing location and date
  const closingDate = new Date(contractData.contractDate);
  const closingDateStr = closingDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Ensure we're on a new page for signatures
  if (yPosition > 220) {
    addPageNumber();
    pdf.addPage();
  }

  // Position signature section at bottom of page
  yPosition = 195;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const pageWidth = pdf.internal.pageSize.width;
  pdf.text(`Jakarta, ${closingDateStr}`, pageWidth - leftMargin, yPosition, { align: "right" });
  yPosition += lineHeight * 2;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  const centerX = pageWidth / 2;

  pdf.text("Anggota Koperasi", centerX, yPosition, { align: "center" });

  yPosition += lineHeight * 2;

  // Define the signature area dimensions and position - centered
  const signatureAreaHeight = 25;
  const signatureStartY = yPosition;

  // Names position
  const nameYPosition = signatureStartY + signatureAreaHeight + lineHeight * 1;

  // Investor signature - centered
  if (contractData.signatureDataURL) {
    try {
      if (!contractData.signatureDataURL.startsWith("data:image/png;base64,")) {
        throw new Error("signatureDataURL is not a valid PNG base64 string");
      }

      const signatureCenterX = centerX - 30; // Center the 60px wide signature
      const signatureCenterY =
        signatureStartY + signatureAreaHeight / 2 - 15 / 2;

      pdf.addImage(
        contractData.signatureDataURL,
        "PNG",
        signatureCenterX,
        signatureCenterY,
        60,
        15
      );
    } catch (err: any) {
      console.error("Error adding signature to PDF:", err);
    }
  } else {
    // Show placeholder line if no signature
    const placeholderX = centerX - 40;
    const placeholderY = signatureStartY + signatureAreaHeight / 2;
    pdf.text("_________________", placeholderX, placeholderY);
  }

  // Name under signature - centered
  pdf.setFont("helvetica", "normal");
  pdf.text(`${contractData.investor.name}`, centerX, nameYPosition, { align: "center" });

  yPosition = nameYPosition;
  yPosition += lineHeight;

  yPosition += 50;

  // Footer with validation info
  pdf.setFillColor(250, 250, 250);
  pdf.rect(leftMargin, yPosition, 170, 15, "F");

  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    `Ditandatangani secara digital pada: ${new Date().toLocaleString("id-ID")}`,
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

  const totalPages = (pdf.internal as any).getNumberOfPages();

  // Return PDF as Buffer + metadata
  const pdfOutput = pdf.output("arraybuffer");
  return {
    buffer: Buffer.from(pdfOutput),
    totalPages,
  };
}

/**
 * Backward-compatible helper when only the PDF buffer is needed.
 */
export async function generateContractPDFBuffer(
  contractData: ContractData
): Promise<Buffer> {
  const { buffer } = await generateContractPDFBufferWithMeta(contractData);
  return buffer;
}
