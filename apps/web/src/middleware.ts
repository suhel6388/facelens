import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/search",
  "/searches",
  "/collections",
  "/history",
  "/billing",
  "/settings",
  "/profile",
  "/admin",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const hasSessionCookie =
    Boolean(request.cookies.get("facelens_access")?.value) ||
    Boolean(request.cookies.get("facelens_refresh")?.value);

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/search/:path*",
    "/searches/:path*",
    "/collections/:path*",
    "/history/:path*",
    "/billing/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
