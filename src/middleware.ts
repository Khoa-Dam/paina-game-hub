import { NextRequest, NextResponse } from "next/server";

// Lightweight presence-only check for fast redirects. The real signature
// verification (HMAC) happens in route handlers / server components via
// lib/session.ts, which runs on the Node runtime where `crypto` is available.
const USER_PATHS = ["/home", "/games", "/play", "/result", "/history", "/leaderboard", "/profile"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasAdmin = req.cookies.has("paina_admin_session");
    if (!hasAdmin) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (USER_PATHS.some((p) => pathname.startsWith(p))) {
    const hasEmployee = req.cookies.has("paina_session");
    if (!hasEmployee) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/home/:path*", "/games/:path*", "/play/:path*", "/result/:path*", "/history/:path*", "/leaderboard/:path*", "/profile/:path*"],
};
