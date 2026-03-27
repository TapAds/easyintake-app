import { getTranslations } from "next-intl/server";
import { AppChrome } from "@/components/AppChrome";
import { IntakeQueueTable } from "@/components/agent/IntakeQueueTable";
import { VoiceAgentBridge } from "@/components/agent/VoiceAgentBridge";

export default async function IntakeQueuePage() {
  const t = await getTranslations("agent.queue");
  const agentBase =
    process.env.NEXT_PUBLIC_AGENT_HTML_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "";

  return (
    <AppChrome>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("title")}
          </h1>
        </div>
        <VoiceAgentBridge agentBaseUrl={agentBase} />
        <IntakeQueueTable />
      </main>
    </AppChrome>
  );
}
