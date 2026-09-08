---
name: Frontend-only auth
description: The current MOOSIC prototype’s auth boundary and the intended migration point for backend wiring.
---

MOOSIC currently treats login, signup, and sign-out as frontend-only interactions: a demo user is stored in localStorage and cleared on sign-out.

**Why:** The product is being reviewed as a visual prototype first; backend persistence and real authentication are intentionally deferred.

**How to apply:** When backend auth is introduced, keep the existing AuthPage and AuthGate UI contract, replace the localStorage persistence boundary with the real session client, and preserve sign-out clearing both app state and the server session.