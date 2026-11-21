const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dist = path.join(__dirname, 'dist');
const srv = http.createServer((q, r) => { let u = q.url.split('?')[0]; if (u.endsWith('/')) u += 'index.html'; fs.readFile(path.join(dist, u), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.css') ? 'text/css' : 'text/html' }); r.end(d); }); }).listen(5180);
const which = (process.argv[2] || '1,2,3,4,5').split(',');
const steps = (process.argv[3] || 'home,note,ideas').split(',');
(async () => {
  const shots = path.join(__dirname, 'shots'); fs.mkdirSync(shots, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const id of which) {
    const p = await b.newPage({ viewport: { width: 1440, height: 860 } });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errs.push(m.text()); });
    await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await p.goto(`http://localhost:5180/d${id}/`);
    await p.waitForTimeout(9000);
    if (steps.includes('home')) await p.screenshot({ path: path.join(shots, `d${id}-1-home.png`) });
    if (steps.includes('note')) { await p.click('#btnList'); await p.waitForTimeout(700); await p.click('#listBody button >> nth=9'); await p.waitForTimeout(4500); await p.screenshot({ path: path.join(shots, `d${id}-2-note.png`) }); await p.keyboard.press('Escape'); await p.waitForTimeout(1500); }
    if (steps.includes('ideas')) { await p.click('#btnIdeas'); await p.waitForTimeout(1500); await p.screenshot({ path: path.join(shots, `d${id}-3-ideas.png`) }); await p.keyboard.press('Escape'); }
    if (steps.includes('alt')) { await p.click('#btnTheme'); await p.waitForTimeout(2500); await p.screenshot({ path: path.join(shots, `d${id}-4-alt.png`) }); }
    if (steps.includes('add')) { await p.fill('#addIn', 'https://ornek.com/makale'); await p.click('#addForm button'); await p.waitForTimeout(7500); await p.screenshot({ path: path.join(shots, `d${id}-5-add.png`) }); }
    console.log('d' + id, errs.join(' | ') || 'no errors');
    await p.close();
  }
  await b.close(); srv.close();
})();
