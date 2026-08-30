/* ============================================================
   NI Apps — one page, four apps, plain vanilla JS.
   Add an app = add an entry to APPS below. Nothing else to change.
   ============================================================ */

const APPS = [
  {
    id: 'daysoutni',
    short: 'Days Out',
    name: 'Days Out NI',
    accent: '#2F7FB6',
    url: 'https://daysoutni.com',
    icon: 'images/icons/daysoutni.png',
    hero: 'images/hero-daysoutni.jpg',
    heroRatio: '1600 / 640',
    featured: true,
    line: 'Every day out in Northern Ireland on one map — over two thousand places, plus what’s actually on this week.',
    audio: 'audio/listen-daysout.mp3',
    body: [
      'Open it and the map shows you what’s near you right now. Over <b>two thousand places</b> across all six counties — parks, beaches, forests, castles, play parks, soft plays, farms, museums, walks, and the wee spots only locals know about.',
      'Tap any pin and you get the detail that actually decides your day: what’s there, whether it’s free, whether there’s parking and a toilet, and whether it’s any use in the rain.',
      'Then there’s <b>what’s on</b> — festivals, markets, shows, seasonal events — refreshed every hour, so it’s this week’s list rather than last year’s.',
      'You can save a day out, string a few places together into a route, and send the whole thing to whoever you’re going with. No account, no sign-up, no ads.'
    ]
  },
  {
    id: 'fuelfinderni',
    short: 'FuelFinder',
    name: 'FuelFinder NI',
    accent: '#0D7D5A',
    url: 'https://fuelfinderni.vercel.app',
    icon: 'images/icons/fuelfinderni.png',
    hero: 'images/hero-fuelfinderni.jpg',
    heroRatio: '1600 / 900',
    line: 'Live petrol and diesel prices across Northern Ireland, cheapest first.',
    audio: 'audio/listen-fuel.mp3',
    body: [
      'The prices come straight from the <b>official UK Fuel Finder scheme</b>, which stations are now required to report to. So it’s what the pump is actually charging today, not a guess and not somebody’s week-old memory.',
      'Sort by cheapest, or sort by nearest. Both are one tap.',
      'The <b>worth-the-drive check</b> does the sum you can’t be bothered doing: it works out whether the cheaper station eight miles away really saves you money once you’ve burned fuel getting there. Quite often it doesn’t — and it will tell you so.',
      'Petrol, diesel and super unleaded. Free, no account.'
    ]
  },
  {
    id: 'happy-weather',
    short: 'Weather',
    name: 'Happy Weather',
    accent: '#3F9CD6',
    url: 'https://happy-weather-aeonreon.vercel.app',
    icon: 'images/icons/happy-weather.png',
    hero: 'images/hero-happy-weather.jpg',
    heroRatio: '1600 / 900',
    line: 'The weather app that tells you when the sun is coming.',
    audio: 'audio/listen-weather.mp3',
    body: [
      'Most weather apps look like somebody set out to make you miserable. Rain icons, warnings, alerts, cloud, seven grey days in a row. If you were deliberately designing something to flatten a person’s mood, that is more or less what you would build — and it is usually not even true. It rains for twenty minutes and the whole week gets painted grey.',
      'Happy Weather turns it the other way round. It shows you <b>the good hours</b>. How much sun you’re getting today and exactly when it lands. How long the dry stretch runs, so you know whether you’ve time to get out and back. And it gives you a nudge when the sun is on its way, so you can drop what you’re at and go.',
      'It doesn’t take any one forecast on trust, either. It pulls <b>four separate weather models</b> and takes the middle of them, so a single over-confident model can’t wreck your day.',
      'Pick your town from thirty-three across Northern Ireland — Belfast, Derry, Enniskillen, Newcastle, Portrush, Armagh, Omagh and the rest.'
    ]
  },
  {
    id: 'conscious-parenting',
    short: 'Parenting',
    name: 'Conscious Parenting NI',
    accent: '#E09A12',
    url: 'https://new-beginnings-livid.vercel.app',
    icon: 'images/icons/conscious-parenting.png',
    hero: 'images/hero-conscious-parenting.jpg',
    heroRatio: '1600 / 1066',
    line: 'A calmer way through the parenting day, and an honest look at how children actually learn.',
    audio: 'audio/listen-parenting.mp3',
    body: [
      '<b>Eleven ways of educating a child</b> — Montessori, Charlotte Mason, Steiner, classical, forest school and more — each one set out in its own words, at full strength, so you can see what it genuinely claims before you decide what you make of it. Nothing gets sneered at and nothing gets called out of date. You take what fits your family and leave the rest.',
      '<b>Make It A Game</b> turns the daily flashpoints into something playful — getting dressed, the car seat, the bath, teeth, bedtime. Seventy small games across fourteen situations, with a note on where the pressure needs taken off rather than added.',
      '<b>The Journey</b> does the same for long drives, and <b>Set Up The Space</b> walks you through preparing a room — what you actually need, what you don’t, and what your own part in it is.',
      'Everything stays on your phone. No account, no sign-in, nothing tracked.'
    ]
  }
];

