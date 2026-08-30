/**
 * scene-baseline.js — a correct three.js starting point.
 *
 * Drop this in and build on top of it instead of assembling renderer settings
 * from memory. Every line here exists because leaving it out is a specific,
 * common way for a scene to look wrong:
 *
 *   - no tone mapping        -> highlights clip to flat white
 *   - no scene.environment   -> chalky materials, black metals
 *   - one white light        -> flat, shapeless forms
 *   - unclamped pixelRatio   -> quartered frame rate on phones
 *   - THREE.Clock            -> deprecated in r183; Timer handles tab-out
 *   - composer without       -> washed-out grey image, because the renderer's
 *     OutputPass               tone mapping is bypassed and nothing replaces it
 *
 * Verified against three r185. Requires r155+ (physically correct lighting).
 *
 * Usage:
 *   import { createStage } from './scene-baseline.js';
 *   const stage = createStage(document.querySelector('#game'));
 *   stage.scene.add(myMesh);
 *   stage.start((dt, elapsed) => { myMesh.rotation.y += dt; });
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const DEFAULTS = {
  // Look
  background: 0x1b2230,
  fogColor: null,          // null -> matches background, which is what you want
  fogNear: 25,
  fogFar: 140,
  toneMapping: 'aces',     // 'aces' | 'agx' | 'neutral' | 'none'
  exposure: 1.0,
  environmentBlur: 0.04,   // raise toward 0.1+ for soft stylized ambient
  environmentIntensity: 1.0,

  // Lighting (warm key / cool fill / bright rim — see references/render-setup.md)
  keyColor: 0xfff0dd,
  keyIntensity: 2.5,
  fillColor: 0x88bbff,
  fillIntensity: 0.6,
  rimColor: 0xffffff,
  rimIntensity: 1.8,

  // Camera
  fov: 50,
  near: 0.1,
  far: 300,
  cameraPosition: [8, 6, 10],

  // Shadows
  shadows: true,
  softShadows: false,      // true -> VSMShadowMap; softer, but bleeds on thin geometry
  shadowMapSize: 2048,
  shadowRadius: 22,        // half-width of the shadow frustum; keep it tight

  // Post-processing
  postProcessing: true,
  bloomStrength: 0.35,
  bloomRadius: 0.4,
  bloomThreshold: 0.85,
  antialias: true,

  maxPixelRatio: 2,
};

const TONE_MAPPING = {
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping,
  none: THREE.NoToneMapping,
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Partial<typeof DEFAULTS>} [options]
 */
export function createStage(canvas, options = {}) {
  const o = { ...DEFAULTS, ...options };

  // --- Renderer -----------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    // MSAA only applies when rendering straight to the default framebuffer.
    // With a composer it does nothing, so we let SMAAPass handle it instead.
    antialias: o.antialias && !o.postProcessing,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, o.maxPixelRatio));
  renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  renderer.toneMapping = TONE_MAPPING[o.toneMapping] ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = o.exposure;

  if (o.shadows) {
    renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap is deprecated as of r185 and silently falls back to
    // PCFShadowMap. VSMShadowMap is the genuinely soft option, at the cost of
    // light bleeding on thin geometry.
    renderer.shadowMap.type = o.softShadows ? THREE.VSMShadowMap : THREE.PCFShadowMap;
  }

  // --- Scene --------------------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(o.background);
  scene.fog = new THREE.Fog(o.fogColor ?? o.background, o.fogNear, o.fogFar);

  // Image-based lighting with no HDRI download. This is the single largest
  // visual upgrade available for materials — without it MeshStandardMaterial
  // has nothing to reflect and renders chalky.
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromScene(new RoomEnvironment(), o.environmentBlur);
  scene.environment = envRT.texture;
  scene.environmentIntensity = o.environmentIntensity;

  // --- Camera -------------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(o.fov, aspectOf(renderer), o.near, o.far);
  camera.position.set(...o.cameraPosition);
  camera.lookAt(0, 0, 0);

  // --- Lights -------------------------------------------------------------
  // No AmbientLight: scene.environment already supplies ambient, and stacking
  // both flattens the image back out.
  const key = new THREE.DirectionalLight(o.keyColor, o.keyIntensity);
  key.position.set(5, 8, 3);

  if (o.shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(o.shadowMapSize, o.shadowMapSize);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    const d = o.shadowRadius;
    const c = key.shadow.camera;
    c.left = -d; c.right = d; c.top = d; c.bottom = -d;
    c.near = 1; c.far = 80;
    c.updateProjectionMatrix();
  }

  const fill = new THREE.DirectionalLight(o.fillColor, o.fillIntensity);
  fill.position.set(-4, 2, -3);

  const rim = new THREE.DirectionalLight(o.rimColor, o.rimIntensity);
  rim.position.set(-2, 4, -6);

  scene.add(key, fill, rim);

  // --- Post-processing ----------------------------------------------------
  // Order matters: HDR effects, then OutputPass (tone map + sRGB), then AA.
  let composer = null;
  if (o.postProcessing) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(
      new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
      o.bloomStrength, o.bloomRadius, o.bloomThreshold,
    ));
    composer.addPass(new OutputPass());
    if (o.antialias) composer.addPass(new SMAAPass());
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
  }

  // --- Resize -------------------------------------------------------------
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);   // forgetting this leaves post buffers stale
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Loop ---------------------------------------------------------------
  // THREE.Clock is deprecated as of r183. Timer additionally hooks the Page
  // Visibility API, so switching tabs no longer produces a multi-second delta
  // that teleports everything on the next frame.
  const timer = new THREE.Timer();
  timer.connect(document);
  let rafId = null;
  let onFrame = null;

  function tick(timestamp) {
    rafId = requestAnimationFrame(tick);
    timer.update(timestamp);
    onFrame?.(timer.getDelta(), timer.getElapsed());
    (composer ?? renderer).render(scene, camera);
  }

  return {
    renderer, scene, camera, composer,
    lights: { key, fill, rim },

    /** @param {(dt: number, elapsed: number) => void} [callback] */
    start(callback) {
      onFrame = callback ?? null;
      if (rafId === null) tick();
    },

    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },

    /** Enable shadows on everything added so far. Loaded GLTF meshes need this. */
    enableShadows(root = scene) {
      root.traverse((n) => {
        if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
      });
    },

    dispose() {
      this.stop();
      timer.dispose();
      window.removeEventListener('resize', resize);
      envRT.dispose();
      pmrem.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}

function aspectOf(renderer) {
  const size = renderer.getSize(new THREE.Vector2());
  return size.x / Math.max(size.y, 1);
}

export { DEFAULTS as STAGE_DEFAULTS };
