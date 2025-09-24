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
    // For mobile QR scans, preserve the URL path for redirect after login
    const callbackUrl = encodeURIComponent(pathname + req.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
  }



  const userRole = token.role as string;

  // === ADMIN ACCESS ===
  // Admin can access everything
  if (userRole === "admin") {
    console.log(`✅ Admin access granted to ${pathname}`);
    return NextResponse.next();
  }

  // === KETUA ACCESS ===
  // Ketua can only access specific pages (read-only)
  if (userRole === "ketua") {
    const allowedKetuaPaths = [
      "/admin/investors",
      "/admin/trees", 
      "/admin/laporan"
    ];
    
    const isAllowedPath = allowedKetuaPaths.some(path => pathname.startsWith(path));
    
    if (isAllowedPath) {
      console.log(`✅ Ketua access granted to ${pathname} (read-only)`);
      return NextResponse.next();
    } else {
      console.log(`❌ Ketua role denied access to ${pathname} - only allowed ${allowedKetuaPaths.join(', ')}`);
      return NextResponse.redirect(new URL("/admin/investors", req.url));
    }
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

  // === MARKETING ACCESS ===
  if (pathname.startsWith("/marketing")) {
    const allowedRoles = ["marketing_head", "admin"];
    if (allowedRoles.includes(userRole)) {
      console.log(`✅ ${userRole} access granted to ${pathname}`);
      return NextResponse.next();
    } else {
      console.log(`❌ User role '${userRole}' denied access to ${pathname}`);
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // === STAFF ACCESS ===
  if (pathname.startsWith("/staff")) {
    const allowedRoles = ["marketing", "marketing_head", "admin"];
    if (allowedRoles.includes(userRole)) {
      console.log(`✅ ${userRole} access granted to ${pathname}`);
      return NextResponse.next();
    } else {
      console.log(`❌ User role '${userRole}' denied access to ${pathname}`);
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // === USER ACCESS ===
  if (userRole === "user") {
    // Routes users can always access (regardless of verification status)
    const alwaysAllowedPaths = [
      "/profile",
      "/verification-pending",
      "/kartu-anggota"
    ];

    // Routes users can access only when verified
    const verifiedOnlyPaths = [
      "/plants",
      "/payments",
      "/cicilan",
      "/contract"
    ];

    const isAlwaysAllowed = alwaysAllowedPaths.some(path => pathname.startsWith(path));
    const isVerifiedOnly = verifiedOnlyPaths.some(path => pathname.startsWith(path));

    if (isAlwaysAllowed) {
      console.log(`✅ User access granted to ${pathname} (always allowed)`);
      return NextResponse.next();
    } else if (isVerifiedOnly) {
      if (token.canPurchase && token.verificationStatus === "approved") {
        console.log(`✅ User access granted to ${pathname} (verified)`);
        return NextResponse.next();
      } else {
        console.log(`❌ User access denied to ${pathname} - not verified or cannot purchase`);
        return NextResponse.redirect(new URL("/verification-pending", req.url));
      }
    } else {
      console.log(`❌ User role denied access to ${pathname} - not in allowed paths`);
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // === PUBLIC ACCESS ===
  if (pathname.startsWith("/public")) {
    console.log(`✅ Public access granted to ${pathname}`);
    return NextResponse.next();
  }

  // === FALLBACK - DENY ACCESS ===
  console.log(`❌ Unhandled route ${pathname} for role ${userRole} - access denied`);
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/finance/:path*",
    "/checker/:path*",
    "/marketing/:path*",
    "/staff/:path*",
    "/plants/:path*",
    "/payments/:path*",
    "/public/:path*",
    "/profile/:path*",
    "/verification-pending/:path*",
    "/kartu-anggota/:path*",
    "/cicilan/:path*",
    "/contract/:path*"
  ],
};
