import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

/**
 * Clerk-based session. Returns null if signed out.
 */
export async function getSession() {
  return auth();
}

/**
 * Requires auth. Redirects to sign-in if signed out.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    const locale = await getLocale();
    redirect(`/${locale}/sign-in`);
  }
  return session;
}
