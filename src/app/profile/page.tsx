"use client";

import LandingHeader from "@/components/landing/LandingHeader";
import { useAlert } from "@/components/ui/Alert";
import { provinceOptions } from "@/constant/PROVINCE";
import { motion } from "framer-motion";
import { Check, Edit2, X, FileText, Camera } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useLanguage } from "@/contexts/LanguageContext";

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const { showSuccess, showError, AlertComponent } = useAlert();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [_, setIsEditingImage] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [fetchingUser, setFetchingUser] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [nameReason, setNameReason] = useState("");
  const [emailReason, setEmailReason] = useState("");
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserData = async () => {
    try {
      setFetchingUser(true);

      // Fetch user profile and pending requests in parallel
      const [profileResponse, requestsResponse] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/user/profile-change-request"),
      ]);

      const profileData = await profileResponse.json();
      const requestsData = await requestsResponse.json();

      if (profileResponse.ok && profileData.success) {
        setUserData(profileData.user);
        setPhoneNumber(profileData.user.phoneNumber || "");
        setFullName(profileData.user.fullName || "");
        setEmail(profileData.user.email || "");
      } else {
        showError("Error", profileData.error || "Failed to fetch user data");
      }

      if (requestsResponse.ok && requestsData.success) {
        const pending = requestsData.requests.filter(
          (req: any) => req.status === "pending"
        );
        setPendingRequests(pending);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      showError("Error", "Failed to fetch user data");
    } finally {
      setFetchingUser(false);
    }
  };

  // Only show full page loading on initial load, not during session updates (like image upload)
  if ((status === "loading" || fetchingUser) && !isUploadingImage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] mx-auto mb-4"></div>
          <p className="text-[#324D3E] font-medium">{t("profile.loading")}</p>
        </motion.div>
      </div>
    );
  }

  if (!session || !userData) {
    return null;
  }

  const user = userData;

  const canGenerateKartu = user.verificationStatus === "approved";

  // Helper function to get province name from value
  const getProvinceName = (provinceValue: string) => {
    const province = provinceOptions.find((p) => p.value === provinceValue);
    return province ? province.label : provinceValue;
  };

  // Helper function to check if there's a pending request for a specific field
  const hasPendingRequest = (changeType: "fullName" | "email") => {
    return pendingRequests.some((req: any) => req.changeType === changeType);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("Error", t("profile.errorFileTooLarge"));
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      showError("Error", t("profile.errorInvalidImage"));
      return;
    }

    setIsLoading(true);
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/user/upload-profile-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      // Update local user data
      setUserData((prev: any) => ({
        ...prev,
        profileImageUrl: data.profileImageUrl,
      }));

      // Update session with new profile image
      await update({
        ...session,
        user: {
          ...session.user,
          profileImageUrl: data.profileImageUrl,
        },
      });

      showSuccess("Success", "Profile image updated successfully");
      setIsEditingImage(false);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      showError("Error", error.message || "Failed to upload image");
    } finally {
      setIsLoading(false);
      setIsUploadingImage(false);
    }
  };

  const handleGenerateKartuAnggota = async () => {
    try {
      setIsLoading(true);

      // Generate kartu anggota data
      const response = await fetch("/api/user/generate-kartu-anggota");

      if (!response.ok) {
        throw new Error("Failed to generate kartu anggota");
      }

      const data = await response.json();

      if (data.success) {
        // Create temporary container with exact same structure as kartu-anggota page
        await generateKartuAnggotaImage(data);
      } else {
        showError("Error", data.error || "Failed to generate kartu anggota");
      }
    } catch (err) {
      console.error("Error generating kartu anggota:", err);
      showError("Error", "Failed to generate kartu anggota");
    } finally {
      setIsLoading(false);
    }
  };

  const generateKartuAnggotaImage = async (kartuData: any) => {
    // Add overlay background
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    `;

    // Create container that's properly sized and centered
    const container = document.createElement("div");
    container.style.cssText = `
      padding: 20px;
      background: #f0f0f0;
      font-family: Arial, sans-serif;
      display: flex;
      gap: 32px;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      max-width: 95vw;
      max-height: 95vh;
      overflow: hidden;
    `;

    // Create front card with exact structure from kartu-anggota page
    const frontCard = document.createElement("div");
    frontCard.style.cssText = `
      filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.15));
      background-image: url(/assets/kartu-anggota-front.jpg);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      width: 360px;
      height: 540px;
      display: flex;
      flex-direction: column;
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      flex-shrink: 0;
    `;

    // Front card header
    const frontHeader = document.createElement("div");
    frontHeader.style.cssText = `
      color: white;
      text-align: center;
      padding: 18px 18px;
      padding-left: 74px;
      padding-top: 18px;
      position: relative;
      height: 140px;
      box-sizing: border-box;
    `;

    // Logo
    const logo = document.createElement("img");
    logo.src = "/images/koperasi-logo-kartu-anggota.png";
    logo.style.cssText = `
      position: absolute;
      left: 15px;
      top: 25px;
      width: 68px;
      height: 68px;
    `;
    logo.onerror = () => {
      logo.src = "/images/koperasi-logo-removebg.png";
    };

    const title = document.createElement("h2");
    title.style.cssText = `
      margin: 0;
      font-size: 14px;
      font-weight: bold;
      line-height: 1.2;
    `;
    title.innerHTML =
      '<span style="display: block;">KOPERASI</span><span style="display: block;">BINTANG MERAH SEJAHTERA</span>';

    const hr = document.createElement("hr");
    hr.style.cssText = `
      border: 0;
      margin: 8px 20px;
      border-top: 1px solid rgba(255,255,255,0.6);
    `;

    const akta = document.createElement("p");
    akta.style.cssText = `
      margin: 6px;
      font-size: 9px;
      line-height: 1.3;
      text-align: center;
    `;
    akta.innerHTML =
      '<span style="display: block;">Akta Notaris TEDDY YUNADI, SH No: 01/AP-04.09/2016</span><span style="display: block; white-space: nowrap;">SK KEMENKUMHAM No : AHU-0005960.AH.01.28.TAHUN 2022</span>';

    frontHeader.appendChild(logo);
    frontHeader.appendChild(title);
    frontHeader.appendChild(hr);
    frontHeader.appendChild(akta);

    // Front card body
    const frontBody = document.createElement("div");
    frontBody.style.cssText = `
      padding: 15px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      height: 240px;
      box-sizing: border-box;
    `;

    const kartuTitle = document.createElement("h3");
    kartuTitle.style.cssText = "margin: 0; color: black; font-weight: bold;";
    kartuTitle.textContent = "KARTU ANGGOTA";

    const photoContainer = document.createElement("div");
    photoContainer.style.cssText = `
      width: 90px;
      height: 90px;
      border-radius: 50%;
      overflow: hidden;
      background-color: #f8c3a7;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    if (kartuData.user.faceImageUrl) {
      const photo = document.createElement("img");
      photo.src = kartuData.user.faceImageUrl;
      photo.style.cssText = "width: 100%; height: 100%; object-fit: cover;";
      photoContainer.appendChild(photo);
    } else {
      const photoText = document.createElement("span");
      photoText.style.cssText = "color: #666; font-size: 14px;";
      photoText.textContent = "FOTO";
      photoContainer.appendChild(photoText);
    }

    const userName = document.createElement("div");
    userName.style.cssText =
      "font-weight: bold; font-size: 12px; text-align: center; color: black;";
    userName.textContent = kartuData.user.fullName;

    const userCode = document.createElement("div");
    userCode.style.cssText =
      "margin-top: 4px; font-size: 10px; text-align: center; color: black;";
    userCode.textContent = `No Anggota : ${kartuData.user.userCode}`;

    frontBody.appendChild(kartuTitle);
    frontBody.appendChild(photoContainer);
    frontBody.appendChild(userName);
    frontBody.appendChild(userCode);

    // QR Section
    const qrSection = document.createElement("div");
    qrSection.style.cssText = `
      display: flex;
      align-items: center;
      padding: 5px 8px;
      gap: 8px;
      height: 80px;
      box-sizing: border-box;
    `;

    const qrContainer = document.createElement("div");
    qrContainer.style.cssText =
      "width: 50px; height: 50px; flex-shrink: 0; margin-left: 3px;";

    const qrImage = document.createElement("img");
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
      window.location.origin + "/kartu-anggota"
    )}`;
    qrImage.style.cssText = "width: 100%; height: 100%; display: block;";

    qrContainer.appendChild(qrImage);
    qrSection.appendChild(qrContainer);

    // Front footer
    const frontFooter = document.createElement("div");
    frontFooter.style.cssText = `
      color: white;
      text-align: center;
      padding: 0px 8px;
      font-size: 11px;
      font-weight: bold;
      line-height: 1.3;
      height: 80px;
      box-sizing: border-box;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      margin-top: -10px;
    `;
    frontFooter.innerHTML =
      "Bintaro Business Center<br />Jl RC Veteran Raya No 1i, Bintaro – Kec Pesanggrahan<br />Kota Jakarta Selatan DKI Jakarta 12330<br />Telp: 0811 1889 3679 | Email: bintangmerahsejahtera@gmail.com";

    frontCard.appendChild(frontHeader);
    frontCard.appendChild(frontBody);
    frontCard.appendChild(qrSection);
    frontCard.appendChild(frontFooter);

    // Create back card with exact structure from kartu-anggota page
    const backCard = document.createElement("div");
    backCard.style.cssText = `
      filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.15));
      background-image: url(/assets/kartu-anggota-back.jpg);
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      width: 360px;
      height: 540px;
      display: flex;
      flex-direction: column;
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      flex-shrink: 0;
    `;

    // Back card header (same as front)
    const backHeader = frontHeader.cloneNode(true);

    // Back card body
    const backBody = document.createElement("div");
    backBody.style.cssText = `
      padding: 15px 18px;
      display: flex;
      flex-direction: column;
      height: 320px;
      box-sizing: border-box;
    `;

    const ketentuanTitle = document.createElement("h3");
    ketentuanTitle.style.cssText =
      "margin: 0; color: black; font-weight: bold; text-align: center; margin-bottom: 12px; font-size: 14px;";
    ketentuanTitle.textContent = "KETENTUAN";

    const rulesContainer = document.createElement("div");
    rulesContainer.style.cssText =
      "color: black; font-weight: 900; font-size: 10px; line-height: 1.3; text-align: left;";

    const rules = [
      "1. Kartu ini merupakan kartu anggota Koperasi Bintang Merah Sejahtera.",
      "2. Penggunaan kartu ini tunduk pada ketentuan yang berlaku sebagaimana di atur dalam Anggaran Dasar (AD) dan Anggaran Rumah Tangga (ART) Koperasi Bintang Merah Sejahtera.",
      "3. Kartu anggota tidak dapat dipindah tangankan, pemindahan hak dan kewajiban di atur dalam AD/ART Koperasi Bintang Merah Sejahtera.",
      "4. Penggunaan kartu anggota sepenuhnya menjadi tanggung jawab anggota",
      "5. Koperasi Bintang Merah Sejahtera tidak bertanggung jawab terhadap penggunaan kartu anggota diluar ketentuan yang berlaku.",
    ];

    rules.forEach((rule) => {
      const p = document.createElement("p");
      p.style.cssText = "margin-bottom: 6px;";
      p.textContent = rule;
      rulesContainer.appendChild(p);
    });

    backBody.appendChild(ketentuanTitle);
    backBody.appendChild(rulesContainer);

    // Back footer
    const backFooter = document.createElement("div");
    backFooter.style.cssText = `
      color: white;
      text-align: center;
      padding: 0px 8px;
      font-size: 11px;
      font-weight: bold;
      line-height: 1.3;
      height: 80px;
      box-sizing: border-box;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      margin-top: -10px;
    `;
    backFooter.innerHTML =
      "Bintaro Business Center<br />Jl RC Veteran Raya No 1i, Bintaro – Kec Pesanggrahan<br />Kota Jakarta Selatan DKI Jakarta 12330<br />Telp: 0811 1889 3679 | Email: bintangmerahsejahtera@gmail.com";

    backCard.appendChild(backHeader);
    backCard.appendChild(backBody);
    backCard.appendChild(backFooter);

    container.appendChild(frontCard);
    container.appendChild(backCard);

    // Add to DOM
    document.body.appendChild(overlay);
    overlay.appendChild(container);

    // Wait for images to load and background images to be applied
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Convert to PNG
    const dataUrl = await toPng(container, {
      pixelRatio: 2,
      quality: 1,
      cacheBust: true,
      backgroundColor: "#f0f0f0",
      skipFonts: true,
      fontEmbedCSS: "",
      width: 792, // 360 + 360 + 32 gap + 40 padding
      height: 580, // 540 + 40 padding
    });

    // Download the image
    const link = document.createElement("a");
    link.download = `kartu-anggota-${kartuData.user?.userCode || "user"}.png`;
    link.href = dataUrl;
    link.click();

    // Clean up
    document.body.removeChild(overlay);
  };

  const handleNameChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showError("Error", "Full name is required");
      return;
    }

    if (fullName === userData.fullName) {
      showError("Error", "New name must be different from current name");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/profile-change-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "fullName",
          requestedValue: fullName.trim(),
          reason: nameReason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit name change request");
      }

      showSuccess(
        "Success",
        "Name change request submitted! It will be reviewed by an administrator."
      );
      setIsEditingName(false);
      setNameReason("");
      // Refresh pending requests
      fetchUserData();
    } catch (error: any) {
      console.error("Error submitting name change request:", error);
      showError(
        "Error",
        error.message || "Failed to submit name change request"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      showError("Error", "Email is required");
      return;
    }

    if (email === userData.email) {
      showError("Error", "New email must be different from current email");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/profile-change-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          changeType: "email",
          requestedValue: email.trim(),
          reason: emailReason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit email change request");
      }

      showSuccess(
        "Success",
        "Email change request submitted! It will be reviewed by an administrator."
      );
      setIsEditingEmail(false);
      setEmailReason("");
      // Refresh pending requests
      fetchUserData();
    } catch (error: any) {
      console.error("Error submitting email change request:", error);
      showError(
        "Error",
        error.message || "Failed to submit email change request"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      showError("Error", "Phone number is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/update-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update phone number");
      }

      setUserData((prev: any) => ({
        ...prev,
        phoneNumber: phoneNumber,
      }));

      showSuccess("Success", "Phone number updated successfully");
      setIsEditingPhone(false);
    } catch (error: any) {
      console.error("Error updating phone number:", error);
      showError("Error", error.message || "Failed to update phone number");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError("Error", "New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError("Error", "New password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      showSuccess("Success", "Password updated successfully");
      setIsEditingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error updating password:", error);
      showError("Error", error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <LandingHeader />
      <AlertComponent />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Profile Image Section */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("profile.title")}
              </h2>
            </div>
            <div className="relative">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                    {user.profileImageUrl ? (
                      <Image
                        width={96}
                        height={96}
                        src={user.profileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#324D3E] flex items-center justify-center text-white text-2xl font-bold">
                        {user.fullName?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  {/* Edit Profile Photo Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-[#324D3E] text-white rounded-full flex items-center justify-center hover:bg-[#4C3D19] transition-all duration-200 hover:scale-110 disabled:opacity-50 shadow-lg"
                    title="Ubah foto profil"
                  >
                    <Camera size={16} />
                  </button>
                  {isLoading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {user.fullName}
                  </h3>
                  <p className="text-gray-600 text-sm">{user.email}</p>
                </div>
              </div>
            </div>

            {/* User ID Section - Moved above Change Profile Photo */}
            <div className="mt-4 bg-gray-50 p-3 rounded-lg max-w-max">
              <p className="text-xs font-medium text-gray-500 mb-1">
                {t("profile.userId")}
              </p>
              <p className="text-sm font-mono font-bold text-[#324D3E] bg-white/80 px-3 py-1 rounded-md border border-gray-200 max-w-max">
                {user.userCode || "N/A"}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col">
                  <button
                    onClick={handleGenerateKartuAnggota}
                    disabled={isLoading || !canGenerateKartu}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] shadow-lg ${
                      canGenerateKartu
                        ? "bg-[#324D3E] text-white hover:bg-[#4C3D19] shadow-[#324D3E]/25"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                    } ${isLoading ? "disabled:opacity-50" : ""}`}
                  >
                    <FileText size={16} />
                    {canGenerateKartu
                      ? t("profile.generateKartuAnggota")
                      : t("profile.kartuNotAvailable")}
                  </button>
                  {!canGenerateKartu && (
                    <p className="mt-2 text-xs text-gray-600">
                      {t("profile.accountMustBeVerified")}
                    </p>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </motion.div>

          {/* User Information */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {t("profile.personalInfo")}
            </h2>
            {/* First Row: Full Name and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.fullName")}
                </label>
                {hasPendingRequest("fullName") ? (
                  <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-gray-700">
                      {user.fullName}{" "}
                      <span className="text-yellow-700 text-sm">
                        {t("profile.requestSent")}
                      </span>
                    </p>
                  </div>
                ) : isEditingName ? (
                  <form
                    onSubmit={handleNameChangeRequest}
                    className="space-y-3"
                  >
                    <div className="relative">
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-3 pr-20 bg-gray-50 border-2 border-transparent rounded-lg transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none"
                        placeholder={t("profile.enterFullName")}
                        required
                        autoFocus
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all duration-200 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingName(false);
                            setFullName(user.fullName || "");
                            setNameReason("");
                          }}
                          className="p-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={nameReason}
                      onChange={(e) => setNameReason(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-transparent rounded-lg transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none resize-none"
                      placeholder={t("profile.reasonForChange")}
                      rows={2}
                    />
                  </form>
                ) : (
                  <div className="relative">
                    <div className="p-3 bg-gray-50 rounded-lg pr-12">
                      <p className="text-gray-900">{user.fullName}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsEditingName(true);
                        setFullName(user.fullName || "");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#324D3E] hover:bg-[#324D3E] hover:text-white rounded-md transition-all duration-200"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.email")}
                </label>
                {hasPendingRequest("email") ? (
                  <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-gray-700">
                      {user.email}{" "}
                      <span className="text-yellow-700 text-sm">
                        {t("profile.requestSent")}
                      </span>
                    </p>
                  </div>
                ) : isEditingEmail ? (
                  <form
                    onSubmit={handleEmailChangeRequest}
                    className="space-y-3"
                  >
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-3 pr-20 bg-gray-50 border-2 border-transparent rounded-lg transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none"
                        placeholder={t("profile.enterEmail")}
                        required
                        autoFocus
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all duration-200 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEmail(false);
                            setEmail(user.email || "");
                            setEmailReason("");
                          }}
                          className="p-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={emailReason}
                      onChange={(e) => setEmailReason(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border-2 border-transparent rounded-lg transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none resize-none"
                      placeholder={t("profile.reasonForEmailChange")}
                      rows={2}
                    />
                  </form>
                ) : (
                  <div className="relative">
                    <div className="p-3 bg-gray-50 rounded-lg pr-12">
                      <p className="text-gray-900">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsEditingEmail(true);
                        setEmail(user.email || "");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#324D3E] hover:bg-[#324D3E] hover:text-white rounded-md transition-all duration-200"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Second Row: Phone Number and Date of Birth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.phoneNumber")}
                </label>
                {isEditingPhone ? (
                  <form onSubmit={handlePhoneUpdate}>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-3 py-3 pr-20 bg-gray-50 border-2 border-transparent rounded-lg transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none"
                        placeholder={t("profile.enterPhoneNumber")}
                        required
                        autoFocus
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all duration-200 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPhone(false);
                            setPhoneNumber(user.phoneNumber || "");
                          }}
                          className="p-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-all duration-200"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="relative">
                    <div className="p-3 bg-gray-50 rounded-lg pr-12">
                      <p className="text-gray-900">{user.phoneNumber}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsEditingPhone(true);
                        setPhoneNumber(user.phoneNumber || "");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#324D3E] hover:bg-[#324D3E] hover:text-white rounded-md transition-all duration-200"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.dateOfBirth")}
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">
                    {user.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString()
                      : t("profile.notProvided")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* KTP Address Section */}
              <div className="md:col-span-3">
                <h4 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  {t("profile.ktpAddress")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.fullAddress")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.ktpAddress}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.village")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.ktpVillage}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.city")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.ktpCity}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.province")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">
                        {getProvinceName(user.ktpProvince)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.postalCode")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.ktpPostalCode}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Domisili Address Section */}
              <div className="md:col-span-3">
                <h4 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  {t("profile.domisiliAddress")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.fullAddress")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.domisiliAddress}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.village")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.domisiliVillage}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.city")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.domisiliCity}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.province")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">
                        {getProvinceName(user.domisiliProvince)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.postalCode")}
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.domisiliPostalCode}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Third Row: Occupation and Verification Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("profile.occupation")}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">{user.occupation}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("profile.verificationStatus")}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p
                      className={`font-semibold ${
                        user.verificationStatus === "approved"
                          ? "text-green-600"
                          : user.verificationStatus === "pending"
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {user.verificationStatus === "approved"
                        ? t("profile.verified")
                        : user.verificationStatus === "pending"
                        ? t("profile.pendingReview")
                        : t("profile.notVerified")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Password Section */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("profile.security")}
              </h2>
              <button
                onClick={() => setIsEditingPassword(!isEditingPassword)}
                className="px-6 py-2 text-[#324D3E] border-2 border-[#324D3E] rounded-xl font-semibold hover:bg-[#324D3E] hover:text-white transition-all duration-200 hover:scale-[1.02]"
              >
                {isEditingPassword
                  ? t("profile.cancel")
                  : t("profile.changePassword")}
              </button>
            </div>

            {isEditingPassword ? (
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t("profile.currentPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none placeholder-gray-400"
                      placeholder={t("profile.enterCurrentPassword")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t("profile.newPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none placeholder-gray-400"
                      placeholder={t("profile.enterNewPassword")}
                      minLength={8}
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                      <p>{t("profile.passwordRequirements")}</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>{t("profile.minCharacters")}</li>
                        <li>{t("profile.lowercase")}</li>
                        <li>{t("profile.uppercase")}</li>
                        <li>{t("profile.numbers")}</li>
                        <li>{t("profile.specialCharacters")}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t("profile.confirmNewPassword")}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none placeholder-gray-400"
                      placeholder={t("profile.confirmPasswordPlaceholder")}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-6 py-3 bg-[#324D3E] text-white rounded-xl font-semibold hover:bg-[#4C3D19] transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-[#324D3E]/25"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t("profile.updating")}
                      </span>
                    ) : (
                      t("profile.updatePassword")
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPassword(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02]"
                  >
                    {t("profile.cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t("profile.password")}
                </label>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-lg font-mono tracking-wider">
                      ••••••••••••
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
