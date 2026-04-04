import { z } from "zod";

const slugId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_-]*$/, "id must be a lowercase slug (letters, digits, hyphen, underscore)");

export const bilingualLabelSchema = z.object({
  en: z.string().min(1).max(200),
  es: z.string().min(1).max(200),
});

export const pipelineStageSchema = z.object({
  id: slugId,
  label: bilingualLabelSchema,
});

export const orgPipelineConfigSchema = z.object({
  version: z.literal(1),
  stages: z.array(pipelineStageSchema).min(1).max(20),
});

export type OrgPipelineConfig = z.infer<typeof orgPipelineConfigSchema>;
export type PipelineStage = z.infer<typeof pipelineStageSchema>;
export type BilingualLabel = z.infer<typeof bilingualLabelSchema>;

export type PipelinePresetId = "insurance_application_chips" | "sales_funnel_milestones";

export const PIPELINE_PRESET_IDS: PipelinePresetId[] = [
  "insurance_application_chips",
  "sales_funnel_milestones",
];

export function getPipelinePreset(id: PipelinePresetId): OrgPipelineConfig {
  switch (id) {
    case "insurance_application_chips":
      return {
        version: 1,
        stages: [
          { id: "leads", label: { en: "Leads", es: "Prospectos" } },
          { id: "application_started", label: { en: "Application started", es: "Solicitud iniciada" } },
          { id: "application_stalled", label: { en: "Application stalled", es: "Solicitud detenida" } },
          {
            id: "need_applicant_signature",
            label: { en: "Need Applicant Signature", es: "Firma del solicitante" },
          },
          {
            id: "need_agent_signature",
            label: { en: "Need Agent Signature", es: "Firma del agente" },
          },
          { id: "submitted", label: { en: "Submitted", es: "Enviada" } },
          { id: "complete", label: { en: "Complete", es: "Completa" } },
        ],
      };
    case "sales_funnel_milestones":
      return {
        version: 1,
        stages: [
          { id: "leads", label: { en: "Leads", es: "Prospectos" } },
          { id: "apps_started", label: { en: "Apps started", es: "Solicitudes iniciadas" } },
          { id: "apps_completed", label: { en: "Apps completed", es: "Solicitudes completadas" } },
          { id: "apps_submitted", label: { en: "Apps submitted", es: "Solicitudes enviadas" } },
          { id: "apps_accepted", label: { en: "Apps accepted", es: "Solicitudes aceptadas" } },
        ],
      };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function parseOrgPipelineConfig(raw: unknown): OrgPipelineConfig | null {
  const r = orgPipelineConfigSchema.safeParse(raw);
  return r.success ? r.data : null;
}

/** Normalize model-provided ids to valid slugs (lowercase, safe chars). */
export function normalizePipelineStageId(raw: string): string {
  const t = raw.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/_+/g, "_");
  const cleaned = t.replace(/^[^a-z]+/, "") || "stage";
  return cleaned.slice(0, 64);
}

export function coerceOrgPipelineConfig(raw: unknown): OrgPipelineConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  const stagesRaw = o.stages;
  if (!Array.isArray(stagesRaw)) return null;
  const seen = new Set<string>();
  const stages: PipelineStage[] = [];
  for (const s of stagesRaw) {
    if (!s || typeof s !== "object") continue;
    const row = s as Record<string, unknown>;
    const id = normalizePipelineStageId(String(row.id ?? ""));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const label = row.label;
    if (!label || typeof label !== "object") continue;
    const lb = label as Record<string, unknown>;
    const en = String(lb.en ?? "").trim().slice(0, 200);
    const es = String(lb.es ?? "").trim().slice(0, 200);
    if (!en || !es) continue;
    stages.push({ id, label: { en, es } });
  }
  if (stages.length === 0) return null;
  return parseOrgPipelineConfig({ version: 1, stages });
}
