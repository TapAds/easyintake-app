import fs from "fs";
import path from "path";
import express, { Router, Request, Response } from "express";

/**
 * GHL Custom Page — served inside GoHighLevel iframe.
 * Must allow frame-ancestors for GHL domains; no X-Frame-Options: DENY.
 *
 * Configure in GHL Marketplace (Phase 6):
 *   URL: https://YOUR_DOMAIN/ghl/custom?location_id={{location.id}}&contact_id={{contact.id}}&user_id={{user.id}}&page_secret=YOUR_SECRET
 *
 * When the React build exists at `public/ghl/app/index.html`, that shell is served; otherwise `custom.html` (legacy stub).
 */
export const ghlCustomPageRouter = Router();

const GHL_FRAME_ANCESTORS = [
  "https://app.gohighlevel.com",
  "https://*.gohighlevel.com",
  "https://app.myauthorize.net",
  "https://*.myauthorize.net",
].join(" ");

// From dist/api/routes: ../../../public/ghl/app
const GHL_REACT_ROOT = path.join(__dirname, "..", "..", "..", "public", "ghl", "app");
const GHL_LEGACY_STUB = path.join(__dirname, "..", "..", "..", "public", "ghl", "custom.html");

ghlCustomPageRouter.use(
  "/app",
  express.static(GHL_REACT_ROOT, { index: false, fallthrough: false })
);

function setGhlFrameAncestors(res: Response): void {
  res.setHeader(
    "Content-Security-Policy",
    `frame-ancestors 'self' ${GHL_FRAME_ANCESTORS}`
  );
}

ghlCustomPageRouter.get("/custom", (req: Request, res: Response): void => {
  setGhlFrameAncestors(res);
  const indexReact = path.join(GHL_REACT_ROOT, "index.html");
  if (fs.existsSync(indexReact)) {
    res.sendFile(indexReact);
    return;
  }
  res.sendFile(GHL_LEGACY_STUB);
});
