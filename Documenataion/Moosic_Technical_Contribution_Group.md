# Moosic — Group Technical Contribution

## 1. Overview

This document records the major technical contributions made by the Moosic project team. The contributions cover frontend development, backend/API implementation, database design, business logic, authentication and authorisation, security, AI-assisted functionality, Premium services, offline downloads, architecture, testing, integration, and technical improvements.

The project follows the CIA III requirement that significant implementation work be traceable to identifiable tasks, working functionality, technical evidence, and the student responsible for the implementation or verification.

---

## 2. Frontend, User Interface and User Experience

### Udditee — Frontend and Architecture Contribution

Udditee contributed to the main Moosic frontend and system architecture documentation.

Key technical work includes:

- Building and refining the user-facing Moosic interface.
- Implementing dashboard and playlist-related user interface flows.
- Implementing mood-based themes and responsive visual behaviour.
- Developing the Recycle Bin frontend experience.
- Preparing the system architecture and component mapping.
- Creating architecture/data-flow representations for the project documentation.
- Contributing to responsive UI and visual technical improvements.

The frontend connects the user interface to the backend APIs and displays persisted business data and application results.

---

## 3. Backend and Database Implementation

### Manmeet — Backend and Database Contribution

Manmeet contributed substantially to the backend and persistent data layer.

Key technical work includes:

- Implementing and maintaining backend/API functionality.
- Designing and maintaining the database schema.
- Establishing relationships between database entities.
- Implementing playlist and Recycle Bin persistence.
- Implementing database queries and persistent CRUD operations.
- Connecting application APIs to the database.
- Working on query and transaction optimisation.
- Maintaining song/content database information.
- Supporting song playback data and backend integration.

The database layer provides persistent storage for core business information including users, songs, playlists, listening activity and other application records.

---

## 4. Business Algorithm and Recommendation Processing

### Manmeet — Mood-Based Recommendation and Ranking

The project contains non-trivial recommendation/ranking logic based on user mood and song information.

### Problem

Users should receive more relevant song recommendations instead of an identical list for every user.

### Inputs

- Selected or relevant mood.
- Song information and mood categorisation.
- User listening/preferences information where applicable.

### Processing

The recommendation mechanism identifies relevant songs and applies ranking/selection logic to produce a curated result.

### Output

An ordered or curated set of songs relevant to the user's mood and listening context.

This processing provides the business logic required for the recommendation function and goes beyond simple page navigation or basic CRUD.

---

## 5. Moo Bot AI-Assisted Playlist Naming

### Siya — Moo Bot Contribution

Siya contributed the Moo Bot AI-assisted playlist naming functionality.

Key technical work includes:

- Connecting the application to the playlist-name generation service.
- Processing requests for playlist names.
- Implementing input validation for naming requests.
- Handling API errors and invalid responses.
- Adding logging/error handling for the naming service.
- Integrating the generated names into the playlist creation workflow.

### Personalised Playlist Experience

Moo Bot supports curated playlist creation based on the user's recent mood/listening context. The system can use recent mood or listening patterns to suggest a suitable playlist concept and generate an appropriate playlist name.

The feature connects AI-assisted processing to the application's business workflow rather than functioning as an isolated interface element.

---

## 6. Authentication and Data Protection

### Srinidhi — Authentication and Secure Identity Management

Srinidhi contributed to the authentication and data-protection mechanisms.

Key technical work includes:

- Implementing user registration and login.
- Using email-based authentication.
- Implementing JWT-based authentication.
- Protecting backend routes using authenticated Bearer tokens.
- Implementing secure password hashing using bcrypt.
- Validating password strength during registration.
- Implementing current-user resolution from JWT claims.
- Ensuring passwords and password hashes are not exposed through user-facing responses.

### Authentication Flow

```text
User credentials
      ↓
Registration / Login API
      ↓
Password hashing / verification
      ↓
JWT token generation
      ↓
Authorization header
      ↓
JWT validation
      ↓
Authenticated user
```

---

## 7. Authorisation and Role-Based Access Control

### Srinidhi — Authorisation and Manager Access Control

