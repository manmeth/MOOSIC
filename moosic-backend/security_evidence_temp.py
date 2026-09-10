import uuid

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def print_result(label: str, status: int):
    print(f"{label}: {status}")


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

    return user["user_id"], token


user_a_id, token_a = register_user("User A", "user_a_security_check")
user_b_id, token_b = register_user("User B", "user_b_security_check")

own_response = client.get(
    f"/users/{user_a_id}/playlists",
    headers={"Authorization": f"Bearer {token_a}"},
)
print_result("User A own resources", own_response.status_code)

other_response = client.get(
    f"/users/{user_b_id}/playlists",
    headers={"Authorization": f"Bearer {token_a}"},
)
print_result("User A accessing User B resources", other_response.status_code)

no_token_response = client.get(f"/users/{user_b_id}/playlists")
print_result("No token", no_token_response.status_code)

user_b_access_response = client.get(
    f"/users/{user_a_id}/playlists",
    headers={"Authorization": f"Bearer {token_b}"},
)
print_result("User B accessing User A resources", user_b_access_response.status_code)
