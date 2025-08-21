import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Define role-based access
    const roleRoutes = {
      '/staff': ['staff', 'admin'],
      '/admin': ['admin'],
      '/finance': ['finance', 'admin'],
    };

    // Check if user has permission for the route
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route)) {
        if (!token || !allowedRoles.includes(token.role as string)) {
          // Redirect to login without error parameters
          return NextResponse.redirect(new URL('/login', req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes that don't require authentication
        const publicRoutes = ['/', '/login', '/register', '/forgot-password'];

        if (publicRoutes.some(route => pathname === route || pathname.startsWith('/api/auth'))) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/staff/:path*', '/admin/:path*', '/finance/:path*']
};