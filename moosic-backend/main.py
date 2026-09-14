from datetime import datetime, timedelta
import os
import sqlite3
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from firewall import FirewallMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from database import SessionLocal, create_tables, get_db, TransactionManager
from query_optimization import OptimizedQueries
import models
import schemas


load_dotenv(Path(__file__).with_name(".env"))

SECRET_KEY = os.getenv("MOOSIC_SECRET_KEY")
if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError(
        "MOOSIC_SECRET_KEY must be set to a strong value of at least 32 characters. "
        "Copy .env.example to .env and set a private secret."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
MANAGER_ROLE = "manager"
MANAGER_REGISTRATION_CODE = os.getenv("MOOSIC_MANAGER_REGISTRATION_CODE")


create_tables()


def ensure_user_profile_columns():
    """Add profile columns to an existing database without deleting user data."""
    db = SessionLocal()
    try:
        bind = db.get_bind()
        column_names = {column["name"] for column in inspect(bind).get_columns("users")}

        if "profile_note" not in column_names:
            db.execute(text("ALTER TABLE users ADD COLUMN profile_note VARCHAR"))
            db.commit()
    finally:
        db.close()


ensure_user_profile_columns()


app = FastAPI(
    title="Moosic API",
    description="Backend for the Moosic music streaming app",
    version="1.0.0",
)
app.add_middleware(FirewallMiddleware)

configured_origins = os.getenv(
    "MOOSIC_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in configured_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


def serialize_model(obj):
    if obj is None:
        return None
    data = obj.__dict__.copy()
    data.pop("_sa_instance_state", None)
    return data


def serialize_user_public(user):
    return {
        "user_id": user.id,
        "name": user.name,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "is_premium": user.is_premium,
        "profile_note": user.profile_note or "",
        "created_at": user.created_at,
    }


def serialize_song(song):
    data = serialize_model(song)
    if song.artist:
        data["artist_name"] = song.artist.name
    else:
        data["artist_name"] = None
    if song.album:
        data["album_title"] = song.album.title
    else:
        data["album_title"] = None
    return data


def unique_songs(songs):
    """Return one row per logical song so duplicate seed rows do not reach clients."""
    unique = []
    seen = set()

    for song in songs:
        artist_name = song.artist.name if song.artist else ""
        key = (
            (song.title or "").strip().casefold(),
            (artist_name or "").strip().casefold(),
        )

        if key in seen:
            continue

        seen.add(key)
        unique.append(song)

    return unique


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict):
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = expire
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def serialize_album(album):
    data = serialize_model(album)
    data["artist_name"] = album.artist.name if album.artist else None
    data["songs"] = [serialize_song(song) for song in album.songs]
    return data


def serialize_playlist(playlist):
    data = serialize_model(playlist)
    data["song_count"] = len(playlist.songs)
    return data


def infer_stats_mood(song):
    """Use explicit song mood when available, otherwise infer the same five rooms as the frontend."""
    explicit = (song.mood or "").strip()
    if explicit in {"Sad", "Happy", "Neutral", "Exhausted", "Angry"}:
        return explicit

    genre = (song.genre or "").lower()

    if any(value in genre for value in ("ballad", "romance", "r&b", "soul")):
        return "Sad"
    if any(value in genre for value in ("hip hop", "dancehall", "alternative rock")):
        return "Angry"
    if any(value in genre for value in ("classical", "ambient", "acoustic")):
        return "Exhausted"
    if any(value in genre for value in ("synthwave", "indie pop", "electropop", "pop rock")):
        return "Neutral"
    if any(value in genre for value in ("dance pop", "house", "funk", "latin pop", "dance", "pop")):
        return "Happy"

    return "Neutral"


def rank_songs_by_mood(songs, mood_preferences=None, genre_preferences=None, artist_preferences=None):
    mood_preferences = mood_preferences or {}
    genre_preferences = genre_preferences or {}
    artist_preferences = artist_preferences or {}

    def score(song):
        song_mood = (song.mood or "Neutral").strip()
        base_score = mood_preferences.get(song_mood, 0) * 10
        base_score += genre_preferences.get(song.genre, 0) * 6 if song.genre else 0
        base_score += artist_preferences.get(song.artist_id, 0) * 4 if song.artist_id is not None else 0

        if song_mood.lower() == "happy":
            base_score += 3
        elif song_mood.lower() == "sad":
            base_score += 1
        elif song_mood.lower() == "neutral":
            base_score += 2

        return base_score

    return sorted(songs, key=lambda song: (score(song), song.id), reverse=True)


def get_user_or_404(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found",
        )
    return user


def get_song_or_404(db: Session, song_id: int):
    song = db.query(models.Song).filter(models.Song.id == song_id).first()
    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Song with id {song_id} not found",
        )
    return song


def get_playlist_or_404(db: Session, playlist_id: int):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Playlist with id {playlist_id} not found",
        )
    return playlist


def seed_mood_songs():
    mood_songs = {
        "Happy": ["Subanallah", "Tum Hi Ho Bandhu", "Uff Teri Adaa", "Dil Dhadakne Do", "Sooraj Ki Baahon Mein"],
        "Sad": ["Phir Kabhi", "Choo Lo", "Jeena Jeena", "Aaoge Jab Tum", "Barsaat"],
        "Neutral": ["Mere Bina", "Soch Hai", "Tum Ho Toh", "Kasoor", "Kaisi Hai Ye Rut"],
    }
    db = SessionLocal()
    try:
        artist = db.query(models.Artist).filter(models.Artist.name == "Moosic Mood Mix").first()
        if not artist:
            artist = models.Artist(
                name="Moosic Mood Mix",
                image_url="https://images.unsplash.com/photo-1516280440614-37939bbacd81",
            )
            db.add(artist)
            db.flush()

        album = (
            db.query(models.Album)
            .filter(models.Album.title == "Mood Collection", models.Album.artist_id == artist.id)
            .first()
        )
        if not album:
            album = models.Album(
                title="Mood Collection",
                artist_id=artist.id,
                release_date="2026-09-07",
                cover_url="https://images.unsplash.com/photo-1516280440614-37939bbacd81",
            )
            db.add(album)
            db.flush()

        for mood, titles in mood_songs.items():
            for title in titles:
                # NOTE: audio_url is intentionally left unset here. A generated
                # "listType=search" embed URL is not a specific video and YouTube
                # doesn't reliably serve it in an iframe, so songs seeded that way
                # never actually play. Run scripts/verify_and_fix_audio_urls.py
                # after seeding to resolve each title to a real, checked video id.
                existing_song = db.query(models.Song).filter(models.Song.title == title).first()
                if existing_song:
                    continue
                db.add(models.Song(
                    title=title,
                    artist_id=artist.id,
                    album_id=album.id,
                    genre="Bollywood",
                    mood=mood,
                    language="Hindi",
                    duration=None,
                    audio_url=None,
                    is_playable=None,
                    cover_url=album.cover_url,
                ))
        db.commit()
    finally:
        db.close()


