/**
 * Compliance rule definitions for AI output sanitization.
 *
 * Each rule defines:
 *   id          — unique identifier for logging and auditing
 *   category    — groups related rules for reporting
 *   description — plain-English explanation for audit logs
 *   pattern     — regex matched case-insensitively against the output text
 *   replacement — string to substitute (empty string = remove the match)
 *
 * Rules are applied in order. Earlier rules run first.
 *
 * Adding a rule here is the only change needed to extend compliance coverage.
 * This file is the audit trail for what the system enforces.
 */

export type RuleCategory =
  | "guarantee"
  | "pricing"
  | "approval"
  | "carrier_recommendation"
  | "superlative"
  | "urgency_pressure";

export interface ComplianceRule {
  id: string;
  category: RuleCategory;
  description: string;
  pattern: RegExp;
  replacement: string;
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // ── Guarantee language ────────────────────────────────────────────────────
  {
    id: "G001",
    category: "guarantee",
    description: "Guarantee / guaranteed",
    pattern: /\bguarantee[sd]?\b|\bguaranteeing\b/gi,
    replacement: "may provide",
  },
  {
    id: "G002",
    category: "guarantee",
    description: "Promise language",
    pattern: /\bpromise[sd]?\b|\bpromising\b/gi,
    replacement: "",
  },
  {
    id: "G003",
    category: "guarantee",
    description: "Certainty language",
    pattern: /\bcertain(ly|ty)?\b/gi,
    replacement: "potentially",
  },
  {
    id: "G004",
    category: "guarantee",
    description: "Definitive will / definitely",
    pattern: /\bdefinitely\b|\bwill definitely\b|\bdefinitely will\b/gi,
    replacement: "may",
  },

  // ── Pricing ───────────────────────────────────────────────────────────────
  {
    id: "P001",
    category: "pricing",
    description: "Dollar amounts in guidance (quoting not in scope)",
    pattern: /\$[\d,]+(\.\d{1,2})?(\s*(per\s+month|\/month|monthly|a\s+month|per\s+year|annually))?\b/gi,
    replacement: "[amount withheld]",
  },
  {
    id: "P002",
    category: "pricing",
    description: "Premium estimate phrasing",
    pattern: /\bpremium (of|will be|is|would be)\b/gi,
    replacement: "premium",
  },
  {
    id: "P003",
    category: "pricing",
    description: "Cost estimate phrasing",
    pattern: /\bcosts?\s+around\b|\bcosts?\s+approximately\b|\bpriced at\b/gi,
    replacement: "is priced",
  },

  // ── Approval language ─────────────────────────────────────────────────────
  {
    id: "A001",
    category: "approval",
    description: "You will / would be approved",
    pattern: /\b(you|they|applicant)\s+(will|would|should|can|shall)\s+be\s+approved\b/gi,
    replacement: "the applicant may be eligible",
  },
  {
    id: "A002",
    category: "approval",
    description: "Guaranteed approval / guaranteed issue used as approval claim",
    pattern: /\bguaranteed\s+approval\b/gi,
    replacement: "simplified issue",
  },
  {
    id: "A003",
    category: "approval",
    description: "Pre-approved language",
    pattern: /\bpre-?approv(ed|al)\b/gi,
    replacement: "potentially eligible",
  },
  {
    id: "A004",
    category: "approval",
    description: "Approval is guaranteed",
    pattern: /\bapproval\s+is\s+guaranteed\b/gi,
    replacement: "eligibility may vary",
  },
  {
    id: "A005",
    category: "approval",
    description: "No rejection / cannot be denied",
    pattern: /\bcannot\s+be\s+(denied|rejected|declined)\b/gi,
    replacement: "may be eligible regardless of health",
  },

  // ── Carrier recommendations ───────────────────────────────────────────────
  {
    id: "C001",
    category: "carrier_recommendation",
    description: "Remove entire 'I recommend [carrier/plan]' clause — carrier references must not be preserved even in softened form",
    pattern: /\bI\s+recommend\s+[^.!?\n]*/gi,
    replacement: "Review available carrier options based on the applicant's profile.",
  },
  {
    id: "C002",
    category: "carrier_recommendation",
    description: "The best carrier / company / insurer",
    pattern: /\bthe\s+best\s+(carrier|company|insurer|provider)\b/gi,
    replacement: "a carrier option",
  },
  {
    id: "C003",
    category: "carrier_recommendation",
    description: "Top carrier / company",
    pattern: /\btop\s+(carrier|company|insurer|provider)\b/gi,
    replacement: "a carrier option",
  },

  // ── Urgency / pressure ────────────────────────────────────────────────────
  {
    id: "U001",
    category: "urgency_pressure",
    description: "Don't wait / don't delay pressure language",
    pattern: /\bdon'?t\s+wait\b|\bdon'?t\s+delay\b/gi,
    replacement: "",
  },
  {
    id: "U002",
    category: "urgency_pressure",
    description: "Rates will / are going up",
    pattern: /\brates?\s+(will|are|could)\s+(go|be going|rise|increase|climb)\s+up\b|\brates?\s+(are\s+)?going\s+up\b/gi,
    replacement: "",
  },
  {
    id: "U003",
    category: "urgency_pressure",
    description: "Act now / act today / act quickly",
    pattern: /\bact\s+(now|today|quickly|fast|soon|immediately)\b/gi,
    replacement: "",
  },
  {
    id: "U004",
    category: "urgency_pressure",
    description: "Limited time offer / limited availability",
    pattern: /\blimited[- ]time\b|\blimited\s+availability\b|\bfor\s+a\s+limited\s+time\b/gi,
    replacement: "",
  },
  {
    id: "U005",
    category: "urgency_pressure",
    description: "Lock in rates / lock in pricing",
    pattern: /\block\s+in\s+(rates?|pricing|premiums?|your\s+rates?|your\s+price)\b/gi,
    replacement: "",
  },
  {
    id: "U006",
    category: "urgency_pressure",
    description: "Before rates / prices change or increase",
    pattern: /\bbefore\s+(rates?|prices?|premiums?)\s+(change|increase|go\s+up|rise)\b/gi,
    replacement: "",
  },

  // ── Superlatives ──────────────────────────────────────────────────────────
  {
    id: "S001",
    category: "superlative",
    description: "Best plan / policy / coverage / option",
    pattern: /\bbest\s+(plan|policy|coverage|option|product|rate|deal)\b/gi,
    replacement: "a coverage option",
  },
  {
    id: "S002",
    category: "superlative",
    description: "Cheapest / lowest price",
    pattern: /\bcheapest\b|\blowest[- ]priced?\b|\bmost affordable\b/gi,
    replacement: "competitively priced",
  },
  {
    id: "S003",
    category: "superlative",
    description: "Perfect coverage / perfect plan",
    pattern: /\bperfect\s+(coverage|plan|option|policy|fit)\b/gi,
    replacement: "a suitable coverage option",
  },
];
