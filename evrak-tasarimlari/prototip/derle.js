// Prototipi derler: kaynak.html içindeki ic('ad') çağrılarında geçen Lucide ikonlarını gömer.
// Çıktılar: index.html (Artifact için, iskeletsiz) ve prototip.html (tarayıcıda doğrudan açılabilir).
// Kullanım: ICON_DIR=<lucide-static/icons> node derle.js [kaynak] [artifact-çıktısı] [tarayıcı-çıktısı]
// Örnek (Sade satır tasarımları): node derle.js sade.html sade/index.html sade-satirlar.html
const fs = require('fs');
const path = require('path');
const dir = process.env.ICON_DIR;
const [SRC = 'kaynak.html', OUT_A = 'index.html', OUT_B = 'prototip.html'] = process.argv.slice(2);
const src = fs.readFileSync(path.join(__dirname, SRC), 'utf8');
// koşullu çağrılar (ic(a?'sun':'moon')) da yakalansın diye: ikon dosyası olan her tırnaklı ad
const names = [...new Set([...src.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]))].filter((n) => fs.existsSync(path.join(dir, n + '.svg')));
const icons = {};
for (const n of names) {
  const f = path.join(dir, n + '.svg');
  const svg = fs.readFileSync(f, 'utf8');
  icons[n] = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>[\s\S]*$/, '').replace(/\s+/g, ' ').trim();
}
const out = src.replace('/*ICONS*/{}', JSON.stringify(icons));
fs.mkdirSync(path.dirname(path.join(__dirname, OUT_A)), { recursive: true });
fs.writeFileSync(path.join(__dirname, OUT_A), out);
fs.writeFileSync(
  path.join(__dirname, OUT_B),
  '<!doctype html>\n<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
    out.replace('<div id="root">', '</head><body>\n<div id="root">') + '\n</body></html>\n'
);
console.log('ikon:', names.length, 'boyut:', (out.length / 1024).toFixed(0) + ' KB');
