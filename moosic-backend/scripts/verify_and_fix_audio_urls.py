"""
Finds a real, playable YouTube video for every song in the database and
fixes audio_url accordingly. Replaces the old approach of guessing/hardcoding
video ids (error-prone) with:

  1. YouTube Data API v3 `search.list` to find the actual best-matching video
     for "{title} {artist_name}" (much more reliable than a title alone,
     e.g. avoids "Subanallah" matching an unrelated nasheed video).
  2. YouTube's public oEmbed endpoint to VERIFY the found video actually
     exists and allows embedding, before saving it.

Requires:
    pip install requests
    export YOUTUBE_API_KEY=your_key_here   # https://console.cloud.google.com -> enable "YouTube Data API v3"

Run from moosic-backend/:
    python scripts/verify_and_fix_audio_urls.py            # fix everything missing/unverified
    python scripts/verify_and_fix_audio_urls.py --all       # re-check every song, even ones already marked playable
    python scripts/verify_and_fix_audio_urls.py --dry-run   # show what would change, write nothing
"""
import argparse
import os
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, create_tables  # noqa: E402
import models  # noqa: E402

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_OEMBED_URL = "https://www.youtube.com/oembed"
REQUEST_DELAY_SECONDS = 0.3  # be polite / avoid hammering quota


def find_video_id(api_key: str, query: str) -> str | None:
    """Search YouTube for `query` and return the top video id, or None."""
    params = {
        "key": api_key,
        "q": query,
        "part": "snippet",
        "type": "video",
        "maxResults": 1,
        "videoEmbeddable": "true",
    }
    resp = requests.get(YOUTUBE_SEARCH_URL, params=params, timeout=10)
    if resp.status_code == 403:
        raise RuntimeError(
            "YouTube API returned 403 - most likely your daily quota is used up "
            "or the API key/API isn't enabled. Response: " + resp.text[:300]
        )
    resp.raise_for_status()
    items = resp.json().get("items", [])
    if not items:
        return None
    return items[0]["id"]["videoId"]


def is_embeddable(video_id: str) -> bool:
    """Confirm the video still exists and embedding isn't disabled by the owner."""
    resp = requests.get(
        YOUTUBE_OEMBED_URL,
        params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"},
        timeout=10,
    )
    return resp.status_code == 200


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="Re-check songs already marked playable too")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to the database")
    args = parser.parse_args()

    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        print("ERROR: set YOUTUBE_API_KEY first, e.g.\n  export YOUTUBE_API_KEY=AIza...")
        sys.exit(1)

    create_tables()
    db = SessionLocal()

    query = db.query(models.Song)
    if not args.all:
        query = query.filter(models.Song.is_playable.isnot(True))
    songs = query.all()

    print(f"Checking {len(songs)} song(s)...\n")

    fixed, still_broken = 0, 0
    for song in songs:
        artist_name = song.artist.name if song.artist else ""
        search_query = f"{song.title} {artist_name}".strip()

        try:
            video_id = find_video_id(api_key, search_query)
        except RuntimeError as exc:
            print(f"[STOP] {exc}")
            break

        time.sleep(REQUEST_DELAY_SECONDS)

        if not video_id or not is_embeddable(video_id):
            print(f"  ✗ #{song.id:<4} {song.title!r} -> no playable video found")
            still_broken += 1
            if not args.dry_run:
                song.is_playable = False
                song.audio_checked_at = __import__("datetime").datetime.utcnow()
            continue

        new_url = f"https://www.youtube.com/embed/{video_id}"
        print(f"  ✓ #{song.id:<4} {song.title!r} -> {new_url}")
        fixed += 1
        if not args.dry_run:
            song.audio_url = new_url
            song.is_playable = True
            song.audio_checked_at = __import__("datetime").datetime.utcnow()

    if not args.dry_run:
        db.commit()
    db.close()

    print(f"\nDone. Fixed: {fixed}  Still broken: {still_broken}"
          + ("  (dry run, nothing written)" if args.dry_run else ""))


if __name__ == "__main__":
    main()
