import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.nextauth.token as any;

  // === PUBLIC: /checker dan /checker/plant/[id] (bahkan semua turunan /checker) ===
  if (pathname === "/checker" || pathname.startsWith("/checker/")) {
    // lewati semua cek role dan jangan redirect
    return NextResponse.next();
  }

  // === PROTECTED: role-based untuk route lain ===
  const roleRoutes: Record<string, string[]> = {
    "/checker": ["staff", "admin"],
    "/admin": ["admin"],
    "/finance": ["finance", "admin"],
  };

  for (const [route, roles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route)) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      // If user is logged in but doesn't have the right role, sign them out
      if (!roles.includes(token.role)) {
        const response = NextResponse.redirect(new URL("/login", req.url));
        // Clear the NextAuth session cookie to force logout
        response.cookies.set("next-auth.session-token", "", {
          expires: new Date(0),
          path: "/",
        });
        response.cookies.set("__Secure-next-auth.session-token", "", {
          expires: new Date(0),
          path: "/",
          secure: true,
        });
        return response;
      }
    }
  }

  // === USER VERIFICATION CHECK ===
  // Routes that require user verification
  const verificationRequiredRoutes = ["/investasi", "/cicilan"];

  if (verificationRequiredRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // If logged in but not a user role, sign them out
    if (token.role !== "user") {
      const response = NextResponse.redirect(new URL("/login", req.url));
      // Clear the NextAuth session cookie to force logout
      response.cookies.set("next-auth.session-token", "", {
        expires: new Date(0),
        path: "/",
      });
      response.cookies.set("__Secure-next-auth.session-token", "", {
        expires: new Date(0),
        path: "/",
        secure: true,
      });
      return response;
    }

    // Check if user role is 'user' and not verified
    if (token.role === "user" && !token.canPurchase) {
      return NextResponse.redirect(new URL("/verification-pending", req.url));
    }
  }

  return NextResponse.next();
});

// Middleware cukup dipasang untuk rute yang memang mau diproteksi.
// (jangan tambahkan /checker ke matcher)
export const config = {
  matcher: [
    "/staff/:path*",
    "/admin/:path*",
    "/finance/:path*",
    "/investasi/:path*",
    "/cicilan/:path*",
    "/semua-investasi/:path*",
    "/tanaman/:path*",
  ],
};
