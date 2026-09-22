import { expect, test } from '@playwright/test';

test.skip(!process.env.BASE_URL, 'set BASE_URL to a deployed build');

test.describe('companion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.waitForSelector('[data-testid="avatar-card"]');
    await page.locator('[data-testid="avatar-card"]').first().click();
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

  test('the top strip shows her name, not the config id', async ({ page }) => {
    const text = await page.getByTestId('top-strip').locator('.cm-pill').nth(1).textContent();
    expect(text).not.toContain('_');
  });

  test('changing mood asks the server and sticks', async ({ page }) => {
    const moodButton = page.getByTestId('mood-button');
    if ((await moodButton.count()) === 0) test.skip(true, 'this avatar has a single mood');

    const clean = (s: string | null | undefined) => (s ?? '').replace(/[✓▾]/g, '').trim();

    const model = decodeURIComponent(new URL(page.url()).hash.replace(/^#\/c\//, ''));
    const originalLabel = clean(await moodButton.textContent());

    await moodButton.click();
    const items = page.locator('[role="menuitemradio"]');
    await expect(items.first()).toBeVisible();

    // Hit-test every menu item while the menu is open.
    const blocked = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll<HTMLElement>('[role="menuitemradio"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!top || !(top === el || el.contains(top) || top.contains(el))) {
          out.push(el.textContent || '');
        }
      });
      return out;
    });
    expect(blocked).toEqual([]);

    const count = await items.count();
    let chosenLabel: string | null = null;
    for (let i = 0; i < count; i++) {
      const checked = await items.nth(i).getAttribute('aria-checked');
      if (checked !== 'true') {
        chosenLabel = clean(await items.nth(i).textContent());
        await items.nth(i).click();
        break;
      }
    }
    expect(chosenLabel).toBeTruthy();

    await expect(async () => {
      const text = clean(await moodButton.textContent());
      expect(text).toContain(chosenLabel!);
    }).toPass({ timeout: 30_000 });

    const stored = await page.evaluate((m) => window.localStorage.getItem(`companion.mood.${m}`), model);
    expect(stored).toBeTruthy();

    // Restore the original mood so the fixture is left as it was found.
    await moodButton.click();
    const originalItem = page.locator('[role="menuitemradio"]', { hasText: originalLabel }).first();
    await originalItem.click();
    await expect(async () => {
      const text = clean(await moodButton.textContent());
      expect(text).toBe(originalLabel);
    }).toPass({ timeout: 30_000 });
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
});

test.describe('gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('opens on the gallery with one card per avatar', async ({ page, request }) => {
    const cards = page.locator('[data-testid="avatar-card"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const name = (await cards.nth(i).locator('.cm-card-name').textContent())?.trim();
      expect(name).toBeTruthy();
    }
    const res = await request.get(new URL('/api/companion/characters', page.url()).toString());
    expect(res.status()).toBe(200);
    const { characters } = await res.json();
    const models = new Set((characters ?? []).filter((c: { live2d_model_name: string }) => c.live2d_model_name).map((c: { live2d_model_name: string }) => c.live2d_model_name));
    expect(count).toBe(models.size);
  });

  test('a card opens the companion and Back returns', async ({ page }) => {
    await page.locator('[data-testid="avatar-card"]').first().click();
    await expect(page).toHaveURL(/#\/c\//);
    await expect(page.getByTestId('chat-bar')).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('gallery')).toBeVisible();
  });

  test('an unknown avatar route falls back to the gallery', async ({ page }) => {
    await page.goto('./#/c/does-not-exist');
    await expect(page.getByTestId('gallery')).toBeVisible();
  });

  test('settings opens and closes', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('settings-sheet')).toBeVisible();
    await page.getByLabel('Close settings').click();
    await expect(page.getByTestId('settings-sheet')).toHaveCount(0);

    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('settings-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('settings-sheet')).toHaveCount(0);
  });

  test('an invalid server address shows an inline error and leaves storage untouched', async ({ page }) => {
    const before = await page.evaluate(() => window.localStorage.getItem('baseUrl'));
    await page.getByTestId('settings-button').click();
    await page.getByTestId('settings-address-input').fill('notaurl');
    await page.getByTestId('settings-address-save').click();
    await expect(page.getByTestId('settings-address-error')).toBeVisible();
    const after = await page.evaluate(() => window.localStorage.getItem('baseUrl'));
    expect(after).toBe(before);
  });

  test('every settings control receives its own tap', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('settings-sheet')).toBeVisible();
    const blocked = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll<HTMLElement>('[data-testid="settings-sheet"] button, [data-testid="settings-sheet"] input, [data-testid="settings-sheet"] select').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!top || !(top === el || el.contains(top) || top.contains(el))) {
          out.push(`${el.tagName}.${el.className} <- ${top ? top.tagName + '#' + top.id : 'null'}`);
        }
      });
      return out;
    });
    expect(await page.locator('[data-testid="settings-sheet"] button, [data-testid="settings-sheet"] input, [data-testid="settings-sheet"] select').count()).toBeGreaterThan(3);
    expect(blocked).toEqual([]);
  });
});
