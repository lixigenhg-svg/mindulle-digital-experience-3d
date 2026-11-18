import { expect, test, type Page } from '@playwright/test';

type Snapshot = {
  entered: boolean;
  state: string;
  beads: number;
  scene: { ready: boolean; canvas: { width: number; height: number } };
};

async function enterTemple(page: Page) {
  await page.waitForFunction(() => Boolean((window as unknown as { __TEMPLE__?: unknown }).__TEMPLE__));
  await page.getByTestId('enter-button').tap();
  await expect(page.getByTestId('intro')).toHaveCount(0);
  await page.waitForFunction(() => {
    const s = (window as unknown as { __TEMPLE__: { getSnapshot: () => Snapshot } }).__TEMPLE__.getSnapshot();
    return s.scene.ready && s.scene.canvas.width > 0;
  });
}

test.describe('temple Temple · 移动端', () => {
  test.skip(({ isMobile }) => !isMobile, '移动端用例');

  test('移动端首页与入口页布局正常', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('intro')).toBeVisible();
    const enter = page.getByTestId('enter-button');
    const box = await enter.boundingBox();
    expect(box?.width ?? 999).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await expect(page.getByTestId('intro-sound')).toBeVisible();
  });

  test('移动端进入后场景、动作栏与触控可用', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByTestId('action-pray')).toBeVisible();
    await page.getByTestId('action-pray').tap();
    await page.waitForFunction(() => {
      const s = (window as unknown as { __TEMPLE__: { getSnapshot: () => Snapshot } }).__TEMPLE__.getSnapshot();
      return s.state === 'praying';
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });

  test('移动端珠串面板不溢出且可计数', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);
    await page.getByTestId('action-beads').tap();
    await expect(page.getByTestId('mala-dialog')).toBeVisible();
    const panel = await page.getByTestId('mala-dialog').locator('.mala-panel').boundingBox();
    expect(panel?.width ?? 999).toBeLessThanOrEqual(390);
    expect(panel?.height ?? 999).toBeLessThanOrEqual(844);
    await page.getByTestId('mala-step').tap();
    await page.getByTestId('mala-step').tap();
    await expect(page.getByTestId('bead-count')).toHaveText('2');
  });
});

test('移动端轻触地面可以移动童角色', async ({ page }) => {
  await page.goto('/');
  await enterTemple(page);
  await page.waitForFunction(() => {
    const s = (window as unknown as { __TEMPLE__: { getSnapshot: () => Snapshot } }).__TEMPLE__.getSnapshot();
    return Boolean((s as unknown as { player?: unknown }).player);
  });
  const before = await page.evaluate(() => {
    const s = (window as unknown as { __TEMPLE__: { getSnapshot: () => { player: { x: number; z: number } } } }).__TEMPLE__.getSnapshot();
    return s.player;
  });
  await page.locator('canvas').tap({ position: { x: 70, y: 520 } });
  await page.waitForTimeout(2200);
  const after = await page.evaluate(() => {
    const s = (window as unknown as { __TEMPLE__: { getSnapshot: () => { player: { x: number; z: number } } } }).__TEMPLE__.getSnapshot();
    return s.player;
  });
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(0.1);
});
