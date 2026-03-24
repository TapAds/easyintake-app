export interface FieldState {
  value: string;
  confidence: number;
  source: "ai" | "agent_confirmed" | "agent_edited";
  updated_at: string;
}

/** Generic field state map. Keys are field names (vertical-agnostic). */
export type FieldStateMap = Record<string, FieldState>;

/**
 * Applies extraction updates to the current state.
 * ENFORCES: agent_confirmed and agent_edited values are never overwritten.
 */
export function applyExtractionUpdates(
  currentState: FieldStateMap,
  updates: Array<{
    field: string;
    value: string;
    confidence: number;
  }>
): { nextState: FieldStateMap; applied: string[]; skipped: string[] } {
  const nextState = { ...currentState };
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const update of updates) {
    const existing = currentState[update.field];

    // SACRED RULE: never overwrite agent-confirmed or agent-edited values
    if (
      existing &&
      (existing.source === "agent_confirmed" ||
        existing.source === "agent_edited")
    ) {
      skipped.push(update.field);
      continue;
    }

    nextState[update.field] = {
      value: update.value,
      confidence: update.confidence,
      source: "ai",
      updated_at: new Date().toISOString(),
    };
    applied.push(update.field);
  }

  return { nextState, applied, skipped };
}

/**
 * Agent confirms a field value (locks it against future AI extraction).
 */
export function confirmField(
  currentState: FieldStateMap,
  field: string
): FieldStateMap {
  const existing = currentState[field];
  if (!existing) return currentState;

  return {
    ...currentState,
    [field]: {
      ...existing,
      source: "agent_confirmed",
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Agent manually edits a field value.
 */
export function editField(
  currentState: FieldStateMap,
  field: string,
  value: string
): FieldStateMap {
  return {
    ...currentState,
    [field]: {
      value,
      confidence: 1.0,
      source: "agent_edited",
      updated_at: new Date().toISOString(),
    },
  };
}
