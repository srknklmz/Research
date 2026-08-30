---
name: threejs-game-visuals
description: >
  Make three.js games and 3D scenes actually look good — render setup, lighting
  rigs, tone mapping, PBR materials, post-processing, color palettes, procedural
  and sourced 3D assets, and HUD/menu design. Use this skill whenever the user is
  building anything visual in three.js, WebGL, or React Three Fiber, and
  especially when they say their scene looks "flat", "amateur", "plasticky",
  "washed out", "grey", "like a tech demo", or ask how to make it look "more like
  a real game". Also use it when adding lights, materials, shaders,
  post-processing, skyboxes, fog, particles, or a HUD to a 3D scene; when
  choosing an art style (low-poly, realistic PBR, retro PSX/voxel); when the user
  has no 3D models and needs geometry from code or free asset sources; and when
  loading or optimizing GLTF/GLB files. Trigger even for a request as small as
  "add a light to my scene" — in a scene that looks wrong, the lighting is
  usually a symptom and the render setup is the actual cause, so the surrounding
  setup needs checking too.
---

# three.js game visuals

## The core idea

A vibecoded three.js scene almost never looks amateur because of the art. It
looks amateur because of six or seven renderer-level settings that are wrong or
missing. Someone can model beautifully and still get a grey, flat, plasticky
image out of three.js if tone mapping is off and there is no environment light.

So the order matters enormously: **fix the render pipeline first, then the
palette, then the models.** Doing it the other way round — hunting for better
models to fix a lighting problem — is the single most common way people burn
days and stay stuck. If someone shows you a scene they are unhappy with, assume
the pipeline is the problem until you have ruled it out.

## Step 1: check the version before writing any code

three.js changes fast and its rendering API has had genuinely breaking changes.
Code written for r140 produces wrong colors on r180.

```bash
npm ls three 2>/dev/null | grep three || cat package.json | grep '"three"'
```

The three eras that matter:

| Version | What changed |
|---|---|
| **r152+** | `outputEncoding` → `outputColorSpace`; `sRGBEncoding` → `SRGBColorSpace` |
| **r155+** | Physically-correct lighting became the only mode. Point/spot light intensities are now candela and obey `decay` — old values look almost black |
| **r165+** | `useLegacyLights` removed entirely; `AgX` and `Neutral` tone mapping available |
| **r183+** | `Clock` deprecated in favour of `Timer`, which also handles tab-out |
| **r185+** | `PCFSoftShadowMap` deprecated — it now silently renders as `PCFShadowMap` |

Everything in this skill is written for **r155+** and verified against r185. If
the project is older, either upgrade it (usually the right call, and worth
saying so) or adapt — but say which you are doing, because silently writing
modern code against an old version produces a scene that is subtly wrong in ways
that are miserable to debug.

## Step 2: the baseline that fixes most of it

Before touching a single model, get this in place. `assets/scene-baseline.js` in
this skill is a working drop-in module — read it and copy it in, or inline the
essential part:

```js
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

renderer.toneMapping = THREE.ACESFilmicToneMapping; // or AgX / Neutral — see below
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;   // PCFSoftShadowMap is deprecated (r185)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 2 is plenty; 3 just costs

// The single biggest upgrade: image-based lighting, with no HDRI file needed.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 1.0;
```

`assets/example-baseline-render.png` is this baseline rendering a handful of
flat-shaded icosahedrons and one emissive octahedron, with no textures, no
models, and no hand-tuning. It is a useful calibration target: if a scene looks
meaningfully worse than that, the problem is setup rather than art.

Why each line earns its place:

- **Tone mapping** maps unbounded scene light into displayable range. With
  `NoToneMapping` (the default), anything bright clips to flat white and the
  image reads as "cheap". This is the largest single visual difference available
  for one line of code.
- **`scene.environment`** gives every `MeshStandardMaterial` something to
  reflect. Without it, metals are black and everything else is chalky, because
  PBR materials are physically asking "what light is arriving from the sky?" and
  the honest answer is "nothing". `RoomEnvironment` synthesises a studio
  environment procedurally, so this works with zero downloaded assets — which
  matters a lot when the user has no art pipeline.
