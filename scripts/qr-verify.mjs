/*
 * Verifies qr.js against an INDEPENDENT decoder — macOS's own CoreImage QR
 * detector — rather than against itself. A QR encoder is very happy to produce
 * something that looks perfect and scans as nothing at all, so "it renders" is
 * not evidence. Two real bugs were caught this way: the format-information
 * block written on the wrong axis, and the Reed-Solomon generator indexed in
 * the wrong direction.
 *
 * Run it from the browser-engine folder, which has Playwright installed:
 *
 *   cd ../browser-engine
 *   node ../ni-apps/scripts/qr-verify.mjs      # will fail — see below
 *
 * ESM resolves node_modules from the SCRIPT's directory, so copy it across:
 *
 *   cp scripts/qr-verify.mjs ../browser-engine/ && \
 *     (cd ../browser-engine && node qr-verify.mjs; rm -f qr-verify.mjs)
 *
 * Needs the one-off decoder built first:
 *
 *   swiftc -O -o /tmp/qrverify/decode scripts/qr-decode.swift
 */

import { chromium } from 'playwright';
import fs from 'fs';
import { execFileSync } from 'child_process';

const QR_JS  = '/Users/aiautomator/Documents/Documents/APPS/ni-apps/qr.js';
const DECODE = '/tmp/qrverify/decode';
const TMP    = '/tmp/qrverify';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~:/?#[]@!$&()*+,;=%';

// Deterministic, so any failure is reproducible.
let seed = 20260830;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const cases = [
  'https://ni-apps.vercel.app',
  'https://niapps.co.uk',
  'https://ni-apps.vercel.app/',
  'https://daysoutni.com',
  'HELLO',
  'hello world'
];
// Every version boundary at level M, plus a spread of random lengths.
const boundaries = [1, 13, 14, 15, 25, 26, 27, 41, 42, 43, 61, 62, 63, 83, 84, 85,
                    105, 106, 107, 121, 122, 123, 151, 152, 153, 179, 180, 181, 212, 213];
for (const n of boundaries) cases.push(Array.from({ length: n }, () => ALPHABET[Math.floor(rnd() * ALPHABET.length)]).join(''));
for (let i = 0; i < 20; i++) {
  const n = 1 + Math.floor(rnd() * 213);
  cases.push(Array.from({ length: n }, () => ALPHABET[Math.floor(rnd() * ALPHABET.length)]).join(''));
}

fs.mkdirSync(TMP, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html></html>');
await page.addScriptTag({ content: fs.readFileSync(QR_JS, 'utf8') });

let pass = 0;
const failures = [];
const versionsSeen = new Set();

for (const [i, text] of cases.entries()) {
  const info = await page.evaluate(t => ({ size: window.QR.matrix(t).length, svg: window.QR.svg(t) }), text);
  versionsSeen.add((info.size - 17) / 4);

  await page.setContent(`<body style="margin:0">${info.svg.replace('<svg ', '<svg width="900" height="900" ')}</body>`);
  const file = `${TMP}/v${i}.png`;
  await page.locator('svg').screenshot({ path: file });

  let got = '';
  try { got = execFileSync(DECODE, [file], { encoding: 'utf8' }).trim().replace(/^OK /, ''); }
  catch { got = '<decoder failed>'; }

  if (got === text) pass++;
  else failures.push({ i, len: text.length, version: (info.size - 17) / 4, got: got.slice(0, 60) });
}

await browser.close();

console.log(`versions exercised: ${[...versionsSeen].sort((a, b) => a - b).join(', ')}`);
console.log(`passed ${pass} of ${cases.length}`);
for (const f of failures) console.log(`  FAIL case ${f.i} (v${f.version}, ${f.len} chars) -> ${f.got}`);
process.exit(failures.length ? 1 : 0);
