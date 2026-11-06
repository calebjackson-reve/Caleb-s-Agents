// Theme code for brand/BRAND.md. Change the sheet first, then this file.
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadInstrumentSans } from "@remotion/google-fonts/InstrumentSans";
import { continueRender, delayRender, staticFile } from "remotion";

// 1-2. Ground and colour roles
export const INK = "#14100E";
export const IVORY = "#FBF8F3";
export const BLUSH = "#FBEFE9";
export const EMBER = "#E87757"; // once per graphic
export const STONE = "#8D8578";
export const INK_50 = "rgba(20,16,14,0.5)";
export const IVORY_50 = "rgba(251,248,243,0.5)";
export const HAIRLINE_ON_IVORY = "rgba(20,16,14,0.12)";
export const HAIRLINE_ON_INK = "rgba(251,248,243,0.2)";

// 3. Type
const serif = loadInstrumentSerif("normal", { weights: ["400"] });
const serifItalic = loadInstrumentSerif("italic", { weights: ["400"] });
const sans = loadInstrumentSans("normal", { weights: ["400", "600", "700"] });
export const SERIF = serif.fontFamily;
void serifItalic;

// Hauora is self-hosted from public/fonts (SIL OFL). If the files are missing,
// Instrument Sans stands in through the fallback chain.
export const HAUORA_FILES: [string, number][] = [
  ["Hauora-Regular.woff2", 400],
  ["Hauora-SemiBold.woff2", 600],
  ["Hauora-Bold.woff2", 700],
];
export const SANS = `Hauora, ${sans.fontFamily}, sans-serif`;

let hauoraLoaded: boolean | null = null;
if (typeof document !== "undefined" && typeof FontFace !== "undefined") {
  const handle = delayRender("Loading Hauora");
  Promise.all(
    HAUORA_FILES.map(([file, weight]) => {
      const face = new FontFace("Hauora", `url(${staticFile(`fonts/${file}`)}) format("woff2")`, { weight: String(weight) });
      return face.load().then((f) => document.fonts.add(f));
    }),
  )
    .then(() => (hauoraLoaded = true))
    .catch(() => (hauoraLoaded = false))
    .finally(() => continueRender(handle));
}
/** true once Hauora loaded, false if it fell back to Instrument Sans. */
export const hauoraStatus = () => hauoraLoaded;

// 6. Motion: the site's easing and durations at 30fps
export const EASE_HOUSE = [0.7, 0, 0.3, 1] as const;
export const EASE_REVEAL = [0.16, 1, 0.3, 1] as const;
export const DUR = { small: 12, move: 24, reveal: 30, drift: 120, stagger: 1 } as const;

// 4. Captions
export const CAPTION = { size: 78, letterSpacing: -2, stroke: 10, weight: 700, lightAbove: 140 } as const;

// 5. Hook
export const HOOK = { size: 78, weight: 600, lineH: 105, padX: 22, radius: 12, maxLineW: 880 } as const;

// Instagram 4:5 grid safe band on the 1080x1920 frame
export const SAFE = { top: 285, bottom: 1635 } as const;
