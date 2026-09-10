import uuid

from fastapi.testclient import TestClient

import main
import models
from database import SessionLocal

client = TestClient(main.app)


def print_result(label: str, value):
    print(f"{label}: {value}")


unique = uuid.uuid4().hex[:8]
plain_password = "TestPassword123!"
user_payload = {
    "name": "Data Protection Test",
    "username": f"data_protection_{unique}",
    "email": f"data_protection_{unique}@example.com",
    "password": plain_password,
}

register_response = client.post("/users", json=user_payload)
if register_response.status_code != 200:
    raise RuntimeError(f"Registration failed: {register_response.status_code} {register_response.text}")

login_response = client.post(
    "/login",
    json={
        "email": user_payload["email"],
        "password": plain_password,
    },
)
if login_response.status_code != 200:
    raise RuntimeError(f"Login failed: {login_response.status_code} {login_response.text}")

me_response = client.get(
    "/me",
    headers={"Authorization": f"Bearer {login_response.json()['token']}"},
)
me_data = me_response.json()

print_result("Login status", login_response.status_code)
print_result("/me status", me_response.status_code)
print_result("Password field exposed by /me", "password" in me_data)
print_result("Password hash exposed by /me", "password_hash" in me_data or "hashed_password" in me_data)

with SessionLocal() as db:
    user = db.query(models.User).filter(models.User.email == user_payload["email"]).first()
    if user is None:
        raise RuntimeError("User not found in database after registration/login")
    stored_password = user.password
    print_result("Stored password equals plaintext", stored_password == plain_password)
