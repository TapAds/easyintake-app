import { Router, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import twilio from "twilio";
import { config } from "../../config";
import { prisma } from "../../db/prisma";
import { requireAuth } from "../middleware/auth";
import { attachOperatorOrgScope } from "../middleware/operatorOrgScope";
import { sessionOrganizationInScope } from "../../services/operatorOrgScope";

export const operatorRouter = Router();

/** Last 4 digits only — no full numbers (PII). */
function last4Digits(num: string | null | undefined): string {
  if (!num) return "—";
  const d = num.replace(/\D/g, "");
  if (d.length === 0) return "—";
  return d.slice(-4);
}

/**
 * GET /api/operator/twilio/recent-calls
 * Lists recent Twilio calls (server-side credentials). Requires Bearer JWT.
 * Returns up to 10 calls; from/to are last 4 digits only.
 */
operatorRouter.get(
  "/twilio/recent-calls",
  requireAuth,
  attachOperatorOrgScope,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const client = twilio(config.twilio.accountSid, config.twilio.authToken);
      const calls = await client.calls.list({ limit: 10 });
      res.json({
        calls: calls.map((c) => ({
          sid: c.sid,
          status: c.status,
          direction: c.direction,
          from: last4Digits(c.from),
          to: last4Digits(c.to),
          dateCreated: c.dateCreated?.toISOString() ?? null,
          duration: c.duration,
        })),
      });
    } catch (err) {
      console.error("[operator] twilio recent-calls:", err);
      res.status(502).json({ error: "Twilio request failed" });
    }
  }
);

/**
 * POST /api/operator/intake-template
 *
 * Onboarding hook: register or replace field definitions for an org product/form.
 * Body: { organizationId, configPackageId, name?, fieldDefinitions: unknown[] }
 */
operatorRouter.post(
  "/intake-template",
  requireAuth,
  attachOperatorOrgScope,
  async (req: Request, res: Response): Promise<void> => {
    const scope = req.operatorScope!;
    const body = req.body as {
      organizationId?: string;
      configPackageId?: string;
      name?: string;
      fieldDefinitions?: unknown[];
    };
    const organizationId = body.organizationId?.trim();
    const configPackageId = body.configPackageId?.trim();
    if (!organizationId || !configPackageId) {
      res.status(400).json({ error: "organizationId and configPackageId required" });
      return;
    }
    if (!sessionOrganizationInScope(organizationId, scope)) {
      res.status(403).json({ error: "organizationId not allowed for this session" });
      return;
    }
    const fieldDefinitions = (
      Array.isArray(body.fieldDefinitions) ? body.fieldDefinitions : []
    ) as Prisma.InputJsonValue;

    try {
      const created = await prisma.intakeFieldTemplate.create({
        data: {
          organizationId,
          configPackageId,
          name: body.name?.trim() || null,
          fieldDefinitions,
        },
      });
      res.status(201).json(created);
    } catch (err) {
      console.error("[operator] intake-template:", err);
      res.status(500).json({ error: "Could not create intake template" });
    }
  }
);
