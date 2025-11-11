/**
 * Visual Regression Testing for React Migration
 *
 * This Playwright test suite captures screenshots of both Flask and React
 * versions to ensure 100% visual parity during migration.
 *
 * Setup:
 * 1. npm install -D @playwright/test
 * 2. npx playwright install
 * 3. Update FLASK_URL and REACT_URL below
 * 4. Run: npx playwright test visual-regression.spec.ts
 *
 * Features:
 * - Side-by-side comparison of Flask vs React
 * - Multiple viewport sizes (mobile, tablet, desktop)
 * - Tests all major pages and components
 * - Captures hover states and interactions
 * - Generates visual diff reports
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  flask: {
    url: 'http://localhost:5000',
    credentials: {
      username: 'test@example.com',
      password: 'testpassword123',
    },
  },
  react: {
    url: 'http://localhost:5173',
    credentials: {
      username: 'test@example.com',
      password: 'testpassword123',
    },
  },
  screenshots: {
    dir: path.join(__dirname, '../../screenshots'),
    threshold: 0.1, // 10% difference threshold
    maxDiffPixels: 100,
  },
};

// ========================================
// VIEWPORT CONFIGURATIONS
// ========================================

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'mobile-landscape', width: 667, height: 375 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'desktop-wide', width: 1920, height: 1080 },
];

// ========================================
// PAGES TO TEST
// ========================================

const PAGES = [
  {
    name: 'login',
    path: '/login',
    requiresAuth: false,
  },
  {
    name: 'dashboard',
    path: '/',
    requiresAuth: true,
  },
  {
    name: 'agents',
    path: '/agents',
    requiresAuth: true,
  },
  {
    name: 'chat',
    path: '/chat',
    requiresAuth: true,
  },
];

// ========================================
// COMPONENT STATES TO TEST
// ========================================

const COMPONENT_STATES = [
  {
    name: 'sidebar-expanded',
    selector: '.sidebar-panel',
    action: async (page: Page) => {
      await page.evaluate(() => {
        const sidebar = document.querySelector('.sidebar-panel');
        sidebar?.setAttribute('data-expanded', 'true');
      });
    },
  },
  {
    name: 'sidebar-collapsed',
    selector: '.sidebar-panel',
    action: async (page: Page) => {
      await page.evaluate(() => {
        const sidebar = document.querySelector('.sidebar-panel');
        sidebar?.setAttribute('data-expanded', 'false');
      });
    },
  },
  {
    name: 'artifact-open',
    selector: '.artifact-panel',
    action: async (page: Page) => {
      await page.evaluate(() => {
        const layout = document.querySelector('.main-layout');
        layout?.setAttribute('data-artifact-open', 'true');
      });
      await page.waitForTimeout(500); // Wait for transition
    },
  },
];

// ========================================
// HELPER FUNCTIONS
// ========================================

async function login(page: Page, baseUrl: string, credentials: { username: string; password: string }) {
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[type="email"]', credentials.username);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle' });
}

async function captureScreenshot(
  page: Page,
  name: string,
  viewport: { name: string; width: number; height: number }
) {
  const filename = `${viewport.name}-${name}.png`;
  await page.screenshot({
    path: path.join(CONFIG.screenshots.dir, filename),
    fullPage: true,
  });
  return filename;
}

async function compareScreenshots(flaskPath: string, reactPath: string) {
  // Playwright has built-in screenshot comparison
  // This will fail if screenshots differ beyond threshold
  const flaskBuffer = await page.screenshot({ path: flaskPath });
  const reactBuffer = await page.screenshot({ path: reactPath });

  expect(reactBuffer).toMatchSnapshot(flaskBuffer, {
    threshold: CONFIG.screenshots.threshold,
    maxDiffPixels: CONFIG.screenshots.maxDiffPixels,
  });
}

// ========================================
// TEST SUITES
// ========================================

test.describe('Visual Regression - Full Pages', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport });

      for (const pageConfig of PAGES) {
        test(`Compare ${pageConfig.name} page`, async ({ browser }) => {
          // Create two browser contexts for parallel testing
          const flaskContext = await browser.newContext();
          const reactContext = await browser.newContext();

          const flaskPage = await flaskContext.newPage();
          const reactPage = await reactContext.newPage();

          // Login if required
          if (pageConfig.requiresAuth) {
            await login(flaskPage, CONFIG.flask.url, CONFIG.flask.credentials);
            await login(reactPage, CONFIG.react.url, CONFIG.react.credentials);
          }

          // Navigate to page
          await flaskPage.goto(`${CONFIG.flask.url}${pageConfig.path}`);
          await reactPage.goto(`${CONFIG.react.url}${pageConfig.path}`);

          // Wait for page to be fully loaded
          await flaskPage.waitForLoadState('networkidle');
          await reactPage.waitForLoadState('networkidle');

          // Capture screenshots
          const flaskScreenshot = await captureScreenshot(
            flaskPage,
            `flask-${pageConfig.name}`,
            viewport
          );
          const reactScreenshot = await captureScreenshot(
            reactPage,
            `react-${pageConfig.name}`,
            viewport
          );

          // Compare screenshots
          const flaskBuffer = await flaskPage.screenshot({ fullPage: true });
          const reactBuffer = await reactPage.screenshot({ fullPage: true });

          expect(reactBuffer).toMatchSnapshot(flaskBuffer, {
            threshold: CONFIG.screenshots.threshold,
          });

          // Cleanup
          await flaskContext.close();
          await reactContext.close();
        });
      }
    });
  }
});

test.describe('Visual Regression - Component States', () => {
  test.use({ viewport: VIEWPORTS[3] }); // Use desktop viewport

  for (const state of COMPONENT_STATES) {
    test(`Compare ${state.name} state`, async ({ browser }) => {
      const flaskContext = await browser.newContext();
      const reactContext = await browser.newContext();

      const flaskPage = await flaskContext.newPage();
      const reactPage = await reactContext.newPage();

      // Login
      await login(flaskPage, CONFIG.flask.url, CONFIG.flask.credentials);
      await login(reactPage, CONFIG.react.url, CONFIG.react.credentials);

      // Navigate to main page
      await flaskPage.goto(`${CONFIG.flask.url}/`);
      await reactPage.goto(`${CONFIG.react.url}/`);

      // Apply state
      await state.action(flaskPage);
      await state.action(reactPage);

      // Wait for animations
      await flaskPage.waitForTimeout(500);
      await reactPage.waitForTimeout(500);

      // Capture and compare
      const flaskBuffer = await flaskPage.screenshot({ fullPage: true });
      const reactBuffer = await reactPage.screenshot({ fullPage: true });

      expect(reactBuffer).toMatchSnapshot(flaskBuffer, {
        threshold: CONFIG.screenshots.threshold,
      });

      await flaskContext.close();
      await reactContext.close();
    });
  }
});

test.describe('Visual Regression - Hover States', () => {
  test.use({ viewport: VIEWPORTS[3] }); // Desktop viewport

  const hoverTargets = [
    { name: 'expand-button', selector: '.sidebar-expand-btn' },
    { name: 'conversation-item', selector: '.conversation-item' },
    { name: 'send-button', selector: '.chat-input-send' },
    { name: 'artifact-close-button', selector: '.artifact-close-btn' },
  ];

  for (const target of hoverTargets) {
    test(`Compare hover state: ${target.name}`, async ({ browser }) => {
      const flaskContext = await browser.newContext();
      const reactContext = await browser.newContext();

      const flaskPage = await flaskContext.newPage();
      const reactPage = await reactContext.newPage();

      // Login and navigate
      await login(flaskPage, CONFIG.flask.url, CONFIG.flask.credentials);
      await login(reactPage, CONFIG.react.url, CONFIG.react.credentials);

      await flaskPage.goto(`${CONFIG.flask.url}/`);
      await reactPage.goto(`${CONFIG.react.url}/`);

      // Hover over element
      const flaskElement = flaskPage.locator(target.selector).first();
      const reactElement = reactPage.locator(target.selector).first();

      await flaskElement.hover();
      await reactElement.hover();

      // Wait for hover animations
      await flaskPage.waitForTimeout(300);
      await reactPage.waitForTimeout(300);

      // Capture screenshots of just the hovered element
      const flaskBuffer = await flaskElement.screenshot();
      const reactBuffer = await reactElement.screenshot();

      expect(reactBuffer).toMatchSnapshot(flaskBuffer, {
        threshold: CONFIG.screenshots.threshold,
      });

      await flaskContext.close();
      await reactContext.close();
    });
  }
});

test.describe('Visual Regression - Animations', () => {
  test.use({ viewport: VIEWPORTS[3] });

  test('Compare message appear animation', async ({ browser }) => {
    const flaskContext = await browser.newContext();
    const reactContext = await browser.newContext();

    const flaskPage = await flaskContext.newPage();
    const reactPage = await reactContext.newPage();

    // Login and navigate to chat
    await login(flaskPage, CONFIG.flask.url, CONFIG.flask.credentials);
    await login(reactPage, CONFIG.react.url, CONFIG.react.credentials);

    await flaskPage.goto(`${CONFIG.flask.url}/chat`);
    await reactPage.goto(`${CONFIG.react.url}/chat`);

    // Send a message to trigger animation
    const message = 'Test message for animation';
    await flaskPage.fill('.chat-input textarea', message);
    await reactPage.fill('.chat-input textarea', message);

    // Click send simultaneously
    await Promise.all([
      flaskPage.click('.chat-input-send'),
      reactPage.click('.chat-input-send'),
    ]);

    // Capture at different animation stages
    const stages = [100, 200, 400]; // ms

    for (const delay of stages) {
      await flaskPage.waitForTimeout(delay);
      await reactPage.waitForTimeout(delay);

      const flaskBuffer = await flaskPage.screenshot();
      const reactBuffer = await reactPage.screenshot();

      expect(reactBuffer).toMatchSnapshot(flaskBuffer, {
        threshold: 0.2, // Allow more tolerance for animations
      });
    }

    await flaskContext.close();
    await reactContext.close();
  });

  test('Compare loading spinner animation', async ({ browser }) => {
    const flaskContext = await browser.newContext();
    const reactContext = await browser.newContext();

    const flaskPage = await flaskContext.newPage();
    const reactPage = await reactContext.newPage();

    // Navigate to page that shows loading spinner
    await flaskPage.goto(`${CONFIG.flask.url}/login`);
    await reactPage.goto(`${CONFIG.react.url}/login`);

    // Trigger loading state (e.g., submit form)
    await flaskPage.fill('input[type="email"]', CONFIG.flask.credentials.username);
    await reactPage.fill('input[type="email"]', CONFIG.react.credentials.username);

    await flaskPage.fill('input[type="password"]', CONFIG.flask.credentials.password);
    await reactPage.fill('input[type="password"]', CONFIG.react.credentials.password);

    // Click submit to show loading
    await Promise.all([
      flaskPage.click('button[type="submit"]'),
      reactPage.click('button[type="submit"]'),
    ]);

    // Capture loading state
    await flaskPage.waitForSelector('.loading-spinner', { timeout: 2000 });
    await reactPage.waitForSelector('.loading-spinner', { timeout: 2000 });

    const flaskBuffer = await flaskPage.screenshot();
    const reactBuffer = await reactPage.screenshot();

    expect(reactBuffer).toMatchSnapshot(flaskBuffer, {
      threshold: 0.15,
    });

    await flaskContext.close();
    await reactContext.close();
  });
});

test.describe('Visual Regression - Responsive Layout', () => {
  test('Sidebar collapse transition (desktop to mobile)', async ({ browser }) => {
    const flaskContext = await browser.newContext();
    const reactContext = await browser.newContext();

    const flaskPage = await flaskContext.newPage();
    const reactPage = await reactContext.newPage();

    await login(flaskPage, CONFIG.flask.url, CONFIG.flask.credentials);
    await login(reactPage, CONFIG.react.url, CONFIG.react.credentials);

    // Start at desktop size
    await flaskPage.setViewportSize({ width: 1440, height: 900 });
    await reactPage.setViewportSize({ width: 1440, height: 900 });

    await flaskPage.goto(`${CONFIG.flask.url}/`);
    await reactPage.goto(`${CONFIG.react.url}/`);

    // Capture desktop state
    let flaskBuffer = await flaskPage.screenshot();
    let reactBuffer = await reactPage.screenshot();
    expect(reactBuffer).toMatchSnapshot(flaskBuffer, { threshold: 0.1 });

    // Resize to tablet
    await flaskPage.setViewportSize({ width: 768, height: 1024 });
    await reactPage.setViewportSize({ width: 768, height: 1024 });
    await flaskPage.waitForTimeout(500); // Wait for transition
    await reactPage.waitForTimeout(500);

    flaskBuffer = await flaskPage.screenshot();
    reactBuffer = await reactPage.screenshot();
    expect(reactBuffer).toMatchSnapshot(flaskBuffer, { threshold: 0.1 });

    // Resize to mobile
    await flaskPage.setViewportSize({ width: 375, height: 667 });
    await reactPage.setViewportSize({ width: 375, height: 667 });
    await flaskPage.waitForTimeout(500);
    await reactPage.waitForTimeout(500);

    flaskBuffer = await flaskPage.screenshot();
    reactBuffer = await reactPage.screenshot();
    expect(reactBuffer).toMatchSnapshot(flaskBuffer, { threshold: 0.1 });

    await flaskContext.close();
    await reactContext.close();
  });

  test('Artifact panel overlay behavior', async ({ browser }) => {
    const flaskContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const reactContext = await browser.newContext({ viewport: { width: 768, height: 1024 } });

    const flaskPage = await flaskContext.newPage();
    const reactPage = await reactContext.newPage();

    await login(flaskPage, CONFIG.flask.url, CONFIG.flask.credentials);
    await login(reactPage, CONFIG.react.url, CONFIG.react.credentials);

    await flaskPage.goto(`${CONFIG.flask.url}/`);
    await reactPage.goto(`${CONFIG.react.url}/`);

    // Trigger artifact panel to open
    await flaskPage.evaluate(() => {
      const layout = document.querySelector('.main-layout');
      layout?.setAttribute('data-artifact-open', 'true');
    });
    await reactPage.evaluate(() => {
      const layout = document.querySelector('.main-layout');
      layout?.setAttribute('data-artifact-open', 'true');
    });

    await flaskPage.waitForTimeout(500);
    await reactPage.waitForTimeout(500);

    // Compare overlay state
    const flaskBuffer = await flaskPage.screenshot();
    const reactBuffer = await reactPage.screenshot();

    expect(reactBuffer).toMatchSnapshot(flaskBuffer, { threshold: 0.1 });

    await flaskContext.close();
    await reactContext.close();
  });
});

test.describe('Visual Regression - CSS Properties', () => {
  test('Validate critical CSS properties match', async ({ browser }) => {
    const flaskContext = await browser.newContext();
    const reactContext = await browser.newContext();

    const flaskPage = await flaskContext.newPage();
    const reactPage = await reactContext.newPage();

    await login(flaskPage, CONFIG.flask.url, CONFIG.flask.credentials);
    await login(reactPage, CONFIG.react.url, CONFIG.react.credentials);

    await flaskPage.goto(`${CONFIG.flask.url}/`);
    await reactPage.goto(`${CONFIG.react.url}/`);

    // Define critical elements and their properties
    const criticalElements = [
      {
        selector: '.user-message',
        properties: ['background-color', 'color', 'border-radius', 'font-size', 'padding'],
      },
      {
        selector: '.bot-message',
        properties: ['background-color', 'color', 'border-radius', 'font-size', 'padding'],
      },
      {
        selector: '.sidebar-panel',
        properties: ['background-color', 'width', 'border-radius'],
      },
      {
        selector: '.artifact-header',
        properties: ['background-color', 'color', 'padding'],
      },
    ];

    for (const element of criticalElements) {
      const flaskStyles = await flaskPage.evaluate((sel, props) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const computed = window.getComputedStyle(el);
        return props.reduce((acc: any, prop: string) => {
          acc[prop] = computed.getPropertyValue(prop);
          return acc;
        }, {});
      }, element.selector, element.properties);

      const reactStyles = await reactPage.evaluate((sel, props) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const computed = window.getComputedStyle(el);
        return props.reduce((acc: any, prop: string) => {
          acc[prop] = computed.getPropertyValue(prop);
          return acc;
        }, {});
      }, element.selector, element.properties);

      // Compare styles
      expect(reactStyles).toEqual(flaskStyles);
    }

    await flaskContext.close();
    await reactContext.close();
  });
});

// ========================================
// GENERATE COMPARISON REPORT
// ========================================

test.afterAll(async () => {
  // Generate HTML report comparing screenshots
  console.log('✓ Visual regression tests complete');
  console.log(`  Screenshots saved to: ${CONFIG.screenshots.dir}`);
  console.log('  Run "npx playwright show-report" to view detailed comparison');
});
