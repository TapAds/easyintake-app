import { Router, Request, Response } from "express";
import path from "path";

/**
 * GHL Custom Page — served inside GoHighLevel iframe.
 * Must allow frame-ancestors for GHL domains; no X-Frame-Options: DENY.
 *
 * Configure in GHL Marketplace:
 *   URL: https://YOUR_DOMAIN/ghl/custom?location_id={{location.id}}&user_id={{user.id}}
 */
export const ghlCustomPageRouter = Router();

const GHL_FRAME_ANCESTORS = [
  "https://app.gohighlevel.com",
  "https://*.gohighlevel.com",
  "https://app.myauthorize.net",
  "https://*.myauthorize.net",
].join(" ");

ghlCustomPageRouter.get("/custom", (req: Request, res: Response): void => {
  res.setHeader(
    "Content-Security-Policy",
    `frame-ancestors 'self' ${GHL_FRAME_ANCESTORS}`
  );
  // From dist/api/routes: ../../.. = apps/api root
  res.sendFile(path.join(__dirname, "..", "..", "..", "public", "ghl", "custom.html"));
});
