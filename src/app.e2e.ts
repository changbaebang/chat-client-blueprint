import { expect, test } from '@playwright/test'

test('the first screen shows the Chat heading @smoke', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Chat', exact: true })).toBeVisible()
})

test('the health endpoint answers 200 @smoke', async ({ page }) => {
  const res = await page.request.get('/api/health')
  expect(res.status()).toBe(200)
  expect(await res.json()).toEqual({ status: 'ok' })
})
