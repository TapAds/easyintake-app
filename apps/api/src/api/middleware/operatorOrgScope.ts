import { Request, Response, NextFunction } from "express";
import {
  resolveOrganizationIdsForClerkOrg,
  type OperatorOrgScope,
} from "../../services/operatorOrgScope";

declare global {
  namespace Express {
    interface Request {
      operatorScope?: OperatorOrgScope;
    }
  }
}

function readJwtRecord(user: unknown): Record<string, unknown> | null {
  if (!user || typeof user !== "object" || Array.isArray(user)) return null;
  return user as Record<string, unknown>;
}

/**
 * After requireAuth: resolves tenant scope from JWT (`org_id`, `super_admin`).
 * Rejects with 403 when a non–super-admin token has no org.
 */
export async function attachOperatorOrgScope(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const raw = (req as Request & { user?: unknown }).user;
    const decoded = readJwtRecord(raw);
    if (!decoded) {
      res.status(403).json({ error: "Invalid token payload" });
      return;
    }

    const purpose = decoded.purpose;
    if (purpose !== "operator") {
      res.status(403).json({ error: "Invalid token purpose for this route" });
      return;
    }

    if (decoded.super_admin === true) {
      req.operatorScope = { mode: "all" };
      next();
      return;
    }

    const orgId =
      typeof decoded.org_id === "string" ? decoded.org_id.trim() : "";
    if (!orgId) {
      res.status(403).json({
        error: "Active organization required",
        code: "NO_ORG",
      });
      return;
    }

    const organizationIds = await resolveOrganizationIdsForClerkOrg(orgId);
    req.operatorScope = { mode: "orgs", organizationIds };
    next();
  } catch (err) {
    next(err);
  }
}
