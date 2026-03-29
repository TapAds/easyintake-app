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
      include: {
        attachments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            sourceUrl: true,
            mimeType: true,
            byteSize: true,
            status: true,
            inboundChannel: true,
            createdAt: true,
            errorMessage: true,
          },
        },
        signatureRequests: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            status: true,
            ghlTemplateId: true,
            reminderCount: true,
            maxReminders: true,
            sentAt: true,
            signedAt: true,
            lastError: true,
          },
        },
      },
    });

    if (!row) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const hitl = (row.hitl as Record<string, boolean>) ?? {};
    const fieldValues = (row.fieldValues as Record<string, unknown>) ?? {};
    const channels = Array.isArray(row.channels) ? row.channels : [];
    const externalIds = (row.externalIds as Record<string, unknown>) ?? {};

    const { attachments: attachmentRows, signatureRequests: sigRows, ...sessionRest } = row;

    res.json({
      sessionId: sessionRest.id,
      organizationId: sessionRest.organizationId,
      verticalId: sessionRest.verticalId,
      configPackageId: sessionRest.configPackageId,
      status: sessionRest.status,
      substatus: sessionRest.substatus ?? undefined,
      primaryChannel: sessionRest.primaryChannel ?? "voice",
      channels,
      fieldValues,
      completeness: {
        score: sessionRest.completenessScore,
      },
      hitl: {
        pendingAgentReview: hitl.pendingAgentReview ?? false,
        pendingDocumentApproval: hitl.pendingDocumentApproval ?? false,
        pendingFinalSignOff: hitl.pendingFinalSignOff ?? false,
        pendingApplicantSignature: hitl.pendingApplicantSignature ?? false,
      },
      attachments: attachmentRows.map((a) => ({
        id: a.id,
        mimeType: a.mimeType,
        byteSize: a.byteSize,
        status: a.status,
        inboundChannel: a.inboundChannel,
        createdAt: a.createdAt.toISOString(),
        sourceUrl: a.sourceUrl.length > 200 ? `${a.sourceUrl.slice(0, 200)}…` : a.sourceUrl,
        errorPreview: a.errorMessage ? a.errorMessage.slice(0, 240) : undefined,
      })),
      signatureRequests: sigRows.map((s) => ({
        id: s.id,
        status: s.status,
        ghlTemplateId: s.ghlTemplateId,
        reminderCount: s.reminderCount,
        maxReminders: s.maxReminders,
        sentAt: s.sentAt?.toISOString(),
        signedAt: s.signedAt?.toISOString(),
        lastError: s.lastError ? s.lastError.slice(0, 240) : undefined,
      })),
      externalIds:
        Object.keys(externalIds).length > 0 ? externalIds : undefined,
      createdAt: sessionRest.createdAt.toISOString(),
      updatedAt: sessionRest.updatedAt.toISOString(),
    });
  }
);
