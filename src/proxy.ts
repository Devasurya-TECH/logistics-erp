import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const appRole = process.env.NEXT_PUBLIC_APP_ROLE;
  const { pathname } = request.nextUrl;

  if (!appRole) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/login") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${appRole}`, request.url));
  }

  if (pathname.startsWith(`/${appRole}`)) {
    return NextResponse.next();
  }

  const roleRoutes = ["driver", "supervisor", "manager"];
  const isOtherRole = roleRoutes.some(
    (role) => role !== appRole && pathname.startsWith(`/${role}`),
  );

  if (isOtherRole) {
    return NextResponse.redirect(new URL(`/${appRole}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.json$).*)"],
};
