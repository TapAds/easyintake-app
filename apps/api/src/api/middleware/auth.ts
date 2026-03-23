import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config";

/**
 * Bearer JWT authentication middleware.
 *
 * Validates the Authorization: Bearer <token> header.
 * Attaches the decoded payload to req.user on success.
 * Returns 401 on missing token and 403 on invalid/expired token.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    (req as Request & { user: unknown }).user = decoded;
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}
