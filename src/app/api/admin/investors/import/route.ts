import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = await file.arrayBuffer();

    // Parse Excel/CSV file
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer" });
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file format. Please upload Excel or CSV file.",
        },
        { status: 400 }
      );
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: "File is empty or has no data" },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2; // Account for header row

      try {
        // Map columns to fields (handle different possible column names)
        const fullName =
          row["Nama Lengkap"] || row["Name"] || row["nama"] || row["fullName"];
        const email = row["Email"] || row["email"];
        const phoneNumber =
          row["No. Telepon"] ||
          row["Phone"] ||
          row["phoneNumber"] ||
          row["phone"];
        const nik = row["NIK"] || row["nik"];
        const alamatKTP =
          row["Alamat KTP"] || row["alamatKTP"] || row["Address"];
        const alamatDomisili =
          row["Alamat Domisili"] || row["alamatDomisili"] || row["Domicile"];
        const occupation = row["Pekerjaan"] || row["occupation"] || row["job"];
        const totalInvestasi = parseFloat(
          row["Total Investasi"] || row["totalInvestasi"] || "0"
        );
        const jumlahPohon = parseInt(
          row["Jumlah Pohon"] || row["jumlahPohon"] || "0"
        );
        const status = row["Status"] || row["status"] || "active";

        // Validate required fields
        if (!fullName || !email) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: Nama lengkap dan email wajib diisi`
          );
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Format email tidak valid`);
          continue;
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (!user) {
          // Create new user if doesn't exist
          user = new User({
            email,
            fullName,
            phoneNumber: phoneNumber || "",
            nik: nik || "",
            addresses: {
              ktp: alamatKTP || "",
              domisili: alamatDomisili || alamatKTP || "",
            },
            occupation: occupation || "",
            verificationStatus: "verified", // Auto-verify imported users
            canPurchase: true,
            role: "user",
          });

          await user.save();
        }

        // Check if investor already exists
        const existingInvestor = await Investor.findOne({
          $or: [{ email }, { userId: user._id }],
        });

        if (existingInvestor) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: Investor dengan email ${email} sudah ada`
          );
          continue;
        }

        // Create new investor
        const investor = new Investor({
          userId: user._id,
          name: fullName,
          email,
          totalInvestasi: isNaN(totalInvestasi) ? 0 : totalInvestasi,
          jumlahPohon: isNaN(jumlahPohon) ? 0 : jumlahPohon,
          status: ["active", "inactive", "suspended"].includes(status)
            ? status
            : "active",
          investments: [],
        });

        await investor.save();
        results.success++;
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.failed++;
        results.errors.push(
          `Row ${rowNumber}: Terjadi kesalahan saat memproses data`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import selesai. ${results.success} berhasil, ${results.failed} gagal.`,
      results,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan saat mengimport data" },
      { status: 500 }
    );
  }
}
