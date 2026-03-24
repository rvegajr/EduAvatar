# StuPath Avatar — Data Model Specification

| Field | Value |
|---|---|
| **Document** | Data Model Specification |
| **Version** | 1.0 (Draft) |
| **Date** | 2026-03-23 |
| **Status** | Draft |

---

## 1. Overview

This document defines the core data entities, their attributes, and relationships for StuPath Avatar. The data model is designed for PostgreSQL with pgvector for embedding storage.

---

## 2. Entity Relationship Summary

```
Institution 1──* Course 1──* Examination 1──* Question
                   │              │                │
                   │              ├──* ExamMaterial  │
                   │              │                │
                   │              ├──1 Rubric 1──* RubricRow 1──* RubricCell
                   │              │
                   │              ├──1 ExamSettings
                   │              │
                   │              └──* ExamSession 1──* SessionResponse
                   │                      │
                   │                      ├──1 Recording
                   │                      ├──1 Transcript 1──* TranscriptSegment
                   │                      ├──1 AIEvaluation 1──* AIRubricScore
                   │                      ├──1 IntegrityReport
                   │                      └──1 InstructorGrade 1──* InstructorRubricScore
                   │
                   └──* Enrollment
                          │
User 1──* Enrollment      │
  │                       │
  ├──* ExamSession ───────┘
  │
  └──* Accommodation
```

---

## 3. Entity Definitions

### 3.1 Institution

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Unique institution identifier. |
| name | VARCHAR(255) | NOT NULL | Institution display name. |
| lti_issuer | VARCHAR(512) | UNIQUE | LTI 1.3 issuer URL. |
| lti_client_id | VARCHAR(255) | | LTI client ID. |
| lti_deployment_id | VARCHAR(255) | | LTI deployment ID. |
| settings | JSONB | DEFAULT '{}' | Institution-level configuration (data retention, branding). |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.2 User

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| institution_id | UUID | FK → Institution | |
| external_id | VARCHAR(255) | | LTI user ID from the LMS. |
| email | VARCHAR(255) | | |
| first_name | VARCHAR(128) | | |
| last_name | VARCHAR(128) | | |
| role | ENUM('admin','instructor','student') | NOT NULL | Global role. |
| avatar_url | VARCHAR(512) | | Profile picture URL. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique constraint:** (institution_id, external_id)

### 3.3 Course

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| institution_id | UUID | FK → Institution | |
| instructor_id | UUID | FK → User | Course owner. |
| lti_context_id | VARCHAR(255) | | LMS course context ID. |
| title | VARCHAR(200) | NOT NULL | |
| description | TEXT | | |
| is_deleted | BOOLEAN | DEFAULT false | Soft delete flag. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.4 Enrollment

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| course_id | UUID | FK → Course | |
| user_id | UUID | FK → User | |
| role | ENUM('instructor','ta','student') | NOT NULL | Role within this course. |
| lti_roles | JSONB | | Raw LTI roles claim. |
| created_at | TIMESTAMPTZ | NOT NULL | |

**Unique constraint:** (course_id, user_id)

### 3.5 Examination

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| course_id | UUID | FK → Course | |
| title | VARCHAR(200) | NOT NULL | |
| status | ENUM('draft','published','archived') | DEFAULT 'draft' | |
| lti_resource_link_id | VARCHAR(255) | | LTI resource link ID. |
| is_deleted | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.6 ExamSettings

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| examination_id | UUID | FK → Examination, UNIQUE | One settings row per exam. |
| num_starting_questions | INTEGER | NOT NULL, DEFAULT 5 | How many questions AI asks from the bank. |
| max_time_seconds | INTEGER | NULLABLE | NULL = unlimited. Timer starts after ID check + first question delivery, not during setup. |
| retakes_allowed | INTEGER | DEFAULT 0 | 0 = no retakes. |
| end_process | ENUM('hard_stop','complete_round') | DEFAULT 'complete_round' | |
| random_questions | BOOLEAN | DEFAULT false | |
| question_depth | INTEGER | NOT NULL, CHECK (0–10) DEFAULT 5 | Follow-up depth. |
| delay_response_seconds | INTEGER | DEFAULT 10 | Silence threshold before AI begins escalation sequence (prompt → rephrase → advance). |
| id_check_enabled | BOOLEAN | DEFAULT false | |
| browser_lockdown | BOOLEAN | DEFAULT true | |
| allow_breaks | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.7 Question

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| examination_id | UUID | FK → Examination | |
| text | TEXT | NOT NULL | Question content. |
| sort_order | INTEGER | NOT NULL | Position in the bank. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.8 ExamMaterial

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| examination_id | UUID | FK → Examination | |
| file_name | VARCHAR(255) | NOT NULL | Original filename. |
| file_type | ENUM('pdf','docx') | NOT NULL | |
| file_size_bytes | BIGINT | NOT NULL | |
| storage_path | VARCHAR(1024) | NOT NULL | Object storage key. |
| extracted_text | TEXT | | Parsed text content. |
| embedding_status | ENUM('pending','processing','complete','failed') | DEFAULT 'pending' | |
| created_at | TIMESTAMPTZ | NOT NULL | |

