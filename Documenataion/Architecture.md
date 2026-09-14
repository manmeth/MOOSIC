1. Business Problem and Target Users
Business Problem

Traditional music platforms provide a large number of songs but can make it difficult for users to discover music that matches their individual preferences, mood and listening behaviour. Users may also spend time manually creating and managing playlists.

MOOSIC addresses this problem by providing a personalized music experience that combines music discovery, playlist management, recommendations and personalization. The system uses information such as listening behaviour, favourite artists, genres and moods to provide more relevant recommendations. It also provides features such as AI-assisted playlist naming, dynamic themes and playlist recovery.

The main business objective is to make music discovery more personalized while keeping playlist and library management simple for the user.

Target Users

The primary target users are:

Individual music listeners who want personalized music recommendations.
Users who frequently create playlists based on different moods, genres or activities.
Users interested in music discovery rather than manually searching for every song.
Administrators/system managers who are responsible for managing the system, data and operational processes.

MOOSIC is therefore designed as a user-focused digital business system where user interactions generate data that can be processed to improve personalization.

2. Technology Stack

The MOOSIC repository is structured with a separate frontend and backend, with the frontend application located under the Frontend directory and backend components under moosic-backend.

Layer	Technology / Approach	Purpose
Frontend	React / Vite	Provides the user interface and user interaction
Frontend styling	Web-based UI components and styling	Provides the visual interface and responsive experience
Backend	Backend API layer	Processes requests and applies application/business logic
Database	Persistent database	Stores users, playlists, songs and user activity
Authentication	Authentication and authorization layer	Protects accounts and private user resources
Recommendation logic	Application/business logic	Uses user behaviour, preferences, genres, artists and moods
AI-assisted features	AI-assisted processing	Supports features such as playlist naming and personalization
Version control	GitHub	Stores and manages the project source code

The technology stack is organized around a frontend → backend/API → database structure. This separation allows the user interface and business logic to be developed and scaled independently.

3. Current System Architecture

The current system architecture is shown in the Current System Architecture & Data Flow diagram in the Draw.io file.

The architecture consists of four major layers:

User → Frontend → Backend/API → Database

The user interacts with the MOOSIC web application through the frontend. Requests such as login, searching for music, creating playlists or requesting recommendations are sent to the backend/API. The backend validates the request, applies the required business logic and communicates with the database before returning the result to the frontend.

Major Components

Frontend:
The frontend provides the main user interface for login, music discovery, mood selection, playlist management, library management and other user interactions.

Backend/API:
The backend acts as the main processing layer. It receives requests from the frontend, validates them, checks authorization and performs business operations before communicating with the database.

Authentication:
Authentication verifies the user's identity during login and registration. Authorization ensures that users can only access resources they are permitted to use, such as their private playlists.

Database:
The database provides persistent storage for application information such as users, songs, playlists, listening activity and preferences.

Storage:
Storage can be used for application assets, backups and other files that should not be stored directly inside the main transactional database.

External Services:
External services can support music-related functionality and AI-assisted features where required. These services are accessed through controlled API connections rather than directly from the frontend.

4. Data Flow Between Major Components

The major data flow in MOOSIC is:

User → Frontend → Authentication/API → Business Logic → Database → Backend → Frontend → User

For example, when a user requests personalized recommendations:

The user selects a mood, genre or discovery option through the frontend.
The frontend sends the request to the backend/API.
The backend verifies the user's authentication and authorization.
The recommendation logic processes relevant user information such as listening behaviour, favourite artists, genres and moods.
Required information is retrieved from the database.
The recommendation result is returned through the API.
The frontend displays the recommendations to the user.

This creates a continuous cycle where user interactions become operational data, the data is processed, and the processed information is used to improve the user experience. This also reflects the TPS, MIS and DSS roles described for MOOSIC in the project documentation.

5. Current Hosting and Deployment Approach

At the current project stage, MOOSIC is primarily structured as a development application with separate frontend and backend components. The repository contains dedicated frontend and backend directories and scripts for running the application.

The current approach is suitable for development and demonstration because the frontend and backend can be developed and tested separately.

However, this approach would not be sufficient for millions of users because a single development environment would become a bottleneck. A production deployment would therefore require cloud hosting, multiple application instances, load balancing, caching, database scaling and monitoring.

The proposed cloud architecture described in the next section addresses these requirements.

6. Proposed Cloud Deployment Architecture – AWS

For large-scale deployment, Amazon Web Services (AWS) is proposed as the cloud platform.

The proposed architecture is shown in the Proposed AWS Cloud Deployment diagram.

