import { promises as fs } from "fs";
import path from "path";

// Version one reads the JSON that sync.py writes. When NEXT_PUBLIC_SUPABASE_URL is set,
// swap these two readers for Supabase queries (see ../supabase/schema.sql). Nothing else changes.

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
export type Store = {
  generated_at: string; mode: string; leads: Lead[]; followups_due: Followup[]; flags: Flag[];
  proposals: Proposal[]; overnight: Event[]; showings: Showing[];
};
export type State = { called: Record<string, string>; dropped: Record<string, string>; signed: Record<string, string> };

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
  await fs.writeFile(path.join(DATA, "state.json"), JSON.stringify(state, null, 2));
}
