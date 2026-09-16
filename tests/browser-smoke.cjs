const { chromium } = require(process.argv[2] ? require('node:path').resolve(process.argv[2]) : 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.HAMROBOT_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  fs.mkdirSync('tmp/ui', { recursive: true });
  const org = { id: '11111111-1111-4111-8111-111111111111', name: 'Example Business', slug: 'example-business', embedKey: 'test-key', allowedDomains: ['example.com'], isPaid: false, widgetColor: '#123A3E', widgetPosition: 'bottom-right', knowledgeCount: 2, businessDescription: 'Saved business description' };
  const session = { id: '22222222-2222-4222-8222-222222222222', title: 'New chat', updatedAt: new Date().toISOString() };
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      let data = {};
      if (url.pathname === '/api/auth/me') data = { user: { id: 'test-owner', email: 'owner@example.com' } };
      else if (url.pathname === '/api/orgs') data = { org };
      else if (url.pathname === '/api/orgs/knowledge-base') data = { businessDescription: 'Saved business description', chunks: [{ id: 1, title: 'Services', content: 'Business information' }] };
      else if (url.pathname === '/api/chat/sessions') data = route.request().method() === 'POST' ? { session } : { sessions: [session] };
      else if (url.pathname.startsWith('/api/chat/sessions/')) data = { session, messages: [] };
      else if (url.pathname === '/api/orgs/appearance') return route.fulfill({ status: 404, json: { error: 'Disabled in UI fixture' } });
      await route.fulfill({ status: 200, json: data });
    });
    for (const name of ['widget', 'knowledge-base', 'payment', 'chat']) {
      await page.goto(`http://localhost:3000/dashboard/${name}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflow at ${width}`);
      if (name === 'widget') await page.getByRole('heading', { name: 'Example Business' }).waitFor();
      if (name === 'knowledge-base') {
        await page.getByRole('textbox', { name: 'Business description' }).fill('Unsaved owner draft');
        await page.getByRole('textbox', { name: 'Search knowledge entries' }).fill('services');
        await page.waitForTimeout(700);
        assert.equal(await page.getByRole('textbox', { name: 'Business description' }).inputValue(), 'Unsaved owner draft');
      }
      if (name === 'chat') {
        await page.getByRole('heading', { name: 'What would you like to work on?' }).waitFor();
        const input = await page.getByRole('textbox', { name: 'Your message' }).boundingBox();
        assert.ok(input && input.y + input.height <= 900, 'Chat input is visible');
        const launcher = await page.getByRole('button', { name: 'Open chat', exact: true }).boundingBox();
        assert.ok(!launcher || launcher.y + launcher.height <= input.y, 'Support launcher does not cover the composer');
      }
      await page.screenshot({ path: `tmp/ui/${name}-${width}.png`, fullPage: true });
    }
    await page.goto('http://localhost:3000/dashboard/payment?status=success', { waitUntil: 'networkidle' });
    await page.getByText('Payment is not confirmed yet.', { exact: false }).waitFor();
    org.isPaid = true;
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Continue to installation' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Pay NPR 999 (sandbox)' }).count(), 0);
    org.isPaid = false;
    assert.deepEqual(errors, []);
    console.log(`UI checks passed at ${width}px`);
    await context.close();
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
