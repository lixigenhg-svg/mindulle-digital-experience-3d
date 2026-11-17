import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport:{width:1760,height:842}, deviceScaleFactor:2 });
await p.goto('file:///home/user/Doubao/chats/38453565767905538/sansa-temple/docs/_preview_donate_new.html',
  { waitUntil:'load', timeout:60000 });
await p.waitForTimeout(600);
await p.screenshot({ path:'/tmp/donate_new.png', fullPage:true, timeout:120000 });
console.log('OK');
await b.close();
