/**
 * Chup anh cac man hinh WRMS Management Website
 * Run: node take_screenshots.js
 */

const { chromium } = require('C:/Users/Hp/AppData/Roaming/npm/node_modules/playwright')
const path = require('path')

const BASE = 'http://localhost:5176'
const OUT  = 'd:/SU26/SWP/restaurant-management-system/docs/screenshots'
const W = 1440, H = 900

async function ss(page, name) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false })
  console.log('  saved:', name + '.png')
}

async function login(page, username, password) {
  await page.goto(BASE + '/#/login', { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.fill('input[type="text"]', username)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1500)
}

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: W, height: H } })

  /* ── 1. Login page ─────────────────────────────────────────────────────── */
  console.log('=== Auth screens ===')
  const p = await ctx.newPage()
  await p.goto(BASE + '/#/login', { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  await ss(p, '01_login')

  /* ── 2. Forgot password ─────────────────────────────────────────────────── */
  await p.goto(BASE + '/#/forgot-password', { waitUntil: 'networkidle' })
  await p.waitForTimeout(600)
  await ss(p, '02_forgot_password')

  /* ── 3. WAITER: Reservation Calendar View ──────────────────────────────── */
  console.log('=== Waiter screens ===')
  await login(p, 'waiter01', 'Waiter@123456')
  await p.waitForURL('**/#/waiter', { timeout: 8000 }).catch(() => {})
  await p.waitForTimeout(2000)
  await ss(p, '03_reservation_calendar')

  /* ── 4. Reservation List View ─────────────────────────────────────────── */
  // Click list tab
  const listTab = await p.locator('text=Danh sách').first()
  if (await listTab.isVisible()) {
    await listTab.click()
    await p.waitForTimeout(800)
  }
  await ss(p, '04_reservation_list')

  /* ── 5. Calendar View – open detail panel by clicking first reservation ── */
  const calTab = await p.locator('text=Lịch').first()
  if (await calTab.isVisible()) {
    await calTab.click()
    await p.waitForTimeout(600)
  }
  // Click first reservation bar in timeline
  const bar = await p.locator('[style*="position: absolute"]').first()
  if (await bar.isVisible().catch(() => false)) {
    await bar.click()
    await p.waitForTimeout(600)
  }
  await ss(p, '05_reservation_detail_panel')

  /* ── 6. Create Reservation Modal ─────────────────────────────────────── */
  await p.keyboard.press('F1')
  await p.waitForTimeout(800)
  const createBtn = await p.locator('text=Đặt bàn (F1)').first()
  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click()
    await p.waitForTimeout(800)
  }
  await ss(p, '06_create_reservation_modal')
  await p.keyboard.press('Escape')

  /* ── 7. Bell / Notification dropdown ─────────────────────────────────── */
  await p.waitForTimeout(400)
  // Try to find bell button
  const bell = await p.locator('[aria-label*="bell"], [aria-label*="thong bao"], svg').filter({ hasText: '' }).first()
  // Find bell by looking for the notification button specifically
  const bellBtn = await p.locator('button').filter({ has: p.locator('svg path[d*="M14.857 17.082"]') }).first()
  if (await bellBtn.isVisible().catch(() => false)) {
    await bellBtn.click()
    await p.waitForTimeout(1000)
    await ss(p, '07_notification_bell')
    await p.keyboard.press('Escape')
  } else {
    console.log('  skip: bell button not found')
  }

  /* ── 8. Change Password Modal ──────────────────────────────────────────── */
  // Find avatar/username dropdown
  const avatarBtn = await p.locator('button').filter({ hasText: 'waiter01' }).first()
  if (await avatarBtn.isVisible().catch(() => false)) {
    await avatarBtn.click()
    await p.waitForTimeout(400)
    const changePwLink = await p.locator('text=Đổi mật khẩu').first()
    if (await changePwLink.isVisible().catch(() => false)) {
      await changePwLink.click()
      await p.waitForTimeout(600)
      await ss(p, '08_change_password_modal')
      await p.keyboard.press('Escape')
    }
  } else {
    console.log('  skip: avatar button not found')
  }

  /* ── 9. CASHIER screens ──────────────────────────────────────────────── */
  console.log('=== Cashier screens ===')
  await ctx.clearCookies()
  await ctx.clearPermissions()
  // Clear localStorage to logout
  await p.evaluate(() => localStorage.clear())
  await login(p, 'cashier01', 'Cashier@123456')
  await p.waitForURL('**/#/cashier', { timeout: 8000 }).catch(() => {})
  await p.waitForTimeout(2000)
  await ss(p, '09_cashier_tables')

  /* ── 10. MANAGER: Dashboard ─────────────────────────────────────────── */
  console.log('=== Manager screens ===')
  await p.evaluate(() => localStorage.clear())
  await login(p, 'manager01', 'Manager@123456')
  await p.waitForURL('**/#/manager/dashboard', { timeout: 8000 }).catch(() => {})
  await p.waitForTimeout(2500)
  await ss(p, '10_manager_dashboard')

  /* ── 11. Dashboard – scroll right to see Recent Activities ──────────── */
  // Scroll to bottom to capture more
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
  await p.waitForTimeout(500)
  await ss(p, '11_dashboard_recent_activities')
  await p.evaluate(() => window.scrollTo(0, 0))

  /* ── 12. Audit Log page ─────────────────────────────────────────────── */
  await p.goto(BASE + '/#/manager/audit-logs', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await ss(p, '12_audit_log')

  /* ── 13. Audit Log with filter applied ─────────────────────────────── */
  // Select action filter
  const actionSelect = await p.locator('select').filter({ has: p.locator('option[value=""]') }).first()
  if (await actionSelect.isVisible().catch(() => false)) {
    await actionSelect.selectOption('RESERVATION_CONFIRM')
    await p.waitForTimeout(1200)
    await ss(p, '13_audit_log_filtered')
    await actionSelect.selectOption('')
  }

  /* ── 14. Reservation page as MANAGER ───────────────────────────────── */
  console.log('=== Manager reservation ===')
  await p.goto(BASE + '/#/waiter', { waitUntil: 'networkidle' })
  await p.waitForTimeout(2000)
  await ss(p, '14_manager_reservation_view')

  await browser.close()
  console.log('\nDone. Screenshots saved to:', OUT)
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
