// png/ klasöründeki ekran görüntülerini prototipten (prototip/prototip.html) yeniden üretir.
const { chromium } = require('playwright');
const path = require('path');
const names = ['01-sade','02-lacivert','03-gece','04-cizgi','05-posta','06-proje-rayi','07-kurumsal','08-ust-serit','09-cam','10-arama'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + path.resolve(__dirname, 'prototip/prototip.html'));
  await p.evaluate(() => { try { localStorage.removeItem('evrak-sbw'); } catch (e) {} });
  await p.reload(); await p.waitForTimeout(500);
  await p.click('[data-a="swhide"]');
  for (let i = 0; i < names.length; i++) {
    await p.evaluate((i) => applyDesign(i), i);
    await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(__dirname, 'png', names[i] + '.png') });
  }
  await p.evaluate(() => applyDesign(0));
  await p.click('[data-a="new"]'); await p.click('[data-a="sample"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'png', '11-kayit-akisi.png') });
  await b.close();
})();
