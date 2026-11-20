import { expect, test, type Page } from '@playwright/test';

function readPlayer(page: Page) {
  return page.evaluate(() => {
    const md = (window as Window & {
      __MD__?: { getSnapshot: () => { player: { x: number; z: number } | null } };
    }).__MD__;
    return md?.getSnapshot().player ?? null;
  });
}

test('移动端从真实入口出生后轻触地面可以移动', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('intro')).toBeVisible();
  await page.getByTestId('enter-button').tap();
  await expect(page.getByTestId('intro')).toHaveCount(0);
  await expect(page.getByTestId('exit-button')).toBeVisible();

  // The unseeded player starts outside the outer gate at z = 60.5.
  await expect.poll(async () => (await readPlayer(page))?.z).toBe(60.5);
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const before = await readPlayer(page);
  expect(before).not.toBeNull();
  await canvas.tap({ position: { x: 195, y: 500 } });
  await expect.poll(async () => (await readPlayer(page))?.z ?? Infinity)
    .toBeLessThan((before?.z ?? Infinity) - 0.3);
});
