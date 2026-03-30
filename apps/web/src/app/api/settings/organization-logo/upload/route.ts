import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { userCanEditOrganizationProfile } from "@/lib/auth/roles";
import {
  ALLOWED_LOGO_IMAGE_TYPES,
  MAX_LOGO_BYTES,
} from "@/lib/settings/orgProfile";

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!(await userCanEditOrganizationProfile())) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "NO_ORG" }, { status: 400 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_NOT_CONFIGURED" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const type = (file.type || "").toLowerCase();
  if (!ALLOWED_LOGO_IMAGE_TYPES.has(type)) {
    return NextResponse.json({ error: "INVALID_TYPE" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.byteLength === 0 || buf.byteLength > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "INVALID_SIZE" }, { status: 400 });
  }

  const ext =
    type === "image/png"
      ? "png"
      : type === "image/webp"
        ? "webp"
        : type === "image/gif"
          ? "gif"
          : "jpg";

  const path = `org-logos/${orgId}/${Date.now()}.${ext}`;

  try {
    const blob = await put(path, buf, {
      access: "public",
      contentType: type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: "UPLOAD", message }, { status: 422 });
  }
}
