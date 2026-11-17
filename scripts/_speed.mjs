import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
async function test(url, label){
  const ctx = await b.newContext({ viewport:{width:1280,height:800} });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:60,downloadThroughput:3*1024*1024/8,uploadThroughput:1*1024*1024/8});
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  let bytes = 0, reqs = 0;
  p.on('response', async r => { reqs++; try { bytes += (await r.body()).length; } catch {} });
  const t0 = Date.now();
  await p.goto(url,{waitUntil:'load', timeout:120000});
  const tLoad = Date.now()-t0;
  let tReady = null;
  try {
    await p.waitForFunction(()=>!!window.__MD__, null, {timeout:60000});
    tReady = Date.now()-t0;
  } catch {}
  console.log(`${label}: load=${(tLoad/1000).toFixed(1)}s ready=${tReady?(tReady/1000).toFixed(1)+'s':'timeout'} reqs=${reqs} bytes=${(bytes/1048576).toFixed(1)}MB`);
  await ctx.close();
}
await test('http://localhost:5290/', '单文件版');
await test('http://localhost:5291/', '分文件版');
await b.close();
