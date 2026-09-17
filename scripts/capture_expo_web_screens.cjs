const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ARTIFACT_DIR = '/home/dhairya/.gemini/antigravity-ide/brain/36595a66-e835-4747-a66d-1216090dac82';
const APP_URL = 'http://localhost:8081';
const API_URL = 'http://localhost:8000/api/v1/auth/login';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log('==> Step 0: Fetching auth token from API...');
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
  if (!token) throw new Error('Failed to obtain token from backend');
  console.log('==> Authenticated token retrieved for:', user.email);

  console.log('==> Launching Chrome mobile viewport emulation (Pixel 7 / iPhone 14)...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 412,
    height: 915,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error') || text.includes('ledger') || text.includes('Ledger')) {
      console.log('BROWSER CONSOLE:', text);
    }
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });
  page.on('pageerror', (err) => console.log('BROWSER PAGEERROR:', err.message));

  const capture = async (name) => {
    const filename = path.join(ARTIFACT_DIR, name);
    await page.screenshot({ path: filename, fullPage: false });
    console.log(`📸 Saved screenshot: ${name}`);
  };

  const clickCoords = async (fn, ...args) => {
    const point = await page.evaluate(fn, ...args);
    if (!point) return false;
    console.log(`📍 Clicking (${Math.round(point.x)}, ${Math.round(point.y)})`);
    try {
      await page.touchscreen.tap(point.x, point.y);
    } catch {}
    try {
      await page.mouse.click(point.x, point.y);
    } catch {}
    return true;
  };

  // Helper to click tab item in bottom bar
  const clickBottomTab = async (label) => {
    console.log(`==> Clicking bottom tab: ${label}...`);
    return await clickCoords((tabLabel) => {
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        if (el.textContent && el.textContent.trim().toLowerCase() === tabLabel.toLowerCase() && el.children.length === 0) {
          const rect = el.getBoundingClientRect();
          // Ensure it's in bottom bar (y > 700)
          if (rect.top > 700) {
            return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          }
        }
      }
      return null;
    }, label);
  };

  // 1. Welcome Screen
  console.log(`==> Navigating to ${APP_URL} in clean state...`);
  await page.goto(APP_URL, { waitUntil: 'networkidle2' });
  await sleep(2500);
  await capture('00_welcome_screen.png');

  // 2. Login Screen
  console.log('==> Clicking "Log In" on Welcome screen...');
  await clickCoords(() => {
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      if (el.textContent && el.textContent.trim() === 'Log In' && el.children.length === 0) {
        const rect = el.getBoundingClientRect();
        if (rect.top > 400) {
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
    }
    return null;
  });
  await sleep(1500);
  await capture('01_login_screen.png');

  // Type credentials into form inputs
  console.log('==> Entering credentials into form...');
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type('testuser.antigravity@gmail.com', { delay: 20 });
    await sleep(300);
    await inputs[1].type('Password123!', { delay: 20 });
    await sleep(300);
  }

  console.log('==> Submitting Log In...');
  await clickCoords(() => {
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      if (el.textContent && el.textContent.trim() === 'Log In' && el.children.length === 0) {
        const rect = el.getBoundingClientRect();
        if (rect.top > 250) {
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
    }
    return null;
  });
  await sleep(4000);

  // 4. Rhythm Screen
  console.log('==> Capturing Rhythm Screen...');
  await capture('02_rhythm_screen.png');
  await sleep(1000);

  // 5. Journal Screen
  console.log('==> Navigating to Journal Tab...');
  await clickBottomTab('Journal');
  await sleep(2000);
  await capture('03_journal_screen.png');

  // 6. Insight Screen
  console.log('==> Navigating to Insight Tab...');
  await clickBottomTab('Insight');
  await sleep(2000);
  await capture('04_insight_screen.png');

  // 7. Shared Overview Screen
  console.log('==> Navigating to Shared Tab...');
  await clickBottomTab('Shared');
  await sleep(3000);
  await capture('05_shared_screen.png');

  // 8. Open "Rent Test Group"
  console.log('==> Opening "Rent Test Group"...');
  await clickCoords(() => {
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      if (el.children.length === 0 && (el.textContent || '').trim() === 'Rent Test Group') {
        const btn = el.closest('[role="button"]') || el.closest('[tabindex="0"]') || el;
        const rect = btn.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    return null;
  });
  await sleep(3500);
  await capture('06_group_detail_expenses.png');

  // 9. Switch to Balances Tab
  console.log('==> Switching to Balances tab...');
  await clickCoords(() => {
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      if (el.children.length === 0 && (el.textContent || '').trim() === 'Balances') {
        const btn = el.closest('[role="button"]') || el.closest('[tabindex="0"]') || el;
        const rect = btn.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    return null;
  });
  await sleep(2500);
  await capture('07_group_detail_balances.png');

  // 10. Click Monthly Household Ledger Banner
  console.log('==> Opening Monthly Household Ledger...');
  await clickCoords(() => {
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      const txt = (el.textContent || '').trim();
      if (el.children.length === 0 && (txt === 'Monthly Household Ledger' || txt === 'Monthly Settlements')) {
        const btn = el.closest('[role="button"]') || el.closest('[tabindex="0"]') || el;
        const rect = btn.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    return null;
  });
  await sleep(4000);

  // 11. Capture active September 2026 Monthly Household Ledger (Hero Slip & Progress)
  console.log('==> Waiting for September 2026 Monthly Household Ledger data to load...');
  await sleep(3500);
  console.log('==> Capturing September 2026 Monthly Household Ledger Screen (Hero Slip & Progress)...');
  await capture('08_monthly_household_ledger_top.png');
  await sleep(1000);

  // Helper to click React Native Web buttons reliably
  const clickRNButton = async (text) => {
    const point = await page.evaluate((t) => {
      const all = Array.from(document.querySelectorAll('*'));
      for (const el of all) {
        const txt = (el.textContent || '').trim().toLowerCase();
        if ((txt === t.toLowerCase() || txt.includes(t.toLowerCase())) && el.children.length === 0) {
          const btn = el.closest('[role="button"]') || el;
          const rect = btn.getBoundingClientRect();
          btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
          btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
      return null;
    }, text);

    if (point) {
      try { await page.mouse.click(point.x, point.y); } catch {}
      try { await page.touchscreen.tap(point.x, point.y); } catch {}
      return true;
    }
    return false;
  };

  // 12. Click "Details" toggle on Hero Action Slip
  console.log('==> Expanding Hero Action Slip calculation breakdown...');
  await clickRNButton('Details');
  await sleep(1500);
  console.log('==> Capturing Hero Action Slip Breakdown...');
  await capture('09_hero_action_slip_breakdown.png');
  await sleep(1000);

  // 13. Scroll down to Flatmates Table
  console.log('==> Scrolling down to Ledger Table...');
  await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    for (const d of allDivs) {
      if (d.scrollHeight > d.clientHeight && d.clientHeight > 300) {
        d.scrollBy({ top: 460, behavior: 'instant' });
      }
    }
    window.scrollBy({ top: 460, behavior: 'instant' });
  });
  await sleep(1500);
  console.log('==> Capturing Ledger Table...');
  await capture('10_ledger_table_and_clearing_desk.png');

  // 14. Expand Coordinator Clearing Desk and scroll down
  console.log('==> Expanding Coordinator Clearing Desk...');
  await clickRNButton('Coordinator Clearing Desk');
  await sleep(1500);
  await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    for (const d of allDivs) {
      if (d.scrollHeight > d.clientHeight && d.clientHeight > 300) {
        d.scrollBy({ top: 500, behavior: 'instant' });
      }
    }
    window.scrollBy({ top: 500, behavior: 'instant' });
  });
  await sleep(1500);
  console.log('==> Capturing Coordinator Clearing Desk...');
  await capture('11_coordinator_clearing_desk.png');

  console.log('==> All automated screenshots successfully captured!');
  await browser.close();
}

run().catch((err) => {
  console.error('Automation error:', err);
  process.exit(1);
});
