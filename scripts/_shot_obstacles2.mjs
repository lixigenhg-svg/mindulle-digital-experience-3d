import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
await p.goto('http://localhost:5296/3d/',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(3000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:90000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(15000);
const pos=()=>p.evaluate(()=>window.__MD_POS__?.());
const walk=async(x,z,ms)=>{ await p.evaluate(([X,Z])=>window.__MD_WALK__(X,Z),[x,z]); await p.waitForTimeout(ms); return pos(); };

await p.evaluate(()=>window.__MD_TP__(-6.6, 39.2));
await p.waitForTimeout(600);
console.log('tree: start(-6.6,39.2) -> walk to tree(-6.6,36.6) =>', JSON.stringify(await walk(-6.6,36.6,3200)));

await p.evaluate(()=>window.__MD_TP__(-5.4, 31.0));
await p.waitForTimeout(600);
console.log('lantern: walk to (-5.4,34.2) =>', JSON.stringify(await walk(-5.4,34.2,3400)));

await p.evaluate(()=>window.__MD_TP__(2.2, -0.6));
await p.waitForTimeout(600);
console.log('behind buddha: walk to (0,-4) =>', JSON.stringify(await walk(0,-4,4200)));
await p.evaluate(()=>window.__MD_FIXCAM__([0.6,2.4,3.2],[0.4,1.1,-1.6]));
await p.waitForTimeout(1500);
await p.screenshot({path:'/tmp/obst_buddha.png', timeout:90000});

await p.evaluate(()=>window.__MD_TP__(0.95, 3.2));
await p.waitForTimeout(600);
await p.evaluate(()=>window.__MD_FIXCAM__([1.3,2.3,7.0],[1.3,0.4,3.0]));
await p.click('[data-testid="action-bow"]');
await p.waitForTimeout(13000);
console.log('bow settle =>', JSON.stringify(await pos()));
await p.screenshot({path:'/tmp/bow_new.png', timeout:90000});
await b.close();
