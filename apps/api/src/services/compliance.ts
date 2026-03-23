import { prisma } from "../db/prisma";
import { COMPLIANCE_RULES, RuleCategory } from "../compliance/rules";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComplianceViolation {
  ruleId: string;
  category: RuleCategory;
  description: string;
  matchedText: string;
}

export interface ComplianceResult {
  safe: boolean;                    // true = no violations found
  sanitizedText: string;            // output safe to deliver to agent
  violations: ComplianceViolation[];
}

export interface ComplianceContext {
  callId: string;
  callSid: string;
}

// ─── Core (pure) ─────────────────────────────────────────────────────────────

/**
 * Validates and sanitizes a single AI output string against all compliance rules.
 *
 * - Applies every rule in sequence; replacements compound.
 * - Never throws and never returns an empty string — always returns something
 *   the agent can read (fail-soft).
 * - Does not write to the database (use runCompliance for that).
 */
export function validateAndSanitizeOutput(output: string): ComplianceResult {
  const violations: ComplianceViolation[] = [];
  let sanitized = output;

  for (const rule of COMPLIANCE_RULES) {
    const matches = sanitized.match(rule.pattern);
    if (!matches) continue;

    // Record each distinct match as a violation
    const uniqueMatches = [...new Set(matches)];
    for (const match of uniqueMatches) {
      violations.push({
        ruleId: rule.id,
        category: rule.category,
        description: rule.description,
        matchedText: match,
      });
    }

    // Apply replacement
    sanitized = sanitized.replace(rule.pattern, rule.replacement);
  }

  // Collapse any double spaces or leading/trailing whitespace left by removals
  sanitized = sanitized.replace(/\s{2,}/g, " ").trim();

  // Fail-soft: if sanitization somehow emptied the string, return a safe default
  if (!sanitized) {
    sanitized = "Note for agent: continue collecting applicant information.";
  }

  return {
    safe: violations.length === 0,
    sanitizedText: sanitized,
    violations,
  };
}

// ─── Logging ──────────────────────────────────────────────────────────────────

/**
 * Persists a compliance result to the ComplianceLog table.
 * Fire-and-forget safe — errors are caught and logged to console only
 * so a DB failure never blocks guidance delivery.
 */
export async function logComplianceResult(
  context: ComplianceContext,
  inputText: string,
  result: ComplianceResult
): Promise<void> {
  try {
    await prisma.complianceLog.create({
      data: {
        callId: context.callId,
        inputText,
        outputText: result.sanitizedText,
        wasModified: !result.safe,
        flaggedTerms: result.violations.map(
          (v) => `[${v.ruleId}] ${v.description}: "${v.matchedText}"`
        ),
      },
    });
  } catch (err) {
    console.error(
      `[compliance] failed to write ComplianceLog for call ${context.callSid}:`,
      err
    );
  }
}

// ─── Convenience wrapper ──────────────────────────────────────────────────────

/**
 * Runs compliance validation + sanitization and optionally persists the result.
 *
 * This is the function all callers should use. The pure validateAndSanitizeOutput
 * is exported for testing and reuse in non-DB contexts (e.g. future SMS templates).
 *
 * @param text    — raw AI output to validate
 * @param context — if provided, result is written to ComplianceLog
 */
export async function runCompliance(
  text: string,
  context?: ComplianceContext
): Promise<ComplianceResult> {
  const result = validateAndSanitizeOutput(text);

  if (result.violations.length > 0) {
    console.warn(
      `[compliance]${context ? ` [${context.callSid}]` : ""} ` +
      `${result.violations.length} violation(s): ` +
      result.violations.map((v) => `${v.ruleId}(${v.matchedText})`).join(", ")
    );
  }

  if (context) {
    await logComplianceResult(context, text, result);
  }

  return result;
}
