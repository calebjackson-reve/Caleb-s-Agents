import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from "remotion";
import {
  EMBER,
  HAIRLINE_ON_INK,
  HAIRLINE_ON_IVORY,
  HOOK,
  INK,
  IVORY,
  IVORY_50,
  SAFE,
  SANS,
  SERIF,
  STONE,
  hauoraStatus,
} from "../brand/theme";
import { Caption } from "../shared/Caption";
import { TextHook } from "../shared/TextHook";

// Six still frames for Caleb to approve brand/BRAND.md (PHASE-0 step 5).
// One composition, one frame per sample, rendered with a single range render:
//   npx remotion render src/index.ts BrandSamples out/brand-samples --sequence --frames=0-5 --image-format=png
// Every sample carries a small stone label under the safe band naming what it
// is. The labels are review furniture, not part of the design.

const FOOTAGE = "#4A423C"; // flat stand-in for a dark talking-head frame
const BODY = "#2A2421";

/** 4 percent paper grain generated in code (BRAND.md 1). */
const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.04 }) => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity, mixBlendMode: "multiply" }}>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={3} seed={7} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#grain)" />
  </svg>
);

/** A neutral head-and-shoulders block so captions and hooks sit where they
    would on a take: hair top y700, eye line y880, chin y1100. */
const StandIn: React.FC = () => (
  <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
    <ellipse cx={540} cy={900} rx={190} ry={210} fill={BODY} />
    <path d="M150 1920 L190 1420 Q220 1250 540 1220 Q860 1250 890 1420 L930 1920 Z" fill={BODY} />
    <line x1={0} x2={1080} y1={SAFE.top} y2={SAFE.top} stroke={HAIRLINE_ON_INK} strokeDasharray="8 10" />
    <line x1={0} x2={1080} y1={SAFE.bottom} y2={SAFE.bottom} stroke={HAIRLINE_ON_INK} strokeDasharray="8 10" />
  </svg>
);

const Label: React.FC<{ n: number; text: string; dark: boolean }> = ({ n, text, dark }) => {
  const hauora = hauoraStatus();
  const font = hauora === false ? " · Instrument Sans standing in for Hauora" : "";
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 1790,
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 26,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: dark ? IVORY_50 : STONE,
        textAlign: "center",
        lineHeight: 1.4,
      }}
    >
      Sample {n} · {text}
      {font}
    </div>
  );
};

/** Measures each hook line's box width in the loaded font (text + 2 x padX),
    the job measure-hook.py does from a measure still. */
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

const HOOK_LINES = ["What buyers miss", "in St. Francisville"];

const S1: React.FC = () => (
  <AbsoluteFill style={{ background: FOOTAGE }}>
    <StandIn />
    <Caption words={[{ text: "come" }, { text: "see" }, { text: "this" }]} y={1150} />
    <Label n={1} text="caption, ivory fill and ink outline, on dark footage" dark />
  </AbsoluteFill>
);

const S2: React.FC = () => (
  <AbsoluteFill style={{ background: IVORY }}>
    <Grain />
    <Caption words={[{ text: "come" }, { text: "see" }, { text: "this" }]} y={1150} light />
    <Label n={2} text="caption flipped, ink fill and ivory outline, on ivory with grain" dark={false} />
  </AbsoluteFill>
);

const S3: React.FC = () => {
  const widths = useHookWidths(HOOK_LINES);
  return (
    <AbsoluteFill style={{ background: FOOTAGE }}>
      <StandIn />
      {widths ? <TextHook lines={HOOK_LINES} widths={widths} top={430} variant="ink" /> : null}
      <Label n={3} text="default text hook, two lines, above the head in the safe band" dark />
    </AbsoluteFill>
  );
};

const S4: React.FC = () => (
  <AbsoluteFill style={{ background: INK, alignItems: "center", justifyContent: "center" }}>
    <div style={{ textAlign: "center", color: IVORY, maxWidth: 860 }}>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 150, lineHeight: 1, letterSpacing: "-0.01em" }}>Quiet</div>
      <div style={{ fontFamily: SERIF, fontSize: 96, lineHeight: 1.05, letterSpacing: "0.02em", textTransform: "uppercase", marginTop: 18 }}>
        St. Francisville<span style={{ color: EMBER }}>.</span>
      </div>
    </div>
    <Label n={4} text="title pair, serif italic over uppercase, ivory on ink, ember period" dark />
  </AbsoluteFill>
);

const S5: React.FC = () => (
  <AbsoluteFill style={{ background: IVORY, alignItems: "center", justifyContent: "center" }}>
    <Grain />
    <div style={{ width: 860, padding: "72px 64px", boxShadow: `0 0 0 1px ${HAIRLINE_ON_IVORY}`, background: IVORY, position: "relative" }}>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, letterSpacing: "0.08em", textTransform: "uppercase", color: STONE }}>Sample stat</div>
      <div style={{ fontFamily: SERIF, fontSize: 200, lineHeight: 1, letterSpacing: "-0.02em", color: INK, marginTop: 28 }}>
        42<span style={{ color: EMBER }}>.</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 38, lineHeight: 1.35, color: INK, marginTop: 24 }}>Days on market, a placeholder number for the layout</div>
      <div style={{ height: 1, background: HAIRLINE_ON_IVORY, margin: "40px 0 28px" }} />
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, letterSpacing: "0.08em", textTransform: "uppercase", color: STONE }}>
        Source: placeholder, not a market stat · Nov 2026
      </div>
    </div>
    <Label n={5} text="stat tile, serif number, Hauora label, stone source and date" dark={false} />
  </AbsoluteFill>
);

const S6: React.FC = () => (
  <AbsoluteFill style={{ background: INK, alignItems: "center", justifyContent: "center" }}>
    <div style={{ textAlign: "center", color: IVORY }}>
      <div style={{ fontFamily: SERIF, fontSize: 124, lineHeight: 1, letterSpacing: "-0.01em" }}>
        Caleb Jackson<span style={{ color: EMBER }}>.</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 36 }}>
        REALTOR · Keller Williams First Choice
      </div>
      <div style={{ display: "inline-block", marginTop: 64, padding: "26px 64px", borderRadius: 100, background: INK, boxShadow: `0 0 0 1px ${IVORY}`, fontFamily: SANS, fontWeight: 600, fontSize: 36, color: IVORY }}>
        Call or text
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, letterSpacing: "0.08em", textTransform: "uppercase", color: IVORY_50, marginTop: 64 }}>
        Louisiana license 995709547
      </div>
    </div>
    <Label n={6} text="end card, last 2 seconds" dark />
  </AbsoluteFill>
);

const SAMPLES = [S1, S2, S3, S4, S5, S6];

export const BrandSamples: React.FC = () => {
  const frame = useCurrentFrame();
  const Sample = SAMPLES[Math.min(frame, SAMPLES.length - 1)];
  return <Sample />;
};
