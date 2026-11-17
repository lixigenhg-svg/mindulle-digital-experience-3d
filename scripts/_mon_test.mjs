import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium', args:['--no-sandbox'] });

// —— 成功态：注入假健康数据，模拟人数在 4~9 之间波动 ——
const ctx = await b.newContext({ viewport:{width:1180,height:900} });
await ctx.addInitScript(() => {
  let n = 0;
  const orig = window.fetch;
  window.fetch = async (u) => {
    if (!String(u).includes('ws-health')) return orig(u);
    n++;
    const online = 4 + Math.round(3 * Math.sin(n / 3) + Math.sin(n)*1.2);
    const body = {
      ok:true, uptimeSec: 3600*27 + 950,
      rooms: 2, online: online, peak: 11, joins: 63, rejected: 2, dropped: 0,
      capacity: 20, rssMB: 12 + (n % 4), heapMB: 9,
      roomDetail: [ {roomId:'apac:maru-01:0', count: Math.max(0, online-1)}, {roomId:'global:maru-01:0', count: 1} ]
    };
    return new Response(JSON.stringify(body), { status:200, headers:{'Content-Type':'application/json'} });
  };
});
const p = await ctx.newPage();
await p.goto('file:///tmp/mon.html');
await p.waitForTimeout(1200);
// 先快速灌 25 个点，让曲线有形状
for (let i=0;i<25;i++) { await p.evaluate(() => document.getElementById('now').click()); await p.waitForTimeout(160); }
await p.waitForTimeout(900);
await p.screenshot({ path:'/tmp/mon_ok.png', fullPage:true });
await p.setViewportSize({ width:390, height:844 });
await p.waitForTimeout(600);
await p.screenshot({ path:'/tmp/mon_mobile.png', fullPage:true });
await ctx.close();

// —— 失败态：不注入，走真接口（线上无 CORS）——
const ctx2 = await b.newContext({ viewport:{width:1180,height:760} });
const p2 = await ctx2.newPage();
await p2.goto('file:///tmp/mon.html');
await p2.waitForTimeout(3500);
await p2.screenshot({ path:'/tmp/mon_err.png' });
console.log('done');
await b.close();
