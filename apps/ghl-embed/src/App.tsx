import { useCallback, useEffect, useRef, useState } from "react";

type SessionPayload = {
  agency: { locationId: string; name: string };
  session: {
    sessionId: string;
    status: string;
    completenessScore: number;
    primaryChannel?: string;
    fieldValues: Record<string, unknown>;
    channels: unknown[];
    hitl: {
      pendingAgentReview: boolean;
      pendingDocumentApproval: boolean;
      pendingFinalSignOff: boolean;
      pendingApplicantSignature: boolean;
    };
    externalIds?: Record<string, unknown>;
    attachments: { id: string; status: string; mimeType: string | null }[];
    signatureRequests: {
      id: string;
      status: string;
      ghlTemplateId: string;
    }[];
    updatedAt: string;
  } | null;
};

function readGhlQuery(): {
  locationId: string;
  contactId: string;
  userId: string;
  pageSecret: string;
} {
  const p = new URLSearchParams(window.location.search);
  return {
    locationId: p.get("location_id") || p.get("location.id") || "",
    contactId: p.get("contact_id") || p.get("contact.id") || "",
    userId: p.get("user_id") || p.get("user.id") || "",
    pageSecret: p.get("page_secret") || "",
  };
}

function apiHeaders(pageSecret: string): HeadersInit {
  const h: Record<string, string> = {};
  if (pageSecret) {
    h["X-EasyIntake-Embed-Secret"] = pageSecret;
  }
  return h;
}

function flattenFieldValues(fv: Record<string, unknown>): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = [];
  for (const [key, cell] of Object.entries(fv)) {
    if (cell && typeof cell === "object" && cell !== null && "value" in cell) {
      const v = (cell as { value: unknown }).value;
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        rows.push({ key, value: String(v) });
      }
    }
  }
  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

function tierFromScore(overall: number): string {
  if (overall >= 0.7) return "qualified";
  if (overall >= 0.4) return "partial";
  return "incomplete";
}

