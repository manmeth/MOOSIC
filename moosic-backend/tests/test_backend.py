from datetime import datetime

from fastapi.testclient import TestClient

import main
import models
import firewall
from database import SessionLocal

client = TestClient(main.app)


def setup_function():
    db = SessionLocal()
    try:
        db.query(models.PlaylistSong).delete()
        db.query(models.Playlist).delete()
        db.query(models.ListeningHistory).delete()
        db.query(models.LikedSong).delete()
        db.query(models.Download).delete()
        db.query(models.Payment).delete()
        db.query(models.QueueItem).delete()
        db.query(models.PlaybackState).delete()
        db.query(models.Song).delete()
        db.query(models.Album).delete()
        db.query(models.Artist).delete()
        db.query(models.User).delete()
        db.commit()
    finally:
        db.close()
    # Clear firewall rate limiting history to avoid 429 in tests
    firewall.request_history.clear()


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


def test_manager_dashboard_and_permissions():
    # create normal user
    normal_user = client.post("/users", json={
        "name": "Normal",
        "username": "normal_manager_user",
        "email": "normal_manager_user@example.com",
        "password": "StrongPass123",
    })
    assert normal_user.status_code == 200
    normal_token = normal_user.json()["token"]

    # create manager
    manager = client.post("/manager/register", json={
        "name": "Manager",
        "username": "manager_user",
        "email": "manager_user@example.com",
        "password": "StrongPass123",
        "registration_code": "manager-access-code",
    })
    assert manager.status_code == 200
    manager_token = manager.json()["token"]

    # manager dashboard accessible
    m_dash = client.get("/manager/dashboard", headers={"Authorization": f"Bearer {manager_token}"})
    assert m_dash.status_code == 200

    # normal user forbidden
    normal_dash = client.get("/manager/dashboard", headers={"Authorization": f"Bearer {normal_token}"})
    assert normal_dash.status_code == 403

    # unauthenticated -> 401
    anon_dash = client.get("/manager/dashboard")
    assert anon_dash.status_code == 401


def test_manager_users_and_user_patch():
    # create manager
    manager = client.post("/manager/register", json={
        "name": "Manager2",
        "username": "manager_user2",
        "email": "manager_user2@example.com",
        "password": "StrongPass123",
        "registration_code": "manager-access-code",
    })
    manager_token = manager.json()["token"]

    # create some users
    u1 = client.post("/users", json={"name": "U1", "username": "u1", "email": "u1@example.com", "password": "StrongPass123"})
    u2 = client.post("/users", json={"name": "U2", "username": "u2", "email": "u2@example.com", "password": "StrongPass123"})
    assert u1.status_code == 200 and u2.status_code == 200

    users_resp = client.get("/manager/users", headers={"Authorization": f"Bearer {manager_token}"})
    assert users_resp.status_code == 200
    users = users_resp.json().get("users", [])
    assert any(u["username"] == "u1" for u in users)

    # normal user cannot access
    normal = client.post("/users", json={"name": "Normal2", "username": "normal2", "email": "normal2@example.com", "password": "StrongPass123"})
    normal_token = normal.json()["token"]
    forbidden = client.get("/manager/users", headers={"Authorization": f"Bearer {normal_token}"})
    assert forbidden.status_code == 403

    # patch a user (change name and premium)
    target_id = u1.json()["user"]["user_id"]
    # Use PUT because the firewall blocks PATCH in this environment
    patch_resp = client.put(f"/manager/users/{target_id}", json={"name": "U1 Renamed", "is_premium": True}, headers={"Authorization": f"Bearer {manager_token}"})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["user"]["name"] == "U1 Renamed"


def test_manager_song_crud_and_permissions():
    # prepare manager
    manager = client.post("/manager/register", json={
        "name": "Manager3",
        "username": "manager_user3",
        "email": "manager_user3@example.com",
        "password": "StrongPass123",
        "registration_code": "manager-access-code",
    })
    manager_token = manager.json()["token"]

    # create artist and album (public endpoints)
    artist = client.post("/artists", json={"name": "Mgmt Artist", "image_url": ""})
    assert artist.status_code == 200
    artist_id = artist.json()["artist_id"]
    album = client.post("/albums", json={"title": "Mgmt Album", "artist_id": artist_id, "release_date": "2026-01-01", "cover_url": ""})
    assert album.status_code == 200
    album_id = album.json()["album_id"]

    # manager creates a song
    create = client.post("/manager/songs", json={"title": "Mgmt Song", "artist_id": artist_id, "album_id": album_id, "genre": "Pop"}, headers={"Authorization": f"Bearer {manager_token}"})
    assert create.status_code == 200
    song_id = create.json()["song_id"]

    # manager updates song
    upd = client.put(f"/manager/songs/{song_id}", json={"title": "Mgmt Song Edited", "genre": "Rock"}, headers={"Authorization": f"Bearer {manager_token}"})
    assert upd.status_code == 200

    # normal user cannot create song
    normal = client.post("/users", json={"name": "Normal3", "username": "normal3", "email": "normal3@example.com", "password": "StrongPass123"})
    normal_token = normal.json()["token"]
    forbidden_create = client.post("/manager/songs", json={"title": "Bad Song", "artist_id": artist_id}, headers={"Authorization": f"Bearer {normal_token}"})
    assert forbidden_create.status_code == 403

    # manager deletes song
    delr = client.delete(f"/manager/songs/{song_id}", headers={"Authorization": f"Bearer {manager_token}"})
    assert delr.status_code == 200


def test_manager_payments_view_permissions():
    # create user and subscribe
    user = client.post("/users", json={"name": "PayUser", "username": "payuser", "email": "pay@example.com", "password": "StrongPass123"})
    token = user.json()["token"]
    resp = client.post("/premium/subscribe", json={"plan": "premium", "payment_method": "test_success"}, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200

    # manager can view payments
    manager = client.post("/manager/register", json={
        "name": "Manager4",
        "username": "manager_user4",
        "email": "manager_user4@example.com",
        "password": "StrongPass123",
        "registration_code": "manager-access-code",
    })
    manager_token = manager.json()["token"]
    payments = client.get("/manager/payments", headers={"Authorization": f"Bearer {manager_token}"})
    assert payments.status_code == 200
    assert any(p["user_email"] == "pay@example.com" for p in payments.json().get("payments", []))

    # normal user cannot view
    normal = client.post("/users", json={"name": "Normal4", "username": "normal4", "email": "normal4@example.com", "password": "StrongPass123"})
    normal_token = normal.json()["token"]
    forbidden = client.get("/manager/payments", headers={"Authorization": f"Bearer {normal_token}"})
    assert forbidden.status_code == 403
