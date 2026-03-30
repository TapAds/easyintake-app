import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { userCanEditOrganizationProfile } from "@/lib/auth/roles";
import {
  ORG_PUBLIC_LOGO_URL,
  ORG_PUBLIC_WEBSITE_URL,
  validateWebsiteForStorage,
} from "@/lib/settings/orgProfile";

function readOrgBranding(pm: Record<string, unknown>) {
  return {
    websiteUrl: typeof pm[ORG_PUBLIC_WEBSITE_URL] === "string" ? pm[ORG_PUBLIC_WEBSITE_URL] : "",
    logoUrl: typeof pm[ORG_PUBLIC_LOGO_URL] === "string" ? pm[ORG_PUBLIC_LOGO_URL] : "",
  };
}

export async function GET() {
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

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const pm = (org.publicMetadata ?? {}) as Record<string, unknown>;
  const { websiteUrl, logoUrl } = readOrgBranding(pm);

  return NextResponse.json({
    name: org.name,
    websiteUrl,
    logoUrl,
  });
}

export async function PATCH(req: Request) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const nameRaw = b.name;
  const websiteRaw = b.websiteUrl;
  const logoRaw = b.logoUrl;

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const existing = { ...((org.publicMetadata ?? {}) as Record<string, unknown>) };
  const patch: { name?: string; publicMetadata: Record<string, unknown> } = {
    publicMetadata: { ...existing },
  };

  if (typeof nameRaw === "string") {
    const name = nameRaw.trim();
    if (!name || name.length > 200) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
    patch.name = name;
  }

  if (websiteRaw !== undefined) {
    if (websiteRaw === null || websiteRaw === "") {
      delete patch.publicMetadata[ORG_PUBLIC_WEBSITE_URL];
    } else if (typeof websiteRaw === "string") {
      const v = validateWebsiteForStorage(websiteRaw);
      if (v === null) {
        return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
      }
      if (v === "") {
        delete patch.publicMetadata[ORG_PUBLIC_WEBSITE_URL];
      } else {
        patch.publicMetadata[ORG_PUBLIC_WEBSITE_URL] = v;
      }
    } else {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
  }

  if (logoRaw !== undefined) {
    if (logoRaw === null || logoRaw === "") {
      delete patch.publicMetadata[ORG_PUBLIC_LOGO_URL];
    } else if (typeof logoRaw === "string") {
      const u = logoRaw.trim();
      if (!u.startsWith("https://")) {
        return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
      }
      if (u.length > 2048) {
        return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
      }
      patch.publicMetadata[ORG_PUBLIC_LOGO_URL] = u;
    } else {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
  }

  try {
    await client.organizations.updateOrganization(orgId, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      publicMetadata: patch.publicMetadata as Record<string, unknown>,
    });
    const next = await client.organizations.getOrganization({ organizationId: orgId });
    const pm = (next.publicMetadata ?? {}) as Record<string, unknown>;
    const { websiteUrl, logoUrl } = readOrgBranding(pm);
    return NextResponse.json({ name: next.name, websiteUrl, logoUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Clerk error";
    return NextResponse.json({ error: "CLERK", message }, { status: 422 });
  }
}