export function App() {
  const { locationId, contactId, userId, pageSecret } = readGhlQuery();
  const [sessionRes, setSessionRes] = useState<SessionPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const [manualCallSid, setManualCallSid] = useState("");
  const [wsStatus, setWsStatus] = useState<string>("Disconnected");
  const [transcript, setTranscript] = useState<string>("");
  const [scoreOverall, setScoreOverall] = useState<number | null>(null);
  const [scoreTier, setScoreTier] = useState<string>("");
  const [guidance, setGuidance] = useState<string>("—");
  const wsRef = useRef<WebSocket | null>(null);

  const origin = window.location.origin;

  const loadSession = useCallback(async () => {
    setLoadError(null);
    if (!locationId || !contactId) {
      setLoadError("Add location_id and contact_id to the Custom Page URL (GHL variables).");
      return;
    }
    const q = new URLSearchParams({
      location_id: locationId,
      contact_id: contactId,
    });
    if (pageSecret) {
      q.set("page_secret", pageSecret);
    }
    try {
      const res = await fetch(`${origin}/ghl/api/session?${q}`, {
        headers: apiHeaders(pageSecret),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as SessionPayload;
      setSessionRes(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load session");
    }
  }, [locationId, contactId, pageSecret, origin]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!locationId || !contactId) return;

    const q = new URLSearchParams({ location_id: locationId, contact_id: contactId });
    if (pageSecret) q.set("page_secret", pageSecret);

    void fetch(`${origin}/ghl/api/active-call?${q}`, { headers: apiHeaders(pageSecret) })
      .then((r) => r.json())
      .then((j: { callSid?: string | null }) => {
        if (j.callSid) {
          setActiveCallSid(j.callSid);
          setManualCallSid(j.callSid);
        }
      })
      .catch(() => {});
  }, [locationId, contactId, pageSecret, origin]);

  const connectWs = useCallback(
    async (callSid: string) => {
      if (!callSid.trim() || !locationId || !contactId) return;
      wsRef.current?.close();
      setTranscript("");
      setWsStatus("Getting token…");

      try {
        const res = await fetch(`${origin}/ghl/api/ws-token`, {
          method: "POST",
          headers: { ...apiHeaders(pageSecret), "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId,
            contactId,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error || `token ${res.status}`);
        }
        const { token } = (await res.json()) as { token: string };
        const proto = location.protocol === "https:" ? "wss:" : "ws:";
        const url = `${proto}//${location.host}/ws/agent?token=${encodeURIComponent(
          token
        )}&callSid=${encodeURIComponent(callSid)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = () => setWsStatus(`Live · ${callSid}`);
        ws.onclose = () => setWsStatus("Disconnected");
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
            switch (msg.type) {
              case "transcript_chunk":
                setTranscript(
                  (t) =>
                    t +
                    `[${String(msg.speaker)}] ${String(msg.text)}\n`
                );
                break;
              case "entity_update": {
                const sc = msg.score as { overall?: number; tier?: string };
                if (typeof sc?.overall === "number") {
                  setScoreOverall(sc.overall);
                  setScoreTier(sc.tier ?? tierFromScore(sc.overall));
                }
                break;
              }
              case "score_update": {
                const o = msg.overall as number;
                if (typeof o === "number") {
                  setScoreOverall(o);
                  setScoreTier(String(msg.tier ?? tierFromScore(o)));
                }
                break;
              }
              case "guidance":
                setGuidance(String(msg.guidanceText ?? "—"));
                break;
              case "call_ended":
                setWsStatus("Call ended");
                break;
              default:
                break;
            }
          } catch {
            /* ignore */
          }
        };
      } catch (e) {
        setWsStatus(e instanceof Error ? e.message : "WebSocket error");
      }
    },
    [locationId, contactId, pageSecret, origin]
  );

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const autoWsRef = useRef(false);
  useEffect(() => {
    if (autoWsRef.current || !activeCallSid || !locationId || !contactId) return;
    autoWsRef.current = true;
    void connectWs(activeCallSid);
  }, [activeCallSid, locationId, contactId, connectWs]);

  const effectiveCallSid = manualCallSid.trim() || activeCallSid || "";
  const s = sessionRes?.session;
  const flatFields = s ? flattenFieldValues(s.fieldValues) : [];

  return (
    <div className="shell">
      <h1>Easy Intake</h1>
      <p className="subtitle">Live call — session, transcript, and field snapshot</p>

      <div className="card">
        <h2>GHL context</h2>
        <div className="row">
          {locationId ? <span className="badge">location: {locationId}</span> : null}
          {contactId ? <span className="badge">contact: {contactId}</span> : null}
          {userId ? <span className="badge">user: {userId}</span> : null}
        </div>
        <p className="meta" style={{ marginTop: 8 }}>
          Use Custom Page URL with <code>contact_id=&#123;&#123;contact.id&#125;&#125;</code> on
          contact records. Set <code>GHL_CUSTOM_PAGE_SECRET</code> on the API and add{" "}
          <code>page_secret=</code>… in production.
        </p>
      </div>

      {loadError ? (
        <div className="card error">{loadError}</div>
      ) : null}

      {!loadError && sessionRes ? (
        <>
          <div className="card">
            <h2>Agency</h2>
            <p className="meta">
              {sessionRes.agency.name} · {sessionRes.agency.locationId}
            </p>
          </div>

          {s ? (
            <>
              <div className="card">
                <h2>Session</h2>
                <p className="meta">
                  <span className="badge">{s.sessionId}</span> status: {s.status} · completeness:{" "}
                  {(s.completenessScore * 100).toFixed(0)}%
                </p>
                {s.externalIds && typeof s.externalIds.lastInboundChannel === "string" ? (
                  <p className="meta">
                    Last inbound channel:{" "}
                    <strong>{String(s.externalIds.lastInboundChannel)}</strong>
                  </p>
                ) : null}
                <p className="meta">
                  HITL: review {s.hitl.pendingAgentReview ? "yes" : "no"} · docs{" "}
                  {s.hitl.pendingDocumentApproval ? "yes" : "no"} · sign-off{" "}
                  {s.hitl.pendingFinalSignOff ? "yes" : "no"} · applicant sign{" "}
                  {s.hitl.pendingApplicantSignature ? "yes" : "no"}
                </p>
                <button type="button" className="btn" onClick={() => void loadSession()}>
                  Refresh session
                </button>
              </div>

              <div className="card">
                <h2>Fields captured</h2>
                {flatFields.length === 0 ? (
                  <p className="meta">No field values yet.</p>
                ) : (
                  <div className="fields">
                    {flatFields.map((f) => (
                      <div key={f.key} className="field">
                        <span className="k">{f.key}</span>
                        <span className="v">{f.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Documents & signatures</h2>
                <p className="meta">Attachments: {s.attachments.length}</p>
                {s.attachments.length > 0 ? (
                  <ul className="compact">
                    {s.attachments.slice(0, 5).map((a) => (
                      <li key={a.id}>
                        {a.status} {a.mimeType ? `· ${a.mimeType}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="meta">Signature requests: {s.signatureRequests.length}</p>
                {s.signatureRequests.length > 0 ? (
                  <ul className="compact">
                    {s.signatureRequests.map((r) => (
                      <li key={r.id}>
                        {r.status} · template {r.ghlTemplateId}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </>
          ) : (
            <div className="card">
              <h2>Session</h2>
              <p className="meta">
                No IntakeSession for this contact yet. It will appear after a voice call or GHL
                message is processed.
              </p>
            </div>
          )}

          <div className="card">
            <h2>Live call (WebSocket)</h2>
            <p className="meta">
              {activeCallSid
                ? `Active call detected: ${activeCallSid}`
                : "No active call on this contact (or not linked yet)."}
            </p>
            <div className="call-ctrl">
              <input
                type="text"
                placeholder="callSid (CA…)"
                value={manualCallSid}
                onChange={(e) => setManualCallSid(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                disabled={!effectiveCallSid}
                onClick={() => void connectWs(effectiveCallSid)}
              >
                Connect live transcript
              </button>
            </div>
            <p className="meta">
              Status: <strong>{wsStatus}</strong>
            </p>
            {scoreOverall !== null ? (
              <p>
                Live score:{" "}
                <span className={`score tier-${scoreTier || tierFromScore(scoreOverall)}`}>
                  {(scoreOverall * 100).toFixed(0)}%
                </span>
              </p>
            ) : null}
            <div className="transcript">{transcript || "—"}</div>
            <p className="guidance">Guidance: {guidance}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}
