import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1200,height:760}})).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(String(e).slice(0,120)));
await p.goto('http://localhost:5297/3d/',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(6000);
await p.screenshot({path:'/tmp/oss_intro.png',timeout:90000});
console.log('pageerror:', errs.length, errs.slice(0,2));
await b.close();
