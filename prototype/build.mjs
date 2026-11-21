import { build } from 'esbuild';
import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2022'],
  outfile: 'dist/app.js',
  legalComments: 'none',
  logLevel: 'info',
  supported: { 'top-level-await': false },
});
writeFileSync('dist/index.html', readFileSync('src/index.html', 'utf8'));
copyFileSync('src/style.css', 'dist/style.css');
