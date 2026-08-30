# Style recipes

Pick one deliberately and early. An undecided style is the most common reason a
scene looks like several different games at once, and it cannot be fixed later by
adding effects.

## Contents
- [Choosing](#choosing)
- [Low-poly stylized](#low-poly-stylized)
- [Cel-shaded / toon](#cel-shaded--toon)
- [Realistic PBR](#realistic-pbr)
- [Retro PSX](#retro-psx)
- [Voxel](#voxel)
- [Committing](#committing)

## Choosing

| | Asset cost | Risk of looking bad | Best for |
|---|---|---|---|
| **Low-poly stylized** | Lowest — generate from code | Lowest | Solo devs, prototypes, anything without an artist |
| **Cel-shaded** | Low–medium — needs decent silhouettes | Low | Character games, anime/comic tone |
| **Realistic PBR** | Highest — needs real assets and textures | Highest | Teams with art, or heavy use of scan libraries |
| **Retro PSX** | Low — constraints are the style | Low | Horror, nostalgia, jam games |
| **Voxel** | Low — generated | Low | Sandbox, building, destructible worlds |

**The default recommendation for a solo developer without art skills is low-poly
stylized.** Not as a compromise: it is the only style whose assets can be
generated entirely from code, its failure mode is "simple" rather than "broken",
and its look depends on lighting and palette — both of which are code, and both
covered by this skill. Realistic PBR has the opposite property: it requires real
assets, and anything short of good looks conspicuously bad, because players have
reality itself as a reference.

Say this plainly when someone is undecided. "Pick low-poly, here is why, and here
is your scene in it" moves them forward; a comparison table does not.

## Low-poly stylized

Flat-shaded faceted geometry, saturated but disciplined palette, soft lighting,
strong silhouettes.

```js
// Materials: flat shading is the whole aesthetic.
const mat = new THREE.MeshStandardMaterial({
  color: PALETTE.propAlt,
  flatShading: true,
  roughness: 0.85,
  metalness: 0.0,
});

// Geometry: low detail parameters, on purpose.
new THREE.IcosahedronGeometry(1, 0);          // detail 0
new THREE.SphereGeometry(1, 8, 6);            // few segments
new THREE.CylinderGeometry(0.3, 0.4, 2, 6);   // hexagonal
```

Setup:

- `scene.environment` from `RoomEnvironment` with high blur (`0.1`+) for soft,
  shapeless ambient — you want form to come from the facets, not from reflections
- Warm key, cool fill, generous rim (see `render-setup.md`)
- Linear fog matched to a gradient sky
- Post: gentle bloom (strength ~0.3), mild vignette, no AO — flat surfaces have
  no crevices for AO to find, so it costs frame time and returns nothing
- No textures at all. Vertex colors or per-material color only. Textures fight
  the style and immediately look like a different game

What makes the difference between "low-poly" and "low-effort":

- **Vary every instance.** Random rotation, ±15% non-uniform scale, slight hue
  jitter per object.
- **Exaggerate proportions.** Oversized foliage on thin trunks, chunky
  characters. Realistic proportions in low-poly read as a failed attempt at
  realism.
- **Consistent facet size.** A 200-triangle rock next to a 12-triangle tree
  breaks the illusion. Keep the visual triangle density roughly even across the
  scene, which sometimes means *removing* detail.

## Cel-shaded / toon

Banded lighting plus outlines. Reads as illustration.

```js
const ramp = new THREE.DataTexture(new Uint8Array([50, 130, 255]), 3, 1, THREE.RedFormat);
ramp.needsUpdate = true;
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;   // hard bands

const mat = new THREE.MeshToonMaterial({ color: PALETTE.propAlt, gradientMap: ramp });
```

Outlines via inverted hull — one extra draw call per object, works everywhere:

```js
function addOutline(mesh, thickness = 0.03, color = 0x14161f) {
  const outline = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color, side: THREE.BackSide })
  );
  outline.scale.multiplyScalar(1 + thickness);
  mesh.add(outline);
  return outline;
}
```

The hull trick relies on smooth vertex normals — on a hard-edged mesh with split
normals it produces gaps at the corners. Either weld normals for outlined meshes
or use `OutlinePass` instead.

Notes:

- Strong directional key light; the band boundary is the drawing, so its position
  and hardness matter more than intensity
- Keep ambient low or the bands wash out into a smooth gradient and the whole
  effect disappears
- Skip AO and DOF — both fight the flat, graphic look
- Bloom on emissive only, high threshold

## Realistic PBR

Physically-based materials, HDRI lighting, full post stack. The most demanding
option, and the one where shortcuts are most visible.

Requirements, and they are requirements rather than suggestions:

- Real PBR texture sets — albedo, normal, roughness, metalness, AO. ambientCG and
  Poly Haven are the free sources
- HDRI environment lighting, not procedural
- Correct color space on every texture (see `materials.md`)
- `ACESFilmicToneMapping`
- Full post: GTAO, bloom at high threshold, SMAA, subtle DOF, LUT grade
- Shadow maps 2048+ with a tightly fitted frustum

```js
const mat = new THREE.MeshStandardMaterial({
  map: albedo,               // SRGBColorSpace
  normalMap: normal,         // NoColorSpace
  roughnessMap: rough,       // NoColorSpace
  metalnessMap: metal,       // NoColorSpace
  aoMap: ao,                 // NoColorSpace, needs uv1
  envMapIntensity: 1.0,
});
```

Be honest with someone choosing this without an art pipeline: it is the style
most likely to consume weeks and end up looking worse than a low-poly version of
the same game built in two days. If they want it anyway, that is a legitimate
choice — say the tradeoff once, then help them do it properly rather than
relitigating it.

The details that most separate convincing PBR from almost-convincing: surface
imperfection (nothing is uniformly clean — add grime and wear via roughness
variation), consistent texel density across objects, and contact shadows so
nothing floats.

## Retro PSX

Deliberately constrained: low resolution, vertex jitter, affine texture warping,
dithering, heavy fog. The constraints are the aesthetic, so implement them
precisely rather than approximately.

```js
// 1. Low internal resolution, scaled up with nearest-neighbour.
const SCALE = 4;
renderer.setPixelRatio(1);
renderer.setSize(innerWidth / SCALE, innerHeight / SCALE, false);
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.imageRendering = 'pixelated';

// 2. Nearest filtering, no mipmaps, tiny textures (64–128 px).
tex.magFilter = tex.minFilter = THREE.NearestFilter;
tex.generateMipmaps = false;

// 3. Vertex snapping — the characteristic PSX wobble.
mat.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace(
    '#include <project_vertex>',
    `#include <project_vertex>
     float grid = 160.0;
     gl_Position.xyz /= gl_Position.w;
     gl_Position.xy = floor(gl_Position.xy * grid) / grid;
     gl_Position.xyz *= gl_Position.w;`
  );
};
```

Also:

- Heavy `FogExp2`, short far plane — PSX hardware could not draw distance, and
  the fog is the reason the look feels claustrophobic and atmospheric
- `NoToneMapping` — tone mapping is exactly the modern nicety this style rejects
- No antialiasing, no bloom, no AO
- Restricted palette; optionally quantise to 16-bit color in a final pass
- Low-poly untextured-looking models with small, muddy textures
- `MeshLambertMaterial` rather than Standard — the era had no PBR, and Standard's
  environment response reads as too modern

The style is coherent only if applied everywhere. One crisp modern UI font over a
PSX scene breaks it instantly — the HUD needs a bitmap font and the same
pixelation.

## Voxel

Everything from cubes, on a grid.

- Merge chunks: never one `Mesh` per voxel. Build a merged `BufferGeometry` per
  chunk (16³ or 32³ is typical), or use `InstancedMesh` for sparse scenes
- Cull interior faces — only emit faces adjacent to air. This removes the large
  majority of triangles and is the difference between playable and not
- Greedy meshing merges coplanar same-colored faces into larger quads; worth
  implementing once the naive version works
- Vertex colors rather than textures, or a single small texture atlas
- Flat shading is automatic; ambient occlusion computed per-vertex from
  neighbouring voxels is cheap and adds enormous depth
- Hard directional light plus low ambient — voxel scenes read through their
  strong face-orientation shading

Per-vertex AO is the detail that makes voxel scenes look good: darken each
corner by how many neighbouring voxels are solid. It costs nothing at runtime and
does more than any post-processing AO would.

## Committing

Once a style is chosen, write it down in the project — a short `STYLE.md` or a
comment block at the top of the palette module stating the style, the palette,
the tone mapper, and the material conventions.

This sounds bureaucratic and matters a great deal in practice. Weeks later, in a
different session and a different mood, the temptation is always to add one
realistic asset to a stylized scene or one glossy material to a flat one. A
written convention is what makes that decision obviously wrong instead of merely
tempting.
