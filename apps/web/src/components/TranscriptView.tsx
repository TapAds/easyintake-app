"use client";

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  offsetMs: number;
  languageCode?: string;
}

export interface TranscriptViewProps {
  segments: TranscriptSegment[];
  labels?: {
    agent?: string;
    caller?: string;
    unknown?: string;
  };
  className?: string;
}

function defaultSpeakerLabel(speaker: string): string {
  const lower = speaker.toLowerCase();
  if (lower === "agent") return "Agent";
  if (lower === "caller") return "Caller";
  return "Unknown";
}

export function TranscriptView({
  segments,
  labels = {},
  className = "",
}: TranscriptViewProps) {
  const getLabel = (speaker: string) =>
    labels.agent && speaker.toLowerCase() === "agent"
      ? labels.agent
      : labels.caller && speaker.toLowerCase() === "caller"
        ? labels.caller
        : labels.unknown ?? defaultSpeakerLabel(speaker);

  return (
    <div className={`overflow-y-auto ${className}`}>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="group rounded-lg px-3 py-2 transition-colors hover:bg-primary/10"
          >
            <span className="text-xs font-medium text-primary/80">
              {getLabel(seg.speaker)}
            </span>
            <p className="text-foreground text-sm">{seg.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
