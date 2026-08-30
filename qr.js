/* ============================================================
   qr.js — a small, self-contained QR encoder.

   Byte mode, error-correction level M, versions 1–10 (up to 213 bytes, which
   is far more than any URL this page will ever hold). No dependencies, no
   network, nothing third-party — a QR pointing at a service like
   api.qrserver.com would leak the address and break the day that host goes
   away, and this is the one thing on the page that has to work when you are
   standing in front of somebody holding out your phone.

   window.QR.matrix(text) -> array of rows of 0/1 (1 = dark), size N x N.
   window.QR.svg(text, opts) -> an SVG string ready to drop into the DOM.
   ============================================================ */

(function (global) {
  'use strict';

  // ---------- GF(256) for Reed–Solomon (primitive polynomial 0x11D) ----------

  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];

  const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  /** Generator polynomial for `degree` error-correction codewords. */
  function rsPoly(degree) {
    let poly = [1];
    for (let d = 0; d < degree; d++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let i = 0; i < poly.length; i++) {
        next[i] ^= mul(poly[i], EXP[d]);
        next[i + 1] ^= poly[i];
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, eccLen) {
    // rsPoly returns coefficients LOWEST degree first, and the division below
    // wants them highest-first with the leading 1 dropped — hence the reversed
    // index. Getting this backwards yields a QR that is correct in every
    // visible respect and still refuses to scan.
    const gen = rsPoly(eccLen);
    const res = new Uint8Array(eccLen);
    for (const byte of data) {
      const factor = byte ^ res[0];
      res.copyWithin(0, 1);
      res[eccLen - 1] = 0;
      for (let i = 0; i < eccLen; i++) res[i] ^= mul(gen[eccLen - 1 - i], factor);
    }
    return res;
  }

  // ---------- Version tables, error-correction level M ----------
  // [ total codewords, ecc codewords per block, block counts [n1, n2] ]
  // Group 2 blocks always hold one more data codeword than group 1.

  const VERSIONS = {
    1:  { total: 26,  ecc: 10, blocks: [1, 0] },
    2:  { total: 44,  ecc: 16, blocks: [1, 0] },
    3:  { total: 70,  ecc: 26, blocks: [1, 0] },
    4:  { total: 100, ecc: 18, blocks: [2, 0] },
    5:  { total: 134, ecc: 24, blocks: [2, 0] },
    6:  { total: 172, ecc: 16, blocks: [4, 0] },
    7:  { total: 196, ecc: 18, blocks: [4, 0] },
    8:  { total: 242, ecc: 22, blocks: [2, 2] },
    9:  { total: 292, ecc: 22, blocks: [3, 2] },
    10: { total: 346, ecc: 26, blocks: [4, 1] }
  };

  const ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  const countBits = v => (v < 10 ? 8 : 16);

  /** Bytes of payload a version can carry in byte mode at level M. */
  function capacity(v) {
    const { total, ecc, blocks } = VERSIONS[v];
    const dataCodewords = total - ecc * (blocks[0] + blocks[1]);
    return dataCodewords - 2 - (countBits(v) > 8 ? 1 : 0);
  }

  // ---------- BCH, for the format and version information ----------

  function bch(value, poly, bits) {
    let v = value << bits;
    const polyBits = 32 - Math.clz32(poly);
    while (32 - Math.clz32(v) >= polyBits) v ^= poly << (32 - Math.clz32(v) - polyBits);
    return (value << bits) | v;
  }

  // Level M is 0b00; the spec then XORs the whole 15-bit string with 0x5412.
  const formatBits = mask => (bch((0b00 << 3) | mask, 0x537, 10)) ^ 0x5412;
  const versionBits = v => bch(v, 0x1f25, 12);

  // ---------- Bit stream ----------

  function bitStream() {
    const bytes = [];
    let cur = 0, n = 0;
    return {
      push(value, len) {
        for (let i = len - 1; i >= 0; i--) {
          cur = (cur << 1) | ((value >>> i) & 1);
          if (++n === 8) { bytes.push(cur); cur = 0; n = 0; }
        }
      },
      finish(targetBytes) {
        if (n > 0) { bytes.push(cur << (8 - n)); cur = 0; n = 0; }
        const pad = [0xec, 0x11];
        for (let i = 0; bytes.length < targetBytes; i++) bytes.push(pad[i % 2]);
        return bytes;
      },
      get bitLength() { return bytes.length * 8 + n; }
    };
  }

  // ---------- Encode ----------

  function encode(text) {
    const data = new TextEncoder().encode(text);

    let version = 0;
    for (let v = 1; v <= 10; v++) {
      if (data.length <= capacity(v)) { version = v; break; }
    }
    if (!version) throw new Error('QR: text too long (max ' + capacity(10) + ' bytes)');

    const { total, ecc, blocks } = VERSIONS[version];
    const numBlocks = blocks[0] + blocks[1];
    const dataCodewords = total - ecc * numBlocks;

    const bs = bitStream();
    bs.push(0b0100, 4);                       // byte mode
    bs.push(data.length, countBits(version)); // character count
    for (const b of data) bs.push(b, 8);
    // Terminator: up to four zero bits, but never past the capacity.
    bs.push(0, Math.min(4, dataCodewords * 8 - bs.bitLength));
    const codewords = bs.finish(dataCodewords);

    // Split into blocks. Group 2 blocks carry one extra data codeword each.
    const shortLen = Math.floor(dataCodewords / numBlocks);
    const dataBlocks = [];
    const eccBlocks = [];
    let at = 0;
    for (let i = 0; i < numBlocks; i++) {
      const len = shortLen + (i >= blocks[0] ? 1 : 0);
      const block = codewords.slice(at, at + len);
      at += len;
      dataBlocks.push(block);
      eccBlocks.push(rsEncode(block, ecc));
    }

    // Interleave: one codeword from each block in turn, then the same for ECC.
    const out = [];
    const maxData = Math.max(...dataBlocks.map(b => b.length));
    for (let i = 0; i < maxData; i++)
      for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
    for (let i = 0; i < ecc; i++)
      for (const b of eccBlocks) out.push(b[i]);

    return { version, codewords: out };
  }

  // ---------- Matrix ----------

  function buildMatrix(version, codewords) {
    const size = version * 4 + 17;
    const m = Array.from({ length: size }, () => new Int8Array(size).fill(-1)); // -1 = free
    const reserved = Array.from({ length: size }, () => new Uint8Array(size));

    const set = (r, c, v) => { m[r][c] = v; reserved[r][c] = 1; };

    // Finder patterns and their separators.
    for (const [br, bc] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
      for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
        const rr = br + r, cc = bc + c;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                       (c >= 0 && c <= 6 && (r === 0 || r === 6));
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        set(rr, cc, (inRing || inCore) ? 1 : 0);
      }
    }

    // Alignment patterns — skipped where they would sit on a finder.
    const centres = ALIGN[version];
    for (const r of centres) for (const c of centres) {
      const nearFinder = (r <= 8 && c <= 8) || (r <= 8 && c >= size - 9) || (r >= size - 9 && c <= 8);
      if (nearFinder) continue;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
        set(r + dr, c + dc, (Math.max(Math.abs(dr), Math.abs(dc)) !== 1) ? 1 : 0);
    }

    // Timing patterns.
    for (let i = 8; i < size - 8; i++) {
      set(6, i, i % 2 === 0 ? 1 : 0);
      set(i, 6, i % 2 === 0 ? 1 : 0);
    }

    // Dark module, and reserve the format-information areas.
    set(size - 8, 8, 1);
    for (let i = 0; i < 9; i++) {
      if (!reserved[8][i]) set(8, i, 0);
      if (!reserved[i][8]) set(i, 8, 0);
    }
    for (let i = 0; i < 8; i++) {
      if (!reserved[8][size - 1 - i]) set(8, size - 1 - i, 0);
      if (!reserved[size - 1 - i][8]) set(size - 1 - i, 8, 0);
    }

    // Version information (version 7 and up).
    if (version >= 7) {
      const bits = versionBits(version);
      for (let i = 0; i < 18; i++) {
        const bit = (bits >> i) & 1;
        const r = Math.floor(i / 3), c = i % 3;
        set(r, size - 11 + c, bit);
        set(size - 11 + c, r, bit);
      }
    }

    // Data, zigzagging up and down two-column strips from the bottom right.
    // Column 6 is the vertical timing pattern and is stepped over entirely.
    let bitIndex = 0;
    const nextBit = () => {
      if (bitIndex >= codewords.length * 8) return 0;
      const bit = (codewords[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1;
      bitIndex++;
      return bit;
    };

    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (const c of [right, right - 1]) {
          if (reserved[r][c]) continue;
          m[r][c] = nextBit();
        }
      }
      upward = !upward;
    }

    return { m, reserved, size };
  }

  const MASKS = [
    (i, j) => (i + j) % 2 === 0,
    (i) => i % 2 === 0,
    (i, j) => j % 3 === 0,
    (i, j) => (i + j) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
    (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
    (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
    (i, j) => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0
  ];

  function penalty(m, size) {
    let score = 0;

    // Rule 1 — runs of five or more of the same colour.
    for (let i = 0; i < size; i++) {
      for (const rowwise of [true, false]) {
        let run = 1;
        for (let j = 1; j < size; j++) {
          const a = rowwise ? m[i][j] : m[j][i];
          const b = rowwise ? m[i][j - 1] : m[j - 1][i];
          if (a === b) { run++; }
          else { if (run >= 5) score += 3 + (run - 5); run = 1; }
        }
        if (run >= 5) score += 3 + (run - 5);
      }
    }

    // Rule 2 — 2x2 blocks of one colour.
    for (let i = 0; i < size - 1; i++)
      for (let j = 0; j < size - 1; j++) {
        const v = m[i][j];
        if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) score += 3;
      }

    // Rule 3 — the finder-lookalike 1011101 with four light modules either side.
    const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    const hit = (get, at) => {
      const okA = A.every((v, k) => get(at + k) === v);
      const okB = B.every((v, k) => get(at + k) === v);
      return okA || okB;
    };
    for (let i = 0; i < size; i++)
      for (let j = 0; j + 11 <= size; j++) {
        if (hit(k => m[i][k], j)) score += 40;
        if (hit(k => m[k][i], j)) score += 40;
      }

    // Rule 4 — drift away from a 50/50 split of dark and light.
    let dark = 0;
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) dark += m[i][j];
    const pct = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;

    return score;
  }

  // forceMask is for the test harness only — production always lets the
  // penalty rules choose.
  function matrix(text, forceMask) {
    const { version, codewords } = encode(text);
    const { m, reserved, size } = buildMatrix(version, codewords);

    let best = null;
    for (let mask = 0; mask < 8; mask++) {
      if (forceMask != null && mask !== forceMask) continue;
      const test = m.map(row => Int8Array.from(row));
      for (let i = 0; i < size; i++)
        for (let j = 0; j < size; j++)
          if (!reserved[i][j] && MASKS[mask](i, j)) test[i][j] ^= 1;

      const fmt = formatBits(mask);
      applyFormat(test, size, fmt);

      const score = penalty(test, size);
      if (!best || score < best.score) best = { score, grid: test };
    }

    return Array.from(best.grid, row => Array.from(row));
  }

  /** Format information goes in two places so a damaged corner is survivable. */
  function applyFormat(grid, size, fmt) {
    for (let i = 0; i < 15; i++) {
      const bit = (fmt >> i) & 1;
      // Copy one, around the top-left finder: bits 0–8 run DOWN column 8, then
      // bits 9–14 run LEFT along row 8. Getting these two axes the wrong way
      // round produces a QR that looks perfect and scans as nothing at all.
      if (i < 6) grid[i][8] = bit;
      else if (i === 6) grid[7][8] = bit;
      else if (i === 7) grid[8][8] = bit;
      else if (i === 8) grid[8][7] = bit;
      else grid[8][14 - i] = bit;
      // Copy two: bits 0–7 run LEFT along row 8 from the right edge, then bits
      // 8–14 run DOWN column 8 to the bottom edge. Note this is the opposite
      // orientation to copy one — that asymmetry is easy to get wrong.
      if (i < 8) grid[8][size - 1 - i] = bit;
      else grid[size - 15 + i][8] = bit;
    }
    grid[size - 8][8] = 1; // the dark module is always dark
  }

  /** Renders as one SVG path — sharp at any size, and no canvas needed. */
  function svg(text, opts = {}) {
    const quiet = opts.quiet != null ? opts.quiet : 4;
    const dark = opts.dark || '#16344B';
    const light = opts.light || '#FFFFFF';
    const grid = matrix(text);
    const n = grid.length;
    const dim = n + quiet * 2;

    let d = '';
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (grid[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" ` +
           `shape-rendering="crispEdges" role="img" aria-label="QR code for ${
             String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))
           }">` +
           `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
           `<path d="${d}" fill="${dark}"/></svg>`;
  }

  // _encode and the forceMask arg exist for the test harness in scripts/qr-verify.mjs.
  global.QR = { matrix, svg, capacity, _encode: encode };
})(window);
