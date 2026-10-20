const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../public/screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Locate Chrome or Edge
function getBrowserExecutablePath() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(edgePath)) return edgePath;
  throw new Error('Neither Chrome nor Edge was found at standard paths.');
}

async function runBrowserTests() {
  console.log('🌐 Launching headless browser for end-to-end testing...');
  const executablePath = getBrowserExecutablePath();

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 880 }
  });

  const page = await browser.newPage();

  // Log console messages from browser
  page.on('console', msg => console.log('   [Browser Console]:', msg.text()));
  page.on('pageerror', err => console.error('   [Browser Page Error]:', err.message));

  try {
    // 1. Visit Home (Not logged in)
    console.log('1️⃣ Navigating to http://localhost:3000/login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });

    // 2. Perform Login as demo user stella_nova
    console.log('2️⃣ Logging in as stella_nova...');
    await page.type('input[name="identifier"]', 'stella_nova');
    await page.type('input[name="password"]', 'demo1234');
    await page.click('#form-login button[type="submit"]');

    // Wait for redirect to home feed
    await page.waitForSelector('#composer-text', { timeout: 10000 });
    await page.waitForSelector('.post-card', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    // Capture Home Feed
    console.log('📸 Capturing 01_home_feed.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_home_feed.png'), fullPage: false });

    // 3. Create a new post with live character counter
    console.log('3️⃣ Creating a new post...');
    await page.type('#composer-text', 'Orbitly is running beautifully! Loving this clean UI and real-time feel. Keep your circle in orbit! ✨ #orbitly #space');
    await page.click('#btn-submit-post');
    await new Promise(r => setTimeout(r, 1500));

    // 4. Like a post
    console.log('4️⃣ Testing like action with optimistic update...');
    const firstLikeBtn = await page.$('.post-card .btn-like');
    if (firstLikeBtn) {
      await firstLikeBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }

    // 5. Navigate to post detail & add comment
    console.log('5️⃣ Navigating to post detail...');
    await page.click('.post-card .btn-comment');
    await page.waitForSelector('#form-add-comment', { timeout: 10000 });
    await page.type('#comment-content-input', 'Fascinating perspective! The cosmos never ceases to amaze me.');
    await page.click('#form-add-comment button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    // 6. Test Explore page with Trending sort
    console.log('6️⃣ Navigating to Explore page...');
    await page.click('.nav-item[data-route="/explore"] a');
    await page.waitForSelector('#explore-stream', { timeout: 10000 });
    await page.click('#btn-sort-trending');
    await new Promise(r => setTimeout(r, 1000));

    console.log('📸 Capturing 02_explore_trending.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_explore_trending.png'), fullPage: false });

    // 7. Search for a user
    console.log('7️⃣ Testing live debounced search...');
    await page.type('#global-search-input', 'leo');
    await page.waitForSelector('#search-suggestions.open', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 800));

    // Click suggestion to go to Leo Chen's profile
    console.log('8️⃣ Navigating to Leo Chen profile...');
    await page.click('.suggestion-item');
    await page.waitForSelector('.profile-card', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('📸 Capturing 03_profile_leo.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_profile_leo.png'), fullPage: false });

    // 8. Go to Notifications view
    console.log('9️⃣ Navigating to Notifications...');
    await page.click('.nav-item[data-route="/notifications"] a');
    await page.waitForSelector('#notifications-stream', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1000));

    console.log('📸 Capturing 04_notifications.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_notifications.png'), fullPage: false });

    // 9. Toggle Dark Mode & Return Home
    console.log('🔟 Testing Dark Mode toggle...');
    await page.click('.nav-item[data-route="/"] a');
    await page.waitForSelector('.post-card', { timeout: 10000 });
    await page.click('#theme-toggle-btn');
    await new Promise(r => setTimeout(r, 800));

    console.log('📸 Capturing 05_dark_mode_home.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_dark_mode_home.png'), fullPage: false });

    // 10. Test Mobile Viewport
    console.log('📱 Testing Mobile Viewport (390 x 844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 800));

    console.log('📸 Capturing 06_mobile_view.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_mobile_view.png'), fullPage: false });

    // 11. Reset to desktop & test Edit Profile
    console.log('1️⃣1️⃣ Testing Edit Profile modal...');
    await page.setViewport({ width: 1280, height: 880 });
    await page.click('#theme-toggle-btn'); // Switch back to light
    await page.click('#nav-profile-item a');
    await page.waitForSelector('#btn-edit-profile', { timeout: 10000 });
    await page.click('#btn-edit-profile');
    await page.waitForSelector('.modal-card', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 500));

    console.log('📸 Capturing 07_profile_edit.png...');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_profile_edit.png'), fullPage: false });

    console.log('🎉 All browser tests and screenshot captures completed successfully!');
  } catch (err) {
    console.error('❌ Browser testing error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
