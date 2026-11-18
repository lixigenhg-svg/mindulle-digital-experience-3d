import { expect, test, type Page } from '@playwright/test';

type Snapshot = {
  entered: boolean;
  state: string;
  beads: number;
  laps: number;
  muted: boolean;
  malaOpen: boolean;
  tourActive: boolean;
  bellAt: number;
  litIncense: boolean;
  wishes: number;
  player: { x: number; z: number; rot: number; anim: string } | null;
  audio: { ready: boolean; chanting: boolean; volumes: Record<string, number> | null };
  scene: {
    ready: boolean;
    fps: number;
    triangles: number;
    drawCalls: number;
    canvas: { width: number; height: number };
  };
};

const snap = (page: Page) =>
  page.evaluate(() => (window as unknown as { __TEMPLE__: { getSnapshot: () => Snapshot } }).__TEMPLE__.getSnapshot());

async function enterTemple(page: Page) {
  await page.waitForFunction(() => Boolean((window as unknown as { __TEMPLE__?: unknown }).__TEMPLE__));
  await page.getByTestId('enter-button').click();
  await expect(page.getByTestId('intro')).toHaveCount(0);
  await page.waitForFunction(() => {
    const s = (window as unknown as { __TEMPLE__: { getSnapshot: () => Snapshot } }).__TEMPLE__.getSnapshot();
    return s.scene.ready && s.scene.canvas.width > 0;
  });
}

