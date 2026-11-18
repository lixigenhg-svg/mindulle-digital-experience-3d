import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:800,height:520}})).newPage();
await p.goto('http://localhost:5296/3d/',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(4000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:90000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(6000);
const pos=()=>p.evaluate(()=>window.__MD_POS__?.());
// 用点击地面移动（和真实玩家一致）：先站位，再点“长椅另一侧”
for (const [name, tx, tz] of [['长椅中心(-7.2,37.5)', -7.2, 37.5], ['长椅北侧(-7.2,41.5)', -7.2, 41.5]]) {
  await p.evaluate(([x,z])=>window.__MD_TP__(x, z-1.6), [tx, tz]);
  await p.waitForTimeout(600);
  await p.evaluate(([x,z])=>window.__MD_WALK__(x, z), [tx, tz]);
  await p.waitForTimeout(6000);
  console.log(name, '→', JSON.stringify(await pos()));
}
await b.close();
