# StuPath Avatar — API & Integration Specification

| Field | Value |
|---|---|
| **Document** | API & Integration Specification |
| **Version** | 1.0 (Draft) |
| **Date** | 2026-03-23 |
| **Status** | Draft |

---

## 1. Overview

This document specifies the REST API endpoints for StuPath Avatar and the LTI 1.3 integration protocol. All APIs follow RESTful conventions, use JSON request/response bodies, and are versioned under `/api/v1`.

---

## 2. Authentication & Authorization

### 2.1 Authentication Methods

| Method | Use Case |
|---|---|
| **LTI 1.3 Launch** | Primary authentication for LMS-connected users. JWT issued after OIDC validation. |
| **JWT Bearer Token** | Used for all API calls after initial authentication. Access token (15 min) + refresh token (7 days). |

### 2.2 Authorization Model

| Role | Permissions |
|---|---|
| **admin** | Full access to institution settings, user management, all courses. |
| **instructor** | CRUD on own courses, exams, rubrics; grade student submissions. |
| **student** | Read own enrollments; take exams; view own published results. |

### 2.3 Common Headers

```
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>
```

---

## 3. API Endpoints

### 3.1 Courses

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/courses` | Create a new course. | instructor |
| GET | `/api/v1/courses` | List courses for the authenticated user. | instructor |
| GET | `/api/v1/courses/:courseId` | Get course details. | instructor |
| PUT | `/api/v1/courses/:courseId` | Update course title/description. | instructor (owner) |
| DELETE | `/api/v1/courses/:courseId` | Soft-delete a course. | instructor (owner) |
| POST | `/api/v1/courses/:courseId/duplicate` | Duplicate a course with all exams. | instructor (owner) |

#### POST `/api/v1/courses` — Request

```json
{
  "title": "Introduction to Psychology — Spring 2027",
  "description": "Oral examination course for PSY 101."
}
```

#### POST `/api/v1/courses` — Response (201)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Introduction to Psychology — Spring 2027",
  "description": "Oral examination course for PSY 101.",
  "instructor_id": "...",
  "created_at": "2026-03-23T10:00:00Z",
  "updated_at": "2026-03-23T10:00:00Z"
}
```

---

### 3.2 Examinations

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/courses/:courseId/exams` | Create a new exam. | instructor |
| GET | `/api/v1/courses/:courseId/exams` | List exams in a course. | instructor |
| GET | `/api/v1/exams/:examId` | Get exam details with settings. | instructor |
| PUT | `/api/v1/exams/:examId` | Update exam metadata. | instructor |
| DELETE | `/api/v1/exams/:examId` | Soft-delete an exam. | instructor |
| POST | `/api/v1/exams/:examId/duplicate` | Duplicate an exam. | instructor |
| PUT | `/api/v1/exams/:examId/publish` | Publish the exam (make available to students). | instructor |

---

### 3.3 Exam Settings

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/exams/:examId/settings` | Get current exam settings. | instructor |
| PUT | `/api/v1/exams/:examId/settings` | Update exam settings. | instructor |

#### PUT `/api/v1/exams/:examId/settings` — Request

```json
{
  "num_starting_questions": 5,
  "max_time_seconds": 1800,
  "retakes_allowed": 1,
  "end_process": "complete_round",
  "random_questions": true,
  "question_depth": 7,
  "delay_response_seconds": 8,
  "id_check_enabled": true,
  "browser_lockdown": true,
  "allow_breaks": false
}
```

> **Note:** `show_time_to_student` was removed from exam settings. Timer visibility is a **student preference** set at session level, not an instructor setting. See the session endpoints.

---

### 3.4 Questions

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/exams/:examId/questions` | Add a question to the bank. | instructor |
| GET | `/api/v1/exams/:examId/questions` | List all questions (ordered). | instructor |
| PUT | `/api/v1/questions/:questionId` | Update question text. | instructor |
| DELETE | `/api/v1/questions/:questionId` | Remove a question. | instructor |
| PUT | `/api/v1/exams/:examId/questions/reorder` | Reorder questions. | instructor |

#### PUT `/api/v1/exams/:examId/questions/reorder` — Request

```json
{
  "question_ids": [
    "id-3", "id-1", "id-2", "id-5", "id-4"
  ]
}
```

---

### 3.5 Exam Materials

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/exams/:examId/materials` | Upload a course material (multipart). | instructor |
| GET | `/api/v1/exams/:examId/materials` | List uploaded materials. | instructor |
| GET | `/api/v1/materials/:materialId/download` | Download a material file. | instructor |
| DELETE | `/api/v1/materials/:materialId` | Remove a material. | instructor |

---

