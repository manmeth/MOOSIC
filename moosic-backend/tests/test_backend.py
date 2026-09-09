from datetime import datetime

from fastapi.testclient import TestClient

import main
import models
from database import SessionLocal

client = TestClient(main.app)


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

        main.delete_playlist(playlist.id, user, db)
        assert db.query(models.Playlist).filter(models.Playlist.id == playlist.id).first().is_deleted is True

        main.restore_playlist(playlist.id, user, db)
        assert db.query(models.Playlist).filter(models.Playlist.id == playlist.id).first().is_deleted is False
    finally:
        db.close()


def test_user_can_access_own_resources_but_not_others():
    user_a = client.post("/users", json={
        "name": "User A",
        "username": "user_a_authz",
        "email": "user_a_authz@example.com",
        "password": "StrongPass123",
    })
    user_b = client.post("/users", json={
        "name": "User B",
        "username": "user_b_authz",
        "email": "user_b_authz@example.com",
        "password": "StrongPass123",
    })
    assert user_a.status_code == 200
    assert user_b.status_code == 200

    token_a = user_a.json()["token"]
    token_b = user_b.json()["token"]
    user_a_id = user_a.json()["user"]["user_id"]
    user_b_id = user_b.json()["user"]["user_id"]

    own_response = client.get(
        f"/users/{user_a_id}/playlists",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert own_response.status_code == 200

    other_response = client.get(
        f"/users/{user_b_id}/playlists",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert other_response.status_code == 403

    missing_token_response = client.get(f"/users/{user_b_id}/playlists")
    assert missing_token_response.status_code == 401

    user_b_private_response = client.get(
        f"/users/{user_a_id}/playlists",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert user_b_private_response.status_code == 403


def test_manager_role_dependency_allows_manager_and_rejects_user():
    normal_user = client.post("/users", json={
        "name": "Regular User",
        "username": "normal_manager_check",
        "email": "normal_manager_check@example.com",
        "password": "StrongPass123",
    })
    assert normal_user.status_code == 200
    normal_token = normal_user.json()["token"]

    manager_response = client.post(
        "/manager/register",
        json={
            "name": "Manager User",
            "username": "manager_role_check",
            "email": "manager_role_check@example.com",
            "password": "StrongPass123",
            "registration_code": "manager-access-code",
        },
    )
    assert manager_response.status_code == 200
    manager_token = manager_response.json()["token"]

    manager_access = client.get(
        "/manager-only",
        headers={"Authorization": f"Bearer {manager_token}"},
    )
    assert manager_access.status_code == 200

    normal_access = client.get(
        "/manager-only",
        headers={"Authorization": f"Bearer {normal_token}"},
    )
    assert normal_access.status_code == 403
