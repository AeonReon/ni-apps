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

Days Out NI's palette and type, deliberately — the Days Out headline image is
the hero, and it doubles as the first featured app, so the page reads as
Northern Irish before anyone reads a word.

- Sky `#5FB1DD` → `#3F8FCB`, sun `#FFCE3D`, deep `#1F5E8A`
- Poppins for headings, Inter for body (same pairing as daysoutni.com)
- Gradient-outline on every card, per-card `--accent`

## Adding an app

1. Add an entry to the `APPS` array at the top of `app.js` (id, name, accent,
   url, icon, line, audio, body paragraphs). Order in the array = order on page.
2. Drop a 512px icon at `images/icons/<id>.png`.
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
- **`height: auto` on `.app-hero` is load-bearing.** The `<img>` height
  attribute is a presentational hint that otherwise beats `aspect-ratio` and
  renders the hero 793px tall.
- **Never add a `buildCommand`.** Static PWAs on Vercel get stranded at UNKNOWN.
- The four app URLs are hardcoded in `app.js`. `new-beginnings.vercel.app` is
  someone else's project — Conscious Parenting NI is at
  `new-beginnings-livid.vercel.app`.
