import React from 'react';
import Image from 'next/image';

interface User {
  fullName: string;
  userCode: string;
  faceImageUrl?: string;
}

interface KartuAnggotaFrontProps {
  user: User;
  qrCodeDataUrl?: string;
}

export default function KartuAnggotaFront({ user, qrCodeDataUrl }: KartuAnggotaFrontProps) {
  return (
    <div className="relative w-[450px] h-[600px] bg-white border-2 border-black rounded-3xl overflow-hidden">
      {/* Red Header */}
      <div className="relative bg-red-600 h-32 rounded-t-3xl flex items-center px-6">
        {/* Logo */}
        <div className="w-20 h-20 relative flex-shrink-0">
          <Image
            src="/images/koperasi-logo-removebg.png"
            alt="Koperasi Logo"
            fill
            className="object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/images/koperasi-logo.jpg";
            }}
          />
        </div>

        {/* Header Text */}
        <div className="flex-1 text-center text-white px-4">
          <div className="text-xl font-bold leading-tight mb-1">KOPERASI</div>
          <div className="text-xl font-bold leading-tight mb-2">BINTANG MERAH SEJAHTERA</div>
          <div className="text-sm leading-tight">Akta Notaris TEDDY YUNADI, SH No: 01/AP-04.09/2016</div>
          <div className="text-sm leading-tight">SK KEMENKUMHAM No: AHU-0005960.AH.01.28.TAHUN 2022</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 flex-1 flex flex-col items-center bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Title */}
        <div className="text-center text-2xl font-bold text-black mb-8">
          KARTU ANGGOTA
        </div>

        {/* Member Photo - Centered */}
        <div className="w-32 h-32 border-2 border-red-600 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-6">
          {user.faceImageUrl ? (
            <Image
              src={user.faceImageUrl}
              alt="Member Photo"
              width={120}
              height={120}
              className="object-cover w-full h-full rounded-full"
            />
          ) : (
            <div className="text-sm text-gray-500 text-center">FOTO</div>
          )}
        </div>

        {/* Member Name - Centered */}
        <div className="text-center text-lg font-bold text-black mb-3">
          {user.fullName.toUpperCase()}
        </div>

        {/* Member ID - Centered */}
        <div className="text-center text-base text-black mb-8">
          No Anggota : {user.userCode}
        </div>

        {/* QR Code - Bottom Left */}
        <div className="absolute bottom-28 left-8">
          {qrCodeDataUrl ? (
            <Image
              src={qrCodeDataUrl}
              alt="QR Code"
              width={60}
              height={60}
              className="border border-gray-300"
            />
          ) : (
            <div className="w-15 h-15 border border-gray-300 bg-gray-100 flex items-center justify-center">
              <div className="text-sm text-gray-600">QR</div>
            </div>
          )}
        </div>
      </div>

      {/* Red Footer */}
      <div className="bg-red-600 h-24 rounded-b-3xl text-white text-center py-4 px-4">
        <div className="text-base font-bold mb-2">Bintaro Business Center</div>
        <div className="text-sm leading-tight">Jl RC Veteran Raya No 1i, Bintaro - Kec Pesanggrahan</div>
        <div className="text-sm leading-tight">Kota Jakarta Selatan DKI Jakarta 12330</div>
        <div className="text-sm leading-tight">Telp: 0811 1889 3679 Email: bintangmerahsejahtera@gmail.com</div>
      </div>
    </div>
  );
}