#!/usr/bin/env node
/**
 * palette.mjs — generate a coherent game palette from a single base hue.
 *
 * Picking five colors independently gives five colors that share nothing.
 * Picking one and deriving the rest gives a family. This does the deriving.
 *
 * Works in OKLCH rather than HSL because HSL lightness is not perceptual:
 * hsl(60, 100%, 50%) (yellow) is far brighter than hsl(240, 100%, 50%) (blue)
 * despite the identical lightness number, so HSL-derived ramps come out
 * lopsided. OKLCH lightness matches what the eye reports, which is what makes
 * "same value, different hue" actually hold.
 *
 * Usage:
 *   node palette.mjs                              # random hue, complementary
 *   node palette.mjs --hue 220                    # pick the base hue (0-360)
 *   node palette.mjs --hue 30 --scheme analogous
 *   node palette.mjs --mood night --json
 *
 *   --scheme   complementary | analogous | split | triad   (default complementary)
 *   --mood     day | dusk | night | overcast              (default dusk)
 *   --json     emit JSON instead of a JS module
 *   --no-preview  skip the terminal swatches
 */

// ---------------------------------------------------------------- color math

/** OKLCH -> linear sRGB. h in degrees, L 0..1, C 0..~0.37 */
function oklchToLinearRgb(L, C, h) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const encodeSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const inGamut = (rgb) => rgb.every((c) => c >= -0.0001 && c <= 1.0001);

/**
 * Convert OKLCH to hex, reducing chroma until the color fits in sRGB.
 * Clipping channels instead would shift the hue, which is exactly the kind of
 * quiet inconsistency that makes a derived palette stop looking derived.
 */
function oklchToHex(L, C, h) {
  let c = C;
  let rgb = oklchToLinearRgb(L, c, h);
  while (!inGamut(rgb) && c > 0) {
    c -= 0.005;
    rgb = oklchToLinearRgb(L, c, h);
  }
  const [r, g, b] = rgb.map((v) => Math.round(Math.min(1, Math.max(0, encodeSrgb(v))) * 255));
  return (r << 16) | (g << 8) | b;
}

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const hexJs = (n) => '0x' + n.toString(16).padStart(6, '0');
const rgbOf = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

// ---------------------------------------------------------------- schemes

const SCHEMES = {
  complementary: (h) => ({ base: h, secondary: h + 25, accent: h + 180 }),
  analogous:     (h) => ({ base: h, secondary: h + 32, accent: h - 38 }),
  split:         (h) => ({ base: h, secondary: h + 20, accent: h + 150 }),
  triad:         (h) => ({ base: h, secondary: h + 120, accent: h + 240 }),
};

/**
 * Mood sets the lightness and chroma envelope. This is where "same palette,
 * different time of day" comes from — the hues stay put, the L/C ramp moves.
 */
const MOODS = {
  day:      { bgL: 0.86, midL: 0.72, groundL: 0.62, propL: 0.66, accentL: 0.68, chroma: 0.09, accentC: 0.17 },
  dusk:     { bgL: 0.28, midL: 0.38, groundL: 0.45, propL: 0.58, accentL: 0.70, chroma: 0.07, accentC: 0.16 },
  night:    { bgL: 0.21, midL: 0.24, groundL: 0.30, propL: 0.42, accentL: 0.72, chroma: 0.06, accentC: 0.18 },
  overcast: { bgL: 0.70, midL: 0.60, groundL: 0.52, propL: 0.58, accentL: 0.60, chroma: 0.04, accentC: 0.11 },
};

function buildPalette(hue, schemeName, moodName) {
  const s = SCHEMES[schemeName](hue);
  const m = MOODS[moodName];
  const wrap = (x) => ((x % 360) + 360) % 360;

  return {
    // Background layers — the 60% of the frame. Low chroma so they recede.
    bgDeep:   oklchToHex(m.bgL * 0.75, m.chroma * 0.7, wrap(s.base)),
    bgMid:    oklchToHex(m.midL, m.chroma * 0.8, wrap(s.base + 8)),

    // Ground and structures — the 30%.
    ground:   oklchToHex(m.groundL, m.chroma, wrap(s.base + 15)),
    propMain: oklchToHex(m.propL, m.chroma * 1.1, wrap(s.base + 5)),
    propAlt:  oklchToHex(m.propL * 1.05, m.chroma * 1.3, wrap(s.secondary)),

    // The 10%. Highest chroma in the palette, reserved for what matters.
    accent:   oklchToHex(m.accentL, m.accentC, wrap(s.accent)),
    emissive: oklchToHex(Math.min(0.85, m.accentL + 0.12), m.accentC * 1.15, wrap(s.accent + 12)),

    // Fog must equal the background it fades into, or it reads as grey haze.
    fog:      oklchToHex(m.midL, m.chroma * 0.8, wrap(s.base + 8)),

    // Lights: warm key, cool fill. The temperature split is what makes form read.
    keyLight:  oklchToHex(0.94, 0.035, 75),
    fillLight: oklchToHex(0.80, 0.055, 250),
  };
}

// ---------------------------------------------------------------- output

function preview(pal) {
  const pad = Math.max(...Object.keys(pal).map((k) => k.length));
  const lines = Object.entries(pal).map(([name, v]) => {
    const [r, g, b] = rgbOf(v);
    const swatch = `\x1b[48;2;${r};${g};${b}m      \x1b[0m`;
    return `  ${swatch}  ${name.padEnd(pad)}  ${hex(v)}`;
  });
  return lines.join('\n');
}

function asModule(pal, meta) {
  const pad = Math.max(...Object.keys(pal).map((k) => k.length));
  const body = Object.entries(pal)
    .map(([k, v]) => `  ${(k + ':').padEnd(pad + 1)} ${hexJs(v)},   // ${hex(v)}`)
    .join('\n');

  return `// Generated by palette.mjs — hue ${meta.hue}, ${meta.scheme}, ${meta.mood}.
// Import this everywhere instead of writing colors inline. Scenes look like
// disconnected assets because colors get chosen per object over weeks; one
// shared module is the mechanical fix for that.
//
// Role budget: background ~60% of frame, props ~30%, accent ~10%.
// Keep 'accent' off anything unimportant — if the only saturated color in the
// world is on things that matter, players learn it without being told.

export const PALETTE = {
${body}
};
`;
}

// ---------------------------------------------------------------- cli

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);

const hue = Number(flag('hue', Math.floor(Math.random() * 360)));
const scheme = flag('scheme', 'complementary');
const mood = flag('mood', 'dusk');

if (!SCHEMES[scheme]) {
  console.error(`Unknown scheme "${scheme}". Options: ${Object.keys(SCHEMES).join(', ')}`);
  process.exit(1);
}
if (!MOODS[mood]) {
  console.error(`Unknown mood "${mood}". Options: ${Object.keys(MOODS).join(', ')}`);
  process.exit(1);
}
if (!Number.isFinite(hue)) {
  console.error('--hue must be a number in 0-360.');
  process.exit(1);
}

const palette = buildPalette(hue, scheme, mood);

if (has('json')) {
  console.log(JSON.stringify({ hue, scheme, mood, palette: Object.fromEntries(
    Object.entries(palette).map(([k, v]) => [k, hex(v)])
  ) }, null, 2));
} else {
  if (!has('no-preview') && process.stdout.isTTY !== false) {
    console.error(`\n  hue ${hue}  ·  ${scheme}  ·  ${mood}\n`);
    console.error(preview(palette));
    console.error('');
  }
  console.log(asModule(palette, { hue, scheme, mood }));
}
