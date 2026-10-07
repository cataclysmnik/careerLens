import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Proxy (formerly middleware) always runs on the Node.js runtime in this
// Next.js version, so it can safely share lib/auth.ts, which depends on
// Prisma for its signIn/jwt callbacks.

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/pending-approval"]);

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/dashboard",
  COMPANY: "/company",
  PLACEMENT_CELL: "/placement",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname === "/api/register") {
    return NextResponse.next();
  }

  const isApiRoute = pathname.startsWith("/api/");

  if (!req.auth) {
    if (PUBLIC_PATHS.has(pathname)) {
      return NextResponse.next();
    }
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const { role, status } = req.auth.user;
  const home = ROLE_HOME[role] ?? "/dashboard";

  if (status === "PENDING") {
    if (pathname === "/pending-approval") return NextResponse.next();
    if (isApiRoute) {
      return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/pending-approval", req.nextUrl));
  }

  if (pathname === "/login" || pathname === "/register" || pathname === "/pending-approval") {
    return NextResponse.redirect(new URL(home, req.nextUrl));
  }

  const isStudentArea = ["/dashboard", "/onboarding", "/matcher", "/profile"].some((p) =>
    pathname.startsWith(p)
  );
  const isCompanyArea = pathname.startsWith("/company");
  const isPlacementArea = pathname.startsWith("/placement");

  if (
    (isStudentArea && role !== "STUDENT") ||
    (isCompanyArea && role !== "COMPANY") ||
    (isPlacementArea && role !== "PLACEMENT_CELL")
  ) {
    return NextResponse.redirect(new URL(home, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
