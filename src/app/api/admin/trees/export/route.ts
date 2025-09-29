import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';
import dbConnect from "@/lib/mongodb";
import PlantInstance from "@/models/PlantInstance";
import Investor from "@/models/Investor";

export async function GET() {
  try {
    await dbConnect();

    // Fetch all plant instances and investors
    const plantInstances = await PlantInstance.find({});
    const investors = await Investor.find({});

    // Count by plant type
    const plantTypeCounts = plantInstances.reduce((acc, instance) => {
      const type = instance.plantType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Create worksheet data
    const worksheetData = [];

    // Add company header information
    const headerInfo = [
      ["KOPERASI BINTANG MERAH SEJAHTERA"],
      ["Bintaro Business Center Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan Kota Jakarta Selatan DKI Jakarta 12330"],
      ["Tel: +62 81118893679 | Email: bintangmerahsejahtera@gmail.com"],
      ["LAPORAN DATA POHON"],
      [`Dibuat pada: ${new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`],
      [""],
      [""],
      [""],
      ["RINCIAN JENIS TANAMAN"],
      ["Jenis Tanaman", "Jumlah"]
    ];

    // Add header information to worksheet data
    worksheetData.push(...headerInfo);

    // Add plant type data
    const plantTypeLabels: Record<string, string> = {
      alpukat: 'Alpukat',
      aren: 'Aren',
      gaharu: 'Gaharu',
      jengkol: 'Jengkol'
    };

    // Sort plant types alphabetically and add to worksheet
    Object.keys(plantTypeLabels)
      .sort()
      .forEach(type => {
        const count = plantTypeCounts[type] || 0;
        worksheetData.push([plantTypeLabels[type], count]);
      });

    // Helper function to determine status based on new 4-status logic
    const getTreeStatus = (instance: any) => {
      const history = instance.history || [];

      // Check for "Panen" status (case insensitive)
      const hasPanen = history.some((historyItem: any) =>
        (historyItem.action || historyItem.type || '').toLowerCase() === 'panen'
      );
      if (hasPanen) return 'Panen';

      // Count non-pending/non-kontrak-baru entries
      const nonInitialEntries = history.filter((historyItem: any) => {
        const action = (historyItem.action || historyItem.type || '').toLowerCase();
        return action !== 'pending contract' && action !== 'kontrak baru';
      });

      if (nonInitialEntries.length === 0) return 'Menunggu Tanam';
      if (nonInitialEntries.length === 1) return 'Sudah Ditanam';
      return 'Tumbuh';
    };

    // Add spacing and new section
    worksheetData.push([""]);
    worksheetData.push([""]);
    worksheetData.push(["INSTANSI SELURUH TANAMAN"]);
    worksheetData.push(["Nomor Kontrak", "Nama User", "Jenis Paket", "Tanggal Pembelian", "Tanggal Tanam", "Lokasi", "Blok/Kavling", "Umur", "Status Pohon", "Kondisi"]);

    // Add plant instances data
    plantInstances.forEach(instance => {
      // Find related investor
      let userName = "-";
      let purchaseDate = "";

      // Look for investor with matching plant instance
      for (const investor of investors) {
        const hasMatchingInvestment = investor.investments?.some((investment: any) =>
          investment.plantInstanceId && investment.plantInstanceId.toString() === instance._id.toString()
        );

        if (hasMatchingInvestment) {
          userName = investor.name;
          // Find the specific investment for purchase date
          const matchingInvestment = investor.investments?.find((investment: any) =>
            investment.plantInstanceId && investment.plantInstanceId.toString() === instance._id.toString()
          );
          if (matchingInvestment?.investmentDate) {
            purchaseDate = new Date(matchingInvestment.investmentDate).toLocaleDateString('id-ID');
          }
          break;
        }
      }

      // If no purchase date found from investment, use creation date
      if (!purchaseDate) {
        purchaseDate = new Date(instance.createdAt).toLocaleDateString('id-ID');
      }

      // Calculate planting date and age
      const history = instance.history || [];
      const firstPlantingAction = history.find((h: any) => {
        const action = (h.action || h.type || '').toLowerCase();
        return action !== 'pending contract' && action !== 'kontrak baru';
      });

      let tanggalTanam = "-";
      let umur = "-";

      if (firstPlantingAction) {
        const plantingDate = firstPlantingAction.addedAt || firstPlantingAction.date;
        if (plantingDate) {
          tanggalTanam = plantingDate;

          // Calculate age
          try {
            const now = new Date();
            let referenceDate;

            if (plantingDate.includes('/')) {
              const [day, month, year] = plantingDate.split('/');
              referenceDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
              referenceDate = new Date(plantingDate);
            }

            const timeDiff = now.getTime() - referenceDate.getTime();
            const totalDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const years = Math.floor(totalDays / 365);
            const months = Math.floor((totalDays % 365) / 30);
            const days = totalDays % 30;

            let ageDisplay = '';
            if (years > 0) ageDisplay += `${years} tahun `;
            if (months > 0) ageDisplay += `${months} bulan `;
            if (days > 0) ageDisplay += `${days} hari`;

            umur = ageDisplay.trim() || '0 hari';
          } catch {
            umur = "0 hari";
          }
        }
      }

      // Determine tree status and condition
      const statusPohon = getTreeStatus(instance);
      const kondisi = instance.status?.toLowerCase() === 'sakit' ? 'Sakit' :
                     instance.status?.toLowerCase() === 'mati' ? 'Mati' : 'Sehat';

      // Plant type label
      const jenisPacket = plantTypeLabels[instance.plantType] || instance.plantType;

      // Blok/Kavling format
      const blokKavling = instance.kavling || instance.blok ?
        `${instance.kavling || '-'}/${instance.blok || '-'}` : '-';

      worksheetData.push([
        instance.id || '-',
        userName,
        jenisPacket,
        purchaseDate,
        tanggalTanam,
        instance.location || '-',
        blokKavling,
        umur,
        statusPohon,
        kondisi
      ]);
    });

    // Create worksheet from data
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-size columns based on content
    const colWidths = [];
    const maxCols = Math.max(...worksheetData.map(row => row.length));

    for (let col = 0; col < maxCols; col++) {
      let maxWidth = 0;
      for (let row = 0; row < worksheetData.length; row++) {
        const cellValue = worksheetData[row][col];
        if (cellValue) {
          const cellWidth = cellValue.toString().length;
          maxWidth = Math.max(maxWidth, cellWidth);
        }
      }
      // Ensure minimum width for readability
      colWidths.push({ width: Math.min(Math.max(maxWidth + 3, 15), 50) });
    }
    worksheet['!cols'] = colWidths;

    // Add borders and styling
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellRef]) continue;

        // Initialize cell style
        if (!worksheet[cellRef].s) worksheet[cellRef].s = {};

        // Add borders to data tables only (skip empty rows and single-cell headers)
        const shouldHaveBorders = !(
          worksheetData[row][0] === "LAPORAN DATA POHON" ||
          (worksheetData[row][0] && worksheetData[row][0].toString().startsWith("Dibuat pada:")) ||
          worksheetData[row][0] === "" ||
          worksheetData[row][0] === "RINCIAN JENIS TANAMAN" ||
          worksheetData[row][0] === "INSTANSI SELURUH TANAMAN"
        );

        if (shouldHaveBorders) {
          worksheet[cellRef].s.border = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          };
        }

        // Company header styling (row 0)
        if (row === 0 || worksheetData[row][0] === "KOPERASI BINTANG MERAH SEJAHTERA") {
          worksheet[cellRef].s.font = { bold: true, sz: 14 };
          worksheet[cellRef].s.alignment = { horizontal: 'left' };
          worksheet[cellRef].s.fill = { fgColor: { rgb: 'E5E7EB' } };
        }

        // Section headers
        if (worksheetData[row][0] === "RINCIAN JENIS TANAMAN" ||
            worksheetData[row][0] === "Jenis Tanaman" ||
            worksheetData[row][0] === "Nomor Kontrak") {
          worksheet[cellRef].s.font = { bold: true, sz: 11 };
          worksheet[cellRef].s.fill = { fgColor: { rgb: 'E5E7EB' } };
          worksheet[cellRef].s.alignment = { horizontal: 'center' };
        }

        // INSTANSI SELURUH TANAMAN header - left aligned
        if (worksheetData[row][0] === "INSTANSI SELURUH TANAMAN") {
          worksheet[cellRef].s.font = { bold: true, sz: 11 };
          worksheet[cellRef].s.fill = { fgColor: { rgb: 'E5E7EB' } };
          worksheet[cellRef].s.alignment = { horizontal: 'left' };
        }

        // Data alignment for numbers
        if (row > 0 && col > 0 && worksheetData[row][col] &&
            !isNaN(Number(worksheetData[row][col]))) {
          worksheet[cellRef].s.alignment = { horizontal: 'right' };
        }
      }
    }

    // Merge header cells
    try {
      worksheet['!merges'] = worksheet['!merges'] || [];

      // Find where the new section starts
      let instansiRow = -1;
      for (let i = 0; i < worksheetData.length; i++) {
        if (worksheetData[i][0] === "INSTANSI SELURUH TANAMAN") {
          instansiRow = i;
          break;
        }
      }

      // Merge company header rows (0..4) across all 10 columns for the detailed table
      for (let r = 0; r <= 4; r++) {
        worksheet['!merges'].push({ s: { r, c: 0 }, e: { r, c: 9 } });
      }
      // Merge empty rows (5..7)
      for (let r = 5; r <= 7; r++) {
        worksheet['!merges'].push({ s: { r, c: 0 }, e: { r, c: 9 } });
      }
      // Merge section header row (8)
      worksheet['!merges'].push({ s: { r: 8, c: 0 }, e: { r: 8, c: 1 } });

      // Merge "INSTANSI SELURUH TANAMAN" across all 10 columns
      if (instansiRow >= 0) {
        worksheet['!merges'].push({ s: { r: instansiRow, c: 0 }, e: { r: instansiRow, c: 9 } });
      }

      // Ensure merged cells are created without borders for header sections
      const maxRow = instansiRow >= 0 ? instansiRow : 8;
      for (let r = 0; r <= maxRow; r++) {
        for (let c = 0; c <= 9; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!worksheet[cellRef]) {
            const val = (worksheetData[r] && worksheetData[r][c]) || "";
            worksheet[cellRef] = { v: val, t: 's' } as any;
          }
          if (!worksheet[cellRef].s) worksheet[cellRef].s = {};

          // Don't add borders to company header and empty rows only
          const shouldHaveBorders = !(
            r <= 2 || // Company header rows (0, 1, 2)
            r === 5 || r === 6 || r === 7 // Empty rows
          );

          // For RINCIAN JENIS TANAMAN section, only apply borders to first 2 columns
          const isRincianSection = r >= 8 && r < (instansiRow >= 0 ? instansiRow - 2 : maxRow);
          // const isRincianHeader = worksheetData[r] && worksheetData[r][0] === "RINCIAN JENIS TANAMAN";

          if (shouldHaveBorders) {
            if (isRincianSection && c <= 1) {
              // Only first 2 columns for the summary table
              worksheet[cellRef].s.border = {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
              };
            }
          }
        }
      }

      // Add borders to LAPORAN DATA POHON and Dibuat pada rows (rows 3-4)
      for (let r = 3; r <= 4; r++) {
        for (let c = 0; c <= 9; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!worksheet[cellRef].s) worksheet[cellRef].s = {};
          worksheet[cellRef].s.border = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: c === 0 ? { style: 'thin', color: { rgb: '000000' } } : undefined,
            right: c === 9 ? { style: 'thin', color: { rgb: '000000' } } : undefined,
          };
        }
      }

      // Add border to RINCIAN JENIS TANAMAN header (row 8)
      const rincianHeaderRow = 8;
      for (let c = 0; c <= 1; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: rincianHeaderRow, c });
        if (!worksheet[cellRef].s) worksheet[cellRef].s = {};
        worksheet[cellRef].s.border = {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: c === 0 ? { style: 'thin', color: { rgb: '000000' } } : undefined,
          right: c === 1 ? { style: 'thin', color: { rgb: '000000' } } : undefined,
        };
      }

      // Add top border to INSTANSI SELURUH TANAMAN merged cell
      if (instansiRow >= 0) {
        for (let c = 0; c <= 9; c++) {
          const cellRef = XLSX.utils.encode_cell({ r: instansiRow, c });
          if (!worksheet[cellRef].s) worksheet[cellRef].s = {};
          worksheet[cellRef].s.border = {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: c === 0 ? { style: 'thin', color: { rgb: '000000' } } : undefined,
            right: c === 9 ? { style: 'thin', color: { rgb: '000000' } } : undefined,
          };
        }
      }
    } catch {
      // ignore if merging fails
    }

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Data Pohon');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="laporan-data-pohon-${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });

  } catch (error) {
    console.error('Error generating Excel export:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate Excel export' },
      { status: 500 }
    );
  }
}