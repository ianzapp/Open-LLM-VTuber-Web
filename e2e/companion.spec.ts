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
