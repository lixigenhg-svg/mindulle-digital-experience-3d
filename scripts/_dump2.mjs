import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:720,height:900}});
await p.goto('http://localhost:5288/pose.html');
await p.waitForTimeout(4500);
console.log('bones', await p.evaluate(()=>window.__BONES__));
await p.evaluate(()=>window.__POSE__({mode:'pray', phase:0.2}));
await p.waitForTimeout(800);
console.log(await p.evaluate(()=>{
  const r = window.__REST__; return { keys:Object.keys(r||{}), upper: r && r['upper_arm.L'] };
}));
await b.close();