/* ---------- Render ---------- */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function tile(app, i) {
  // Each hero keeps its own proportions rather than being cropped to a shared
  // ratio — the Days Out panorama is 2.5:1 and would lose half its landmarks.
  const hero = app.hero
    ? `<img class="app-hero" src="${app.hero}" alt="${esc(app.name)}"
            style="aspect-ratio:${app.heroRatio || '16 / 9'}"
            ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>`
    : '';
  const badge = app.featured ? '<span class="badge">Start here</span>' : '';

  // First paragraph always on show; the rest wait behind the drop-down so the
  // page stays scannable when you're handing the phone to someone.
  const [lead, ...rest] = app.body;
  const more = rest.length ? `
      <details class="more">
        <summary>More about ${esc(app.name)}</summary>
        <div class="prose">${rest.map(p => `<p>${p}</p>`).join('')}</div>
      </details>` : '';

  return `
  <section id="app-${app.id}" class="app grad-outline${app.featured ? ' featured' : ''}" style="--accent:${app.accent}">
    <div class="app-shot">
      ${hero}
      <img class="app-icon" src="${app.icon}" alt="" width="512" height="512">
    </div>
    <div class="app-body">
      <div class="app-title">${badge}<h3>${esc(app.name)}</h3></div>
      <p class="app-line">${app.line}</p>
      <div class="prose app-lead"><p>${lead}</p></div>
      <div class="audio" data-src="${app.audio}" data-label="Listen — what it does"></div>
      <div class="actions">
        <a class="btn btn-primary" href="${app.url}" target="_blank" rel="noopener">Open the app</a>
        <a class="btn btn-ghost jump" href="#how">Put it on my phone</a>
      </div>${more}
    </div>
  </section>`;
}

document.getElementById('app-list').innerHTML = APPS.map(tile).join('');

/* ---------- Quick-pick shelf ----------
   All four visible without scrolling, App Store style. Tapping one drops you at
   that app's full card rather than opening it — the card is where the Open and
   the install buttons live, and a stranger holding the phone shouldn't be
   thrown straight out of the page by their first tap. */

document.getElementById('shelf').innerHTML = APPS.map(app => `
  <a class="pick grad-outline" href="#app-${app.id}" style="--accent:${app.accent}">
    <img src="${app.icon}" alt="" width="512" height="512">
    <span class="pick-name">${esc(app.short || app.name)}</span>
    <span class="pick-get">Get</span>
  </a>`).join('');

/* ---------- Audio: one player at a time ---------- */

let current = null;

document.querySelectorAll('.audio').forEach(box => {
  const label = box.dataset.label || 'Listen';
  box.innerHTML =
    `<button class="btn btn-listen" type="button"><span class="dot">▶</span><span class="txt">${esc(label)}</span></button>
     <div class="audio-bar"><i></i></div>`;

  const btn  = box.querySelector('button');
  const dot  = box.querySelector('.dot');
  const txt  = box.querySelector('.txt');
  const fill = box.querySelector('.audio-bar i');
  let el = null;

  function reset() {
    box.classList.remove('playing');
    dot.textContent = '▶';
    txt.textContent = label;
    fill.style.width = '0';
  }

  btn.addEventListener('click', () => {
    // Built lazily on the first tap so iOS treats it as a user gesture.
    if (!el) {
      el = new Audio(box.dataset.src);
      el.preload = 'none';
      el.addEventListener('timeupdate', () => {
        if (el.duration) fill.style.width = (el.currentTime / el.duration * 100) + '%';
      });
      el.addEventListener('ended', () => { current = null; reset(); });
      el.addEventListener('error', () => {
        reset();
        txt.textContent = 'Audio not available yet';
        btn.disabled = true;
      });
    }

    if (!el.paused) { el.pause(); current = null; box.classList.remove('playing'); dot.textContent = '▶'; return; }

    if (current && current !== el) { current.pause(); current.currentTime = 0; }
    current = el;
    box.classList.add('playing');
    dot.textContent = '‖';
    txt.textContent = 'Playing… tap to stop';
    el.play().catch(() => { reset(); });
  });

  // A second player starting elsewhere should tidy this one's UI up.
  document.addEventListener('ni:audio', e => { if (el && e.detail !== el) reset(); });
  btn.addEventListener('click', () => document.dispatchEvent(new CustomEvent('ni:audio', { detail: el })));
});

/* ---------- Platform tabs ---------- */

const ua = navigator.userAgent;
const isIOS     = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const guess     = isIOS ? 'ios' : isAndroid ? 'android' : /Mac/.test(ua) ? 'mac' : 'ios';

function showPlatform(plat) {
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.plat === plat)));
  document.querySelectorAll('.tabpanel').forEach(p => { p.hidden = p.dataset.plat !== plat; });
  try { localStorage.setItem('niapps:plat', plat); } catch {}
}

document.querySelectorAll('.tab').forEach(t =>
  t.addEventListener('click', () => showPlatform(t.dataset.plat))
);

let saved = null;
try { saved = localStorage.getItem('niapps:plat'); } catch {}
showPlatform(saved || guess);

/* ---------- Smooth jump to the instructions ---------- */

document.addEventListener('click', e => {
  const a = e.target.closest('a.jump, a.pick');
  if (!a) return;
  const target = a.classList.contains('pick')
    ? document.querySelector(a.getAttribute('href'))
    : document.getElementById('how');
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ---------- In-app browser warning ----------
   Facebook, Instagram, Messenger, TikTok and LinkedIn all open links in their
   own embedded browser, which has no "Add to Home Screen". People read that as
   "the instructions are wrong" rather than "I'm in the wrong browser", so say
   it plainly before they get there.                                          */

const inApp = /FBAN|FBAV|FB_IAB|Instagram|Messenger|LinkedInApp|Twitter|TikTok/i.test(ua);
if (inApp) document.getElementById('inapp-warning').hidden = false;

/* ---------- Service worker ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
