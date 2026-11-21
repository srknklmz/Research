const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { const f = path.join(dist, q.url === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); r.end(d); }); }).listen(5174);
(async () => {
  const shots = path.join(__dirname, 'shots');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p.addInitScript({ path: path.join(__dirname, 'mock.js') });
  await p.goto('http://localhost:5174/#ekle'); await p.waitForTimeout(400);
  for (let i = 0; i < 6; i++) { await p.fill('#inText', 'Makale ' + i + ' içerik metni'); await p.click('#ingestBtn'); await p.waitForSelector('.result-card'); await p.evaluate(() => document.querySelector('#ingestResult').innerHTML=''); }
  await p.click('a[data-view="beyin"]'); await p.waitForTimeout(6000);
  await p.screenshot({ path: path.join(shots, '5-beyin.png') });
  await p.click('#themeBtn'); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(shots, '6-beyin-light.png') });
  console.log(errs.join('\n') || 'no errors');
  await b.close(); srv.close();
})();
