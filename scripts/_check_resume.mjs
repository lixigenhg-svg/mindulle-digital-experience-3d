import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,100)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(13000);
// 第一次：点进入，走到殿前，然后刷新
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(4000);
await p.evaluate(() => window.__MD_TP__(0, 40));
await p.waitForTimeout(2500);
const before = await p.evaluate(() => window.__MD__.getSnapshot());
console.log('刷新前 z=', before?.player?.z?.toFixed?.(1) ?? before?.z);
await p.reload({ waitUntil:'load' });
await p.waitForTimeout(13000);
const st = await p.evaluate(() => ({
  intro: !!document.querySelector('[data-testid="intro"]') || document.body.innerText.includes('입장'),
  z: window.__MD__.getSnapshot()?.player?.z,
  enteredLS: localStorage.getItem('mindulle.entered'),
}));
console.log('刷新后：封面出现?', st.intro, ' z=', st.z?.toFixed?.(1), ' 记忆标记=', st.enteredLS);
console.log('报错:', errs.length, errs.slice(0,2));
await b.close();
