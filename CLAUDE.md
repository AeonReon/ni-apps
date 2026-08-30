# ni-apps

The hand-out page. When the user meets someone and tells them about an app, this
is the address they give them: one page, every free NI app, with instructions
for turning each one into a real icon on their phone.

## At a glance

- **Live:** https://ni-apps.vercel.app (a bought domain is pending — see project.txt)
- **Repo:** AeonReon/ni-apps · **Vercel:** aeonreon/ni-apps
- **Stack:** static HTML/CSS/vanilla JS. No build step, no `buildCommand`, no framework.
- **Deploy:** `git push` (Vercel Git integration), or `vercel deploy --prod --yes --scope team_qRgSB6N9B1TST0E2pvR0YwKF --token "$VERCEL_TOKEN"`

## Design

Days Out NI's palette and type, deliberately. The masthead goes *straight* into
the Days Out card — there is no intro block, on purpose. Every app carries its
own hero photo at its own aspect ratio (`heroRatio` in the APPS array), because
cropping them all to one shape would cut half the landmarks out of the Days Out
panorama. First body paragraph shows; the rest sit behind the drop-down.

- Sky `#5FB1DD` → `#3F8FCB`, sun `#FFCE3D`, deep `#1F5E8A`
- Poppins for headings, Inter for body (same pairing as daysoutni.com)
- Gradient-outline on every card, per-card `--accent`

## The quick-pick shelf (on trial)

The row of four App Store-style tiles under the masthead (`<nav id="shelf">` in
index.html, the shelf renderer in app.js, the `.shelf` / `.pick` block in
styles.css). Tapping a tile jumps to that app's card — it does NOT open the app,
because the card is where Open and the install button live and a stranger's
first tap shouldn't throw them out of the page.

Added 2026-08-30 for the user to look at and decide on. If it goes, delete those
three blocks and the `short:` fields — nothing else depends on it.

## Adding an app

1. Add an entry to the `APPS` array at the top of `app.js` (id, name, short,
   accent, url, icon, line, audio, body paragraphs). Order in the array = order
   on page, and `short` is what the quick-pick shelf shows.
2. Drop a 512px icon at `images/icons/<id>.png` and a hero at
   `images/hero-<id>.jpg` (~1600px wide), then set `heroRatio` to its real
   `width / height`.
3. Add the spoken script to `CLIPS` in `scripts/build-audio.py`, then
   `python3 scripts/build-audio.py` (only builds what's missing).

Nothing else changes — the page renders itself from that array.

## Audio

Seven clips, voice `bf_emma` (Kokoro, British, friendly). Settled 2026-08-30:
Kokoro permanently, not the user's own voice.

Rebuild everything: `python3 scripts/build-audio.py --force`
Needs the local `kokoro-tts` service up (PM2, port 8765) and ffmpeg on PATH.
The script splits each clip per paragraph and welds a short pause between —
sending the whole script in one request comes back rushed and clipped.

## Gotchas

- **In-app browsers are the number one reason install instructions "don't
  work."** Facebook, Instagram, Messenger and TikTok open links in their own
  embedded browser, which has no Add to Home Screen. `app.js` sniffs for them
  and shows a warning at the top of the page. Don't remove it.
- **Never put `Icon?` in this repo's `.gitignore`.** `core.ignorecase` is on by
  default on macOS, so that pattern also matches `images/icons/` and silently
  drops every app icon from the deploy. This shipped broken once already.
- **The app icon is absolutely positioned on `.app-shot`, not in the text flow.**
  It used to be a flex row pulled up with a negative margin, and a title long
  enough to wrap (Conscious Parenting NI) rode up onto the photo.
- **Never add a `buildCommand`.** Static PWAs on Vercel get stranded at UNKNOWN.
- The four app URLs are hardcoded in `app.js`. `new-beginnings.vercel.app` is
  someone else's project — Conscious Parenting NI is at
  `new-beginnings-livid.vercel.app`.
