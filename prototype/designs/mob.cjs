const { chromium, devices } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const dist = path.join(__dirname, 'dist');
const srv = http.createServer((q, r) => { let u = q.url.split('?')[0]; if (u.endsWith('/')) u += 'index.html'; fs.readFile(path.join(dist, u), (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.css') ? 'text/css' : 'text/html' }); r.end(d); }); }).listen(5181);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ ...devices['iPhone 14'] });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
  await p.goto('http://localhost:5181/d1/'); await p.waitForTimeout(9000);
  await p.screenshot({ path: path.join(__dirname, 'shots', 'm1-home.png') });
  await p.tap('#btnList'); await p.waitForTimeout(800); await p.tap('#listBody button >> nth=3'); await p.waitForTimeout(4500);
  await p.screenshot({ path: path.join(__dirname, 'shots', 'm1-note.png') });
  console.log(errs.join('|') || 'no errors'); await b.close(); srv.close();
})();
