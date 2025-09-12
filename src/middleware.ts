import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get JWT token with dynamic cookie name based on environment
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If no token, redirect to login for protected routes only
  if (!token) {
    console.log(`❌ No token found for ${pathname}, redirecting to login`);
    // For mobile QR scans, preserve the URL path for redirect after login
    const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
  }

  console.log(`🔍 User ${token.email} (${token.role}) accessing ${pathname}`);
  console.log(
    `🔍 Token data: canPurchase=${token.canPurchase}, verificationStatus=${token.verificationStatus}`
  );

  const userRole = token.role as string;

  // === ADMIN ACCESS ===
  // Admin can access everything
  if (userRole === "admin") {
    console.log(`✅ Admin access granted to ${pathname}`);
    return NextResponse.next();
  }



  // === FINANCE ACCESS ===
  if (
    pathname.startsWith("/finance") ||
    pathname.startsWith("/semua-investasi") ||
    pathname.startsWith("/invoice") ||
    pathname.startsWith("/laporan-pengeluaran") ||
    pathname.startsWith("/laporan-harian") ||
    pathname.startsWith("/laporan-pemasukan") ||
    pathname.startsWith("/manajemen-anggota") ||
    pathname.startsWith("/anggota")
  ) {
    if (userRole === "finance" || userRole === "staff_finance") {
      console.log(`✅ Finance access granted to ${pathname}`);
      return NextResponse.next();
    } else {
      console.log(`❌ User role '${userRole}' denied access to ${pathname}`);
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // === CHECKER ACCESS ===
  if (pathname.startsWith("/checker")) {
    const allowedRoles = ["staff", "spv_staff", "finance", "admin"];
    if (allowedRoles.includes(userRole)) {
      console.log(`✅ ${userRole} access granted to ${pathname}`);
      return NextResponse.next();
    } else {
      console.log(`❌ User role '${userRole}' denied access to ${pathname}`);
      // For mobile QR scans, provide better UX by redirecting to login with callback
      const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search);
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
    }
  }

  if (pathname.startsWith("/investasi") || pathname.startsWith("/cicilan")) {
      if (token.canPurchase && token.verificationStatus === "approved") {
        return NextResponse.next();
      } else {
        return NextResponse.redirect(new URL("/verification-pending", req.url));
      }

  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/finance/:path*",
    "/checker/:path*",
    "/investasi/:path*",
    "/cicilan/:path*",
  ],
};
