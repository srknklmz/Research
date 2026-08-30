# Render setup

Renderer configuration, light rigs, shadows, fog, sky, environment maps.
Everything here is verified against three r185 and applies to r155+.

## Contents
- [Renderer](#renderer)
- [Environment light (IBL)](#environment-light-ibl)
- [Light rigs](#light-rigs)
- [Light intensity after r155](#light-intensity-after-r155)
- [Shadows](#shadows)
- [Fog and depth](#fog-and-depth)
- [Sky and background](#sky-and-background)
- [Camera](#camera)
- [Resize and pixel ratio](#resize-and-pixel-ratio)

## Renderer

```js
const renderer = new THREE.WebGLRenderer({
  antialias: true,        // ignored once EffectComposer is used — see postprocessing.md
  alpha: false,           // opaque is cheaper; only use alpha if compositing over DOM
  powerPreference: 'high-performance',
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
```

`PCFSoftShadowMap` was deprecated in r185 and now silently renders as
`PCFShadowMap`, so code that sets it gets a console warning and hard shadows
regardless. For genuinely soft shadows use `VSMShadowMap` — it blurs properly,
at the cost of light bleeding through thin geometry. Most stylized games look
better with hard `PCFShadowMap` shadows plus a soft blob contact shadow anyway.

Timing: use `THREE.Timer` rather than `THREE.Clock`, which was deprecated in
r183. `timer.connect(document)` opts into the Page Visibility API, so returning
to a backgrounded tab no longer delivers a multi-second delta that teleports
every moving object across the level.

```js
const timer = new THREE.Timer();
timer.connect(document);
function tick(t) {
  requestAnimationFrame(tick);
  timer.update(t);
  const dt = timer.getDelta();
  // ...
}
```

`outputColorSpace` defaults to `SRGBColorSpace` on modern versions, so leave it
alone unless something upstream changed it. Do not set `outputEncoding` — it was
removed in r152 and setting it silently does nothing.

### Transparent canvas over HTML

If the game canvas sits over DOM UI and you need see-through:

```js
new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x000000, 0);
```

Otherwise keep `alpha: false`. A transparent framebuffer costs blending work
every frame for an effect nobody asked for.

## Environment light (IBL)

Image-based lighting is what separates "3D objects lit by lamps" from "objects
that live somewhere". PBR materials need to know what light arrives from every
direction; without an environment they only get the few lights you placed, which
is why untextured `MeshStandardMaterial` looks chalky by default.

### Zero-asset option: RoomEnvironment

Generates a plausible studio environment procedurally. No files, no download,
works offline — the correct default when the user has no art pipeline.

```js
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 1.0;   // dial the whole IBL up or down
```

Gotcha: on older versions `RoomEnvironment` took the renderer as a constructor
argument. On r165+ it takes none. Passing one is harmless but confusing; omitting
one on an old version throws.

The `0.04` is blur/roughness applied while prefiltering. Higher values give
softer, more diffuse ambient light — raise it for stylized work where you do not
want readable reflections of a fake room.

### HDRI option

Better if a specific mood is wanted. `.hdr` via `RGBELoader`, `.exr` via
`EXRLoader`. Poly Haven (CC0) is the standard free source.

```js
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

new RGBELoader().load('/env/sunset_1k.hdr', (tex) => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = tex;
  scene.background = tex;          // optional: also use it as the sky
  scene.backgroundBlurriness = 0.3; // blur the backdrop, keep reflections sharp
});
```

Use 1k or 2k for environment lighting. 4k+ costs memory and load time for detail
that ends up blurred into irradiance anyway. Only go higher if the HDRI is also
the visible, sharp background.

### Per-object override

`mesh.material.envMap` overrides `scene.environment` for that material. Useful
when one object should reflect something different — a mirror, a screen, a
character that should stay readable against a busy backdrop.

## Light rigs

### Three-point (characters, hero objects, product-like scenes)

```js
const key = new THREE.DirectionalLight(0xfff0dd, 2.5);
key.position.set(5, 8, 3);
key.castShadow = true;

const fill = new THREE.DirectionalLight(0x88bbff, 0.6);
fill.position.set(-4, 2, -3);

const rim = new THREE.DirectionalLight(0xffffff, 1.8);
rim.position.set(-2, 4, -6);

scene.add(key, fill, rim);
```

The rim light is the one people skip and the one that does the most for
"looks professional". A bright edge along the silhouette separates the subject
from the background, which is exactly what makes game characters read at a
glance during motion.

### Outdoor / sun

One strong `DirectionalLight` as the sun, plus a `HemisphereLight` for the
sky-vs-ground bounce that makes outdoor scenes feel outdoors:

```js
const sun = new THREE.DirectionalLight(0xffe8c0, 3.0);
sun.position.set(30, 50, 20);
sun.castShadow = true;

const sky = new THREE.HemisphereLight(0x88bbff, 0x4a3f35, 0.7);
// sky color from above, ground bounce color from below
```

`HemisphereLight` is cheap and gives directional ambient — light from the sky is
blue, light bouncing off dirt is brown, and that vertical hue gradient is a
strong outdoor cue that flat ambient cannot provide.

### Interior / moody

Point and spot lights with visible falloff, low ambient, and strong contrast.
This is where post-processing bloom earns its cost — see `postprocessing.md`.

## Light intensity after r155

Physically-correct lighting is now the only mode, and it changed what intensity
numbers mean:

| Light | Unit | Typical values | Notes |
|---|---|---|---|
| `DirectionalLight` | irradiance | 1 – 4 | Unaffected by distance |
| `AmbientLight` | irradiance | 0.1 – 0.5 | Prefer environment instead |
| `HemisphereLight` | irradiance | 0.3 – 1.5 | Cheap directional ambient |
| `PointLight` | candela | 10 – 1000+ | Obeys `decay` (default 2 = inverse square) |
| `SpotLight` | candela | 10 – 1000+ | Same; also `angle`, `penumbra` |

If a point or spot light appears to do nothing on a modern version, this is why:
old tutorials use `intensity: 1`, which under inverse-square falloff is
essentially invisible a few units away. Raise it by roughly two orders of
magnitude, or set `decay = 0` to opt out of falloff for stylized work.

```js
const lamp = new THREE.PointLight(0xffaa55, 200, 0 /* distance: 0 = infinite */, 2);
```

## Shadows

Shadows are the main cost and the main source of visual bugs.

```js
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;

// Fit the frustum to what actually needs shadows:
const d = 20;
Object.assign(key.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 1, far: 60 });
key.shadow.camera.updateProjectionMatrix();
```

Frustum fitting matters more than map size. A 2048 map spread over a 500-unit
frustum has worse effective resolution than a 1024 map over 20 units — so tighten
the box before reaching for a bigger texture.

The two classic artifacts:

- **Shadow acne** (stripey self-shadowing): increase `normalBias`, or make
  `bias` more negative — in small steps, `-0.0001` at a time.
- **Peter-panning** (shadow detached from the object): bias pushed too far.
  Back it off and prefer `normalBias`, which offsets along the surface normal
  and is much less prone to this.

Debug with `new THREE.CameraHelper(key.shadow.camera)` — seeing the actual
frustum resolves most shadow problems in seconds.

### Contact shadows without shadow maps

For stylized scenes, a soft blob under each object often reads better and costs
almost nothing: a `PlaneGeometry` with a radial-gradient alpha texture, laid flat
just above the ground. This is the trick that makes low-poly objects feel planted
without a single shadow-casting light.

## Fog and depth

Fog is the cheapest depth cue available, and it also hides the far clipping
plane and the edge of your level.

```js
scene.fog = new THREE.Fog(0x9ab8d0, 20, 120);              // linear: near, far
scene.fog = new THREE.FogExp2(0x9ab8d0, 0.012);            // exponential: denser, moodier
```

Match the fog color to the background/horizon, or the fade reads as a grey haze
sitting in front of the sky instead of atmosphere. When the sky is a gradient,
sample its horizon color for the fog.

`MeshBasicMaterial` ignores fog unless `fog: true` is set on it — a common reason
"fog isn't working" on one particular object.

## Sky and background

In rough order of cost:

1. **Flat color** — `scene.background = new THREE.Color(0x1a1a2e)`. Fine for
   stylized and retro.
2. **Vertical gradient** — a large inverted sphere with a two-color shader, or a
   canvas-generated texture. Cheap and a large step up from flat.
3. **`Sky` addon** — `three/addons/objects/Sky.js`, physical atmospheric
   scattering with sun position, turbidity, rayleigh. Excellent for outdoor games
   and it makes sunsets nearly free.
4. **HDRI** — see above. Best realism, largest download.

Sun position on the `Sky` addon should be driven from the same vector as the
directional light, or the shadows point somewhere the sky disagrees with, and
players feel the wrongness without identifying it.

## Camera

```js
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200);
```

FOV is a style decision that people leave at the default and then wonder why
their scene feels off:

- **35–45°** — compressed, cinematic, flattering for characters
- **50–60°** — natural, good default for third-person
- **70–90°** — wide, fast, distorted at edges; standard for first-person because
  peripheral vision matters more than proportion

Keep `near` as large and `far` as small as the scene allows. The depth buffer is
distributed logarithmically, so `near: 0.001` throws away precision and produces
z-fighting on distant coplanar surfaces.

## Resize and pixel ratio

```js
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);   // easy to forget; post breaks without it
});
```

Forgetting `composer.setSize` is a frequent bug: the scene resizes, the post
buffers do not, and the image goes soft or misaligned after the first resize.
