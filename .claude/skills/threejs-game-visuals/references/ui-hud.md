# HUD, menus, and game feel

The 2D layer, and the motion layer that makes a game feel responsive rather than
correct-but-dead.

## Contents
- [Render the HUD in DOM](#render-the-hud-in-dom)
- [HUD layout](#hud-layout)
- [World-anchored labels](#world-anchored-labels)
- [Health, ammo, and meters](#health-ammo-and-meters)
- [Menus](#menus)
- [Typography](#typography)
- [Juice](#juice)
- [Damage and impact feedback](#damage-and-impact-feedback)
- [Particles](#particles)
- [Accessibility](#accessibility)

## Render the HUD in DOM

The instinct is to draw the HUD with three. Resist it. HTML and CSS over the
canvas is better on almost every axis: text renders crisply at any DPI without
texture atlases, layout is free, transitions and animations are one CSS line,
accessibility works, and it costs no draw calls.

```html
<canvas id="game"></canvas>
<div id="hud"></div>
```

```css
#game { position: fixed; inset: 0; }
#hud {
  position: fixed; inset: 0;
  pointer-events: none;              /* clicks pass through to the canvas */
  font-family: system-ui, sans-serif;
  user-select: none;
}
#hud button, #hud .interactive { pointer-events: auto; }   /* re-enable per element */
```

`pointer-events: none` on the container with `auto` on interactive children is
the pattern that makes this work — without it the HUD swallows every mouse event
and the game stops responding to clicks.

Use three-rendered UI only when the UI must exist in 3D space: a screen on a
control panel, a diegetic interface, VR.

## HUD layout

Anchor to corners and edges, never to the center, and respect safe areas:

```css
#hud { padding: max(1.5rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right)); }
.hud-tl { position: absolute; top: 1.5rem; left: 1.5rem; }
.hud-br { position: absolute; bottom: 1.5rem; right: 1.5rem; }
```

Conventions players already know, and breaking them costs comprehension for no
gain:

- Top-left: health, player status
- Top-right: score, currency, objectives
- Bottom-left: abilities, cooldowns
- Bottom-right: minimap, ammo
- Center: crosshair only — keep it otherwise clear, it is where the game is

Keep the HUD sparse. Every permanent element competes with the game for
attention. Elements that matter only sometimes — damage direction, pickup
prompts — should appear on demand and fade out.

## World-anchored labels

For nameplates, damage numbers, and interaction prompts, project the world
position to screen space and move a DOM element:

```js
const v = new THREE.Vector3();
function updateLabel(el, object3D) {
  v.setFromMatrixPosition(object3D.matrixWorld).project(camera);
  const behind = v.z > 1;
  el.style.display = behind ? 'none' : 'block';
  if (behind) return;
  el.style.transform =
    `translate(-50%,-50%) translate(${(v.x * 0.5 + 0.5) * innerWidth}px, ${(-v.y * 0.5 + 0.5) * innerHeight}px)`;
}
```

The `v.z > 1` check matters: without it, objects behind the camera project to
mirrored on-screen coordinates and labels appear for things the player cannot
see. Use `translate` rather than `left`/`top` so the browser can composite on the
GPU instead of re-laying out every frame.

`CSS2DRenderer` from `three/addons/renderers/` does this for you and handles the
scene graph, at the cost of less control. Fine for a handful of labels.

## Health, ammo, and meters

A bar that just changes width reads as data. A bar with a delayed "chip" layer
behind it reads as damage:

```css
.bar { position: relative; width: 200px; height: 14px; background: #2a2f3d; border-radius: 7px; }
.bar .chip { position: absolute; inset: 0; background: #d94f3d; border-radius: 7px;
             transform-origin: left; transition: transform 0.5s ease-out 0.25s; }
.bar .fill { position: absolute; inset: 0; background: #4fd6c8; border-radius: 7px;
             transform-origin: left; transition: transform 0.08s ease-out; }
```

The fill snaps immediately; the chip layer follows a quarter-second later. The
gap between them is a visible record of how much damage just landed, which is
information the player gets for free from the animation. This trick, borrowed
from fighting games, is one of the highest value-per-line UI details available.

Animate `transform: scaleX()` rather than `width` — width triggers layout every
frame, transform does not.

## Menus

A title screen carries a disproportionate share of first impressions, and it is
cheap to make good because it is static:

- Render the actual game scene behind it, slowly rotating, with DOF and heavier
  bloom. It costs nothing extra and immediately signals "real game".
- Blur the backdrop with `backdrop-filter: blur(8px)` behind menu panels.
- One accent color from the palette on the primary action, neutral for the rest.
- Animate entry — panels fading and sliding up 12 px over ~200 ms with a small
  stagger between items. Instant appearance feels unfinished; anything over
  400 ms feels slow.

```css
@keyframes rise { from { opacity: 0; transform: translateY(12px); } }
.menu-item { animation: rise 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) backwards; }
.menu-item:nth-child(2) { animation-delay: 0.05s; }
.menu-item:nth-child(3) { animation-delay: 0.10s; }
```

## Typography

Font choice signals genre before a word is read. Two rules cover most cases: pick
one display font for titles and one legible font for everything else, and never
use a decorative font for numbers the player must read under pressure.

Set `font-variant-numeric: tabular-nums` on scores, timers, and ammo counters.
Without it, digits have different widths and the counter jitters horizontally as
it counts — visible, distracting, and trivially avoidable.

Text over a 3D scene needs separation from arbitrary backgrounds:
`text-shadow: 0 2px 8px rgba(0,0,0,0.8)` or a semi-transparent backing panel.
White text on a bright sky is unreadable, and the sky is not under your control.

## Juice

"Juice" is the layer of non-essential feedback that makes a game feel alive. It
is usually the difference between a prototype that feels dead and one that feels
good, and it is almost entirely independent of art quality — which makes it the
highest-leverage area for someone who finds visuals hard.

**Easing.** Nothing in a good-feeling game moves linearly. Ease-out for things
arriving, ease-in for things leaving, and a slight overshoot for anything that
should feel snappy:

```js
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack  = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
```

**Anticipation and follow-through.** A jump that squashes slightly before
launching and stretches at the apex reads as physical. Two extra lines of scale
animation do more for feel than a better character model.

**Screen shake**, scaled to the event and decaying fast:

```js
let shake = 0;
function addShake(amount) { shake = Math.min(shake + amount, 1); }
function updateShake(dt) {
  shake *= Math.pow(0.001, dt);                  // frame-rate independent decay
  camera.position.x += (Math.random() - 0.5) * shake * 0.5;
  camera.position.y += (Math.random() - 0.5) * shake * 0.5;
}
```

Keep it short — under 200 ms for a hit. Long shake reads as a bug and makes
people motion sick.

**Hitstop.** Freezing the simulation for 40–80 ms on a heavy impact makes hits
feel weighty. It is the single most effective combat-feel technique and costs
one timer.

**Time to respond.** Every player input should produce a visible reaction within
one frame, even if the real effect takes longer. A button that dims on press
before the action resolves feels responsive; the same button with no press state
feels broken regardless of actual latency.

## Damage and impact feedback

Layer several cheap signals rather than relying on one expensive one:

1. **Hit flash** — set the material emissive to white for ~60 ms.
2. **Knockback** — displace the target a few centimetres and ease back.
3. **Particles** — a short burst at the contact point.
4. **Damage number** — a DOM element rising and fading over ~600 ms.
5. **Hitstop** on heavy hits only, or it becomes sludgy.
6. **Screen shake** scaled to damage.
7. **Sound**, which does more than any of the visuals — a hit with a good sound
   and no visual feedback beats the reverse.

```js
function flash(mesh, ms = 60) {
  const m = mesh.material;
  const prev = m.emissive.getHex();
  m.emissive.setHex(0xffffff);
  setTimeout(() => m.emissive.setHex(prev), ms);
}
```

## Particles

For most games, `Points` with a soft circular texture and additive blending is
enough, and far cheaper than a particle library:

```js
const mat = new THREE.PointsMaterial({
  size: 0.15,
  map: sparkTexture,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,          // critical: additive particles must not write depth
  sizeAttenuation: true,
});
```

`depthWrite: false` on additive particles is not optional — with it on, particles
occlude each other and the effect turns into visible dark squares.

Recycle from a fixed pool rather than allocating per emission. Creating geometry
in the hot loop is a reliable way to cause garbage-collection stutter that looks
like a rendering problem.

## Accessibility

Cheap to include from the start, expensive to retrofit:

- Never encode critical information in color alone — add a shape or icon.
  Roughly 8% of men have some color vision deficiency.
- Respect `prefers-reduced-motion`: disable screen shake, camera bob, and
  parallax. Motion sensitivity is common and vestibular symptoms are real.
- Keep HUD text at 16 px equivalent or larger, and offer a scale setting.
- Maintain contrast against the busiest possible background, not the one in the
  screenshot.

```css
@media (prefers-reduced-motion: reduce) {
  .menu-item { animation: none; }
}
```
