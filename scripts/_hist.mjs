import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:720,height:900}});
await p.goto('http://localhost:5288/pose.html');
await p.waitForTimeout(5000);
console.log(await p.evaluate(()=>window.__HIST__));
await b.close();
