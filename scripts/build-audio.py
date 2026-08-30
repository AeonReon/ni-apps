#!/usr/bin/env python3
"""
Build the spoken clips for NI Apps.

Kokoro runs locally (APPS/kokoro-tts, PM2 process `kokoro-tts`, port 8765) and
returns WAV, so each clip is stitched paragraph-by-paragraph and then encoded to
MP3 with ffmpeg. Long text in one request comes back rushed and clipped, hence
the per-paragraph split with a short pause welded between.

    python3 scripts/build-audio.py            # only missing clips
    python3 scripts/build-audio.py --force    # rebuild everything

The scripts below are written to be HEARD, not read — no markdown, numbers
spelled the way a person says them.
"""

import argparse
import io
import subprocess
import sys
import wave
from pathlib import Path

import urllib.request
import json

TTS = "http://127.0.0.1:8765/api/tts"
VOICE = "bf_emma"          # British, friendly — the settled NI Apps voice
SPEED = 0.98
PAUSE = 0.45               # seconds of silence welded between paragraphs

OUT = Path(__file__).resolve().parent.parent / "audio"

CLIPS = {
    # ---------- what each app does ----------
    "listen-daysout": [
        "Days Out NI puts every day out in Northern Ireland onto one map.",
        "Open it and it shows you what's near you right now. Over two thousand places across all six counties. Parks, beaches, forests, castles, play parks, soft plays, farms, museums, walks, and the wee spots that only locals know about.",
        "Tap any pin and you get the detail that actually decides your day. What's there, whether it's free, whether there's parking and a toilet, and whether it's any use to you in the rain.",
        "Then there's what's on. Festivals, markets, shows, seasonal events, refreshed every hour, so it's this week's list rather than last year's.",
        "You can save a day out, string a few places together into a route, and send the whole thing to whoever you're going with.",
        "No account, no sign up, no ads. It's free, and it stays free.",
    ],
    "listen-fuel": [
        "FuelFinder NI shows you live petrol and diesel prices right across Northern Ireland, cheapest first.",
        "The prices come straight from the official UK Fuel Finder scheme, which stations now have to report to. So it's what the pump is actually charging today. Not a guess, and not somebody's week old memory.",
        "Sort by cheapest, or sort by nearest. Both are one tap.",
        "And there's a worth the drive check, which does the sum you can't be bothered doing. It works out whether the cheaper station eight miles away really saves you money once you've burned fuel getting there. Quite often it doesn't, and it will tell you so.",
        "Petrol, diesel and super unleaded. Free, and there's no account.",
    ],
    "listen-weather": [
        "Happy Weather is the weather app that tells you when the sun is coming.",
        "Most weather apps look like somebody set out to make you miserable. Rain icons, warnings, alerts, cloud, seven grey days in a row. If you were deliberately designing something to flatten a person's mood, that's more or less what you'd build. And it's usually not even true. It rains for twenty minutes, and the whole week gets painted grey.",
        "Happy Weather turns it the other way round. It shows you the good hours. How much sun you're getting today, and exactly when it lands. How long the dry stretch runs, so you know whether you've time to get out and back. And it gives you a nudge when the sun is on its way, so you can drop what you're at and go.",
        "It doesn't take any one forecast on trust either. It pulls four separate weather models and takes the middle of them, so a single over confident model can't wreck your day.",
        "Pick your town from thirty three across Northern Ireland. Belfast, Derry, Enniskillen, Newcastle, Portrush, Armagh, Omagh, and the rest.",
    ],
    "listen-parenting": [
        "Conscious Parenting NI is for parents who want to think about it properly, rather than just get through the day.",
        "There are eleven ways of educating a child in here. Montessori, Charlotte Mason, Steiner, classical, forest school, and more. Each one is set out in its own words, at full strength, so you can see what it genuinely claims before you decide what you make of it. Nothing gets sneered at, and nothing gets called out of date. You take what fits your family, and you leave the rest.",
        "Make It A Game turns the daily flashpoints into something playful. Getting dressed, the car seat, the bath, teeth, bedtime. Seventy small games across fourteen situations, with a note on where the pressure needs taken off rather than added.",
        "The Journey does the same thing for long drives. And Set Up The Space walks you through preparing a room. What you actually need, what you don't, and what your own part in it is.",
        "Everything stays on your phone. No account, no sign in, and nothing tracked.",
    ],

    # ---------- install walkthroughs ----------
    "install-iphone": [
        "Here's how to put one of these on your iPhone.",
        "First, make sure you're in Safari. If you tapped a link inside Facebook, or Messenger, or Instagram, or WhatsApp, then you're in their own little browser, and this won't work. Look for the three dots, or the compass icon, in the corner, and choose Open in Safari.",
        "Right. Now tap the blue Open the app button for whichever app you want. Give it a second to load.",
        "Once it's loaded, look at the bottom of the screen for the Share button. That's the square with the arrow coming out of the top of it. Tap that. On an iPad it's at the top right instead.",
        "A list slides up from the bottom. Scroll down that list until you see Add to Home Screen. Tap it.",
        "Then tap Add, in the top right corner.",
        "And that's it. The icon is now sitting on your home screen, exactly like an app from the App Store. It opens full screen with no address bar.",
        "Do it once, and you'll do the rest in about ten seconds each.",
    ],
    "install-android": [
        "Here's how to put one of these on your Android phone.",
        "First, make sure you're in Chrome. If you came here from Facebook or WhatsApp, tap the three dots in the corner and choose Open in Chrome.",
        "Now tap the blue Open the app button for whichever app you want, and give it a second to load.",
        "Once it's loaded, tap the three dots menu at the top right of Chrome.",
        "In that menu, tap Install app. Some phones say Add to Home screen instead. It's the same thing.",
        "Then tap Install to confirm.",
        "And that's it. The icon lands in your app drawer, and usually on your home screen too. Hold it and drag it wherever you want it.",
        "Do it once, and the rest take about ten seconds each.",
    ],
    "install-mac": [
        "Here's how to put one of these in the Dock on your Mac.",
        "First, tap the blue Open the app button for whichever app you want.",
        "If you're in Safari, go up to the File menu at the top of the screen, and choose Add to Dock. Give it a name, and click Add.",
        "If you're in Chrome or Edge instead, click the three dots menu, then Cast, Save and Share, then Install page as app.",
        "It now lives in your Applications folder and in Launchpad. Open Launchpad, find it, and drag it down onto the Dock to keep it there.",
        "It opens in its own window, with no browser tabs around it. Same as any other Mac app.",
    ],
}


