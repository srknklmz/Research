# Post-processing

Post amplifies what is already there. Applied to a well-lit scene it is the
final 20% that makes an image feel like a game; applied to a badly lit scene it
produces a badly lit scene that is also blurry and slow. Get `render-setup.md`
right first.

## Contents
- [Which library](#which-library)
- [Pass order](#pass-order)
- [Antialiasing after post](#antialiasing-after-post)
- [Bloom](#bloom)
- [Ambient occlusion](#ambient-occlusion)
- [Depth of field](#depth-of-field)
- [Color grading](#color-grading)
- [Vignette and grain](#vignette-and-grain)
- [Outlines](#outlines)
- [Pixelation](#pixelation)
- [Budget](#budget)

## Which library

**`three/addons/postprocessing/`** ships with three. No extra dependency, every
pass is its own fullscreen render target.

**`postprocessing` (pmndrs)** merges compatible effects into a single fragment
shader, so bloom + vignette + grade costs roughly one pass instead of three. It
is meaningfully faster for a stack of three or more effects and has better
implementations of bloom and SMAA.

Rule of thumb: one or two effects, use the built-ins. Three or more, or shipping
to mobile, install `postprocessing`. Do not mix the two libraries in one chain.

## Pass order

Order is not cosmetic — each pass consumes the previous one's output, and
several passes need scene depth that later passes have destroyed.

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));   // 1. scene
composer.addPass(gtaoPass);                        // 2. depth-based effects
composer.addPass(bokehPass);                       //    (AO, DOF, SSR, fog)
composer.addPass(bloomPass);                       // 3. light-based, HDR
composer.addPass(new OutputPass());                // 4. tone map + color space
composer.addPass(new SMAAPass());                  // 5. AA, on final sRGB image
```

The two rules that matter:

1. **Depth-consuming passes go early**, before anything that changes color in a
   way unrelated to geometry. Once bloom has smeared light across the frame, the
   depth buffer no longer corresponds to what you see.
2. **`OutputPass` goes after HDR work and before AA.** It performs tone mapping
   and the sRGB conversion. Bloom must operate on pre-tone-mapped HDR values or
   it has no bright values left to bloom; antialiasing must operate on
   post-conversion sRGB values or it blends in the wrong space and leaves dark
   fringes on edges.

Forgetting `OutputPass` entirely is the usual cause of "my scene got washed out
and grey the moment I added the composer" — the renderer's own tone mapping is
bypassed when rendering through a composer, and nothing replaces it.

## Antialiasing after post

`WebGLRenderer({ antialias: true })` uses MSAA on the default framebuffer.
`EffectComposer` renders into its own render targets, which do not get MSAA — so
the moment post-processing is added, edges become jagged even though nothing
about the AA setting changed. This surprises everyone once.

Fixes, cheapest first:

- `SMAAPass` — good quality, moderate cost, the usual answer
- `FXAAPass` — cheapest, blurs texture detail slightly
- Multisampled render targets: `composer.renderTarget1.samples = 4` (WebGL2),
  real MSAA through the composer, best quality, highest cost
- `TAARenderPass` — excellent for static shots, ghosts on motion

Whichever you use, it goes **after** `OutputPass`.

## Bloom

```js
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.4,   // strength — 0.3–0.6 is tasteful; 1.0+ is a dream sequence
  0.4,   // radius
  0.85   // threshold — only pixels brighter than this bloom
);
```

Threshold is the control that decides whether bloom looks intentional. Set it too
low and the entire image glows, contrast dies, and everything reads as foggy. Set
it around `0.85` and only genuine light sources bloom, which is what sells
emissive material as *emitting*.

Bloom pairs with emissive materials — that is its real job in a game:

```js
new THREE.MeshStandardMaterial({
  color: 0x111111,
  emissive: 0x00ffcc,
  emissiveIntensity: 2.0,   // above 1.0 to push past the bloom threshold
});
```

Neon, screens, magic effects, engine glow, pickups. If a game has a
sci-fi or fantasy element, this pairing does more for its identity than almost
anything else available.

### Selective bloom

Making only *some* objects bloom is a common need and awkward with
`UnrealBloomPass` — the standard approach is rendering a second pass with
non-bloom objects swapped to black material, then additively combining. The
`postprocessing` library's `SelectiveBloomEffect` handles this properly and is
the better answer if selective bloom matters to the design.

## Ambient occlusion

AO darkens crevices and contact points. It is what stops objects looking pasted
on top of the ground rather than resting on it.

```js
const gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
gtao.output = GTAOPass.OUTPUT.Default;
```

`GTAOPass` supersedes `SSAOPass` and `SAOPass` — better quality, fewer halo
artifacts. Use it unless targeting old hardware.

AO is expensive and the effect is subtle by nature. If frame budget is tight,
half-resolution AO is almost indistinguishable at full cost savings, and for
stylized games baked or faked contact shadows (see `render-setup.md`) often read
better than any screen-space AO.

## Depth of field

```js
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
const bokeh = new BokehPass(scene, camera, { focus: 10.0, aperture: 0.0002, maxblur: 0.01 });
```

DOF signals "cinematic" instantly and hurts gameplay just as instantly — a blurry
background hides enemies and readability is worth more than mood in an action
game. Use it for menus, cutscenes, photo modes, and slow exploration; be
skeptical of it during combat.

`aperture` is very sensitive; `0.0001`–`0.0005` is the whole useful range.

## Color grading

Grading is the strongest identity lever in the whole post stack — it is why two
games with identical assets can feel like different worlds.

A LUT is the professional route:

```js
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';

new LUTCubeLoader().load('/luts/warm-teal.cube', ({ texture3D }) => {
  composer.addPass(Object.assign(new LUTPass(), { lut: texture3D, intensity: 0.8 }));
});
```

Free `.cube` LUTs are widely available, and one can be authored in any photo
editor by grading a neutral LUT image.

A cheap hand-rolled alternative that covers most of the benefit — lift/gamma/gain
plus saturation in a small `ShaderPass`:

```glsl
vec3 c = texture2D(tDiffuse, vUv).rgb;
c = pow(c, vec3(1.0 / gamma));
c = c * gain + lift;
float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
c = mix(vec3(l), c, saturation);
```

The classic game grade is warm highlights, cool shadows — push `gain` slightly
toward orange and `lift` slightly toward blue. It is a cliché because it works:
it mimics sunlight plus sky bounce, so the eye accepts it as real light.

## Vignette and grain

Both are cheap and both are easy to overdo.

Vignette darkens the frame edges and pulls the eye to the center. Keep it subtle
enough that a player would not notice it if asked — around 10–20% darkening at
the corners. A visible vignette reads as a filter, not as photography.

Film grain breaks up banding in gradients and dark areas, which is genuinely
useful in foggy or night scenes where 8-bit output shows stair-stepping. Animate
the noise offset per frame; static grain looks like a dirty screen.

## Outlines

Two approaches, and they solve different problems:

- **`OutlinePass`** — screen-space, selective, glows. Made for interaction
  highlighting: the object under the cursor, the interactable, the selected
  unit. Cost scales with the number of selected objects, so it is not a whole-
  scene style.
- **Inverted hull** — duplicate the mesh, scale slightly, `side: THREE.BackSide`,
  unlit dark material. Costs one extra draw call per object, works per-object,
  and is the standard way to get a consistent cel-shaded outline on everything.
  See `styles.md`.

## Pixelation

`RenderPixelatedPass` gives a crisp pixel-art look with correct pixel snapping,
which hand-rolled downscaling usually gets wrong:

```js
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js';
composer.addPass(new RenderPixelatedPass(4, scene, camera));  // 4 = pixel size
```

Combine with `NearestFilter` on all textures and a restricted palette — see the
retro section of `styles.md`.

## Budget

Rough costs at 1080p on mid-range hardware, as a share of a 16.7 ms frame:

| Pass | Cost |
|---|---|
| `RenderPass` | baseline |
| `SMAAPass` | ~0.5 ms |
| `FXAAPass` | ~0.2 ms |
| `UnrealBloomPass` | ~1.5–3 ms |
| `GTAOPass` | ~2–4 ms |
| `BokehPass` | ~1–2 ms |
| `LUTPass` | ~0.3 ms |
| `OutputPass` | ~0.2 ms |

Two useful habits: render post at a lower resolution than the scene
(`composer.setSize(w * 0.75, h * 0.75)` is often invisible), and expose a quality
setting that drops AO and DOF first — they are the expensive pair and the least
missed.

Measure with `renderer.info` and the browser's frame profiler rather than
guessing. Post-processing cost is resolution-bound, so it looks fine on a
development laptop and falls apart on a 4K monitor.
