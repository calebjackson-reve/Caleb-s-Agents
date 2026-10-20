import { promises as fs } from "fs";
import path from "path";

// Version one reads the JSON that sync.py writes. The CRM sections come from aire/crm/feed.json
// (the AIRE CRM Google Sheet, written by crm.py feed). One database, no second copy.

const DATA = path.resolve(process.cwd(), "..", "data");

export type Lead = {
  id: string; name: string; email: string; phone: string; source: string;
  received_at: string; replied_at: string | null; seconds_to_reply: number | null;
  channels: string; mode: "live" | "dry"; listing_id: string | null;
};
export type Followup = {
  id: string; name: string; email: string; stage: string; day: number; template: number;
  subject: string; body: string; queue_file: string;
};
export type Flag = { date: string; name: string; email: string; why: string; quote: string };
export type Proposal = {
  id: string; client: string; address: string; email: string; prepared: string; signed: boolean;
  link: string | null; file: string; price_range: string; next_step: string; needs_review: boolean;
  listing_id: string | null;
};
export type Event = { tool: string; at: string; level: "ok" | "error"; message: string };
export type Showing = { status: string; property: string; when: string; listing_id: string | null; at: string; error?: string };
export type Touch = { name: string; tier: string; phone: string; email: string; days: number | null; next_action: string; stage: string; person_id?: string };
export type Task = { id: string; due: string; contact: string; task: string; status: string; source: string; created_at: string; done_at: string; overdue: boolean };
export type Deal = { id: string; client: string; side: string; address: string; stage: string; price: string; commission_pct: string;
  expected_close: string; source: string; last_touch: string; next_step: string; contact: string; listing_id: string; updated_at: string };
export type Store = {
  generated_at: string; mode: string; leads: Lead[]; followups_due: Followup[]; flags: Flag[];
  proposals: Proposal[]; overnight: Event[]; showings: Showing[];
  crm_pulled_at?: string | null; crm_error?: string; touches_due?: Touch[]; tasks?: Task[]; pipeline?: Deal[];
};
export type State = { called: Record<string, string>; dropped: Record<string, string>; signed: Record<string, string>; done?: Record<string, string>; touched?: Record<string, string> };

const EMPTY: Store = { generated_at: "", mode: "empty", leads: [], followups_due: [], flags: [], proposals: [], overnight: [], showings: [] };

export async function readStore(): Promise<Store> {
  try { return JSON.parse(await fs.readFile(path.join(DATA, "store.json"), "utf8")); }
  catch { return EMPTY; }
}

export async function readState(): Promise<State> {
  try { return JSON.parse(await fs.readFile(path.join(DATA, "state.json"), "utf8")); }
  catch { return { called: {}, dropped: {}, signed: {} }; }
}

export async function writeState(state: State): Promise<void> {
  await fs.mkdir(DATA, { recursive: true });
  // Write then rename so two clicks landing together never leave a half-written file.
  const tmp = path.join(DATA, `state.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, path.join(DATA, "state.json"));
}
