import dbConnect from "@/lib/mongodb";
import Investor from "@/models/Investor";
import User from "@/models/User";
import PlantInstance from "@/models/PlantInstance";
import Payment from "@/models/Payment";
import Contract from "@/models/Contract";
import { NextResponse } from "next/server";

// Helper function to get individual investor report
async function getIndividualInvestorReport(investorId: string) {
  try {
    // Get the specific investor
    const investor = await Investor.findById(investorId);
    if (!investor) {
      return NextResponse.json(
        { success: false, error: "Investor not found" },
        { status: 404 }
      );
    }

    // Get user data
    const user = await User.findById(investor.userId).select(
      "userCode phoneNumber fullName email"
    );
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Get all payments for this investor/user (PAYMENT TABLE FIRST)
    const payments = await Payment.find({ userId: investor.userId }).sort({
      createdAt: -1,
    });

    // Get all plant instances (we'll link these to payments, not the other way around)
    const allPlantInstances = await PlantInstance.find({});

    // Get contract data for payments
    const contractOrderIds = payments
      .map((p) => {
        if (p.paymentType === "cicilan-installment" && p.cicilanOrderId) {
          return p.cicilanOrderId;
        }
        return p.orderId;
      })
      .filter(Boolean);

    const contracts = await Contract.find({
      contractId: { $in: contractOrderIds },
    });
    const contractsMap = contracts.reduce(
      (acc: Record<string, any>, contract: any) => {
        acc[contract.contractId] = contract;
        return acc;
      },
      {} as Record<string, any>
    );

    // Helper function to determine status (same as main API)
    const getTreeStatus = (instance: any) => {
      const history = instance.history || [];
      const hasPanen = history.some(
        (historyItem: any) =>
          (historyItem.action || historyItem.type || "").toLowerCase() ===
          "panen"
      );
      if (hasPanen) return "Panen";

      const nonInitialEntries = history.filter((historyItem: any) => {
        const action = (
          historyItem.action ||
          historyItem.type ||
          ""
        ).toLowerCase();
        return action !== "pending contract" && action !== "kontrak baru";
      });

      if (nonInitialEntries.length === 0) return "Menunggu Tanam";
      if (nonInitialEntries.length === 1) return "Sudah Ditanam";
      return "Tumbuh";
    };

    // Trees are now processed within each payment report, so we don't need global tree processing

    // Build payment reports: START WITH PAYMENTS, then link to plant instances
    const paymentReports = payments.map((payment) => {
      // Find contract for this payment
      const contractKey =
        payment.paymentType === "cicilan-installment" && payment.cicilanOrderId
          ? payment.cicilanOrderId
          : payment.orderId;
      const contractData = contractsMap[contractKey] || null;

      // For THIS PAYMENT: find related plant instances through investor investments
      const paymentOrderKey =
        payment.paymentType === "cicilan-installment" && payment.cicilanOrderId
          ? payment.cicilanOrderId
          : payment.orderId;

      // Find plant instances linked to this specific payment
      const relatedPlantInstances = allPlantInstances.filter(
        (plantInstance) => {
          return investor.investments.some(
            (investment: any) =>
              investment.plantInstanceId?.toString() ===
                plantInstance._id.toString() &&
              investment.investmentId === paymentOrderKey
          );
        }
      );

      // Process plant instances into tree format for this payment
      const relatedTrees = relatedPlantInstances.map((plantInstance) => {
        const history = plantInstance.history || [];
        const treeStatus = getTreeStatus(plantInstance);

        // Calculate age
        let tanggalTanam = null;
        let umur = 0;
        let years = 0,
          months = 0,
          days = 0;

        const firstPlantingAction = history.find((h: any) => {
          const action = (h.action || h.type || "").toLowerCase();
          return action !== "pending contract" && action !== "kontrak baru";
        });

        if (firstPlantingAction) {
          tanggalTanam =
            firstPlantingAction.addedAt || firstPlantingAction.date;

          const now = new Date();
          let referenceDate;

          if (tanggalTanam) {
            try {
              const [day, month, year] = tanggalTanam.split("/");
              referenceDate = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day)
              );
            } catch {
              referenceDate = new Date(plantInstance.createdAt);
            }
          } else {
            referenceDate = new Date(plantInstance.createdAt);
          }

          // Calculate detailed age like UI (years, months, days)
          years = now.getFullYear() - referenceDate.getFullYear();
          months = now.getMonth() - referenceDate.getMonth();
          days = now.getDate() - referenceDate.getDate();

          // Adjust for negative days
          if (days < 0) {
            months--;
            const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += lastMonth.getDate();
          }

          // Adjust for negative months
          if (months < 0) {
            years--;
            months += 12;
          }

          // Convert to months for umur field (for compatibility)
          umur = years * 12 + months;
        } else {
          // Calculate age from creation date
          const now = new Date();
          const createdDate = new Date(plantInstance.createdAt);
          years = now.getFullYear() - createdDate.getFullYear();
          months = now.getMonth() - createdDate.getMonth();
          days = now.getDate() - createdDate.getDate();

          if (days < 0) {
            months--;
            const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += lastMonth.getDate();
          }
          if (months < 0) {
            years--;
            months += 12;
          }

          umur = years * 12 + months;
        }

        const kondisi =
          plantInstance.status?.toLowerCase() === "sakit"
            ? "Sakit"
            : plantInstance.status?.toLowerCase() === "mati"
            ? "Mati"
            : "Sehat";

        return {
          _id: plantInstance._id,
          spesiesPohon: `${plantInstance.instanceName}`,
          lokasi: plantInstance.location || "Lokasi tidak tersedia",
          blok: plantInstance.blok || "",
          kavling: plantInstance.kavling || "",
          umur: umur,
          detailedAge: { years, months, days }, // Store detailed age always
          ageSource: firstPlantingAction ? "tanamBibit" : "createdAt",
          tinggi: 0,
          tanggalTanam: tanggalTanam || plantInstance.createdAt,
          kondisi: treeStatus,
          status: kondisi,
          createdAt: plantInstance.createdAt,
          history: plantInstance.history || [],
          nomorKontrak: plantInstance.id || plantInstance._id.toString(),
        };
      });

      // Calculate statistics for this payment's trees
      const paymentStats = {
        total: relatedTrees.length,
        byCondition: relatedTrees.reduce((acc, tree) => {
          const status = tree.kondisi;
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        bySpecies: relatedTrees.reduce((acc, tree) => {
          const type = tree.spesiesPohon.split(" - ")[0].toLowerCase();
          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type]++;
          return acc;
        }, {} as Record<string, number>),
        avgHeight: 0,
      };

      return {
        investor: {
          _id: investor._id,
          name: investor.name || user.fullName,
          email: investor.email || user.email,
          phoneNumber: user.phoneNumber,
          userCode: user.userCode,
          totalInvestasi: investor.totalInvestasi || 0,
          jumlahPohon: investor.jumlahPohon || 0,
          status: investor.status || "active",
          createdAt: investor.createdAt || user.createdAt,
        },
        payment: payment,
        trees: relatedTrees,
        statistics: paymentStats,
        contract: contractData,
      };
    });

    // Calculate total trees from all payment reports
    const totalTrees = paymentReports.reduce(
      (sum, report) => sum + report.trees.length,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        reports: paymentReports, // Array of payment reports like main API
        summary: {
          totalInvestors: 1,
          totalPayments: payments.length,
          totalTrees: totalTrees,
        },
      },
    });
  } catch (error) {
    console.error("Individual investor report error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch individual investor report" },
      { status: 500 }
    );
  }
}

