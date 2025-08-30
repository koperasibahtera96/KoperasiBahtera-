import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investasi Pertanian Berkelanjutan | Investasi Hijau',
  description: 'Solusi tepat bagi Anda yang ingin meraih keuntungan sekaligus memberikan dampak positif bagi lingkungan dan masyarakat.',
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}