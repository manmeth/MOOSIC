# Moosic — Business Algorithm / Non-Trivial Processing Documentation

## 1. Overview

Moosic's current implementation includes three main product features that differentiate the system:

1. Moo Bot — AI-assisted playlist name generation.
2. Dynamic mood-based colour themes.
3. Recycle Bin — playlist recovery and deletion management.

---

## 2. Current Business Problem

Creating a playlist is useful, but users may spend time deciding what to name it. Moosic addresses this small but meaningful user-experience problem through **Moo Bot**, which generates playlist-name suggestions based on the information supplied to the naming service.

The goal is to reduce manual effort while keeping the generated name relevant to the playlist context.

This is different from the future recommendation system. Moosic does **not** currently claim that it automatically predicts a user's future music preferences from large-scale behavioural data.

---

## 3. Moo Bot Processing

### 3.1 Inputs

The current Moo Bot feature takes information required to generate a playlist name. Depending on the implementation/request, this can include the playlist or mood context supplied by the application.

The input is passed from the application to the AI-assisted naming service.

### 3.2 Processing

The processing flow is:

```text
User creates / requests a playlist name
              ↓
Application collects naming context
              ↓
Validate naming request
              ↓
Send request to Moo Bot / AI naming service
              ↓
Generate playlist-name response
              ↓
Validate / handle response
              ↓
Return generated name to application
              ↓
Use name in playlist workflow
```

### 3.3 Output

The output is a generated playlist name that can be used by the user for the playlist.

Example:

```text
Input:
Mood/context = Happy evening

Output:
A suitable generated playlist name
```

The exact generated wording can vary because the naming service is AI-assisted.

---

## 4. Pseudocode

```text
INPUT: playlist/mood naming context

IF naming context is invalid or missing:
    return validation error

SEND valid context to Moo Bot / AI naming service

RECEIVE naming response

IF service returns an invalid or unusable response:
    handle error and return controlled failure

OTHERWISE:
    extract generated playlist name
    validate response
    return playlist name

END
```

This is a transformation and validation workflow: the application converts user-provided playlist context into a usable playlist name through an external AI-assisted service and handles invalid responses or service failures.

---

## 5. Example

### Example Input

```text
Playlist context:
Happy mood
Evening listening
```

### Processing

```text
Happy mood + evening context
        ↓
Moo Bot naming request
        ↓
AI-assisted name generation
        ↓
Response validation
```

### Example Output

```text
"Golden Hour Grooves"
```

The generated name is an example; the actual output can vary for the same context because it is produced by the AI-assisted naming service.

---

## 6. Validation and Error Handling

Moo Bot is not treated as a simple display component. The integration includes validation and API error handling.

The application must:

1. Validate the naming request before sending it.
2. Send the request through the naming-service integration.
3. Check the returned response.
4. Handle invalid responses or API failures.
5. Return a controlled result to the playlist workflow.

This makes the feature a meaningful processing mechanism rather than a static name stored in the interface.

---

## 7. Technical Implementation

The Moo Bot implementation is part of the project's backend/API and frontend integration.

The project implementation tracker identifies the following related tasks:

```text
T033 — Moo Bot / AI playlist-name service
T034 — Moo Bot naming API validation
T036 — Moo Bot technical improvement
```

The tracker identifies **Siya** as the primary owner of the Moo Bot functionality.

The final project documentation should link these tasks to the exact GitHub commit/file containing the implementation.

---

## 8. Relationship to the Other Two Main Moosic Features

### Dynamic Mood-Based Colour Themes

The application changes its visual theme according to the selected mood. This creates a personalised visual listening experience.

Conceptually:

```text
Selected mood
      ↓
Mood lookup
      ↓
Corresponding visual theme
      ↓
Application background / interface theme
```

This is a meaningful product feature, but by itself a colour change is **not** the project's strongest business algorithm because the CIA rubric explicitly states that a colour change alone does not automatically qualify as an algorithm.

### Recycle Bin

The Recycle Bin allows users to manage deleted playlists and recover them where applicable.

Conceptually:

```text
Delete playlist
      ↓
Mark as deleted
      ↓
Exclude from normal playlist list
      ↓
Display in Recycle Bin
      ↓
Restore or permanently delete
```

This is important system functionality and demonstrates state handling/recovery, but basic CRUD or deletion/recovery alone is not the strongest candidate for the 3-mark algorithm requirement.

---

## 9. Future Personalisation and Recommendation at Larger Scale

The project also documents a **future scalability enhancement** in which Moosic could provide deeper personalisation as its user base grows.

This should be described as a proposed enhancement, not as the current implementation.

At larger scale, Moosic could use:

- recent listening history;
- favourite/liked songs;
- genres;
- artists;
- languages;
- recent mood patterns;

to create more personalised recommendations and curated playlists.

A future flow could be:

```text
User listening history
        ↓
Recent preference / mood analysis
        ↓
Recommendation and ranking logic
        ↓
Curated playlist
        ↓
Moo Bot generates playlist name
```

This future architecture would require additional scalable data processing, recommendation services, caching, indexed queries and potentially background processing as the number of users increases.

The quantitative scalability document contains this future scalability discussion. It should not be presented as an existing large-scale recommendation engine in the current system.

---

## 10. Why Moo Bot Supports the Non-Trivial Processing Requirement

The current Moo Bot feature contains a sequence of processing steps:

```text
Input context
   ↓
Validation
   ↓
External AI-assisted transformation
   ↓
Response handling
   ↓
Output validation
   ↓
Usable playlist name
```

The feature therefore involves input handling, transformation, validation, external-service integration and controlled output.

This is a stronger fit for the CIA III non-trivial processing requirement than simply documenting the Recycle Bin or colour-theme feature as an algorithm.

---

## 11. Evidence for Verification

Recommended evidence for this requirement includes:

- Moo Bot working in the application.
- Screenshot of the generated playlist name.
- API/service request and response.
- Validation/error-handling test.
- GitHub commit containing the Moo Bot implementation.
- Exact file/module and function used by the feature.
- Implementation tracker entries T033, T034 and T036.

The rubric requires completed technical work to be supported by evidence such as a GitHub commit, changed file/module, screenshot, test result, API response, database result or working demonstration.

---

## 12. Summary

The current Moosic product is centred on three main features:

```text
Moo Bot
Dynamic Mood-Based Colour Themes
Recycle Bin
```
