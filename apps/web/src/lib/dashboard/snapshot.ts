/**
 * Dashboard metrics snapshot. Replace getDashboardSnapshot() with API/warehouse
 * data when backend reporting endpoints exist — shape is intentionally generic.
 */

export type FunnelStageId = "intake" | "validate" | "close" | "transfer";

export interface FunnelStageSnapshot {
  id: FunnelStageId;
  entered: number;
  completed: number;
}

export interface DashboardSnapshot {
  funnel: FunnelStageSnapshot[];
  /** Illustrative pipeline counts for demo KPI cards (not tied to list filters). */
  salesKpis: {
    leads: number;
    appsStarted: number;
    appsCompleted: number;
    appsSubmitted: number;
    appsAccepted: number;
  };
  /** Optional filter chips for demo layout only. */
  demoFilterPrograms: string[];
  demoFilterProducts: string[];
  kpis: {
    totalSessions: number;
    avgIntakeMinutes: number;
    verificationRatePct: number;
    closePaymentRatePct: number;
    destinationSuccessRatePct: number;
    medianFirstResponseMinutes: number;
    openExceptions: number;
    channelVoicePct: number;
    channelMessagingPct: number;
    channelPartnerPct: number;
  };
  stageConversion: {
    intakeToValidate: number;
    validateToClose: number;
    closeToTransfer: number;
  };
  recentActivity: Array<{
    id: string;
    atIso: string;
    eventKey:
      | "sessionStarted"
      | "verificationCompleted"
      | "closeCompleted"
      | "destinationSynced"
      | "exceptionRaised";
  }>;
}

/** Demo-only: narrows illustrative KPIs when filters are applied (no session list in demo). */
export function scaleDemoSalesKpis(
  base: DashboardSnapshot["salesKpis"],
  carrier: string | undefined,
  product: string | undefined
): DashboardSnapshot["salesKpis"] {
  let factor = 1;
  if (carrier && carrier !== "all") factor *= 0.52;
  if (product && product !== "all") factor *= 0.52;
  const s = (n: number) => Math.max(0, Math.round(n * factor));
  return {
    leads: s(base.leads),
    appsStarted: s(base.appsStarted),
    appsCompleted: s(base.appsCompleted),
    appsSubmitted: s(base.appsSubmitted),
    appsAccepted: s(base.appsAccepted),
  };
}

export function getDashboardSnapshot(): DashboardSnapshot {
  return {
    funnel: [
      { id: "intake", entered: 1840, completed: 1522 },
      { id: "validate", entered: 1522, completed: 1288 },
      { id: "close", entered: 1288, completed: 1104 },
      { id: "transfer", entered: 1104, completed: 1061 },
    ],
    salesKpis: {
      leads: 1840,
      appsStarted: 1688,
      appsCompleted: 1150,
      appsSubmitted: 1104,
      appsAccepted: 1061,
    },
    demoFilterPrograms: ["demo-program-east", "demo-program-west"],
    demoFilterProducts: ["standard-intake-a", "standard-intake-b"],
    kpis: {
      totalSessions: 1840,
      avgIntakeMinutes: 7,
      verificationRatePct: 84.6,
      closePaymentRatePct: 85.7,
      destinationSuccessRatePct: 96.1,
      medianFirstResponseMinutes: 3,
      openExceptions: 23,
      channelVoicePct: 52,
      channelMessagingPct: 31,
      channelPartnerPct: 17,
    },
    stageConversion: {
      intakeToValidate: 82.7,
      validateToClose: 84.4,
      closeToTransfer: 96.1,
    },
    recentActivity: [
      {
        id: "1",
        atIso: new Date(Date.now() - 2 * 60_000).toISOString(),
        eventKey: "destinationSynced",
      },
      {
        id: "2",
        atIso: new Date(Date.now() - 14 * 60_000).toISOString(),
        eventKey: "closeCompleted",
      },
      {
        id: "3",
        atIso: new Date(Date.now() - 28 * 60_000).toISOString(),
        eventKey: "verificationCompleted",
      },
      {
        id: "4",
        atIso: new Date(Date.now() - 45 * 60_000).toISOString(),
        eventKey: "sessionStarted",
      },
      {
        id: "5",
        atIso: new Date(Date.now() - 62 * 60_000).toISOString(),
        eventKey: "exceptionRaised",
      },
    ],
  };
}
