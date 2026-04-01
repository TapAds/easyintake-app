import { prisma } from "../db/prisma";
import { organizationIdForGhlLocation } from "./ghlInboundProcessor";

export type OperatorOrgScope =
  | { mode: "all" }
  | { mode: "orgs"; organizationIds: string[] };

/**
 * Tenant keys visible to a Clerk organization: the Clerk org id plus any
 * `ghl:{locationId}` namespaces for AgencyConfig rows linked to that org.
 */
export async function resolveOrganizationIdsForClerkOrg(
  clerkOrgId: string
): Promise<string[]> {
  const id = clerkOrgId.trim();
  if (!id) return [];

  const agencies = await prisma.agencyConfig.findMany({
    where: { clerkOrganizationId: id },
    select: { ghlLocationId: true },
  });

  const ghl = agencies.map((a) => organizationIdForGhlLocation(a.ghlLocationId));
  return Array.from(new Set([id, ...ghl]));
}

export function sessionOrganizationInScope(
  organizationId: string,
  scope: OperatorOrgScope
): boolean {
  if (scope.mode === "all") return true;
  return scope.organizationIds.includes(organizationId);
}
