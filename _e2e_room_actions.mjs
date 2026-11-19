import { chromium } from 'playwright';
const exe='/opt/vm/preinstall/ms-playwright/chromium-1169/chrome-linux/chrome';
const browser=await chromium.launch({executablePath:exe});
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
const errors=[]; page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('CORS')&&!m.text().includes('ERR_FAILED')) errors.push(m.text());}); page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
const now=Date.now();
await page.addInitScript(({now})=>{localStorage.setItem('mindulle.entered','1');localStorage.setItem('mindulle.pass',JSON.stringify({code:'123456',verified:true,unlockedAt:now,premiumUntil:now+30*86400000,privatePass:true,aura:'gold',lotus:true,nightUntil:0}));},{now});
await page.goto('http://127.0.0.1:5173/?room=pri-6633&region=apac',{waitUntil:'load'});
await page.fill('input[placeholder="000000"]','551049');
await page.click('button:has-text("금각 열기")');
await page.waitForTimeout(2200);
// tea
await page.click('button:has-text("다실")'); await page.waitForTimeout(300);
console.log('TEA0', (await page.locator('body').innerText()).includes('차 따르기'));
await page.click('button:has-text("차 따르기")'); await page.waitForTimeout(250);
console.log('TEA1', (await page.locator('body').innerText()).includes('한 잔 들기'));
await page.click('button:has-text("한 잔 들기")'); await page.waitForTimeout(250);
console.log('TEA2', (await page.locator('body').innerText()).includes('차 마시기'));
await page.click('button:has-text("차 마시기")'); await page.waitForTimeout(250);
console.log('TEA3', (await page.locator('body').innerText()).includes('다시 따르기'));
await page.click('button:has-text("닫기")'); await page.waitForTimeout(250);
// wish
await page.click('button:has-text("서원")'); await page.waitForTimeout(250);
await page.fill('textarea','가족의 건강을 빕니다');
await page.click('button:has-text("남기기")'); await page.waitForTimeout(250);
console.log('WISH', (await page.locator('body').innerText()).includes('서원을 금각에 남겼습니다'));
// invite & close via outside
await page.click('button:has-text("초대")'); await page.waitForTimeout(300);
const inv=await page.locator('body').innerText();
console.log('INVITE', inv.includes('?room=pri-6633'), inv.includes('551049'), inv.includes('인원 제한이 없습니다'));
await page.screenshot({path:'/tmp/test-invite3.png',timeout:60000});
await page.mouse.click(30,30); await page.waitForTimeout(300);
console.log('MODAL_CLOSED', !(await page.locator('text=초대하기').count()));
// photo download
const dlPromise=page.waitForEvent('download',{timeout:10000}).catch(()=>null);
await page.click('button:has-text("기념")');
const dl=await dlPromise;
console.log('PHOTO_DOWNLOAD', dl?dl.suggestedFilename():'NO_DOWNLOAD');
if(dl){const path=await dl.path(); console.log('PHOTO_PATH',path);}
await page.waitForTimeout(400);
console.log('PHOTO_TOAST', (await page.locator('body').innerText()).includes('사진을 저장했습니다'));
console.log('ERRORS',errors);
await browser.close();
