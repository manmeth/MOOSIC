import re
import time
import logging
from urllib.parse import unquote
from collections import defaultdict

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


# Set up security logging
logging.basicConfig(
    filename="security.log",
    level=logging.WARNING,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Store request times for each IP
request_history = defaultdict(list)

# Maximum requests allowed in the time window
MAX_REQUESTS = 30
TIME_WINDOW = 60  # seconds


# Patterns for suspicious input
SUSPICIOUS_PATTERNS = [
    r"(?i)(union\s+select)",
    r"(?i)(drop\s+table)",
    r"(?i)(or\s+1\s*=\s*1)",
    r"(?i)(<script)",
]


class FirewallMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):

        # Get user's IP address
        client_ip = request.client.host if request.client else "unknown"
                # Allow only approved HTTP methods
        ALLOWED_METHODS = {"GET", "POST", "PUT", "DELETE"}

        if request.method not in ALLOWED_METHODS:
            logging.warning(
                f"Blocked IP {client_ip}: Disallowed HTTP method {request.method}"
            )

            return JSONResponse(
                status_code=405,
                content={"detail": "HTTP method not allowed."}
            )

                # Limit request body size
        MAX_BODY_SIZE = 1_000_000  # 1 MB

        content_length = request.headers.get("content-length")

        if content_length and int(content_length) > MAX_BODY_SIZE:
            logging.warning(
                f"Blocked IP {client_ip}: Request body too large"
            )

            return JSONResponse(
                status_code=413,
                content={"detail": "Request too large."}
            )
        current_time = time.time()

        # Remove old requests
        request_history[client_ip] = [
            t for t in request_history[client_ip]
            if current_time - t < TIME_WINDOW
        ]

        # Rate limiting
        if len(request_history[client_ip]) >= MAX_REQUESTS:
            logging.warning(
                f"Blocked IP {client_ip}: Too many requests"
            )

            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Try again later."}
            )

        request_history[client_ip].append(current_time)

        # Check URL for suspicious patterns
        request_url = unquote(str(request.url))

        for pattern in SUSPICIOUS_PATTERNS:
            if re.search(pattern, request_url):
                logging.warning(
                    f"Blocked IP {client_ip}: Suspicious request detected"
                )

                return JSONResponse(
                    status_code=403,
                    content={"detail": "Suspicious request blocked."}
                )

       # Allow normal request to continue
response = await call_next(request)

# Add security headers
response.headers["X-Content-Type-Options"] = "nosniff"
response.headers["X-Frame-Options"] = "DENY"
response.headers["X-XSS-Protection"] = "1; mode=block"

return response
