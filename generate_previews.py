#!/usr/bin/env python3
import requests
import json
import os
import time

API_KEY = "b6c93d1e-a758-486e-bb6d-5ada0589298c:81db821b9d91811915283494125da0ba"
TTS_URL = "https://fal.run/fal-ai/elevenlabs/tts/eleven-v3"
OUTPUT_DIR = "/root/bookreel/public/voice-previews"
TEXT = "The road stretched endlessly before them, disappearing into the horizon like a forgotten promise. Whatever lay ahead, there was no turning back now."

VOICES = [
    "Daniel", "George", "Liam", "Bill", "Charlotte", "Alice", "Charlie",
    "Rachel", "Aria", "Roger", "Sarah", "Laura", "Callum", "River",
    "Matilda", "Will", "Jessica", "Eric", "Chris", "Brian", "Lily"
]

headers = {
    "Authorization": f"Key {API_KEY}",
    "Content-Type": "application/json"
}

succeeded = []
failed = []

for voice in VOICES:
    print(f"\n--- Generating: {voice} ---", flush=True)
    payload = {
        "text": TEXT,
        "voice": voice,
        "stability": 0.5,
        "output_format": "mp3_44100_128"
    }
    try:
        resp = requests.post(TTS_URL, headers=headers, json=payload, timeout=90)
        print(f"  Status: {resp.status_code}", flush=True)
        if resp.status_code != 200:
            print(f"  Error body: {resp.text[:500]}", flush=True)
            failed.append((voice, f"HTTP {resp.status_code}: {resp.text[:200]}"))
            continue

        data = resp.json()
        print(f"  Response keys: {list(data.keys())}", flush=True)

        # Try to find audio URL in various possible response shapes
        audio_url = None
        if "audio" in data and isinstance(data["audio"], dict):
            audio_url = data["audio"].get("url")
        if not audio_url and "url" in data:
            audio_url = data["url"]
        if not audio_url and "audio_url" in data:
            audio_url = data["audio_url"]
        if not audio_url:
            print(f"  Full response: {json.dumps(data)[:1000]}", flush=True)
            failed.append((voice, f"No audio URL in response: {list(data.keys())}"))
            continue

        print(f"  Audio URL: {audio_url[:80]}...", flush=True)
        audio_resp = requests.get(audio_url, timeout=60)
        if audio_resp.status_code != 200:
            failed.append((voice, f"Download failed: HTTP {audio_resp.status_code}"))
            continue

        out_path = os.path.join(OUTPUT_DIR, f"{voice.lower()}.mp3")
        with open(out_path, "wb") as f:
            f.write(audio_resp.content)
        size = len(audio_resp.content)
        print(f"  Saved: {out_path} ({size} bytes)", flush=True)
        succeeded.append(voice)

    except Exception as e:
        print(f"  Exception: {e}", flush=True)
        failed.append((voice, str(e)))

    time.sleep(0.5)

print("\n\n=== RESULTS ===", flush=True)
print(f"Succeeded ({len(succeeded)}): {succeeded}", flush=True)
print(f"Failed ({len(failed)}): {[(v, r[:100]) for v, r in failed]}", flush=True)

with open("/tmp/voice_results.json", "w") as f:
    json.dump({"succeeded": succeeded, "failed": [v for v, _ in failed]}, f)
