import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const p = await (await b.newContext({viewport:{width:1200,height:720},deviceScaleFactor:2})).newPage();
await p.goto('file:///tmp/poster_ansi2.html',{waitUntil:'load'});
await p.waitForTimeout(900);
await p.screenshot({path:'/tmp/ansi_poster.png', timeout:60000});
await b.close();
