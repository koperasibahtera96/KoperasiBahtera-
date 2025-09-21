'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui-staff/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui-staff/card';
import { Download, Printer, ArrowLeft } from 'lucide-react';

interface User {
  fullName: string;
  userCode: string;
  faceImageUrl?: string;
}

interface KartuAnggotaData {
  user: User;
  qrCodeDataUrl: string;
  frontHTML: string;
  backHTML: string;
}

export default function KartuAnggotaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [kartuData, setKartuData] = useState<KartuAnggotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    generateKartuAnggota();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router]);

  const generateKartuAnggota = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/generate-kartu-anggota');

      if (!response.ok) {
        throw new Error('Failed to generate kartu anggota');
      }

      const data = await response.json();

      if (data.success) {
        setKartuData({
          user: {
            fullName: data.user?.fullName || session?.user?.name || 'User',
            userCode: data.user?.userCode || 'Unknown',
            faceImageUrl: data.user?.faceImageUrl
          },
          qrCodeDataUrl: data.qrCodeDataUrl,
          frontHTML: data.frontHTML,
          backHTML: data.backHTML
        });
      } else {
        setError(data.error || 'Failed to generate kartu anggota');
      }
    } catch (err) {
      console.error('Error generating kartu anggota:', err);
      setError('Failed to generate kartu anggota');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Create a new window with the card content
    const printWindow = window.open('', '_blank');
    if (!printWindow || !kartuData) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kartu Anggota - ${kartuData.user.fullName}</title>
        <style>
          @media print {
            body { margin: 0; }
            .print-container {
              display: flex;
              flex-direction: column;
              gap: 20px;
              padding: 20px;
              page-break-inside: avoid;
            }
            .card-side {
              page-break-inside: avoid;
              margin-bottom: 20px;
            }
            /* Make footer text bold with appropriate size */
            [class*="text-white text-center py-6"] {
              font-size: 11px !important;
              font-weight: bold !important;
            }
            /* Make ketentuan text bigger and bolder */
            .text-black.text-base {
              font-size: 1rem !important;
              font-weight: 900 !important;
            }
          }
          @media screen {
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              background: #f0f0f0;
            }
            .print-container {
              display: flex;
              gap: 20px;
              justify-content: center;
              align-items: flex-start;
            }
            /* Make footer text bold with appropriate size */
            [class*="text-white text-center py-6"] {
              font-size: 11px !important;
              font-weight: bold !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="card-side">
            <h3 style="text-align: center; margin-bottom: 10px;">Front Side</h3>
            ${kartuData.frontHTML.replace(/<!DOCTYPE[\s\S]*?<body>/g, '').replace('</body></html>', '')}
          </div>
          <div class="card-side">
            <h3 style="text-align: center; margin-bottom: 10px;">Back Side</h3>
            ${kartuData.backHTML.replace(/<!DOCTYPE[\s\S]*?<body>/g, '').replace('</body></html>', '')}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownload = () => {
    if (!kartuData) return;

    // Create downloadable HTML file
    const combinedHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kartu Anggota - ${kartuData.user.fullName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f0f0f0;
            margin: 0;
          }
          .container {
            display: flex;
            gap: 20px;
            justify-content: center;
            align-items: flex-start;
            flex-wrap: wrap;
          }
          .card-side {
            margin-bottom: 20px;
          }
          h3 {
            text-align: center;
            margin-bottom: 10px;
            color: #333;
          }
          /* Make footer text bold with appropriate size */
          [class*="text-white text-center py-6"] {
            font-size: 11px !important;
            font-weight: bold !important;
          }
          /* Make ketentuan text bigger and bolder */
          .text-black.font-extrabold {
            font-size: 1rem !important;
            font-weight: 900 !important;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card-side">
            <h3>Front Side</h3>
            ${kartuData.frontHTML.replace(/<!DOCTYPE[\s\S]*?<body>/g, '').replace('</body></html>', '')}
          </div>
          <div class="card-side">
            <h3>Back Side</h3>
            ${kartuData.backHTML.replace(/<!DOCTYPE[\s\S]*?<body>/g, '').replace('</body></html>', '')}
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([combinedHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kartu-anggota-${kartuData.user.userCode}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Generating Kartu Anggota...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/profile')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!kartuData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="mb-4">No kartu anggota data available</p>
              <Button onClick={() => router.push('/profile')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">Kartu Anggota</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/profile')} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="flex justify-center gap-8 flex-wrap">
          {/* Front Card */}
          <div
            className="w-[480px] rounded-xl overflow-hidden shadow-lg flex flex-col relative"
            style={{
              filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.15))',
              backgroundImage: 'url(/assets/kartu-anggota-front.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              aspectRatio: '480/720'
            }}
          >
            {/* Card Header */}
            <div
              className="text-white text-center py-6 px-6 relative"
              style={{
                paddingLeft: '98px',
                paddingTop: '24px'
              }}
            >
              <Image
                src="/images/koperasi-logo-kartu-anggota.png"
                alt="Logo"
                width={90}
                height={90}
                className="absolute left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2"
                style={{ left: '49px' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/koperasi-logo-removebg.png";
                }}
              />
              <h2 className="m-0 text-lg font-bold leading-tight">
                <span className="block">KOPERASI</span>
                <span className="block">BINTANG MERAH SEJAHTERA</span>
              </h2>
              <hr
                className="border-0 my-2 mx-5"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.6)'
                }}
              />
              <p className="mx-2 text-xs leading-relaxed text-center">
                <span className="block">Akta Notaris TEDDY YUNADI, SH No: 01/AP-04.09/2016</span>
                <span className="block whitespace-nowrap">SK KEMENKUMHAM No : AHU-0005960.AH.01.28.TAHUN 2022</span>
              </p>
            </div>

            {/* Card Body */}
            <div className="py-5 px-5 flex flex-col items-center gap-2 flex-grow">
              <h3 className="m-0 text-black font-bold">KARTU ANGGOTA</h3>
              <div className="w-[120px] h-[120px] rounded-full overflow-hidden" style={{ backgroundColor: '#f8c3a7' }}>
                {kartuData.user.faceImageUrl ? (
                  <Image
                    src={kartuData.user.faceImageUrl}
                    alt="Member Photo"
                    width={120}
                    height={120}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm">FOTO</span>
                  </div>
                )}
              </div>
              <div className="font-bold text-base text-center text-black">{kartuData.user.fullName}</div>
              <div className="mt-1.5 text-sm text-center text-black">No Anggota : {kartuData.user.userCode}</div>
            </div>

            {/* Bottom row with QR */}
            <div className="flex items-center py-1.5 px-2.5 gap-3 min-h-[96px]">
              <div className="w-20 h-20 flex-shrink-0 ml-1">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.origin + '/kartu-anggota')}`}
                  alt="QR Code"
                  width={80}
                  height={80}
                  className="w-full h-full block"
                />
              </div>
              <div className="flex-grow"></div>
            </div>

            {/* Card Footer */}
            <div
              className="text-white text-center py-6 px-6 leading-relaxed font-bold"
              style={{
                paddingBottom: '24px',
                fontSize: '11px'
              }}
            >
              Bintaro Business Center<br />
              Jl RC Veteran Raya No 1i, Bintaro – Kec Pesanggrahan<br />
              Kota Jakarta Selatan DKI Jakarta 12330<br />
              Telp: 0811 1889 3679 | Email: bintangmerahsejahtera@gmail.com
            </div>
          </div>

          {/* Back Card */}
          <div
            className="w-[480px] rounded-xl overflow-hidden shadow-lg flex flex-col relative"
            style={{
              filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.15))',
              backgroundImage: 'url(/assets/kartu-anggota-back.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              aspectRatio: '480/720'
            }}
          >
            {/* Card Header */}
            <div
              className="text-white text-center py-6 px-6 relative"
              style={{
                paddingLeft: '98px',
                paddingTop: '24px'
              }}
            >
              <Image
                src="/images/koperasi-logo-kartu-anggota.png"
                alt="Logo"
                width={90}
                height={90}
                className="absolute left-1/2 transform -translate-x-1/2 top-1/2 -translate-y-1/2"
                style={{ left: '49px' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/koperasi-logo-removebg.png";
                }}
              />
              <h2 className="m-0 text-lg font-bold leading-tight">
                <span className="block">KOPERASI</span>
                <span className="block">BINTANG MERAH SEJAHTERA</span>
              </h2>
              <hr
                className="border-0 my-2 mx-5"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.6)'
                }}
              />
              <p className="mx-2 text-xs leading-relaxed text-center">
                <span className="block">Akta Notaris TEDDY YUNADI, SH No: 01/AP-04.09/2016</span>
                <span className="block whitespace-nowrap">SK KEMENKUMHAM No : AHU-0005960.AH.01.28.TAHUN 2022</span>
              </p>
            </div>

            {/* Card Body - Back Side Content */}
            <div className="py-5 px-6 flex flex-col flex-grow">
              <h3 className="m-0 text-black font-bold text-center mb-4 text-lg">KETENTUAN</h3>
              <div className="text-black font-extrabold text-base leading-relaxed text-left space-y-3">
                <p>1. Kartu ini merupakan kartu anggota Koperasi Bintang Merah Sejahtera.</p>
                <p>2. Penggunaan kartu ini tunduk pada ketentuan yang berlaku sebagaimana di atur dalam Anggaran Dasar (AD) dan Anggaran Rumah Tangga (ART) Koperasi Bintang Merah Sejahtera.</p>
                <p>3. Kartu anggota tidak dapat dipindah tangankan, pemindahan hak dan kewajiban di atur dalam AD/ART Koperasi Bintang Merah Sejahtera.</p>
                <p>4. Penggunaan kartu anggota sepenuhnya menjadi tanggung jawab anggota</p>
                <p>5. Koperasi Bintang Merah Sejahtera tidak bertanggung jawab terhadap penggunaan kartu anggota diluar ketentuan yang berlaku.</p>
              </div>
            </div>

            {/* Card Footer */}
            <div
              className="text-white text-center py-6 px-6 leading-relaxed font-bold"
              style={{
                paddingBottom: '24px',
                fontSize: '11px'
              }}
            >
              Bintaro Business Center<br />
              Jl RC Veteran Raya No 1i, Bintaro – Kec Pesanggrahan<br />
              Kota Jakarta Selatan DKI Jakarta 12330<br />
              Telp: 0811 1889 3679 | Email: bintangmerahsejahtera@gmail.com
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Instructions</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>Use the Print button to print your membership card</li>
              <li>Use the Download button to save the card as an HTML file</li>
              <li>Print on thick cardstock paper for best results</li>
              <li>Cut along the borders and laminate for durability</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}