import { Router, Request, Response } from "express";
import { prisma } from "../../db/prisma";

export const healthRouter = Router();

healthRouter.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "ok", ts: new Date().toISOString() });
  } catch (err) {
    res
      .status(503)
      .json({ status: "error", db: "unreachable", ts: new Date().toISOString() });
  }
});
