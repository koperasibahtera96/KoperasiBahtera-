"use client";

import { Calendar, MapPin, TrendingUp, Leaf, User, Award, Clock, DollarSign, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";

interface UserData {
  _id: string;
  fullName: string;
  userCode: string;
  profileImageUrl?: string;
  faceImageUrl?: string;
  role: string;
  verificationStatus: string;
  memberSince: string;
  phoneNumber?: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  village?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  occupation?: string;
  occupationCode?: string;
  totalInvestment: number;
  totalProfitShare: number;
  totalPlantInstances: number;
  investments: Investment[];
  plantInstances: PlantInstance[];
}

interface Investment {
  id: string;
  plantInstanceId: string;
  plantType: string;
  instanceName: string;
  amount: number;
  sharePercentage: number;
  profitShare: number;
  investmentDate: string;
  status: string;
}

interface PlantInstance {
  _id: string;
  id: string;
  plantType: string;
  instanceName: string;
  baseAnnualROI: number;
  location?: string;
  status?: string;
  fotoGambar?: string;
  userTotalInvestment: number;
  userProfitShare: number;
  qrCode?: string;
  createdAt: string;
}

const plantTypeColors = {
  gaharu: "from-[#324D3E] to-[#4C3D19]",
  alpukat: "from-green-500 to-emerald-600", 
  jengkol: "from-purple-500 to-indigo-600",
  aren: "from-orange-500 to-red-600",
};

const plantTypeNames = {
  gaharu: "Gaharu",
  alpukat: "Alpukat", 
  jengkol: "Jengkol",
  aren: "Aren",
};

const getPlantImage = (plantType: string) => {
  const plantImages: { [key: string]: string } = {
    gaharu: "/landing/gaharu.webp",
    alpukat: "/landing/alpukat.webp",
    jengkol: "/landing/jengkol.webp",
    aren: "/landing/aren.webp",
  };
  
  return plantImages[plantType.toLowerCase()] || "/landing/gaharu.webp";
};

export default function PublicUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching user data for ID:', userId);
      const response = await fetch(`/api/public/user/${userId}`);
      const data = await response.json();

      console.log('API Response:', response.status, data);

      if (response.ok && data.success) {
        console.log('User data received:', data.user);
        console.log('Plant instances length:', data.user?.plantInstances?.length);
        console.log('Investments length:', data.user?.investments?.length);
        console.log('Plant instances data:', data.user?.plantInstances);
        setUserData(data.user);
      } else {
        console.error('API Error:', data.error);
        setError(data.error || "Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

    const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get source badge info
  const getSourceBadge = (source: string, type: string) => {
    switch (source) {
      case 'investment':
        return { text: 'Investasi', className: 'bg-blue-100 text-blue-800' };
      case 'income':
        return { text: 'Pendapatan', className: 'bg-green-100 text-green-800' };
      case 'operational':
        return { text: 'Operasional', className: 'bg-red-100 text-red-800' };
      case 'history':
        return { text: 'Riwayat', className: 'bg-purple-100 text-purple-800' };
      default:
        return { text: type || 'Lainnya', className: 'bg-gray-100 text-gray-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500">Error: {error || "User not found"}</p>
          <Link href="/" className="text-blue-500 underline mt-4 block">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

      return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-gray-700 hover:text-[#324D3E] transition-all duration-300 font-medium font-poppins"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali ke Beranda
          </Link>
        </div>

        {/* Section Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center text-[#324D3E] mb-16 font-poppins">
          Profil Anggota
        </h1>

        {/* User Profile Header */}
        <div className="bg-white rounded-3xl p-8 mb-12 shadow-xl border border-gray-200">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-[#324D3E] to-[#4C3D19] rounded-full flex items-center justify-center shadow-xl overflow-hidden">
                {userData?.profileImageUrl ? (
                  <Image
                    src={userData.profileImageUrl}
                    alt={userData.fullName || 'User'}
                    width={128}
                    height={128}
                    className="rounded-full object-cover w-full h-full"
                  />
                ) : (
                  <User className="w-16 h-16 text-white" />
                )}
              </div>
              {(userData?.verificationStatus === 'verified' || userData?.verificationStatus === 'approved') && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg">
                  <Award className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#324D3E] mb-2 font-poppins">
                {userData?.fullName}
              </h2>
              <p className="text-[#4C3D19] font-semibold text-xl mb-4 font-poppins">
                No. Anggota: {userData?.userCode}
              </p>

              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#324D3E]" />
                  <span className="font-medium font-poppins">Bergabung {formatDate(userData?.memberSince)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#324D3E]" />
                  <span className="capitalize font-medium font-poppins">{userData?.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#324D3E]" />
                  <span className="font-medium font-poppins">
                    Status: {userData?.verificationStatus === 'verified' || userData?.verificationStatus === 'approved' ? 'Terverifikasi' : 'Belum Terverifikasi'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comprehensive User Information */}
        <div className="bg-white rounded-3xl p-8 mb-12 shadow-xl border border-gray-200">
          <h3 className="text-2xl font-bold text-center text-[#324D3E] mb-8 font-poppins">
            Informasi Anggota
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {userData?.phoneNumber && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">TELEPON:</p>
                  <p className="text-gray-700 font-poppins">{userData.phoneNumber}</p>
                </div>
              )}

              {userData?.email && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">EMAIL:</p>
                  <p className="text-gray-700 font-poppins">{userData.email}</p>
                </div>
              )}

              {userData?.dateOfBirth && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">TANGGAL LAHIR:</p>
                  <p className="text-gray-700 font-poppins">{formatDate(userData.dateOfBirth)}</p>
                </div>
              )}

              {userData?.address && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">ALAMAT:</p>
                  <p className="text-gray-700 font-poppins">{userData.address}</p>
                </div>
              )}

              {userData?.village && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">DESA/KELURAHAN:</p>
                  <p className="text-gray-700 font-poppins">{userData.village}</p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {userData?.city && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">KOTA/KABUPATEN:</p>
                  <p className="text-gray-700 font-poppins">{userData.city}</p>
                </div>
              )}

              {userData?.province && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">PROVINSI:</p>
                  <p className="text-gray-700 font-poppins">{userData.province}</p>
                </div>
              )}

              {userData?.postalCode && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">KODE POS:</p>
                  <p className="text-gray-700 font-poppins">{userData.postalCode}</p>
                </div>
              )}

              {userData?.occupation && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">PEKERJAAN:</p>
                  <p className="text-gray-700 font-poppins">{userData.occupation}</p>
                </div>
              )}

              {userData?.occupationCode && (
                <div>
                  <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">KODE PEKERJAAN:</p>
                  <p className="text-gray-700 font-poppins">{userData.occupationCode}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-bold text-[#324D3E] font-poppins mb-1">BERGABUNG:</p>
                <p className="text-gray-700 font-poppins">{formatDate(userData?.memberSince)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-[#324D3E]/10 p-3 rounded-full">
                <DollarSign className="w-8 h-8 text-[#324D3E]" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium font-poppins">Total Investasi</p>
                <p className="text-3xl font-bold text-[#324D3E] font-poppins">{formatCurrency(userData?.totalInvestment || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Leaf className="w-8 h-8 text-green-700" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium font-poppins">Total Tanaman</p>
                <p className="text-3xl font-bold text-green-700 font-poppins">{userData?.totalPlantInstances || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <TrendingUp className="w-8 h-8 text-blue-700" />
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium font-poppins">Profit Share</p>
                <p className="text-3xl font-bold text-blue-700 font-poppins">{formatCurrency(userData?.totalProfitShare || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Timeline - When plant instances were created for user */}
        {userData?.investments && userData.investments.filter((inv: any) => inv.status !== 'pending' && inv.status !== 'approved').length > 0 && (
          <div className="mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-[#324D3E] mb-12 font-poppins">
              Riwayat Lengkap Investasi
            </h3>

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-2 font-bold text-[#324D3E] font-poppins">Jenis Tanaman</th>
                      <th className="text-left py-4 px-2 font-bold text-[#324D3E] font-poppins">Jumlah Investasi</th>
                      <th className="text-left py-4 px-2 font-bold text-[#324D3E] font-poppins">Tanggal Investasi</th>
                      <th className="text-left py-4 px-2 font-bold text-[#324D3E] font-poppins">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Investment Records - when user invested in plant instances (only show active/completed) */}
                    {userData?.investments?.filter((investment: any) => investment.status !== 'pending' && investment.status !== 'approved').map((investment) => (
                      <tr key={investment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#324D3E] to-[#4C3D19] flex items-center justify-center">
                              <Leaf className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#324D3E] font-poppins">
                                {plantTypeNames[investment.plantType as keyof typeof plantTypeNames] || investment.plantType}
                              </p>
                              <p className="text-sm text-gray-600 font-poppins">{investment.instanceName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 font-semibold text-[#4C3D19] font-poppins">
                          {formatCurrency(investment.amount)}
                        </td>
                        <td className="py-4 px-2 text-gray-600 font-poppins">
                          {investment.investmentDate ? formatDate(investment.investmentDate) : formatDate(new Date().toISOString())}
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold font-poppins ${
                            investment.status === 'active' ? 'bg-green-100 text-green-800' :
                            investment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {investment.status === 'active' ? 'Aktif' :
                             investment.status === 'completed' ? 'Selesai' : investment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Plant Instance History - Separate section for operational activities */}
        {userData?.plantInstances && userData.plantInstances.some((plant: any) => plant.history && plant.history.length > 0) && (
          <div className="mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-[#324D3E] mb-12 font-poppins">
              Aktivitas Tanaman
            </h3>

            <div className="space-y-8">
              {userData.plantInstances.map((plant: any) => {
                if (!plant.history || plant.history.length === 0) return null;
                
                return (
                  <div key={plant._id} className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200">
                    <div className="flex items-center gap-4 mb-6">
                      <Image 
                        src={getPlantImage(plant.plantType)}
                        alt={plant.plantType}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="text-xl font-bold text-[#324D3E] font-poppins">
                          {plantTypeNames[plant.plantType as keyof typeof plantTypeNames] || plant.plantType}
                        </h4>
                        <p className="text-gray-600 font-poppins">{plant.instanceName}</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-2 font-bold text-[#324D3E] font-poppins">Tanggal</th>
                            <th className="text-left py-3 px-2 font-bold text-[#324D3E] font-poppins">Aktivitas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plant.history.map((historyItem: any, index: number) => {
                          getSourceBadge(historyItem.source, historyItem.type);
                            return (
                              <tr key={`${historyItem.id || index}-${historyItem.source}`} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-2 text-gray-600 font-poppins">
                                  {formatDate(historyItem.date)}
                                </td>
                                <td className="py-3 px-2">
                                  <p className="text-gray-700 font-poppins">{historyItem.description}</p>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Plant Instances */}
        {userData?.plantInstances && userData.plantInstances.length > 0 && (
          <div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-[#324D3E] mb-12 font-poppins">
              Tanaman yang Dimiliki
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {userData.plantInstances.map((plant, index) => (
                <div
                  key={plant._id}
                  className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 hover:shadow-2xl transition-shadow"
                >
                  <div className={`h-48 bg-gradient-to-br ${plantTypeColors[plant.plantType as keyof typeof plantTypeColors] || 'from-gray-400 to-gray-600'} relative overflow-hidden`}>
                    <Image
                      src={plant.fotoGambar || getPlantImage(plant.plantType)}
                      alt={plant.instanceName}
                      fill
                      className="object-cover"
                      priority={index < 6}
                    />
                    <div className="absolute top-4 right-4">
                      <span className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-gray-800 font-poppins">
                        {plantTypeNames[plant.plantType as keyof typeof plantTypeNames] || plant.plantType}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <div className={`w-3 h-3 rounded-full ${plant.status?.toLowerCase().includes('aktif') || plant.status?.toLowerCase().includes('kontrak') ? 'bg-green-400' : 'bg-yellow-400'} shadow-lg`}></div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h4 className="font-bold text-xl text-[#324D3E] mb-3 font-poppins">
                      {plant.instanceName}
                    </h4>

                    {plant.location && (
                      <div className="flex items-center gap-2 text-gray-600 mb-4">
                        <MapPin className="w-4 h-4 text-[#324D3E]" />
                        <span className="text-sm font-medium font-poppins">{plant.location}</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                        <span className="text-[#324D3E] font-semibold font-poppins">Investasi:</span>
                        <span className="font-bold text-[#4C3D19] font-poppins">{formatCurrency(plant.userTotalInvestment)}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-2xl">
                        <span className="text-green-700 font-semibold font-poppins">ROI Tahunan:</span>
                        <span className="font-bold text-green-700 font-poppins">{(plant.baseAnnualROI * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4 text-[#324D3E]" />
                          <span className="font-medium font-poppins">Dimulai: {formatDate(plant.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            plant.status?.toLowerCase().includes('aktif') ? 'bg-green-100 text-green-800' : 
                            plant.status?.toLowerCase().includes('kontrak') ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-600'
                          } font-poppins`}>
                            {plant.status || 'Aktif'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!userData?.investments?.length && !userData?.plantInstances?.length) && (
          <div className="text-center py-20">
            <div className="bg-white rounded-3xl shadow-xl p-12 border border-gray-200">
              <Leaf className="w-24 h-24 text-[#324D3E] mx-auto mb-6 opacity-60" />
              <h3 className="text-2xl font-bold text-[#324D3E] mb-4 font-poppins">
                Belum Ada Investasi
              </h3>
              <p className="text-lg text-gray-600 mb-8 font-poppins max-w-md mx-auto">
                {userData?.fullName || 'Anggota ini'} belum memiliki investasi tanaman atau riwayat investasi lainnya.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}