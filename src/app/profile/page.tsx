"use client";

import LandingHeader from "@/components/landing/LandingHeader";
import { useAlert } from "@/components/ui/Alert";
import { provinceOptions } from "@/constant/PROVINCE";
import { motion } from "framer-motion";
import { Check, Edit2, X, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  const [isLoading, setIsLoading] = useState(false);
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
    if (status === "unauthenticated") {
      redirect("/login");
    } else if (status === "authenticated") {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

  if (status === "loading" || fetchingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324D3E] mx-auto mb-4"></div>
          <p className="text-[#324D3E] font-medium">Loading profile...</p>
        </motion.div>
      </div>
    );
  }

  if (!session || !userData) {
    return null;
  }

  const user = userData;

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
      showError("Error", "File size must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      showError("Error", "Please select a valid image file");
      return;
    }

    setIsLoading(true);

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
    }
  };

  const handleGenerateKartuAnggota = () => {
    // Always redirect to the kartu anggota page
    window.location.href = '/kartu-anggota';
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Profile Information
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateKartuAnggota}
                  className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 bg-[#324D3E] text-white rounded-lg sm:rounded-xl font-medium sm:font-semibold hover:bg-[#4C3D19] transition-all duration-200 hover:scale-[1.02] shadow-md sm:shadow-lg shadow-[#324D3E]/25 text-xs sm:text-base"
                >
                  <FileText size={14} className="sm:hidden" />
                  <FileText size={16} className="hidden sm:block" />
                  <span className="hidden xs:inline">{userData.kartuAnggotaUrl ? 'View Kartu Anggota' : 'Buat Kartu Anggota'}</span>
                  <span className="sm:hidden">{userData.kartuAnggotaUrl ? 'View' : 'Buat'}</span>
                </button>
              </div>
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
                User ID
              </p>
              <p className="text-sm font-mono font-bold text-[#324D3E] bg-white/80 px-3 py-1 rounded-md border border-gray-200 max-w-max">
                {user.userCode || "N/A"}
              </p>
            </div>

            <div className="mt-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-6 py-2 bg-[#324D3E] text-white rounded-xl font-semibold hover:bg-[#4C3D19] transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-[#324D3E]/25"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </span>
                ) : (
                  "Change Profile Photo"
                )}
              </button>
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
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                {hasPendingRequest("fullName") ? (
                  <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-gray-700">
                      {user.fullName}{" "}
                      <span className="text-yellow-700 text-sm">
                        • Request Sent
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
                        placeholder="Enter full name"
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
                      placeholder="Reason for name change (optional)"
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
                  Email
                </label>
                {hasPendingRequest("email") ? (
                  <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-gray-700">
                      {user.email}{" "}
                      <span className="text-yellow-700 text-sm">
                        • Request Sent
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
                        placeholder="Enter email address"
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
                      placeholder="Reason for email change (optional)"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                {isEditingPhone ? (
                  <form onSubmit={handlePhoneUpdate}>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full px-3 py-3 pr-20 bg-gray-50 border-2 border-transparent rounded-lg transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none"
                        placeholder="Enter phone number"
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
                  Date of Birth
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">
                    {user.dateOfBirth
                      ? new Date(user.dateOfBirth).toLocaleDateString()
                      : "Not provided"}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIK
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.nik}</p>
                </div>
              </div>

              {/* KTP Address Section */}
              <div className="md:col-span-3">
                <h4 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                  Alamat KTP
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alamat Lengkap
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.ktpAddress}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desa/Kelurahan
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.ktpVillage}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kota/Kabupaten
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.ktpCity}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provinsi
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">
                        {getProvinceName(user.ktpProvince)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kode Pos
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
                  Alamat Domisili
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alamat Lengkap
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.domisiliAddress}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desa/Kelurahan
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.domisiliVillage}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kota/Kabupaten
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.domisiliCity}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provinsi
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">
                        {getProvinceName(user.domisiliProvince)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kode Pos
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900">{user.domisiliPostalCode}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.occupation}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Status
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
                      ? "Verified"
                      : user.verificationStatus === "pending"
                      ? "Pending Review"
                      : "Not Verified"}
                  </p>
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
              <h2 className="text-2xl font-bold text-gray-900">Security</h2>
              <button
                onClick={() => setIsEditingPassword(!isEditingPassword)}
                className="px-6 py-2 text-[#324D3E] border-2 border-[#324D3E] rounded-xl font-semibold hover:bg-[#324D3E] hover:text-white transition-all duration-200 hover:scale-[1.02]"
              >
                {isEditingPassword ? "Cancel" : "Change Password"}
              </button>
            </div>

            {isEditingPassword ? (
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Current Password
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
                      placeholder="Enter your current password"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    New Password
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
                      placeholder="Enter your new password"
                      minLength={8}
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                      <p>Password harus mengandung:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li>Minimal 8 karakter</li>
                        <li>Huruf kecil (a-z)</li>
                        <li>Huruf besar (A-Z)</li>
                        <li>Angka (0-9)</li>
                        <li>Karakter khusus (@$!%*?&)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Confirm New Password
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
                      placeholder="Confirm your new password"
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
                        Updating...
                      </span>
                    ) : (
                      "Update Password"
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
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-lg font-mono tracking-wider">
                      ••••••••••••
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                      Hidden for security
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