### 3.6 Rubrics

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/exams/:examId/rubric` | Create or replace rubric. | instructor |
| GET | `/api/v1/exams/:examId/rubric` | Get the exam's rubric. | instructor |
| PUT | `/api/v1/rubrics/:rubricId` | Update rubric structure. | instructor |
| POST | `/api/v1/exams/:examId/rubric/generate` | Generate rubric with AI. | instructor |
| POST | `/api/v1/exams/:examId/rubric/upload` | Upload rubric from Excel (multipart). | instructor |

#### POST `/api/v1/exams/:examId/rubric` — Request

```json
{
  "title": "PSY 101 Oral Exam Rubric",
  "source": "manual",
  "column_headers": ["Excellent", "Good", "Satisfactory", "Needs Improvement", "Unsatisfactory"],
  "rows": [
    {
      "element_header": "Conceptual Understanding",
      "scoring_mode": "fixed",
      "cells": [
        { "column_index": 0, "description": "Demonstrates comprehensive, nuanced understanding...", "points_fixed": 20 },
        { "column_index": 1, "description": "Shows solid understanding with minor gaps...", "points_fixed": 15 },
        { "column_index": 2, "description": "Demonstrates basic understanding...", "points_fixed": 10 },
        { "column_index": 3, "description": "Shows partial understanding with significant gaps...", "points_fixed": 5 },
        { "column_index": 4, "description": "Little to no understanding demonstrated...", "points_fixed": 0 }
      ]
    }
  ]
}
```

---

### 3.7 Student Accommodations

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/exams/:examId/accommodations` | Create accommodation for a student. | instructor |
| GET | `/api/v1/exams/:examId/accommodations` | List all accommodations for an exam. | instructor |
| PUT | `/api/v1/accommodations/:accommodationId` | Update accommodation overrides. | instructor |
| DELETE | `/api/v1/accommodations/:accommodationId` | Remove accommodation. | instructor |

---

### 3.8 Exam Sessions (Student)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/exams/:examId/sessions` | Start a new exam session. | student |
| GET | `/api/v1/sessions/:sessionId` | Get session status and metadata. | student, instructor |
| POST | `/api/v1/sessions/:sessionId/consent` | Record student's recording consent. | student |
| POST | `/api/v1/sessions/:sessionId/id-check` | Submit ID and face images (multipart). | student |
| PUT | `/api/v1/sessions/:sessionId/timer-visibility` | Toggle countdown timer visibility (student preference). | student |
| POST | `/api/v1/sessions/:sessionId/break` | Request a break. | student |
| POST | `/api/v1/sessions/:sessionId/resume` | Resume from break with re-verification (multipart). | student |
| POST | `/api/v1/sessions/:sessionId/end` | End the session early. | student |

### 3.9 Exam Sessions (Real-Time — WebSocket)

| Event (Client → Server) | Payload | Description |
|---|---|---|
| `session:join` | `{ sessionId }` | Student joins the exam session room. |
| `session:reconnect` | `{ sessionId, lastEventId }` | Student reconnects after a drop; server replays missed events. |
| `audio:chunk` | Binary audio data | Student audio stream chunk. |
| `response:text` | `{ text }` | Student text response (text modality). |
| `break:request` | `{}` | Student requests a break. |
| `break:confirm` | `{ confirmed: boolean }` | Student confirms or cancels break after AI asks. |
| `timer:toggle` | `{ visible: boolean }` | Student toggles countdown timer visibility. |
| `lockdown:violation` | `{ type, timestamp }` | Client reports a lockdown event. |

| Event (Server → Client) | Payload | Description |
|---|---|---|
| `question:ask` | `{ questionText, audioUrl?, isFollowup }` | AI asks a question. |
| `timer:start` | `{ maxTimeSeconds, startedAt }` | Emitted when the timer officially begins (after first question delivery). |
| `time:reminder` | `{ remainingSeconds, message }` | Time remaining notification (delivered regardless of timer visibility). |
| `silence:escalate` | `{ level, message, audioUrl? }` | AI escalation after silence: level 1 = prompt, 2 = rephrase, 3 = advance. |
| `break:ask_confirm` | `{ message }` | AI asks student to confirm break request. |
| `break:approved` | `{ message }` | Break confirmed; timer paused. |
| `break:denied` | `{ message }` | Break denied; AI advances with deeper/new question. |
| `session:end` | `{ reason }` | Exam ended (time, completion, or termination). |
| `avatar:viseme` | `{ visemeData }` | Lip-sync data for avatar rendering. |

---

### 3.10 Grading

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/exams/:examId/submissions` | List all student submissions for an exam. | instructor |
| GET | `/api/v1/sessions/:sessionId/transcript` | Get the transcript. | instructor |
| GET | `/api/v1/sessions/:sessionId/ai-evaluation` | Get the AI evaluation and rubric scores. | instructor |
| GET | `/api/v1/sessions/:sessionId/integrity-report` | Get the integrity report. | instructor |
| GET | `/api/v1/sessions/:sessionId/recording` | Get recording playback URL (signed, expiring). | instructor |
| POST | `/api/v1/sessions/:sessionId/grade` | Save instructor grade (creates or updates). | instructor |
| PUT | `/api/v1/grades/:gradeId` | Update instructor grade. | instructor |
| POST | `/api/v1/grades/:gradeId/finalize` | Finalize and submit grade to LMS. | instructor |
| PUT | `/api/v1/sessions/:sessionId/transcript` | Edit transcript text (instructor correction). | instructor |
| POST | `/api/v1/grades/:gradeId/publish` | Publish results to the student. | instructor |

### 3.11 Student Results

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/sessions/:sessionId/results` | Get published grade, rubric feedback, and transcript (student view). | student |

