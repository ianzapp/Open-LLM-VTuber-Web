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
