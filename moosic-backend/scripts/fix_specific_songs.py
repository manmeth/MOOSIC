"""
One-off script to manually set audio_url for specific songs by id.
Edit the FIXES dict below with more song_id: youtube_url pairs whenever
you find a working link by hand, then just re-run this script.

Run from moosic-backend/:
    python scripts/fix_specific_songs.py
"""
import re
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, create_tables  # noqa: E402
import models  # noqa: E402

# song_id -> full youtube.com/watch or youtu.be link (any format is fine, it
# gets normalized to the embed form automatically below)
FIXES = {
    64: "https://youtu.be/sFMRqxCexDk",   # Choo Lo
    69: "https://youtu.be/dnXGxMlV-rU",   # Soch Hai
}

YOUTUBE_ID_RE = re.compile(r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/))([A-Za-z0-9_-]{6,})")


def main():
    create_tables()
    db = SessionLocal()

    for song_id, url in FIXES.items():
        song = db.query(models.Song).filter(models.Song.id == song_id).first()
        if not song:
            print(f"  ✗ No song with id {song_id}, skipping")
            continue

        match = YOUTUBE_ID_RE.search(url)
        if not match:
            print(f"  ✗ Could not find a video id in {url!r}, skipping")
            continue

        video_id = match.group(1)
        song.audio_url = f"https://www.youtube.com/embed/{video_id}"
        song.is_playable = True
        song.audio_checked_at = datetime.utcnow()
        print(f"  ✓ #{song_id} {song.title!r} -> {song.audio_url}")

    db.commit()
    db.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
