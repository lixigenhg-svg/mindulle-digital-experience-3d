import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/vm/preinstall/ms-playwright/chromium-1169/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const now = Date.now();
await page.addInitScript(({now}) => {
  localStorage.setItem('mindulle.entered','1');
  localStorage.setItem('mindulle.pass', JSON.stringify({ code:'123456', verified:true, unlockedAt: now, premiumUntil: now + 30*86400000, privatePass:true, aura:'gold', lotus:true, nightUntil:0 }));
}, {now});
await page.goto('http://127.0.0.1:5173/?room=pri-9999', { waitUntil:'load' });
await page.waitForTimeout(700);
await page.screenshot({ path:'/tmp/gate-server.png', timeout:60000 });
await page.fill('input[placeholder="000000"]', '123456');
await page.evaluate(() => document.querySelector('button')?.textContent);
await page.click('text=금각 열기');
await page.waitForTimeout(4500);
console.log('URL', page.url());
console.log('TEXT', (await page.locator('body').innerText()).slice(0,400));
await page.screenshot({ path:'/tmp/room-server.png', timeout:60000 });
await browser.close();
