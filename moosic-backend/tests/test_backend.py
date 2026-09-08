from datetime import datetime

import main
import models
from database import SessionLocal


def setup_function():
    db = SessionLocal()
    try:
        db.query(models.PlaylistSong).delete()
        db.query(models.Playlist).delete()
        db.query(models.ListeningHistory).delete()
        db.query(models.LikedSong).delete()
        db.query(models.QueueItem).delete()
        db.query(models.PlaybackState).delete()
        db.query(models.Song).delete()
        db.query(models.Album).delete()
        db.query(models.Artist).delete()
        db.query(models.User).delete()
        db.commit()
    finally:
        db.close()


def test_rank_songs_by_mood_prioritizes_user_preferences():
    songs = [
        models.Song(title="Neutral Track", mood="Neutral", language="English"),
        models.Song(title="Happy Track", mood="Happy", language="English"),
        models.Song(title="Happy Favorite", mood="Happy", language="English"),
        models.Song(title="Sad Track", mood="Sad", language="English"),
    ]

    ranked = main.rank_songs_by_mood(
        songs,
        mood_preferences={"Happy": 5, "Sad": 2},
        genre_preferences={"Pop": 4},
        artist_preferences={1: 3},
    )

    assert ranked[0].title == "Happy Track"
    assert ranked[1].title == "Happy Favorite"


def test_delete_and_restore_playlist_soft_deletes_playlist():
    db = SessionLocal()
    try:
        user = models.User(username="restore-user", email="restore@example.com", password="hash")
        db.add(user)
        db.commit()
        db.refresh(user)

        playlist = models.Playlist(name="Old Mix", user_id=user.id, is_deleted=False)
        db.add(playlist)
        db.commit()
        db.refresh(playlist)

        main.delete_playlist(playlist.id, db)
        assert db.query(models.Playlist).filter(models.Playlist.id == playlist.id).first().is_deleted is True

        main.restore_playlist(playlist.id, db)
        assert db.query(models.Playlist).filter(models.Playlist.id == playlist.id).first().is_deleted is False
    finally:
        db.close()
