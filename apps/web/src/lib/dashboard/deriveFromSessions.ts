import type { IntakeSessionListRow } from "@easy-intake/shared";

const INTAKE = new Set(["created", "collecting"]);
const VALIDATE = new Set(["awaiting_hitl", "awaiting_applicant"]);
const CLOSE = new Set(["ready_to_submit"]);
const TRANSFER = new Set(["submitted", "synced"]);

export type DashboardFunnelStageId = "intake" | "validate" | "close" | "transfer";

export interface DerivedFunnelStage {
  id: DashboardFunnelStageId;
  count: number;
  sharePct: number;
}

/** Pipeline KPIs derived from session statuses (current list slice, not a warehouse). */
export interface SalesKpis {
  leads: number;
  appsStarted: number;
  appsCompleted: number;
  appsSubmitted: number;
  appsAccepted: number;
}

export interface DerivedDashboard {
  total: number;
  funnel: DerivedFunnelStage[];
  conversion: {
    intakeToValidate: number;
    validateToClose: number;
    closeToTransfer: number;
  };
  kpis: {
    avgCompletenessPct: number;
    pendingHitl: number;
    failedOrCancelled: number;
    channelVoicePct: number;
    channelMessagingPct: number;
    channelPartnerPct: number;
  };
  recent: {
    id: string;
    atIso: string;
    status: string;
  }[];
}

/**
 * Counts sessions that are still workable outcomes (excludes failed/cancelled).
 * Definitions are aligned to the shared IntakeSessionStatus model.
 */
export function computeSalesKpis(rows: IntakeSessionListRow[]): SalesKpis {
  const pool = rows.filter(
    (r) => r.status !== "failed" && r.status !== "cancelled"
  );
  const leads = pool.length;
  const appsStarted = pool.filter(
    (r) => r.status !== "created" || r.completenessScore > 0
  ).length;
  const appsCompleted = pool.filter((r) =>
    ["ready_to_submit", "submitted", "synced"].includes(r.status)
  ).length;
  const appsSubmitted = pool.filter((r) =>
    ["submitted", "synced"].includes(r.status)
  ).length;
  const appsAccepted = pool.filter((r) => r.status === "synced").length;

  return {
    leads,
    appsStarted,
    appsCompleted,
    appsSubmitted,
    appsAccepted,
  };
}

export function filterSessionsForDashboard(
  rows: IntakeSessionListRow[],
  carrier: string | undefined,
  product: string | undefined
): IntakeSessionListRow[] {
  const c = carrier?.trim();
  const p = product?.trim();
  return rows.filter((r) => {
    if (c && c !== "all" && r.verticalId !== c) return false;
    if (p && p !== "all" && r.configPackageId !== p) return false;
    return true;
  });
}

function bucketStatus(status: string): DashboardFunnelStageId | "other" {
  if (INTAKE.has(status)) return "intake";
  if (VALIDATE.has(status)) return "validate";
  if (CLOSE.has(status)) return "close";
  if (TRANSFER.has(status)) return "transfer";
  return "other";
}

function channelMix(summary: string): "voice" | "messaging" | "partner" | "unknown" {
  const s = summary.toLowerCase();
  if (s.includes("voice")) return "voice";
  if (s.includes("sms") || s.includes("whatsapp")) return "messaging";
  if (s.includes("webhook") || s.includes("partner") || s.includes("web_form")) {
    return "partner";
  }
  if (s === "—" || !s.trim()) return "unknown";
  return "unknown";
}

/**
 * Pure transforms on the intake session list returned by the BFF (up to API limit, typically 100 rows).
 */
export function deriveDashboardFromSessions(
  rows: IntakeSessionListRow[]
): DerivedDashboard {
  const total = rows.length;
  const intake = rows.filter((r) => bucketStatus(r.status) === "intake").length;
  const validate = rows.filter((r) => bucketStatus(r.status) === "validate").length;
  const close = rows.filter((r) => bucketStatus(r.status) === "close").length;
  const transfer = rows.filter((r) => bucketStatus(r.status) === "transfer").length;

  const funnelCounts: Record<DashboardFunnelStageId, number> = {
    intake,
    validate,
    close,
    transfer,
  };

  const funnel: DerivedFunnelStage[] = (
    ["intake", "validate", "close", "transfer"] as const
  ).map((id) => ({
    id,
    count: funnelCounts[id],
    sharePct: total > 0 ? Math.round((funnelCounts[id] / total) * 1000) / 10 : 0,
  }));

  const pastIntake = validate + close + transfer;
  const pastValidate = close + transfer;
  const intakeToValidate =
    total > 0 ? Math.min(100, Math.round((pastIntake / total) * 1000) / 10) : 0;
  const validateDenom = validate + close + transfer;
  const validateToClose =
    validateDenom > 0
      ? Math.min(100, Math.round((pastValidate / validateDenom) * 1000) / 10)
      : 0;
  const closeDenom = close + transfer;
  const closeToTransfer =
    closeDenom > 0 ? Math.min(100, Math.round((transfer / closeDenom) * 1000) / 10) : 0;

  const avgCompletenessPct =
    total > 0
      ? Math.round(
          (rows.reduce((a, r) => a + r.completenessScore, 0) / total) * 1000
        ) / 10
      : 0;

  const pendingHitl = rows.filter((r) => r.pendingHitl).length;
  const failedOrCancelled = rows.filter(
      (r) => r.status === "failed" || r.status === "cancelled"
    ).length;

  let voice = 0;
  let messaging = 0;
  let partner = 0;
  let channelKnown = 0;
  for (const r of rows) {
    const b = channelMix(r.channelSummary);
    if (b === "unknown") continue;
    channelKnown += 1;
    if (b === "voice") voice += 1;
    else if (b === "messaging") messaging += 1;
    else partner += 1;
  }
  const channelVoicePct =
    channelKnown > 0 ? Math.round((voice / channelKnown) * 1000) / 10 : 0;
  const channelMessagingPct =
    channelKnown > 0 ? Math.round((messaging / channelKnown) * 1000) / 10 : 0;
  const channelPartnerPct =
    channelKnown > 0 ? Math.round((partner / channelKnown) * 1000) / 10 : 0;

  const recent = [...rows]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 12)
    .map((r) => ({
      id: r.sessionId,
      atIso: r.updatedAt,
      status: r.status,
    }));

  return {
    total,
    funnel,
    conversion: {
      intakeToValidate,
      validateToClose,
      closeToTransfer,
    },
    kpis: {
      avgCompletenessPct,
      pendingHitl,
      failedOrCancelled,
      channelVoicePct,
      channelMessagingPct,
      channelPartnerPct,
    },
    recent,
  };
}
