import { AuthProvider } from "@/components/providers/AuthProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Investasi Hijau - Platform Investasi Tanaman Terpercaya",
  description: "Investasi tanaman berkualitas tinggi dengan keuntungan menarik dan ramah lingkungan. Mulai dari Rp 100.000 saja!",
  keywords: "investasi tanaman, investasi hijau, pertanian, passive income, ramah lingkungan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
