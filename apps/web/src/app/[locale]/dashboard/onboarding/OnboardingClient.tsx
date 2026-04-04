"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { OrgPipelineConfig } from "@easy-intake/shared";
import {
  MAX_USER_MESSAGE_CHARS,
  screenOnboardingTurn,
} from "@/lib/onboarding/onboardingGuardrails";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function OnboardingClient({
  locale,
  initialComplete,
}: {
  locale: string;
  initialComplete: boolean;
}) {
  const t = useTranslations("onboarding");
  const tb = useTranslations("onboarding.blocked");
  const te = useTranslations("onboarding.errors");
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialComplete) {
      return [{ role: "assistant", content: t("resumeHint") }];
    }
    return [{ role: "assistant", content: t("welcome") }];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [pendingPipeline, setPendingPipeline] = useState<OrgPipelineConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setErrorKey(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];

    const pre = screenOnboardingTurn(
      nextMessages.map((m) => ({ role: m.role, content: m.content })),
    );
    if (!pre.ok) {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: tb(pre.reason as never) },
      ]);
      scrollToBottom();
      return;
    }

    setMessages(nextMessages);
    setLoading(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await res.json()) as {
        blocked?: boolean;
        blockReason?: string;
        assistantMessage?: string;
        pipelineConfig?: OrgPipelineConfig | null;
        error?: string;
      };
      if (!res.ok) {
        setErrorKey(data.error ?? "LLM_FAILED");
        setLoading(false);
        return;
      }
      if (data.blocked && data.blockReason) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: tb(data.blockReason as never),
          },
        ]);
        setLoading(false);
        scrollToBottom();
        return;
      }
      const assistantText = (data.assistantMessage ?? "").trim() || t("emptyAssistant");
      setMessages((m) => [...m, { role: "assistant", content: assistantText }]);
      if (data.pipelineConfig) setPendingPipeline(data.pipelineConfig);
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [input, loading, messages, scrollToBottom, t, tb]);

  const savePipeline = useCallback(async (pipeline: OrgPipelineConfig | null, complete: boolean) => {
    setSaving(true);
    setErrorKey(null);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(pipeline ? { pipelineConfig: pipeline } : {}),
          onboardingComplete: complete,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorKey(data.error ?? "SAVE_FAILED");
        setSaving(false);
        return;
      }
      setPendingPipeline(null);
      router.push(`/${locale}/dashboard/applications`);
      router.refresh();
    } catch {
      setErrorKey("NETWORK");
    } finally {
      setSaving(false);
    }
  }, [locale, router]);

  const skip = useCallback(() => {
    void savePipeline(null, true);
  }, [savePipeline]);

  const applyPending = useCallback(() => {
    if (pendingPipeline) void savePipeline(pendingPipeline, true);
  }, [pendingPipeline, savePipeline]);

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-foreground/70">{t("subtitle")}</p>
        <p className="mt-2 text-sm text-foreground/60">
          <Link href={`/${locale}/dashboard/settings`} className="text-primary underline underline-offset-2">
            {t("settingsLink")}
          </Link>
        </p>
      </div>

      <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4 min-h-[280px] max-h-[50vh] overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={
              m.role === "user"
                ? "ml-8 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground"
                : "mr-8 rounded-lg bg-foreground/5 px-3 py-2 text-sm text-foreground/90 whitespace-pre-wrap"
            }
          >
            {m.content}
          </div>
        ))}
        {loading ? (
          <div className="text-sm text-foreground/50 mr-8 rounded-lg bg-foreground/5 px-3 py-2">{t("thinking")}</div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {pendingPipeline ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">{t("previewTitle")}</p>
          <ol className="list-decimal list-inside text-sm text-foreground/80 space-y-1">
            {pendingPipeline.stages.map((s) => (
              <li key={s.id}>
                <span className="font-mono text-xs text-foreground/50">{s.id}</span> — {s.label.en} / {s.label.es}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void applyPending()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? t("saving") : t("savePipeline")}
            </button>
          </div>
        </div>
      ) : null}

      {errorKey ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {te(errorKey as never)}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          className="flex-1 rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder={t("inputPlaceholder")}
          maxLength={MAX_USER_MESSAGE_CHARS}
          disabled={loading || saving}
        />
        <button
          type="button"
          disabled={loading || saving || !input.trim()}
          onClick={() => void send()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 shrink-0"
        >
          {t("send")}
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          disabled={saving}
          onClick={() => void skip()}
          className="text-foreground/70 underline underline-offset-2 hover:text-foreground disabled:opacity-50"
        >
          {t("skipForNow")}
        </button>
      </div>
    </main>
  );
}
