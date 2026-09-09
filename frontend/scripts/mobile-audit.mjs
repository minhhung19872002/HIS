/**
 * Mobile responsive audit — loads routes at a phone viewport and reports
 * horizontal overflow (the "bể layout" symptom) + which elements cause it.
 *
 * Usage:
 *   node scripts/mobile-audit.mjs [--base https://his.bluestar.com.vn] [--routes a,b,c] [--shots]
 */
import { chromium, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const getArg = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const BASE = getArg('base', process.env.PROD_URL || 'https://his.bluestar.com.vn');
const API = `${BASE}/api`;
const SHOTS = args.includes('--shots');
// --local: drive the Vite dev server but proxy its /api calls to the prod API,
// so a not-yet-deployed CSS change can be audited against real data.
const LOCAL = args.includes('--local');
const APP = LOCAL ? (process.env.LOCAL_URL || 'http://localhost:3001') : BASE;
const LOCAL_API = process.env.LOCAL_API || 'http://localhost:5106/api';
const OUT = getArg('out', 'mobile-audit');

const DEFAULT_ROUTES = [
  '/login', '/v2/dashboard', '/v2/reception', '/v2/opd', '/v2/ipd', '/v2/billing',
  '/v2/pharmacy', '/v2/lab', '/v2/radiology', '/v2/emr', '/v2/surgery',
  '/v2/insurance', '/v2/reports', '/v2/admin', '/v2/master-data', '/v2/patient-portal',
];
const ROUTES = (getArg('routes', '') ? getArg('routes', '').split(',') : DEFAULT_ROUTES)
  .map((r) => (r.startsWith('/') ? r : `/${r}`));

const ONLY_VP = getArg('viewport', '');
const VIEWPORTS = [
  { name: 'phone-390', width: 390, height: 844 },   // iPhone 12/13/14
  { name: 'phone-360', width: 360, height: 800 },   // common Android
  { name: 'tablet-820', width: 820, height: 1180, desktop: true },  // iPad Air portrait
  { name: 'desktop-1440', width: 1440, height: 900, desktop: true },
];

async function login() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
  });
  if (!r.ok) throw new Error(`login failed ${r.status}`);
  const j = await r.json();
  const token = j?.data?.token || j?.token;
  const user = JSON.stringify(j?.data?.user || { username: 'admin' });
  if (!token) throw new Error('no token in login response');
  return { token, user };
}