### 3.12 Notifications

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/notifications` | List notifications for the authenticated user. | instructor |
| PUT | `/api/v1/notifications/:notificationId/read` | Mark a notification as read. | instructor |

---

#### POST `/api/v1/sessions/:sessionId/grade` — Request

```json
{
  "notes": "Strong understanding of core concepts. Struggled with application questions.",
  "rubric_scores": [
    { "rubric_row_id": "...", "points_awarded": 18.0, "notes": "Excellent conceptual grasp." },
    { "rubric_row_id": "...", "points_awarded": 12.0, "notes": "Could not apply theory to case study." }
  ]
}
```

---

## 4. LTI 1.3 Integration Protocol

### 4.1 Registration

StuPath Avatar acts as an **LTI Tool** (provider). The LMS acts as the **Platform** (consumer). Target platforms: **Blackboard**, **Canvas**, **Moodle**, and **Brightspace D2L**.

| Parameter | Value |
|---|---|
| OIDC Login Initiation URL | `https://app.stupath.com/lti/login` |
| Launch URL (redirect) | `https://app.stupath.com/lti/launch` |
| Deep Linking Return URL | `https://app.stupath.com/lti/deeplink/return` |
| JWKS URL | `https://app.stupath.com/.well-known/jwks.json` |

### 4.2 Launch Flow

```
1. Student/Instructor clicks link in LMS
2. LMS sends OIDC login initiation → StuPath /lti/login
3. StuPath returns auth request → LMS authorization endpoint
4. LMS sends id_token (JWT) → StuPath /lti/launch
5. StuPath validates JWT (signature, nonce, claims)
6. StuPath creates/updates User + Enrollment records
7. StuPath redirects to appropriate view:
   - Instructor → Exam configuration
   - Student → Exam interface
```

### 4.3 Deep Linking (Instructor)

```
1. Instructor creates assignment in LMS → triggers deep link request
2. LMS sends deep link launch → StuPath /lti/launch (with deep linking claim)
3. StuPath shows exam picker UI
4. Instructor selects or creates exam
5. StuPath returns deep link response with content item (resource link)
6. LMS saves the link as the assignment
```

### 4.4 Grade Passback (AGS)

```
1. Instructor finalizes grade in StuPath
2. StuPath obtains OAuth 2.0 access token from LMS (client_credentials grant)
3. StuPath creates/updates score via AGS line item endpoint:
   POST {lineitem_url}/scores
   {
     "userId": "<lti_user_id>",
     "scoreGiven": 85.0,
     "scoreMaximum": 100.0,
     "activityProgress": "Completed",
     "gradingProgress": "FullyGraded",
     "timestamp": "2026-03-23T15:30:00Z"
   }
4. LMS updates gradebook
```

### 4.5 Names and Role Provisioning (NRPS)

```
1. StuPath requests roster from LMS:
   GET {context_memberships_url}
   Authorization: Bearer <token>
2. LMS returns members with roles
3. StuPath syncs Enrollment records
4. Used for: accommodation dropdown, submission lists
```

---

## 5. Error Handling

### 5.1 Standard Error Response

```json
{
  "error": {
    "code": "EXAM_NOT_FOUND",
    "message": "The requested examination does not exist.",
    "details": {},
    "request_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 5.2 HTTP Status Codes

| Code | Usage |
|---|---|
| 200 | Success (GET, PUT). |
| 201 | Created (POST). |
| 204 | No content (DELETE). |
| 400 | Validation error. |
| 401 | Authentication required or token expired. |
| 403 | Insufficient permissions. |
| 404 | Resource not found. |
| 409 | Conflict (e.g., duplicate exam session). |
| 422 | Unprocessable entity (business logic error). |
| 429 | Rate limit exceeded. |
| 500 | Internal server error. |

---

## 6. Rate Limiting

| Endpoint Category | Rate Limit |
|---|---|
| Authentication | 10 req/min per IP. |
| API (authenticated) | 300 req/min per user. |
| File uploads | 10 req/min per user. |
| AI generation (rubric) | 5 req/min per user. |
| WebSocket messages | 60 msg/min per session. |

---

## 7. Versioning Strategy

- API is versioned in the URL path (`/api/v1/`, `/api/v2/`).
- Breaking changes trigger a major version increment.
- Deprecated endpoints return `Sunset` header with removal date.
- Minimum 6-month deprecation window.
