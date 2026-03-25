/**
 * Canonical intake event names for cross-channel reporting and future instrumentation.
 * DB mapping and gaps: see REPORTING_HUB.md at the repo root of easy-intake-app.
 */
export const CANONICAL_INTAKE_EVENTS = {
  INTAKE_STARTED: "intake.started",
  INTAKE_COMPLETED: "intake.completed",
  INTAKE_FAILED: "intake.failed",
  STAGE_ADVANCED: "stage.advanced",
  EXTRACTION_UPDATED: "extraction.updated",
  DESTINATION_SYNC_ATTEMPTED: "destination.sync.attempted",
  DESTINATION_SYNC_COMPLETED: "destination.sync.completed",
  DESTINATION_SYNC_FAILED: "destination.sync.failed",
  LEAD_WEBHOOK_EVENT: "lead.webhook.event",
  FOLLOWUP_OUTCOME: "followup.outcome",
} as const;

export type CanonicalIntakeEventName =
  (typeof CANONICAL_INTAKE_EVENTS)[keyof typeof CANONICAL_INTAKE_EVENTS];
