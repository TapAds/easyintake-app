/**
 * N-400 workflow intelligence — pure functions (no I/O, no DB).
 * Business rules distilled from USCIS N-400 instructions; see
 * `docs/uscis-n400/N400_AGENT_INTELLIGENCE.md`. Not legal advice.
 */

import { N400_MORAL_CHARACTER_FIELD_KEYS } from "./fields";

/** Workflow phases persisted on `WorkflowInstance.phase`. */
export type N400WorkflowPhase =
  | "INITIAL_INTAKE"
  | "PRE_ELIGIBLE_COLLECTION"
  | "PENDING_DOCS"
  | "VERIFYING"
  | "AUDIT_READY"
  | "ESCALATED"
  | "ESCALATED_CONFLICT"
  | "ESCALATED_LEGAL_REVIEW"
  | "CLOSED";

/** Stable ids stored in `WorkflowInstance.requirementsJson`. */
export interface EvidenceRequirementItem {
  id: string;
  labelKey: string;
  status: "pending" | "satisfied" | "waived";
  triggeredBy?: string;
}

const ATTESTATION_UNDERSTOOD_KEY = "n400.p9.moral_attachments_true";

const DAYS_EARLY_FILING = 90;
/** USCIS commonly treats 6+ month absences as raising continuous residence issues. */
const TRIP_WARNING_DAYS = 183;
const TRIP_ONE_YEAR_DAYS = 365;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Unwrap `IntakeSession.fieldValues` cell `{ value, provenance? }` or return scalar. */
export function unwrapFieldValue(cell: unknown): unknown {
  if (isRecord(cell) && "value" in cell) {
    return cell.value;
  }
  return cell;
}

/** Flatten session `fieldValues` to key → raw value. */
export function flattenFieldValuesToMap(fieldValues: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, cell] of Object.entries(fieldValues)) {
    out[k] = unwrapFieldValue(cell);
  }
  return out;
}

export function readBooleanField(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "yes" || s === "true" || s === "1" || s === "sí" || s === "si") return true;
    if (s === "no" || s === "false" || s === "0") return false;
  }
  return null;
}

/** Parse date from ISO string, `Date`, or common date-only strings. */
export function parseIsoDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function addCalendarYears(d: Date, years: number): Date {
  const x = new Date(d.getTime());
  x.setUTCFullYear(x.getUTCFullYear() + years);
  return x;
}

