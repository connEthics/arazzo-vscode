/**
 * Captures Playwright (Chromium préinstallé) : 1440×900, deviceScaleFactor 2.
 * Usage : node screenshots.mjs <fichier.html> <dossier-sortie> [filtre]
 */
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(resolve(process.execPath, '../../lib/node_modules/playwright'));
}
const [htmlArg = 'dist/graph-mockups.html', outArg = 'shots', filter = ''] = process.argv.slice(2);
const html = pathToFileURL(resolve(htmlArg)).href;
const outDir = resolve(outArg);
await mkdir(outDir, { recursive: true });

export const SHOTS = [
  { name: 'order-to-cash-light', q: 'scenario=order-to-cash&theme=light' },
  { name: 'order-to-cash-dark', q: 'scenario=order-to-cash&theme=dark&select=awaitConfirmation' },
  { name: 'order-to-cash-hc', q: 'scenario=order-to-cash&theme=hc' },
  { name: 'order-to-cash-vscode-dark', q: 'scenario=order-to-cash&theme=vscode-dark&lanes=lanes' },
  { name: 'order-to-cash-lanes-light', q: 'scenario=order-to-cash&theme=light&lanes=lanes' },
  { name: 'pet-adoption-light', q: 'scenario=pet-adoption&theme=light&select=placeOrderWithCoupon' },
  { name: 'session-renewal-dark', q: 'scenario=session-renewal&theme=dark&select=loadProfile' },
  { name: 'pet-adoption-zoom-light', q: 'scenario=pet-adoption&theme=light&select=placeOrderWithCoupon&focus=checkCouponEligibility&zoom=0.95' },
  { name: 'large-60-light', q: 'scenario=large-60&theme=light' },
  { name: 'large-60-overview-light', q: 'scenario=large-60&theme=light&overview=1' },
  { name: 'session-renewal-hc', q: 'scenario=session-renewal&theme=hc' },
  { name: 'catalogue-light', q: 'scenario=catalogue&theme=light&legend=1' },
  { name: 'catalogue-detailed-light', q: 'scenario=catalogue&theme=light&density=detailed&focus=awaitAck&zoom=0.85' },
  { name: 'catalogue-lr-dark', q: 'scenario=catalogue&theme=dark&dir=LR' },
];

const browser = await playwright.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
let failures = 0;
for (const s of SHOTS.filter((x) => x.name.includes(filter))) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${html}?${s.q}`);
  await page.waitForFunction(() => /\d+ ms/.test(document.querySelector('.app-footer')?.textContent ?? ''), null, { timeout: 30000 });
  await page.waitForFunction(() => !!document.body.dataset.ready, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  if (s.after) await s.after(page);
  const footer = await page.locator('.app-footer').textContent();
  await page.screenshot({ path: `${outDir}/${s.name}.png` });
  console.log(`${s.name}.png  ${footer?.replace(/\s+/g, ' ').slice(0, 110)}${errors.length ? `  ERREURS: ${errors.join(' | ')}` : ''}`);
  failures += errors.length;
  await page.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
