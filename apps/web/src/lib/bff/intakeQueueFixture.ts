import type { IntakeSessionListRow } from "@easy-intake/shared";

/**
 * Stub queue rows until apps/api list endpoint exists.
 */
export function getIntakeQueueFixture(): IntakeSessionListRow[] {
  const t1 = "2026-03-25T12:00:00.000Z";
  const t2 = "2026-03-25T14:30:00.000Z";
  const t3 = "2026-03-24T09:15:00.000Z";

  return [
    {
      sessionId: "sess_stub",
      organizationId: "org_fixture_001",
      verticalId: "insurance",
      configPackageId: "insurance",
      status: "collecting",
      updatedAt: t1,
      completenessScore: 0.35,
      channelSummary: "voice",
      pendingHitl: false,
    },
    {
      sessionId: "sess_alpha",
      organizationId: "org_fixture_001",
      verticalId: "insurance",
      configPackageId: "insurance",
      status: "awaiting_hitl",
      updatedAt: t2,
      completenessScore: 0.82,
      channelSummary: "voice · microsite",
      pendingHitl: true,
    },
    {
      sessionId: "sess_beta",
      organizationId: "org_fixture_002",
      verticalId: "insurance",
      configPackageId: "insurance",
      status: "ready_to_submit",
      updatedAt: t3,
      completenessScore: 0.96,
      channelSummary: "web_form · sms",
      pendingHitl: false,
    },
  ];
}
