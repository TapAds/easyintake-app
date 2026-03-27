import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/en",
  "/en(.*)",
  "/es",
  "/es(.*)",
]);

/** Public so unauthenticated users can complete Clerk flows (must skip auth.protect). */
const isPublicAuthRoute = createRouteMatcher([
  "/en/sign-in(.*)",
  "/en/sign-up(.*)",
  "/es/sign-in(.*)",
  "/es/sign-up(.*)",
]);

/**
 * Clerk recommends returning next-intl from inside clerkMiddleware so locale handling
 * runs on the same response chain as auth (see Clerk "Combine Middleware" docs).
 */
const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (!isPublicAuthRoute(req) && isProtectedRoute(req)) {
    await auth.protect();
  }
  return intlMiddleware(req);
});

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  const pathname = request.nextUrl.pathname;
  /**
   * Skip intl + Clerk for App Router API routes.
   * - next-intl can redirect `/api/...` → `/en/api/...` and break JSON.
   * - Running `clerkMiddleware` on `/api` can leave client `fetch("/api/...")` pending in dev.
   */
  if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
    return NextResponse.next();
  }
  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
