import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { config } from "../config";
import { callEvents } from "../lib/callEvents";

const deepgram = createClient(config.deepgram.apiKey);

export interface UtteranceEvent {
  callSid: string;
  speaker: string;
  text: string;
  offsetMs: number;
  languageCode: string;
  confidence: number | null;
}

/**
 * Opens a Deepgram live transcription session for the given call.
 *
 * Returns a function that accepts raw mulaw audio buffers (base64-decoded
 * from Twilio Media Stream frames) and forwards them to Deepgram.
 *
 * When Deepgram returns a final transcript, it emits an "utterance" event
 * on callEvents and resolves any pending promise for downstream consumers.
 *
 * Call `stop()` when the call ends to gracefully finish the session.
 */
export function startDeepgramSession(callSid: string): {
  sendAudio: (chunk: Buffer) => void;
  stop: () => void;
} {
  const connection = deepgram.listen.live({
    model: "nova-3",
    language: "multi",        // auto-detect multilingual (EN, ES, etc.)
    punctuate: true,
    smart_format: true,
    diarize: true,            // speaker labels
    interim_results: true,
    utterance_end_ms: 1000,
    encoding: "mulaw",
    sample_rate: 8000,        // Twilio Media Stream default
    channels: 1,
  });

  let callStartMs = Date.now();

  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log(`[deepgram] session open for call ${callSid}`);
    callStartMs = Date.now();
  });

  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data?.channel?.alternatives?.[0];
    if (!alt?.transcript || alt.transcript.trim() === "") return;

    // Only emit on final (non-interim) results
    if (data.is_final !== true) return;

    const speaker =
      alt.words?.[0]?.speaker !== undefined
        ? `speaker_${alt.words[0].speaker}`
        : "unknown";

    const offsetMs = Math.round((data.start ?? 0) * 1000);
    const languageCode = data.channel?.detected_language ?? "en";
    const confidence: number | null = alt.confidence ?? null;

    const event: UtteranceEvent = {
      callSid,
      speaker,
      text: alt.transcript,
      offsetMs,
      languageCode,
      confidence,
    };

    console.log(
      `[deepgram] [${callSid}] ${speaker}: "${alt.transcript}" (${languageCode}, conf=${confidence})`
    );

    callEvents.emit("utterance", event);
  });

  connection.on(LiveTranscriptionEvents.Error, (err) => {
    console.error(`[deepgram] error for call ${callSid}:`, err);
  });

  connection.on(LiveTranscriptionEvents.Close, () => {
    console.log(`[deepgram] session closed for call ${callSid}`);
  });

  return {
    sendAudio(chunk: Buffer) {
      if (connection.getReadyState() === 1 /* OPEN */) {
        const arrayBuffer = chunk.buffer.slice(
          chunk.byteOffset,
          chunk.byteOffset + chunk.byteLength
        ) as ArrayBuffer;
        connection.send(arrayBuffer);
      }
    },
    stop() {
      try {
        connection.requestClose();
      } catch {
        // already closed — ignore
      }
    },
  };
}
