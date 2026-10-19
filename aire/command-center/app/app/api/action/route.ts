import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { promises as fs } from "fs";
import { readState, writeState } from "@/lib/store";

// The only writes the page can make. Everything else is read-only.
// "approve" runs the existing follow-up tool, which keeps its own rules (templates only,
// quiet hours, opt-out flags). It runs in dry run unless APPROVE_LIVE=true is set on the server.

type Body = { action: "called" | "uncalled" | "drop" | "undrop" | "signed" | "unsigned" | "approve" | "task-done" | "task-undone" | "touched" | "untouched"; id?: string; queue_file?: string; dropped?: string[]; note?: string };

function runCrm(args: string[]): Promise<string> {
  const dir = path.resolve(process.cwd(), "..", "..", "crm");
  return new Promise((resolve) => {
    const p = spawn("python3", ["crm.py", ...args], { cwd: dir, env: process.env });
    let buf = "";
    p.stdout.on("data", (d) => (buf += d.toString()));
    p.stderr.on("data", (d) => (buf += d.toString()));
    p.on("close", () => resolve(buf));
    p.on("error", (e) => resolve(`could not run crm.py: ${e.message}`));
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const state = await readState();
  const now = new Date().toISOString();
  const id = (body.id || "").toLowerCase();

  switch (body.action) {
    case "called": state.called[id] = now; break;
    case "uncalled": delete state.called[id]; break;
    case "drop": state.dropped[id] = now; break;
    case "undrop": delete state.dropped[id]; break;
    case "signed": state.signed[id] = now; break;
    case "unsigned": delete state.signed[id]; break;
    case "task-done": {
      // Source of truth is the CRM sheet. crm.py done writes it; state remembers the click so the page updates at once.
      const tid = (body.id || "").replace(/[^a-z0-9]/g, "");
      const out = await runCrm(["done", tid]);
      const fresh = await readState(); // re-read: another click may have landed while crm.py ran
      fresh.done = fresh.done || {}; fresh.done[tid] = now;
      await writeState(fresh);
      return NextResponse.json({ ok: true, output: out.slice(-500) });
    }
    case "task-undone": state.done = state.done || {}; delete state.done[(body.id || "").replace(/[^a-z0-9]/g, "")]; break;
    case "touched": {
      // Logs a touch on the CRM (Activity row + last touch) for the contact named by id.
      const who = (body.id || "").replace(/[^A-Za-z0-9 .'&-]/g, "").slice(0, 80);
      const out = await runCrm(["log", who, body.note || "touched from the command center", "--type", "call"]);
      const fresh = await readState();
      fresh.touched = fresh.touched || {}; fresh.touched[who.toLowerCase()] = now;
      await writeState(fresh);
      return NextResponse.json({ ok: true, output: out.slice(-500) });
    }
    case "untouched": state.touched = state.touched || {}; delete state.touched[(body.id || "").toLowerCase()]; break;
    case "approve": {
      const file = (body.queue_file || "").replace(/[^a-zA-Z0-9._-]/g, "");
      if (!file.startsWith("queue-")) return NextResponse.json({ ok: false, error: "bad queue file" }, { status: 400 });
      const dir = path.resolve(process.cwd(), "..", "..", "follow-up");
      const live = process.env.APPROVE_LIVE === "true";
      // Dropped rows stay out: write a filtered copy and approve that.
      const dropped = new Set([...(body.dropped || []), ...Object.keys(state.dropped)].map((x) => x.toLowerCase()));
      let approvedFile = file;
      try {
        const text = await fs.readFile(path.join(dir, file), "utf8");
        const blocks = text.split("\n---\n");
        const kept = blocks.filter((b) => {
          const m = b.match(/<([^>]+)>\s+stage/);
          return !m || !dropped.has(m[1].toLowerCase());
        });
        approvedFile = file.replace(/\.md$/, "") + "-approved.md";
        await fs.writeFile(path.join(dir, approvedFile), kept.join("\n---\n"));
      } catch (e) {
        return NextResponse.json({ ok: false, error: `queue file not readable: ${(e as Error).message}` }, { status: 400 });
      }
      const out = await new Promise<string>((resolve) => {
        const p = spawn("python3", ["followups.py", "--approve", approvedFile], {
          cwd: dir, env: { ...process.env, DRY_RUN: live ? "false" : "true" },
        });
        let buf = "";
        p.stdout.on("data", (d) => (buf += d.toString()));
        p.stderr.on("data", (d) => (buf += d.toString()));
        p.on("close", () => resolve(buf));
        p.on("error", (e) => resolve(`could not run followups.py: ${e.message}`));
      });
      await writeState(state);
      return NextResponse.json({ ok: true, live, output: out.slice(-2000) });
    }
    default: return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }
  await writeState(state);
  return NextResponse.json({ ok: true });
}
