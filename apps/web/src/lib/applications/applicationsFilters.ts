import type { IntakeSessionListRow } from "@easy-intake/shared";

export type ApplicationFilterId =
  | "all"
  | "needs_attention"
  | "active_intake"
  | "awaiting_applicant"
  | "awaiting_review"
  | "ready_to_submit"
  | "submitted"
  | "closed";

export const APPLICATION_FILTER_IDS: ApplicationFilterId[] = [
  "all",
  "needs_attention",
  "active_intake",
  "awaiting_applicant",
  "awaiting_review",
  "ready_to_submit",
  "submitted",
  "closed",
];

export function rowMatchesFilter(
  row: IntakeSessionListRow,
  id: ApplicationFilterId
): boolean {
  if (id === "all") return true;
  if (id === "closed") {
    return row.status === "failed" || row.status === "cancelled";
  }
  if (row.status === "failed" || row.status === "cancelled") return false;
  switch (id) {
    case "needs_attention":
      return (
        row.pendingHitl ||
        row.status === "awaiting_hitl" ||
        row.status === "awaiting_applicant"
      );
    case "active_intake":
      return row.status === "created" || row.status === "collecting";
    case "awaiting_applicant":
      return row.status === "awaiting_applicant";
    case "awaiting_review":
      return row.pendingHitl || row.status === "awaiting_hitl";
    case "ready_to_submit":
      return row.status === "ready_to_submit";
    case "submitted":
      return row.status === "submitted" || row.status === "synced";
    default:
      return true;
  }
}

export type NextStepMessageKey =
  | "nextStepSendApplicantLink"
  | "nextStepCompleteIntake"
  | "nextStepContinueIntake"
  | "nextStepReviewFields"
  | "nextStepReviewAndSubmit"
  | "nextStepTrackSubmission"
  | "nextStepDone"
  | "nextStepResolveIssue"
  | "nextStepClosed";

export function nextStepForRow(row: IntakeSessionListRow): {
  messageKey: NextStepMessageKey;
  hash: string;
} {
  if (row.status === "failed") {
    return { messageKey: "nextStepResolveIssue", hash: "" };
  }
  if (row.status === "cancelled") {
    return { messageKey: "nextStepClosed", hash: "" };
  }
  if (row.status === "awaiting_applicant") {
    return { messageKey: "nextStepSendApplicantLink", hash: "applicant-portal" };
  }
  if (row.pendingHitl || row.status === "awaiting_hitl") {
    return { messageKey: "nextStepReviewFields", hash: "field-review" };
  }
  if (row.status === "ready_to_submit") {
    return { messageKey: "nextStepReviewAndSubmit", hash: "completeness-section" };
  }
  if (row.status === "submitted") {
    return { messageKey: "nextStepTrackSubmission", hash: "" };
  }
  if (row.status === "synced") {
    return { messageKey: "nextStepDone", hash: "" };
  }
  if (row.completenessScore < 0.05) {
    return { messageKey: "nextStepCompleteIntake", hash: "field-review" };
  }
  return { messageKey: "nextStepContinueIntake", hash: "field-review" };
}
