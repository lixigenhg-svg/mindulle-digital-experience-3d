import { chromium } from '@playwright/test';
const b=await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p=await b.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
p.on('pageerror',e=>console.log('ERR',e.message.slice(0,160)));
p.on('console',m=>{ if(m.type()==='error') console.log('LOG',m.text().slice(0,140)); });
await p.goto('file:///home/user/Doubao/chats/38453565767905538/temple-app-demo.html');
await p.waitForTimeout(6000);
await p.screenshot({path:'/tmp/solo-intro.png'});
try { await p.getByTestId('enter-button').click({timeout:8000}); } catch(e){ console.log('no enter btn'); }
await p.waitForTimeout(6000);
await p.screenshot({path:'/tmp/solo-hall.png'});
await b.close();
