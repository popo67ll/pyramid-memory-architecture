const puppeteer = require('/Users/popoll/.openclaw/workspace/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[0];
  console.log('URL:', page.url());
  const buf = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 60, clip: { x: 0, y: 0, width: 800, height: 600 } });
  fs.writeFileSync('/Users/popoll/.openclaw/workspace/douyin_fill_confirmation.jpg', Buffer.from(buf, 'base64'));
  console.log('Done, size:', fs.statSync('/Users/popoll/.openclaw/workspace/douyin_fill_confirmation.jpg').size);
  browser.disconnect();
})();
