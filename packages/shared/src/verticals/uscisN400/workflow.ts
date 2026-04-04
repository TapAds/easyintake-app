/**
 * Channel / NBA hints for N-400 orchestration (copy keys only; API resolves locale).
 * See docs/uscis-n400/N400_AGENT_INTELLIGENCE.md.
 */

export type NbaChannelPreference = "sms" | "whatsapp" | "voice" | "web";

export interface ChannelTransitionRule {
  /** When current section or risk tier matches. */
  when: "part12_moral" | "default";
  /** Prefer these channels for sensitive follow-up. */
  preferChannels: NbaChannelPreference[];
  messageKey: string;
}

export const N400_CHANNEL_TRANSITIONS: ChannelTransitionRule[] = [
  {
    when: "part12_moral",
    preferChannels: ["voice", "web", "sms"],
    messageKey: "n400.workflow.channel.part12_prefer_voice_or_web",
  },
  {
    when: "default",
    preferChannels: ["sms", "whatsapp", "web", "voice"],
    messageKey: "n400.workflow.channel.default",
  },
];

export type NbaKind = "evidence_focus" | "field_focus" | "channel_shift" | "none";

/**
 * Prefer evidence nudges when field completion is already high (Release A dual scoring).
 */
export function nextBestActionKind(args: {
  fieldCompletion: number;
  evidenceCompletion: number;
  /** True when any Part 12 moral-character flag suggests legal review path. */
  moralCharacterHeavy?: boolean;
}): NbaKind {
  const { fieldCompletion: fc, evidenceCompletion: ec } = args;
  if (args.moralCharacterHeavy) return "channel_shift";
  if (fc >= 0.72 && ec < 0.85) return "evidence_focus";
  if (fc < 0.5 && ec >= 0.7) return "field_focus";
  return "none";
}
