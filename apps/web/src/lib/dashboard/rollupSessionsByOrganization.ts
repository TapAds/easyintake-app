import type { IntakeSessionListRow } from "@easy-intake/shared";

export interface OrgVolumeRow {
  organizationId: string;
  sessionCount: number;
  latestUpdatedAtIso: string;
}

/**
 * Groups the session list by organizationId for CEO / platform views.
 */
export function rollupSessionsByOrganization(
  rows: IntakeSessionListRow[]
): OrgVolumeRow[] {
  const byOrg = new Map<
    string,
    { count: number; latest: number }
  >();

  for (const r of rows) {
    const orgId = r.organizationId || "—";
    const t = new Date(r.updatedAt).getTime();
    const cur = byOrg.get(orgId);
    if (!cur) {
      byOrg.set(orgId, { count: 1, latest: t });
    } else {
      cur.count += 1;
      if (t > cur.latest) cur.latest = t;
    }
  }

  return Array.from(byOrg.entries())
    .map(([organizationId, { count, latest }]) => ({
      organizationId,
      sessionCount: count,
      latestUpdatedAtIso: new Date(latest).toISOString(),
    }))
    .sort((a, b) => b.sessionCount - a.sessionCount);
}
