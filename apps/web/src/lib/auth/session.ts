import { auth } from "@clerk/nextjs/server";
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
    redirect("/sign-in");
  }
  return session;
}