function addDaysUtc(d: Date, deltaDays: number): Date {
  return new Date(d.getTime() + deltaDays * 86_400_000);
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Required years of LPR for continuous residence before filing (simplified: marriage → 3, else 5; verify military edge cases in counsel review). */
export function resolveRequiredResidenceYears(
  eligibilityBasis: unknown
): 3 | 5 | null {
  if (eligibilityBasis === "marriage") return 3;
  if (
    eligibilityBasis === "general" ||
    eligibilityBasis === "military" ||
    eligibilityBasis === "other"
  ) {
    return 5;
  }
  return null;
}

export interface EarlyFilingEvaluation {
  /** `null` if LPR date or basis insufficient */
  eligibleToFile: boolean | null;
  within90DayEarlyFilingWindow: boolean;
  requiredResidenceYears: 3 | 5 | null;
  continuousResidenceCompleteDate: string | null;
  /** First calendar day of USCIS early filing window (LPR + N years − 90 days). */
  earliestFilingDate: string | null;
  /** Product alias for `earliestFilingDate` — first day applicant may file with USCIS under 90-day rule. */
  targetSubmissionDate: string | null;
  /** Intake / data collection may proceed (LPR + basis known). */
  collectionAllowed: boolean;
  /** Reference date is on or after `targetSubmissionDate` — may file with USCIS (subject to counsel review). */
  submitToUscisAllowed: boolean;
  /** Before early filing window: collect now, official filing not yet — drives `PRE_ELIGIBLE_COLLECTION`. */
  preEligibleCollection: boolean;
  messageKey: string;
}

export function evaluateEarlyFilingWindow(
  flat: Record<string, unknown>,
  referenceDate: Date = new Date()
): EarlyFilingEvaluation {
  const requiredYears = resolveRequiredResidenceYears(flat["n400.p1.eligibilityBasis"]);
  const lprDate = parseIsoDate(flat["dateBecameLpr"]);

  if (!lprDate || requiredYears === null) {
    return {
      eligibleToFile: null,
      within90DayEarlyFilingWindow: false,
      requiredResidenceYears: requiredYears,
      continuousResidenceCompleteDate: null,
      earliestFilingDate: null,
      targetSubmissionDate: null,
      collectionAllowed: false,
      submitToUscisAllowed: false,
      preEligibleCollection: false,
      messageKey: "n400.rules.early_filing.insufficient_data",
    };
  }

  const completeDate = addCalendarYears(lprDate, requiredYears);
  const earlyStart = addDaysUtc(startOfUtcDay(completeDate), -DAYS_EARLY_FILING);
  const ref = startOfUtcDay(referenceDate);
  const completeDay = startOfUtcDay(completeDate);

  const targetIso = earlyStart.toISOString().slice(0, 10);
  const collectionAllowed = true;
  const submitToUscisAllowed = ref.getTime() >= earlyStart.getTime();
  const preEligibleCollection = ref.getTime() < earlyStart.getTime();

  const eligibleToFile = submitToUscisAllowed;
  const within90DayEarlyFilingWindow =
    eligibleToFile && ref.getTime() < completeDay.getTime();

  let messageKey = "n400.rules.early_filing.pre_window_collection";
  if (eligibleToFile && within90DayEarlyFilingWindow) {
    messageKey = "n400.rules.early_filing.within_early_window";
  } else if (eligibleToFile && ref.getTime() >= completeDay.getTime()) {
    messageKey = "n400.rules.early_filing.period_complete";
  } else if (eligibleToFile) {
    messageKey = "n400.rules.early_filing.can_file";
  }

  return {
    eligibleToFile,
    within90DayEarlyFilingWindow,
    requiredResidenceYears: requiredYears,
    continuousResidenceCompleteDate: completeDay.toISOString().slice(0, 10),
    earliestFilingDate: targetIso,
    targetSubmissionDate: targetIso,
    collectionAllowed,
    submitToUscisAllowed,
    preEligibleCollection,
    messageKey,
  };
}

/**
 * Logical `gate.*` rows (not physical documents) merged into `requirementsJson`.
 * See `docs/uscis-n400/N400_AGENT_INTELLIGENCE.md`.
 */
export function buildEligibilityGates(early: EarlyFilingEvaluation): EvidenceRequirementItem[] {
  if (!early.collectionAllowed || !early.targetSubmissionDate) {
    return [];
  }

  return [
    {
      id: "gate.collection_open",
      labelKey: "n400.gate.collection_open",
      status: "satisfied",
      triggeredBy: "early_filing.collection_allowed",
    },
    {
      id: "gate.submit_blocked_until",
      labelKey: early.submitToUscisAllowed
        ? "n400.gate.uscis_submit_allowed"
        : "n400.gate.submit_not_before_date",
      status: early.submitToUscisAllowed ? "satisfied" : "pending",
      triggeredBy: early.submitToUscisAllowed
        ? "early_filing.submit_allowed"
        : `targetSubmissionDate=${early.targetSubmissionDate}`,
    },
  ];
}

export interface TripContinuityEvaluation {
  hasTripData: boolean;
  longestTripDays: number | null;
  possibleContinuousResidenceIssue: boolean;
  possibleBreakOneYear: boolean;
  needsSpecialistReview: boolean;
  suggestClarifyOverSixMonths: boolean;
  messageKey: string;
}

export function evaluateTripContinuity(flat: Record<string, unknown>): TripContinuityEvaluation {
  const hasTrips = readBooleanField(flat["n400.p8.hasTripsOutsideUS"]);
  if (hasTrips !== true) {
    return {
      hasTripData: false,
      longestTripDays: null,
      possibleContinuousResidenceIssue: false,
      possibleBreakOneYear: false,
      needsSpecialistReview: false,
      suggestClarifyOverSixMonths: false,
      messageKey: "n400.rules.trips.none_or_not_disclosed",
    };
  }

  const depart = parseIsoDate(flat["n400.p8.trip1Depart"]);
  const ret = parseIsoDate(flat["n400.p8.trip1Return"]);
  if (!depart || !ret || ret.getTime() <= depart.getTime()) {
    return {
      hasTripData: true,
      longestTripDays: null,
      possibleContinuousResidenceIssue: false,
      possibleBreakOneYear: false,
      needsSpecialistReview: false,
      suggestClarifyOverSixMonths: false,
      messageKey: "n400.rules.trips.incomplete_dates",
    };
  }

  const days = Math.ceil((ret.getTime() - depart.getTime()) / 86_400_000);
  const possibleContinuousResidenceIssue = days >= TRIP_WARNING_DAYS;
  const possibleBreakOneYear = days >= TRIP_ONE_YEAR_DAYS;
  const needsSpecialistReview = possibleContinuousResidenceIssue || possibleBreakOneYear;

  let messageKey = "n400.rules.trips.under_threshold";
  if (possibleBreakOneYear) messageKey = "n400.rules.trips.review_one_year_plus";
  else if (possibleContinuousResidenceIssue) messageKey = "n400.rules.trips.review_six_months_plus";

  return {
    hasTripData: true,
    longestTripDays: days,
    possibleContinuousResidenceIssue,
    possibleBreakOneYear,
    needsSpecialistReview,
    suggestClarifyOverSixMonths: days >= TRIP_WARNING_DAYS && days < TRIP_ONE_YEAR_DAYS,
    messageKey,
  };
}

export function expandEvidenceRequirements(flat: Record<string, unknown>): EvidenceRequirementItem[] {
  const items: EvidenceRequirementItem[] = [];
  const basis = flat["n400.p1.eligibilityBasis"];

  if (basis === "marriage") {
    items.push({
      id: "evidence.spouse_us_citizenship_proof",
      labelKey: "n400.evidence.spouse_citizenship",
      status: "pending",
      triggeredBy: "n400.p1.eligibilityBasis=marriage",
    });
    items.push({
      id: "evidence.marriage_certificate",
      labelKey: "n400.evidence.marriage_certificate",
      status: "pending",
      triggeredBy: "n400.p1.eligibilityBasis=marriage",
    });
  }

  const convicted = readBooleanField(flat["n400.p9.moral_convicted_crime"]);
  const incarcerated = readBooleanField(flat["n400.p9.moral_incarcerated"]);
  if (convicted === true || incarcerated === true) {
    items.push({
      id: "evidence.certified_court_dispositions",
      labelKey: "n400.evidence.certified_court_dispositions",
      status: "pending",
      triggeredBy: "moral_conviction_or_incarceration",
    });
  }

  const nameChanged = readBooleanField(flat["n400.p2.nameLegallyChanged"]);
  if (nameChanged === true) {
    items.push({
      id: "evidence.legal_name_change",
      labelKey: "n400.evidence.legal_name_change",
      status: "pending",
      triggeredBy: "n400.p2.nameLegallyChanged",
    });
  }

  const nameChangeNat = readBooleanField(flat["n400.p13.nameChangeRequested"]);
  if (nameChangeNat === true) {
    items.push({
      id: "evidence.naturalization_name_change_support",
      labelKey: "n400.evidence.nat_name_change",
      status: "pending",
      triggeredBy: "n400.p13.nameChangeRequested",
    });
  }

  return items;
}

export interface MoralCharacterEvaluation {
  requiresLegalReview: boolean;
  affirmativeFieldKeys: string[];
  attestationProblem: boolean;
  escalationReason: string | null;
}

/**
 * Moral character (catalog Part 9 `n400.p9.moral_*`): any affirmative “yes” (except attestation)
 * or failure to attest copies → legal review. Does **not** imply `ESCALATED_CONFLICT` (data mismatch).
 */
export function evaluateMoralCharacterEscalation(flat: Record<string, unknown>): MoralCharacterEvaluation {
  const affirmativeFieldKeys: string[] = [];

  for (const key of N400_MORAL_CHARACTER_FIELD_KEYS) {
    if (key === ATTESTATION_UNDERSTOOD_KEY) continue;
    if (readBooleanField(flat[key]) === true) {
      affirmativeFieldKeys.push(key);
    }
  }

  const attestation = readBooleanField(flat[ATTESTATION_UNDERSTOOD_KEY]);
  const attestationProblem = attestation === false;

  const requiresLegalReview = affirmativeFieldKeys.length > 0 || attestationProblem;
  return {
    requiresLegalReview,
    affirmativeFieldKeys,
    attestationProblem,
    escalationReason: requiresLegalReview ? "n400.moral_affirmative_or_attestation" : null,
  };
}

export interface N400RuleEngineOutput {
  earlyFiling: EarlyFilingEvaluation;
  trips: TripContinuityEvaluation;
  evidenceRequired: EvidenceRequirementItem[];
  eligibilityGates: EvidenceRequirementItem[];
  moralCharacter: MoralCharacterEvaluation;
  /** Suggested `WorkflowEvent.type` values for the orchestrator */
  suggestedWorkflowEventTypes: string[];
  /**
   * Resolved workflow phase hint: legal review first, then pre-eligible collection, else null
   * (orchestrator merges with existing DB phase — never downgrade from escalations).
   */
  suggestedWorkflowPhase: N400WorkflowPhase | null;
  /** @deprecated Use `suggestedWorkflowPhase` */
  suggestedPhaseOverride: N400WorkflowPhase | null;
}

export function runN400RuleEngine(
  fieldValues: Record<string, unknown>,
  opts?: { referenceDate?: Date }
): N400RuleEngineOutput {
  const flat = flattenFieldValuesToMap(fieldValues);
  const ref = opts?.referenceDate ?? new Date();

  const earlyFiling = evaluateEarlyFilingWindow(flat, ref);
  const trips = evaluateTripContinuity(flat);
  const evidenceRequired = expandEvidenceRequirements(flat);
  const eligibilityGates = buildEligibilityGates(earlyFiling);
  const moralCharacter = evaluateMoralCharacterEscalation(flat);

  const suggestedWorkflowEventTypes: string[] = [];
  if (trips.needsSpecialistReview) {
    suggestedWorkflowEventTypes.push("TRIP_CONTINUITY_FLAG");
  }
  if (moralCharacter.requiresLegalReview) {
    suggestedWorkflowEventTypes.push("PART12_LEGAL_ESCALATION");
  }
  if (evidenceRequired.length > 0) {
    suggestedWorkflowEventTypes.push("EVIDENCE_REQUIREMENTS_EXPANDED");
  }
  if (eligibilityGates.length > 0) {
    suggestedWorkflowEventTypes.push("ELIGIBILITY_GATES_UPDATED");
  }

  let suggestedWorkflowPhase: N400WorkflowPhase | null = null;
  if (moralCharacter.requiresLegalReview) {
    suggestedWorkflowPhase = "ESCALATED_LEGAL_REVIEW";
  } else if (earlyFiling.preEligibleCollection) {
    suggestedWorkflowPhase = "PRE_ELIGIBLE_COLLECTION";
  }

  return {
    earlyFiling,
    trips,
    evidenceRequired,
    eligibilityGates,
    moralCharacter,
    suggestedWorkflowEventTypes,
    suggestedWorkflowPhase,
    suggestedPhaseOverride: suggestedWorkflowPhase,
  };
}

function isEvidenceItem(v: unknown): v is EvidenceRequirementItem {
  if (!isRecord(v)) return false;
  return typeof v.id === "string" && typeof v.labelKey === "string" && typeof v.status === "string";
}

/** Parse stored `requirementsJson` JSON array. */
export function parseRequirementsJson(raw: unknown): EvidenceRequirementItem[] {
  if (!Array.isArray(raw)) return [];
  const out: EvidenceRequirementItem[] = [];
  for (const el of raw) {
    if (!isEvidenceItem(el)) continue;
    if (el.status !== "pending" && el.status !== "satisfied" && el.status !== "waived") continue;
    out.push({
      id: el.id,
      labelKey: el.labelKey,
      status: el.status,
      triggeredBy: typeof el.triggeredBy === "string" ? el.triggeredBy : undefined,
    });
  }
  return out;
}

/**
 * Merge freshly generated evidence rows with persisted checklist; **preserve** `satisfied` / `waived`
 * by `id` when triggers still apply.
 */
export function mergeEvidenceRequirements(
  existingJson: unknown,
  generated: EvidenceRequirementItem[]
): EvidenceRequirementItem[] {
  const prev = parseRequirementsJson(existingJson);
  const byId = new Map<string, EvidenceRequirementItem>();
  for (const p of prev) {
    byId.set(p.id, p);
  }
  for (const gen of generated) {
    const cur = byId.get(gen.id);
    if (cur && (cur.status === "satisfied" || cur.status === "waived")) {
      byId.set(gen.id, { ...gen, status: cur.status });
    } else {
      byId.set(gen.id, gen);
    }
  }
  return Array.from(byId.values());
}

/** Ratio of evidence items satisfied or waived ∈ [0,1]. Empty list → 1 (nothing required). */
export function computeEvidenceCompletenessScore(items: EvidenceRequirementItem[]): number {
  if (items.length === 0) return 1;
  let done = 0;
  for (const it of items) {
    if (it.status === "satisfied" || it.status === "waived") done += 1;
  }
  return done / items.length;
}

/** Excludes `gate.*` logical rows — use for document-only completeness. */
export function computeDocumentEvidenceCompletenessScore(items: EvidenceRequirementItem[]): number {
  const docs = items.filter((i) => !i.id.startsWith("gate."));
  return computeEvidenceCompletenessScore(docs);
}
