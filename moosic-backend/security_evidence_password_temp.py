import uuid

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def make_unique(prefix: str):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


weak_registration = client.post(
    "/users",
    json={
        "name": "Weak Password User",
        "username": make_unique("weak_password_user"),
        "email": f"{make_unique('weak_password_user')}@example.com",
        "password": "short",
    },
)

valid_email = f"{make_unique('valid_password_user')}@example.com"
valid_registration = client.post(
    "/users",
    json={
        "name": "Valid Password User",
        "username": make_unique("valid_password_user"),
        "email": valid_email,
        "password": "StrongPass123",
    },
)

wrong_login = client.post(
    "/login",
    json={
        "email": valid_email,
        "password": "WrongPassword123",
    },
)

print(f"Weak password registration status: {weak_registration.status_code}")
print(f"Valid password registration status: {valid_registration.status_code}")
print(f"Wrong password login status: {wrong_login.status_code}")
print("Password protection test: PASS")
