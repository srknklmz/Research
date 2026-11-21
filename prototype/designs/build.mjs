import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { DESIGNS } from './themes.js';

mkdirSync('dist', { recursive: true });
await build({ entryPoints: ['preview.js'], bundle: true, minify: true, format: 'iife', target: ['es2022'], outfile: 'dist/app.js', legalComments: 'none', logLevel: 'info' });
const tpl = readFileSync('index.html', 'utf8');
for (const [id, d] of Object.entries(DESIGNS)) {
  mkdirSync(`dist/d${id}`, { recursive: true });
  writeFileSync(`dist/d${id}/index.html`, tpl.replace('__TITLE__', `Sinaps · ${d.name}`).replace('__FONTS__', d.fontUrl.replace(/&/g, '&amp;')).replace('__ID__', id));
  copyFileSync('dist/app.js', `dist/d${id}/app.js`);
  copyFileSync('style.css', `dist/d${id}/style.css`);
}
