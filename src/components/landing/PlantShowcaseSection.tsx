"use client";

import { useAlert } from "@/components/ui/Alert";
import { formatIDRCurrency } from "@/lib/utils/currency";
import {
  AnimatePresence,
  motion,
  LazyMotion,
  domAnimation,
} from "framer-motion";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CicilanModal } from "./CicilanModal";
import { useLanguage } from "@/contexts/LanguageContext";

// Animation variants
const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

const slideInFromLeft: any = {
  hidden: { opacity: 0, x: -100, scale: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

const slideInFromRight: any = {
  hidden: { opacity: 0, x: 100, scale: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

const fadeInUp: any = {
  hidden: { opacity: 0, y: 60, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 120, damping: 20 },
  },
};

const scaleIn: any = {
  hidden: { opacity: 0, scale: 0.5, rotate: -10 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
};

const floatingAnimation: any = {
  animate: {
    y: [-10, 10, -10],
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
};

export default function PlantShowcaseSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [plants, setPlantsData] = useState<any>([]);
  const [plantsLoading, setPlantsLoading] = useState(true);
  const [cicilanModal, setCicilanModal] = useState<{
    isOpen: boolean;
    plant: any;
  }>({
    isOpen: false,
    plant: null,
  });
  const [treeSelectionModal, setTreeSelectionModal] = useState<{
    isOpen: boolean;
    plant: any;
    selectedPackage: any | null;
  }>({
    isOpen: false,
    plant: null,
    selectedPackage: null,
  });
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [contractDetails, setContractDetails] = useState<any>(null);
  const { showSuccess, showError, AlertComponent } = useAlert();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [referralCode, setReferralCode] = useState("");

  // Validate referral code format
  const validateReferralCode = (code: string) => {
    if (!code) return true; // Optional field
    if (code.length !== 6) return false;
    return /^[A-Z0-9]{6}$/.test(code);
  };

  // Fetch plants data from database
  useEffect(() => {
    const fetchPlantsData = async () => {
      try {
        setPlantsLoading(true);
        const response = await fetch("/api/plant-showcase");

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            // Transform database data to match component expectations
            const transformedData = result.data.map((plant: any) => ({
              name: plant.name,
              nameEn: plant.nameEn,
              years: plant.years,
              location: plant.location,
              description: plant.description,
              productOlahan: plant.productOlahan || [],
              pricing: plant.pricing,
              investmentPlan: plant.investmentPlan,
              treePackages: plant.treePackages || [],
            }));
            setPlantsData(transformedData);
            console.log(
              "✅ Loaded plant data from database:",
              transformedData.length,
              "plants"
            );
          } else {
            console.warn("No plant data found in database, using defaults");
          }
        } else {
          console.warn("Failed to fetch plants data, using defaults");
        }
      } catch (error) {
        console.warn("Error fetching plants data:", error);
        // Keep using defaultPlants as fallback
      } finally {
        setPlantsLoading(false);
      }
    };

    fetchPlantsData();
  }, []);

  const nextPlant = () => setCurrentIndex((prev) => (prev + 1) % plants.length);
  const prevPlant = () =>
    setCurrentIndex((prev) => (prev - 1 + plants.length) % plants.length);

  // Show loading indicator while fetching data
  if (plantsLoading) {
    return (
      <motion.section
        className="bg-[#4A5C57] min-h-screen w-full overflow-hidden relative flex flex-col items-center justify-center"
        style={{
          backgroundImage: "url(/landing/product-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg font-medium">{t("plants.loading")}</p>
        </div>
      </motion.section>
    );
  }

  const handleInvestment = (plant: any) => {
    if (!session) {
      router.push("/login");
      return;
    }
    setTreeSelectionModal({
      isOpen: true,
      plant: plant,
      selectedPackage: null,
    });
  };

  const handlePackageSelect = (packageInfo: any) => {
    setTreeSelectionModal((prev) => ({
      ...prev,
      selectedPackage: packageInfo,
    }));
  };

  // Generate contract details using API
  const generateContractDetails = async (plant: any, selectedPackage: any) => {
    const productName = `${plant.investmentPlan.name} - ${selectedPackage.name}`;

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
        productId: `${plant.investmentPlan.name}-${selectedPackage.treeCount}`
          .toLowerCase()
          .replace(/\s+/g, "-"),
        totalAmount: selectedPackage.price,
        paymentType: "full",
        selectedPackage: selectedPackage,
        plant: plant,
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
        productId: `${plant.investmentPlan.name}-${selectedPackage.treeCount}`
          .toLowerCase()
          .replace(/\s+/g, "-"),
        totalAmount: selectedPackage.price,
        paymentType: "full",
        selectedPackage: selectedPackage,
        plant: plant,
        status: "draft",
      };
    }
  };

  const handleConfirmTreeSelection = async () => {
    if (!treeSelectionModal.plant || !treeSelectionModal.selectedPackage)
      return;

    const plant = treeSelectionModal.plant;
    const selectedPackage = treeSelectionModal.selectedPackage;

    setIsLoading(plant.name);

    try {
      // Generate contract details on frontend only
      const frontendContractDetails = await generateContractDetails(
        plant,
        selectedPackage
      );

      // Show order confirmation modal with frontend-generated details
      setContractDetails(frontendContractDetails);
      setTreeSelectionModal({
        isOpen: false,
        plant: null,
        selectedPackage: null,
      });
      setShowOrderConfirmation(true);
    } catch (error) {
      console.error("Error generating contract details:", error);
      showError(t("plants.contractError"), t("plants.contractErrorMessage"));
    } finally {
      setIsLoading(null);
    }
  };

  const handleConfirmOrder = async () => {
    if (!contractDetails) return;

    // Validate referral code if provided
    if (referralCode && !validateReferralCode(referralCode)) {
      showError(
        t("plants.invalidReferralCode"),
        t("plants.invalidReferralCodeMessage")
      );
      return;
    }

    setIsLoading("Creating contract...");

    try {
      // Now create the actual contract in database
      const contractResponse = await fetch("/api/contract/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: contractDetails.productName,
          productId: contractDetails.productId,
          totalAmount: contractDetails.totalAmount,
          paymentType: contractDetails.paymentType,
          contractNumber: contractDetails.contractNumber,
          referralCode: referralCode || undefined,
        }),
      });

      let contractResult;
      try {
        contractResult = await contractResponse.json();
        console.log("Contract result:", contractResult);
      } catch (parseError) {
        console.error("Failed to parse contract response:", parseError);
        showError(
          "Gagal Membuat Kontrak",
          "Gagal memproses respons server. Silakan coba lagi."
        );
        return;
      }

      if (!contractResponse.ok) {
        showError(
          t("plants.contractCreationError"),
          contractResult?.error ||
            `Server error (${contractResponse.status}). Silakan coba lagi.`
        );
        return;
      }

      if (!contractResult.success || !contractResult.data?.contractId) {
        showError(
          t("plants.contractCreationError"),
          t("plants.contractCreationErrorMessage")
        );
        return;
      }

      // Use the database-generated contractId for redirection
      const actualContractId = contractResult.data.contractId;

      showSuccess(
        t("plants.contractCreated"),
        t("plants.contractCreatedMessage", {
          contractNumber: contractDetails.contractNumber,
        })
      );
      setShowOrderConfirmation(false);
      setContractDetails(null);
      setReferralCode(""); // Reset referral code
      // Redirect to contract signing page with actual contract ID
      window.location.href = `/contract/${actualContractId}`;
    } catch (error) {
      console.error("Error creating contract:", error);
      showError(t("plants.contractError"), t("plants.contractErrorMessage"));
    } finally {
      setIsLoading(null);
    }
  };

  const handleCicilanSelect = (plant: any) => {
    if (!session) {
      router.push("/login");
      return;
    }
    setCicilanModal({ isOpen: true, plant: plant });
  };

  return (
    <LazyMotion features={domAnimation}>
      <motion.section
        className="bg-[#4A5C57] min-h-screen w-full overflow-hidden relative flex flex-col"
        style={{
          backgroundImage: "url(/landing/product-bg.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <AlertComponent />

        <motion.div
          className="text-center pt-12 pb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white font-[family-name:var(--font-poppins)]">
            {t("plants.title")}
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 mt-2 sm:mt-4 md:mt-5 max-w-4xl mx-auto px-4">
            {t("plants.subtitle")}
          </p>
          {/* Mobile/Tablet Navigation - Above content */}
          <div className="flex justify-center items-center gap-4 mt-6 xl:hidden">
            <motion.button
              onClick={prevPlant}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </motion.button>
            <div className="flex items-center justify-center gap-2">
              {plants.map((plant: any, index: number) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    currentIndex === index
                      ? "bg-white"
                      : "bg-white/30 hover:bg-white/50"
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>
            <motion.button
              onClick={nextPlant}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </motion.button>
          </div>
        </motion.div>

        <div className="flex-grow w-full flex items-center py-8 relative">
          {/* Desktop Navigation - Side buttons (xl and up) */}
          <motion.button
            onClick={prevPlant}
            className="hidden xl:block absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white backdrop-blur-sm shadow-lg"
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 sm:h-8 sm:w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </motion.button>

          {/* Desktop Navigation - Right button (xl and up) */}
          <motion.button
            onClick={nextPlant}
            className="hidden xl:block absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white backdrop-blur-sm shadow-lg"
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 sm:h-8 sm:w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </motion.button>
          <motion.div
            className="flex items-start"
            animate={{ x: `calc(-${currentIndex * 85}vw + 7.5vw)` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          >
            {plants.map((plant: any, index: number) => (
              <motion.div
                key={index}
                className="w-[85vw] p-2 sm:p-4"
                animate={{
                  scale: index === currentIndex ? 1 : 0.85,
                  opacity: index === currentIndex ? 1 : 0.5,
                }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              >
                <motion.div
                  className="bg-[#FFFCE3] rounded-3xl p-4 sm:p-6 lg:p-8 relative shadow-lg w-full"
                  initial="hidden"
                  animate={index === currentIndex ? "visible" : "hidden"}
                  variants={containerVariants}
                  whileHover={
                    index === currentIndex
                      ? {
                          scale: 1.02,
                          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                          transition: { duration: 0.3 },
                        }
                      : {}
                  }
                >
                  <div className="flex flex-col">
                    <motion.div
                      className={`w-full grid grid-cols-1 ${
                        session?.user?.verificationStatus === "approved"
                          ? "xl:grid-cols-[500px_1fr_350px]"
                          : "xl:grid-cols-[500px_1fr]"
                      } gap-4 sm:gap-6 lg:gap-8 items-start`}
                      variants={containerVariants}
                    >
                      <motion.div
                        className="space-y-6"
                        variants={slideInFromLeft}
                      >
                        <motion.div
                          className="bg-[#324D3E] rounded-r-2xl w-max px-4 sm:px-6 lg:px-8 py-3 lg:py-4 text-white -ml-4 sm:-ml-6 lg:-ml-8"
                          whileHover={{
                            scale: 1.05,
                            x: 10,
                            transition: { duration: 0.3 },
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <motion.h3
                            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold font-[family-name:var(--font-poppins)] capitalize"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                          >
                            {t("plants.plantName", { name: plant.name })}
                          </motion.h3>
                        </motion.div>
                        <motion.div
                          className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-2"
                          variants={fadeInUp}
                        >
                          <motion.span
                            className="text-gray-700"
                            whileHover={{ scale: 1.1, color: "#324D3E" }}
                          >
                            {plant.nameEn}
                          </motion.span>
                          <div className="hidden sm:block w-px h-3 sm:h-4 bg-gray-400"></div>
                          <motion.span
                            className="text-gray-700"
                            whileHover={{ scale: 1.1, color: "#324D3E" }}
                          >
                            {plant.years}
                          </motion.span>
                          <div className="hidden sm:block w-px h-3 sm:h-4 bg-gray-400"></div>
                          <motion.span
                            className="text-gray-700"
                            whileHover={{ scale: 1.1, color: "#324D3E" }}
                          >
                            {plant.location}
                          </motion.span>
                        </motion.div>
                        <motion.div
                          className="hidden md:block"
                          variants={fadeInUp}
                        >
                          <motion.p
                            className="text-sm md:text-base lg:text-lg leading-relaxed text-gray-700 font-medium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.8 }}
                          >
                            {plant.description}
                          </motion.p>
                        </motion.div>
                        <motion.div
                          className="hidden xl:block"
                          variants={fadeInUp}
                        >
                          <motion.h4
                            className="text-base md:text-lg lg:text-xl font-bold text-[#4A5C57] mb-3 font-[family-name:var(--font-poppins)]"
                            whileHover={{ scale: 1.05 }}
                          >
                            {t("plants.processingProducts", {
                              name: plant.name,
                            })}
                          </motion.h4>
                          <motion.ul
                            className="space-y-2 text-xs md:text-sm lg:text-base"
                            variants={containerVariants}
                          >
                            {plant.productOlahan.map(
                              (product: any, idx: number) => (
                                <motion.li
                                  key={idx}
                                  className="flex items-start"
                                  variants={fadeInUp}
                                  whileHover={{
                                    x: 10,
                                    transition: { duration: 0.2 },
                                  }}
                                >
                                  <span className="text-[#4A5C57] mr-2">•</span>
                                  <div>
                                    <strong>{product.name}</strong>
                                    <br />
                                    <span className="text-gray-600">
                                      {product.description}
                                    </span>
                                  </div>
                                </motion.li>
                              )
                            )}
                          </motion.ul>
                        </motion.div>
                      </motion.div>
                      <motion.div
                        className="flex justify-center items-center h-full xl:col-span-1 order-first xl:order-none"
                        variants={scaleIn}
                      >
                        <motion.div
                          {...floatingAnimation}
                          whileHover={{
                            scale: 1.1,
                            rotate: 5,
                            transition: { duration: 0.3 },
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Image
                            src={`/landing/${plant.name}.jpg`}
                            alt={`Tanaman ${plant.name}`}
                            width={250}
                            height={350}
                            className="object-contain max-h-[250px] sm:max-h-[300px] lg:max-h-[400px] w-auto drop-shadow-2xl"
                            loading="lazy"
                          />
                        </motion.div>
                      </motion.div>
                      {session?.user?.verificationStatus === "approved" && (
                        <motion.div
                          className="space-y-3 sm:space-y-4 flex flex-col justify-start xl:col-span-1"
                          variants={slideInFromRight}
                        >
                          <motion.div
                            className="bg-gradient-to-r from-[#324D3E] to-[#748390] rounded-2xl p-3 sm:p-4 md:p-5 text-white shadow-md relative z-10"
                            whileHover={{
                              scale: 1.05,
                              y: -5,
                              boxShadow:
                                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                              transition: { duration: 0.3 },
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <motion.h4
                              className="text-base sm:text-lg md:text-xl font-bold mb-2 font-[family-name:var(--font-poppins)]"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6, duration: 0.5 }}
                            >
                              {t("plants.simulationTitle")}
                            </motion.h4>
                            <motion.p
                              className="text-xs sm:text-sm md:text-base mb-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.8, duration: 0.5 }}
                            >
                              {t("plants.startingFrom")}
                            </motion.p>
                            <motion.div
                              className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: 1,
                                duration: 0.5,
                                type: "spring",
                              }}
                            >
                              Rp {Number(plant.pricing.monthly) === 0 ? "XXXX" : formatIDRCurrency(plant.pricing.monthly)}{" "}
                              <span className="text-xs sm:text-sm font-normal">
                                {t("plants.perMonth")}
                              </span>
                            </motion.div>
                            <motion.button
                              className="w-full bg-white text-[#4A5C57] py-2 px-4 rounded-full font-bold text-xs sm:text-sm md:text-base hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                              onClick={() => handleInvestment(plant)}
                              disabled={
                                isLoading === plant.name ||
                                Number(plant.pricing.monthly) === 0
                              }
                              whileHover={{
                                scale:
                                  Number(plant.pricing.monthly) === 0
                                    ? 1
                                    : 1.05,
                                boxShadow:
                                  Number(plant.pricing.monthly) === 0
                                    ? "none"
                                    : "0 4px 15px rgba(0, 0, 0, 0.2)",
                              }}
                              whileTap={{
                                scale:
                                  Number(plant.pricing.monthly) === 0
                                    ? 1
                                    : 0.95,
                              }}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 1.2, duration: 0.5 }}
                            >
                              {Number(plant.pricing.monthly) === 0
                                ? t("plants.comingSoon")
                                : isLoading === plant.name
                                ? t("plants.processing")
                                : t("plants.payDirectly")}
                            </motion.button>
                          </motion.div>
                          <motion.div
                            className="relative -mt-8 sm:-mt-12"
                            variants={fadeInUp}
                          >
                            <motion.div
                              className="bg-white rounded-2xl p-4 shadow-md border relative z-0 pt-8 sm:pt-12"
                              whileHover={{
                                scale: 1.03,
                                y: -3,
                                boxShadow:
                                  "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                transition: { duration: 0.3 },
                              }}
                            >
                              <motion.h5
                                className="text-lg font-bold text-[#4A5C57] mb-3 font-[family-name:var(--font-poppins)]"
                                whileHover={{ scale: 1.05 }}
                              >
                                {t("plants.others")}
                              </motion.h5>
                              <motion.div
                                className="space-y-2 text-sm"
                                variants={containerVariants}
                              >
                                <motion.div
                                  className="flex justify-between"
                                  variants={fadeInUp}
                                  whileHover={{
                                    x: 5,
                                    transition: { duration: 0.2 },
                                  }}
                                >
                                  <span className="text-gray-700">
                                    {t("plants.perYear")}
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    Rp {Number(plant.pricing.yearly) === 0 ? "XXXX" : formatIDRCurrency(plant.pricing.yearly)}
                                  </span>
                                </motion.div>
                                <motion.div
                                  className="flex justify-between"
                                  variants={fadeInUp}
                                  whileHover={{
                                    x: 5,
                                    transition: { duration: 0.2 },
                                  }}
                                >
                                  <span className="text-gray-700">
                                    {t("plants.perFiveYears")}
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    Rp{" "}
                                    {Number(plant.pricing.fiveYears) === 0 ? "XXXX" : formatIDRCurrency(plant.pricing.fiveYears)}
                                  </span>
                                </motion.div>
                                <motion.div
                                  className="flex justify-between border-t pt-2"
                                  variants={fadeInUp}
                                  whileHover={{
                                    x: 5,
                                    transition: { duration: 0.2 },
                                  }}
                                >
                                  <span className="text-gray-700">
                                    {t("plants.sellPrice")}
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    Rp{" "}
                                    {Number(plant.pricing.sellPrice) === 0 ? "XXXX" : formatIDRCurrency(plant.pricing.sellPrice)}
                                  </span>
                                </motion.div>
                              </motion.div>
                              <motion.button
                                className="w-full mt-3 bg-[#324D3E] text-white py-2 px-4 rounded-full font-bold text-xs sm:text-sm hover:bg-[#4C3D19] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-600"
                                onClick={() => handleCicilanSelect(plant)}
                                disabled={
                                  isLoading === plant.name ||
                                  Number(plant.pricing.monthly) === 0
                                }
                                whileHover={{
                                  scale:
                                    Number(plant.pricing.monthly) === 0
                                      ? 1
                                      : 1.05,
                                  boxShadow:
                                    Number(plant.pricing.monthly) === 0
                                      ? "none"
                                      : "0 4px 15px rgba(50, 77, 62, 0.3)",
                                }}
                                whileTap={{
                                  scale:
                                    Number(plant.pricing.monthly) === 0
                                      ? 1
                                      : 0.95,
                                }}
                                variants={fadeInUp}
                              >
                                {Number(plant.pricing.monthly) === 0
                                  ? t("plants.comingSoon")
                                  : t("plants.buyWithInstallment")}
                              </motion.button>
                            </motion.div>
                          </motion.div>

                          {/* Profit Projection */}
                          <motion.div
                            className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-md"
                            variants={fadeInUp}
                            whileHover={{
                              scale: 1.03,
                              y: -5,
                              borderColor: "#324D3E",
                              boxShadow:
                                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                              transition: { duration: 0.3 },
                            }}
                          >
                            <motion.h5
                              className="text-lg font-bold text-[#4A5C57] mb-2 font-[family-name:var(--font-poppins)]"
                              whileHover={{ scale: 1.05 }}
                            >
                              {t("plants.profitTitle")}
                            </motion.h5>
                            <motion.div
                              className="text-2xl font-bold text-[#4A5C57] mb-3"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: 1.4,
                                duration: 0.5,
                                type: "spring",
                              }}
                            >
                              Rp{" "}
                              {Number(plant.pricing.profit?.yearly || 0) === 0 ? "XXXX" : formatIDRCurrency(plant.pricing.profit.yearly)}{" "}
                              <span className="text-sm font-normal">
                                {t("plants.profitPerYear")}
                              </span>
                            </motion.div>
                            <motion.div
                              className="space-y-1 text-xs"
                              variants={containerVariants}
                            >
                              <motion.div
                                className="flex justify-between"
                                variants={fadeInUp}
                                whileHover={{
                                  x: 5,
                                  transition: { duration: 0.2 },
                                }}
                              >
                                <span className="text-gray-600">
                                  {t("plants.monthly")}
                                </span>
                                <span className="font-semibold">
                                  Rp{" "}
                                  {Number(plant.pricing.profit?.monthly || 0) === 0 ? "XXXX" : formatIDRCurrency(
                                    plant.pricing.profit.monthly
                                  )}
                                </span>
                              </motion.div>
                              <motion.div
                                className="flex justify-between"
                                variants={fadeInUp}
                                whileHover={{
                                  x: 5,
                                  transition: { duration: 0.2 },
                                }}
                              >
                                <span className="text-gray-600">
                                  {t("plants.weekly")}
                                </span>
                                <span className="font-semibold">
                                  Rp{" "}
                                  {Number(plant.pricing.profit?.weekly || 0) === 0 ? "XXXX" : formatIDRCurrency(
                                    plant.pricing.profit.weekly
                                  )}
                                </span>
                              </motion.div>
                              <motion.div
                                className="flex justify-between"
                                variants={fadeInUp}
                                whileHover={{
                                  x: 5,
                                  transition: { duration: 0.2 },
                                }}
                              >
                                <span className="text-gray-600">
                                  {t("plants.daily")}
                                </span>
                                <span className="font-semibold">
                                  Rp{" "}
                                  {Number(plant.pricing.profit?.daily || 0) === 0 ? "XXXX" : formatIDRCurrency(
                                    plant.pricing.profit.daily
                                  )}
                                </span>
                              </motion.div>
                            </motion.div>
                            <motion.p
                              className="text-xs text-gray-500 mt-3"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1.8, duration: 0.5 }}
                            >
                              {t("plants.profitDisclaimer")}
                            </motion.p>
                          </motion.div>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <CicilanModal
          isOpen={cicilanModal.isOpen}
          onClose={() => setCicilanModal({ isOpen: false, plant: null })}
          plan={cicilanModal.plant}
          onSuccess={showSuccess}
          onError={showError}
        />

        <AnimatePresence>
          {treeSelectionModal.isOpen && treeSelectionModal.plant && (
            <motion.div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setTreeSelectionModal({
                  isOpen: false,
                  plant: null,
                  selectedPackage: null,
                })
              }
            >
              <motion.div
                className="bg-[#FFFCE3] rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-[#324D3E]/20"
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-[#324D3E] font-[family-name:var(--font-poppins)]">
                      {t("plants.chooseInvestment")}
                    </h3>
                    <button
                      onClick={() =>
                        setTreeSelectionModal({
                          isOpen: false,
                          plant: null,
                          selectedPackage: null,
                        })
                      }
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
                  <div className="mb-6">
                    <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                      {t("plants.choosePackage")}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(treeSelectionModal.plant?.treePackages || [])
                        .filter((pkg: any) => pkg.enabled)
                        .map((treePackage: any, index: number) => (
                          <motion.button
                            key={index}
                            className={`flex flex-col items-center p-4 border-2 rounded-2xl transition-all duration-300 hover:shadow-lg ${
                              treeSelectionModal.selectedPackage?.treeCount ===
                              treePackage.treeCount
                                ? "border-[#324D3E] bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 shadow-lg"
                                : "border-[#324D3E]/20 hover:border-[#324D3E]/40 bg-white/80"
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handlePackageSelect(treePackage)}
                          >
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
                              Rp {formatIDRCurrency(treePackage.price)}
                            </div>
                          </motion.button>
                        ))}
                    </div>
                    {(!treeSelectionModal.plant?.treePackages ||
                      treeSelectionModal.plant.treePackages.filter(
                        (pkg: any) => pkg.enabled
                      ).length === 0) && (
                      <div className="text-center py-6">
                        <p className="text-[#324D3E]/60">
                          {t("plants.noPackagesAvailable")}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mb-6">
                    <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-6 rounded-2xl border border-[#324D3E]/20">
                      <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                        {t("plants.investmentDetails")}
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.plantType")}
                          </span>
                          <span className="font-bold text-[#324D3E]">
                            {treeSelectionModal.plant.investmentPlan.plantType}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.duration")}
                          </span>
                          <span className="font-bold text-[#324D3E]">
                            {treeSelectionModal.plant.investmentPlan.durationYears || 5} Tahun
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.treeCount")}
                          </span>
                          <span className="font-bold text-[#324D3E]">
                            {treeSelectionModal.selectedPackage?.treeCount ||
                              "-"}{" "}
                            {t("plants.trees")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.totalPrice")}
                          </span>
                          <span className="font-bold text-[#324D3E]">
                            Rp{" "}
                            {formatIDRCurrency(
                              treeSelectionModal.selectedPackage?.price || 0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.estimatedReturn")}
                          </span>
                          <span className="font-bold text-emerald-600">
                            Rp{" "}
                            {formatIDRCurrency(
                              treeSelectionModal.selectedPackage?.estimatedReturn ||
                                0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.riskLevel")}
                          </span>
                          <span className="font-bold text-orange-600">
                            {treeSelectionModal.plant.investmentPlan.riskLevel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <motion.button
                      className={`w-full px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${
                        treeSelectionModal.selectedPackage
                          ? "bg-[#324D3E] text-white hover:bg-[#4C3D19] shadow-lg hover:shadow-xl"
                          : "bg-[#324D3E]/20 text-[#324D3E]/50 cursor-not-allowed"
                      }`}
                      whileHover={
                        treeSelectionModal.selectedPackage
                          ? { scale: 1.02 }
                          : {}
                      }
                      whileTap={
                        treeSelectionModal.selectedPackage
                          ? { scale: 0.98 }
                          : {}
                      }
                      onClick={
                        treeSelectionModal.selectedPackage
                          ? handleConfirmTreeSelection
                          : undefined
                      }
                      disabled={
                        !treeSelectionModal.selectedPackage || !!isLoading
                      }
                    >
                      {isLoading
                        ? t("plants.processing2")
                        : t("plants.continuePayment")}
                    </motion.button>
                    <motion.button
                      className="w-full px-4 py-3 text-[#324D3E]/60 hover:text-[#324D3E] transition-colors border border-[#324D3E]/20 rounded-2xl hover:bg-[#324D3E]/5 font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        setTreeSelectionModal({
                          isOpen: false,
                          plant: null,
                          selectedPackage: null,
                        })
                      }
                    >
                      {t("plants.cancel")}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order Confirmation Modal */}
        <AnimatePresence>
          {showOrderConfirmation && contractDetails && (
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
                      {t("plants.orderDetails")}
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
                        {t("plants.contractDetails")}
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex flex-col gap-2">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.contractNumber")}
                          </span>
                          <span className="font-bold text-[#324D3E] text-base font-mono break-all">
                            {contractDetails.contractNumber}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.packageType")}
                          </span>
                          <span className="font-bold text-[#324D3E] text-base font-mono break-all">
                            {contractDetails.productName}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.packagePrice")}
                          </span>
                          <span className="font-bold text-[#324D3E] text-base font-mono break-all">
                            Rp{" "}
                            {contractDetails.totalAmount.toLocaleString(
                              "id-ID"
                            )}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.paymentType")}
                          </span>
                          <span className="font-bold text-[#324D3E] text-base font-mono break-all capitalize">
                            {contractDetails.paymentType === "full"
                              ? t("plants.paymentTypeFull")
                              : contractDetails.paymentType}
                          </span>
                        </div>
                        {contractDetails.selectedPackage && (
                          <div className="flex flex-col gap-2">
                            <span className="text-[#324D3E]/80 font-medium">
                              {t("plants.treeCount")}
                            </span>
                            <span className="font-bold text-emerald-600 text-base font-mono break-all">
                              {contractDetails.selectedPackage.treeCount}{" "}
                              {t("plants.trees")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Referral Code Input */}
                    <div className="bg-gradient-to-r from-[#324D3E]/10 to-[#4C3D19]/10 p-6 rounded-2xl border border-[#324D3E]/20 mb-6">
                      <h4 className="font-bold mb-4 text-[#324D3E] font-[family-name:var(--font-poppins)]">
                        {t("plants.referralCode")}
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex flex-col gap-2">
                          <span className="text-[#324D3E]/80 font-medium">
                            {t("plants.enterReferralCode")}
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
                            {t("plants.confirmationTitle")}
                          </p>
                          <p className="text-blue-700">
                            {t("plants.confirmationMessage")}
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
                        {t("plants.back")}
                      </button>
                      <button
                        onClick={handleConfirmOrder}
                        disabled={!!isLoading}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[#324D3E] to-[#4C3D19] text-white rounded-full font-bold hover:shadow-lg transition-all duration-300 font-[family-name:var(--font-poppins)] disabled:opacity-50"
                      >
                        {isLoading
                          ? t("plants.creatingContract")
                          : t("plants.continue")}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </LazyMotion>
  );
}
