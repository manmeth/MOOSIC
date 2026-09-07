import requests
import time

BASE = "http://127.0.0.1:8000"

def main():
    ts = int(time.time())
    payload = {
        "name": f"Test User {ts}",
        "username": f"testuser{ts}",
        "email": f"test{ts}@example.com",
        "password": "password123",
    }

    print("Registering user...")
    r = requests.post(f"{BASE}/users", json=payload)
    print(r.status_code, r.text)
    if r.status_code != 200:
        return

    print("Logging in...")
    r2 = requests.post(f"{BASE}/login", json={"email": payload["email"], "password": payload["password"]})
    print(r2.status_code, r2.text)
    if r2.status_code != 200:
        return

    token = r2.json().get("token")
    print("Token:", token)

    print("Getting /me ...")
    headers = {"Authorization": f"Bearer {token}"}
    r3 = requests.get(f"{BASE}/me", headers=headers)
    print(r3.status_code, r3.text)

if __name__ == '__main__':
    main()