### 3.9 MaterialEmbedding

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| exam_material_id | UUID | FK → ExamMaterial | |
| chunk_index | INTEGER | NOT NULL | Chunk sequence number. |
| chunk_text | TEXT | NOT NULL | Text chunk. |
| embedding | VECTOR(1536) | NOT NULL | Vector embedding. |
| created_at | TIMESTAMPTZ | NOT NULL | |

### 3.10 Rubric

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| examination_id | UUID | FK → Examination, UNIQUE | One rubric per exam. |
| title | VARCHAR(200) | | |
| source | ENUM('manual','ai_generated','excel_upload') | NOT NULL | How it was created. |
| column_headers | JSONB | NOT NULL | Array of achievement level labels (max 5). |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.11 RubricRow

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| rubric_id | UUID | FK → Rubric | |
| element_header | VARCHAR(100) | NOT NULL | Row label (word or short phrase). |
| sort_order | INTEGER | NOT NULL | Position (max 12 rows). |
| scoring_mode | ENUM('fixed','range') | DEFAULT 'fixed' | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.12 RubricCell

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| rubric_row_id | UUID | FK → RubricRow | |
| column_index | INTEGER | NOT NULL | 0-based column position. |
| description | TEXT | NOT NULL | How to achieve this level for this element. |
| points_fixed | NUMERIC(6,2) | NULLABLE | Fixed point value (if scoring_mode = 'fixed'). |
| points_min | NUMERIC(6,2) | NULLABLE | Range minimum (if scoring_mode = 'range'). |
| points_max | NUMERIC(6,2) | NULLABLE | Range maximum (if scoring_mode = 'range'). |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.13 Accommodation

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| examination_id | UUID | FK → Examination | |
| user_id | UUID | FK → User (student) | |
| overrides | JSONB | NOT NULL | Key-value overrides matching ExamSettings fields. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique constraint:** (examination_id, user_id)

### 3.14 ExamSession

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| examination_id | UUID | FK → Examination | |
| student_id | UUID | FK → User | |
| attempt_number | INTEGER | NOT NULL, DEFAULT 1 | |
| modality | ENUM('avatar','audio','text') | NOT NULL | |
| status | ENUM('not_started','in_progress','paused','completed','terminated') | DEFAULT 'not_started' | |
| started_at | TIMESTAMPTZ | | When the session was created / student entered lobby. |
| timer_started_at | TIMESTAMPTZ | | When the exam timer actually began (after ID check + first question delivered). Distinct from started_at. |
| ended_at | TIMESTAMPTZ | | |
| show_timer | BOOLEAN | DEFAULT true | Student's preference for countdown timer visibility. |
| recording_consent_at | TIMESTAMPTZ | | Timestamp when student accepted recording consent. |
| effective_settings | JSONB | NOT NULL | Snapshot of settings (with accommodations applied) at session start. |
| id_check_image_path | VARCHAR(1024) | | Object storage key for ID image. |
| face_check_image_path | VARCHAR(1024) | | Object storage key for face image. |
| disconnections | JSONB | DEFAULT '[]' | Array of {disconnected_at, reconnected_at, duration_ms} objects. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique constraint:** (examination_id, student_id, attempt_number)

### 3.15 SessionResponse

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| exam_session_id | UUID | FK → ExamSession | |
| question_id | UUID | FK → Question, NULLABLE | NULL for AI-generated follow-ups. |
| question_text | TEXT | NOT NULL | Actual question asked (may be AI-generated). |
| is_followup | BOOLEAN | DEFAULT false | |
| response_text | TEXT | | Student's transcribed response. |
| response_audio_path | VARCHAR(1024) | | Object storage key for response audio clip. |
| started_at | TIMESTAMPTZ | | When the question was posed. |
| responded_at | TIMESTAMPTZ | | When the student finished responding. |
| sort_order | INTEGER | NOT NULL | Sequence in the session. |
| created_at | TIMESTAMPTZ | NOT NULL | |

