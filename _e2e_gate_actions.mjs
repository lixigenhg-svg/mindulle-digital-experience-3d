import { chromium } from 'playwright';
const exe='/opt/vm/preinstall/ms-playwright/chromium-1169/chrome-linux/chrome';
const browser=await chromium.launch({executablePath:exe});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[]; page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('CORS')&&!m.text().includes('ERR_FAILED')) errors.push(m.text());}); page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
const now=Date.now();
await page.addInitScript(({now})=>{localStorage.setItem('mindulle.entered','1');localStorage.setItem('mindulle.pass',JSON.stringify({code:'123456',verified:true,unlockedAt:now,premiumUntil:now+30*86400000,privatePass:true,aura:'gold',lotus:true,nightUntil:0}));},{now});
await page.goto('http://127.0.0.1:5173/?room=pri-6633&region=apac',{waitUntil:'load'});
await page.waitForTimeout(1200);
console.log('GATE_BODY', JSON.stringify((await page.locator('body').innerText()).slice(0,240)));
await page.screenshot({path:'/tmp/test-gate.png',timeout:60000});
await page.fill('input[placeholder="000000"]','000000');
await page.click('button:has-text("금각 열기")');
await page.waitForTimeout(1200);
console.log('WRONG_BODY', JSON.stringify((await page.locator('body').innerText()).slice(0,300)));
console.log('STILL_GATE', await page.locator('input[placeholder="000000"]').count());
await page.fill('input[placeholder="000000"]','551049');
await page.click('button:has-text("금각 열기")');
await page.waitForTimeout(3000);
console.log('ENTER_BODY', JSON.stringify((await page.locator('body').innerText()).slice(0,260)));
await page.screenshot({path:'/tmp/test-room-actions.png',timeout:60000});
// tea full
await page.click('button:has-text("다실")');
await page.waitForTimeout(400);
let modal=(await page.locator('body').innerText());
console.log('TEA_STEP0', modal.includes('차 따르기'), modal.match(/금각의 다실[\s\S]{0,80}/)?.[0]);
await page.click('button:has-text("차 따르기")');
await page.waitForTimeout(300);
console.log('TEA_STEP1', (await page.locator('body').innerText()).includes('한 잔 들기'));
await page.click('button:has-text("한 잔 들기")');
await page.waitForTimeout(300);
console.log('TEA_STEP2', (await page.locator('body').innerText()).includes('차 마시기'));
await page.click('button:has-text("차 마시기")');
await page.waitForTimeout(300);
console.log('TEA_STEP3', (await page.locator('body').innerText()).includes('다시 따르기'));
await page.click('button:has-text("닫기")');
// lamp
await page.click('button:has-text("장명등")');
await page.waitForTimeout(300);
console.log('LAMP', (await page.locator('body').innerText()).match(/장명등[^\n]*/)?.[0]);
// mood 3 times
for(let i=0;i<3;i++){await page.click('button:has-text("분위기")'); await page.waitForTimeout(250);}
console.log('MOOD', (await page.locator('body').innerText()).match(/분위기 ·[^\n]*/)?.[0]);
// invite
await page.click('button:has-text("초대")');
await page.waitForTimeout(400);
const inv=await page.locator('body').innerText();
console.log('INVITE_LINK_NO_KEY', inv.includes('?room=pri-6633')&&!inv.includes('key='), 'KEY_SHOW', inv.includes('551049'), 'UNLIMITED', inv.includes('인원 제한이 없습니다'));
await page.screenshot({path:'/tmp/test-invite2.png',timeout:60000});
await page.click('[aria-label="닫기"]');
// photo click (does not assert download)
await page.click('button:has-text("기념")');
await page.waitForTimeout(800);
console.log('PHOTO_TOAST', (await page.locator('body').innerText()).slice(-120));
console.log('ERRORS', errors);
await browser.close();
