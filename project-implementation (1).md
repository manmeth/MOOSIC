# Moosic — CIA III Project Implementation Work Log

**Project:** Moosic — a Spotify-inspired music platform with custom mood-based themes, AI-generated playlist naming (Moo Bot), and a Recycle Bin for playlists.

## 1. Team Responsibilities

| Member | Primary responsibilities |
|---|---|
| Erin | Firewall / network security; security mechanisms; failure & recovery (application/server and network); security testing/evidence; shared integration, testing and documentation work |
| Manmeet | Backend/database; database schema and diagram; database relationships/queries; playlist & Recycle Bin CRUD; business transactions; mood-based playlist ranking algorithm; API–database integration; query/transaction optimisation; shared integration, testing and documentation work |
| Siya | Component 11 backend; Moo Bot AI-generated playlist-name service; playlist naming API integration/validation; API error handling/logging; Component 14 technical improvement; individual technical evidence; shared integration, testing and documentation work |
| Srinidhi | Authentication; frontend–backend integration; encryption/data protection; authorization/security controls; failure & recovery (storage/security); Component 14 encryption/auth enhancement; integration testing/bug fixing; quantitative scalability calculations; shared integration, testing and documentation work |
| Udditee | Architecture/component map; draw.io architecture and data flow; frontend; mood-based themes; playlist/dashboard UI; Recycle Bin frontend UX; Component 14 responsive theme/UI enhancement; shared integration, testing and documentation work |

## 2. Status Definitions

| Status | Meaning |
|---|---|
| Pending | Task identified but development has not started. |
| In Progress | Development has started but the task is not complete. |
| Completed | Implementation is complete and has been verified. |
| Blocked | Development cannot proceed because of a documented technical dependency or problem. |
| Reopened | A previously completed task has been found to contain a problem and requires additional work. |

## 3. Implementation Plan

The implementation plan below is taken from the team's Excel tracker and covers the development period from **2 September to 18 September 2026**. The plan is organised as clear missions so the team can move from setup and design through backend/frontend work, security, custom features, integration, testing, scalability and documentation.

| Mission | Start | End | Days | Primary Owners | Key Output / Definition of Done | Dependencies | Status | GitHub / Evidence |
|---|---|---|---:|---|---|---|---|---|
| **M01 — Setup + Traceability** | 2 Sep | 2 Sep | 1 | Everyone | GitHub structure ready; `docs/` folder present; `project-implementation.md` and team tracker started. | None | Pending | Repo link / initial commit |
| **M02 — Architecture + Data Design** | 2 Sep | 4 Sep | 3 | Udditee + Manmeet | Architecture map, draw.io, data flow and ER/database design agreed. | M01 | Pending | Diagram / database evidence |
| **M03 — Backend Foundation** | 3 Sep | 6 Sep | 4 | Manmeet + Siya | Core backend/API, Component 11 backend and database connectivity are runnable. | M02 | Pending | Commits + API/database tests |
| **M04 — Frontend Foundation** | 3 Sep | 6 Sep | 4 | Udditee | Core UI, navigation, dashboard and playlist views are working. | M02 | Pending | Screenshots + commit |
| **M05 — Authentication + Security Base** | 5 Sep | 8 Sep | 4 | Srinidhi + Erin | Authentication, authorization, encryption and firewall/network controls attached to the design. | M03 + M04 | Pending | Security configuration/tests |
| **M06 — Custom Features Sprint** | 7 Sep | 11 Sep | 5 | Udditee + Siya + Manmeet | Mood themes, Moo Bot playlist names, Recycle Bin, transactions and ranking algorithm work end-to-end. | M03 + M04 + M05 | Pending | Feature demos + commits |
| **M07 — Full Integration** | 10 Sep | 13 Sep | 4 | Everyone | Interface → application logic → data → output works for the main workflow. | M06 | Pending | Working demo + API/DB evidence |
| **M08 — Failure + Recovery Drill** | 12 Sep | 14 Sep | 3 | Erin + Manmeet + Srinidhi | Application/server, database, network, storage and security failures documented with detection/recovery actions. | M07 | Pending | Test results + recovery notes |
| **M09 — Scalability + Quantitative Analysis** | 14 Sep | 16 Sep | 3 | Srinidhi + Udditee | 1M/5M scaling architecture plus required calculations and interpretations completed. | M07 | Pending | Calculations + architecture |
| **M10 — Documentation + Worklog Audit** | 15 Sep | 17 Sep | 3 | Everyone | `architecture.md` and `project-implementation.md` current; significant tasks have status and evidence. | All build work | Pending | `docs/` commits |
| **M11 — Final Testing + Viva Prep** | 16 Sep | 17 Sep | 2 | Everyone | Working demo rehearsed; each student can locate and explain their implementation. | M08 | Pending | Demo checklist + evidence |
| **M12 — Report + Final Freeze** | 17 Sep | 18 Sep | 2 | Everyone | Final report assembled; required technical sections checked; regression check complete. | M10 + M11 | Pending | Final repo state + report |