Role-based and ownership-based access controls were integrated into protected backend operations.

Key technical mechanisms include:

- Reusable role-based access control.
- Manager-only endpoint protection.
- User ownership checks for user-specific resources.
- Rejection of unauthenticated requests.
- Rejection of authorised-but-insufficient-role requests.
- Protection of Manager functionality from normal users.

### Decision Logic

```text
Protected request
      ↓
Validate JWT
      ↓
Identify authenticated user
      ↓
Check role / ownership
      ↓
 ┌───────────────┬────────────────┐
 │ Authorised    │ Not authorised │
 ↓               ↓
Process request  Return 401/403
```

This creates a separation between normal-user functionality and Manager functionality.

---

## 8. Premium Subscription and Payment Processing

### Srinidhi — Premium Backend and Business Processing

The Premium backend implements the business rules associated with subscription status and payment outcomes.

### Business Problem

Premium functionality must only be activated when the payment workflow succeeds.

### Processing

```text
Premium subscription request
        ↓
Authenticate user
        ↓
Validate plan
        ↓
Process payment result
        ↓
 ┌──────────────────────┐
 │ Payment successful?  │
 └───────────┬──────────┘
       YES   │   NO
        ↓    │    ↓
Successful   │   Failed payment
payment      │   record
record       │
        ↓    │
is_premium   │   Premium remains
= true       │   inactive
```

The system records payment status and updates Premium state based on the payment result.

Relevant operations include:

- Premium status.
- Premium subscription.
- Premium cancellation.
- Payment persistence.

The payment flow is a test/sandbox transaction rather than a claim of production payment-gateway deployment.

---

## 9. Offline Download Processing

### Srinidhi — Premium-Controlled Downloads

The backend implements Premium-based download management.

### Processing Rule

```text
Download request
      ↓
Authenticate user
      ↓
Check requested user ownership
      ↓
Check Premium status
      ↓
 ┌───────────────┬────────────────┐
 │ Premium       │ Not Premium    │
 ↓               ↓
Create download  Reject request
record
```

The `Download` entity stores the user, song and download timestamp, while a uniqueness constraint prevents duplicate user-song download records.

The current implementation represents offline-download management through persistent download records; it does not claim to implement Spotify-style local encrypted audio storage.

---

## 10. Security and Network Protection

### Erin — Security and Firewall Contribution

Erin contributed the network and firewall security layer and associated evidence.

The project documents multiple security mechanisms, including:

- Rate limiting.
- Suspicious request detection.
- IP logging/security event tracking.
- HTTP method restriction.
- Request body size limits.
- Security response headers.
- Protected endpoint paths.
- URL length validation.
- CORS/network access controls.
- Security testing and evidence collection.

Testing demonstrates allowed requests, rate-limited requests, and blocked/suspicious requests.

---

## 11. Failure and Recovery

### Erin — Failure/Recovery Contribution

The project documents recovery strategies for the five required failure categories:

| Failure Area | Example |
|---|---|
| Application/Server | Backend service unavailable |
| Database | Database access/failure |
| Network | API/network connectivity unavailable |
| Storage | Data/storage failure |
| Security | Malicious or unauthorised request |

For each failure, the documentation identifies:

- Impact.
- Detection.
- Recovery mechanism.

Network failure/recovery testing also demonstrated an unavailable service/port followed by successful recovery on the application service port.

---

## 12. Architecture and Scalability

### Udditee — Architecture Contribution

The architecture documentation maps the major components of the system:

```text
User
  ↓
Frontend
  ↓
Backend / API
  ↓
Authentication + Business Logic
  ↓
Database
  ↓
Backend Response
  ↓
Frontend
  ↓
User
```

The proposed large-scale architecture includes components such as:

- CDN.
- WAF/security controls.
- Load balancer.
- Multiple stateless application instances.
- Cache.
- Scalable database infrastructure/read replicas.
- Object storage.
- Background workers/queues where required.
- Monitoring and logging.

The architecture is designed to support scaling discussions for 1 million and 5 million users without requiring actual cloud deployment at that scale.

