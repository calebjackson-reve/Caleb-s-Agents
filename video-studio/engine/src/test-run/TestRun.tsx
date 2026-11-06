import React, { useEffect, useState } from "react";
import { AbsoluteFill, CalculateMetadataFunction, OffthreadVideo, Sequence, continueRender, delayRender, staticFile } from "remotion";
import { HOOK, SANS } from "../brand/theme";
import { Caption } from "../shared/Caption";
import { TextHook } from "../shared/TextHook";

// PHASE-0 step 6: the proof render. The take with brand captions and the
// default text hook. Every number here is measured per take and passed in
// as props (see out/test/props.json), never reused from another video.

export type Word = { text: string; startMs: number; endMs: number };
export type TestRunProps = {
  video: string; // path under public/, the transcoded mp4
  words: Word[];
  frames: number; // measured frame count of the mp4
  captionY: number; // caption baseline, measured off the grid frames
  hookTop: number; // hook top, above the head, inside the safe band
  hookLines: string[];
  hookFrames: number; // how long the hook stays up
};

const FPS = 30;
// Casual lowercase, except "I" and proper nouns. Add names here, never inline.
const KEEP: Record<string, string> = {
  i: "I", "i'm": "I'm", "i'll": "I'll", "i've": "I've", "i'd": "I'd", ai: "AI",
  caleb: "Caleb", jackson: "Jackson", keller: "Keller", williams: "Williams", realtor: "REALTOR",
  louisiana: "Louisiana", baton: "Baton", rouge: "Rouge", st: "St", "st.": "St.", francisville: "Francisville",
  zachary: "Zachary", new: "new", roads: "roads", feliciana: "Feliciana", felicianas: "Felicianas", prairieville: "Prairieville",
};
const casual = (t: string) => {
  const core = t.replace(/[,?!;:]+$/, "").replace(/\.$/, (m) => (/^st\.$/i.test(t) ? m : ""));
  return KEEP[core.toLowerCase()] ?? core.toLowerCase();
};

// A period after these is not a sentence end ("St. Francisville").
const ABBREV = /^(st|mr|mrs|ms|dr|jr|sr|mt|ft)\.$/i;

/** 1 to 3 words, at most about 17 characters, breaking after punctuation.
    Each chunk holds until the next one starts, so nothing flickers. */
export const chunk = (words: Word[]) => {
  const out: { text: string; from: number; to: number }[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({ text: cur.map((w) => casual(w.text)).join(" "), from: Math.round((cur[0].startMs / 1000) * FPS), to: Math.round((cur[cur.length - 1].endMs / 1000) * FPS) });
    cur = [];
  };
  for (const w of words) {
    const next = [...cur, w].map((x) => casual(x.text)).join(" ");
    if (cur.length && (cur.length >= 3 || next.length > 17)) flush();
    cur.push(w);
    if (/[,.?!;:]$/.test(w.text) && !ABBREV.test(w.text)) flush();
  }
  flush();
  for (let i = 0; i < out.length - 1; i++) out[i].to = Math.max(out[i].from + 1, out[i + 1].from);
  return out;
};

const useHookWidths = (lines: string[]) => {
  const [widths, setWidths] = useState<number[] | null>(null);
  const [handle] = useState(() => delayRender("Measuring hook lines"));
  useEffect(() => {
    document.fonts.ready.then(() => {
      const ctx = document.createElement("canvas").getContext("2d")!;
      ctx.font = `${HOOK.weight} ${HOOK.size}px ${SANS}`;
      (ctx as unknown as { letterSpacing: string }).letterSpacing = "-1px";
      setWidths(lines.map((l) => Math.ceil(ctx.measureText(l).width) + 2 * HOOK.padX));
      continueRender(handle);
    });
  }, [handle, lines]);
  return widths;
};

export const TestRun: React.FC<TestRunProps> = ({ video, words, captionY, hookTop, hookLines, hookFrames }) => {
  const widths = useHookWidths(hookLines);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <OffthreadVideo src={staticFile(video)} />
      <Sequence durationInFrames={hookFrames} layout="none">
        {widths ? <TextHook lines={hookLines} widths={widths} top={hookTop} variant="ink" /> : null}
      </Sequence>
      {chunk(words).map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={c.to - c.from} layout="none">
          <Caption words={c.text.split(" ").map((t) => ({ text: t }))} y={captionY} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const testRunMetadata: CalculateMetadataFunction<TestRunProps> = ({ props }) => ({ durationInFrames: Math.max(1, props.frames) });

export const TEST_DEFAULTS: TestRunProps = {
  video: "recordings/test.mp4",
  words: [],
  frames: 600,
  captionY: 1300,
  hookTop: 360,
  hookLines: ["Testing the engine", "first run"],
  hookFrames: 90,
};
