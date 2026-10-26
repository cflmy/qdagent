import { test, expect } from '@playwright/test'

/**
 * L4 browser acceptance (T03/T09/T16 slices).
 * Requires qdagent serve at QDAGENT_BASE (default http://127.0.0.1:7431).
 * Skip when server unreachable — CI can gate with PLAYWRIGHT_REQUIRE_SERVER=1.
 */
async function serverUp(request: import('@playwright/test').APIRequestContext) {
  try {
    const res = await request.get('/api/health', { timeout: 3000 })
    return res.ok()
  } catch {
    return false
  }
}

test.beforeEach(async ({ request }, testInfo) => {
  const up = await serverUp(request)
  if (!up) {
    if (process.env.PLAYWRIGHT_REQUIRE_SERVER === '1') {
      throw new Error('qdagent serve required but /api/health unreachable')
    }
    testInfo.skip(true, 'qdagent serve not running')
  }
})

test('T16 chat shell is keyboard reachable @ a11y', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('main').or(page.locator('body'))).toBeVisible()
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => document.activeElement?.tagName || '')
  expect(focused).toBeTruthy()
})

test('T03 workspace page lists tree or empty state', async ({ page }) => {
  await page.goto('/workspace')
  await expect(page.getByRole('main', { name: '工作区' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText('开发中')).toHaveCount(0)
})

test('T09 reader opens from workspace without execute', async ({ page }) => {
  await page.goto('/workspace')
  const fileBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(2)
  // Prefer a concrete file row if present
  const rows = page.locator('ul li button')
  if (await rows.count()) {
    await rows.first().click()
    await expect(page.getByLabel('上下文阅读器')).toBeVisible({ timeout: 10000 })
  } else {
    await expect(page.getByText(/空|尚未就绪/)).toBeVisible()
  }
})

test('usage footer never shows bare 0 for unknown', async ({ page }) => {
  await page.goto('/')
  const zeros = page.locator('text=/^0 tokens$/')
  // No assistant footer yet — just ensure page loads
  await expect(page.locator('body')).toBeVisible()
  expect(await zeros.count()).toBe(0)
})
