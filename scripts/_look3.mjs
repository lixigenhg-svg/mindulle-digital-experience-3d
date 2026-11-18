import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
p.on('console', m=>{if(m.type()==='error')console.log('ERR:',m.text().slice(0,200));});
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(7000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(16000);
const shots=[[0,3.2,0,'a'],[5.5,10,-0.5,'b'],[-5.5,10,0.5,'c']];
for(const [x,z,f,n] of shots){
  await p.evaluate(([x,z,f])=>{window.__MD_TP__(x,z); window.__MD_FACE__(f);},[x,z,f]);
  await p.waitForTimeout(2200);
  await p.screenshot({path:`/tmp/lk_${n}.png`});
}
await b.close();
