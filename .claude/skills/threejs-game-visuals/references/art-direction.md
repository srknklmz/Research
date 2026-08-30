# Art direction

The part that is not code. This is usually what a developer means by "I'm bad at
graphics" — not that they cannot write a shader, but that they have no basis for
choosing between two things that both work.

## Contents
- [Decide, do not survey](#decide-do-not-survey)
- [Value before color](#value-before-color)
- [Building a palette](#building-a-palette)
- [Palette discipline](#palette-discipline)
- [Warm/cool light](#warmcool-light)
- [Silhouette](#silhouette)
- [Composition](#composition)
- [Coherence checklist](#coherence-checklist)
- [Reference gathering](#reference-gathering)

## Decide, do not survey

When helping someone who is stuck on visuals, resist presenting options. "Here
are three palettes, which do you like?" hands the hard part straight back to the
person who said they find it hard.

Choose one, implement it, and say in a sentence why it fits their game. They can
react to something concrete far more easily than they can choose in the abstract,
and reacting is where their actual taste shows up. Be explicit that it is a
starting point and easy to change — that removes the pressure that makes people
freeze.

## Value before color

Value means lightness, independent of hue. It is the thing the eye reads first
and the thing that determines whether an image is legible.

The practical test: convert a screenshot to greyscale. If the player character
disappears into the background, no palette will save it — the values are too
close. Games that read instantly in motion have strong value separation between
foreground, midground, and background.

```js
// Quick in-engine check: temporarily force everything through luminance.
// A ShaderPass with:  gl_FragColor = vec4(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), 1.0);
```

A reliable structure: dark foreground, mid background, and let one bright accent
mark whatever the player must look at. Or invert it — light foreground on dark
background. What matters is the *gap*, not the direction.

## Building a palette

`scripts/palette.mjs` in this skill generates a coherent set from one base hue.
The reasoning behind it:

**Start with one hue and derive the rest.** Picking five colors independently
produces five colors that share nothing. Picking one and deriving the others by
rotating hue and shifting lightness produces a family.

Three schemes that reliably work:

- **Analogous** — base hue ±30°. Calm, harmonious, natural. Good for
  atmospheric or exploration games.
- **Complementary** — base and base+180°, one dominant and one used sparingly as
  accent. High energy, strong readability. The default for action games.
- **Split-complementary** — base plus two hues either side of its complement.
  Complementary tension without the crudeness of a pure opposite pair.

**Then assign roles**, and this is the part people skip:

| Role | Share of the frame | Purpose |
|---|---|---|
| Dominant | ~60% | Environment, ground, walls |
| Secondary | ~30% | Props, structures, midground |
| Accent | ~10% | Player, enemies, pickups, UI highlights |

The accent must be the most saturated color in the scene and must not appear on
anything unimportant. That single rule does most of the work of making a game
readable: if the only saturated orange in the world is on things that matter,
players learn it in seconds without being told.

**Avoid pure hex primaries.** `0xff0000`, `0x00ff00`, `0x0000ff` do not occur in
nature or in professional art, and they are the clearest signal of programmer
art. Desaturate slightly and shift toward a neighbor: `0xd94f3d` instead of red,
`0x6aa84f` instead of green.

**Avoid pure black and pure white.** Real shadows carry the color of ambient sky
light, real highlights carry the color of the light source. `0x1a1a24`
(blue-black) and `0xfff8ea` (warm white) read as photographed; `0x000000` and
`0xffffff` read as rendered.

## Palette discipline

Define the palette once, in one module, and import it everywhere:

```js
export const PALETTE = {
  bgDeep:    0x141824,
  bgMid:     0x232b3d,
  ground:    0x3c4a5c,
  propMain:  0x5c7f9c,
  propAlt:   0xb07a4f,
  accent:    0xf2913d,
  emissive:  0x4fd6c8,
  fog:       0x232b3d,
};
```

Scenes look "like disconnected assets from different games" almost always
because colors were chosen inline, per object, over weeks. Enforcing the import
is a small mechanical habit that prevents a large, hard-to-diagnose problem.

Keep the fog color equal to the background or horizon color. Fog that differs
from what it fades into reads as grey haze hanging in the air.

## Warm/cool light

The most transferable trick in lighting: **make the key light and the fill light
different temperatures.**

Warm key (`0xfff0dd`) plus cool fill (`0x88bbff`) means the lit side and the
shadow side of an object differ in hue, not only in brightness. The eye reads
that hue shift as three-dimensional form. With a white key and white fill, the
only information available is brightness, and shapes flatten.

This works at scene scale too: warm sunlight and cool shadows, or cool moonlight
and warm windows. The contrast is the point, and its direction is a mood choice.

## Silhouette

A game character or prop should be identifiable from its filled black outline
alone. This is why stylized games exaggerate proportions — big head, big
shoulders, oversized weapon: the silhouette stays distinct at 40 px on a moving
screen.

Test it by rendering the object as a flat black shape against white. If two
enemy types have the same silhouette, players will confuse them under pressure
regardless of how different their textures are. Fixing silhouette is a modeling
change, and it is worth more than any amount of material work.

## Composition

- **Rule of thirds** for framing in fixed-camera or cutscene shots.
- **Leading lines** — roads, fences, light shafts — pointing to where the player
  should go. This is level design doing UI's job, and it is invisible when done
  well.
- **Depth in layers** — foreground silhouette, midground action, background
  atmosphere. Fog separates the layers automatically, which is why fog reads as
  "professional" beyond just hiding the far plane.
- **Negative space.** Sparse scenes with clear focus beat dense scenes with
  clutter. The instinct when a scene feels empty is to add objects; usually the
  problem is that nothing has enough contrast, and adding more makes it worse.

## Coherence checklist

Run through this when a scene feels off but nothing is obviously broken:

- Does everything come from the shared palette module?
- Is there exactly one accent color, and does it appear only on important things?
- Do key and fill differ in temperature?
- Does the greyscale version still read — is the subject separable?
- Is fog the same color as the background?
- Do the shadow direction and the visible sun position agree?
- Is the level of detail consistent — no photoscanned rock next to an
  eight-triangle tree?
- Is the texel density consistent — do textures on adjacent objects have similar
  apparent resolution?
- Does every object visibly contact the ground?

The last two are quiet killers. Mismatched detail level and mismatched texel
density both read as "asset flip", which is exactly the impression a solo
developer using free assets most needs to avoid.

## Reference gathering

Before building, collect 5–10 screenshots of games with the target look and put
them somewhere visible. Not to copy — to have something concrete to compare
against when deciding whether a scene is finished.

Sample the actual pixel colors from those references with any color picker. It is
consistently surprising how desaturated and how narrow in range the palettes of
good-looking games are compared to what people reach for from scratch.

Study the look and the underlying principles; build original assets and palettes
rather than reproducing another game's distinctive art. The principles transfer;
the specific art belongs to whoever made it.
