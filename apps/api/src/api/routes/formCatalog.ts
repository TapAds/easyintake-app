import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../../config";
import { requireAuth } from "../middleware/auth";
import { attachOperatorOrgScope } from "../middleware/operatorOrgScope";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

export const formCatalogRouter = Router();
formCatalogRouter.use(requireAuth);
formCatalogRouter.use(attachOperatorOrgScope);

const FORM_ANALYSIS_SYSTEM = `You analyze government or carrier PDF forms and propose a vertical-intake catalog draft.

Return a single JSON object (no markdown) with this shape:
{
  "formTitle": string,
  "sections": [{ "id": string, "order": number, "labels": { "en": string, "es": string } }],
  "fields": [{ "key": string, "type": "text"|"number"|"date"|"boolean"|"enum"|"phone"|"email"|"address", "sectionId": string, "order": number, "labels": { "en": string, "es": string }, "sourceRef"?: string }],
  "notes": string[]
}

Use stable keys (e.g. lowercase_snake or dotted ids). One field per atomic question. Spanish labels may be initial translations from English.`;

/**
 * POST /api/intake/form-catalog/analyze-pdf
 * Body: { pdfBase64: string, filename?: string }
 */
formCatalogRouter.post(
  "/analyze-pdf",
  async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { pdfBase64?: string; filename?: string };
    const pdfBase64 =
      typeof body.pdfBase64 === "string" ? body.pdfBase64.trim() : "";
    if (!pdfBase64) {
      res.status(400).json({ error: "Expected JSON body: { pdfBase64: string }" });
      return;
    }

    try {
      const response = await client.beta.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: FORM_ANALYSIS_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Propose a field catalog for this PDF${
                  body.filename ? ` (${body.filename})` : ""
                }.`,
              },
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        res.status(502).json({ error: "No text in model response" });
        return;
      }
      let raw = textBlock.text.trim();
      const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/);
      if (fence) raw = fence[1].trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        res.status(502).json({
          error: "Model returned non-JSON",
          rawPreview: raw.slice(0, 500),
        });
        return;
      }
      res.json({ draft: parsed });
    } catch (err) {
      console.error("[form-catalog] analyze-pdf:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Analysis failed",
      });
    }
  }
);
