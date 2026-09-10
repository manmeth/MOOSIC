# Firewall and Network Security

## Overview

A firewall middleware was implemented for the Moosic FastAPI backend to provide an additional layer of network security. It monitors incoming requests and blocks requests that exceed defined limits or contain suspicious patterns.

## Security Mechanisms

### 1. Rate Limiting

The firewall limits the number of requests from a single IP address to 30 requests within 60 seconds.

Requests exceeding the limit are blocked with HTTP status code 429.

### 2. Suspicious Request Detection

Incoming request URLs are checked for suspicious patterns commonly associated with attacks, including:

- SQL injection patterns such as UNION SELECT
- DROP TABLE
- OR 1=1
- Script injection such as <script>

Suspicious requests are blocked with HTTP status code 403.

### 3. IP-Based Logging

Blocked requests are logged along with the IP address involved.

Security events are recorded in security.log.

### 4. HTTP Method Restriction

The firewall restricts requests to supported HTTP methods and rejects unsupported methods.

### 5. Request Body Size Limit

The firewall checks incoming request body sizes and rejects requests that exceed the configured limit.

### 6. Security Response Headers

Security-related HTTP response headers are added to responses to provide additional protection against common web-based attacks.

### 7. Protected Endpoint Paths

The firewall checks access to protected endpoint paths and blocks unauthorized access attempts.

### 8. URL Length Validation

The firewall validates incoming URL length and rejects excessively long URLs.

## FastAPI Integration

The firewall is integrated with the main FastAPI application through app/main.py.

The FirewallMiddleware is imported and registered with the FastAPI application so that incoming requests are inspected before reaching the application routes.

## Testing

The firewall was tested using the local FastAPI server.

### Rate Limiting Test

Repeated requests from the same IP address were sent to the server. Normal requests returned HTTP 200. After the request limit was exceeded, the firewall returned HTTP 429 with the message:

Too many requests. Try again later.

### Suspicious Request Test

A request containing a suspicious pattern was sent to the server. The firewall blocked the request and returned HTTP 403 with the message:

Suspicious request blocked.

The blocked request was also recorded in security.log.

## Evidence

The following were verified during testing:

- Normal requests were successfully processed.
- Excessive requests were blocked.
- Suspicious requests were blocked.
- Security events were recorded in the log file.
- The firewall was successfully integrated with the FastAPI backend.

## Files

- firewall.py - Firewall middleware implementation
- app/main.py - FastAPI application and firewall integration
- security.log - Security event log
- FIREWALL.md - Firewall documentation