import requests

URL = "http://127.0.0.1:8000/me"

response = requests.options(
    URL,
    headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
    },
)

print(f"CORS preflight status: {response.status_code}")
print(f"Allow-Origin header present: {"Access-Control-Allow-Origin" in response.headers and bool(response.headers.get("Access-Control-Allow-Origin"))}")
print(f"Allow-Methods header present: {"Access-Control-Allow-Methods" in response.headers and bool(response.headers.get("Access-Control-Allow-Methods"))}")
print(f"Allow-Headers header present: {"Access-Control-Allow-Headers" in response.headers and bool(response.headers.get("Access-Control-Allow-Headers"))}")
