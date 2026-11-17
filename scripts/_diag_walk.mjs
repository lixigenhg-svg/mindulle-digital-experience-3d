import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
await p.goto('http://localhost:5296/3d/',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(3000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:90000});
await p.evaluate(()=>window.__MD__.enter());
const pos=()=>p.evaluate(()=>window.__MD_POS__?.());
for (const wait of [8000, 12000, 18000, 24000]) {
  await p.waitForTimeout(wait - (wait===8000?0:16000));
}
console.log('pos after 24s:', JSON.stringify(await pos()));
// 键盘测试
await p.evaluate(()=>window.__MD_TP__(0, 6));
await p.waitForTimeout(500);
await p.keyboard.down('KeyW'); await p.waitForTimeout(1200); await p.keyboard.up('KeyW');
await p.waitForTimeout(300);
console.log('after keyboard W:', JSON.stringify(await pos()));
// walk 接口测试
await p.evaluate(()=>window.__MD_WALK__(0, 10));
await p.waitForTimeout(2500);
console.log('after WALK(0,10):', JSON.stringify(await pos()));
await b.close();
