import Link from "next/link";
import { connection } from "next/server";

export const instant = false;
import { readStore, readState } from "@/lib/store";
import { ActionButton, ApproveButton } from "./actions";

function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
function tel(p: string) { return p ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : ""; }

export default async function Page() {
  await connection();
  const [store, state] = await Promise.all([readStore(), readState()]);
  const due = store.followups_due.filter((f) => !state.dropped[f.id]);
  const dropped = store.followups_due.filter((f) => state.dropped[f.id]);
  const uncalled = store.leads.filter((l) => !state.called[l.id]);
  const called = store.leads.filter((l) => state.called[l.id]);
  const errors = store.overnight.filter((e) => e.level === "error");
  const deals = store.pipeline || [];
  const touches = (store.touches_due || []).filter((t) => !(state.touched || {})[t.name.toLowerCase()]);
  const tasks = (store.tasks || []).filter((t) => !(state.done || {})[t.id]);
  const closeIn = (d: string) => (d ? Math.round((new Date(d).getTime() - Date.now()) / 86400000) : null);
  const byListing = new Map<string, typeof store.showings>();
  for (const s of store.showings) {
    const k = s.property || "unknown";
    byListing.set(k, [...(byListing.get(k) || []), s]);
  }

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="brand">Keller Williams First Choice</div>
          <h1>Good morning, Caleb</h1>
        </div>
        <div className="meta">
          {store.mode === "seed" ? "Sample data" : "Synced"} {ago(store.generated_at)}
          {errors.length > 0 && <> · <span className="pill bad">{errors.length} error{errors.length > 1 ? "s" : ""} overnight</span></>}
        </div>
      </header>

      <section>
        <h2>Deals <span className="count">{deals.length} live</span></h2>
        {!store.crm_pulled_at && <div className="empty">No CRM cache yet. On the Mac: <code>python3 aire/crm/crm.py pull</code>{store.crm_error ? ` (${store.crm_error})` : ""}</div>}
        {deals.map((d) => {
          const n = closeIn(d.expected_close);
          return (
            <div className="row" key={d.id}>
              <div className="main">
                <div className="name">{d.client} <span className="pill warn">{d.stage.replace("_", " ")}</span>
                  {n !== null && n <= 14 && <> <span className={`pill ${n < 0 ? "bad" : "ok"}`}>{n < 0 ? `close date passed ${-n} d ago` : `closes in ${n} d`}</span></>}</div>
                <div className="sub">{d.side} · {d.address}{d.price ? ` · $${Number(d.price).toLocaleString()}` : ""}{d.expected_close ? ` · close ${d.expected_close}` : " · no close date"}</div>
                {d.next_step && <div className="sub">Next: {d.next_step}</div>}
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2>Touches due <span className="count">{touches.length}</span></h2>
        {store.crm_pulled_at && touches.length === 0 && <div className="empty">Everyone on the hot and warm list has been touched inside their cadence.</div>}
        {touches.slice(0, 25).map((t) => (
          <div className="row" key={t.name}>
            <div className="main">
              <div className="name">{t.name} <span className={`pill ${t.tier === "HOT" ? "bad" : t.tier === "WARM" ? "warn" : "ok"}`}>{t.tier}</span>
                {" "}<span className="sub">{t.days === null ? "never logged" : `${t.days} d quiet`}</span></div>
              {t.next_action && <div className="sub">{t.next_action}</div>}
              {t.phone && <a className="call" href={`tel:${t.phone.replace(/\D/g, "")}`}>Call {t.phone}</a>}
            </div>
            <div className="actions">
              <ActionButton id={t.name} on={false} onLabel="Touched" offLabel="Log a touch" onAction="touched" offAction="untouched" />
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>Tasks <span className="count">{tasks.length} open · {tasks.filter((t) => t.overdue).length} overdue</span></h2>
        {store.crm_pulled_at && tasks.length === 0 && <div className="empty">No open tasks.</div>}
        {tasks.slice(0, 30).map((t) => (
          <div className="row" key={t.id}>
            <div className="main">
              <div className="name">{t.contact ? `${t.contact}: ` : ""}{t.task}
                {t.overdue && <> <span className="pill bad">overdue</span></>}</div>
              <div className="sub">due {t.due} · {t.source}</div>
            </div>
            <div className="actions">
              <ActionButton id={t.id} on={false} onLabel="Done" offLabel="Done" onAction="task-done" offAction="task-undone" />
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>New leads <span className="count">{uncalled.length} to call</span></h2>
        {store.leads.length === 0 && <div className="empty">No leads handled yet. The responder writes here.</div>}
        {[...uncalled, ...called].map((l) => (
          <div className="row" key={l.id}>
            <div className="main">
              <div className="name"><Link href={`/leads/${encodeURIComponent(l.id)}`}>{l.name}</Link>
                {" "}<span className={`pill ${l.mode === "live" ? "ok" : "warn"}`}>{l.mode === "live" ? `replied in ${l.seconds_to_reply} s` : "dry run"}</span></div>
              <div className="sub">{l.source} · came in {ago(l.received_at)} · {l.channels}</div>
              {l.phone && <a className="call" href={`tel:+1${l.phone}`}>Call {tel(l.phone)}</a>}
            </div>
            <div className="actions">
              <ActionButton id={l.id} on={!!state.called[l.id]} onLabel="Called" offLabel="Mark called" onAction="called" offAction="uncalled" />
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>Due today <span className="count">{due.length} queued</span></h2>
        {due.length === 0 && <div className="empty">Nothing due. Run the follow-up sync in the morning to fill this.</div>}
        {due.map((f) => (
          <div className="row" key={f.id}>
            <div className="main">
              <div className="name">{f.name} <span className="pill warn">{f.stage}, day {f.day}</span></div>
              <div className="sub">Subject: {f.subject}</div>
              <div className="body">{f.body.split("\n\nThanks,")[0]}</div>
            </div>
            <div className="actions">
              <ActionButton id={f.id} on={false} onLabel="Dropped" offLabel="Drop" onAction="drop" offAction="undrop" />
            </div>
          </div>
        ))}
        {dropped.length > 0 && (
          <div className="note">Dropped: {dropped.map((f) => f.name).join(", ")}.{" "}
            {dropped.map((f) => <ActionButton key={f.id} id={f.id} on={true} onLabel={`Undrop ${f.name.split(" ")[0]}`} offLabel="" onAction="drop" offAction="undrop" small />)}
          </div>
        )}
        {due.length > 0 && <ApproveButton queueFile={due[0].queue_file} count={due.length} droppedIds={dropped.map((d) => d.id)} />}
        {store.flags.length > 0 && (
          <div className="note">
            <strong>Flagged for you, nothing sent:</strong>
            {store.flags.map((fl, i) => <div key={i}>{fl.name}: {fl.why}. {fl.quote && <em>“{fl.quote}”</em>}</div>)}
          </div>
        )}
      </section>

      <section>
        <h2>Proposals out <span className="count">{store.proposals.length}</span></h2>
        {store.proposals.length === 0 && <div className="empty">No proposals generated yet.</div>}
        {store.proposals.map((p) => {
          const signed = !!state.signed[p.id];
          return (
            <div className="row" key={p.id}>
              <div className="main">
                <div className="name">{p.client} <span className={`pill ${signed ? "ok" : "warn"}`}>{signed ? "signed" : "waiting"}</span>
                  {p.needs_review && <> <span className="pill bad">review notes</span></>}</div>
                <div className="sub">{p.address} · prepared {p.prepared} · {p.price_range}</div>
                {signed && <div className="body">Next: send the listing agreement through Authentisign.</div>}
                {!signed && p.next_step && <div className="sub">{p.next_step}</div>}
              </div>
              <div className="actions">
                <ActionButton id={p.id} on={signed} onLabel="Signed" offLabel="Mark signed" onAction="signed" offAction="unsigned" />
              </div>
            </div>
          );
        })}
      </section>

      <section>
        <h2>Overnight <span className="count">{store.overnight.length}</span></h2>
        {store.overnight.length === 0 && <div className="empty">Quiet night.</div>}
        {store.overnight.map((e, i) => (
          <div className="event" key={i}>
            <span className="tool">{e.tool}</span>
            <span className={`pill ${e.level === "error" ? "bad" : "ok"}`}>{e.level}</span>
            <span>{e.message} <span className="sub">· {ago(e.at)}</span></span>
          </div>
        ))}
      </section>

      <section>
        <h2>This week’s showings <span className="count">{store.showings.length}</span></h2>
        {store.showings.length === 0 && <div className="empty">Connect Gmail (the responder’s token) and ShowingTime emails show up here.</div>}
        {[...byListing.entries()].map(([prop, list]) => (
          <div className="row" key={prop}>
            <div className="main">
              <div className="name">{prop}</div>
              {list.map((s, i) => (
                <div className="sub" key={i}><span className={`pill ${s.status === "Confirmed" ? "ok" : s.status === "Error" ? "bad" : "warn"}`}>{s.status}</span> {s.when || s.error}</div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <p className="note">Caleb Jackson · REALTOR · Keller Williams First Choice · (225) 747-0303. This page reads the AIRE CRM sheet (through crm.py) and the tools’ files. The only thing it can send is the follow-up queue, through the follow-up tool’s own rules.</p>
    </div>
  );
}
