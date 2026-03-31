import type { FieldChangeEventV1 } from "./fieldChangeLog";
import type { FieldKey, FieldValueMap } from "./fieldState";

/**
 * Lifecycle for a single intake across channels.
 * Aligns with PLATFORM_BUILD_PLAN Section 2.
 */
export type IntakeSessionStatus =
  | "created"
  | "collecting"
  | "awaiting_hitl"
  | "awaiting_applicant"
  | "ready_to_submit"
  | "submitted"
  | "synced"
  | "failed"
  | "cancelled";

export type IntakeChannelType =
  | "voice"
  | "sms"
  | "whatsapp"
  | "web_form"
  | "microsite"
  | "webhook"
  | "partner";

/** One channel leg attached to the session. */
export interface IntakeChannelActivity {
  channel: IntakeChannelType;
  /** Twilio CallSid, message id, WhatsApp wamid, etc. */
  externalRef?: string;
  startedAt: string;
  endedAt?: string;
  metadata?: Record<string, unknown>;
}

export type FieldValueSource = "ai" | "applicant" | "agent" | "import";

/** Provenance for a single field value. */
export interface FieldProvenance {
  source?: FieldValueSource;
  channel?: IntakeChannelType;
  updatedAt?: string;
  confidence?: number;
}

/** Value + optional metadata for agent/applicant UIs. */
export interface FieldValueWithMeta {
  value: unknown;
  provenance?: FieldProvenance;
}

export type SessionFieldValues = Partial<Record<FieldKey, FieldValueWithMeta>>;

/** Flat map for engines that only store values (optional companion shape). */
export type SessionFieldValuesPlain = FieldValueMap;

/** Human-in-the-loop queue state for the session. */
export interface HitlState {
  pendingAgentReview?: boolean;
  pendingDocumentApproval?: boolean;
  pendingFinalSignOff?: boolean;
  pendingApplicantSignature?: boolean;
  /** Field keys the agent asked the applicant to complete (microsite highlights). */
  agentRequestedFieldKeys?: FieldKey[];
}

/** Completeness scoring from the engine. */
export interface CompletenessSnapshot {
  /** Ratio in [0, 1] unless product standardizes otherwise. */
  score: number;
  /** N-400 / workflow: required evidence items satisfied (see `WorkflowInstance.requirementsJson`). */
  evidenceScore?: number;
  missingRequiredKeys?: FieldKey[];
}

/** External system ids — aliases, not separate session concepts. */
export interface IntakeSessionExternalIds {
  callSid?: string;
  leadId?: string;
  ghlContactId?: string;
  ghlOpportunityId?: string;
}

/**
 * Canonical cross-channel intake record for BFF and UI contracts.
 * Storage in `apps/api` may differ until unified persistence exists.
 */
export interface IntakeSession {
  sessionId: string;
  organizationId: string;
  verticalId: string;
  configPackageId: string;
  status: IntakeSessionStatus;
  /** Optional finer-grained label (engine-defined). */
  substatus?: string;
  primaryChannel?: IntakeChannelType;
  channels: IntakeChannelActivity[];
  fieldValues: SessionFieldValues;
  completeness: CompletenessSnapshot;
  hitl: HitlState;
  externalIds?: IntakeSessionExternalIds;
  fieldChangeLog?: FieldChangeEventV1[];
  /** Whether an unexpired, non-revoked applicant portal token exists (no secret leaked). */
  applicantPortal?: {
    hasActiveToken: boolean;
    expiresAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/** Row shape for agent queue lists (subset + display hints). */
export interface IntakeSessionListRow {
  sessionId: string;
  organizationId: string;
  verticalId: string;
  configPackageId: string;
  status: IntakeSessionStatus;
  updatedAt: string;
  /** 0–1 completeness score for sorting/display. */
  completenessScore: number;
  /** Short summary of channels, e.g. "voice · microsite". */
  channelSummary: string;
  pendingHitl: boolean;
}

