'use client';

import LandingHeader from '@/components/landing/LandingHeader';
import { useAlert } from '@/components/ui/Alert';
import { provinceOptions } from '@/constant/PROVINCE';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const { showSuccess, showError, AlertComponent } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [_, setIsEditingImage] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [fetchingUser, setFetchingUser] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    } else if (status === 'authenticated') {
      fetchUserData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchUserData = async () => {
    try {
      setFetchingUser(true);
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (response.ok && data.success) {
        setUserData(data.user);
      } else {
        showError('Error', data.error || 'Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      showError('Error', 'Failed to fetch user data');
    } finally {
      setFetchingUser(false);
    }
  };

  if (status === 'loading' || fetchingUser) {
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
    const province = provinceOptions.find(p => p.value === provinceValue);
    return province ? province.label : provinceValue;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Error', 'File size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      showError('Error', 'Please select a valid image file');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/user/upload-profile-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Update local user data
      setUserData((prev: any) => ({
        ...prev,
        profileImageUrl: data.profileImageUrl
      }));

      // Update session with new profile image
      await update({
        ...session,
        user: {
          ...session.user,
          profileImageUrl: data.profileImageUrl
        }
      });

      showSuccess('Success', 'Profile image updated successfully');
      setIsEditingImage(false);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      showError('Error', error.message || 'Failed to upload image');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('Error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showError('Error', 'New password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/user/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      showSuccess('Success', 'Password updated successfully');
      setIsEditingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Error updating password:', error);
      showError('Error', error.message || 'Failed to update password');
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Picture</h2>
            <div className="flex items-center space-x-6">
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
                      {user.fullName?.charAt(0).toUpperCase() || 'U'}
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
                <h3 className="text-lg font-semibold text-gray-900">{user.fullName}</h3>
                <p className="text-gray-600 text-sm mb-4">{user.email}</p>
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
                    'Change Photo'
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
            </div>
          </motion.div>

          {/* User Information */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.fullName}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.phoneNumber}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.address}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.city}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{getProvinceName(user.province)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{user.occupation}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className={`font-semibold ${
                    user.verificationStatus === 'approved'
                      ? 'text-green-600'
                      : user.verificationStatus === 'pending'
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}>
                    {user.verificationStatus === 'approved' ? 'Verified' :
                     user.verificationStatus === 'pending' ? 'Pending Review' :
                     'Not Verified'}
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
                {isEditingPassword ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {isEditingPassword ? (
              <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">Current Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl transition-all duration-200 focus:bg-white focus:border-[#324D3E] focus:ring-0 focus:outline-none placeholder-gray-400"
                      placeholder="Enter your current password"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
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
                  <label className="block text-sm font-semibold text-gray-700">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
                      'Update Password'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPassword(false);
                      setPasswordData({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-lg font-mono tracking-wider">••••••••••••</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Hidden for security</span>
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