test.describe('temple Temple · 桌面端', () => {
  test.skip(({ isMobile }) => isMobile, '桌面端用例');

  test('首页正常加载', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await expect(page).toHaveTitle(/안심당/);
    await expect(page.getByTestId('intro')).toBeVisible();
    await expect(page.getByTestId('enter-button')).toBeVisible();
    await expect(page.getByTestId('intro-sound')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('3D 场景正常渲染', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(1000);
    await page.waitForTimeout(1500);
    const s = await snap(page);
    expect(s.scene.triangles).toBeGreaterThan(1000);
    expect(s.scene.drawCalls).toBeGreaterThan(10);
    expect(s.scene.canvas.width).toBeGreaterThan(0);
  });

  test('键盘漫游可以移动角色', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);
    await page.waitForFunction(() => {
      const s = (window as unknown as { __TEMPLE__: { getSnapshot: () => Snapshot } }).__TEMPLE__.getSnapshot();
      return Boolean(s.player);
    });
    const before = await snap(page);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' })));
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' })));
    const after = await snap(page);
    const moved = Math.hypot((after.player?.x ?? 0) - (before.player?.x ?? 0), (after.player?.z ?? 0) - (before.player?.z ?? 0));
    expect(moved).toBeGreaterThan(0.1);
  });

  test('珠串可以拖动操作并计数', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);
    await page.getByTestId('action-beads').click();
    await expect(page.getByTestId('mala-dialog')).toBeVisible();
    await expect(page.getByTestId('bead-count')).toHaveText('0');

    await page.getByTestId('mala-step').click();
    await expect(page.getByTestId('bead-count')).toHaveText('1');

    const svg = page.getByTestId('mala-svg');
    const box = await svg.boundingBox();
    if (!box) throw new Error('mala svg has no box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy - box.height * 0.35);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      const angle = (-Math.PI / 2) + (i / 8) * (Math.PI / 2);
      await page.mouse.move(cx + Math.cos(angle) * box.height * 0.35, cy + Math.sin(angle) * box.height * 0.35);
    }
    await page.mouse.up();
    const afterDrag = Number(await page.getByTestId('bead-count').textContent());
    expect(afterDrag).toBeGreaterThan(10);
    expect(afterDrag).toBeLessThan(40);

    await page.getByTestId('mala-reset').click({ force: true });
    await expect(page.getByTestId('bead-count')).toHaveText('0');
    await page.getByTestId('mala-close').click({ force: true });
    await expect(page.getByTestId('mala-dialog')).toHaveCount(0);
  });

  test('行礼与合手动作状态切换', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);

    await page.getByTestId('action-pray').click();
    await expect.poll(async () => (await snap(page)).state).toBe('praying');
    await expect.poll(async () => (await snap(page)).state, { timeout: 6000 }).toBe('idle');

    await page.getByTestId('action-bow').click();
    await expect.poll(async () => (await snap(page)).state).toBe('bowing');
    await expect(page.getByTestId('action-bow')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('action-bow').click();
    await expect.poll(async () => (await snap(page)).state).toBe('idle');
  });

  test('木鼓动作可触发并自动回收', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);
    await page.getByTestId('action-woodfish').click();
    await expect.poll(async () => (await snap(page)).state).toBe('woodfish');
    await expect.poll(async () => (await snap(page)).state, { timeout: 4000 }).toBe('idle');
  });

  test('撞钟 / 上香 / 许愿灯 / 绕塔 交互可用', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);

    await page.getByTestId('action-bell').click();
    expect.poll(async () => (await snap(page)).bellAt).toBeGreaterThan(0);

    await page.getByTestId('action-incense').click();
    expect.poll(async () => (await snap(page)).litIncense).toBe(true);

    expect((await snap(page)).wishes).toBe(0);
    await page.getByTestId('action-wish').click();
    await expect(page.getByTestId('wish-modal')).toBeVisible();
    await page.getByTestId('wish-input').fill('평안을 빕니다');
    await page.getByTestId('wish-submit').click();
    await expect(page.getByTestId('wish-modal')).toHaveCount(0);
    await page.getByTestId('action-wish').click();
    await expect(page.getByTestId('wish-modal')).toBeVisible();
    await page.getByTestId('wish-submit').click();
    expect.poll(async () => (await snap(page)).wishes).toBe(2);

    await page.getByTestId('action-tour').click();
    expect.poll(async () => (await snap(page)).tourActive).toBe(true);
    await page.waitForTimeout(2000);
    const s = await snap(page);
    expect(s.player?.anim).toBe('walk');
  });

  test('截图保存可触发下载', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      page.getByTestId('screenshot-button').click(),
    ]);
    expect(download.suggestedFilename()).toContain('temple');
  });

  test('音效可以开启和关闭', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);
    const sound = page.getByTestId('sound-toggle');
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await snap(page)).muted).toBe(true);
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
  });

  test('设置面板三路音量可调并持久化', async ({ page }) => {
    await page.goto('/');
    await enterTemple(page);

    await page.getByTestId('settings-button').click();
    const modal = page.getByTestId('settings-modal');
    await expect(modal).toBeVisible();

    // 期望默认值：环境音 35% / 배경音 26% / 效果音 60%
    await expect(page.getByTestId('settings-value-ambient')).toHaveText('35%');
    await expect(page.getByTestId('settings-value-chant')).toHaveText('26%');
    await expect(page.getByTestId('settings-value-sfx')).toHaveText('60%');

    await page.getByTestId('settings-slider-sfx').fill('18');
    await expect(page.getByTestId('settings-value-sfx')).toHaveText('18%');
    await expect.poll(async () => (await snap(page)).audio.volumes?.sfx).toBeCloseTo(0.18, 2);

    const stored = await page.evaluate(() => localStorage.getItem('temple_volumes_v1'));
    expect(stored).toContain('0.18');

    // 面板关闭后重开，改动仍然保留
    await page.getByTestId('settings-modal').getByLabel('关闭').click();
    await expect(modal).toHaveCount(0);
    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('settings-value-sfx')).toHaveText('18%');
  });

  test('运行稳定：无持续报错，FPS/绘制指标有效', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await enterTemple(page);
    await page.waitForTimeout(5000);
    const s = await snap(page);
    expect(errors.filter(e => !e.includes('favicon')).length).toBe(0);
    expect(typeof s.scene.fps).toBe('number');
    expect(s.scene.triangles).toBeGreaterThan(1000);
  });
});
