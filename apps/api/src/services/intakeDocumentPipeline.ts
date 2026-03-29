import { createHash } from "crypto";
import type { EntityFieldName } from "../config/fieldStages";
import { config } from "../config";
import { prisma } from "../db/prisma";
import { extractEntitiesFromDocument, type DocumentMediaType } from "./claude";
import {
  fetchGhlAttachment,
  normalizeGhlAttachmentRef,
  SUPPORTED_DOCUMENT_MEDIA_TYPES,
} from "./intakeAttachmentFetch";
import type { InboundCanonicalChannel } from "../types/ghlInbound";

function mergeEntityPick(
  a: Partial<Record<EntityFieldName, unknown>>,
  b: Partial<Record<EntityFieldName, unknown>>
): Partial<Record<EntityFieldName, unknown>> {
  return { ...a, ...b };
}

/**
 * Fetch, extract (Claude vision/PDF), and persist audit rows for GHL inbound attachments.
 */
export async function processInboundAttachments(args: {
  intakeSessionId: string;
  ghlLocationId: string;
  ghlContactId: string;
  ghlMessageId: string | null;
  inboundChannel: InboundCanonicalChannel;
  attachments: unknown[];
}): Promise<Partial<Record<EntityFieldName, unknown>>> {
  let combined: Partial<Record<EntityFieldName, unknown>> = {};
  const maxN = config.documents.maxPerMessage;
  let processed = 0;

  for (const raw of args.attachments) {
    if (processed >= maxN) break;
    const sourceUrl = normalizeGhlAttachmentRef(raw);
    if (!sourceUrl) continue;
    processed += 1;

    let fetched;
    try {
      fetched = await fetchGhlAttachment(args.ghlLocationId, sourceUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[doc-pipeline] fetch failed:", msg);
      await prisma.intakeAttachment.create({
        data: {
          intakeSessionId: args.intakeSessionId,
          ghlMessageId: args.ghlMessageId,
          ghlContactId: args.ghlContactId,
          inboundChannel: args.inboundChannel,
          sourceUrl,
          mimeType: null,
          byteSize: 0,
          sha256: createHash("sha256").update(`fetch-fail:${sourceUrl}:${msg}`).digest("hex"),
          status: "failed",
          errorMessage: msg.slice(0, 2000),
        },
      });
      continue;
    }

    const sha256 = createHash("sha256").update(fetched.buffer).digest("hex");
    const dup = await prisma.intakeAttachment.findFirst({
      where: { intakeSessionId: args.intakeSessionId, sha256 },
    });
    if (dup) {
      console.log(`[doc-pipeline] skip duplicate sha256=${sha256.slice(0, 12)}…`);
      continue;
    }

    if (!SUPPORTED_DOCUMENT_MEDIA_TYPES.has(fetched.mimeType)) {
      await prisma.intakeAttachment.create({
        data: {
          intakeSessionId: args.intakeSessionId,
          ghlMessageId: args.ghlMessageId,
          ghlContactId: args.ghlContactId,
          inboundChannel: args.inboundChannel,
          sourceUrl,
          mimeType: fetched.mimeType,
          byteSize: fetched.byteSize,
          sha256,
          status: "skipped",
          errorMessage: `unsupported type: ${fetched.mimeType}`,
        },
      });
      continue;
    }

    let extracted: Partial<Record<EntityFieldName, unknown>> = {};
    try {
      const b64 = fetched.buffer.toString("base64");
      extracted = await extractEntitiesFromDocument(b64, fetched.mimeType as DocumentMediaType);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[doc-pipeline] extraction failed:", msg);
      await prisma.intakeAttachment.create({
        data: {
          intakeSessionId: args.intakeSessionId,
          ghlMessageId: args.ghlMessageId,
          ghlContactId: args.ghlContactId,
          inboundChannel: args.inboundChannel,
          sourceUrl,
          mimeType: fetched.mimeType,
          byteSize: fetched.byteSize,
          sha256,
          status: "failed",
          errorMessage: msg.slice(0, 2000),
        },
      });
      continue;
    }

    await prisma.intakeAttachment.create({
      data: {
        intakeSessionId: args.intakeSessionId,
        ghlMessageId: args.ghlMessageId,
        ghlContactId: args.ghlContactId,
        inboundChannel: args.inboundChannel,
        sourceUrl,
        mimeType: fetched.mimeType,
        byteSize: fetched.byteSize,
        sha256,
        status: "extracted",
        extractedPreview: extracted as object,
      },
    });

    combined = mergeEntityPick(combined, extracted);
  }

  return combined;
}
