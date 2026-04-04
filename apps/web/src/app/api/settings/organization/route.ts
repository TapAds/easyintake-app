import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { parseOrgPipelineConfig } from "@easy-intake/shared";
import { userCanEditOrganizationProfile } from "@/lib/auth/roles";
import {
  ORG_PUBLIC_LOGO_URL,
  ORG_PUBLIC_ONBOARDING_COMPLETE,
  ORG_PUBLIC_PIPELINE_CONFIG,
  ORG_PUBLIC_WEBSITE_URL,
  validateWebsiteForStorage,
} from "@/lib/settings/orgProfile";
import { readOrgPipelineAndOnboarding } from "@/lib/settings/readOrgMetadata";

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
  const { pipelineConfig, onboardingComplete } = readOrgPipelineAndOnboarding(pm);

  return NextResponse.json({
    name: org.name,
    websiteUrl,
    logoUrl,
    pipelineConfig,
    onboardingComplete,
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
  const pipelineRaw = b.pipelineConfig;
  const onboardingCompleteRaw = b.onboardingComplete;

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

  if (pipelineRaw !== undefined) {
    if (pipelineRaw === null) {
      delete patch.publicMetadata[ORG_PUBLIC_PIPELINE_CONFIG];
    } else {
      const parsed = parseOrgPipelineConfig(pipelineRaw);
      if (!parsed) {
        return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
      }
      patch.publicMetadata[ORG_PUBLIC_PIPELINE_CONFIG] = parsed;
    }
  }

  if (onboardingCompleteRaw !== undefined) {
    if (typeof onboardingCompleteRaw !== "boolean") {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
    patch.publicMetadata[ORG_PUBLIC_ONBOARDING_COMPLETE] = onboardingCompleteRaw;
  }

  try {
    await client.organizations.updateOrganization(orgId, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      publicMetadata: patch.publicMetadata as Record<string, unknown>,
    });
    const next = await client.organizations.getOrganization({ organizationId: orgId });
    const pm = (next.publicMetadata ?? {}) as Record<string, unknown>;
    const { websiteUrl, logoUrl } = readOrgBranding(pm);
    const { pipelineConfig, onboardingComplete } = readOrgPipelineAndOnboarding(pm);
    return NextResponse.json({ name: next.name, websiteUrl, logoUrl, pipelineConfig, onboardingComplete });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Clerk error";
    return NextResponse.json({ error: "CLERK", message }, { status: 422 });
  }
}
