import { Router, Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { requireAuth } from "../middleware/auth";

export const transcriptRouter = Router();

transcriptRouter.use(requireAuth);

/**
 * GET /api/calls/:callSid/transcript
 *
 * Returns paginated transcript segments for a call, ordered by offsetMs.
 *
 * Query params:
 *   limit  — max segments to return (default: 100, max: 500)
 *   cursor — offsetMs to start after (for pagination)
 */
transcriptRouter.get(
  "/:callSid/transcript",
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

    const limit = Math.min(
      parseInt((req.query.limit as string) ?? "100", 10),
      500
    );
    const cursor = req.query.cursor
      ? parseInt(req.query.cursor as string, 10)
      : undefined;

    const segments = await prisma.transcriptSegment.findMany({
      where: {
        callId: call.id,
        ...(cursor !== undefined ? { offsetMs: { gt: cursor } } : {}),
      },
      orderBy: { offsetMs: "asc" },
      take: limit,
      select: {
        id:           true,
        speaker:      true,
        text:         true,
        offsetMs:     true,
        languageCode: true,
        confidence:   true,
        createdAt:    true,
      },
    });

    const nextCursor =
      segments.length === limit
        ? segments[segments.length - 1].offsetMs
        : null;

    res.json({ segments, nextCursor });
  }
);
