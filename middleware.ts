import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get auth token from cookies or localStorage (checked via header)
  const token = request.cookies.get('token')?.value;
  const userId = request.cookies.get('userId')?.value;

  // Public routes that don't require authentication
  const publicRoutes = ['/welcome', '/login', '/register'];

  // Semi-protected routes that need some auth (email/password OR MetaMask)
  // These routes can be accessed after email/password login but before wallet connection
  const semiProtectedRoutes = ['/connect-wallet'];

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isSemiProtectedRoute = semiProtectedRoutes.some(route => pathname.startsWith(route));

  // If user is not authenticated and trying to access protected route
  if (!isPublicRoute && !isSemiProtectedRoute && !token && !userId) {
    // Redirect to welcome/login
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

  // If user is authenticated and trying to access login/register
  if ((pathname.startsWith('/login') || pathname.startsWith('/register')) && (token || userId)) {
    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
