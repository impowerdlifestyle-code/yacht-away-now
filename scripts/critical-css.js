#!/usr/bin/env node
// Rebuilds the <style id="critical-atf"> block in index.html: the subset of style.css that
// styles what is on screen before any scroll. style.css loads async, so without this copy the
// first paint is unstyled (images at natural width, hero uncentered) and jumps when it lands.
//
// Run after changing nav, hero or global rules in style.css, then run version-assets.sh:
//   1. serve the repo root with clean URLs on a local port
//   2. npm i --no-save puppeteer-core   (uses the installed Google Chrome)
//   3. node scripts/critical-css.js http://localhost:PORT/
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const url = process.argv[2];
if (!url) { console.error('usage: node scripts/critical-css.js <local-home-url>'); process.exit(1); }
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEWPORTS = [[360,640],[390,844],[412,823],[430,932],[600,900],[768,1024],[820,1180],[1024,768],[1280,720],[1440,900],[1920,1080]];
const SPLIT = /,(?![^(]*\))/;

const collect = (height) => {
  const els = [document.documentElement, document.body];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.navbar') || el.closest('.hero')) { els.push(el); continue; }
    const r = el.getBoundingClientRect();
    if (r.top < height && r.bottom > 0 && r.width > 0 && getComputedStyle(el).position !== 'fixed' && !el.closest('#chat-widget')) els.push(el);
  }
  const sheet = [...document.styleSheets].find(s => s.href && /\/style\.css/.test(s.href));
  const hits = [];
  let idx = 0;
  const walk = (rules) => {
    for (const r of rules) {
      if (r.type === 1) {
        const my = idx++;
        for (const sel of r.selectorText.split(/,(?![^(]*\))/).map(s => s.trim())) {
          if (/:(hover|focus|active|focus-visible|focus-within|disabled|checked)/.test(sel)) continue;
          const base = sel.replace(/::?(before|after|placeholder|selection|-webkit-[a-z-]+)/g, '') || '*';
          try { if (els.some(e => e.matches(base))) hits.push(my + '|' + sel); } catch (e) {}
        }
      } else if (r.cssRules && (r.type === 4 || r.type === 12)) walk(r.cssRules);
      else idx++;
    }
  };
  walk(sheet.cssRules);
  return hits;
};

const rebuild = (keepArr) => {
  const keep = new Set(keepArr);
  const sheet = [...document.styleSheets].find(s => s.href && /\/style\.css/.test(s.href));
  const used = new Set(['fadeInUp']);
  const keyframes = [];
  let idx = 0;
  const walk = (rules) => {
    let out = '';
    for (const r of rules) {
      if (r.type === 1) {
        const my = idx++;
        const sels = r.selectorText.split(/,(?![^(]*\))/).map(s => s.trim()).filter(s => keep.has(my + '|' + s));
        if (!sels.length) continue;
        out += sels.join(',') + '{' + r.style.cssText + '}';
        (r.style.cssText.match(/animation(?:-name)?:[^;]+/g) || []).forEach(a => a.split(/[\s,:]+/).forEach(t => used.add(t)));
      } else if (r.cssRules && (r.type === 4 || r.type === 12)) {
        const inner = walk(r.cssRules);
        if (inner) out += (r.type === 4 ? '@media ' : '@supports ') + r.conditionText + '{' + inner + '}';
      } else {
        idx++;
        if (r.type === 7) keyframes.push([r.name, r.cssText]);
      }
    }
    return out;
  };
  const css = walk(sheet.cssRules);
  return css + keyframes.filter(([name]) => used.has(name)).map(([, text]) => text).join('');
};

const minify = (css) => css
  .replace(/\s*\n\s*/g, '')
  .replace(/\s*([{};])\s*/g, '$1')
  .replace(/:\s+/g, ':')
  .replace(/,\s+/g, ',')
  .replace(/;}/g, '}')
  .replace(/\b0px\b/g, '0');

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const open = async (w, h) => {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 800, hasTouch: w < 800 });
    await page.setRequestInterception(true);
    page.on('request', r => (/google-analytics|googletagmanager/.test(r.url()) ? r.abort() : r.continue().catch(() => {})));
    await page.goto(url, { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 1500));
    return page;
  };
  const keep = new Set();
  for (const [w, h] of VIEWPORTS) {
    const page = await open(w, h);
    (await page.evaluate(collect, h)).forEach(k => keep.add(k));
    await page.close();
  }
  const page = await open(1440, 900);
  const css = minify(await page.evaluate(rebuild, [...keep]));
  await browser.close();

  const file = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const block = /(<style id="critical-atf">)[\s\S]*?(<\/style>)/;
  if (!block.test(html)) throw new Error('index.html has no <style id="critical-atf"> block');
  fs.writeFileSync(file, html.replace(block, (m, a, b) => a + css + b));
  console.log('critical-atf: ' + css.length + ' bytes from ' + keep.size + ' selectors');
})();
