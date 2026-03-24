# StuPath Avatar — Functional Requirements Specification

| Field | Value |
|---|---|
| **Document** | Functional Requirements Specification |
| **Version** | 1.0 (Draft) |
| **Date** | 2026-03-23 |
| **Status** | Draft |

---

## 1. Introduction

This document enumerates the functional requirements for StuPath Avatar organized by domain module. Each requirement is assigned a unique ID, priority (P0 = must-have for launch, P1 = should-have, P2 = nice-to-have), and acceptance criteria.

---

## 2. Course Management

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| CM-001 | Instructor can create a new course with a title and optional description. | P0 | Course appears in the instructor's course list after creation. |
| CM-002 | Instructor can duplicate an existing course, including all associated examinations and settings. | P1 | Duplicated course contains identical examinations with "(Copy)" appended to the title. |
| CM-003 | Instructor can delete a course. | P0 | System prompts for confirmation; upon confirmation, course and all child examinations are soft-deleted. |
| CM-004 | Instructor can list and search courses they own. | P0 | Courses are sortable by title, creation date, and number of examinations. |
| CM-005 | Courses provisioned via LTI deep linking are automatically created and linked to the LMS course. | P1 | LTI launch creates or links the course without manual instructor action. |

---

## 3. Examination Management

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| EX-001 | Instructor can create a new examination within a course. | P0 | Examination is created with default settings and appears in the course's exam list. |
| EX-002 | Instructor can duplicate an examination. | P1 | Duplicated exam copies all settings, questions, materials, and rubric. |
| EX-003 | Instructor can delete an examination. | P0 | Soft-delete with confirmation prompt; student results are preserved for audit. |
| EX-004 | Instructor can upload course materials (PDF, Word .docx) to an examination. | P0 | Files are stored, parsed for text extraction, and associated with the examination context. |
| EX-005 | Instructor can add, edit, reorder, and remove starting questions in the question bank. | P0 | Questions persist in order; reordering reflected in sequential delivery mode. |

---

## 4. Examination Settings

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| ES-001 | Instructor can set the examination title. | P0 | Title is displayed to students and in all reports. |
| ES-002 | Instructor can set the number of starting questions the AI will ask (subset of question bank). | P0 | AI selects exactly N questions from the bank; N ≤ total questions in bank. |
| ES-003 | Instructor can set the maximum exam time or set it to unlimited. | P0 | Timer enforced; timer does NOT start during setup — it begins after ID verification (if enabled) and after the AI finishes asking the first question. Student warned at 5-minute intervals and at 2 minutes remaining. |
| ES-004 | Instructor can allow or disallow retakes and set the number of allowed retakes. | P0 | Student sees retake option only if retakes remain; each attempt is recorded separately. |
| ES-005 | Instructor can configure the end process behavior (AI completes current round of questions or hard stop). | P1 | When time expires, system follows the configured end behavior. |
| ES-006 | Instructor can enable or disable random question ordering. | P0 | When enabled, question order is shuffled per student; when disabled, questions follow bank order. |
| ES-007 | Instructor can set the depth of follow-up questions on a scale of 0–10. | P0 | At depth 0, AI asks no follow-ups; at depth 10, AI asks the most complex and numerous follow-ups. **Note:** The mapping from each integer value to prompting behavior requires calibration through prompt engineering (see OQ-4 in the PRD). |
| ES-008 | Instructor can set a delay response time (silence threshold before AI escalates). | P1 | AI waits the configured duration, then follows an escalation sequence: (1) gentle prompt, (2) rephrase the question, (3) note non-response and advance. Each step restarts the delay timer. |
| ES-009 | Instructor can enable or disable ID verification at exam start. | P0 | When enabled, student must present ID card and face; images are captured and stored. |
| ES-010 | Instructor can enable or disable browser lockdown. | P0 | Default is enabled; when active, system prevents new windows/tabs and detects focus loss. |
| ES-011 | Instructor can allow or disallow breaks during the exam. | P1 | When allowed, student can request a break; timer pauses; re-verification required on return. |
| ES-012 | Instructor can set per-student accommodation overrides (extended time, modified settings). | P1 | Overrides apply only to the specified student; all other students use default settings. **Note:** The full list of overridable accommodation attributes requires stakeholder clarification (see OQ-3 in the PRD). |
| ES-013 | **Student** can choose whether the time remaining countdown is visible to them. | P0 | Student preference set on the "Ready" screen before the exam and toggleable during the exam. The timer continues to run regardless of visibility. |

---

