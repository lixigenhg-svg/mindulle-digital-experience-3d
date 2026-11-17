import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1400,height:800}})).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(String(e).slice(0,180)));
p.on('console', m=>{ if(m.type()==='error' && !m.text().includes('WebSocket') && !m.text().includes('404')) errs.push('[c]'+m.text().slice(0,150)); });
await p.goto('http://localhost:5296/3d/',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(4000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:90000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(9000);
const pos=()=>p.evaluate(()=>window.__MD_POS__?.());

// ① 坐下（此前会因 down 未定义而报错）
await p.evaluate(()=>window.__MD_TP__(0.95, 4.4));
await p.waitForTimeout(800);
await p.evaluate(()=>{ window.__MD__.force && window.__MD__.force('sitting'); });
await p.waitForTimeout(3000);
await p.evaluate(()=>window.__MD_FIXCAM__([1.3,1.6,6.4],[1.3,0.5,4.2]));
await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/smoke_sit.png',timeout:90000});
console.log('① sitting pos:', JSON.stringify(await pos()));

// ② 叩拜走位
await p.evaluate(()=>window.__MD_FIXCAM__());
await p.evaluate(()=>{ window.__MD__.force && window.__MD__.force('idle'); });
await p.waitForTimeout(600);
await p.click('[data-testid="action-bow"]');
await p.waitForTimeout(9000);
console.log('② bow pos:', JSON.stringify(await pos()), '期望垫心(±1.767/±2.945…, z≈1.74+0.9k)');

// ③ 庭院站定
await p.evaluate(()=>window.__MD_TP__(-7.0, 37.5));
await p.waitForTimeout(3000);
console.log('③ yard pos:', JSON.stringify(await pos()));
await p.evaluate(()=>window.__MD_FIXCAM__([-4.0,2.4,35.0],[-7.0,0.9,37.6]));
await p.waitForTimeout(1500);
await p.screenshot({path:'/tmp/smoke_yard.png',timeout:90000});
console.log('PAGE ERRORS:', errs.length, errs.slice(0,4));
await b.close();
