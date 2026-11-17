import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1})).newPage();
const zh = async (tag) => {
  const m = await p.evaluate(()=>{const t=document.body.textContent||'';const r=t.match(/[\u4e00-\u9fa5]+/g);return r?Array.from(new Set(r)).slice(0,40):[];});
  console.log('['+tag+'] 中文:', JSON.stringify(m));
};
const clickBtn = async (t) => {
  const r = await p.evaluate((t)=>{
    const norm=s=>(s||'').replace(/\s+/g,'');
    const bs=[...document.querySelectorAll('button')].filter(b=>norm(b.textContent).includes(norm(t)));
    if(!bs.length) return 'none';
    bs[0].click(); return 'ok';
  }, t);
  await p.waitForTimeout(1300);
  return r;
};
await p.goto('http://localhost:5298/3d/',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(8000);
await p.evaluate(()=>window.__MD__ && window.__MD__.enter());
await p.waitForTimeout(8000);
const btns = await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>(b.textContent||'').trim().slice(0,14)).slice(0,40));
console.log('页面按钮文本:', JSON.stringify(btns));
console.log('복전함 =', await clickBtn('복전함')); await zh('donation'); await p.screenshot({path:'/tmp/u3_donation.png',timeout:120000});
await clickBtn('닫기');
console.log('연등 =', await clickBtn('연등 걸기')); await zh('wish'); await p.screenshot({path:'/tmp/u3_wish.png',timeout:120000});
await clickBtn('닫기');
await zh('back');
await b.close();
