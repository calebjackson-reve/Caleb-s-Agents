"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: object) {
  const r = await fetch("/api/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

export function ActionButton(props: { id: string; personId?: string; on: boolean; onLabel: string; offLabel: string; onAction: string; offAction: string; small?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const click = async () => {
    setBusy(true);
    await post({ action: props.on ? props.offAction : props.onAction, id: props.id, person_id: props.personId });
    router.refresh();
    setBusy(false);
  };
  return (
    <button className={`btn ${props.on ? "done" : ""}`} onClick={click} disabled={busy} style={props.small ? { padding: "4px 8px", minHeight: 0, marginLeft: 6, fontSize: 12 } : undefined}>
      {props.on ? props.onLabel : props.offLabel}
    </button>
  );
}

export function ApproveButton(props: { queueFile: string; count: number; droppedIds: string[] }) {
  const router = useRouter();
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const click = async () => {
    if (!confirm(`Send ${props.count} follow-up${props.count > 1 ? "s" : ""} now? Dropped rows stay out.`)) return;
    setBusy(true);
    const r = await post({ action: "approve", queue_file: props.queueFile, dropped: props.droppedIds });
    setOut(`${r.live ? "LIVE" : "DRY RUN (set APPROVE_LIVE=true on the server to send for real)"}\n${r.output || r.error || ""}`);
    router.refresh();
    setBusy(false);
  };
  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn primary" onClick={click} disabled={busy}>Approve and send {props.count}</button>
      {out && <pre className="out">{out}</pre>}
    </div>
  );
}