const OVERFLOW_PROBE = () => {
  const vw = document.documentElement.clientWidth;
  const sig = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}`.slice(0, 90);
  };
  const offenders = [];
  const clipped = [];
  const seenO = new Set();
  const seenC = new Set();
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const cs = getComputedStyle(el);

    // (a) content clipped away with NO way to scroll to it — the "bể layout" symptom
    const hiddenX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
    const intentional = el.classList.contains('his-ticker') || el.classList.contains('his-ticker-scroll');
    if (!intentional && hiddenX && el.scrollWidth > el.clientWidth + 4 && el.clientWidth > 0) {
      const k = sig(el);
      if (!seenC.has(k)) {
        seenC.add(k);
        clipped.push({ sig: k, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, lostPx: el.scrollWidth - el.clientWidth });
      }
    }

    // (b) element painted outside the viewport (visible overflow -> page scrolls sideways)
    if (r.right > vw + 1 || r.left < -1) {
      if (cs.position === 'fixed' && r.width <= vw + 1) return;
      let p = el.parentElement, scrollableAncestor = false;
      while (p) {
        const pcs = getComputedStyle(p);
        if (['auto', 'scroll', 'hidden', 'clip'].includes(pcs.overflowX)) { scrollableAncestor = true; break; }
        p = p.parentElement;
      }
      if (scrollableAncestor) return;
      const k = sig(el);
      if (seenO.has(k)) return;
      seenO.add(k);
      offenders.push({ sig: k, left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), text: (el.textContent || '').trim().slice(0, 40) });
    }
  });
  clipped.sort((a, b) => b.lostPx - a.lostPx);
  return { vw, scrollWidth: document.documentElement.scrollWidth, offenders: offenders.slice(0, 12), clipped: clipped.slice(0, 12) };
};

const run = async () => {
  const { token, user } = await login();
  const browser = await chromium.launch();
  const results = [];
  fs.mkdirSync(OUT, { recursive: true });

  for (const vp of VIEWPORTS.filter((v) => !ONLY_VP || v.name === ONLY_VP)) {
    const ctx = await browser.newContext({
      ...(vp.desktop ? {} : devices['iPhone 13']),
      viewport: { width: vp.width, height: vp.height },
      isMobile: !vp.desktop,
      hasTouch: !vp.desktop,
      deviceScaleFactor: vp.desktop ? 1 : 2,
      locale: 'vi-VN',
    });
    await ctx.addInitScript(({ t, u }) => {
      try {
        window.localStorage.setItem('token', t);
        window.localStorage.setItem('user', u);
      } catch { /* about:blank has no storage access */ }
    }, { t: token, u: user });
    const page = await ctx.newPage();
    if (LOCAL) {
      await page.route(`${LOCAL_API}/**`, async (route) => {
        const req = route.request();
        const target = req.url().replace(LOCAL_API, API);
        const cors = {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        };
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
        try {
          const h = { ...req.headers() };
          delete h.host; delete h.origin; delete h.referer;
          const r = await fetch(target, { method: req.method(), headers: h, body: req.postData() || undefined });
          const body = Buffer.from(await r.arrayBuffer());
          route.fulfill({ status: r.status, headers: { ...cors, 'content-type': r.headers.get('content-type') || 'application/json' }, body });
        } catch {
          route.fulfill({ status: 502, headers: cors, body: '{}' });
        }
      });
    }
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push(e.message));

    for (const route of ROUTES) {
      consoleErrors.length = 0;
      let ok = true;
      try {
        await page.goto(`${APP}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
        await page.waitForTimeout(600);
      } catch (e) {
        ok = false;
        console.log('  !! goto failed: ' + String(e).slice(0, 120));
      }
      const probe = ok ? await page.evaluate(OVERFLOW_PROBE) : null;
      if (SHOTS) {
        const file = path.join(OUT, `${vp.name}${route.replace(/\//g, '_')}.png`);
        await page.screenshot({ path: file, fullPage: false }).catch(() => {});
      }
      const overflowPx = probe ? probe.scrollWidth - probe.vw : 0;
      const clipped = probe?.clipped || [];
      results.push({ viewport: vp.name, route, ok, overflowPx, offenders: probe?.offenders || [], clipped, pageErrors: [...consoleErrors] });
      const badClip = clipped.filter((c) => c.lostPx > 8);
      const flag = !ok ? 'LOAD-FAIL'
        : overflowPx > 2 ? `OVERFLOW +${overflowPx}px`
        : badClip.length ? `CLIPPED x${badClip.length} (max ${badClip[0].lostPx}px)`
        : 'ok';
      console.log(`[${vp.name}] ${route.padEnd(28)} ${flag}${consoleErrors.length ? ` (pageerror x${consoleErrors.length})` : ''}`);
      for (const o of (probe?.offenders || []).slice(0, 5)) {
        console.log(`        ↳ overflow ${o.sig}  [${o.left}..${o.right}] w=${o.width} "${o.text}"`);
      }
      for (const c of badClip.slice(0, 6)) {
        console.log(`        ↳ clipped  ${c.sig}  ${c.clientWidth}/${c.scrollWidth} (-${c.lostPx}px)`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  const bad = results.filter((r) => r.overflowPx > 2 || !r.ok || (r.clipped || []).some((c) => c.lostPx > 8));
  console.log(`\n=== ${bad.length}/${results.length} route-viewport pairs broken ===`);
};

run().catch((e) => { console.error(e); process.exit(1); });
