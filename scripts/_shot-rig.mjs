import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:720,height:900}});
p.on('pageerror', e=>console.log('ERR', e.message.slice(0,160)));
await p.goto('http://localhost:5288/pose.html');
await p.waitForTimeout(4500);
await p.evaluate(()=>window.__POSE__({useSculpt:false}));
for (const m of ['idle','walk','pray','bow','sit','woodfish']) {
  await p.evaluate(mm=>window.__POSE__({mode:mm, phase:0.25}), m);
  await p.waitForTimeout(600);
  await p.screenshot({path:`/tmp/r-${m}.png`});
}
await b.close();