### 3.16 Recording

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| exam_session_id | UUID | FK → ExamSession, UNIQUE | |
| storage_path | VARCHAR(1024) | NOT NULL | Object storage key. |
| duration_seconds | INTEGER | | |
| file_size_bytes | BIGINT | | |
| format | VARCHAR(20) | DEFAULT 'webm' | |
| processing_status | ENUM('recording','processing','ready','failed') | DEFAULT 'recording' | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.17 Transcript

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| exam_session_id | UUID | FK → ExamSession, UNIQUE | |
| full_text | TEXT | | Complete AI-generated transcript (immutable after processing). |
| edited_text | TEXT | | Instructor-edited version (NULL until edited). |
| edited_by | UUID | FK → User, NULLABLE | User who last edited the transcript. |
| edited_at | TIMESTAMPTZ | | When the transcript was last edited. |
| processing_status | ENUM('pending','processing','complete','failed') | DEFAULT 'pending' | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.18 TranscriptSegment

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| transcript_id | UUID | FK → Transcript | |
| speaker | ENUM('ai','student') | NOT NULL | |
| text | TEXT | NOT NULL | Segment text. |
| start_time_ms | INTEGER | NOT NULL | Milliseconds from session start. |
| end_time_ms | INTEGER | NOT NULL | |
| confidence | NUMERIC(4,3) | | STT confidence score (0.000–1.000). |
| is_pause | BOOLEAN | DEFAULT false | True if this segment is a pause notation. |
| pause_duration_seconds | NUMERIC(6,2) | | Duration of pause (if is_pause). |
| sort_order | INTEGER | NOT NULL | |
| created_at | TIMESTAMPTZ | NOT NULL | |

### 3.19 AIEvaluation

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| exam_session_id | UUID | FK → ExamSession, UNIQUE | |
| summary | TEXT | | Overall AI summary. |
| processing_status | ENUM('pending','processing','complete','failed') | DEFAULT 'pending' | |
| model_version | VARCHAR(100) | | LLM model identifier used. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.20 AIRubricScore

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| ai_evaluation_id | UUID | FK → AIEvaluation | |
| rubric_row_id | UUID | FK → RubricRow | |
| proposed_points_min | NUMERIC(6,2) | | Lower bound of suggested range. |
| proposed_points_max | NUMERIC(6,2) | | Upper bound of suggested range. |
| notes | TEXT | | AI-generated justification per element. |
| created_at | TIMESTAMPTZ | NOT NULL | |

### 3.21 IntegrityReport

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| exam_session_id | UUID | FK → ExamSession, UNIQUE | |
| pause_analysis | TEXT | | Analysis of pauses and their significance. |
| external_source_analysis | TEXT | | Evidence of potential outside sources. |
| behavioral_flags | JSONB | DEFAULT '[]' | Array of flagged behaviors with descriptions. |
| lockdown_violations | JSONB | DEFAULT '[]' | Array of focus-loss events with timestamps. |
| risk_level | ENUM('low','medium','high') | | Overall integrity risk assessment. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.22 InstructorGrade

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| exam_session_id | UUID | FK → ExamSession, UNIQUE | |
| instructor_id | UUID | FK → User | |
| total_score | NUMERIC(8,2) | | Computed from rubric scores. |
| notes | TEXT | | Instructor's overall comments. |
| status | ENUM('in_progress','finalized','submitted_to_lms') | DEFAULT 'in_progress' | |
| lti_score_submission_id | VARCHAR(255) | | LTI AGS line item + result ID. |
| finalized_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.23 InstructorRubricScore

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| instructor_grade_id | UUID | FK → InstructorGrade | |
| rubric_row_id | UUID | FK → RubricRow | |
| points_awarded | NUMERIC(6,2) | NOT NULL | |
| notes | TEXT | | Instructor's per-element notes. |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

### 3.24 BreakLog

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| exam_session_id | UUID | FK → ExamSession | |
| break_started_at | TIMESTAMPTZ | NOT NULL | |
| break_ended_at | TIMESTAMPTZ | | NULL if still on break. |
| re_verification_image_path | VARCHAR(1024) | | Face image on return. |
| created_at | TIMESTAMPTZ | NOT NULL | |

### 3.25 Notification

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK → User | Recipient (instructor). |
| type | ENUM('exam_completed','evaluation_ready','grade_submitted') | NOT NULL | |
| reference_id | UUID | NOT NULL | ID of the related entity (ExamSession, AIEvaluation, etc.). |
| message | TEXT | NOT NULL | Human-readable notification text. |
| is_read | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMPTZ | NOT NULL | |

---

## 4. Indexes (Key)

| Table | Index | Columns | Purpose |
|---|---|---|---|
| User | idx_user_institution_external | (institution_id, external_id) | LTI user lookup. |
| Course | idx_course_instructor | (instructor_id) | Instructor's course list. |
| Examination | idx_exam_course | (course_id) | Course's exam list. |
| ExamSession | idx_session_exam_student | (examination_id, student_id) | Student's attempts. |
| TranscriptSegment | idx_segment_transcript_order | (transcript_id, sort_order) | Ordered transcript retrieval. |
| MaterialEmbedding | idx_embedding_vector | (embedding) using ivfflat | Vector similarity search. |

---

## 5. Data Retention

| Data Category | Default Retention | Notes |
|---|---|---|
| Exam recordings | 1 year after course end | Configurable per institution. |
| ID verification images | 90 days after exam | Minimized for privacy. |
| Transcripts & grades | Indefinite (academic record) | Subject to institution policy. |
| Soft-deleted courses/exams | 90 days | Permanently purged after. |