- **`min(devicePixelRatio, 2)`** stops a 3x phone screen from quadrupling
  fragment cost for a difference nobody can see.

Which tone mapper to pick:

| | Character | Use when |
|---|---|---|
| `ACESFilmicToneMapping` | Contrasty, cinematic, desaturates highlights | Default choice for games; most "AAA" look |
| `AgXToneMapping` | Neutral, preserves hue into highlights, gentler | Stylized / colorful art where ACES is crushing your palette |
| `NeutralToneMapping` | Flat, accurate, minimal | Product viewers, when brand color accuracy matters |

Set exposure by eye afterwards; `0.8`–`1.5` is the usual working range.

## Step 3: light for shape, not for brightness

The reflex is `AmbientLight(0xffffff, 0.5)` plus one `DirectionalLight`. That
produces an evenly lit, shapeless image — because uniform light from everywhere
destroys the shading gradients the eye uses to read form.

Light with *contrast between* lights instead:

```js
const key  = new THREE.DirectionalLight(0xfff0dd, 2.5);  // warm, casts shadows
key.position.set(5, 8, 3);
key.castShadow = true;

const fill = new THREE.DirectionalLight(0x88bbff, 0.6);  // cool, opposite side, no shadow
fill.position.set(-4, 2, -3);

const rim  = new THREE.DirectionalLight(0xffffff, 1.8);  // behind subject, separates from bg
rim.position.set(-2, 4, -6);
```

The warm/cool split is doing the real work: it gives the eye two different hues
to compare, so curvature reads even on an untextured blob. A scene lit with one
white light and white ambient has no such information in it.

Skip `AmbientLight` entirely once `scene.environment` is set — the environment
already supplies ambient, and stacking both just washes the image out flat again.

`references/render-setup.md` has shadow-map tuning (bias, frustum fitting, the
acne-vs-peter-panning tradeoff), fog for depth, and gradient skies.

## Step 4: the rest of the pipeline

Work in this order. Each step assumes the previous one is done, and skipping
ahead is how scenes end up incoherent.

1. **Pick a style** → `references/styles.md`. Do this consciously and early.
   An undecided style is why scenes look like several games at once. If the user
   has no strong preference, low-poly stylized is the right recommendation for a
   solo vibecoder: it is the only style whose assets you can generate from code,
   and it has the lowest floor for looking bad.
2. **Render baseline** → Step 2 above and `references/render-setup.md`.
3. **Lock a palette** → `references/art-direction.md`, plus
   `scripts/palette.mjs` which generates a coherent set from one base hue.
   Five to seven colors, chosen once, reused everywhere. Ad-hoc `0xff0000` per
   object is the main reason scenes look like programmer art.
4. **Compose the frame** → camera FOV, fog, ground contact. Objects that do not
   visibly touch the ground look like they are floating, and this reads as
   "unfinished" even when nobody can say why.
5. **Materials** → `references/materials.md`. PBR recipes, toon, matcap, and
   when a custom shader is genuinely worth it.
6. **Post-processing, last** → `references/postprocessing.md`. Bloom, AO,
   vignette, color grading. Post amplifies whatever is underneath it, so adding
   it to a badly lit scene makes a badly lit scene that is also blurry and slow.
7. **HUD and menus** → `references/ui-hud.md`.
8. **Juice** → the animation and feedback layer. For "does this feel like a
   game", easing, screen shake, hit flashes and particles beat polygon count
   every time. Covered at the end of `references/ui-hud.md`.

## Diagnosing from a screenshot

When the user says "it looks bad" without more detail, match the symptom:

