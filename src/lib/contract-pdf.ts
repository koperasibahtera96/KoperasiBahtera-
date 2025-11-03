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

/**
 * Generate contract PDF buffer (server-side)
 * Returns PDF as Buffer that can be sent to e-materai API
 */
export async function generateContractPDFBuffer(
  contractData: ContractData
): Promise<Buffer> {
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
  pdf.text("SURAT PERJANJIAN KERJASAMA", 105, headerYPosition, {
    align: "center",
  });
  pdf.text("(KONTRAK)", 105, headerYPosition + 8, {
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

  // Extract plant type from productName
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
  yPosition += lineHeight * preambleIntroLines.length + 25; // Added more spacing to push content

  const preambleTexts = [
    `1. Bahwa Pihak Pertama adalah selaku yang memiliki modal sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) untuk selanjutnya disebut sebagai MODAL KERJASAMA untuk project (${plantTypesText});`,
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

  yPosition += 8; // Increased spacing before articles section

  // Generate dynamic payment method text for PASAL IV
  const getPaymentMethodText = (): string => {
    if (contractData.paymentType === 'full') {
      return `1. Pihak Pertama membayar sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) sekali bayar;`;
    } else {
      // Cicilan
      if (contractData.paymentTerm === 'monthly' && contractData.totalInstallments) {
        const installmentsWords = convertNumberToWords(contractData.totalInstallments).toLowerCase();
        return `1. Pihak Pertama membayar sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) dengan cara dicicil selama ${contractData.totalInstallments} (${installmentsWords}) bulan dibayar setiap tanggal 10 setiap bulannya;`;
      } else if (contractData.paymentTerm === 'annual' && contractData.durationYears) {
        const yearsWords = convertNumberToWords(contractData.durationYears).toLowerCase();
        return `1. Pihak Pertama membayar sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) dengan cara dicicil selama ${contractData.durationYears} (${yearsWords}) tahun, dibayar setiap tahun di tanggal 10 Januari;`;
      }
      // Fallback for other payment terms
      return `1. Pihak Pertama membayar sebesar ${totalAmountText} (${totalAmountWords.toLowerCase()}) dengan cara dicicil.`;
    }
  };

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
        getPaymentMethodText(),
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
      addPageNumber();
      pdf.addPage();
      yPosition = 20;
      pdf.setFontSize(10);
    }

    // Article title - centered
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    const titleLines = article.title.split("\n");
    titleLines.forEach((titleLine) => {
      pdf.text(titleLine, 105, yPosition, { align: "center" });
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

  // Position signature section at bottom of page (start at ~220mm from top)
  yPosition = 200;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Jakarta, ${closingDateStr}`, leftMargin, yPosition);
  yPosition += lineHeight * 2;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  // Main signature headers - align them properly
  // const pihakPertamaX = leftMargin + 30;
  const pihakKeduaX = leftMargin + 120;

  pdf.text("Pihak Pertama", leftMargin, yPosition);
  pdf.text("Pihak Kedua", pihakKeduaX, yPosition);

  yPosition += lineHeight * 2;

  // Define the signature area dimensions and position
  const signatureAreaWidth = 80;
  const signatureAreaHeight = 25;
  const signatureAreaX = pihakKeduaX - 25;
  const signatureStartY = yPosition;

  // Names position
  const nameYPosition = signatureStartY + signatureAreaHeight + lineHeight * 1;

  // Right side - Investor signature
  if (contractData.signatureDataURL) {
    try {
      if (!contractData.signatureDataURL.startsWith("data:image/png;base64,")) {
        throw new Error("signatureDataURL is not a valid PNG base64 string");
      }

      const signatureCenterX = signatureAreaX + signatureAreaWidth / 2 - 60 / 2;
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
    const placeholderX = signatureAreaX + signatureAreaWidth / 2 - 40;
    const placeholderY = signatureStartY + signatureAreaHeight / 2;
    pdf.text("_________________", placeholderX, placeholderY);
  }

  // Names under signatures
  // const halimX = leftMargin + 5;
  pdf.setFont("helvetica", "bold");
  pdf.text("Halim Perdana Kusuma, S.H., M.H.", leftMargin, nameYPosition);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${contractData.investor.name}`, pihakKeduaX, nameYPosition);

  yPosition = nameYPosition;
  yPosition += lineHeight;

  pdf.text("Ketua Koperasi", leftMargin, yPosition);

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

  // Return PDF as Buffer
  const pdfOutput = pdf.output("arraybuffer");
  return Buffer.from(pdfOutput);
}
