/**
 * Puppeteer CDP reconnect configuration for CloudFiles UI.
 *
 * Usage:
 *   1. Launch Chrome with remote debugging:
 *        chrome --remote-debugging-port=9222
 *
 *   2. Run the helper (connects or reconnects to that Chrome):
 *        node puppeteer.config.cjs
 *
 *   3. Or require it from your own scripts:
 *        const { connectBrowser } = require('./puppeteer.config.cjs');
 *        const browser = await connectBrowser();
 */

const puppeteer = require('puppeteer');
const http = require('http');

const CDP_PORT = 9222;
const APP_URL = 'https://localhost:4200';

/**
 * Fetch the WebSocket debugger URL from Chrome's /json/version endpoint.
 */
function getDebuggerWsUrl(port = CDP_PORT) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}/json/version`, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.webSocketDebuggerUrl);
          } catch (e) {
            reject(new Error(`Failed to parse /json/version: ${e.message}`));
          }
        });
      })
      .on('error', (err) => {
        reject(
          new Error(
            `Cannot reach Chrome on port ${port}. ` +
              `Launch it with: chrome --remote-debugging-port=${port}\n` +
              err.message
          )
        );
      });
  });
}

/**
 * Connect (or reconnect) to an already-running Chrome instance via CDP.
 * Falls back to launching a new headed Chrome if none is found.
 */
async function connectBrowser(opts = {}) {
  const port = opts.port || CDP_PORT;

  try {
    const wsUrl = await getDebuggerWsUrl(port);
    console.log(`Reconnecting to Chrome via CDP: ${wsUrl}`);
    const browser = await puppeteer.connect({
      browserWSEndpoint: wsUrl,
      defaultViewport: null, // keep the user's viewport
    });
    return browser;
  } catch {
    console.log(
      `No running Chrome found on port ${port}. Launching a new headed instance...`
    );
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        `--remote-debugging-port=${port}`,
        '--no-first-run',
        '--no-default-browser-check',
      ],
      defaultViewport: null,
    });
    return browser;
  }
}

// ── CLI entry point ────────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    const browser = await connectBrowser();
    const pages = await browser.pages();
    let page = pages.find((p) => p.url().includes('localhost'));

    if (!page) {
      page = pages[0] || (await browser.newPage());
      console.log(`Navigating to ${APP_URL} ...`);
      await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    } else {
      console.log(`Found existing page: ${page.url()}`);
    }

    console.log(`\nBrowser connected. Pages open: ${pages.length}`);
    console.log('Press Ctrl+C to detach (Chrome stays open).\n');

    // Keep the process alive; Ctrl+C detaches cleanly
    process.on('SIGINT', () => {
      console.log('\nDetaching from Chrome (browser stays open).');
      browser.disconnect();
      process.exit(0);
    });
  })().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { connectBrowser, getDebuggerWsUrl, CDP_PORT, APP_URL };
