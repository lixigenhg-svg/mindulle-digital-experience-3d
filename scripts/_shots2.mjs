import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1})).newPage();
const hide = () => p.evaluate(() => {
  const kill = (t) => document.querySelectorAll('div,span,p').forEach(el => {
    if (el.children.length === 0 && (el.textContent||'').includes(t)) el.style.display = 'none';
  });
  kill('연결이 끊어졌'); kill('연결이 끊'); kill('刷新页面');
});
await p.goto('http://localhost:5298/3d/',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(8000);
await p.screenshot({path:'/tmp/g_intro.png',timeout:120000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(12000);
await hide();
await p.evaluate(()=>window.__MD_TP__(0, 7.0)); await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_FACE__(0));
await p.evaluate(()=>window.__MD_FIXCAM__([0,2.3,11.0],[0,1.3,-2.6]));
await p.waitForTimeout(2500); await hide();
await p.screenshot({path:'/tmp/g_hall.png',timeout:120000});
await p.evaluate(()=>window.__MD_TP__(1.2, 3.2)); await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD_FIXCAM__([2.4,1.75,1.2],[0,1.5,-3.0]));
await p.waitForTimeout(2400); await hide();
await p.screenshot({path:'/tmp/g_buddha.png',timeout:120000});
await b.close();
