import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,100)));
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(12000);
// 走真实路径：点封面上的"법당 열기"按钮
const btn = await p.$('button');
const introBtn = await p.evaluate(() => {
  const bs=[...document.querySelectorAll('button')].map(b=>b.innerText.trim());
  return bs;
});
console.log('封面按钮:', introBtn);
await p.click('text=법당 열기');
await p.waitForTimeout(3000);
console.log('点完：记忆标记 =', await p.evaluate(()=>localStorage.getItem('mindulle.entered')));
// 走两步再刷新
await p.evaluate(() => window.__MD_TP__(0, 40));
await p.waitForTimeout(2200);
await p.reload({ waitUntil:'load' });
await p.waitForTimeout(12000);
const st = await p.evaluate(() => ({
  cover: [...document.querySelectorAll('button')].some(b=>b.innerText.includes('법당 열기')),
  z: window.__MD__.getSnapshot()?.player?.z,
  mark: localStorage.getItem('mindulle.entered'),
}));
console.log('刷新后：又出封面?', st.cover, ' z=', st.z?.toFixed?.(1), ' 标记=', st.mark, ' 报错=', errs.length);
await b.close();
