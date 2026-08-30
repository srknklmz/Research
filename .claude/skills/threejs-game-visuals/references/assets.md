# Assets

Getting geometry into the scene when there is no modeller on the team.

## Contents
- [Procedural first](#procedural-first)
- [Composite objects from primitives](#composite-objects-from-primitives)
- [Useful procedural recipes](#useful-procedural-recipes)
- [Free asset sources](#free-asset-sources)
- [Licenses](#licenses)
- [The GLTF pipeline](#the-gltf-pipeline)
- [Optimizing downloads](#optimizing-downloads)
- [Characters and animation](#characters-and-animation)
- [Making assets fit together](#making-assets-fit-together)

## Procedural first

For a solo developer, code-generated geometry is usually the better answer than
hunting for models — not as a compromise, but because it gives full control over
style consistency, costs nothing to download, and can be parameterised and
regenerated. A whole genre of good-looking games is built from boxes, spheres,
and cylinders with a disciplined palette.

The style that makes this work is low-poly flat-shaded (see `styles.md`). It
turns "we have no assets" into a deliberate aesthetic rather than a limitation
someone is trying to hide.

## Composite objects from primitives

Most props are three or four primitives in a `Group`:

```js
function makeTree(rng) {
  const g = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6),
    new THREE.MeshStandardMaterial({ color: PALETTE.trunk, flatShading: true, roughness: 0.9 })
  );
  trunk.position.y = 0.8;

  const foliage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 0),           // detail 0 = big flat facets
    new THREE.MeshStandardMaterial({ color: PALETTE.leaf, flatShading: true, roughness: 0.8 })
  );
  foliage.position.y = 2.0;
  foliage.rotation.set(rng() * Math.PI, rng() * Math.PI, 0);   // rotate so clones differ

  g.add(trunk, foliage);
  g.traverse(o => { o.castShadow = true; o.receiveShadow = true; });
  return g;
}
```

Two details that make a field of these look designed rather than repeated:
random rotation and non-uniform scale per instance. Identical clones in a grid
read as placeholder immediately; the same mesh with varied rotation, scale
(±15%) and slight color jitter reads as a forest.

Use a **seeded** random function rather than `Math.random()` so a layout you like
is reproducible. A tiny mulberry32 is enough.

## Useful procedural recipes

| Want | Approach |
|---|---|
| Faceted rock | `IcosahedronGeometry(r, 0)` or `DodecahedronGeometry`, jitter vertex positions, `flatShading` |
| Terrain | `PlaneGeometry` with many segments, displace vertices by layered simplex noise, `computeVertexNormals()` |
| Building | Stacked/scaled boxes; vary height and footprint from a seeded RNG |
| Road / river | `CatmullRomCurve3` + `TubeGeometry`, or extrude a profile along the curve |
| Fence, wall, pillars | One mesh in an `InstancedMesh`, positions along a curve |
| Cloud | Several overlapping low-detail spheres, flat-shaded, near-white |
| Crystal / gem | `OctahedronGeometry` scaled non-uniformly, `MeshPhysicalMaterial` with transmission |
| Grass field | Instanced crossed quads with `alphaTest`, vertex-shader wind via `onBeforeCompile` |
| Water | `PlaneGeometry` + vertex displacement, or the `Water` addon in `three/addons/objects/` |

After displacing vertices, call `geometry.computeVertexNormals()` — otherwise
lighting still uses the original flat normals and the displacement is invisible
except in silhouette. This is a very common "my terrain looks flat" cause.

## Free asset sources

Verify the license on each individual asset — most of these sites host
contributions under more than one license, and site-wide claims drift over time.

| Source | Content | Typical license |
|---|---|---|
| **Kenney.nl** | Game-ready 3D kits, UI, audio, fonts | CC0 |
| **Poly Haven** | HDRIs, PBR textures, models | CC0 |
| **ambientCG** | PBR material textures | CC0 |
| **Quaternius** | Low-poly model packs, characters | CC0 |
| **Mixamo** (Adobe) | Rigged humanoid characters + motion capture animations | Free with account, license terms apply |
| **Sketchfab** | Very large model library | Mixed — filter to Creative Commons and check per model |
| **OpenGameArt** | Sprites, models, audio | Mixed — CC0 through GPL, check per asset |
| **itch.io** | Asset packs, many free | Per pack |

Kenney and Quaternius are the two most useful for the situation this skill
addresses: coherent packs designed as sets, so the pieces already look like they
belong together. Mixing three sources is how scenes end up looking like asset
flips — prefer to exhaust one pack before adding another.

## Licenses

Worth being precise about, because the consequences arrive late:

- **CC0** — public domain equivalent. Use commercially, no attribution required.
  The safest category and what to prefer.
- **CC-BY** — free to use, attribution required. Keep a credits file from the
  start; reconstructing attributions before launch is miserable.
- **CC-BY-SA / GPL** — share-alike. Can impose obligations on derivative
  assets. Read carefully before building a commercial game on these.
- **CC-BY-NC** — non-commercial only. Fine for a jam, a problem if the project
  ever earns money.

Do not assume "free to download" means "free to ship". When a project is likely
to be released, mention the license question early rather than at the end.

## The GLTF pipeline

glTF/GLB is the format to use — it is the only one three loads well with
materials, animations, and PBR intact. Convert anything else (FBX, OBJ) to glTF
in Blender rather than loading it directly.

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const draco = new DRACOLoader().setDecoderPath('/draco/');
const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);

const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2);

const gltf = await loader.loadAsync('/models/hero.glb');
gltf.scene.traverse((o) => {
  if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
});
scene.add(gltf.scene);
```

Shadows are off by default on loaded meshes, which is why an imported model
frequently looks like it is hovering. The `traverse` above is nearly always
needed.

The Draco decoder and Basis transcoder are separate files that must be copied
into the public directory from `node_modules/three/examples/jsm/libs/`. Missing
them produces a loader error that does not obviously point at the cause.

## Optimizing downloads

`gltf-transform` (CLI) is the standard tool and does most of this in one command:

```bash
npx @gltf-transform/cli optimize in.glb out.glb --compress draco --texture-compress webp
```

What actually moves the needle, in order:

1. **Textures.** Almost always the bulk of the file. Resize to what is actually
   visible — a prop occupying 100 px on screen does not need a 4K albedo — and
   compress to WebP, or KTX2 if there are many (KTX2 stays compressed in GPU
   memory, which matters more than download size on mobile).
2. **Draco/meshopt geometry compression.** Large ratios on dense meshes,
   negligible on simple ones. Meshopt decodes faster; Draco compresses smaller.
3. **Deduplicate and prune.** Exporters leave unused materials, duplicate meshes,
   and empty nodes behind constantly.
4. **Drop unused UV sets and vertex colors** the materials never read.

Check the result: `renderer.info.memory` reports geometries and textures actually
resident, which is often a very different number from what the file list suggests.

## Characters and animation

Mixamo remains the fastest path to an animated humanoid: upload or pick a
character, choose from a large motion library, download as FBX, convert to glTF.

```js
const mixer = new THREE.AnimationMixer(gltf.scene);
const action = mixer.clipAction(gltf.animations.find(c => c.name === 'Run'));
action.play();
// in the loop:
mixer.update(delta);
```

Crossfading between clips is what separates smooth character motion from
snapping:

```js
prev.crossFadeTo(next.reset().play(), 0.25, true);
```

Retargeting animations between skeletons is genuinely fiddly. Keeping every
character on the same rig — all Mixamo, for instance — avoids the entire problem
and is worth the constraint on a small project.

## Making assets fit together

When mixing sources, the mismatch shows up in specific, fixable ways:

- **Scale.** Establish a unit convention (1 unit = 1 metre is standard) and
  scale each import to match on load. A model 100x too large is the most common
  "my scene is empty / all I see is a wall" cause.
- **Texel density.** A 4K texture on a small crate next to a 512 texture on a
  building looks wrong even to people who cannot name why. Resize toward
  consistency rather than toward maximum quality.
- **Detail level.** A photoscanned rock next to an eight-triangle tree cannot be
  reconciled by lighting. Decimate the detailed asset or replace the simple one.
- **Palette.** Override imported material colors toward the project palette.
  This is heavy-handed and it works — a shared color family papers over a
  surprising amount of stylistic mismatch.

```js
gltf.scene.traverse((o) => {
  if (o.isMesh) o.material.color.lerp(new THREE.Color(PALETTE.propAlt), 0.3);
});
```
