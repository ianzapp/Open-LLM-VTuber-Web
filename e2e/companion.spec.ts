import { expect, test } from '@playwright/test';

test.skip(!process.env.BASE_URL, 'set BASE_URL to a deployed build');

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.waitForSelector('#canvas');
  await page.waitForTimeout(3000);
});

test('every control receives its own tap', async ({ page }) => {
  const blocked = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>('.cm-island, .cm-island button, .cm-island textarea').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top || !(top === el || el.contains(top) || top.contains(el))) {
        out.push(`${el.tagName}.${el.className} <- ${top ? top.tagName + '#' + top.id : 'null'}`);
      }
    });
    return out;
  });
  expect(await page.locator('.cm-island, .cm-island button, .cm-island textarea').count()).toBeGreaterThan(3);
  expect(blocked).toEqual([]);
});

test('empty space belongs to the avatar', async ({ page }) => {
  const size = page.viewportSize()!;
  const hit = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.id : null;
  }, [size.width / 2, size.height / 2]);
  expect(hit).toBe('canvas');
});

test('the page is laid out for the device width', async ({ page }) => {
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(width).toBe(page.viewportSize()!.width);
});

test('a finger can drag the avatar', async ({ page, browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'touch project only');
  const pos = () => page.evaluate(() => (window as any).getLAppAdapter().getModelPosition());
  await page.waitForFunction(() => !!(window as any).getLAppAdapter?.().getModel?.(), null, { timeout: 20_000 });
  const size = page.viewportSize()!;
  const cx = size.width / 2, cy = size.height * 0.55;
  const before = await pos();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + i * 6, y: cy - i * 5, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await pos();
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(0.01);
});

test('the bar is always there and the conversation sheet opens and closes', async ({ page }) => {
  await expect(page.getByTestId('chat-bar')).toBeVisible();
  await expect(page.getByTestId('mic')).toBeVisible();
  await page.getByTestId('thread-toggle').click();
  await expect(page.getByTestId('thread-sheet')).toBeVisible();
  const blocked = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>('.cm-island button, .cm-island textarea, button.cm-island').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top || !(top === el || el.contains(top) || top.contains(el))) out.push(el.getAttribute('aria-label') || el.tagName);
    });
    return out;
  });
  expect(blocked).toEqual([]);
  await page.getByTestId('thread-toggle').click();
  await expect(page.getByTestId('thread-sheet')).toHaveCount(0);
});

test('a typed message floats over the avatar, she answers, and the sheet keeps both', async ({ page }) => {
  const input = page.locator('.cm-input');
  await input.fill('Say hello in five words.');
  await input.press('Enter');
  const mine = page.locator('.cm-float .cm-bubble[data-role="human"]').last();
  await expect(mine).toHaveText('Say hello in five words.');
  await expect(input).toHaveValue('');
  // A bubble is display only: the point under it still belongs to the avatar.
  const under = await mine.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.id ?? null;
  });
  expect(under).toBe('canvas');
  const hers = page.locator('.cm-float .cm-bubble[data-role="ai"]:not(.cm-typing)').last();
  await expect(hers).toBeVisible({ timeout: 40_000 });
  await expect(hers).not.toContainText('[');
  await page.getByTestId('thread-toggle').click();
  await expect(page.locator('.cm-thread .cm-bubble[data-role="human"]').last()).toHaveText('Say hello in five words.');
  await expect(page.locator('.cm-thread .cm-bubble[data-role="ai"]:not(.cm-typing)').last()).toBeVisible();
});

test('Shift+Enter makes a new line instead of sending', async ({ page }) => {
  const input = page.locator('.cm-input');
  await input.fill('line one');
  await input.press('Shift+Enter');
  await input.pressSequentially('line two');
  await expect(input).toHaveValue('line one\nline two');
  await expect(page.locator('.cm-bubble[data-role="human"]')).toHaveCount(0);
});

test('the app is installable: manifest and icons are served', async ({ page, request }) => {
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('./manifest.webmanifest');
  const manifestUrl = new URL(href!, page.url()).toString();
  const res = await request.get(manifestUrl);
  expect(res.status()).toBe(200);
  const manifest = await res.json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) {
    const iconRes = await request.get(new URL(icon.src, manifestUrl).toString());
    expect(iconRes.status()).toBe(200);
    expect(iconRes.headers()['content-type']).toContain('image/png');
  }
  const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(new URL(touch!, page.url()).toString())).status()).toBe(200);
});
