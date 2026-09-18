const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ARTIFACT_DIR = '/home/dhairya/.gemini/antigravity-ide/brain/36595a66-e835-4747-a66d-1216090dac82';
const APP_URL = 'http://localhost:8081';
const API_URL = 'http://localhost:8000/api/v1/auth/login';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testuser.antigravity@gmail.com',
      password: 'Password123!',
    }),
  });
  const authJson = await resp.json();
  const token = authJson.data?.access_token;
  const user = authJson.data?.user;

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });

  await page.goto(APP_URL, { waitUntil: 'networkidle2' });
  await page.evaluate((t, u) => {
    localStorage.setItem('tabsy_access_token', t);
    localStorage.setItem('tabsy_cached_user', JSON.stringify(u));
  }, token, user);

  await page.goto(APP_URL, { waitUntil: 'networkidle2' });
  await sleep(3000);

  // Click the center Add button in the bottom tab bar
  console.log('==> Clicking center Add Expense button...');
  await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Add Expense"]') || document.querySelector('[role="button"][style*="bottom"]');
    if (btn) {
      btn.click();
      return true;
    }
    // Search floating action button
    const svgs = Array.from(document.querySelectorAll('svg'));
    for (const s of svgs) {
      const parent = s.closest('[role="button"]');
      if (parent) {
        const rect = parent.getBoundingClientRect();
        if (rect.top > 800 && rect.left > 300) {
          parent.click();
          return true;
        }
      }
    }
    return false;
  });

  await sleep(2500);
  const filename = path.join(ARTIFACT_DIR, '12_add_expense_modal.png');
  await page.screenshot({ path: filename, fullPage: false });
  console.log('📸 Saved screenshot: 12_add_expense_modal.png');

  await browser.close();
}

run().catch(console.error);
