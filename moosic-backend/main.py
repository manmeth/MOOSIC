from datetime import datetime, timedelta
import os
from urllib.parse import quote_plus

import bcrypt
import jwt
from fastapi import Depends, FastAPI, HTTPException, Query, status, Header
from sqlalchemy.orm import Session

from database import SessionLocal, create_tables, get_db
import models
import schemas


SECRET_KEY = os.getenv("MOOSIC_SECRET_KEY", "moosic-development-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


create_tables()


app = FastAPI(
    title="Moosic API",
    description="Backend for the Moosic music streaming app",
    version="1.0.0",
)


def serialize_model(obj):
    if obj is None:
        return None
    data = obj.__dict__.copy()
    data.pop("_sa_instance_state", None)
    return data


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
                audio_url = f"https://www.youtube.com/embed?listType=search&list={quote_plus(title + ' Hindi song')}"
                existing_song = db.query(models.Song).filter(models.Song.title == title).first()
                if existing_song:
                    if not existing_song.audio_url:
                        existing_song.audio_url = audio_url
                    continue
                db.add(models.Song(
                    title=title,
                    artist_id=artist.id,
                    album_id=album.id,
                    genre="Bollywood",
                    mood=mood,
                    language="Hindi",
                    duration=None,
                    audio_url=audio_url,
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
                            {"title": "Levitating", "genre": "Dance Pop", "language": "English", "duration": 203, "audio_url": "https://www.youtube.com/embed/TUVcZfQe-Kw", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
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
                            {"title": "Sunny Sunny", "genre": "Pop", "language": "Hindi", "duration": 241, "audio_url": "https://www.youtube.com/embed/zs9-s0dVcHU", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "Manali Trance", "genre": "Dance", "language": "Hindi", "duration": 258, "audio_url": "https://www.youtube.com/embed/2jTb6NF0yN8", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
                            {"title": "London Thumakda", "genre": "Pop", "language": "Hindi", "duration": 264, "audio_url": "https://www.youtube.com/embed/QzVtL6H_6O8", "cover_url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1"},
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
                            {"title": "Jai Ho", "genre": "Pop", "language": "Hindi", "duration": 243, "audio_url": "https://www.youtube.com/embed/VEG5-sVnc6M", "cover_url": "https://images.unsplash.com/photo-1516280440614-37939bbacd81"},
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


@app.on_event("startup")
def startup_event():
    seed_demo_music()


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
        },
        "token": token,
    }

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [serialize_model(user) for user in users]


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
        },
        "token": token,
    }


@app.post("/artists")
def create_artist(artist: schemas.ArtistCreate, db: Session = Depends(get_db)):
    new_artist = models.Artist(name=artist.name, image_url=artist.image_url)
    db.add(new_artist)
    db.commit()
    db.refresh(new_artist)

    return {
        "message": "Artist created successfully!",
        "artist_id": new_artist.id,
        "name": new_artist.name,
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


@app.get("/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
    }

@app.get("/artists")
def get_artists(db: Session = Depends(get_db)):
    artists = db.query(models.Artist).all()
    return [serialize_model(artist) for artist in artists]


@app.get("/artists/{artist_id}")
def get_artist_detail(artist_id: int, db: Session = Depends(get_db)):
    artist = db.query(models.Artist).filter(models.Artist.id == artist_id).first()
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
def create_album(album: schemas.AlbumCreate, db: Session = Depends(get_db)):
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
    albums = db.query(models.Album).all()
    return [serialize_album(album) for album in albums]


@app.get("/albums/{album_id}")
def get_album_detail(album_id: int, db: Session = Depends(get_db)):
    album = db.query(models.Album).filter(models.Album.id == album_id).first()
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
def create_song(song: schemas.SongCreate, db: Session = Depends(get_db)):
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
    songs = db.query(models.Song).order_by(models.Song.id).offset(offset).limit(limit).all()
    return [serialize_song(song) for song in songs]


@app.get("/songs/{song_id}")
def get_song_detail(song_id: int, db: Session = Depends(get_db)):
    song = get_song_or_404(db, song_id)
    payload = serialize_song(song)
    payload["is_playable"] = bool(song.audio_url)
    return payload


@app.get("/songs/{song_id}/play")
def get_song_playback(song_id: int, db: Session = Depends(get_db)):
    song = get_song_or_404(db, song_id)
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
        "is_playable": bool(song.audio_url),
    }


@app.get("/songs/genres")
def get_genres(db: Session = Depends(get_db)):
    genres = db.query(models.Song.genre).filter(models.Song.genre.isnot(None)).distinct().all()
    return {"genres": [genre[0] for genre in genres]}


@app.get("/songs/languages")
def get_languages(db: Session = Depends(get_db)):
    languages = db.query(models.Song.language).filter(models.Song.language.isnot(None)).distinct().all()
    return {"languages": [language[0] for language in languages]}


@app.get("/songs/genre/{genre_name}")
def get_songs_by_genre(genre_name: str, db: Session = Depends(get_db)):
    songs = db.query(models.Song).filter(models.Song.genre.ilike(genre_name)).all()
    return [serialize_song(song) for song in songs]


@app.get("/songs/language/{language_name}")
def get_songs_by_language(language_name: str, db: Session = Depends(get_db)):
    songs = db.query(models.Song).filter(models.Song.language.ilike(language_name)).all()
    return [serialize_song(song) for song in songs]


@app.get("/library")
def get_library(db: Session = Depends(get_db)):
    songs = db.query(models.Song).all()
    genres = sorted({song.genre for song in songs if song.genre})
    languages = sorted({song.language for song in songs if song.language})

    return {
        "featured": [serialize_song(song) for song in songs[:8]],
        "genres": {genre: [serialize_song(song) for song in songs if song.genre == genre] for genre in genres},
        "languages": {language: [serialize_song(song) for song in songs if song.language == language] for language in languages},
    }


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

    return [serialize_song(song) for song in songs]


@app.get("/users/{user_id}/recommendations")
def get_recommendations(user_id: int, db: Session = Depends(get_db)):
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
def create_playlist(user_id: int, playlist: schemas.PlaylistCreate, db: Session = Depends(get_db)):
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
def get_user_playlists(user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    playlists = (
        db.query(models.Playlist)
        .filter(models.Playlist.user_id == user_id, models.Playlist.is_deleted.is_(False))
        .order_by(models.Playlist.id.desc())
        .all()
    )
    return [serialize_playlist(playlist) for playlist in playlists]


@app.get("/users/{user_id}/playlists/recycle-bin")
def get_deleted_playlists(user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    playlists = (
        db.query(models.Playlist)
        .filter(models.Playlist.user_id == user_id, models.Playlist.is_deleted.is_(True))
        .order_by(models.Playlist.deleted_at.desc(), models.Playlist.id.desc())
        .all()
    )
    return [serialize_playlist(playlist) for playlist in playlists]


@app.put("/playlists/{playlist_id}")
def update_playlist(playlist_id: int, payload: schemas.PlaylistUpdate, db: Session = Depends(get_db)):
    playlist = get_playlist_or_404(db, playlist_id)
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and not updates["name"].strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Playlist name cannot be empty")
    for field, value in updates.items():
        setattr(playlist, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(playlist)
    return serialize_playlist(playlist)


@app.delete("/playlists/{playlist_id}")
def delete_playlist(playlist_id: int, db: Session = Depends(get_db)):
    playlist = get_playlist_or_404(db, playlist_id)
    if playlist.is_deleted:
        return {"message": "Playlist already deleted", "playlist_id": playlist_id}

    playlist.is_deleted = True
    playlist.deleted_at = datetime.utcnow()
    db.commit()

    return {"message": "Playlist deleted successfully", "playlist_id": playlist_id}


@app.post("/playlists/{playlist_id}/restore")
def restore_playlist(playlist_id: int, db: Session = Depends(get_db)):
    playlist = get_playlist_or_404(db, playlist_id)
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
    db: Session = Depends(get_db),
):
    playlist = get_playlist_or_404(db, playlist_id)
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
def remove_song_from_playlist(playlist_id: int, song_id: int, db: Session = Depends(get_db)):
    playlist = get_playlist_or_404(db, playlist_id)
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
def reorder_playlist_songs(playlist_id: int, payload: schemas.PlaylistSongReorder, db: Session = Depends(get_db)):
    get_playlist_or_404(db, playlist_id)
    rows = db.query(models.PlaylistSong).filter(models.PlaylistSong.playlist_id == playlist_id).all()
    row_by_song = {row.song_id: row for row in rows}
    if set(payload.song_ids) != set(row_by_song) or len(payload.song_ids) != len(row_by_song):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="song_ids must contain every playlist song exactly once")
    for position, song_id in enumerate(payload.song_ids):
        row_by_song[song_id].position = position
    db.commit()
    return {"message": "Playlist order updated", "playlist_id": playlist_id, "song_ids": payload.song_ids}


@app.get("/playlists/{playlist_id}/songs")
def get_playlist_songs(playlist_id: int, db: Session = Depends(get_db)):
    get_playlist_or_404(db, playlist_id)
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


@app.post("/users/{user_id}/liked-songs")
def like_song(user_id: int, payload: schemas.LikeSongCreate, db: Session = Depends(get_db)):
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
def get_liked_songs(user_id: int, db: Session = Depends(get_db)):
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


@app.post("/users/{user_id}/listening-history")
def record_listening_history(
    user_id: int,
    history: schemas.ListeningHistoryCreate,
    db: Session = Depends(get_db),
):
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
def get_listening_history(user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    history = (
        db.query(models.ListeningHistory)
        .filter(models.ListeningHistory.user_id == user_id)
        .order_by(models.ListeningHistory.played_at.desc())
        .all()
    )
    return [serialize_model(item) for item in history]


@app.put("/users/{user_id}/playback")
def update_playback_state(user_id: int, payload: schemas.PlaybackStateUpdate, db: Session = Depends(get_db)):
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
def get_playback_state(user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    state = db.query(models.PlaybackState).filter(models.PlaybackState.user_id == user_id).first()
    return serialize_model(state) if state else {"user_id": user_id, "song_id": None, "position_seconds": 0, "is_playing": False}


@app.post("/users/{user_id}/queue")
def add_to_queue(user_id: int, payload: schemas.QueueSongAdd, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    get_song_or_404(db, payload.song_id)
    last = db.query(models.QueueItem).filter(models.QueueItem.user_id == user_id).order_by(models.QueueItem.position.desc()).first()
    item = models.QueueItem(user_id=user_id, song_id=payload.song_id, position=(last.position + 1 if last else 0))
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_model(item)


@app.get("/users/{user_id}/queue")
def get_queue(user_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    rows = db.query(models.QueueItem).filter(models.QueueItem.user_id == user_id).order_by(models.QueueItem.position, models.QueueItem.id).all()
    return [{"queue_item_id": row.id, "position": row.position, "song": serialize_song(get_song_or_404(db, row.song_id))} for row in rows]


@app.delete("/users/{user_id}/queue/{queue_item_id}")
def remove_from_queue(user_id: int, queue_item_id: int, db: Session = Depends(get_db)):
    get_user_or_404(db, user_id)
    item = db.query(models.QueueItem).filter(models.QueueItem.id == queue_item_id, models.QueueItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue item not found")
    db.delete(item)
    db.commit()
    return {"message": "Queue item removed", "queue_item_id": queue_item_id}


# Admin endpoints for managing audio URLs
@app.put("/admin/songs/{song_id}/audio-url")
def update_song_audio_url(song_id: int, audio_url: str, db: Session = Depends(get_db)):
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
def get_bulk_audio_urls(db: Session = Depends(get_db)):
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
