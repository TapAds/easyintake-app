/**
 * Append-only field-level audit entries (voice IntakeSession / Call and messaging).
 * Shared contract for API and web.
 */

export type FieldChangeReason =
  | "ai_extraction"
  | "agent_edit"
  | "agent_confirm"
  | "applicant_correction"
  | "applicant_self_service";

export type FieldChangeActor =
  | { type: "system" }
  | { type: "agent"; subject: string }
  | { type: "applicant_channel"; channel: string; messageId?: string };

export interface FieldChangeEventV1 {
  id: string;
  fieldKey: string;
  oldValue: unknown;
  newValue: unknown;
  reason: FieldChangeReason;
  actor: FieldChangeActor;
  at: string;
  /** Optional pointers for support / replay */
  evidence?: {
    callSid?: string;
    utteranceOffsetMs?: number;
    ghlMessageId?: string;
  };
}
