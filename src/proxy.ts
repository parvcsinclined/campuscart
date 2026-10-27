import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: bounce visitors without a session cookie away from app pages.
// Real authorization (session validity, verification, ownership) happens server-side
// in every page and route via src/lib/authz.ts.
const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/browse/:path*", "/sell/:path*", "/listings/:path*", "/inbox/:path*", "/my/:path*", "/profile/:path*", "/verify"],
};
