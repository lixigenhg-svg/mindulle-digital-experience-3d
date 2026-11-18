import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1})).newPage();
const zh = async (tag) => {
  const m = await p.evaluate(()=>{const t=document.body.innerText||'';const r=t.match(/[\u4e00-\u9fa5]+/g);return r?Array.from(new Set(r)).slice(0,40):[];});
  console.log('['+tag+'] 中文:', JSON.stringify(m));
  return m;
};
const clickBtn = async (t) => {
  const r = await p.evaluate((t)=>{
    const norm=s=>(s||'').replace(/\s+/g,'');
    const bs=[...document.querySelectorAll('button')].filter(b=>norm(b.innerText).includes(norm(t)));
    if(!bs.length) return 'none';
    bs[0].click(); return 'ok:'+bs.length;
  }, t);
  await p.waitForTimeout(1200);
  return r;
};
await p.goto('http://localhost:5298/3d/',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(8000);
await zh('intro');
await p.evaluate(()=>window.__MD__ && window.__MD__.enter());
await p.waitForTimeout(8000);
console.log('복전함 click =', await clickBtn('복전함')); await zh('donation'); await p.screenshot({path:'/tmp/u2_donation.png',timeout:120000});
console.log('닫기 click =', await clickBtn('닫기'));
console.log('연등걸기 click =', await clickBtn('연등 걸기')); await zh('wish'); await p.screenshot({path:'/tmp/u2_wish.png',timeout:120000});
console.log('닫기 click =', await clickBtn('닫기'));
await p.evaluate(()=>window.__MD__ && window.__MD__.openMala()); await p.waitForTimeout(1400); await zh('mala'); await p.screenshot({path:'/tmp/u2_mala.png',timeout:120000});
await p.evaluate(()=>window.__MD__ && window.__MD__.closeMala());
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='설정'); b&&b.click();});
await p.waitForTimeout(1400); await zh('settings'); await p.screenshot({path:'/tmp/u2_settings.png',timeout:120000});
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='닫기'); b&&b.click();});
await p.waitForTimeout(800);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.getAttribute('aria-label')==='서버 선택'); b&&b.click();});
await p.waitForTimeout(1400); await zh('server'); await p.screenshot({path:'/tmp/u2_server.png',timeout:120000});
await b.close();