## 4. Official Work Log

| Task ID | Task | Component | Assigned To | Status | Completed By | Date Completed | AI Assistance | GitHub? | Evidence / Commit / File | Notes / Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|---|---|
| T001 | Architecture & Component Map | Architecture | Udditee | Pending | — | — | No | No | — | Define business problem, target users, major components and technology mapping. |
| T002 | Current System Architecture Diagram | Architecture | Udditee | Pending | — | — | No | No | — | Create the draw.io architecture diagram. |
| T003 | Data Flow Diagram | Architecture | Udditee | Pending | — | — | No | No | — | Map Interface → Application Logic → Data Layer → Business Output. |
| T004 | Frontend Base Structure & Navigation | Frontend | Udditee | Pending | — | — | No | No | — | Build core user interface structure and navigation. |
| T005 | Mood-Based Theme System | Frontend / Feature | Udditee | Pending | — | — | No | No | — | Implement theme changes based on user mood/listening context. |
| T006 | Playlist & Dashboard UI | Frontend | Udditee | Pending | — | — | No | No | — | Build playlist, dashboard, status and interaction views. |
| T007 | Recycle Bin Frontend UX | Frontend / Feature | Udditee | Pending | — | — | No | No | — | Add deleted-playlist view, restore/delete actions and clear status feedback. |
| T008 | Component 14: Responsive Theme/UI Enhancement | Component 14 | Udditee | Pending | — | — | No | No | — | Individual technical enhancement to the theme/UI component; verify independently. |
| T009 | Database Schema — 6+ Core Entities | Database | Manmeet | Pending | — | — | No | No | — | Create persistent schema with identifiers, attributes and required relationships. |
| T010 | ER / Database Diagram | Database | Manmeet | Pending | — | — | No | No | — | Create ER/database diagram and keep it aligned with implementation. |
| T011 | Database Relationships & Queries | Database | Manmeet | Pending | — | — | No | No | — | Implement meaningful relationships and queries for users, playlists, tracks, moods and related entities. |
| T012 | Playlist & Recycle Bin CRUD | Database / Feature | Manmeet | Pending | — | — | No | No | — | Implement create/read/update/delete and soft-delete/restore data handling where applicable. |
| T013 | Core Backend/API Layer | Backend | Manmeet | Pending | — | — | No | No | — | Build core API/services supporting the application's business workflow. |
| T014 | Business Transactions | Business Logic | Manmeet | Pending | — | — | No | No | — | Implement meaningful playlist/user/business transaction flow and state handling. |
| T015 | Mood-Based Playlist Ranking Algorithm | Business Algorithm | Manmeet | Pending | — | — | No | No | — | Implement non-trivial ranking/recommendation logic using mood and listening context; document inputs, processing and outputs. |
| T016 | API ↔ Database Integration | Integration | Manmeet | Pending | — | — | No | No | — | Connect backend APIs to persistent storage and verify end-to-end data operations. |
| T017 | Component 14: Database Query/Transaction Optimisation | Component 14 | Manmeet | Pending | — | — | No | No | — | Individual technical improvement to query efficiency or transaction validation; verify independently. |
| T018 | Authentication / Identification | Authentication | Srinidhi | Pending | — | — | No | No | — | Implement user authentication/identification flow. |
| T019 | Core Frontend ↔ Backend Integration | Implementation / Integration | Srinidhi | Pending | — | — | No | No | — | Join core frontend flows to backend APIs and ensure data is exchanged correctly. |
| T020 | Encryption & Data Protection | Security | Srinidhi | Pending | — | — | No | No | — | Implement appropriate encryption/data protection for sensitive information and document the mechanism. |
| T021 | Authorization & Security Controls Integration | Security | Srinidhi | Pending | — | — | No | No | — | Integrate authentication, authorization and protected operations. |
| T022 | Failure & Recovery — Storage/Security | Failure & Recovery | Srinidhi | Pending | — | — | No | No | — | Document and test recovery for security or storage-related failure scenarios. |
| T023 | Component 14: Encryption/Auth Technical Enhancement | Component 14 | Srinidhi | Pending | — | — | No | No | — | Individual technical contribution improving encryption/authentication, with test evidence. |
| T024 | End-to-End Integration Testing & Bug Fixing | Testing / Integration | Srinidhi | Pending | — | — | No | No | — | Run integration tests, fix technical defects and verify system workflow. |
| T025 | Quantitative Scalability Calculations | Scalability | Srinidhi | Pending | — | — | No | No | — | Complete required user-growth, peak-concurrency and request-rate calculations with formula, values, result and interpretation. |
| T026 | Firewall / Network Security | Security | Erin | Pending | — | — | No | No | — | Design/attach firewall or network controls appropriate to the system architecture. |
| T027 | Security Mechanisms — 8+ Controls | Security Documentation | Erin | Pending | — | — | No | No | — | Document at least eight security mechanisms across authentication, authorization, data, network, database, backup, monitoring and password protection. |
| T028 | Failure & Recovery — Application/Server | Failure & Recovery | Erin | Pending | — | — | No | No | — | Document impact, detection and recovery for application/server failure. |
| T029 | Failure & Recovery — Network | Failure & Recovery | Erin | Pending | — | — | No | No | — | Document impact, detection and recovery for network failure. |
| T030 | Component 14: Security / Network Test | Component 14 | Erin | Pending | — | — | No | No | — | Individual test of firewall/network/security behaviour and evidence collection. |
| T031 | Security Verification & Evidence Collection | Security / Evidence | Erin | Pending | — | — | No | No | — | Collect screenshots, test results, configuration evidence and link to GitHub/files. |
| T032 | Component 11 — Backend Module | Backend / Component 11 | Siya | Pending | — | — | No | No | — | Implement the assigned backend portion for Component 11 with traceable code changes. |
| T033 | Moo Bot — AI-Generated Playlist Name Service | Backend / Feature | Siya | Pending | — | — | No | No | — | Implement playlist-name generation service/logic for the custom Moo Bot feature. |
| T034 | Playlist Naming API Integration & Validation | Backend / Feature | Siya | Pending | — | — | No | No | — | Connect Moo Bot naming service to playlist creation flow and validate generated names. |
| T035 | API Error Handling & Logging | Backend | Siya | Pending | — | — | No | No | — | Add meaningful API validation, error handling and logging for fault diagnosis. |
| T036 | Component 14: Moo Bot Technical Improvement | Component 14 | Siya | Pending | — | — | No | No | — | Individual technical improvement to AI-generated playlist naming; test and record evidence. |
| T037 | Individual Technical Test & Demo Evidence | Testing / Evidence | Siya | Pending | — | — | No | No | — | Prepare proof of personal implementation: commit, file/module, test result or working demonstration. |
| T038 | Cross-Member End-to-End Integration | Integration | Everyone | Pending | — | — | No | No | — | Verify Interface → Application Logic → Data Layer → Business Output across the main workflow. |
| T039 | System Testing + Failure Scenarios + Recovery Demo | Testing / Reliability | Everyone | Pending | — | — | No | No | — | Test core workflows, five failure categories and recovery behaviour; record evidence. |
| T040 | `docs/project-implementation.md` Evidence Audit | Documentation / Work Log | Everyone | Pending | — | — | No | No | — | Check that significant tasks have correct task ID, component, owner, status, completion details, AI assistance and evidence. |

