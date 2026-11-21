const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { const f = path.join(dist, q.url === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); r.end(d); }); }).listen(5173);
(async () => {
  const shots = path.join(__dirname, 'shots'); fs.mkdirSync(shots, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p.addInitScript({ path: path.join(__dirname, 'mock.js') });
  await p.goto('http://localhost:5173/#ekle');
  await p.waitForTimeout(500);
  for (const t of ['Birinci makale metni yapay zeka ajanları hakkında', 'İkinci makale sağlık hakkında', 'Üçüncü makale fiyatlandırma']) {
    await p.fill('#inText', t);
    await p.click('#ingestBtn');
    await p.waitForSelector('.result-card', { timeout: 10000 });
    await p.waitForTimeout(300);
  }
  await p.screenshot({ path: path.join(shots, '1-ekle.png') });
  await p.goto('http://localhost:5173/#beyin'); await p.waitForTimeout(3500);
  await p.screenshot({ path: path.join(shots, '2-beyin.png') });
  await p.goto('http://localhost:5173/#notlar'); await p.waitForTimeout(300);
  await p.click('.note-item'); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(shots, '3-notlar.png'), fullPage: false });
  await p.goto('http://localhost:5173/#fikirler'); await p.waitForTimeout(300);
  await p.click('[data-iact="plan"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(shots, '4-fikirler.png') });
  const counts = await p.evaluate(() => document.querySelectorAll('.idea').length);
  console.log('ideas', counts);
  console.log(errs.join('\n') || 'no errors');
  await b.close(); srv.close();
})();
