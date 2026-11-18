import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:800,height:520}})).newPage();
await p.goto('http://localhost:5296/3d/',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(4000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:90000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(6000);
const pos=()=>p.evaluate(()=>window.__MD_POS__?.());
const nudge=async()=>{ await p.keyboard.down('KeyW'); await p.waitForTimeout(4000); await p.keyboard.up('KeyW'); await p.waitForTimeout(1500); };

await p.evaluate(()=>window.__MD_TP__(-8.8, 36.6)); await nudge();
console.log('①树 -8.8,36.6 →', JSON.stringify(await pos()), '期望距树心≥0.62');
await p.evaluate(()=>window.__MD_TP__(6.32, 10.23)); await nudge();
console.log('②柱 6.32,10.23 →', JSON.stringify(await pos()), '期望距≥0.74');
await p.evaluate(()=>window.__MD_TP__(-7.2, 37.5)); await nudge();
console.log('③长椅 -7.2,37.5 →', JSON.stringify(await pos()), '期望 z或x 偏移≥0.68');
await b.close();