// GET /api/admin/laporan - Get report data for all investors with pagination and search, or individual investor
export async function GET(request: Request) {
  try {
    await dbConnect();

    // Parse URL parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "5");
    const search = searchParams.get("search") || "";
    const investorId = searchParams.get("investorId"); // New parameter for individual investor

    // Handle individual investor request
    if (investorId) {
      return await getIndividualInvestorReport(investorId);
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Build search query (for future use if needed)
    // const searchQuery = search ? {
    //   $or: [
    //     { name: { $regex: search, $options: 'i' } },
    //     { email: { $regex: search, $options: 'i' } }
    //   ]
    // } : {};

    // RESTRUCTURED: Paginate by INVESTORS, not payments

    // Build investor search query
    let investorSearchQuery = {};
    if (search) {
      investorSearchQuery = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Get total count of INVESTORS for pagination
    const totalInvestors = await Investor.countDocuments(investorSearchQuery);

    // Get paginated INVESTORS as primary data
    const paginatedInvestors = await Investor.find(investorSearchQuery)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Most recent first

    // Get user IDs from paginated investors
    const userIds = paginatedInvestors.map((inv) => inv.userId.toString());

    // Get ALL payments for these investors (not paginated)
    const payments = await Payment.find({ userId: { $in: userIds } }).sort({
      createdAt: -1,
    });

    // Get user data for these investors
    const users = await User.find({ _id: { $in: userIds } }).select(
      "userCode phoneNumber fullName email"
    );
    const usersMap = users.reduce((acc: Record<string, any>, u: any) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {} as Record<string, any>);

    // Get all plant instances (still needed for tree data)
    const plantInstances = await PlantInstance.find({});

    // Get contract data for payments
    // For full investments: payment.orderId -> contract.contractId
    // For cicilan: payment.cicilanOrderId -> contract.contractId
    const contractOrderIds = payments
      .map((p) => {
        if (p.paymentType === "cicilan-installment" && p.cicilanOrderId) {
          return p.cicilanOrderId;
        }
        return p.orderId;
      })
      .filter(Boolean);

    console.log("Contract Order IDs to search:", contractOrderIds);

    const contracts = await Contract.find({
      contractId: { $in: contractOrderIds },
    });
    console.log(
      "Found contracts:",
      contracts.map((c) => ({
        contractId: c.contractId,
        contractNumber: c.contractNumber,
      }))
    );

    const contractsMap = contracts.reduce(
      (acc: Record<string, any>, contract: any) => {
        acc[contract.contractId] = contract;
        return acc;
      },
      {} as Record<string, any>
    );

    // Debug: Log what we found
    console.log("Debug - Investor-primary query results:", {
      totalPayments: payments.length,
      totalUsers: users.length,
      totalInvestors: paginatedInvestors.length,
      totalPlantInstances: plantInstances.length,
      totalContracts: contracts.length,
      contractOrderIds: contractOrderIds.length,
    });

    // Create payment-based reports for each investor in the current page
    // Build a map of payments by userId first
    const paymentsByUserId = payments.reduce((acc, payment) => {
      const userId = payment.userId.toString();
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(payment);
      return acc;
    }, {} as Record<string, any[]>);

    // Create reports for EACH paginated investor (even if they have no payments)
    const paymentReports = paginatedInvestors.flatMap((investorData) => {
      const userId = investorData.userId.toString();
      const userData = usersMap[userId];
      const investorPayments = paymentsByUserId[userId] || [];

      // If investor has no payments, create a single report with empty payment
      if (investorPayments.length === 0) {
        return [
          {
            payment: null, // No payment for this investor
            contract: null,
            investor: {
              _id: investorData._id,
              name: investorData.name || userData?.fullName || "Unknown",
              email: investorData.email || userData?.email || "",
              phoneNumber: userData?.phoneNumber || "",
              userCode: userData?.userCode || "",
              totalInvestasi: investorData.totalInvestasi || 0,
              jumlahPohon: investorData.jumlahPohon || 0,
              status: investorData.status || "active",
              createdAt: investorData.createdAt || userData?.createdAt,
              investments: investorData.investments || [],
              payments: [],
            },
            trees: [],
            statistics: {
              total: 0,
              byCondition: {},
              bySpecies: {},
              avgHeight: 0,
            },
          },
        ];
      }

      // Otherwise, create a report for each payment
      return investorPayments.map((payment: any) => {
        // Get contract data for this payment
        // For full investments: payment.orderId -> contract.contractId
        // For cicilan: payment.cicilanOrderId -> contract.contractId
        const contractKey =
          payment.paymentType === "cicilan-installment" &&
          payment.cicilanOrderId
            ? payment.cicilanOrderId
            : payment.orderId;
        const contractData = contractsMap[contractKey];

        // Debug: Log payment data
        console.log(`Processing payment: ${payment.orderId}`, {
          paymentId: payment._id,
          userId: userId,
          userData: userData?.fullName,
          investorData: investorData?.name,
          investorId: investorData?._id,
          contractFound: !!contractData,
          contractNumber: contractData?.contractNumber,
        });

        // Find related plant instances through investment records
        let relatedPlantInstances = [];
        if (investorData?.investments) {
          // Use correct orderId based on payment type (same logic as individual investor API)
          const paymentOrderKey =
            payment.paymentType === "cicilan-installment" &&
            payment.cicilanOrderId
              ? payment.cicilanOrderId
              : payment.orderId;

          relatedPlantInstances = plantInstances.filter((plantInstance) => {
            return investorData.investments.some(
              (investment: any) =>
                investment.plantInstanceId?.toString() ===
                  plantInstance._id.toString() &&
                investment.investmentId === paymentOrderKey
            );
          });
        }

        // Helper function to determine status based on new 4-status logic (same as trees page)
        const getTreeStatus = (instance: any) => {
          const history = instance.history || [];

          // Check for "Panen" status (case insensitive)
          const hasPanen = history.some(
            (historyItem: any) =>
              (historyItem.action || historyItem.type || "").toLowerCase() ===
              "panen"
          );
          if (hasPanen) return "Panen";

          // Count non-pending/non-kontrak-baru entries
          const nonInitialEntries = history.filter((historyItem: any) => {
            const action = (
              historyItem.action ||
              historyItem.type ||
              ""
            ).toLowerCase();
            return action !== "pending contract" && action !== "kontrak baru";
          });

          if (nonInitialEntries.length === 0) return "Menunggu Tanam";
          if (nonInitialEntries.length === 1) return "Sudah Ditanam";
          return "Tumbuh";
        };

        // Calculate plant statistics for related plant instances
        const statusCounts = relatedPlantInstances.reduce(
          (acc, plantInstance) => {
            const status = getTreeStatus(plantInstance);
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        const plantStats = {
          total: relatedPlantInstances.length,
          byCondition: statusCounts,
          bySpecies: relatedPlantInstances.reduce((acc, plantInstance) => {
            const type = plantInstance.plantType;
            if (!acc[type]) {
              acc[type] = 0;
            }
            acc[type]++;
            return acc;
          }, {} as Record<string, number>),
          avgHeight: 0, // PlantInstance doesn't have height field
        };

        // Return payment-based report structure
        return {
          payment: {
            _id: payment._id,
            orderId: payment.orderId,
            transactionId: payment.transactionId,
            amount: payment.amount,
            paymentType: payment.paymentType,
            transactionStatus: payment.transactionStatus,
            productName: payment.productName,
            referralCode: payment.referralCode,
            createdAt: payment.createdAt,
            transactionTime: payment.transactionTime,
            settlementTime: payment.settlementTime,
            dueDate: payment.dueDate,
            installmentNumber: payment.installmentNumber,
            adminStatus: payment.adminStatus,
            status: payment.status,
          },
          contract: contractData
            ? {
                _id: contractData._id,
                contractId: contractData.contractId,
                contractNumber: contractData.contractNumber,
                contractDate: contractData.contractDate,
                totalAmount: contractData.totalAmount,
                paymentType: contractData.paymentType,
                status: contractData.status,
              }
            : null,
          investor: {
            _id: investorData._id, // Now guaranteed to exist due to filter
            name: investorData.name || userData?.fullName || "Unknown",
            email: investorData.email || userData?.email || "",
            phoneNumber: userData?.phoneNumber || "",
            userCode: userData?.userCode || "",
            totalInvestasi: investorData.totalInvestasi || 0,
            jumlahPohon: investorData.jumlahPohon || 0,
            status: investorData.status || "active",
            createdAt: investorData.createdAt || userData?.createdAt,
            investments: investorData.investments || [], // Include investment records for reference
            payments: [payment], // This specific payment
          },
          trees: relatedPlantInstances.map((plantInstance) => {
            // Use same age calculation logic as trees page
            const history = plantInstance.history || [];
            const treeStatus = getTreeStatus(plantInstance);

            // Find the first planting date and calculate age
            let tanggalTanam = null;
            let umur = 0;

            // Look for the first non-pending/non-new contract action for planting date
            const firstPlantingAction = history.find((h: any) => {
              const action = (h.action || h.type || "").toLowerCase();
              return action !== "pending contract" && action !== "kontrak baru";
            });

            if (firstPlantingAction) {
              tanggalTanam =
                firstPlantingAction.addedAt || firstPlantingAction.date;

              // Calculate age from planting date
              const now = new Date();
              let referenceDate;

              if (tanggalTanam) {
                try {
                  // Parse DD/MM/YYYY format
                  const [day, month, year] = tanggalTanam.split("/");
                  referenceDate = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day)
                  );
                } catch {
                  // Fallback to createdAt if parsing fails
                  referenceDate = new Date(plantInstance.createdAt);
                }
              } else {
                // Fallback to createdAt if no planting date found
                referenceDate = new Date(plantInstance.createdAt);
              }

              // Calculate age in months
              const ageInMonths = Math.floor(
                (now.getTime() - referenceDate.getTime()) /
                  (1000 * 60 * 60 * 24 * 30)
              );
              umur = Math.max(0, ageInMonths);
            }

            // Determine condition (health status)
            const kondisi =
              plantInstance.status?.toLowerCase() === "sakit"
                ? "Sakit"
                : plantInstance.status?.toLowerCase() === "mati"
                ? "Mati"
                : "Sehat";

            return {
              _id: plantInstance._id,
              spesiesPohon: `${plantInstance.instanceName}`,
              lokasi: plantInstance.location || "Lokasi tidak tersedia",
              blok: plantInstance.blok || "",
              kavling: plantInstance.kavling || "",
              umur: umur,
              tinggi: 0, // PlantInstance doesn't have height field
              tanggalTanam: tanggalTanam || plantInstance.createdAt,
              kondisi: treeStatus, // Use the new 4-status system for display
              status: kondisi, // Keep the health status separate
              createdAt: plantInstance.createdAt,
              history: plantInstance.history || [], // Include history for age calculation
              nomorKontrak: plantInstance.id || plantInstance._id.toString(),
            };
          }),
          statistics: plantStats,
        };
      });
    });

    // Calculate overall statistics (for all payments and related data)
    const allInvestors = await Investor.find({});
    const allPayments = await Payment.find({});
    const overallStats = {
      totalInvestors: allInvestors.length,
      totalPayments: allPayments.length,
      totalTrees: plantInstances.length,
      activeInvestors: allInvestors.filter((inv) => inv.status === "active")
        .length,
      inactiveInvestors: allInvestors.filter((inv) => inv.status === "inactive")
        .length,
      settlementPayments: allPayments.filter(
        (p) => p.transactionStatus === "settlement"
      ).length,
      pendingPayments: allPayments.filter(
        (p) => p.transactionStatus === "pending"
      ).length,
    };

    // Calculate pagination info (based on INVESTORS now)
    const totalPages = Math.ceil(totalInvestors / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        reports: paymentReports, // Payment-based reports for paginated investors
        summary: overallStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalInvestors, // Total INVESTORS (not payments)
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage,
          startIndex: skip + 1,
          endIndex: Math.min(skip + limit, totalInvestors),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/admin/laporan error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
