import { Router, Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { requireAuth } from "../middleware/auth";

export const intakeSessionsRouter = Router();
intakeSessionsRouter.use(requireAuth);

function channelSummary(channels: unknown): string {
  if (!Array.isArray(channels)) return "—";
  return channels
    .map((c) =>
      typeof c === "object" &&
      c !== null &&
      "channel" in c &&
      typeof (c as { channel: unknown }).channel === "string"
        ? (c as { channel: string }).channel
        : "?"
    )
    .join(" · ");
}

/**
 * GET /api/intake/sessions
 */
intakeSessionsRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  const rows = await prisma.intakeSession.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  res.json(
    rows.map((r) => {
      const hitl = r.hitl as { pendingAgentReview?: boolean } | null;
      return {
        sessionId: r.id,
        organizationId: r.organizationId,
        verticalId: r.verticalId,
        configPackageId: r.configPackageId,
        status: r.status,
        updatedAt: r.updatedAt.toISOString(),
        completenessScore: r.completenessScore,
        channelSummary: channelSummary(r.channels),
        pendingHitl: Boolean(hitl?.pendingAgentReview),
      };
    })
  );
});

/**
 * GET /api/intake/sessions/:sessionId
 */
intakeSessionsRouter.get(
  "/:sessionId",
  async (req: Request, res: Response): Promise<void> => {
    const sessionId = String(req.params.sessionId);
    const row = await prisma.intakeSession.findUnique({
      where: { id: sessionId },
    });

    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const hitl = (row.hitl as Record<string, boolean>) ?? {};
    const fieldValues = (row.fieldValues as Record<string, unknown>) ?? {};
    const channels = Array.isArray(row.channels) ? row.channels : [];
    const externalIds = (row.externalIds as Record<string, unknown>) ?? {};

    res.json({
      sessionId: row.id,
      organizationId: row.organizationId,
      verticalId: row.verticalId,
      configPackageId: row.configPackageId,
      status: row.status,
      substatus: row.substatus ?? undefined,
      primaryChannel: row.primaryChannel ?? "voice",
      channels,
      fieldValues,
      completeness: {
        score: row.completenessScore,
      },
      hitl: {
        pendingAgentReview: hitl.pendingAgentReview ?? false,
        pendingDocumentApproval: hitl.pendingDocumentApproval ?? false,
        pendingFinalSignOff: hitl.pendingFinalSignOff ?? false,
        pendingApplicantSignature: hitl.pendingApplicantSignature ?? false,
      },
      externalIds:
        Object.keys(externalIds).length > 0 ? externalIds : undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
);
