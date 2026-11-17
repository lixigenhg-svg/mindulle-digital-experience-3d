import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
p.on('pageerror', e => console.log('PAGEERR:', String(e).slice(0,200)));
const t0 = Date.now();
await p.goto('file:///home/user/Doubao/chats/38453565767905538/temple-app-3d.html',{waitUntil:'load'});
await p.waitForTimeout(4000);
await p.evaluate(()=>window.__MD__ && window.__MD__.enter());
for (let i=0;i<3;i++){ await p.waitForTimeout(5000); console.log('t+',((Date.now()-t0)/1000).toFixed(0)); }
await p.evaluate(()=>{window.__MD_TP__(0,4);window.__MD_FACE__(0);});
await p.waitForTimeout(3000);
await p.screenshot({path:'/tmp/pr2.png'});
await b.close();
