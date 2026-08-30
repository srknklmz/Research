# Materials

Choosing and tuning materials so surfaces read as intended.

## Contents
- [Which material](#which-material)
- [MeshStandardMaterial](#meshstandardmaterial)
- [Believable material values](#believable-material-values)
- [MeshPhysicalMaterial extras](#meshphysicalmaterial-extras)
- [Stylized materials](#stylized-materials)
- [Vertex colors](#vertex-colors)
- [Texture handling](#texture-handling)
- [Custom shaders](#custom-shaders)
- [Performance](#performance)

## Which material

| Material | Lit | Cost | Use for |
|---|---|---|---|
| `MeshBasicMaterial` | no | lowest | UI planes, unlit sprites, wireframes, retro/flat styles, emissive-only |
| `MeshLambertMaterial` | yes | low | Diffuse-only surfaces, mobile, large terrain |
| `MeshPhongMaterial` | yes | low | Legacy; prefer Standard unless targeting weak hardware |
| `MeshToonMaterial` | yes | low | Cel-shaded / anime look, banded shading |
| `MeshMatcapMaterial` | baked | lowest lit-looking | Great-looking shading with zero lights — excellent for prototypes |
| `MeshStandardMaterial` | yes | medium | **The default choice.** Metalness/roughness PBR |
| `MeshPhysicalMaterial` | yes | high | Glass, clearcoat, iridescence, sheen, transmission |

`MeshMatcapMaterial` deserves particular attention for a solo dev: it bakes the
whole lighting response into a small sphere texture, so objects look sculpted and
well-lit with no light setup at all. It cannot react to scene lighting, which
makes it wrong for dynamic day/night, and ideal for menus, icons, and stylized
games with a fixed camera.

## MeshStandardMaterial

```js
const mat = new THREE.MeshStandardMaterial({
  color: 0x4a90d9,
  roughness: 0.55,
  metalness: 0.0,
  envMapIntensity: 1.0,
});
```

The one rule worth internalising: **metalness is binary in the real world.**
A surface is metal or it is not. Values between 0.1 and 0.9 describe almost no
real material and are the main reason PBR scenes look like wet plastic. Use
`0.0` or `1.0`, and reserve intermediate values for a texture blending between
metal and non-metal regions on one mesh.

Metals take their color from `color` acting on reflections and have no diffuse
at all, so a metal with no `scene.environment` renders black. That is not a bug,
it is the material correctly reporting there is nothing to reflect.

## Believable material values

Starting points — adjust by eye, but starting near reality saves a lot of
flailing:

| Surface | roughness | metalness | Notes |
|---|---|---|---|
| Polished metal | 0.05–0.15 | 1.0 | Needs an environment to look like anything |
| Brushed metal | 0.3–0.5 | 1.0 | Anisotropy would help; Standard fakes it acceptably |
| Rough/cast metal | 0.6–0.8 | 1.0 | |
| Plastic, glossy | 0.15–0.3 | 0.0 | |
| Plastic, matte | 0.6–0.8 | 0.0 | |
| Painted wall | 0.85–0.95 | 0.0 | |
| Wood, varnished | 0.3–0.4 | 0.0 | |
| Wood, raw | 0.7–0.9 | 0.0 | |
| Concrete, stone | 0.9–1.0 | 0.0 | |
| Fabric | 0.9–1.0 | 0.0 | `sheen` on Physical improves it a lot |
| Skin | 0.5–0.6 | 0.0 | Real skin needs subsurface; Physical `thickness` approximates |
| Rubber | 0.9 | 0.0 | |

Nothing in reality is perfectly smooth. `roughness: 0` gives a mirror that reads
as CG immediately; `0.05` reads as polished.

## MeshPhysicalMaterial extras

Each of these adds shader cost, so add them deliberately:

```js
new THREE.MeshPhysicalMaterial({
  transmission: 1.0,      // real refractive transparency — glass, water, gems
  thickness: 0.5,         // volume for transmission; 0 looks like a soap bubble
  ior: 1.5,               // 1.33 water, 1.5 glass, 2.4 diamond
  clearcoat: 1.0,         // a second specular layer — car paint, lacquer
  clearcoatRoughness: 0.1,
  iridescence: 1.0,       // thin-film color shift — soap, oil, beetle shells
  sheen: 1.0,             // retroreflective fuzz — velvet, cloth
  sheenColor: 0xffffff,
});
```

`transmission` is the expensive one: it needs a scene render behind the object.
For a HUD icon or a distant prop, plain `opacity` transparency is far cheaper and
nobody will notice the difference.

## Stylized materials

### Toon

```js
// A 4-step gradient ramp gives hard cel bands. NearestFilter is what makes the
// bands hard rather than smooth — with linear filtering it just looks like a
// slightly odd diffuse material.
const ramp = new THREE.DataTexture(
  new Uint8Array([40, 90, 160, 255]), 4, 1, THREE.RedFormat
);
ramp.needsUpdate = true;
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;

const mat = new THREE.MeshToonMaterial({ color: 0xff8844, gradientMap: ramp });
```

Toon shading almost always wants an outline as well — see `styles.md` for the
inverted-hull and `OutlinePass` approaches.

### Flat-shaded low-poly

```js
new THREE.MeshStandardMaterial({ color: 0x88cc66, flatShading: true, roughness: 0.8 });
```

`flatShading: true` is what makes faceted low-poly look intentional instead of
like a low-res mesh that failed to smooth. It disables normal interpolation so
each triangle takes a single normal, which is the whole aesthetic.

### Matcap

```js
import { MeshMatcapMaterial, TextureLoader } from 'three';
const matcap = new TextureLoader().load('/matcaps/clay.png');
matcap.colorSpace = THREE.SRGBColorSpace;
new MeshMatcapMaterial({ matcap });
```

Matcap textures are small (256–512 px) and freely available; there are
well-known CC0 sets. One clay or metal matcap makes an untextured prototype look
deliberate.

## Vertex colors

The most practical way to color procedurally-generated low-poly geometry without
UVs or textures:

```js
const colors = [];
for (let i = 0; i < positionCount; i++) colors.push(r, g, b);   // linear 0..1
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true });
```

Vertex color values are treated as linear, not sRGB. Converting a hex from a
palette needs `new THREE.Color(0x88cc66)` — the `Color` class handles the
conversion — rather than dividing the hex bytes by 255 by hand, which produces
noticeably washed-out colors.

## Texture handling

```js
const tex = loader.load('/tex/wood_albedo.jpg');
tex.colorSpace = THREE.SRGBColorSpace;      // color maps ONLY
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(4, 4);
tex.anisotropy = renderer.capabilities.getMaxAnisotropy();  // sharpens glancing angles
```

Color space rules, restated because getting this wrong is so common:

- `map`, `emissiveMap`, `specularMap`, any "you can see it" texture →
  `SRGBColorSpace`
- `normalMap`, `roughnessMap`, `metalnessMap`, `aoMap`, `displacementMap`,
  `alphaMap` → `NoColorSpace`

Anisotropic filtering is nearly free and dramatically improves ground textures
viewed at a shallow angle, which is most floors in most games.

`aoMap` requires a second UV set (`uv1`). If an AO map appears to do nothing,
that is usually why.

## Custom shaders

Before writing GLSL, try `onBeforeCompile` — it lets you inject into the
existing Standard shader and keep all the PBR, shadows, and fog for free:

```js
mat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 };
  shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     transformed.y += sin(position.x * 2.0 + uTime) * 0.1;`
  );
  mat.userData.shader = shader;
};
// then each frame: mat.userData.shader && (mat.userData.shader.uniforms.uTime.value = t)
```

This is the right tool for wind on foliage, water displacement, dissolve effects,
and vertex jitter for PSX style. A full `ShaderMaterial` means reimplementing
lighting and shadows yourself, which is rarely worth it for a game prop.

Remember `mat.customProgramCacheKey` if the injected code varies by material, or
three will reuse a cached program and your variations silently collapse into one.

## Performance

- **Share material instances.** Ten meshes with one material batch far better
  than ten identical materials. Cloning per object is a common and costly habit.
- **`InstancedMesh`** for anything repeated more than ~20 times — trees, rocks,
  bullets, crowd. One draw call for thousands of objects.
- **Texture memory** dominates on mobile. A 2048² RGBA texture is 16 MB
  uncompressed; KTX2/Basis cuts that by 4–8x.
- `material.needsUpdate = true` recompiles the shader. Setting it every frame
  destroys performance — set properties, not the flag.
- Transparent objects cannot be batched with opaque ones and are sorted per
  frame. Use `alphaTest` for foliage and fences instead of `transparent: true`
  where you can; it keeps them in the opaque pass and fixes sorting artifacts.