## 5. Rubric Management

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| RB-001 | Instructor can manually create a rubric with up to 5 columns and 12 rows. | P0 | Rubric editor enforces column/row limits; saves on submit. |
| RB-002 | Each rubric row has an element header (word or short phrase) and each column represents a level of achievement. | P0 | Row headers and column headers are editable free text. |
| RB-003 | Each rubric cell contains descriptive text for how to achieve that level for that element. | P0 | Cells support multi-line text entry. |
| RB-004 | Rubric cells support either fixed-point values or a point range assigned by the instructor. | P0 | Instructor toggles between fixed and range mode per row or globally. |
| RB-005 | Instructor can request AI-generated rubric based on the exam questions and course materials. | P1 | AI produces a draft rubric; instructor can edit all fields before saving. |
| RB-006 | Instructor can upload a rubric from an Excel (.xlsx) file. | P1 | System parses the spreadsheet, maps columns/rows, and presents a preview for confirmation. |
| RB-007 | Instructor can edit an AI-generated or uploaded rubric in the same editor used for manual creation. | P0 | All rubric sources converge to the same editable data model. |

---

## 6. Student Examination Experience

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| ST-001 | Student can select examination modality: avatar, audio, or text. | P0 | Selection screen presented before exam begins; choice persists for the session. |
| ST-002 | Student can select microphone and camera from available system devices. | P0 | Device picker enumerates available hardware; selection is saved for the session. |
| ST-003 | Student must enable microphone and camera for the duration of the exam in **all modalities** (avatar, audio, and text). | P0 | System checks permissions on launch; blocks exam start if devices are not active. In text mode, the camera continues recording (displayed as a small PiP feed) even though the student types responses. |
| ST-004 | When ID check is enabled, student presents their ID card and then shows their face before the exam begins. | P0 | System captures and stores ID image and face image; exam does not start until both are captured. |
| ST-005 | The AI avatar delivers questions according to the configured settings (order, count, depth). | P0 | Questions match the instructor's configuration; follow-ups are generated per depth setting. |
| ST-006 | Student can request a break by saying or typing "break". | P1 | If breaks are allowed: the AI asks the student if they desire a break; upon confirmation, the timer pauses and the student may step away. If breaks are not allowed: the AI states breaks are not permitted and immediately moves forward with a deeper or new question. |
| ST-007 | On return from a break, the student must re-verify identity (show ID). | P1 | System captures a new verification image and logs the break duration. **Open question (OQ-7):** Clarify whether re-verification requires the full ID card + face sequence or face only. |
| ST-008 | The AI reminds the student of time remaining every 5 minutes, plus at 2 minutes remaining, **if a time limit is in place**. No reminders when the exam has no time limit. | P0 | Time reminders are delivered via the active modality (spoken, audio, or text). |
| ST-009 | When the exam time expires, the system follows the configured end process. | P0 | Hard stop terminates immediately; graceful stop allows the current question round to complete. |
| ST-010 | The entire exam session (video, audio) is recorded. | P0 | Recording is stored and accessible to the instructor in the grading dashboard. |
| ST-011 | Browser lockdown prevents opening new windows/tabs and detects focus changes (Respondus Lockdown Browser feature parity). | P0 | Focus loss events are logged; student is warned; repeated violations are flagged for the instructor. Lockdown features: full-screen enforcement, new tab/window prevention, app-switching detection, copy/paste/print-screen disabled, right-click disabled, VM detection. |

---

## 7. Grading & Evaluation

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| GR-001 | AI transcribes student responses to text, applying **anticipated** spelling, grammar, and punctuation — meaning the AI infers what the student intended to say and produces a cleaned, readable transcript rather than a raw verbatim dump. | P0 | Transcript is generated within 5 minutes of exam completion. Confidence scores are logged per segment to indicate transcription certainty. |
| GR-002 | Transcript includes pause notations in the format `[pause X seconds]`. | P0 | Pauses are annotated with their duration in seconds. |
| GR-003 | AI evaluates the transcript against the rubric, providing per-element notes and a proposed grade range. | P0 | Each rubric row has an AI-generated note and suggested point range. |
| GR-004 | AI generates an integrity report analyzing pauses, potential external sources, and any other evidence-based indicators per the source requirements. | P1 | Report is presented alongside the transcript and rubric evaluation. |
| GR-005 | Instructor can view the full transcript alongside the rubric evaluation. | P0 | Split-pane or tabbed view showing transcript and rubric side by side. |
| GR-006 | Instructor can click any word or event in the transcript to jump to that point in the video (minus 2 seconds). | P0 | Video player seeks to the correct timestamp; playback begins automatically. |
| GR-007 | Instructor completes the rubric by entering their own notes and selecting the exact point value per element. | P0 | Instructor rubric is independent of AI rubric. There must be **no "accept AI grade" button, no "apply all" shortcut, and no automated transfer mechanism**. This is a stated moral preference from the product owner: the faculty member must manually engage with each element. |
| GR-008 | Instructor can copy text from the AI analysis and paste it into their own rubric notes (manual copy/paste only). | P0 | Standard browser copy/paste works. The system must NOT provide any button, shortcut, or one-click action that transfers AI analysis into the instructor's rubric. The instructor must select, copy, and paste manually. |
| GR-009 | Instructor can review the full exam video recording. | P0 | Video player with standard controls (play, pause, seek, speed adjustment). |
| GR-010 | Grades are passed back to the LMS via LTI 1.3 grade passback when the instructor finalizes. | P1 | Grade appears in the LMS gradebook within 30 seconds of submission. |