def say(text: str) -> bytes:
    body = json.dumps({"text": text, "voice": VOICE, "speed": SPEED}).encode()
    req = urllib.request.Request(TTS, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def stitch(wavs: list[bytes]) -> bytes:
    """Concatenate WAVs with a short silence between each."""
    out = io.BytesIO()
    writer = None
    for i, raw in enumerate(wavs):
        with wave.open(io.BytesIO(raw)) as w:
            params = w.getparams()
            frames = w.readframes(w.getnframes())
        if writer is None:
            writer = wave.open(out, "wb")
            writer.setparams(params)
            silence = b"\x00" * int(params.framerate * PAUSE) * params.sampwidth * params.nchannels
        if i:
            writer.writeframes(silence)
        writer.writeframes(frames)
    writer.close()
    return out.getvalue()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", help="build a single clip by name")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)

    for name, paras in CLIPS.items():
        if args.only and args.only != name:
            continue
        dest = OUT / f"{name}.mp3"
        if dest.exists() and not args.force:
            print(f"skip  {name} (exists)")
            continue

        print(f"build {name} … {len(paras)} paragraphs")
        wav = stitch([say(p) for p in paras])

        tmp = OUT / f"{name}.wav"
        tmp.write_bytes(wav)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp),
             "-codec:a", "libmp3lame", "-b:a", "64k", "-ac", "1", str(dest)],
            check=True,
        )
        tmp.unlink()
        print(f"      -> {dest.name}  {dest.stat().st_size // 1024} KB")

    return 0


if __name__ == "__main__":
    sys.exit(main())
