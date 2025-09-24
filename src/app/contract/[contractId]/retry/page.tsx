"use client";

import { useAlert } from "@/components/ui/Alert";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Dynamically import SignatureCanvas to avoid SSR issues
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), {
  ssr: false,
}) as React.ComponentType<any>;

interface ContractRetryData {
  contractId: string;
  contractNumber: string;
  status: string;
  adminApprovalStatus: string;
  currentAttempt: number;
  maxAttempts: number;
  canRetry: boolean;
  lastAttempt: {
    attemptNumber: number;
    submittedAt: string;
    reviewStatus: string;
    rejectionReason?: string;
    adminNotes?: string;
  } | null;
}

interface ContractBasicInfo {
  productName: string;
  totalAmount: number;
  paymentType: string;
  userFullName: string;
}

export default function ContractRetryPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.contractId as string;
  const [retryData, setRetryData] = useState<ContractRetryData | null>(null);
  const [contractInfo, setContractInfo] = useState<ContractBasicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showFullContract, setShowFullContract] = useState(false);
  const sigCanvas = useRef<any>(null);
  const { showSuccess, showError, AlertComponent } = useAlert();

  useEffect(() => {
    if (contractId) {
      fetchRetryData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const fetchRetryData = async () => {
    try {
      setLoading(true);

      // Fetch retry status
      const retryResponse = await fetch(`/api/contract/${contractId}/sign`);
      if (retryResponse.ok) {
        const retryResult = await retryResponse.json();
        setRetryData(retryResult.data);

        // If not eligible for retry, redirect to contract page
        if (!retryResult.data.canRetry) {
          if (retryResult.data.status === 'approved') {
            router.push(`/contract/${contractId}`);
            return;
          }
          if (retryResult.data.status === 'permanently_rejected') {
            showError("Error", "Maximum retry attempts exceeded. This contract has been permanently rejected.");
            return;
          }
        }
      }

      // Fetch basic contract info for display
      const contractResponse = await fetch(`/api/contract/${contractId}`);
      if (contractResponse.ok) {
        const contractResult = await contractResponse.json();
        setContractInfo({
          productName: contractResult.data.investment.productName,
          totalAmount: contractResult.data.investment.totalAmount,
          paymentType: contractResult.data.investment.paymentType,
          userFullName: contractResult.data.investor.name
        });
      }

    } catch (error) {
      console.error("Error fetching retry data:", error);
      showError("Error", "Failed to load contract retry information");
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleRetrySignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      showError("Error", "Please provide your signature before submitting");
      return;
    }

    if (!retryData?.canRetry) {
      showError("Error", "You cannot retry signing this contract");
      return;
    }

    try {
      setSigning(true);

      // Get signature as image data
      const signatureDataURL = sigCanvas.current.toDataURL();

      const response = await fetch(`/api/contract/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureData: signatureDataURL,
          isRetry: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSuccess(
          "Success",
          `Signature retry ${result.data.attemptNumber} submitted successfully. Please wait for admin review.`
        );

        // Redirect to a status page or main contract page
        setTimeout(() => {
          router.push(`/contract/${contractId}`);
        }, 2000);
      } else {
        const error = await response.json();
        showError("Error", error.error || "Failed to submit retry signature");
      }

    } catch (error) {
      console.error("Error submitting retry signature:", error);
      showError("Error", "Failed to submit signature retry");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#324D3E] mx-auto"></div>
          <p className="text-[#324D3E] mt-4 text-lg">Loading retry information...</p>
        </div>
      </div>
    );
  }

  if (!retryData || !contractInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Contract Retry Information Not Available
          </h1>
          <p className="text-gray-600 mb-4">
            Unable to load contract retry information.
          </p>
          <button
            onClick={() => router.push(`/contract/${contractId}`)}
            className="bg-[#324D3E] text-white px-6 py-2 rounded-lg hover:bg-[#4C3D19]"
          >
            Back to Contract
          </button>
        </div>
      </div>
    );
  }

  if (!retryData.canRetry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            {retryData.status === 'permanently_rejected'
              ? 'Maximum Retry Attempts Exceeded'
              : 'Retry Not Available'
            }
          </h1>
          <p className="text-gray-600 mb-4">
            {retryData.status === 'permanently_rejected'
              ? 'This contract has been permanently rejected due to exceeding the maximum number of retry attempts.'
              : 'You cannot retry signing this contract at this time.'
            }
          </p>
          <button
            onClick={() => router.push('/plants')}
            className="bg-[#324D3E] text-white px-6 py-2 rounded-lg hover:bg-[#4C3D19]"
          >
            Back to Investments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#324D3E]/10 via-white to-[#4C3D19]/10 py-8">
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
            Re-sign Contract
          </h1>
          <p className="text-[#889063]">Contract: {retryData.contractNumber}</p>
        </div>

        {/* Retry Status Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Contract Signature Retry Required
              </h3>
            </div>
          </div>

          <div className="text-sm text-yellow-700 space-y-2">
            <div className="flex justify-between">
              <span>Attempt:</span>
              <span className="font-semibold">
                {retryData.currentAttempt + 1} of {retryData.maxAttempts}
              </span>
            </div>

            {retryData.lastAttempt?.rejectionReason && (
              <div>
                <span className="font-medium">Rejection Reason:</span>
                <div className="mt-1 p-2 bg-yellow-100 rounded text-yellow-800">
                  {retryData.lastAttempt.rejectionReason}
                </div>
              </div>
            )}

            {retryData.lastAttempt?.adminNotes && (
              <div>
                <span className="font-medium">Admin Notes:</span>
                <div className="mt-1 p-2 bg-yellow-100 rounded text-yellow-800">
                  {retryData.lastAttempt.adminNotes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contract Summary */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#324D3E]/10 mb-8">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-[#324D3E]">Contract Summary</h2>
              <button
                onClick={() => setShowFullContract(!showFullContract)}
                className="text-[#324D3E] hover:text-[#4C3D19] text-sm font-medium"
              >
                {showFullContract ? 'Hide' : 'View'} Full Contract
              </button>
            </div>

            {showFullContract ? (
              // Full contract view (you can include the original contract component here)
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#889063]">Product:</span>
                    <span className="ml-2 font-medium">{contractInfo.productName}</span>
                  </div>
                  <div>
                    <span className="text-[#889063]">Amount:</span>
                    <span className="ml-2 font-medium">
                      Rp {contractInfo.totalAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#889063]">Payment Type:</span>
                    <span className="ml-2 font-medium">{contractInfo.paymentType.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-[#889063]">Investor:</span>
                    <span className="ml-2 font-medium">{contractInfo.userFullName}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  This is a summary view. The full contract terms remain the same as previously shown.
                </div>
              </div>
            ) : (
              // Collapsed summary view
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#889063]">Product:</span>
                  <span className="font-medium">{contractInfo.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#889063]">Amount:</span>
                  <span className="font-medium">
                    Rp {contractInfo.totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#889063]">Payment Type:</span>
                  <span className="font-medium">{contractInfo.paymentType.toUpperCase()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#324D3E]/10">
          <div className="p-8">
            <h3 className="text-xl font-semibold text-[#324D3E] mb-6 text-center">
              Re-submit Your Signature
            </h3>

            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <p className="text-[#889063] text-center text-sm mb-2">
                  Please review the feedback above and provide a clearer signature:
                </p>
                <div className="text-center text-xs text-gray-500">
                  Attempt {retryData.currentAttempt + 1} of {retryData.maxAttempts}
                </div>
              </div>

              <div className="border-2 border-[#324D3E]/20 rounded-xl p-4 mb-4">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    width: 400,
                    height: 200,
                    className:
                      "signature-canvas w-full h-48 border border-gray-300 rounded-lg",
                    style: { width: "100%", height: "200px" },
                  }}
                  backgroundColor="rgb(255, 255, 255)"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={clearSignature}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-medium transition-colors"
                >
                  Clear Signature
                </button>

                <button
                  onClick={handleRetrySignature}
                  disabled={signing}
                  className="flex-1 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </span>
                  ) : (
                    "Submit Re-signature"
                  )}
                </button>
              </div>

              <div className="text-center mt-6">
                <p className="text-sm text-[#889063]">
                  This signature will be reviewed by admin for approval
                </p>
                {retryData.currentAttempt + 1 === retryData.maxAttempts && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    ⚠️ This is your final attempt
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}