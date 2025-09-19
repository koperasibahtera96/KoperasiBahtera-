import React from 'react';

export default function KartuAnggotaBack() {
  return (
    <div className="relative w-[340px] h-[216px] bg-white border-2 border-black rounded-lg overflow-hidden">
      {/* Red Header */}
      <div className="bg-red-600 h-16 rounded-t-lg text-white text-center py-2">
        <div className="text-xs font-bold">KOPERASI</div>
        <div className="text-xs font-bold">BINTANG MERAH SEJAHTERA</div>
        <div className="text-[8px] mt-1">Akta Notaris TEDDY YUNADI, SH No: 01/AP-04.09/2016</div>
        <div className="text-[8px]">SK KEMENKUMHAM No: AHU-0005960.AH.01.28.TAHUN 2022</div>
      </div>

      {/* Main Content */}
      <div className="p-4 flex-1">
        {/* Title */}
        <div className="text-center text-lg font-bold text-black mb-4">
          KETENTUAN
        </div>

        {/* Terms and Conditions */}
        <div className="text-[9px] text-black leading-tight space-y-1">
          <div>
            <span className="font-semibold">1.</span> Kartu ini merupakan kartu anggota<br />
            &nbsp;&nbsp;&nbsp;&nbsp;Koperasi Bintang Merah Sejahtera.
          </div>

          <div>
            <span className="font-semibold">2.</span> Penggunaan kartu ini tunduk pada<br />
            &nbsp;&nbsp;&nbsp;&nbsp;ketentuan yang berlaku sebagaimana di<br />
            &nbsp;&nbsp;&nbsp;&nbsp;atur dalam Anggaran Dasar (AD) dan<br />
            &nbsp;&nbsp;&nbsp;&nbsp;Anggaran Rumah Tangga (ART) Koperasi<br />
            &nbsp;&nbsp;&nbsp;&nbsp;Bintang Merah Sejahtera.
          </div>

          <div>
            <span className="font-semibold">3.</span> Kartu anggota tidak dapat dipindah<br />
            &nbsp;&nbsp;&nbsp;&nbsp;tangankan, pemindahan hak dan kewajiban<br />
            &nbsp;&nbsp;&nbsp;&nbsp;di atur dalam AD/ART Koperasi Bintang<br />
            &nbsp;&nbsp;&nbsp;&nbsp;Merah Sejahtera.
          </div>

          <div>
            <span className="font-semibold">4.</span> Penggunaan kartu anggota sepenuhnya<br />
            &nbsp;&nbsp;&nbsp;&nbsp;menjadi tanggung jawab anggota
          </div>

          <div>
            <span className="font-semibold">5.</span> Koperasi Bintang Merah Sejahtera tidak<br />
            &nbsp;&nbsp;&nbsp;&nbsp;bertanggung jawab terhadap penggunaan<br />
            &nbsp;&nbsp;&nbsp;&nbsp;kartu anggota diluar ketentuan yang<br />
            &nbsp;&nbsp;&nbsp;&nbsp;berlaku.
          </div>
        </div>
      </div>

      {/* Red Footer */}
      <div className="bg-red-600 h-12 rounded-b-lg text-white text-center py-2">
        <div className="text-xs font-bold">KETUA</div>
        <div className="text-[10px] mt-1">Halim Perdana Kusuma, S.H., M.H.</div>
      </div>
    </div>
  );
}