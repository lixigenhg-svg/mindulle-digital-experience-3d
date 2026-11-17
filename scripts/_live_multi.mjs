import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium', args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport:{width:1280,height:720} });
const count = async p => p.evaluate(() => (document.body.innerText.match(/\d+\/20/) || ['?'])[0]);

async function boot(page) {
  await page.goto('https://mindulle.kr/3d/', { waitUntil:'load', timeout:120000 });
  await page.waitForTimeout(12000);
  const ok = await page.evaluate(() => { if (window.__MD__?.enter) { window.__MD__.enter(); return 'api'; } return 'click'; });
  if (ok === 'click') {
    await page.evaluate(() => {
      const els = [...document.querySelectorAll('button,div,a')];
      const t = els.find(e => (e.textContent || '').trim() === '법당 열기');
      if (t) t.click();
    });
  }
  await page.waitForTimeout(12000);
}

const p1 = await ctx.newPage();
await boot(p1);
console.log('第 1 人进殿后人数:', await count(p1));

const p2 = await ctx.newPage();
await boot(p2);
await p1.waitForTimeout(3000);
console.log('第 2 人进殿后 → 第 1 页人数:', await count(p1));
console.log('第 2 人进殿后 → 第 2 页人数:', await count(p2));

const errs = await p2.evaluate(() => window.__netErrors || null);
console.log('第 2 页网络错误:', errs);
await b.close();