---

## 8. LTI 1.3 Integration

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| LT-001 | System supports LTI 1.3 Advantage (Core + Deep Linking + Assignment and Grade Services + Names and Role Provisioning). | P0 | Certified or conformant with IMS LTI 1.3 specifications. |
| LT-002 | Integration with Blackboard. | P0 | End-to-end launch, roster sync, and grade passback verified. |
| LT-003 | Integration with Canvas. | P0 | End-to-end launch, roster sync, and grade passback verified. |
| LT-004 | Integration with Moodle. | P1 | End-to-end launch, roster sync, and grade passback verified. |
| LT-005 | Integration with Brightspace D2L. | P1 | End-to-end launch, roster sync, and grade passback verified. |
| LT-006 | Instructor can launch examination configuration from within the LMS. | P0 | LTI deep link opens the exam settings page in StuPath Avatar. |
| LT-007 | Student can launch the examination directly from the LMS assignment. | P0 | LTI launch opens the student exam interface with context (course, exam, user). |

---

## 9. Additional Requirements (Identified in Review)

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| TM-001 | Exam timer starts after ID verification is complete (if enabled) and after the AI finishes delivering the first question. Timer does NOT run during the pre-exam lobby, device setup, or ID check. | P0 | Timer value at the moment the first question finishes matches the instructor's configured max time; no seconds are consumed during setup. |
| TM-002 | Student can toggle the visibility of the countdown timer at any point during the exam (when a time limit is set). | P0 | Toggle is accessible in the exam UI; timer state continues to run regardless of visibility; time reminders are still delivered via the active modality even if the visual timer is hidden. Timer and toggle are not shown when the exam has no time limit. |
| DC-001 | The system must include a configurable prompt template system that maps each integer depth level (0–10) to specific AI prompting behavior. | P1 | Prompt templates are versioned and stored in the database; each level has a documented description of follow-up quantity and complexity. Calibration results from prompt-engineering sessions are recorded. |
| BL-001 | Browser lockdown must replicate Respondus Lockdown Browser behavior: full-screen enforcement, new tab/window prevention, app-switching detection, copy/paste/print-screen disabled, right-click disabled, VM detection, URL navigation disabled. | P0 | Conduct a Respondus settings audit. Replicate applicable features; document any deviations. |
| DR-001 | When the delay response timer expires, the AI follows a defined escalation sequence: prompt → rephrase → note non-response and advance. | P1 | Each escalation step restarts the delay timer. |

---

## 10. Traceability Matrix

All functional requirements map to features described in the PRD (document 01). Requirements prefixed CM → Section 6.1, EX → 6.1, ES → 6.1, RB → 6.1, ST → 6.2, GR → 6.3, LT → 6.4. Requirements TM/DC/BL/DR map to Open Questions in PRD Section 7. Supplemental requirements (Section 11) cover production-essential features inferred from the product context.

---

## 11. Supplemental Requirements

These requirements are not explicitly stated in the source document but are necessary for a functional production system.

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---|---|
| CN-001 | Student must provide informed consent for recording before the exam begins. | P0 | Consent checkbox on the welcome/instructions screen (combined step). Student must actively accept. Refusal prevents the exam from starting. Consent timestamp is stored. |
| RC-001 | If a student's connection drops during an exam, the system attempts automatic reconnection and preserves session state. | P0 | Auto-reconnect attempted for up to 60 seconds. If successful, exam resumes from where it left off. If unsuccessful, session is flagged as "interrupted" and partial recording is preserved. |
| NT-001 | Instructor receives a notification when a student completes an exam and when the AI evaluation is ready. | P1 | In-app notification; optional email. |
| TE-001 | Instructor can edit the AI-generated transcript to correct transcription errors. | P1 | Edits are saved separately; original AI transcript is preserved. |
| TA-001 | Teaching assistants can access the grading dashboard and complete rubrics, subject to instructor permissions. | P1 | TA role established via LTI NRPS roster sync. TA-completed grades must be finalized by the instructor. |
| SV-001 | Students can view their finalized grade, rubric feedback, and transcript after the instructor publishes results. | P2 | Instructor controls when results become visible. Students cannot see AI evaluation or integrity report. |