def seed_demo_music():
    db = SessionLocal()
    try:
        # Check if we already have a full catalog seeded (25 artists, ~55 songs)
        artist_count = db.query(models.Artist).count()
        if artist_count >= 25:
            # Full catalog already seeded, just backfill any missing language values
            db.query(models.Song).filter(models.Song.language.is_(None)).update({"language": "English"})
            db.commit()
            seed_mood_songs()
            return

        artists = [
            {
                "name": "Taylor Swift",
                "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
                "albums": [
                    {
                        "title": "1989",
                        "release_date": "2014-10-27",
                        "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
                        "songs": [
                            {"title": "Welcome to New York", "genre": "Pop", "language": "English", "duration": 201, "audio_url": "https://www.youtube.com/embed/8HW-_VIH3Aw", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                            {"title": "Shake It Off", "genre": "Pop", "language": "English", "duration": 219, "audio_url": "https://www.youtube.com/embed/nfWlot6h_mw", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                            {"title": "Out of the Woods", "genre": "Pop", "language": "English", "duration": 236, "audio_url": "https://www.youtube.com/embed/JUAgVmbqIe0", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                        ],
                    }
                ],
            },
            {
                "name": "Ed Sheeran",
                "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                "albums": [
                    {
                        "title": "Divide",
                        "release_date": "2017-03-03",
                        "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
                        "songs": [
                            {"title": "Shape of You", "genre": "Pop", "language": "English", "duration": 233, "audio_url": "https://www.youtube.com/embed/JGwWNGJdvx8", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "Perfect", "genre": "Pop", "language": "English", "duration": 263, "audio_url": "https://www.youtube.com/embed/2takcxucVgk", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "Castle on the Hill", "genre": "Indie Pop", "language": "English", "duration": 261, "audio_url": "https://www.youtube.com/embed/K35bpnksXrQ", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                        ],
                    }
                ],
            },
            {
                "name": "Adele",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                "albums": [
                    {
                        "title": "25",
                        "release_date": "2015-11-20",
                        "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
                        "songs": [
                            {"title": "Hello", "genre": "Soul", "language": "English", "duration": 295, "audio_url": "https://www.youtube.com/embed/YQHsXMglC9A", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                            {"title": "Someone Like You", "genre": "Ballad", "language": "English", "duration": 285, "audio_url": "https://www.youtube.com/embed/hHUbLv4ThOo", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                            {"title": "Rolling in the Deep", "genre": "Soul", "language": "English", "duration": 228, "audio_url": "https://www.youtube.com/embed/rvDxyXQ5yP4", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                        ],
                    }
                ],
            },
            {
                "name": "Dua Lipa",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "Future Nostalgia",
                        "release_date": "2020-03-27",
                        "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                        "songs": [
                            {"title": "Levitating", "genre": "Dance Pop", "language": "English", "duration": 203, "audio_url": "https://www.youtube.com/embed/N000qglmmY0", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "Don't Start Now", "genre": "Dance Pop", "language": "English", "duration": 183, "audio_url": "https://www.youtube.com/embed/oygrmJFVQkc", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "Physical", "genre": "Synth Pop", "language": "English", "duration": 191, "audio_url": "https://www.youtube.com/embed/gNlKcRqqoHM", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                        ],
                    }
                ],
            },
            {
                "name": "Arijit Singh",
                "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                "albums": [
                    {
                        "title": "Aashiqui 2",
                        "release_date": "2013-04-26",
                        "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
                        "songs": [
                            {"title": "Tum Hi Ho", "genre": "Romance", "language": "Hindi", "duration": 265, "audio_url": "https://www.youtube.com/embed/zHlVP5WYfEU", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                            {"title": "Chahun Main Ya Naa", "genre": "Romance", "language": "Hindi", "duration": 278, "audio_url": "https://www.youtube.com/embed/IYp3X_8N8C0", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                        ],
                    }
                ],
            },
            {
                "name": "Badshah",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "Game Over",
                        "release_date": "2019-11-15",
                        "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
                        "songs": [
                            {"title": "Kala Chashma", "genre": "Hip Hop", "language": "Hindi", "duration": 200, "audio_url": "https://www.youtube.com/embed/wapXwEjOMfU", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "Genda Phool", "genre": "Hip Hop", "language": "Hindi", "duration": 176, "audio_url": "https://www.youtube.com/embed/p-nHDqU7g4E", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                        ],
                    }
                ],
            },
            {
                "name": "Shakira",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                "albums": [
                    {
                        "title": "Laundry Service",
                        "release_date": "2001-11-13",
                        "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
                        "songs": [
                            {"title": "Hips Don't Lie", "genre": "Latin Pop", "language": "Spanish", "duration": 217, "audio_url": "https://www.youtube.com/embed/DUT5rEU6pqM", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                            {"title": "Waka Waka", "genre": "Latin Pop", "language": "Spanish", "duration": 202, "audio_url": "https://www.youtube.com/embed/HaHZRPIavto", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                        ],
                    }
                ],
            },
            {
                "name": "Sia",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "1000 Forms of Fear",
                        "release_date": "2014-07-04",
                        "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
                        "songs": [
                            {"title": "Chandelier", "genre": "Pop", "language": "English", "duration": 244, "audio_url": "https://www.youtube.com/embed/2vjPBrBU-TM", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "Elastic Heart", "genre": "Pop", "language": "English", "duration": 257, "audio_url": "https://www.youtube.com/embed/KWZGAExj-es", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                        ],
                    }
                ],
            },
            {
                "name": "The Weeknd",
                "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                "albums": [
                    {
                        "title": "After Hours",
                        "release_date": "2020-03-20",
                        "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                        "songs": [
                            {"title": "Blinding Lights", "genre": "Synthwave", "language": "English", "duration": 200, "audio_url": "https://www.youtube.com/embed/4NRXx6U8ABQ", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "Save Your Tears", "genre": "Synthwave", "language": "English", "duration": 215, "audio_url": "https://www.youtube.com/embed/XXYlFuWEwEY", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                        ],
                    }
                ],
            },
            {
                "name": "Bruno Mars",
                "image_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
                "albums": [
                    {
                        "title": "24K Magic",
                        "release_date": "2016-11-18",
                        "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
                        "songs": [
                            {"title": "That's What I Like", "genre": "Funk", "language": "English", "duration": 216, "audio_url": "https://www.youtube.com/embed/PIh2xe4jnpg", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "24K Magic", "genre": "Funk", "language": "English", "duration": 237, "audio_url": "https://www.youtube.com/embed/Ap7y3QfY-x0", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "Treasure", "genre": "Funk", "language": "English", "duration": 229, "audio_url": "https://www.youtube.com/embed/nPvuYQrCFqc", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                        ],
                    }
                ],
            },
            {
                "name": "The Chainsmokers",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "Collage",
                        "release_date": "2017-04-07",
                        "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
                        "songs": [
                            {"title": "Closer", "genre": "Electropop", "language": "English", "duration": 244, "audio_url": "https://www.youtube.com/embed/PT2_F-1esPk", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                            {"title": "Paris", "genre": "Electropop", "language": "English", "duration": 228, "audio_url": "https://www.youtube.com/embed/AmADy7KjLqE", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                        ],
                    }
                ],
            },
            {
                "name": "Calvin Harris",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                "albums": [
                    {
                        "title": "Funk Wav Bounces",
                        "release_date": "2017-06-30",
                        "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
                        "songs": [
                            {"title": "Feels", "genre": "House", "language": "English", "duration": 286, "audio_url": "https://www.youtube.com/embed/Xo8aV8U7Uu0", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                            {"title": "Slide", "genre": "House", "language": "English", "duration": 228, "audio_url": "https://www.youtube.com/embed/kJQP7kiw9Fk", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                        ],
                    }
                ],
            },
            {
                "name": "Neha Kakkar",
                "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                "albums": [
                    {
                        "title": "Nehulatations",
                        "release_date": "2015-03-20",
                        "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                        "songs": [
                            {"title": "Sunny Sunny", "genre": "Pop", "language": "Hindi", "duration": 241, "audio_url": "https://www.youtube.com/embed/MXJCnccDLA0", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "Manali Trance", "genre": "Dance", "language": "Hindi", "duration": 258, "audio_url": "https://www.youtube.com/embed/6GrtI-9hNBE", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "London Thumakda", "genre": "Pop", "language": "Hindi", "duration": 264, "audio_url": "https://www.youtube.com/embed/udra3Mfw2oo", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                        ],
                    }
                ],
            },
            {
                "name": "Shreya Ghoshal",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "Padmaraadhya",
                        "release_date": "2012-01-20",
                        "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
                        "songs": [
                            {"title": "Pathikada Sandhya", "genre": "Classical", "language": "Hindi", "duration": 302, "audio_url": "https://www.youtube.com/embed/LwjXxs9OVQs", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                            {"title": "Gunjan Gaun", "genre": "Classical", "language": "Hindi", "duration": 285, "audio_url": "https://www.youtube.com/embed/9Z8L8tNJYsE", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                        ],
                    }
                ],
            },
            {
                "name": "Atif Aslam",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                "albums": [
                    {
                        "title": "Doorie",
                        "release_date": "2004-06-01",
                        "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
                        "songs": [
                            {"title": "Doorie", "genre": "Romance", "language": "Hindi", "duration": 242, "audio_url": "https://www.youtube.com/embed/UW-30b0uCHs", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                            {"title": "Bheegi Bheegi", "genre": "Romance", "language": "Hindi", "duration": 257, "audio_url": "https://www.youtube.com/embed/J0mxvBD_Wt8", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                            {"title": "Woh Lamhe", "genre": "Romance", "language": "Hindi", "duration": 284, "audio_url": "https://www.youtube.com/embed/FVpz8N6zk-g", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                        ],
                    }
                ],
            },
            {
                "name": "Vishal Dadlani",
                "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                "albums": [
                    {
                        "title": "Vishaal",
                        "release_date": "2010-05-01",
                        "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
                        "songs": [
                            {"title": "Khuda ke Liye", "genre": "Pop", "language": "Hindi", "duration": 247, "audio_url": "https://www.youtube.com/embed/h_N9K5Wm4OM", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "Dil Ruba", "genre": "Romance", "language": "Hindi", "duration": 268, "audio_url": "https://www.youtube.com/embed/sXD2VvvFmMg", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                        ],
                    }
                ],
            },
            {
                "name": "Honey Singh",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "Main Teri Tu Mera",
                        "release_date": "2011-06-10",
                        "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                        "songs": [
                            {"title": "Mundian To Bach Ke", "genre": "Hip Hop", "language": "Hindi", "duration": 246, "audio_url": "https://www.youtube.com/embed/WBw_kF_49RM", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "Brown Rang", "genre": "Hip Hop", "language": "Hindi", "duration": 262, "audio_url": "https://www.youtube.com/embed/2cw6Q_7_vW8", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                        ],
                    }
                ],
            },
            {
                "name": "Katy Perry",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                "albums": [
                    {
                        "title": "One of the Boys",
                        "release_date": "2008-06-17",
                        "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
                        "songs": [
                            {"title": "I Kissed a Girl", "genre": "Pop", "language": "English", "duration": 193, "audio_url": "https://www.youtube.com/embed/6FOUqQt3Kg0", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                            {"title": "Hot N Cold", "genre": "Pop", "language": "English", "duration": 214, "audio_url": "https://www.youtube.com/embed/F57P9C4SAJ0", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                        ],
                    }
                ],
            },
            {
                "name": "Coldplay",
                "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                "albums": [
                    {
                        "title": "Parachutes",
                        "release_date": "2000-07-10",
                        "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
                        "songs": [
                            {"title": "Yellow", "genre": "Alternative Rock", "language": "English", "duration": 258, "audio_url": "https://www.youtube.com/embed/sLprVF6d7Ug", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "Paradise", "genre": "Pop Rock", "language": "English", "duration": 288, "audio_url": "https://www.youtube.com/embed/1G4isv7wAtQ", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                        ],
                    }
                ],
            },
            {
                "name": "Rihanna",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "Anti",
                        "release_date": "2016-01-28",
                        "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                        "songs": [
                            {"title": "Work", "genre": "Dancehall", "language": "English", "duration": 224, "audio_url": "https://www.youtube.com/embed/PlRKoDXWnSE", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "Kiss It Better", "genre": "R&B", "language": "English", "duration": 262, "audio_url": "https://www.youtube.com/embed/lfZ_v-Vvml4", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                        ],
                    }
                ],
            },
            {
                "name": "A.R. Rahman",
                "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                "albums": [
                    {
                        "title": "Slumdog Millionaire",
                        "release_date": "2008-11-12",
                        "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
                        "songs": [
                            {"title": "Jai Ho", "genre": "Pop", "language": "Hindi", "duration": 243, "audio_url": "https://www.youtube.com/embed/2R3XstG35sE", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                            {"title": "Rn Samayal", "genre": "Classical", "language": "Hindi", "duration": 256, "audio_url": "https://www.youtube.com/embed/2N7Ar2kGpDY", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                        ],
                    }
                ],
            },
            {
                "name": "Lata Mangeshkar",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "Classics",
                        "release_date": "1960-01-15",
                        "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
                        "songs": [
                            {"title": "Aaye Ho Meri Zindagi", "genre": "Classical", "language": "Hindi", "duration": 298, "audio_url": "https://www.youtube.com/embed/1jz2R5Y6K8o", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                            {"title": "Lag Ja Gale", "genre": "Romance", "language": "Hindi", "duration": 287, "audio_url": "https://www.youtube.com/embed/DaK_P5E8Jfk", "cover_url": "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"},
                        ],
                    }
                ],
            },
            {
                "name": "Ariana Grande",
                "image_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                "albums": [
                    {
                        "title": "Thank U, Next",
                        "release_date": "2019-02-08",
                        "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f",
                        "songs": [
                            {"title": "Thank U, Next", "genre": "Pop", "language": "English", "duration": 211, "audio_url": "https://www.youtube.com/embed/gl8xrxkKvT0", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                            {"title": "Break Up with Your Girlfriend", "genre": "Pop", "language": "English", "duration": 207, "audio_url": "https://www.youtube.com/embed/SoIgNbWW7eE", "cover_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f"},
                        ],
                    }
                ],
            },
            {
                "name": "Post Malone",
                "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
                "albums": [
                    {
                        "title": "Hollywood's Bleeding",
                        "release_date": "2019-09-27",
                        "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1",
                        "songs": [
                            {"title": "Circles", "genre": "Hip Hop", "language": "English", "duration": 219, "audio_url": "https://www.youtube.com/embed/wXzVzuEL9bc", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "Goodbyes", "genre": "Hip Hop", "language": "English", "duration": 203, "audio_url": "https://www.youtube.com/embed/S2z-uJdKaLw", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                        ],
                    }
                ],
            },
            {
                "name": "Ranveer Singh",
                "image_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
                "albums": [
                    {
                        "title": "Gully Boy",
                        "release_date": "2019-02-14",
                        "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81",
                        "songs": [
                            {"title": "Mere Naam", "genre": "Hip Hop", "language": "Hindi", "duration": 254, "audio_url": "https://www.youtube.com/embed/fOmVJ81J-bA", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                            {"title": "Azadi", "genre": "Hip Hop", "language": "Hindi", "duration": 267, "audio_url": "https://www.youtube.com/embed/TqzMm9nH5nU", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
                        ],
                    }
                ],
            },
        ]

        for artist_data in artists:
            artist = models.Artist(
                name=artist_data["name"],
                image_url=artist_data["image_url"],
            )
            db.add(artist)
            db.flush()

            for album_data in artist_data["albums"]:
                album = models.Album(
                    title=album_data["title"],
                    artist_id=artist.id,
                    release_date=album_data["release_date"],
                    cover_url=album_data["cover_url"],
                )
                db.add(album)
                db.flush()

                for song_data in album_data["songs"]:
                    song = models.Song(
                        title=song_data["title"],
                        artist_id=artist.id,
                        album_id=album.id,
                        genre=song_data["genre"],
                        mood=song_data.get("mood"),
                        language=song_data.get("language", "English"),
                        duration=song_data["duration"],
                        audio_url=song_data["audio_url"],
                        cover_url=song_data["cover_url"],
                    )
                    db.add(song)

        db.commit()
        db.query(models.Song).filter(models.Song.language.is_(None)).update({"language": "English"})
        db.commit()
        seed_mood_songs()
    finally:
        db.close()




def migrate_legacy_sqlite_catalog():
    """
    Copy the old working SQLite music catalogue bundled with the repo into the
    production database. This restores legacy songs/audio URLs after moving the
    app from SQLite to Neon/Postgres.

    It is intentionally idempotent: existing songs are updated rather than
    duplicated.
    """
    legacy_path = Path(__file__).resolve().parent / "moosic.db"

    if not legacy_path.is_file():
        print("Legacy catalogue migration skipped: moosic.db was not found.")
        return

    try:
        legacy = sqlite3.connect(str(legacy_path))
        legacy.row_factory = sqlite3.Row

        song_columns = {
            row["name"]
            for row in legacy.execute("PRAGMA table_info(songs)").fetchall()
        }

        if not song_columns:
            print("Legacy catalogue migration skipped: songs table was not found.")
            legacy.close()
            return

        optional_song_fields = {
            "mood": "s.mood AS mood" if "mood" in song_columns else "NULL AS mood",
            "language": (
                "s.language AS language"
                if "language" in song_columns
                else "'English' AS language"
            ),
            "is_playable": (
                "s.is_playable AS is_playable"
                if "is_playable" in song_columns
                else "NULL AS is_playable"
            ),
        }

        rows = legacy.execute(
            f"""
            SELECT
                s.title AS title,
                s.genre AS genre,
                {optional_song_fields["mood"]},
                {optional_song_fields["language"]},
                s.duration AS duration,
                s.audio_url AS audio_url,
                s.cover_url AS cover_url,
                {optional_song_fields["is_playable"]},
                a.name AS artist_name,
                a.image_url AS artist_image_url,
                al.title AS album_title,
                al.release_date AS album_release_date,
                al.cover_url AS album_cover_url
            FROM songs s
            LEFT JOIN artists a ON a.id = s.artist_id
            LEFT JOIN albums al ON al.id = s.album_id
            ORDER BY s.id
            """
        ).fetchall()

        db = SessionLocal()
        try:
            migrated = 0
            updated = 0
            seen = set()

            for row in rows:
                title = (row["title"] or "").strip()
                artist_name = (row["artist_name"] or "Unknown artist").strip()

                if not title:
                    continue

                logical_key = (title.casefold(), artist_name.casefold())
                if logical_key in seen:
                    continue
                seen.add(logical_key)

                artist = (
                    db.query(models.Artist)
                    .filter(models.Artist.name == artist_name)
                    .first()
                )

                if not artist:
                    artist = models.Artist(
                        name=artist_name,
                        image_url=row["artist_image_url"],
                    )
                    db.add(artist)
                    db.flush()

                album = None
                album_title = (row["album_title"] or "").strip()

                if album_title:
                    album = (
                        db.query(models.Album)
                        .filter(
                            models.Album.title == album_title,
                            models.Album.artist_id == artist.id,
                        )
                        .first()
                    )

                    if not album:
                        album = models.Album(
                            title=album_title,
                            artist_id=artist.id,
                            release_date=row["album_release_date"],
                            cover_url=row["album_cover_url"],
                        )
                        db.add(album)
                        db.flush()

                song = (
                    db.query(models.Song)
                    .filter(
                        models.Song.title == title,
                        models.Song.artist_id == artist.id,
                    )
                    .first()
                )

                legacy_url = (row["audio_url"] or "").strip() or None

                if song:
                    changed = False

                    # The old local SQLite database is the catalogue that was
                    # used when playback worked, so restore its URL when present.
                    if legacy_url and song.audio_url != legacy_url:
                        song.audio_url = legacy_url
                        changed = True

                    for attr, value in (
                        ("album_id", album.id if album else song.album_id),
                        ("genre", row["genre"]),
                        ("mood", row["mood"]),
                        ("language", row["language"] or "English"),
                        ("duration", row["duration"]),
                        ("cover_url", row["cover_url"]),
                    ):
                        if value is not None and getattr(song, attr, None) != value:
                            setattr(song, attr, value)
                            changed = True

                    if legacy_url and getattr(song, "is_playable", None) is not True:
                        song.is_playable = True
                        changed = True

                    if changed:
                        updated += 1

                    continue

                song = models.Song(
                    title=title,
                    artist_id=artist.id,
                    album_id=album.id if album else None,
                    genre=row["genre"],
                    mood=row["mood"],
                    language=row["language"] or "English",
                    duration=row["duration"],
                    audio_url=legacy_url,
                    cover_url=row["cover_url"],
                    is_playable=True if legacy_url else None,
                )
                db.add(song)
                migrated += 1

            db.commit()
            print(
                f"Legacy catalogue migration complete: "
                f"{migrated} added, {updated} updated."
            )
        finally:
            db.close()
            legacy.close()

    except Exception as exc:
        # Do not make the whole API unavailable if the legacy import encounters
        # an unexpected old schema. The app can still use its normal catalogue.
        print(f"Legacy catalogue migration warning: {exc}")


KNOWN_AUDIO_REPAIRS = {
    "Sunny Sunny": "https://www.youtube.com/embed/MXJCnccDLA0",
    "Manali Trance": "https://www.youtube.com/embed/6GrtI-9hNBE",
    "London Thumakda": "https://www.youtube.com/embed/udra3Mfw2oo",
    "Jai Ho": "https://www.youtube.com/embed/2R3XstG35sE",
    "Levitating": "https://www.youtube.com/embed/N000qglmmY0",
}

KNOWN_UNPLAYABLE_TITLES = {
    # This catalogue row does not currently map to a reliable embeddable source.
    "Khuda ke Liye",
}


def repair_known_audio_urls():
    """Repair known stale video ids in an existing shared production database."""
    db = SessionLocal()
    try:
        for title, audio_url in KNOWN_AUDIO_REPAIRS.items():
            rows = db.query(models.Song).filter(models.Song.title == title).all()
            for song in rows:
                song.audio_url = audio_url
                song.is_playable = True

        for title in KNOWN_UNPLAYABLE_TITLES:
            rows = db.query(models.Song).filter(models.Song.title == title).all()
            for song in rows:
                song.is_playable = False

        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def startup_event():
    # Vercel can start several function instances at the same time. Re-running
    # the demo seeder on an already-populated shared Postgres database creates
    # duplicate artists/albums/songs. Seed only an empty catalog.
    db = SessionLocal()
    try:
        has_catalog = db.query(models.Song.id).first() is not None
    finally:
        db.close()

    if not has_catalog:
        seed_demo_music()

    # Restore the complete catalogue/audio URLs that existed in the original
    # SQLite version before the project moved to Neon/Postgres.
    migrate_legacy_sqlite_catalog()

    # Apply known replacements after the migration so stale legacy video IDs
    # cannot overwrite the repaired production URLs.
    repair_known_audio_urls()


@app.get("/")
def home():
    return {
        "message": "Welcome to Moosic 🎵",
        "status": "Backend is running!",
    }


@app.post("/users")
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(models.User)
        .filter(
            (models.User.username == user.username)
            | (models.User.email == user.email)
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username or email already exists",
        )

    new_user = models.User(
        name=user.name.strip(),
        username=user.username.strip(),
        email=user.email.lower().strip(),
        password=hash_password(user.password),
        role="user",
        profile_note="",
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({
        "sub": str(new_user.id),
        "username": new_user.username,
        "role": new_user.role,
    })

    return {
        "message": "User created successfully!",
        "user": {
            "user_id": new_user.id,
            "name": new_user.name,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role,
            "profile_note": new_user.profile_note or "",
        },
        "token": token,
    }



@app.post("/login")
def login_user(
    user: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    db_user = (
        db.query(models.User)
        .filter(models.User.email == user.email.lower().strip())
        .first()
    )

    if not db_user or not verify_password(
        user.password,
        db_user.password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({
        "sub": str(db_user.id),
        "username": db_user.username,
        "role": db_user.role,
    })

    return {
        "message": "Login successful",
        "user": {
            "user_id": db_user.id,
            "name": db_user.name,
            "username": db_user.username,
            "email": db_user.email,
            "role": db_user.role,
            "profile_note": db_user.profile_note or "",
        },
        "token": token,
    }


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == int(user_id))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


def require_role(required_role: str):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role",
            )
        return current_user

    return role_checker


def require_self_or_403(user_id: int, current_user: models.User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: you can only access your own resources",
        )
    return current_user


def require_premium(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_premium:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required",
        )
    return current_user


@app.get("/users")
def get_users(
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).all()
    return [serialize_user_public(user) for user in users]


@app.post("/artists")
def create_artist(
    artist: schemas.ArtistCreate,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    new_artist = models.Artist(name=artist.name, image_url=artist.image_url)
    db.add(new_artist)
    db.commit()
    db.refresh(new_artist)

    return {
        "message": "Artist created successfully!",
        "artist_id": new_artist.id,
        "name": new_artist.name,
    }


@app.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "profile_note": current_user.profile_note or "",
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


@app.put("/me")
def update_me(
    update: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if update.name is not None:
        cleaned_name = update.name.strip()
        if not cleaned_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name cannot be empty",
            )
        current_user.name = cleaned_name

    if update.profile_note is not None:
        current_user.profile_note = update.profile_note.strip()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "user": {
            "user_id": current_user.id,
            "name": current_user.name,
            "username": current_user.username,
            "email": current_user.email,
            "role": current_user.role,
            "profile_note": current_user.profile_note or "",
        },
    }


@app.get("/premium/status", response_model=schemas.PremiumStatusResponse)
def get_premium_status(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.is_premium:
        latest_successful_payment = (
            db.query(models.Payment)
            .filter(
                models.Payment.user_id == current_user.id,
                models.Payment.status == "success",
            )
            .order_by(models.Payment.payment_date.desc())
            .first()
        )
        return {
            "is_premium": True,
            "plan": latest_successful_payment.plan if latest_successful_payment else None,
            "status": "active",
        }

    return {
        "is_premium": False,
        "plan": None,
        "status": "free",
    }


@app.post("/premium/subscribe")
def subscribe_to_premium(
    request: schemas.PremiumSubscribeRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed_plan = "premium"
    if request.plan.lower() != allowed_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan. Only 'premium' is supported.",
        )

    valid_test_methods = {"test_success", "test_failure"}
    if request.payment_method not in valid_test_methods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment_method. Use 'test_success' or 'test_failure'.",
        )

    payment_status = "success" if request.payment_method == "test_success" else "failed"
    if payment_status == "success":
        current_user.is_premium = True

    payment = models.Payment(
        user_id=current_user.id,
        plan=request.plan.lower(),
        amount=299.00,
        currency="INR",
        status=payment_status,
        payment_date=datetime.utcnow(),
    )
    db.add(payment)
    db.commit()
    db.refresh(current_user)

    response = {
        "message": "Premium payment processed successfully." if payment_status == "success" else "Premium payment failed; account remains free.",
        "payment_status": payment_status,
        "is_premium": current_user.is_premium,
        "plan": request.plan.lower(),
        "status": "active" if current_user.is_premium else "free",
    }
    return response


@app.post("/premium/cancel", response_model=schemas.PremiumCancelResponse)
def cancel_premium(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.is_premium = False
    db.commit()
    return {
        "message": "Premium subscription cancelled successfully. Your account is now free.",
        "is_premium": False,
    }


@app.get("/artists")
def get_artists(db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Use eager loading to avoid N+1 queries
    artists = OptimizedQueries.get_all_artists_with_songs(db)
    return [serialize_model(artist) for artist in artists]


@app.get("/artists/{artist_id}")
def get_artist_detail(artist_id: int, db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Use eager loading to load all relationships at once
    artist = OptimizedQueries.get_artist_with_albums_and_songs(db, artist_id)
    if not artist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artist with id {artist_id} not found",
        )

    albums = db.query(models.Album).filter(models.Album.artist_id == artist_id).all()
    artist_songs = db.query(models.Song).filter(models.Song.artist_id == artist_id).all()

    return {
        "id": artist.id,
        "name": artist.name,
        "image_url": artist.image_url,
        "albums": [serialize_album(album) for album in albums],
        "popular_songs": [serialize_song(song) for song in artist_songs[:5]],
    }


@app.post("/albums")
def create_album(
    album: schemas.AlbumCreate,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    artist = db.query(models.Artist).filter(models.Artist.id == album.artist_id).first()
    if not artist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artist with id {album.artist_id} not found",
        )

    new_album = models.Album(
        title=album.title,
        artist_id=album.artist_id,
        release_date=album.release_date,
        cover_url=album.cover_url,
    )
    db.add(new_album)
    db.commit()
    db.refresh(new_album)

    return {
        "message": "Album created successfully!",
        "album_id": new_album.id,
        "title": new_album.title,
        "artist_id": new_album.artist_id,
    }


@app.get("/albums")
def get_albums(db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Get all albums with artist pre-loaded
    albums = db.query(models.Album).all()
    return [serialize_album(album) for album in albums]


@app.get("/albums/{album_id}")
def get_album_detail(album_id: int, db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Use eager loading for album with all relationships
    album = OptimizedQueries.get_album_with_songs(db, album_id)
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Album with id {album_id} not found",
        )

    return {
        "id": album.id,
        "title": album.title,
        "release_date": album.release_date,
        "cover_url": album.cover_url,
        "artist": serialize_model(album.artist) if album.artist else None,
        "songs": [serialize_song(song) for song in album.songs],
    }


@app.post("/songs")
def create_song(
    song: schemas.SongCreate,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    artist = db.query(models.Artist).filter(models.Artist.id == song.artist_id).first()
    if not artist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artist with id {song.artist_id} not found",
        )

    if song.album_id is not None:
        album = db.query(models.Album).filter(models.Album.id == song.album_id).first()
        if not album:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Album with id {song.album_id} not found",
            )

    new_song = models.Song(
        title=song.title,
        artist_id=song.artist_id,
        album_id=song.album_id,
        genre=song.genre,
        mood=song.mood,
        language=song.language,
        duration=song.duration,
        audio_url=song.audio_url,
        cover_url=song.cover_url,
    )
    db.add(new_song)
    db.commit()
    db.refresh(new_song)

    return {
        "message": "Song created successfully!",
        "song_id": new_song.id,
        "title": new_song.title,
        "artist_id": new_song.artist_id,
        "album_id": new_song.album_id,
    }


@app.get("/songs")
def get_songs(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    # DATABASE OPTIMIZATION: Use eager loading to avoid N+1 queries
    songs = OptimizedQueries.get_all_songs_with_relations(db, offset, limit)
    return [serialize_song(song) for song in unique_songs(songs)]


@app.get("/songs/genres")
def get_genres(db: Session = Depends(get_db)):
    genres = db.query(models.Song.genre).filter(models.Song.genre.isnot(None)).distinct().all()
    return {"genres": [genre[0] for genre in genres]}



@app.get("/songs/languages")
def get_languages(db: Session = Depends(get_db)):
    languages = db.query(models.Song.language).filter(models.Song.language.isnot(None)).distinct().all()
    return {"languages": [language[0] for language in languages]}



@app.get("/songs/search")
def search_songs(q: str, limit: int = Query(10, ge=1, le=100), db: Session = Depends(get_db)):
    normalized_query = q.strip()
    if not normalized_query:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Search query cannot be empty")
    query_term = f"%{normalized_query}%"
    songs = (
        db.query(models.Song)
        .join(models.Artist, models.Artist.id == models.Song.artist_id)
        .filter(
            (models.Song.title.ilike(query_term))
            | (models.Artist.name.ilike(query_term))
            | (models.Song.genre.ilike(query_term))
            | (models.Song.language.ilike(query_term))
        )
        .limit(limit)
        .all()
    )

    return [serialize_song(song) for song in unique_songs(songs)]



@app.get("/songs/{song_id}")
def get_song_detail(song_id: int, db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Use eager loading for song with relationships
    song = OptimizedQueries.get_song_with_relations(db, song_id)
    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Song with id {song_id} not found",
        )
    payload = serialize_song(song)
    payload["is_playable"] = song.is_playable if song.is_playable is not None else bool(song.audio_url)
    return payload


@app.get("/songs/{song_id}/play")
def get_song_playback(song_id: int, db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Use eager loading for playback data
    song = OptimizedQueries.get_song_with_relations(db, song_id)
    if not song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Song with id {song_id} not found",
        )
    return {
        "song_id": song.id,
        "title": song.title,
        "artist_name": song.artist.name if song.artist else None,
        "album_title": song.album.title if song.album else None,
        "genre": song.genre,
        "language": song.language,
        "duration": song.duration,
        "audio_url": song.audio_url,
        "cover_url": song.cover_url,
        "is_playable": song.is_playable if song.is_playable is not None else bool(song.audio_url),
    }


@app.get("/songs/genre/{genre_name}")
def get_songs_by_genre(genre_name: str, db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Use eager loading for genre-filtered songs
    songs = OptimizedQueries.get_songs_by_genre(db, genre_name)
    return [serialize_song(song) for song in unique_songs(songs)]


@app.get("/songs/mood/{mood_name}")
def get_songs_by_mood(mood_name: str, limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Use eager loading for mood-filtered songs
    mood_songs = OptimizedQueries.get_songs_by_mood(db, mood_name, limit)
    ranked_songs = rank_songs_by_mood(
        mood_songs,
        mood_preferences={mood_name.title(): 10},
        genre_preferences={},
        artist_preferences={},
    )
    return [serialize_song(song) for song in unique_songs(ranked_songs)[:limit]]


@app.get("/songs/language/{language_name}")
def get_songs_by_language(language_name: str, db: Session = Depends(get_db)):
    # DATABASE OPTIMIZATION: Use eager loading for language-filtered songs
    songs = OptimizedQueries.get_songs_by_language(db, language_name)
    return [serialize_song(song) for song in unique_songs(songs)]


@app.get("/library")
def get_library(db: Session = Depends(get_db)):
    songs = unique_songs(db.query(models.Song).all())
    genres = sorted({song.genre for song in songs if song.genre})
    languages = sorted({song.language for song in songs if song.language})

    return {
        "featured": [serialize_song(song) for song in songs[:8]],
        "genres": {genre: [serialize_song(song) for song in songs if song.genre == genre] for genre in genres},
        "languages": {language: [serialize_song(song) for song in songs if song.language == language] for language in languages},
    }


@app.post("/manager/register")
def register_manager(user: schemas.ManagerRegistration, db: Session = Depends(get_db)):
    if not MANAGER_REGISTRATION_CODE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Manager registration is not configured",
        )

    if user.registration_code != MANAGER_REGISTRATION_CODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid manager registration code",
        )

    existing_user = (
        db.query(models.User)
        .filter(
            (models.User.username == user.username)
            | (models.User.email == user.email)
        )
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username or email already exists",
        )

    new_user = models.User(
        name=user.name.strip(),
        username=user.username.strip(),
        email=user.email.lower().strip(),
        password=hash_password(user.password),
        role=MANAGER_ROLE,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({
        "sub": str(new_user.id),
        "username": new_user.username,
        "role": new_user.role,
    })

    return {
        "message": "Manager created successfully",
        "user": {
            "user_id": new_user.id,
            "name": new_user.name,
            "username": new_user.username,
            "email": new_user.email,
            "role": new_user.role,
        },
        "token": token,
    }


@app.get("/manager-only")
def manager_only(current_user: models.User = Depends(require_role(MANAGER_ROLE))):
    return {
        "message": "Manager access granted",
        "user_id": current_user.id,
        "role": current_user.role,
    }
@app.get("/manager/dashboard")
def manager_dashboard(
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    total_users = db.query(models.User).count()
    total_songs = db.query(models.Song).count()
    total_artists = db.query(models.Artist).count()
    total_albums = db.query(models.Album).count()

    premium_users = (
        db.query(models.User)
        .filter(models.User.is_premium.is_(True))
        .count()
    )

    successful_payments = (
        db.query(models.Payment)
        .filter(models.Payment.status == "success")
        .count()
    )

    total_revenue = (
        db.query(models.Payment.amount)
        .filter(models.Payment.status == "success")
        .all()
    )

    revenue = sum(amount for (amount,) in total_revenue)

    return {
        "manager": {
            "user_id": current_user.id,
            "name": current_user.name,
            "role": current_user.role,
        },
        "kpis": {
            "total_users": total_users,
            "premium_users": premium_users,
            "total_songs": total_songs,
            "total_artists": total_artists,
            "total_albums": total_albums,
            "successful_payments": successful_payments,
            "total_revenue": round(revenue, 2),
        },
    }


@app.get("/manager/users")
def manager_get_users(
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    users = db.query(models.User).order_by(models.User.id.desc()).all()
    sanitized = []
    for u in users:
        sanitized.append({
            "user_id": u.id,
            "name": u.name,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_premium": bool(u.is_premium),
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return {"users": sanitized}


@app.patch("/manager/users/{user_id}")
def manager_patch_user(
    user_id: int,
    payload: dict,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    user = get_user_or_404(db, user_id)

    updates = {}
    # Allow safe updates: name, username, email, is_premium, role -> but disallow granting manager role here
    if "name" in payload:
        updates["name"] = payload["name"].strip()
    if "username" in payload:
        updates["username"] = payload["username"].strip()
    if "email" in payload:
        updates["email"] = payload["email"].lower().strip()
    if "is_premium" in payload:
        updates["is_premium"] = bool(payload["is_premium"])
    if "role" in payload:
        new_role = payload["role"].strip()
        if new_role == MANAGER_ROLE:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot grant manager role via this endpoint")
        updates["role"] = new_role

    for k, v in updates.items():
        setattr(user, k, v)

    db.commit()
    db.refresh(user)

    return {
        "message": "User updated",
        "user": {
            "user_id": user.id,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "is_premium": bool(user.is_premium),
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


@app.put("/manager/users/{user_id}")
def manager_put_user(
    user_id: int,
    payload: dict,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    # Reuse same logic as PATCH but accept PUT as some clients (or firewall) may restrict PATCH
    return manager_patch_user(user_id, payload, current_user, db)


@app.post("/manager/songs")
def manager_create_song(
    song: schemas.SongCreate,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    # Validate artist
    artist = db.query(models.Artist).filter(models.Artist.id == song.artist_id).first()
    if not artist:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Artist with id {song.artist_id} not found")
    if song.album_id is not None:
        album = db.query(models.Album).filter(models.Album.id == song.album_id).first()
        if not album:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Album with id {song.album_id} not found")

    new_song = models.Song(
        title=song.title,
        artist_id=song.artist_id,
        album_id=song.album_id,
        genre=song.genre,
        mood=song.mood,
        language=song.language,
        duration=song.duration,
        audio_url=song.audio_url,
        cover_url=song.cover_url,
    )
    db.add(new_song)
    db.commit()
    db.refresh(new_song)

    return {"message": "Song created", "song_id": new_song.id}


@app.put("/manager/songs/{song_id}")
def manager_update_song(
    song_id: int,
    payload: dict,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    song = get_song_or_404(db, song_id)

    if "artist_id" in payload:
        artist = db.query(models.Artist).filter(models.Artist.id == int(payload["artist_id"])).first()
        if not artist:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Artist with id {payload['artist_id']} not found")
    if "album_id" in payload and payload["album_id"] is not None:
        album = db.query(models.Album).filter(models.Album.id == int(payload["album_id"])).first()
        if not album:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Album with id {payload['album_id']} not found")

    allowed = {"title", "artist_id", "album_id", "genre", "mood", "language", "duration", "audio_url", "cover_url", "is_playable"}
    for k, v in payload.items():
        if k in allowed:
            setattr(song, k, v)

    db.commit()
    db.refresh(song)

    return {"message": "Song updated", "song_id": song.id}


@app.delete("/manager/songs/{song_id}")
def manager_delete_song(
    song_id: int,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    song = get_song_or_404(db, song_id)
    db.delete(song)
    db.commit()
    return {"message": "Song deleted", "song_id": song_id}


@app.get("/manager/payments")
def manager_get_payments(
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    payments = (
        db.query(models.Payment)
        .order_by(models.Payment.payment_date.desc())
        .all()
    )
    out = []
    for p in payments:
        out.append({
            "payment_id": p.id,
            "user_id": p.user_id,
            "user_email": p.user.email if p.user else None,
            "plan": p.plan,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "payment_date": p.payment_date.isoformat() if p.payment_date else None,
        })
    return {"payments": out}

@app.get("/users/{user_id}/recommendations")
def get_recommendations(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)

    liked_songs = (
        db.query(models.LikedSong.song_id)
        .filter(models.LikedSong.user_id == user_id)
        .all()
    )
    liked_song_ids = {song_id for (song_id,) in liked_songs}

    history = (
        db.query(models.ListeningHistory)
        .filter(models.ListeningHistory.user_id == user_id)
        .order_by(models.ListeningHistory.played_at.desc())
        .limit(100)
        .all()
    )
    preference_song_ids = liked_song_ids | {item.song_id for item in history}
    preference_songs = (
        db.query(models.Song).filter(models.Song.id.in_(preference_song_ids)).all()
        if preference_song_ids else []
    )
    genre_scores = {}
    language_scores = {}
    artist_scores = {}
    for song in preference_songs:
        weight = 3 if song.id in liked_song_ids else 1
        genre_scores[song.genre] = genre_scores.get(song.genre, 0) + weight
        language_scores[song.language] = language_scores.get(song.language, 0) + weight
        artist_scores[song.artist_id] = artist_scores.get(song.artist_id, 0) + weight

    candidates = db.query(models.Song).filter(~models.Song.id.in_(preference_song_ids)).all() if preference_song_ids else db.query(models.Song).all()
    candidates.sort(
        key=lambda song: (
            genre_scores.get(song.genre, 0) * 4
            + language_scores.get(song.language, 0) * 2
            + artist_scores.get(song.artist_id, 0),
            song.id,
        ),
        reverse=True,
    )
    return [serialize_song(song) for song in candidates[:10]]


@app.post("/users/{user_id}/playlists")
def create_playlist(
    user_id: int,
    playlist: schemas.PlaylistCreate,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)

    new_playlist = models.Playlist(
        name=playlist.name,
        user_id=user_id,
        cover_url=playlist.cover_url,
        description=playlist.description,
    )
    db.add(new_playlist)
    db.commit()
    db.refresh(new_playlist)

    return {
        "message": "Playlist created successfully!",
        "playlist_id": new_playlist.id,
        "name": new_playlist.name,
        "user_id": user_id,
    }


@app.get("/users/{user_id}/playlists")
def get_user_playlists(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    playlists = (
        db.query(models.Playlist)
        .filter(models.Playlist.user_id == user_id, models.Playlist.is_deleted.is_(False))
        .order_by(models.Playlist.id.desc())
        .all()
    )
    return [serialize_playlist(playlist) for playlist in playlists]


@app.get("/users/{user_id}/playlists/recycle-bin")
def get_deleted_playlists(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    playlists = (
        db.query(models.Playlist)
        .filter(models.Playlist.user_id == user_id, models.Playlist.is_deleted.is_(True))
        .order_by(models.Playlist.deleted_at.desc(), models.Playlist.id.desc())
        .all()
    )
    return [serialize_playlist(playlist) for playlist in playlists]


@app.put("/playlists/{playlist_id}")
def update_playlist(
    playlist_id: int,
    payload: schemas.PlaylistUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    playlist = get_playlist_or_404(db, playlist_id)
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only modify your own playlists")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and not updates["name"].strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Playlist name cannot be empty")

    for field, value in updates.items():
        setattr(playlist, field, value.strip() if isinstance(value, str) else value)

    db.commit()
    db.refresh(playlist)
    return serialize_playlist(playlist)


@app.delete("/playlists/{playlist_id}")
def delete_playlist(
    playlist_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    playlist = get_playlist_or_404(db, playlist_id)
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only delete your own playlists")
    if playlist.is_deleted:
        return {"message": "Playlist already deleted", "playlist_id": playlist_id}

    playlist.is_deleted = True
    playlist.deleted_at = datetime.utcnow()
    db.commit()

    return {"message": "Playlist deleted successfully", "playlist_id": playlist_id}


@app.post("/playlists/{playlist_id}/restore")
def restore_playlist(
    playlist_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    playlist = get_playlist_or_404(db, playlist_id)
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only restore your own playlists")
    if not playlist.is_deleted:
        return {"message": "Playlist is not deleted", "playlist_id": playlist_id}

    playlist.is_deleted = False
    playlist.deleted_at = None
    db.commit()

    return {"message": "Playlist restored successfully", "playlist_id": playlist_id}


@app.post("/playlists/{playlist_id}/songs")
def add_song_to_playlist(
    playlist_id: int,
    payload: schemas.PlaylistSongAdd,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    playlist = get_playlist_or_404(db, playlist_id)
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only modify your own playlists")
    if payload.user_id is not None:
        get_user_or_404(db, payload.user_id)
        if playlist.user_id != payload.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This user cannot modify this playlist",
            )

    get_song_or_404(db, payload.song_id)

    existing = (
        db.query(models.PlaylistSong)
        .filter(models.PlaylistSong.playlist_id == playlist_id, models.PlaylistSong.song_id == payload.song_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Song already exists in this playlist",
        )

    last_position = (
        db.query(models.PlaylistSong.position)
        .filter(models.PlaylistSong.playlist_id == playlist_id)
        .order_by(models.PlaylistSong.position.desc())
        .first()
    )
    playlist_song = models.PlaylistSong(
        playlist_id=playlist_id,
        song_id=payload.song_id,
        position=(last_position[0] + 1 if last_position else 0),
    )
    db.add(playlist_song)
    db.commit()

    return {
        "message": "Song added to playlist",
        "playlist_id": playlist_id,
        "song_id": payload.song_id,
    }


@app.delete("/playlists/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(
    playlist_id: int,
    song_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    playlist = get_playlist_or_404(db, playlist_id)
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only modify your own playlists")
    row = db.query(models.PlaylistSong).filter(
        models.PlaylistSong.playlist_id == playlist.id,
        models.PlaylistSong.song_id == song_id,
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Song is not in this playlist")
    db.delete(row)
    db.commit()
    return {"message": "Song removed from playlist", "playlist_id": playlist_id, "song_id": song_id}


@app.put("/playlists/{playlist_id}/songs/order")
def reorder_playlist_songs(
    playlist_id: int,
    payload: schemas.PlaylistSongReorder,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    playlist = get_playlist_or_404(db, playlist_id)
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only modify your own playlists")
    rows = db.query(models.PlaylistSong).filter(models.PlaylistSong.playlist_id == playlist_id).all()
    row_by_song = {row.song_id: row for row in rows}
    if set(payload.song_ids) != set(row_by_song) or len(payload.song_ids) != len(row_by_song):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="song_ids must contain every playlist song exactly once")

    for position, song_id in enumerate(payload.song_ids):
        row_by_song[song_id].position = position

    db.commit()
    return {"message": "Playlist order updated", "playlist_id": playlist_id, "song_ids": payload.song_ids}


@app.get("/playlists/{playlist_id}/songs")
def get_playlist_songs(
    playlist_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    playlist = get_playlist_or_404(db, playlist_id)
    if playlist.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own playlists")
    rows = (
        db.query(models.PlaylistSong, models.Song)
        .join(models.Song, models.Song.id == models.PlaylistSong.song_id)
        .filter(models.PlaylistSong.playlist_id == playlist_id)
        .order_by(models.PlaylistSong.position, models.PlaylistSong.id)
        .all()
    )

    return [
        {
            "playlist_song_id": playlist_song.id,
            "playlist_id": playlist_song.playlist_id,
            "song": serialize_song(song),
        }
        for playlist_song, song in rows
    ]


def serialize_download(download: models.Download):
    song = download.song
    return {
        "id": download.id,
        "song_id": download.song_id,
        "title": song.title if song else "",
        "artist": song.artist.name if song and song.artist else "",
        "downloaded_at": download.downloaded_at,
        "audio_url": song.audio_url if song else None,
    }


@app.post("/users/{user_id}/downloads", response_model=schemas.DownloadResponse)
def create_download(
    user_id: int,
    payload: schemas.DownloadCreate,
    current_user: models.User = Depends(require_self_or_403),
    _: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    song = get_song_or_404(db, payload.song_id)

    existing_download = (
        db.query(models.Download)
        .filter(models.Download.user_id == user_id, models.Download.song_id == payload.song_id)
        .first()
    )
    if existing_download:
        return schemas.DownloadResponse(**serialize_download(existing_download))

    download = models.Download(
        user_id=user_id,
        song_id=payload.song_id,
        downloaded_at=datetime.utcnow(),
    )
    db.add(download)
    db.commit()
    db.refresh(download)

    return schemas.DownloadResponse(**serialize_download(download))


@app.get("/users/{user_id}/downloads", response_model=list[schemas.DownloadResponse])
def get_downloads(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    _: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)

    downloads = (
        db.query(models.Download)
        .filter(models.Download.user_id == user_id)
        .order_by(models.Download.downloaded_at.desc(), models.Download.id.desc())
        .all()
    )
    return [schemas.DownloadResponse(**serialize_download(download)) for download in downloads]


@app.delete("/users/{user_id}/downloads/{song_id}")
def delete_download(
    user_id: int,
    song_id: int,
    current_user: models.User = Depends(require_self_or_403),
    _: models.User = Depends(require_premium),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    get_song_or_404(db, song_id)

    download = (
        db.query(models.Download)
        .filter(models.Download.user_id == user_id, models.Download.song_id == song_id)
        .first()
    )
    if not download:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Download not found")

    db.delete(download)
    db.commit()
    return {"message": "Download removed successfully"}


@app.post("/users/{user_id}/liked-songs")
def like_song(
    user_id: int,
    payload: schemas.LikeSongCreate,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    get_song_or_404(db, payload.song_id)

    existing_like = (
        db.query(models.LikedSong)
        .filter(models.LikedSong.user_id == user_id, models.LikedSong.song_id == payload.song_id)
        .first()
    )
    if existing_like:
        return {
            "message": "Song already liked",
            "user_id": user_id,
            "song_id": payload.song_id,
        }

    liked_song = models.LikedSong(user_id=user_id, song_id=payload.song_id)
    db.add(liked_song)
    db.commit()

    return {
        "message": "Song liked successfully",
        "user_id": user_id,
        "song_id": payload.song_id,
    }


@app.get("/users/{user_id}/liked-songs")
def get_liked_songs(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    rows = (
        db.query(models.LikedSong, models.Song)
        .join(models.Song, models.Song.id == models.LikedSong.song_id)
        .filter(models.LikedSong.user_id == user_id)
        .all()
    )

    return [
        {
            "liked_song_id": liked_song.id,
            "user_id": liked_song.user_id,
            "song": serialize_song(song),
        }
        for liked_song, song in rows
    ]


@app.delete("/users/{user_id}/liked-songs/{song_id}")
def unlike_song(
    user_id: int,
    song_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: you can only access your own resources",
        )

    liked_song = (
        db.query(models.LikedSong)
        .filter(
            models.LikedSong.user_id == user_id,
            models.LikedSong.song_id == song_id,
        )
        .first()
    )

    if not liked_song:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liked song not found",
        )

    db.delete(liked_song)
    db.commit()
    return {"message": "Song removed from favorites"}


@app.post("/users/{user_id}/listening-history")
def record_listening_history(
    user_id: int,
    history: schemas.ListeningHistoryCreate,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    get_song_or_404(db, history.song_id)

    new_history = models.ListeningHistory(
        user_id=user_id,
        song_id=history.song_id,
        progress_seconds=max(0, history.progress_seconds),
        completed=history.completed,
        skipped=history.skipped,
    )
    db.add(new_history)
    db.commit()
    db.refresh(new_history)

    return {
        "message": "Listening history saved",
        "history_id": new_history.id,
        "user_id": user_id,
        "song_id": history.song_id,
    }


@app.get("/users/{user_id}/listening-history")
def get_listening_history(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    history = (
        db.query(models.ListeningHistory)
        .filter(models.ListeningHistory.user_id == user_id)
        .order_by(models.ListeningHistory.played_at.desc())
        .all()
    )
    return [serialize_model(item) for item in history]


@app.put("/users/{user_id}/listening-history/{history_id}")
def update_listening_history(
    user_id: int,
    history_id: int,
    update: schemas.ListeningHistoryUpdate,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: you can only access your own resources",
        )

    history = (
        db.query(models.ListeningHistory)
        .filter(
            models.ListeningHistory.id == history_id,
            models.ListeningHistory.user_id == user_id,
        )
        .first()
    )

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listening history entry not found",
        )

    history.progress_seconds = max(0, update.progress_seconds)
    history.completed = update.completed
    history.skipped = update.skipped

    db.commit()
    db.refresh(history)
    return serialize_model(history)


@app.get("/users/{user_id}/listening-stats")
def get_listening_stats(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: you can only access your own resources",
        )

    user = get_user_or_404(db, user_id)

    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1)
    else:
        next_month = datetime(now.year, now.month + 1, 1)

    rows = (
        db.query(models.ListeningHistory, models.Song)
        .join(models.Song, models.Song.id == models.ListeningHistory.song_id)
        .filter(
            models.ListeningHistory.user_id == user_id,
            models.ListeningHistory.played_at >= month_start,
            models.ListeningHistory.played_at < next_month,
        )
        .all()
    )

    rotation_seconds = {
        "Happy": 0,
        "Neutral": 0,
        "Sad": 0,
        "Exhausted": 0,
        "Angry": 0,
    }

    total_seconds = 0
    for history, song in rows:
        listened = max(0, history.progress_seconds or 0)
        total_seconds += listened
        rotation_seconds[infer_stats_mood(song)] += listened

    if total_seconds > 0:
        rotation = {
            mood: round((seconds / total_seconds) * 100, 1)
            for mood, seconds in rotation_seconds.items()
        }
    else:
        rotation = {mood: 0.0 for mood in rotation_seconds}

    favorite_tracks = (
        db.query(models.LikedSong)
        .filter(models.LikedSong.user_id == user_id)
        .count()
    )

    return {
        "month_label": now.strftime("%B"),
        "year": now.year,
        "total_seconds": total_seconds,
        "hours_listened": round(total_seconds / 3600, 2),
        "records_visited": len(rows),
        "favorite_tracks": favorite_tracks,
        "rotation": rotation,
        "member_since": user.created_at.isoformat() if user.created_at else None,
    }


@app.put("/users/{user_id}/playback")
def update_playback_state(
    user_id: int,
    payload: schemas.PlaybackStateUpdate,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    if payload.position_seconds < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="position_seconds cannot be negative")
    if payload.song_id is not None:
        get_song_or_404(db, payload.song_id)
    state = db.query(models.PlaybackState).filter(models.PlaybackState.user_id == user_id).first()
    if state is None:
        state = models.PlaybackState(user_id=user_id)
        db.add(state)
    state.song_id = payload.song_id
    state.position_seconds = payload.position_seconds
    state.is_playing = payload.is_playing
    state.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(state)
    return serialize_model(state)


@app.get("/users/{user_id}/playback")
def get_playback_state(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    state = db.query(models.PlaybackState).filter(models.PlaybackState.user_id == user_id).first()
    return serialize_model(state) if state else {"user_id": user_id, "song_id": None, "position_seconds": 0, "is_playing": False}


@app.post("/users/{user_id}/queue")
def add_to_queue(
    user_id: int,
    payload: schemas.QueueSongAdd,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    get_song_or_404(db, payload.song_id)
    last = db.query(models.QueueItem).filter(models.QueueItem.user_id == user_id).order_by(models.QueueItem.position.desc()).first()
    item = models.QueueItem(user_id=user_id, song_id=payload.song_id, position=(last.position + 1 if last else 0))
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_model(item)


@app.get("/users/{user_id}/queue")
def get_queue(
    user_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    rows = db.query(models.QueueItem).filter(models.QueueItem.user_id == user_id).order_by(models.QueueItem.position, models.QueueItem.id).all()
    return [{"queue_item_id": row.id, "position": row.position, "song": serialize_song(get_song_or_404(db, row.song_id))} for row in rows]


@app.delete("/users/{user_id}/queue/{queue_item_id}")
def remove_from_queue(
    user_id: int,
    queue_item_id: int,
    current_user: models.User = Depends(require_self_or_403),
    db: Session = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: you can only access your own resources")
    get_user_or_404(db, user_id)
    item = db.query(models.QueueItem).filter(models.QueueItem.id == queue_item_id, models.QueueItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue item not found")
    db.delete(item)
    db.commit()
    return {"message": "Queue item removed", "queue_item_id": queue_item_id}


# Admin endpoints for managing audio URLs
@app.put("/admin/songs/{song_id}/audio-url")
def update_song_audio_url(
    song_id: int,
    audio_url: str,
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    """Update the audio URL for a song (admin only)"""
    song = get_song_or_404(db, song_id)
    song.audio_url = audio_url
    db.commit()
    db.refresh(song)
    return {
        "message": "Audio URL updated successfully",
        "song_id": song.id,
        "title": song.title,
        "audio_url": song.audio_url,
    }


@app.get("/admin/songs/bulk-audio-urls")
def get_bulk_audio_urls(
    current_user: models.User = Depends(require_role(MANAGER_ROLE)),
    db: Session = Depends(get_db),
):
    """Get all songs with their current audio URLs for bulk updates"""
    songs = db.query(models.Song).all()
    return [
        {
            "id": song.id,
            "title": song.title,
            "artist": song.artist.name if song.artist else None,
            "audio_url": song.audio_url,
        }
        for song in songs
    ]


FRONTEND_DIST = Path(__file__).resolve().parents[1] / "Frontend" / "MOOSIC-visual-refresh-final" / "MOOSIC-visual-refresh" / "artifacts" / "moodsic" / "dist" / "public"
if (FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="frontend-assets")


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    index_file = FRONTEND_DIST / "index.html"
    if not index_file.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Frontend build not found")
    return FileResponse(index_file)