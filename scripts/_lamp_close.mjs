import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
await p.route('**/temple/lamp-list.php*', async route => {
  const r = await p.request.get('https://mindulle.kr/temple/lamp-list.php');
  await route.fulfill({ status:200, contentType:'application/json; charset=utf-8', body: await r.text() });
});
await p.goto('http://localhost:5298/3d/',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(9000);
await p.evaluate(function(){ window.__MD__.enter(); });
await p.waitForTimeout(12000);
await p.evaluate(function(){ window.__MD_TP__(-3.0, 36.2); });
await p.waitForTimeout(2200);
await p.evaluate(function(){ window.__MD_FIXCAM__([-2.9,1.55,36.6],[-5.3,1.42,34.25]); });
await p.waitForTimeout(3000);
await p.screenshot({path:'/tmp/lamp_close.png',timeout:120000});
console.log('ok');
await b.close();
