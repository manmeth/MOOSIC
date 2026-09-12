"""
Re-checks every song's EXISTING audio_url against YouTube's oEmbed endpoint
and updates is_playable accordingly. No API key needed - use this to find
out which of your already-hardcoded catalog entries have gone dead or had
embedding disabled by the video owner (both very common on YouTube over time).

For songs with no audio_url at all (e.g. freshly seeded mood songs before
you've run verify_and_fix_audio_urls.py), this just marks them unplayable -
it can't find a new URL for you, only check ones that already exist.

Run from moosic-backend/:
    python scripts/health_check_audio_urls.py
"""
import re
import sys
from datetime import datetime
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, create_tables  # noqa: E402
import models  # noqa: E402

OEMBED_URL = "https://www.youtube.com/oembed"
EMBED_ID_RE = re.compile(r"youtube\.com/embed/([A-Za-z0-9_-]{6,})")


def check_url(audio_url: str) -> bool:
    match = EMBED_ID_RE.search(audio_url or "")
    if not match:
        # Not a youtube.com/embed/{id} URL at all (e.g. a direct mp3, or the
        # old broken listType=search placeholder) - treat as unverifiable/broken.
        return False
    video_id = match.group(1)
    try:
        resp = requests.get(
            OEMBED_URL,
            params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"},
            timeout=10,
        )
        return resp.status_code == 200
    except requests.RequestException:
        return False


def main():
    create_tables()
    db = SessionLocal()
    songs = db.query(models.Song).all()
    print(f"Checking {len(songs)} song(s)...\n")

    alive, dead = 0, []
    for song in songs:
        ok = check_url(song.audio_url)
        song.is_playable = ok
        song.audio_checked_at = datetime.utcnow()
        if ok:
            alive += 1
        else:
            dead.append(song)

    db.commit()
    db.close()

    print(f"Playable: {alive}   Broken/unverifiable: {len(dead)}\n")
    if dead:
        print("Broken songs (run verify_and_fix_audio_urls.py with a YOUTUBE_API_KEY to fix these):")
        for song in dead:
            print(f"  #{song.id:<4} {song.title}")


if __name__ == "__main__":
    main()