Main Components

Users / Web Browsers
Users access MOOSIC through web browsers from different locations.

Amazon CloudFront / CDN
A Content Delivery Network can deliver static frontend files closer to users, reducing latency and reducing the amount of traffic reaching the application servers.

AWS WAF
The Web Application Firewall can filter malicious or suspicious web traffic before it reaches the application.

Load Balancer
The load balancer distributes incoming requests across multiple backend application instances. This prevents one server from handling all requests.

Application/API Cluster
Multiple backend instances can run simultaneously. Because the application layer is designed to process requests independently, additional instances can be added when traffic increases.

Cache Layer
Frequently requested information can be temporarily stored in a cache. This reduces repeated database queries and improves response time.

Database
The database stores persistent application information. Read replicas can be introduced as the number of users and read requests increases.

Object Storage
Cloud object storage can be used for large files, application assets, backups and other data that does not need to be stored in the transactional database.

Queue and Worker System
Time-consuming tasks such as recommendation processing, analytics and other background operations can be moved to workers through a message queue. This prevents these tasks from slowing down normal user requests.

Monitoring and Logging
Monitoring services collect system metrics, errors and logs so that failures and performance problems can be detected quickly.

7. Scaling to 1 Million Users

The 1 Million Users diagram shows how MOOSIC could be scaled if the platform grows significantly.

At this level, the application should no longer depend on a single backend server. Multiple API instances can run behind a load balancer, allowing incoming requests to be distributed across the available servers.

Application Scaling

Additional backend instances can be added horizontally when traffic increases. This allows the system to handle more simultaneous users without depending on one server.

Database Scaling

Database read traffic can be distributed to read replicas. Frequently accessed information can also be cached to reduce the number of direct database queries.

Caching

Frequently requested recommendations, popular content and other suitable data can be temporarily cached. This reduces database workload and improves response time.

Background Processing

Recommendation generation, analytics and other non-immediate tasks can be processed through queues and background workers rather than making the user wait for every task to finish.

Traffic Management

A CDN, WAF and load balancer can manage incoming traffic before requests reach the application servers. This improves both performance and security.

Planning Calculation

Using the required scalability assumptions:

1,000,000 registered users × 10% peak concurrency = 100,000 concurrent users

If each active user generates 5 requests per minute:

100,000 × 5 = 500,000 requests/minute

500,000 ÷ 60 = 8,333.33 requests/second

Therefore, the 1-million-user architecture must be designed to handle approximately 8,333 requests per second during the assumed peak period.

8. Scaling to 5 Million Users

At 5 million users, the same architecture can be expanded further rather than completely redesigned.

Application Scaling

The API layer can use a larger number of application instances distributed across multiple availability zones. Auto-scaling can increase or decrease the number of instances depending on demand.

Database Scaling

Database read replicas can handle increasing read traffic. If the dataset becomes extremely large, partitioning or sharding can be considered where necessary.

Distributed Caching

A distributed cache can reduce repeated database access across multiple application servers. This becomes increasingly important when a large number of users request similar information simultaneously.

Network Scaling

A global CDN can distribute static content closer to users and reduce the load on the main application infrastructure.

Background Processing

A larger worker cluster can process recommendations, analytics and other background tasks independently from the main API servers.

Security and Reliability

At this scale, WAF protection, authentication, authorization, rate limiting, monitoring and automated backups become increasingly important because a failure or security incident could affect a very large number of users.

Planning Calculation

5,000,000 registered users × 10% peak concurrency = 500,000 concurrent users

Requests per minute:

500,000 × 5 = 2,500,000 requests/minute

Requests per second:

2,500,000 ÷ 60 = 41,666.67 requests/second

Therefore, the 5-million-user architecture should be planned around approximately 41,667 requests per second during the assumed peak period.

9. Overall Scalability Strategy

MOOSIC can scale from a small application to a large digital platform by gradually adding infrastructure capacity rather than replacing the entire system.

The main scalability strategies are:

Horizontal application scaling by adding more API instances.
Load balancing to distribute requests across servers.
Caching to reduce database workload.
Database read replicas to handle increasing read traffic.
Cloud storage for scalable file and backup storage.
CDN for faster delivery of frontend assets.
Message queues and workers for background processing.
Monitoring and logging to identify performance issues.
Automated backups and recovery to protect against data loss.
WAF and security controls to protect the application as the number of users increases.

The proposed architecture therefore allows MOOSIC to grow from its current development-scale implementation to a cloud-based architecture capable of supporting 1 million and eventually 5 million users, subject to appropriate infrastructure sizing and performance testing.
