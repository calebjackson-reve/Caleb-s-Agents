#!/usr/bin/env node
// Word-level transcript for one take, written next to the recording.
//
//   node scripts/transcribe.mjs public/recordings/name.mp4 [out.words.json] [--model small|base.en] [--no-gpu]
//
// Writes [{ text, startMs, endMs }]. Run it ONCE per take: whisper jitters
// between runs, and every beat anchored to a word drifts if you re-run it.
// Use scripts/retime-captions.py to fix late captions instead of re-running.
//
// Standalone punctuation tokens and sound tags like (Bell) or [Music] are
// dropped (whisper emits them as words).
// --no-gpu is only needed inside the Claude Code sandbox, which blocks Metal.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WHISPER = join(ROOT, "bin/whisper.cpp/build/bin/whisper-cli");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1] === "--model"));

const media = positional[0];
if (!media) {
  console.error("usage: node scripts/transcribe.mjs <media> [out.words.json] [--model small|base.en] [--no-gpu]");
  process.exit(1);
}
const out = positional[1] ?? join(dirname(media), basename(media).replace(/\.[^.]+$/, "") + ".words.json");
const model = join(ROOT, `bin/whisper.cpp/models/ggml-${opt("--model", "small")}.bin`);

for (const [what, p] of [["recording", media], ["whisper-cli", WHISPER], ["model", model]]) {
  if (!existsSync(p)) {
    console.error(`missing ${what}: ${p}`);
    process.exit(1);
  }
}
if (existsSync(out) && !flag("--force")) {
  console.error(`${out} already exists. Never re-transcribe an unchanged take. Pass --force if the take changed.`);
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), "transcribe-"));
const wav = join(tmp, "audio.wav");
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", media, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav], { stdio: "inherit" });

const prefix = join(tmp, "whisper");
const whisperArgs = ["-m", model, "-f", wav, "-ml", "1", "-sow", "-oj", "-of", prefix, "--no-prints"];
if (flag("--no-gpu")) whisperArgs.push("-ng");
execFileSync(WHISPER, whisperArgs, { stdio: ["ignore", "ignore", "inherit"] });

const raw = JSON.parse(readFileSync(prefix + ".json", "utf8")).transcription ?? [];
const words = raw
  .map((w) => ({ text: w.text.trim(), startMs: w.offsets.from, endMs: w.offsets.to }))
  .filter((w) => /[a-z0-9]/i.test(w.text))
  // sound tags such as (Bell), [Music], *laughs* are not speech
  .filter((w) => !/^[([*].*[)\]*]$/.test(w.text));

writeFileSync(out, JSON.stringify(words, null, 0).replace(/},{/g, "},\n{") + "\n");
const last = words[words.length - 1];
console.log(`${words.length} words, ${last ? (last.endMs / 1000).toFixed(2) : 0}s -> ${out}`);
