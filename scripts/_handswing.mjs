import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ viewport:{width:900,height:600}, deviceScaleFactor:1 });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1500);
await p.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'})));
for (let i=0;i<8;i++){
  await p.waitForTimeout(700);
  const r = await p.evaluate(()=>{const o={};window.__SCENE__.traverse(b=>{if(b.isBone&&['handL','handR'].includes(b.name)){const v=new b.position.constructor();b.getWorldPosition(v);o[b.name]=[+v.x.toFixed(2),+v.y.toFixed(2),+v.z.toFixed(2)];}});return o;});
  console.log(i, JSON.stringify(r));
}
await b.close();
