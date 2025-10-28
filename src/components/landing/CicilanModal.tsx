"use client";

import { formatIDRCurrency } from "@/lib/utils/currency";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface InstallmentOption {
  period: string;
  amount: number;
  perTree: number;
}

interface CicilanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  onSuccess?: (title: string, message: string) => void;
  onError?: (title: string, message: string) => void;
}

export function CicilanModal({
  isOpen,
  onClose,
  plan,
  onSuccess,
  onError,
}: CicilanModalProps) {
  const { data: session } = useSession();
  const { t } = useLanguage();
  const [selectedTerm, setSelectedTerm] = useState<number>(0);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [contractDetails, setContractDetails] = useState<any>(null);
  const [referralCode, setReferralCode] = useState("");

  // Validate referral code format
  const validateReferralCode = (code: string) => {
    if (!code) return true; // Optional field
    if (code.length !== 6) return false;
    return /^[A-Z0-9]{6}$/.test(code);
  };

  // Use installmentOptions from plan data - filter to only monthly and annual options
  const paymentTermsAll: InstallmentOption[] =
    plan?.investmentPlan?.installmentOptions || [];
  const paymentTerms: InstallmentOption[] = paymentTermsAll.filter(
    (t) => t.period === "Per Bulan" || t.period === "Per Tahun"
  );

  // If available terms change (e.g., filtering), ensure selectedTerm is valid
  useEffect(() => {
    if (paymentTerms.length === 0) return;
    if (selectedTerm >= paymentTerms.length) {
      setSelectedTerm(0);
    }
  }, [paymentTerms, selectedTerm]);

  const selectedTermDetails = paymentTerms[selectedTerm];

  // Calculate price based on selected package using installmentOptions
  const currentPrice = selectedPackage ? selectedPackage.installmentPrice : 0;

  // Get duration years from plan (e.g., 3, 5, 8 years)
  const durationYears = plan?.investmentPlan?.durationYears || 5; // Default to 5 years if not set

  // Calculate installment count based on period and duration
  const getInstallmentCount = (period: string) => {
    switch (period) {
      case "Per Bulan":
        return durationYears * 12; // e.g., 5 years = 60 months, 8 years = 96 months
      case "Per Tahun":
        return durationYears; // e.g., 5 years = 5, 8 years = 8
      default:
        return durationYears * 12; // fallback to monthly
    }
  };

  const installmentAmount =
    selectedTermDetails && currentPrice
      ? Math.ceil(
          currentPrice / getInstallmentCount(selectedTermDetails.period)
        )
      : 0;

  // Convert Indonesian payment terms to English for API
  const convertPaymentTerm = (period: string): string => {
    switch (period) {
      case "Per Bulan":
        return "monthly";
      case "Per Tahun":
        return "annual";
      default:
        return "monthly"; // fallback
    }
  };

  // Generate contract details using API
  const generateContractDetails = async (
    packageData: any,
    paymentTermData: any
  ) => {
    const productName = `${
      plan.investmentPlan?.name || plan.name || "Paket"
    } (${packageData?.name || "Paket"})`;

    try {
      const response = await fetch("/api/contract/generate-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productName }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate contract number");
      }

      const result = await response.json();

      return {
        contractId: result.data.contractId,
        contractNumber: result.data.contractNumber,
        productName,
        productId: (plan.investmentPlan?.name || plan.name || "paket")
          .toLowerCase()
          .replace(/\s+/g, "-"),
        totalAmount: currentPrice,
        paymentType: "cicilan",
        paymentTerm: convertPaymentTerm(paymentTermData.period),
        totalInstallments: getInstallmentCount(paymentTermData.period),
        installmentAmount: installmentAmount,
        durationYears: durationYears, // Pass duration years to contract
        status: "draft",
      };
    } catch (error) {
      console.error("Error generating contract details:", error);
      // Fallback to old method if API fails
      const year = new Date().getFullYear();
      const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const contractNumber = `CONTRACT-${year}-${randomId}`;

      const contractId = `CONTRACT-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;

      return {
        contractId,
        contractNumber,
        productName,
        productId: (plan.investmentPlan?.name || plan.name || "paket")
          .toLowerCase()
          .replace(/\s+/g, "-"),
        totalAmount: currentPrice,
        paymentType: "cicilan",
        paymentTerm: convertPaymentTerm(paymentTermData.period),
        totalInstallments: getInstallmentCount(paymentTermData.period),
        installmentAmount: installmentAmount,
        durationYears: durationYears, // Pass duration years to contract
        status: "draft",
      };
    }
  };

  const handleCreateCicilan = async () => {
    if (
      !session?.user?.email ||
      !plan ||
      !selectedPackage ||
      !selectedTermDetails
    )
      return;

    setIsLoading(true);

    try {
      // Generate contract details on frontend only
      const frontendContractDetails = await generateContractDetails(
        selectedPackage,
        selectedTermDetails
      );

      // Show order confirmation modal with frontend-generated details
      setContractDetails(frontendContractDetails);
      setShowOrderConfirmation(true);
    } catch (error) {
      console.error("Error generating contract details:", error);
      onError?.(t("cicilan.error"), t("cicilan.errorPreparingContract"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    if (!contractDetails) return;

    // Validate referral code if provided
    if (referralCode && !validateReferralCode(referralCode)) {
      onError?.(
        t("cicilan.invalidReferralCode"),
        t("cicilan.invalidReferralCodeMessage")
      );
      return;
    }

    setIsLoading(true);

    try {
      console.log("Creating cicilan contract with data:", {
        productName: contractDetails.productName,
        productId: contractDetails.productId,
        totalAmount: contractDetails.totalAmount,
        paymentType: contractDetails.paymentType,
        paymentTerm: contractDetails.paymentTerm,
        totalInstallments: contractDetails.totalInstallments,
        installmentAmount: contractDetails.installmentAmount,
        contractNumber: contractDetails.contractNumber,
        referralCode: referralCode || undefined,
      });

      // Now create the actual contract in database
      const contractResponse = await fetch("/api/contract/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName: contractDetails.productName,
          productId: contractDetails.productId,
          totalAmount: contractDetails.totalAmount,
          paymentType: contractDetails.paymentType,
          paymentTerm: contractDetails.paymentTerm,
          totalInstallments: contractDetails.totalInstallments,
          installmentAmount: contractDetails.installmentAmount,
          durationYears: contractDetails.durationYears,
          contractNumber: contractDetails.contractNumber,
          referralCode: referralCode || undefined,
        }),
      });

      console.log(
        "Cicilan contract response status:",
        contractResponse.status,
        contractResponse.statusText
      );

      let contractResult;
      try {
        contractResult = await contractResponse.json();
        console.log("Cicilan contract result:", contractResult);
      } catch (parseError) {
        console.error("Failed to parse cicilan contract response:", parseError);
        onError?.(
          t("cicilan.contractError"),
          "Gagal memproses respons server. Silakan coba lagi."
        );
        return;
      }

      if (!contractResponse.ok) {
        console.error(
          "Cicilan contract creation failed with status:",
          contractResponse.status
        );
        console.error(
          "Cicilan contract creation error details:",
          contractResult
        );
        onError?.(
          t("cicilan.contractError"),
          contractResult?.error ||
            `Server error (${contractResponse.status}). Silakan coba lagi.`
        );
        return;
      }

      if (!contractResult.success || !contractResult.data?.contractId) {
        onError?.(
          t("cicilan.contractError"),
          "Gagal membuat kontrak. Silakan coba lagi."
        );
        return;
      }

      // Use the database-generated contractId for redirection
      const actualContractId = contractResult.data.contractId;

      onSuccess?.(
        t("cicilan.contractCreated"),
        t("cicilan.contractCreatedMessage", {
          contractNumber: contractDetails.contractNumber,
        })
      );
      onClose();
      setReferralCode(""); // Reset referral code
      // Redirect to contract signing page with actual contract ID
      window.location.href = `/contract/${actualContractId}`;
    } catch (error) {
      console.error("Error creating contract:", error);
      onError?.(t("cicilan.error"), t("cicilan.errorCreatingContract"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !plan || !paymentTerms || paymentTerms.length === 0)
    return null;

  // Show order confirmation modal
  if (showOrderConfirmation && contractDetails) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setShowOrderConfirmation(false);
            setContractDetails(null);
            setReferralCode(""); // Reset referral code
          }}
        >
          <motion.div
            className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col border-2 border-[#324D3E]/20"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-6 pb-0">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                  {t("cicilan.orderDetails")}
                </h3>
                <button
                  onClick={() => {
                    setShowOrderConfirmation(false);
                    setContractDetails(null);
                    setReferralCode(""); // Reset referral code
                  }}
                  className="text-[#324D3E]/60 hover:text-[#324D3E] transition-colors p-2 rounded-full hover:bg-[#324D3E]/10"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="pb-6">
                {/* Order Details */}
                <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-6 rounded-2xl border border-[#324D3E]/20 mb-6">
                  <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                    {t("cicilan.contractDetails")}
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col gap-2">
                      <span className="text-[#324D3E]/80 font-medium">
                        {t("cicilan.contractNumber")}
                      </span>
                      <span className="font-bold text-[#324D3E] text-base font-mono break-all">
                        {contractDetails.contractNumber}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[#324D3E]/80 font-medium">
                        {t("cicilan.packageType")}
                      </span>
                      <span className="font-bold text-[#324D3E] text-base font-mono break-all">
                        {contractDetails.productName}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[#324D3E]/80 font-medium">
                        {t("cicilan.packagePrice")}
                      </span>
                      <span className="font-bold text-[#324D3E] text-base font-mono break-all">
                        Rp {contractDetails.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[#324D3E]/80 font-medium">
                        {t("cicilan.paymentType")}
                      </span>
                      <span className="font-bold text-[#324D3E] text-base font-mono break-all capitalize">
                        {contractDetails.paymentType}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[#324D3E]/80 font-medium">
                        {t("cicilan.installmentPer", {
                          period: selectedTermDetails?.period,
                        })}
                      </span>
                      <span className="font-bold text-emerald-600 text-base font-mono break-all">
                        Rp {installmentAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Referral Code Input */}
                <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-6 rounded-2xl border border-[#324D3E]/20 mb-6">
                  <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                    {t("cicilan.referralCode")}
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-col gap-2">
                      <span className="text-[#324D3E]/80 font-medium">
                        {t("cicilan.enterReferralCode")}
                      </span>
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) =>
                          setReferralCode(e.target.value.toUpperCase())
                        }
                        className="px-3 py-3 border-2 border-[#324D3E]/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#324D3E] focus:border-[#324D3E] font-mono text-base text-[#324D3E] bg-white/80"
                        placeholder="ABC123"
                        maxLength={6}
                        pattern="[A-Z0-9]{6}"
                      />
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 mb-1">
                        {t("cicilan.orderConfirmation")}
                      </p>
                      <p className="text-blue-700">
                        {t("cicilan.orderConfirmationMessage")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Action Buttons */}
              <div className="flex-shrink-0 px-6 pb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowOrderConfirmation(false);
                      setContractDetails(null);
                      setReferralCode(""); // Reset referral code
                    }}
                    className="flex-1 px-6 py-3 border-2 border-[#324D3E]/30 text-[#324D3E] rounded-full font-bold hover:bg-[#324D3E]/10 transition-all duration-300 font-[family-name:var(--font-poppins)]"
                  >
                    {t("cicilan.back")}
                  </button>
                  <button
                    onClick={handleConfirmOrder}
                    disabled={isLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full font-bold hover:shadow-lg transition-all duration-300 font-[family-name:var(--font-poppins)] disabled:opacity-50"
                  >
                    {isLoading
                      ? t("cicilan.creatingContract")
                      : t("cicilan.continue")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-md w-full h-[80vh] flex flex-col border-2 border-[#324D3E]/20"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-6 pb-0">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                  {t("cicilan.title", {
                    plantName:
                      plan?.investmentPlan?.name || plan?.name || "Paket",
                  })}
                </h3>
                <button
                  onClick={onClose}
                  className="text-[#324D3E]/60 hover:text-[#324D3E] transition-colors p-2 rounded-full hover:bg-[#324D3E]/10"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              <div className="pb-6">
                {/* Package Selection */}
                <div className="mb-6">
                  <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                    {t("cicilan.choosePackage")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(plan?.treePackages || [])
                      .filter((pkg: any) => pkg.enabled)
                      .map((treePackage: any, index: number) => (
                        <label
                          key={index}
                          className={`flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            selectedPackage?.treeCount === treePackage.treeCount
                              ? "border-[#324D3E] bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 shadow-lg"
                              : "border-[#324D3E]/20 hover:border-[#324D3E]/40 bg-white/80"
                          }`}
                        >
                          <input
                            type="radio"
                            name="package"
                            value={treePackage.treeCount}
                            checked={
                              selectedPackage?.treeCount ===
                              treePackage.treeCount
                            }
                            onChange={() => setSelectedPackage(treePackage)}
                            className="sr-only"
                          />
                          <div className="text-3xl mb-2">
                            {treePackage.treeCount === 1 ? "🌱" : "🌳"}
                          </div>
                          <div className="font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                            {treePackage.name}
                          </div>
                          <div className="text-sm text-[#324D3E]/70 font-medium text-center">
                            {treePackage.description}
                          </div>
                          <div className="font-bold text-[#324D3E] text-lg mt-2">
                            Rp{" "}
                            {treePackage.installmentPrice.toLocaleString(
                              "id-ID"
                            )}
                          </div>
                        </label>
                      ))}
                  </div>
                  {(!plan?.treePackages ||
                    plan.treePackages.filter((pkg: any) => pkg.enabled)
                      .length === 0) && (
                    <div className="text-center py-6">
                      <p className="text-[#324D3E]/60">
                        {t("cicilan.noPackagesAvailable")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-6 rounded-2xl border border-[#324D3E]/20">
                    <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                      {t("cicilan.packageDetails")}
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[#324D3E]/80 font-medium">
                          {t("cicilan.selectedPackage")}
                        </span>
                        <span className="font-bold text-[#324D3E] text-lg">
                          {selectedPackage?.name || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[#324D3E]/80 font-medium">
                          {t("cicilan.treeCount")}
                        </span>
                        <span className="font-bold text-[#324D3E] text-base font-mono break-all">
                          {selectedPackage?.treeCount || "-"}{" "}
                          {t("cicilan.trees")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#324D3E]/80 font-medium">
                          {t("cicilan.totalInvestment")}
                        </span>
                        <span className="font-bold text-[#324D3E] text-lg">
                          Rp {currentPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#324D3E]/80 font-medium">
                          {t("cicilan.estimatedReturn")}
                        </span>
                        <span className="font-bold text-emerald-600 text-lg">
                          {plan?.investmentPlan?.returns
                            ? `Rp ${formatIDRCurrency(
                                plan.investmentPlan.returns
                              )}`
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                    {t("cicilan.chooseInstallmentPeriod")}
                  </h4>
                  <div className="space-y-3">
                    {paymentTerms.map((term, termIndex) => {
                      const termPrice = selectedPackage?.installmentPrice || 0;
                      const termInstallmentCount = getInstallmentCount(
                        term.period
                      );
                      const termInstallmentAmount = termPrice
                        ? Math.ceil(termPrice / termInstallmentCount)
                        : 0;
                      return (
                        <label
                          key={termIndex}
                          className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            selectedTerm === termIndex
                              ? "border-[#324D3E] bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 shadow-lg"
                              : "border-[#324D3E]/20 hover:border-[#324D3E]/40 bg-white/80"
                          }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="paymentTerm"
                              value={termIndex}
                              checked={selectedTerm === termIndex}
                              onChange={() => setSelectedTerm(termIndex)}
                              className="w-5 h-5 text-[#324D3E] mr-4 accent-[#324D3E]"
                            />
                            <div>
                              <div className="font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                                {term.period}
                              </div>
                              <div className="text-sm text-[#324D3E]/70 font-medium">
                                {termInstallmentCount}{" "}
                                {t("cicilan.timesPayment")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#324D3E] text-lg">
                              Rp {termInstallmentAmount.toLocaleString("id-ID")}
                            </div>
                            <div className="text-sm text-[#324D3E]/70 font-medium">
                              {t("cicilan.perInstallment")}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl mb-6 border border-emerald-200">
                  <h5 className="font-bold text-[#324D3E] mb-3 font-[family-name:var(--font-poppins)]">
                    {t("cicilan.howItWorks")}
                  </h5>
                  <ul className="text-sm text-[#324D3E]/80 space-y-2 font-medium">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">1.</span>
                      <span>{t("cicilan.step1")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">2.</span>
                      <span>{t("cicilan.step2")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">3.</span>
                      <span>{t("cicilan.step3")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">4.</span>
                      <span>{t("cicilan.step4")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">5.</span>
                      <span>{t("cicilan.step5")}</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-6 py-3 border-2 border-[#324D3E]/30 text-[#324D3E] rounded-full font-bold hover:bg-[#324D3E]/10 transition-all duration-300 font-[family-name:var(--font-poppins)] disabled:opacity-50"
                  >
                    {t("cicilan.cancel")}
                  </button>
                  <button
                    onClick={handleCreateCicilan}
                    disabled={isLoading || !selectedPackage}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full font-bold hover:shadow-lg transition-all duration-300 font-[family-name:var(--font-poppins)] disabled:opacity-50"
                  >
                    {isLoading
                      ? t("cicilan.processing")
                      : t("cicilan.createContract")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
