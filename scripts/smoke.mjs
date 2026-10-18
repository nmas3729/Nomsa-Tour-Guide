import { chromium } from 'playwright';
const base = 'http://127.0.0.1:3000';
const routes = ['/', '/experiences', '/login', '/custom-itinerary'];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();

for (const path of routes) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = m => m.type() === 'error' && consoleErrors.push(m.text());
  const onPageErr = e => pageErrors.push(e.message);
  p.on('console', onConsole);
  p.on('pageerror', onPageErr);

  const resp = await p.goto(base + path, { waitUntil: 'networkidle', timeout: 30000 });
  const overflow = await p.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const shot = `/tmp/shot${path.replace(/\W/g, '_') || '_root'}.png`;
  await p.screenshot({ path: shot, fullPage: true });

  console.log(JSON.stringify({
    path, status: resp?.status(), overflowPx: overflow,
    consoleErrors: consoleErrors.length, pageErrors: pageErrors.length,
    firstConsoleError: consoleErrors[0] ?? null,
    firstPageError: pageErrors[0] ?? null,
    shot
  }));

  p.off('console', onConsole);
  p.off('pageerror', onPageErr);
}
await b.close();