| Symptom | Almost always | Fix |
|---|---|---|
| Grey, chalky, washed out | No `scene.environment`, no tone mapping | Step 2 |
| Blown-out white patches | `NoToneMapping`, or exposure too high | ACES/AgX, drop exposure |
| Colors muddy or dull after adding lights | Ambient + environment stacked | Delete `AmbientLight` |
| Metal objects look black | No environment map | `scene.environment` |
| Flat, shapeless, no depth | Single white light, no warm/cool split | Step 3 |
| Objects look pasted on / floating | No contact shadow, no AO, no fog | AO pass, fog, ground plane |
| Looks like disconnected assets | No shared palette | `scripts/palette.mjs` |
| Points/spots nearly invisible | Pre-r155 intensity values on r155+ | Raise intensity ~100x, set `decay` |
| Textures look too dark or too bright | Wrong `colorSpace` on texture | `SRGBColorSpace` for color maps only |
| Jagged edges | No antialias, no SMAA/FXAA after post | See `references/postprocessing.md` |
| Shadows harder than expected | `PCFSoftShadowMap` on r185+ | Use `VSMShadowMap`, or soften via light size |
| Sluggish on laptops | pixelRatio unclamped, or 4096 shadow maps | Clamp to 2, shadows at 1024–2048 |

Note the last-but-one row: once an `EffectComposer` is in play, the renderer's
own `antialias: true` stops applying, which is why scenes reliably get *more*
jagged the moment post-processing is added. That surprises people, so mention it
rather than silently adding an SMAA pass.

## Texture color space

A quiet, common source of wrong-looking output:

```js
colorMap.colorSpace = THREE.SRGBColorSpace;  // albedo / emissive / anything you'd "see"
normalMap.colorSpace = THREE.NoColorSpace;   // normal, roughness, metalness, AO, displacement
```

Data maps carry numbers, not colors. Running them through an sRGB transfer
corrupts those numbers, and the result is subtly wrong shading that is very hard
to spot as a *cause* and easy to misread as "my model is bad".

## Performance budget

Frame budget is 16.7 ms at 60 fps. Rough targets for a browser game on a mid
laptop:

- Draw calls under ~150 — merge static geometry, use `InstancedMesh` for repeats
- One or two shadow-casting lights, not five
- Shadow maps 1024–2048; tighten the light's frustum instead of raising the size
- Post-processing under ~4 ms; bloom and AO are the expensive ones
- Textures as KTX2/Basis if there are many, and power-of-two where mipmapping matters

Measure before optimizing: `renderer.info.render` gives calls and triangles, and
that number usually says something different from what people assume.

## Reference map

| File | Read it when |
|---|---|
| `references/render-setup.md` | Renderer config, light rigs, shadows, fog, sky, environment maps |
| `references/materials.md` | PBR params, toon, matcap, transmission, custom shaders |
| `references/postprocessing.md` | EffectComposer stack, pass ordering, bloom/AO/DOF/grading |
| `references/art-direction.md` | Palettes, value structure, mood, keeping a scene coherent |
| `references/assets.md` | Procedural geometry, free asset sources with licenses, GLTF pipeline |
| `references/ui-hud.md` | HUD, menus, damage feedback, and game-feel juice |
| `references/styles.md` | Full recipes for low-poly, realistic PBR, and retro PSX/voxel |
| `assets/scene-baseline.js` | Drop-in correct renderer + lighting + post setup |
| `assets/example-baseline-render.png` | What that baseline produces, untouched — the calibration target |
| `scripts/palette.mjs` | Generate a coherent game palette from one hue |

## Working with someone who is not an artist

The user of this skill is often a developer who can build systems but freezes at
visual decisions. Two things help more than more options:

**Decide, then show.** Offering three palettes and asking which they prefer
moves the hard part back onto them. Pick one, implement it, explain in a sentence
why it fits the game, and invite correction. Reacting to something concrete is
far easier than choosing in the abstract, and it is also faster.

**Name the cause, not just the fix.** "Added ACES tone mapping" teaches nothing.
"Your highlights were clipping to flat white because there was no tone mapping —
ACES compresses them, which is why it suddenly reads as filmic" means the next
scene starts better. The goal is that they need this skill less over time.
