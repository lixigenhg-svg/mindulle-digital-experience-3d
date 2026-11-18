import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--force-device-scale-factor=2']});
const p = await (await b.newContext({viewport:{width:1200,height:500},deviceScaleFactor:2})).newPage();
await p.goto('file:///tmp/banner_temple2.html',{waitUntil:'load'});
await p.waitForTimeout(800);
await p.screenshot({path:'/tmp/banner_out.png', timeout:60000});
await b.close();
