/**
 * Contract Stamping Helper
 * Handles generating contract PDFs and stamping them with e-materai after payment
 */

import Contract from "@/models/Contract";
import { stampContract } from "./ematerai-service";
import { generateContractPDFBuffer } from "./contract-pdf";
import mongoose from "mongoose";

/**
 * Generate and stamp a contract with e-materai
 * This should be called when BOTH conditions are met:
 * 1. Admin has approved the contract signature
 * 2. User has completed payment (full or first installment)
 *
 * @param contractId - The contract ID
 * @param mongoSession - Optional mongoose session for transactions
 * @returns The stamped contract URL or null if failed
 */
export async function stampContractAfterPayment(
  contractId: string,
  mongoSession?: mongoose.ClientSession
): Promise<string | null> {
  try {
    console.log(`[Contract Stamping] Processing contract: ${contractId}`);

    // Find the contract with populated user data
    const contract = await Contract.findOne({ contractId })
      .populate("userId")
      .session(mongoSession || null);

    if (!contract) {
      console.error(`[Contract Stamping] Contract not found: ${contractId}`);
      return null;
    }

    // Check if already stamped
    if (contract.emateraiStamped) {
      console.log(
        `[Contract Stamping] Contract already stamped: ${contractId}`
      );
      return contract.emateraiStampedUrl || null;
    }

    const user = contract.userId as any;

    if (!user) {
      console.error(
        `[Contract Stamping] User not found for contract: ${contractId}`
      );
      return null;
    }

    // Get approved signature
    const approvedSignature = contract.signatureAttempts.find(
      (attempt: any) => attempt.reviewStatus === "approved"
    );

    if (!approvedSignature) {
      console.error(
        `[Contract Stamping] No approved signature for contract: ${contractId}`
      );
      return null;
    }

    // Prepare contract data for PDF generation
    const contractData = {
      contractNumber: contract.contractNumber,
      contractDate: contract.contractDate,
      investment: {
        productName: contract.productName,
        totalAmount: contract.totalAmount,
      },
      investor: {
        name: user.fullName || user.name || "",
        nik: user.nik,
        dateOfBirth: user.dateOfBirth,
        email: user.email,
        phoneNumber: user.phoneNumber,
        occupation: user.occupation,
        address: user.address,
        village: user.village,
        city: user.city,
        province: user.province,
        postalCode: user.postalCode,
      },
      signatureDataURL: approvedSignature.signatureData,
      // Payment terms for PASAL IV
      paymentType: contract.paymentType,
      paymentTerm: contract.paymentTerm,
      totalInstallments: contract.totalInstallments,
      durationYears: contract.durationYears,
    };

    // Generate contract PDF
    console.log(
      `[Contract Stamping] Generating PDF for contract: ${contractId}`
    );
    const pdfBuffer = await generateContractPDFBuffer(contractData);

    // Stamp the contract with e-materai
    console.log(`[Contract Stamping] Stamping contract: ${contractId}`);
    const stampResponse = await stampContract(
      pdfBuffer,
      `contract-${contractId}.pdf`,
      {
        x: 230,
        xr: 385 * 0.9, // 20mm width
        y: 220, // At signature height (297 - 85 = 212mm from bottom)
        yr: 365 * 0.9, // 20mm height
        page: 6, // Signature is on page 5
      }
    );

    // Update contract with stamp info
    contract.emateraiStamped = true;
    contract.emateraiUuid = stampResponse.data.uuid;
    contract.emateraiStampedUrl = stampResponse.data.file_stamp;
    contract.emateraiStampedAt = new Date();

    await contract.save({ session: mongoSession || undefined });

    console.log(
      `[Contract Stamping] Success! Stamped URL: ${stampResponse.data.file_stamp}`
    );

    return stampResponse.data.file_stamp;
  } catch (error) {
    console.error(`[Contract Stamping] Error stamping contract:`, error);
    // Don't throw - stamping failure shouldn't fail the payment
    // We can retry later if needed
    return null;
  }
}
