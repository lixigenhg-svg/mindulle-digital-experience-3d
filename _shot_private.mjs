import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/vm/preinstall/ms-playwright/chromium-1169/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const now = Date.now();
await page.addInitScript(({now}) => {
  localStorage.setItem('mindulle.entered','1');
  localStorage.setItem('mindulle.pass', JSON.stringify({ code:'123456', verified:true, unlockedAt: now, premiumUntil: now + 30*86400000, privatePass:true, aura:'gold', lotus:true, nightUntil:0 }));
  localStorage.setItem('mindulle.private.rooms', JSON.stringify({ 'pri-9999': { room:'pri-9999', key:'123456', createdAt: now } }));
}, {now});
await page.goto('http://127.0.0.1:5173/?room=pri-9999', { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.screenshot({ path: '/tmp/private-gate.png' });
await page.fill('input[placeholder="000000"]', '123456');
await page.click('text=금각 열기');
await page.waitForTimeout(4500);
await page.screenshot({ path: '/tmp/private-room.png' });
console.log('done', await page.title());
await browser.close();
