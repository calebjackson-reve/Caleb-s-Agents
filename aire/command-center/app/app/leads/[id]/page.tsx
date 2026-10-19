import Link from "next/link";
import { connection } from "next/server";

export const instant = false;
import { notFound } from "next/navigation";
import { readStore, readState } from "@/lib/store";
import { ActionButton } from "../../actions";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const key = decodeURIComponent(id).toLowerCase();
  const [store, state] = await Promise.all([readStore(), readState()]);
  const lead = store.leads.find((l) => l.id === key);
  if (!lead) notFound();
  const followups = store.followups_due.filter((f) => f.email === key);
  const proposals = store.proposals.filter((p) => p.email === key);
  const flags = store.flags.filter((f) => f.email === key);
  const phone = lead.phone ? `(${lead.phone.slice(0, 3)}) ${lead.phone.slice(3, 6)}-${lead.phone.slice(6)}` : "";

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="brand"><Link href="/">← Command center</Link></div>
          <h1>{lead.name}</h1>
        </div>
        <div className="actions">
          <ActionButton id={lead.id} on={!!state.called[lead.id]} onLabel="Called" offLabel="Mark called" onAction="called" offAction="uncalled" />
        </div>
      </header>
      <section>
        <h2>Contact</h2>
        <div className="sub">{lead.email}</div>
        {phone && <a className="call" href={`tel:+1${lead.phone}`}>Call {phone}</a>}
        <div className="sub" style={{ marginTop: 8 }}>Source {lead.source} · came in {new Date(lead.received_at).toLocaleString()} ·
          {lead.replied_at ? ` replied in ${lead.seconds_to_reply} s (${lead.channels})` : " not replied yet"}</div>
        {state.called[lead.id] && <div className="sub">Called {new Date(state.called[lead.id]).toLocaleString()}</div>}
      </section>
      <section>
        <h2>Follow-ups due</h2>
        {followups.length === 0 && <div className="empty">None queued today.</div>}
        {followups.map((f) => <div className="body" key={f.id}><strong>{f.stage}, day {f.day}</strong>{"\n"}{f.body}</div>)}
      </section>
      <section>
        <h2>Proposals</h2>
        {proposals.length === 0 && <div className="empty">None.</div>}
        {proposals.map((p) => <div className="sub" key={p.id}>{p.address} · prepared {p.prepared} · {state.signed[p.id] ? "signed" : "waiting"}</div>)}
      </section>
      {flags.length > 0 && (
        <section>
          <h2>Flags</h2>
          {flags.map((f, i) => <div className="sub" key={i}>{f.date} {f.why}: <em>{f.quote}</em></div>)}
        </section>
      )}
    </div>
  );
}
