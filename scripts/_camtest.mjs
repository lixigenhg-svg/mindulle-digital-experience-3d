import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(7000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(14000);
await p.evaluate(()=>{window.__MD_TP__(0,0.6); window.__MD_FACE__(0); window.__MD_SCALE__(1.15);});
await p.waitForTimeout(1200);
const shots = [
  ['s',[2.20,1.65,3.90],[0.10,1.00,-0.30]],
  ['t',[1.80,1.55,3.80],[0.05,1.00,-0.35]],
  ['u',[2.60,1.70,4.40],[0.15,1.00,-0.30]],
];
for (const [n,pp,t] of shots) {
  await p.evaluate(([pp,t])=>window.__MD_FIXCAM__(pp,t),[pp,t]);
  await p.waitForTimeout(1600);
  await p.screenshot({path:`/tmp/cam_${n}.png`});
}
await b.close();
