const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { const f = path.join(dist, q.url === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); r.end(d); }); }).listen(5175);
(async () => {
  const shots = path.join(__dirname, 'shots');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p.addInitScript({ path: path.join(__dirname, 'mock.js') });
  await p.goto('http://localhost:5175/'); await p.waitForTimeout(3000);
  for (let i = 0; i < 9; i++) { await p.click('#btnAdd'); await p.fill('#addIn', 'Makale ' + i + ' metni burada'); await p.click('#addForm button[type=submit]'); await p.waitForSelector('body.split', { timeout: 30000 }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.waitForTimeout(5000);
  await p.screenshot({ path: path.join(shots, 'z1-uzak.png') });
  await p.click('#btnList'); await p.waitForTimeout(700); await p.click('#listBody button >> nth=2'); await p.waitForTimeout(3500);
  await p.screenshot({ path: path.join(shots, 'z3-secili.png') });
  await p.keyboard.press('Escape'); await p.waitForTimeout(2200);
  await p.mouse.move(720, 400);
  for (let i = 0; i < 9; i++) { await p.mouse.wheel(0, -200); await p.waitForTimeout(60); }
  await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(shots, 'z2-yakin.png') });
  console.log(errs.join('|') || 'no errors'); await b.close(); srv.close();
})();