## 5. GitHub Documentation Expectations

- `docs/project-implementation.md` is the project's implementation work log and contribution record.
- The team spreadsheet is the convenient visual tracker/dashboard. The GitHub Markdown file records the same significant work in repository form.
- For completed work, record evidence such as a GitHub commit, pull request/issue, changed file/module, screenshot, test result, API response, database result, or working demonstration.
- The student responsible for a task must verify the implementation and must be able to explain the contribution during evaluation.
- AI tools may assist with implementation, but the student who reviews, integrates, tests and verifies the work must be recorded as `Completed By`.

## 6. Moosic Feature Traceability

| Moosic feature / requirement | Main task(s) | Primary owner(s) |
|---|---|---|
| Mood-based themes | T005, T008 | Udditee |
| Moo Bot — AI-generated playlist names | T033, T034, T036 | Siya |
| Recycle Bin for playlists | T007, T012 | Udditee + Manmeet |
| Backend/API | T013, T016, T032, T035 | Manmeet + Siya |
| Database | T009–T012, T017 | Manmeet |
| Authentication, encryption and authorization | T018, T020, T021, T023 | Srinidhi |
| Firewall/network security | T026, T029, T030 | Erin |
| Business transactions and ranking algorithm | T014, T015 | Manmeet |
| Failure and recovery | T028, T029, T022, T039 | Erin + Manmeet + Srinidhi + Everyone |
| Architecture and data flow | T001–T003 | Udditee |
| End-to-end integration | T019, T024, T038 | Srinidhi + Everyone |
| Scalability / quantitative analysis | T025 | Srinidhi |

## 7. Individual Evidence Checklist

Every member should maintain evidence for their own contributions, especially for Component 14 and any algorithm, security, integration or technical improvement task.

| Member | Minimum evidence to maintain |
|---|---|
| Erin | Firewall/network configuration or diagram, security-control documentation, failure/recovery tests, screenshots/commits |
| Manmeet | Schema/ER diagram, database scripts/queries, backend/API commits, transaction/algorithm implementation and tests |
| Siya | Component 11 code, Moo Bot service/API, validation/error handling, Component 14 evidence and demo/test result |
| Srinidhi | Authentication/encryption/authorization implementation, integration tests, scalability calculations, Component 14 evidence |
| Udditee | Architecture/data-flow diagrams, frontend commits, theme and Recycle Bin UI, Component 14 evidence and screenshots |

## 8. Update Rule

When a task moves from `Pending` to `In Progress`, `Completed`, `Blocked`, or `Reopened`, update the task entry with the latest status and, where applicable, completion date, completed-by name, AI assistance and GitHub/evidence details.
