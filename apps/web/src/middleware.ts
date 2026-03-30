import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
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

/** Legal pages reachable without an account. */
const isPublicLegalRoute = createRouteMatcher([
  "/en/terms(.*)",
  "/es/terms(.*)",
  "/en/privacy(.*)",
  "/es/privacy(.*)",
]);

/**
 * Clerk recommends returning next-intl from inside clerkMiddleware so locale handling
 * runs on the same response chain as auth (see Clerk "Combine Middleware" docs).
 *
 * For `/api` and `/trpc`, skip next-intl only (it can redirect `/api/...` → `/en/api/...`
 * and break JSON). Clerk still runs so `auth()` works in Route Handlers.
 */
const middleware = clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
    return NextResponse.next();
  }
  if (
    !isPublicAuthRoute(req) &&
    !isPublicLegalRoute(req) &&
    isProtectedRoute(req)
  ) {
    await auth.protect();
  }
  return intlMiddleware(req);
});

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
