const { chromium, devices } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const srv = http.createServer((q, r) => { const f = path.join(dist, q.url === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); r.end(d); }); }).listen(5173);
(async () => {
  const shots = path.join(__dirname, 'shots'); fs.mkdirSync(shots, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/net::|ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p.addInitScript({ path: path.join(__dirname, 'mock.js') });
  const shot = (n) => p.screenshot({ path: path.join(shots, n + '.png') });
  await p.goto('http://localhost:5173/'); await p.waitForTimeout(6000);
  await shot('1-bos');
  const texts = ['Birinci makale metni yapay zeka ajanları hakkında uzun bir yazı', 'İkinci makale sağlık ve teşhis hakkında', 'Üçüncü makale fiyatlandırma stratejisi', 'Dördüncü makale yine ajanlar', 'Beşinci makale sağlık', 'Altıncı makale girişim'];
  for (let i = 0; i < texts.length; i++) {
    await p.click('#btnAdd'); await p.fill('#addIn', texts[i]);
    if (i === 0) { await p.waitForTimeout(400); await shot('2-ekle-acik'); }
    await p.click('#addForm button[type=submit]');
    if (i === 1) { await p.waitForTimeout(1500); await shot('3-isleniyor'); }
    await p.waitForSelector('body.split', { timeout: 30000 });
    await p.waitForTimeout(600);
  }
  await p.waitForTimeout(3500); await shot('4-not');
  await p.click('#note [data-act="edit"]'); await p.waitForTimeout(500); await shot('5-duzenle');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(3500);
  await shot('6-ana');
  await p.click('#btnList'); await p.waitForTimeout(900); await shot('7-liste');
  await p.click('#btnIdeas'); await p.waitForTimeout(1200);
  await p.click('[data-iact="plan"]'); await p.waitForTimeout(900); await shot('8-fikirler');
  await p.click('#btnProfile'); await p.waitForTimeout(900); await shot('9-profil');
  await p.keyboard.press('Escape'); await p.click('#btnTheme'); await p.waitForTimeout(2500); await shot('10-acik');
  console.log('notes', await p.evaluate(() => document.querySelectorAll('.nlabel').length));
  console.log(errs.join('\n') || 'no errors');
  await b.close(); srv.close();
})();
