import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

// Proxy (formerly middleware) always runs on the Node.js runtime in this
// Next.js version, so it can safely share lib/auth.ts, which depends on
// Prisma for its signIn/jwt callbacks.

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/pending-approval",
  "/forgot-password",
  "/reset-password",
]);

const ROLE_HOME: Record<string, string> = {
  STUDENT: "/dashboard",
  COMPANY: "/company",
  PLACEMENT_CELL: "/placement",
};

// Students start on the Resume Parser; every other student page unlocks once
// their first analysis (StudentEvidence row) is saved.
const RESUME_PATH = "/profile/resume";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/password/") ||
    pathname === "/api/register"
  ) {
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

  const isStudentArea = ["/dashboard", "/onboarding", "/matcher", "/interview", "/profile", "/jobs"].some((p) =>
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

  // The old onboarding page was folded into the Resume Parser.
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL(RESUME_PATH, req.nextUrl));
  }

  // Once set up, a cookie skips the database check on later navigations. It
  // only controls this redirect; the APIs never trust it.
  const setupCookie = `cl_setup_${req.auth.user.id}`;
  if (isStudentArea && role === "STUDENT" && !pathname.startsWith(RESUME_PATH) && !req.cookies.has(setupCookie)) {
    try {
      const evidence = await prisma.studentEvidence.findUnique({
        where: { userId: req.auth.user.id },
        select: { id: true },
      });
      if (!evidence) return NextResponse.redirect(new URL(RESUME_PATH, req.nextUrl));
      const res = NextResponse.next();
      res.cookies.set(setupCookie, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      return res;
    } catch (e) {
      console.error("Proxy evidence check error:", e);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
