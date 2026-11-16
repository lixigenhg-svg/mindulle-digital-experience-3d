/**
 * 截图脚本：构建产物 → vite preview → Playwright 截桌面/移动端入口、法堂、佛珠面板。
 * 运行：npm run build && npm run screenshots
 */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const PORT = 28174;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = 'docs/screenshots';

const wait = ms => new Promise(r => setTimeout(r, ms));

async function waitForServer(timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      // 服务尚未就绪
    }
    await wait(500);
  }
  throw new Error('preview server not ready');
}

const server = spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: false
});

try {
  await mkdir(OUT, { recursive: true });
  await waitForServer();

  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']
  });

  const shot = async (context, nums, isMobile) => {
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForFunction(() => Boolean(window.__MD__));
    await wait(2200);
    await page.screenshot({ path: `${OUT}/${nums[0]}-intro-${isMobile ? 'mobile' : 'desktop'}.png` });

    const enter = page.getByTestId('enter-button');
    if (isMobile) await enter.tap();
    else await enter.click();
    await page.waitForFunction(() => window.__MD__.getSnapshot().scene.ready);
    await wait(2600);
    await page.screenshot({ path: `${OUT}/${nums[1]}-hall-${isMobile ? 'mobile' : 'desktop'}.png` });

    const beads = page.getByTestId('action-beads');
    if (isMobile) await beads.tap();
    else await beads.click();
    for (let i = 0; i < 3; i++) await page.getByTestId('mala-step').click({ force: true });
    await wait(600);
    await page.screenshot({ path: `${OUT}/${nums[2]}-mala-${isMobile ? 'mobile' : 'desktop'}.png` });
    await page.close();
  };

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await shot(desktop, ['01', '02', '03'], false);

  // v1.1 新增：三路音量设置面板 + 真实骨骼模型跪拜姿态
  const page = await desktop.newPage();
  await page.goto(BASE);
  await page.waitForFunction(() => Boolean(window.__MD__));
  await page.getByTestId('enter-button').click();
  await page.waitForFunction(() => window.__MD__.getSnapshot().scene.ready);
  await wait(2600);
  await page.getByTestId('settings-button').click();
  await wait(700);
  await page.screenshot({ path: `${OUT}/11-settings-desktop.png` });
  await page.getByTestId('settings-modal').getByLabel('关闭').click();
  // 绕到侧前方再跪拜，否则背面视角看不出前俯
  await page.mouse.move(720, 400);
  await page.mouse.down();
  await page.mouse.move(460, 400, { steps: 16 });
  await page.mouse.up();
  await wait(700);
  await page.getByTestId('action-bow').click();
  await wait(3000);
  await page.screenshot({ path: `${OUT}/12-bow-desktop.png` });
  // 童僧形象肖像：绕到正面，裁切腰部以上（用于 README 与形象对照）
  const portraitCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const portrait = await portraitCtx.newPage();
  await portrait.goto(BASE);
  await portrait.waitForFunction(() => Boolean(window.__MD__));
  await portrait.getByTestId('enter-button').click();
  await portrait.waitForFunction(() => window.__MD__.getSnapshot().scene.ready);
  await wait(2400);
  await portrait.mouse.move(700, 500);
  for (let i = 0; i < 2; i++) { await portrait.mouse.wheel(0, -600); await wait(200); }
  await wait(900);
  await portrait.mouse.move(720, 400);
  await portrait.mouse.down();
  await portrait.mouse.move(1360, 400, { steps: 20 });
  await portrait.mouse.up();
  await wait(1500);
  // 隐藏 HUD 与动作栏，只留童僧本体
  await portrait.addStyleTag({
    content: '[data-testid="hud-beads"], [data-testid="sound-toggle"], [data-testid="screenshot-button"]{display:none!important} '
      + 'div[class*="inset-x-0 top-0"], div[class*="inset-x-0 bottom-0"], p[class*="scene-hint"]{display:none!important}'
  });
  await wait(300);
  await portrait.screenshot({
    path: `${OUT}/08-monk-front.png`,
    clip: { x: 570, y: 250, width: 300, height: 560 }
  });
  await portraitCtx.close();

  // 殿门迎宾沙弥立像：进殿后左转看向门口
  const guardCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const guard = await guardCtx.newPage();
  await guard.goto(BASE);
  await guard.waitForFunction(() => Boolean(window.__MD__));
  await guard.getByTestId('enter-button').click();
  await guard.waitForFunction(() => window.__MD__.getSnapshot().scene.ready);
  await wait(2600);
  await guard.mouse.move(720, 430);
  await guard.mouse.down();
  await guard.mouse.move(1160, 470, { steps: 18 });
  await guard.mouse.up();
  await wait(1500);
  await guard.screenshot({ path: `${OUT}/13-sculpt-guardians.png` });
  await guardCtx.close();
  await page.close();
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await shot(mobile, ['04', '05', '06'], true);
  await mobile.close();

  await browser.close();
  console.log(`screenshots written to ${OUT}`);
} finally {
  server.kill('SIGTERM');
}
