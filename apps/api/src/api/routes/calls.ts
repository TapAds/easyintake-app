import { Router, Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { requireAuth } from "../middleware/auth";
import { runTranscriptExtractAndPersist } from "../../services/transcriptExtract";

export const callsRouter = Router();

callsRouter.use(requireAuth);

// ─── GET /api/calls ───────────────────────────────────────────────────────────

/**
 * Returns all calls ordered by most recent first.
 * Includes completeness score, flow stage, and status for dashboard display.
 */
callsRouter.get("/", async (_req: Request, res: Response): Promise<void> => {
  const calls = await prisma.call.findMany({
    orderBy: { startedAt: "desc" },
    select: {
      id:               true,
      callSid:          true,
      from:             true,
      to:               true,
      startedAt:        true,
      endedAt:          true,
      durationSeconds:  true,
      status:           true,
      flowStage:        true,
      completenessScore:true,
      consentVerbal:    true,
      ghlContactId:     true,
      ghlOpportunityId: true,
      entity: {
        select: {
          firstName: true,
          lastName:  true,
        },
      },
    },
  });

  res.json(calls);
});

// ─── POST /api/calls/:callSid/extract ─────────────────────────────────────────

/**
 * Runs Claude V2 extraction over all stored transcript segments, merges into
 * LifeInsuranceEntity (respecting agentCorrected fill-empty-only rule), updates score.
 */
callsRouter.post(
  "/:callSid/extract",
  async (req: Request, res: Response): Promise<void> => {
    const callSid = String(req.params.callSid);
    const result = await runTranscriptExtractAndPersist(callSid);
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({
      callSid: result.callSid,
      utteranceCount: result.utteranceCount,
      chunkCount: result.chunkCount,
      entities: result.entities,
      fieldConfidences: result.fieldConfidences,
      score: {
        overall: result.completenessScore,
        tier: result.tier,
      },
      mergeMeta: {
        appliedKeys: result.appliedKeys,
        skippedDueToCorrection: result.skippedDueToCorrection,
      },
    });
  }
);

// ─── GET /api/calls/:callSid ──────────────────────────────────────────────────

/**
 * Returns the full call record including all entity fields.
 */
callsRouter.get("/:callSid", async (req: Request, res: Response): Promise<void> => {
  const callSid = String(req.params.callSid);
  const call = await prisma.call.findUnique({
    where: { callSid },
    include: { entity: true },
  });

  if (!call) {
    res.status(404).json({ error: "Call not found" });
    return;
  }

  res.json(call);
});

// ─── PATCH /api/calls/:callSid/entities ───────────────────────────────────────

/**
 * Agent manual correction of extracted entity fields.
 * Only non-null/undefined values in the body are applied (partial update).
 * Sets agentCorrected = true and updates lastCorrectedAt.
 */
callsRouter.patch(
  "/:callSid/entities",
  async (req: Request, res: Response): Promise<void> => {
    const callSid = String(req.params.callSid);
    const call = await prisma.call.findUnique({
      where: { callSid },
      select: { id: true },
    });

    if (!call) {
      res.status(404).json({ error: "Call not found" });
      return;
    }

    // Strip undefined/null values — only apply provided corrections
    const corrections = Object.fromEntries(
      Object.entries(req.body as Record<string, unknown>).filter(
        ([, v]) => v !== null && v !== undefined
      )
    );

    const entity = await prisma.lifeInsuranceEntity.upsert({
      where: { callId: call.id },
      create: {
        callId: call.id,
        ...corrections,
        agentCorrected: true,
        lastCorrectedAt: new Date(),
      },
      update: {
        ...corrections,
        agentCorrected: true,
        lastCorrectedAt: new Date(),
      },
    });

    res.json(entity);
  }
);

// ─── PATCH /api/calls/:callSid/consent ───────────────────────────────────────

/**
 * Records verbal consent for a call.
 * Sets consentVerbal = true and stamps consentTimestamp.
 * Idempotent — safe to call more than once.
 */
callsRouter.patch(
  "/:callSid/consent",
  async (req: Request, res: Response): Promise<void> => {
    const callSid = String(req.params.callSid);
    const call = await prisma.call.findUnique({
      where: { callSid },
      select: { id: true },
    });

    if (!call) {
      res.status(404).json({ error: "Call not found" });
      return;
    }

    const updated = await prisma.call.update({
      where: { id: call.id },
      data: {
        consentVerbal: true,
        consentTimestamp: new Date(),
      },
      select: {
        id:               true,
        callSid:          true,
        consentVerbal:    true,
        consentTimestamp: true,
      },
    });

    res.json(updated);
  }
);
