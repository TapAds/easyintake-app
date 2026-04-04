"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

export function SessionCopyIdButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations("agent.session");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="text-xs font-medium text-primary hover:underline"
    >
      {copied ? t("copied") : t("copyId")}
    </button>
  );
}
