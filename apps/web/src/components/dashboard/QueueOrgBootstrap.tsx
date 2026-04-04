"use client";

import { useAuth, useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type Phase =
  | "loading"
  | "ready"
  | "pending_invite"
  | "bootstrap_failed";

function isSuperAdminClaims(claims: Record<string, unknown> | null | undefined): boolean {
  if (!claims) return false;
  if (claims.role === "super_admin") return true;
  const m = claims.metadata;
  if (m && typeof m === "object" && (m as Record<string, unknown>).role === "super_admin") {
    return true;
  }
  return false;
}

/**
 * Ensures a Clerk organization exists for self-service operators (creates one via POST /api/org/bootstrap).
 * Invite-only users with pending invitations see onboarding copy instead of a duplicate org.
 */
export function QueueOrgBootstrap({ children }: { children: React.ReactNode }) {
  const t = useTranslations("agent.applications");
  const { userId, isLoaded: authLoaded, sessionClaims } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const {
    isLoaded: listLoaded,
    setActive,
    userMemberships,
    userInvitations,
  } = useOrganizationList({
    userMemberships: { infinite: true },
    userInvitations: { infinite: true },
  });

  const [phase, setPhase] = useState<Phase>("loading");
  const [attempt, setAttempt] = useState(0);
  const activateOnce = useRef(false);
  const fetchInFlight = useRef(false);

  useEffect(() => {
    activateOnce.current = false;
    fetchInFlight.current = false;
  }, [attempt]);

  useEffect(() => {
    if (!authLoaded || !orgLoaded || !listLoaded) return;
    if (!userId) {
      setPhase("ready");
      return;
    }

    const claims = sessionClaims as Record<string, unknown> | null | undefined;
    if (isSuperAdminClaims(claims)) {
      setPhase("ready");
      return;
    }

    if (organization) {
      setPhase("ready");
      return;
    }

    if (userMemberships?.isLoading || userInvitations?.isLoading) {
      return;
    }

    const pendingClient =
      userInvitations?.data?.filter((i) => i.status === "pending") ?? [];
    if (pendingClient.length > 0) {
      setPhase("pending_invite");
      return;
    }

    const mems = userMemberships?.data ?? [];
    if (mems.length > 0 && setActive && !activateOnce.current) {
      const firstId = mems[0]?.organization.id;
      if (firstId) {
        activateOnce.current = true;
        void setActive({ organization: firstId })
          .then(() => setPhase("ready"))
          .catch(() => setPhase("bootstrap_failed"));
        return;
      }
    }

    if (fetchInFlight.current) return;
    fetchInFlight.current = true;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/org/bootstrap", { method: "POST" });
        const body = (await res.json()) as {
          action?: string;
          organizationId?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setPhase("bootstrap_failed");
          return;
        }
        if (body.action === "pending_invitation") {
          setPhase("pending_invite");
          return;
        }
        if (body.action === "skip_super_admin" || body.action === "already_active") {
          setPhase("ready");
          return;
        }
        if (
          (body.action === "activate_existing" || body.action === "created") &&
          body.organizationId &&
          setActive
        ) {
          await setActive({ organization: body.organizationId });
          setPhase("ready");
          return;
        }
        setPhase("bootstrap_failed");
      } catch {
        if (!cancelled) setPhase("bootstrap_failed");
      } finally {
        fetchInFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoaded,
    orgLoaded,
    listLoaded,
    userId,
    sessionClaims,
    organization,
    userMemberships?.data,
    userMemberships?.isLoading,
    userInvitations?.data,
    userInvitations?.isLoading,
    setActive,
    attempt,
  ]);

  if (phase === "pending_invite") {
    return (
      <section
        className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-6 space-y-3"
        aria-labelledby="queue-onboarding-pending-title"
      >
        <h2 id="queue-onboarding-pending-title" className="text-lg font-semibold text-foreground">
          {t("onboardingPendingInviteTitle")}
        </h2>
        <p className="text-sm text-foreground/80 max-w-xl">{t("onboardingPendingInviteBody")}</p>
      </section>
    );
  }

  if (phase === "bootstrap_failed") {
    return (
      <section
        className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 space-y-4"
        role="alert"
      >
        <p className="text-sm text-foreground">{t("onboardingBootstrapFailed")}</p>
        <button
          type="button"
          className="text-sm font-medium text-primary underline underline-offset-2"
          onClick={() => {
            setPhase("loading");
            setAttempt((a) => a + 1);
          }}
        >
          {t("onboardingRetry")}
        </button>
      </section>
    );
  }

  if (phase === "loading") {
    return (
      <section
        className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-6 space-y-2"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-foreground">{t("onboardingSettingUp")}</p>
        <p className="text-sm text-foreground/70">{t("onboardingSettingUpHint")}</p>
      </section>
    );
  }

  return (
    <div key={organization?.id ?? "queue-org"} className="space-y-6">
      {children}
    </div>
  );
}
