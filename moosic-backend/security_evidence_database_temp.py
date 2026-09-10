import uuid

from fastapi.testclient import TestClient

import main
import models
from database import SessionLocal

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

    return user["user_id"], token


db = SessionLocal()
user_a_id, token_a = register_user("Database User A", "db_security_user_a")
user_b_id, token_b = register_user("Database User B", "db_security_user_b")

user_records = db.query(models.User).filter(models.User.id.in_([user_a_id, user_b_id])).all()
if len(user_records) != 2:
    raise RuntimeError(f"Expected 2 user records, found {len(user_records)}")

own_response = client.get(
    f"/users/{user_a_id}/playlists",
    headers={"Authorization": f"Bearer {token_a}"},
)

cross_response = client.get(
    f"/users/{user_b_id}/playlists",
    headers={"Authorization": f"Bearer {token_a}"},
)

print(f"Database users created: {len(user_records)}")
print(f"User A own data access: {own_response.status_code}")
print(f"User A cross-user data access: {cross_response.status_code}")
print(f"Database ownership protection: {len(user_records) == 2 and own_response.status_code == 200 and cross_response.status_code == 403}")

db.close()
