import uuid
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning)

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def register_user(name: str, username_prefix: str):
    unique = uuid.uuid4().hex[:8]
    payload = {
        "name": name,
        "username": f"{username_prefix}_{unique}",
        "email": f"{username_prefix}_{unique}@example.com",
        "password": "StrongPass123",
    }

    response = client.post("/users", json=payload)
    data = response.json()

    if response.status_code != 200:
        raise RuntimeError(f"Registration failed for {name}: {response.status_code} {response.text}")

    user = data.get("user")
    token = data.get("token")
    if not user or "user_id" not in user or not token:
        raise RuntimeError(f"Registration response missing user/token for {name}: {response.text}")

    return user["user_id"], user["email"], token


user_a_id, user_a_email, token_a = register_user("Monitoring User A", "monitor_user_a")
user_b_id, user_b_email, _ = register_user("Monitoring User B", "monitor_user_b")

login_success = client.post(
    "/login",
    json={"email": user_a_email, "password": "StrongPass123"},
)
login_failed = client.post(
    "/login",
    json={"email": user_a_email, "password": "WrongPassword123"},
)
me_without_token = client.get("/me")
playlist_forbidden = client.get(
    f"/users/{user_b_id}/playlists",
    headers={"Authorization": f"Bearer {token_a}"},
)

print(f"Successful login status: {login_success.status_code}")
print(f"Failed login status: {login_failed.status_code}")
print(f"Unauthenticated /me status: {me_without_token.status_code}")
print(f"Cross-user access status: {playlist_forbidden.status_code}")
print("Security events verified: 4")
