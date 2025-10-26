import dbConnect from "@/lib/mongodb";
import Contract from "@/models/Contract";
import User from "@/models/User";
import { Investor } from "@/models";
import PlantInstance from "@/models/PlantInstance";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, emailTemplates } from "@/lib/email";
import { stampContractAfterPayment } from "@/lib/contract-stamping";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    await dbConnect();

    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { contractId } = await params;
    const { notes } = await request.json();

    // Find contract
    const contract = await Contract.findOne({ contractId }).populate('userId');
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Validate contract state
    if (contract.adminApprovalStatus !== 'pending') {
      return NextResponse.json(
        {
          error: `Contract is already ${contract.adminApprovalStatus}`,
          currentStatus: contract.adminApprovalStatus
        },
        { status: 409 }
      );
    }

    if (contract.status !== 'signed') {
      return NextResponse.json(
        {
          error: "Contract must be signed before approval",
          currentStatus: contract.status
        },
        { status: 400 }
      );
    }

    // Update contract approval status
    contract.adminApprovalStatus = 'approved';
    contract.status = 'approved';
    contract.adminApprovedBy = adminUser._id;
    contract.adminApprovedDate = new Date();
    contract.paymentAllowed = true;

    // Update the last signature attempt
    if (contract.signatureAttempts.length > 0) {
      const lastAttempt = contract.signatureAttempts[contract.signatureAttempts.length - 1];
      lastAttempt.reviewStatus = 'approved';
      lastAttempt.reviewedBy = adminUser._id;
      lastAttempt.reviewedAt = new Date();
      if (notes) {
        lastAttempt.adminNotes = notes;
      }
    }

    await contract.save();

    // Check if user has already paid and update PlantInstance status if needed
    try {
      const existingPlantInstance = await PlantInstance.findOne({
        contractNumber: contract.contractId
      });

      if (existingPlantInstance && existingPlantInstance.status === "Pending") {
        // User has already paid but contract was just approved - update status
        existingPlantInstance.status = "Kontrak Baru";
        existingPlantInstance.lastUpdate = new Date().toLocaleDateString("id-ID");

        // Update history
        existingPlantInstance.history.push({
          id: `HISTORY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          action: "Kontrak Baru",
          type: "Kontrak Baru",
          date: new Date().toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          }),
          description: `Status diubah dari Pending ke Kontrak Baru setelah kontrak disetujui admin`,
          addedBy: adminUser.fullName || adminUser.email,
        });

        await existingPlantInstance.save();

        console.log("PlantInstance status updated from Pending to Kontrak Baru:", {
          contractId: contract.contractId,
          plantInstanceId: existingPlantInstance.id
        });
      }
    } catch (plantError) {
      console.error("Error updating PlantInstance status:", plantError);
      // Continue with contract approval even if PlantInstance update fails
    }

    // Note: PlantInstance will be created after payment, not after contract approval
    console.log("Contract approved - PlantInstance will be created after user makes payment:", {
      contractId: contract.contractId,
      paymentType: contract.paymentType
    });

    // Update Investor record status to "Kontrak Baru"
    try {
      const investor = await Investor.findOne({
        "investments.investmentId": contract.contractId
      });

      if (investor) {
        const investmentIndex = investor.investments.findIndex(
          (inv: any) => inv.investmentId === contract.contractId
        );

        if (investmentIndex !== -1) {
          // Update investment status to "approved"
          investor.investments[investmentIndex].status = "approved";
          investor.investments[investmentIndex].adminApprovedDate = new Date();

          await investor.save();

          console.log("Investor record updated:", {
            investorId: investor._id,
            contractId: contract.contractId,
            newStatus: "Kontrak Baru"
          });
        }
      } else {
        console.warn("Investor record not found for contract:", contract.contractId);
      }
    } catch (investorError) {
      console.error("Error updating investor record:", investorError);
      // Continue with contract approval even if investor update fails
    }

    console.log("Contract approved successfully:", {
      contractId: contract.contractId,
      adminId: adminUser._id,
      adminEmail: adminUser.email,
      message: "PlantInstance will be created after payment"
    });

    // Stamp contract with e-materai if payment is already completed
    // For full payments: check paymentCompleted flag
    // For installments: check if first installment has been approved
    let shouldStamp = false;
    
    if (contract.paymentType === 'full') {
      shouldStamp = contract.paymentCompleted === true;
    } else if (contract.paymentType === 'cicilan') {
      // For installments, check if first installment has been approved
      const Payment = (await import("@/models/Payment")).default;
      const firstInstallment = await Payment.findOne({
        cicilanOrderId: contract.contractId,
        installmentNumber: 1,
        adminStatus: "approved"
      });
      shouldStamp = firstInstallment !== null;
    }
    
    if (shouldStamp) {
      console.log(
        `📋 Admin approved contract with payment already completed - stamping with e-materai: ${contract.contractId}`
      );
      const stampedUrl = await stampContractAfterPayment(contract.contractId);
      if (stampedUrl) {
        console.log(
          `✅ Contract stamped successfully after admin approval: ${stampedUrl}`
        );
      } else {
        console.log(
          `⚠️ Contract stamping failed after admin approval, but approval succeeded`
        );
      }
    } else {
      console.log(
        `ℹ️ Payment not yet completed, stamping will occur after payment`
      );
    }

    // Send email notification to user
    try {
      if (contract.userId && contract.userId.email) {
        const userEmail = contract.userId.email;
        const userName = contract.userId.fullName || contract.userId.name || 'Investor';
        const approvedDate = new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const emailTemplate = emailTemplates.contractApproved(
          userName,
          contract.contractNumber || contract.contractId,
          contract.contractId,
          contract.productName || 'Investasi Tanaman',
          contract.totalAmount || 0,
          approvedDate
        );

        const emailResult = await sendEmail(
          userEmail,
          emailTemplate.subject,
          emailTemplate.html
        );

        if (emailResult.success) {
          console.log("Contract approval email sent successfully to:", userEmail);
        } else {
          console.error("Failed to send contract approval email:", emailResult.error);
        }
      } else {
        console.warn("No user email found for contract:", contract.contractId);
      }
    } catch (emailError) {
      console.error("Error sending contract approval email:", emailError);
      // Continue with response even if email fails
    }

    return NextResponse.json({
      success: true,
      data: {
        contractId: contract.contractId,
        contractNumber: contract.contractNumber,
        status: contract.status,
        adminApprovalStatus: contract.adminApprovalStatus,
        approvedBy: adminUser.fullName || adminUser.email,
        approvedAt: contract.adminApprovedDate,
        paymentAllowed: contract.paymentAllowed,
        plantInstanceId: contract.plantInstanceId?.toString()
      }
    });

  } catch (error) {
    console.error("Error approving contract:", error);

    return NextResponse.json(
      {
        error: "Failed to approve contract",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}