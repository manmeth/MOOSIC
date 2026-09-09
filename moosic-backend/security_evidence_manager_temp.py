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
        raise RuntimeError(f"User registration failed: {response.status_code} {response.text}")

    user = data.get("user")
    token = data.get("token")
    if not user or "user_id" not in user or not token:
        raise RuntimeError(f"User registration response missing user/token: {response.text}")

    return user["user_id"], token


def register_manager(name: str, username_prefix: str):
    unique = uuid.uuid4().hex[:8]
    payload = {
        "name": name,
        "username": f"{username_prefix}_{unique}",
        "email": f"{username_prefix}_{unique}@example.com",
        "password": "StrongPass123",
        "registration_code": "manager-access-code",
    }

    response = client.post("/manager/register", json=payload)
    data = response.json()

    if response.status_code != 200:
        raise RuntimeError(f"Manager registration failed: {response.status_code} {response.text}")

    user = data.get("user")
    token = data.get("token")
    if not user or "user_id" not in user or not token:
        raise RuntimeError(f"Manager registration response missing user/token: {response.text}")

    return user["user_id"], token


_, normal_token = register_user("Normal User", "normal_manager_check")
_, manager_token = register_manager("Manager User", "manager_role_check")

manager_access = client.get(
    "/manager-only",
    headers={"Authorization": f"Bearer {manager_token}"},
)
print_result("Manager access to manager-only endpoint", manager_access.status_code)

normal_access = client.get(
    "/manager-only",
    headers={"Authorization": f"Bearer {normal_token}"},
)
print_result("Normal user access to manager-only endpoint", normal_access.status_code)
