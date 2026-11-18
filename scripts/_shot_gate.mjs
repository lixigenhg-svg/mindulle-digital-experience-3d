import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForSelector('text=법당 열기', { timeout:70000 }).catch(()=>{});
await p.click('text=법당 열기', { timeout:25000 }).catch(()=>{});
await p.waitForTimeout(9000);
// 站在山门外石道上，朝向山门（即原截图的位置）
await p.evaluate(()=>window.__MD_TP__(0,52.5));
await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_FACE__(Math.PI));
await p.evaluate(()=>window.__MD_CAM__(7.4,0.18,0));
await p.waitForTimeout(2500);
await p.screenshot({ path:'/tmp/gate_after2.png', timeout:120000 });
console.log('拍完 山门外补景后');
await b.close();
