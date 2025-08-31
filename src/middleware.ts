import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = req.nextauth.token as any;

    // === PUBLIC: /checker dan /checker/plant/[id] (bahkan semua turunan /checker) ===
    if (pathname === "/checker" || pathname.startsWith("/checker/")) {
      // lewati semua cek role dan jangan redirect
      return NextResponse.next();
    }

    // === PROTECTED: role-based untuk route lain ===
    const roleRoutes: Record<string, string[]> = {
      "/staff": ["staff", "admin"],
      "/admin": ["admin"],
      "/finance": ["finance", "admin"],
    };

    for (const [route, roles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        if (!token || !roles.includes(token.role)) {
          return NextResponse.redirect(new URL("/login", req.url));
        }
      }
    }

    // === USER VERIFICATION CHECK ===
    // Routes that require user verification
    const verificationRequiredRoutes = ["/investasi", "/cicilan", "/semua-investasi", "/tanaman"];
    
    if (verificationRequiredRoutes.some(route => pathname.startsWith(route))) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      
      // Check if user role is 'user' and not verified
      if (token.role === 'user' && !token.canPurchase) {
        return NextResponse.redirect(new URL("/verification-pending", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // exact public
        const publicExact = ["/", "/login", "/register", "/forgot-password"];

        // next-auth endpoints dan semua /checker/* selalu public
        const isAuthApi = pathname.startsWith("/api/auth");
        const isCheckerPublic =
          pathname === "/checker" || pathname.startsWith("/checker/");

        if (publicExact.includes(pathname) || isAuthApi || isCheckerPublic) {
          return true;
        }

        return !!token;
      },
    },
  }
);

// Middleware cukup dipasang untuk rute yang memang mau diproteksi.
// (jangan tambahkan /checker ke matcher)
export const config = {
  matcher: ["/staff/:path*", "/admin/:path*", "/finance/:path*", "/investasi/:path*", "/cicilan/:path*", "/semua-investasi/:path*", "/tanaman/:path*"],
};