---

## 13. Quantitative Scalability Analysis

### Srinidhi — Quantitative Analysis

The scalability analysis applies the CIA III assumptions for:

- 25% annual user growth.
- 10% peak simultaneous activity.
- 5 requests per active user per minute.

The analysis calculates:

1. Projected users after 1–5 years.
2. Peak concurrent users for 100,000, 500,000, 1 million and 5 million registered users.
3. Requests per minute and requests per second for 10,000, 50,000, 100,000 and 500,000 active users.

The results are interpreted in terms of:

- Horizontal application scaling.
- Database scaling.
- Caching.
- Network capacity.
- Load balancing.
- Storage scaling.
- Monitoring.
- Security.
- Backup and recovery.

---

## 14. Personalised Listening Experience

Moosic is designed to provide a personalised listening experience rather than identical recommendations for all users.

The system can use user preferences and recent listening behaviour to support personalised recommendations.

A scalable personalised flow is:

```text
User listening activity
        ↓
Recent mood / preference patterns
        ↓
Recommendation / ranking logic
        ↓
Curated playlist suggestion
        ↓
Moo Bot playlist-name generation
        ↓
Personalised playlist
```

As the user base increases, recommendation processing also increases. Therefore, efficient database queries, indexing, caching and scalable application services become important for maintaining responsive personalised recommendations.

---

## 15. Frontend–Backend–Database Integration

The system demonstrates the required:

```text
Interface
   ↓
Application / API
   ↓
Business Logic
   ↓
Data Layer
   ↓
Business Output
   ↓
Interface
```

Examples include:

### Playlist workflow

```text
Frontend playlist action
        ↓
Playlist API
        ↓
Business validation
        ↓
Database transaction
        ↓
Updated playlist data
        ↓
Frontend display
```

### Premium workflow

```text
Premium UI
        ↓
Subscription API
        ↓
Payment processing logic
        ↓
Payment + User records
        ↓
Premium status
        ↓
Frontend
```

### Download workflow

```text
Download action
        ↓
Authentication
        ↓
Ownership + Premium checks
        ↓
Download record
        ↓
Downloads display
```

---

## 16. Testing, Integration and Technical Improvements

The group carried out integration testing and technical improvements across the application.

Examples include:

- Authentication and security testing.
- User/Manager authorisation testing.
- Premium payment success/failure testing.
- Download authorisation testing.
- Database persistence verification.
- API integration testing.
- Listening-history API debugging.
- Network failure/recovery testing.
- Security control testing.
- Frontend-backend integration and bug fixing.

### Listening-History Technical Improvement

During integration, the listening-history update request was corrected from an unsupported HTTP method to the backend-supported `PUT` operation.

The issue produced a `405 Method Not Allowed` response. The frontend request was corrected and subsequent tests returned successful `200` responses.

This demonstrates problem identification, API contract alignment, implementation change and verification.

---

## 17. Technical Contribution Summary

| Team Member | Major Technical Areas |
|---|---|
| Erin | Firewall/network security, security mechanisms, security testing, failure/recovery, Premium frontend |
| Manmeet | Backend/API, database, schema/relationships, playlist CRUD, recommendation/ranking logic, query optimisation |
| Siya | Moo Bot, AI-assisted playlist naming, validation, API error handling/logging, technical improvement |
| Srinidhi | Authentication, JWT, bcrypt, authorisation, Premium/payment backend, Premium access control, downloads, integration/testing, quantitative scalability |
| Udditee | Frontend, architecture, data-flow/component mapping, mood-based themes, dashboard/playlist UI, responsive UI |

## 18. Evidence and Traceability

Each significant technical contribution should be supported through the project implementation tracker and repository evidence such as:

- GitHub commit.
- Changed source file/module.
- API response.
- Database result.
- Test result.
- Screenshot.
- Working demonstration.

The final implementation tracker records the task, responsible student, AI assistance where applicable, completion/verification responsibility, date and evidence.

The technical contributions described above should be interpreted together with the actual GitHub implementation and working system rather than as claims based only on documentation.
