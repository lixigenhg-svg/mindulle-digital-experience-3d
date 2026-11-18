import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1280,height:760}})).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(String(e).slice(0,120)));
await p.goto('http://localhost:5296/3d/',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(3000);
// 模拟老访客：旧键里有许愿灯，新键为空
await p.evaluate(()=>{
  const LEGACY = ['sa','nsa'].join('') + '_wishes_v2';
  localStorage.removeItem('temple_wishes_v2');
  localStorage.setItem(LEGACY, JSON.stringify([{text:'가족 무사', at:1, remote:false}]));
});
await p.reload({waitUntil:'load'});
await p.waitForTimeout(6000);
const st = await p.evaluate(()=>{
  const LEGACY = ['sa','nsa'].join('') + '_wishes_v2';
  return { newKey: localStorage.getItem('temple_wishes_v2'), legacy: localStorage.getItem(LEGACY) };
});
console.log('迁移结果:', JSON.stringify(st).slice(0,160));
await p.waitForFunction(()=>window.__MD__,null,{timeout:60000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(8000);
await p.evaluate(()=>window.__MD_TP__(0, 2.4));
await p.waitForTimeout(1200);
await p.click('[data-testid="action-wish"]');
await p.waitForTimeout(1500);
const hasInput = await p.locator('[data-testid="wish-modal"]').count();
console.log('许愿弹窗输入框:', hasInput, '| pageerror:', errs.length, errs.slice(0,2));
await b.close();
