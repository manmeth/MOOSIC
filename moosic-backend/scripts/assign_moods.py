"""
Assigns a mood (Happy / Sad / Angry / Exhausted / Neutral) to every song in
the catalog that doesn't already have one. Without this, any song with no
mood defaults to "Neutral" in the frontend, which is why most mood
categories only ever showed 1-2 songs while Neutral had everything else.

This is a one-time content-curation pass, not an exact science - feel free
to open this file and change any assignment you disagree with, then re-run.

Run from moosic-backend/:
    python scripts/assign_moods.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, create_tables  # noqa: E402
import models  # noqa: E402

# title -> mood. Only covers the big catalog; the 15 Hindi mood_songs
# entries already have a mood set from when they were originally seeded.
MOOD_BY_TITLE = {
    "Welcome to New York": "Happy", "Shake It Off": "Happy", "Out of the Woods": "Exhausted",
    "Shape of You": "Happy", "Perfect": "Sad", "Castle on the Hill": "Happy",
    "Hello": "Sad", "Someone Like You": "Sad", "Rolling in the Deep": "Angry",
    "Levitating": "Happy", "Don't Start Now": "Happy", "Physical": "Happy",
    "Tum Hi Ho": "Sad", "Chahun Main Ya Naa": "Sad", "Kala Chashma": "Happy",
    "Genda Phool": "Happy", "Hips Don't Lie": "Happy", "Waka Waka": "Happy",
    "Chandelier": "Exhausted", "Elastic Heart": "Angry", "Blinding Lights": "Happy",
    "Save Your Tears": "Exhausted", "That's What I Like": "Happy", "24K Magic": "Happy",
    "Treasure": "Happy", "Closer": "Exhausted", "Paris": "Sad", "Feels": "Happy",
    "Slide": "Happy", "Sunny Sunny": "Happy", "Manali Trance": "Happy",
    "London Thumakda": "Happy", "Gunjan Gaun": "Neutral", "Doorie": "Sad",
    "Bheegi Bheegi": "Sad", "Woh Lamhe": "Sad", "Khuda ke Liye": "Sad",
    "Dil Ruba": "Happy", "Mundian To Bach Ke": "Happy", "Brown Rang": "Angry",
    "I Kissed a Girl": "Happy", "Hot N Cold": "Angry", "Yellow": "Sad",
    "Paradise": "Exhausted", "Work": "Happy", "Kiss It Better": "Exhausted",
    "Jai Ho": "Happy", "Rn Samayal": "Neutral", "Aaye Ho Meri Zindagi": "Sad",
    "Lag Ja Gale": "Sad", "Thank U, Next": "Happy", "Break Up with Your Girlfriend": "Happy",
    "Circles": "Exhausted", "Goodbyes": "Exhausted", "Mere Naam": "Neutral",
    "Azadi": "Angry",
}


def main():
    create_tables()
    db = SessionLocal()

    updated, skipped = 0, 0
    for title, mood in MOOD_BY_TITLE.items():
        song = db.query(models.Song).filter(models.Song.title == title).first()
        if not song:
            skipped += 1
            continue
        song.mood = mood
        updated += 1

    db.commit()

    # Print how many songs are now in each mood bucket, so you can sanity-check the spread.
    print("Mood distribution after update:")
    for mood in ["Happy", "Sad", "Angry", "Exhausted", "Neutral"]:
        count = db.query(models.Song).filter(models.Song.mood == mood).count()
        print(f"  {mood:<10} {count} songs")
    unset = db.query(models.Song).filter(models.Song.mood.is_(None)).count()
    if unset:
        print(f"  (no mood)  {unset} songs")

    db.close()
    print(f"\nUpdated {updated} songs, {skipped} titles not found in your database.")


if __name__ == "__main__":
    main()
