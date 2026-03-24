# StuPath Avatar — User Stories & Use Cases

| Field | Value |
|---|---|
| **Document** | User Stories & Use Cases |
| **Version** | 1.0 (Draft) |
| **Date** | 2026-03-23 |
| **Status** | Draft |

---

## 1. User Story Map

Stories are grouped by epic and prioritized using MoSCoW (Must / Should / Could / Won't for v1).

---

## 2. Epic: Course Management

### US-CM-01 — Create Course
**As an** instructor,
**I want to** create a new course with a title and description,
**so that** I can organize my examinations by class or semester.

**Acceptance Criteria:**
- Course creation form accepts title (required, max 200 chars) and description (optional, max 2000 chars).
- Created course appears in the instructor's course list immediately.
- Course is assigned a unique ID and creation timestamp.

### US-CM-02 — Duplicate Course
**As an** instructor,
**I want to** duplicate an existing course with all its examinations,
**so that** I can reuse a course structure for a new semester without recreating everything.

**Acceptance Criteria:**
- Duplicate includes all exams, settings, question banks, and rubrics.
- Duplicated course title is appended with "(Copy)".
- Student results from the original are not duplicated.

### US-CM-03 — Delete Course
**As an** instructor,
**I want to** delete a course I no longer need,
**so that** my course list stays manageable.

**Acceptance Criteria:**
- System prompts for confirmation before deletion.
- Deletion is a soft delete; data can be recovered within 90 days.
- Associated exam data is retained for audit purposes.

---

## 3. Epic: Examination Builder

### US-EX-01 — Create Examination
**As an** instructor,
**I want to** create a new oral examination within a course,
**so that** I can assess student understanding through AI-driven questioning.

**Acceptance Criteria:**
- Exam is created with default settings (random order off, depth 5, no time limit, ID check off, lockdown on).
- Exam appears in the course's exam list.

### US-EX-01b — Duplicate Examination
**As an** instructor,
**I want to** duplicate an existing examination,
**so that** I can reuse questions and settings without rebuilding from scratch.

**Acceptance Criteria:**
- Duplicate creates a new exam with the same questions, materials, settings, and rubric.
- Duplicate is created in draft status regardless of the original's status.
- Duplicate appears in the course's exam list with a "(Copy)" suffix.

### US-EX-01c — Delete Examination
**As an** instructor,
**I want to** delete an examination I no longer need,
**so that** my course stays organized.

**Acceptance Criteria:**
- Delete requires confirmation ("Are you sure?").
- Soft-delete: exam is hidden from the list but data is retained for audit.
- Exams with existing student submissions show a warning before deletion.

### US-EX-02 — Configure Starting Questions
**As an** instructor,
**I want to** add starting questions to the question bank and set how many the AI should ask,
**so that** different students receive different question subsets, reducing cheating risk.

**Acceptance Criteria:**
- Instructor can add, edit, reorder, and delete questions.
- Instructor sets N (number to ask); N ≤ total questions.
- When random is on, AI selects N questions randomly; when off, first N in order.

### US-EX-03 — Upload Course Materials
**As an** instructor,
**I want to** upload PDFs and Word documents as exam context,
**so that** the AI can generate informed follow-up questions based on course content.

**Acceptance Criteria:**
- Supported formats: PDF (.pdf), Word (.docx).
- Maximum file size: 50 MB per file; 200 MB total per exam.
- Files are parsed for text; text is embedded for RAG retrieval.
- Instructor can view, download, and remove uploaded files.

### US-EX-04 — Configure Exam Settings
**As an** instructor,
**I want to** configure all examination parameters (time, depth, retakes, lockdown, ID check, breaks, etc.),
**so that** the exam runs according to my pedagogical requirements.

**Acceptance Criteria:**
- All settings from the Examination Settings spec (ES-001 through ES-013) are configurable via the UI.
- Settings have sensible defaults.
- Settings are validated on save (e.g., cannot set time to negative).

### US-EX-05 — Set Student Accommodations
**As an** instructor,
**I want to** override exam settings for specific students (e.g., extra time, allow breaks),
**so that** I can comply with ADA/accommodation requirements.

**Acceptance Criteria:**
- Instructor selects a student from the roster (synced via LTI NRPS).
- Override form shows all configurable settings pre-filled with defaults.
- Only modified settings are stored as overrides.

---

## 4. Epic: Rubric Management

### US-RB-01 — Create Rubric Manually
**As an** instructor,
**I want to** build a rubric from scratch with rows (elements) and columns (achievement levels),
**so that** I can define clear grading criteria for the exam.

**Acceptance Criteria:**
- Rubric editor supports up to 5 columns and 12 rows.
- Each row has an element header; each column has an achievement level header.
- Each cell has a description and either fixed points or a point range.

### US-RB-02 — Generate Rubric with AI
**As an** instructor,
**I want to** ask the AI to generate a rubric based on my exam questions and materials,
**so that** I have a starting point that I can refine.

**Acceptance Criteria:**
- AI generates a complete rubric respecting the 5-column, 12-row limits.
- Generated rubric opens in the editor for instructor modification.
- Instructor must explicitly save (no auto-apply).

### US-RB-03 — Upload Rubric from Excel
**As an** instructor,
**I want to** upload an existing rubric from an Excel file,
**so that** I can reuse rubrics I've already created outside StuPath.

**Acceptance Criteria:**
- System accepts .xlsx files.
- Preview screen shows the parsed rubric for instructor confirmation.
- Instructor can correct mapping errors before saving.

---

## 5. Epic: Student Examination

### US-ST-01 — Launch Exam from LMS
**As a** student,
**I want to** click the assignment in my LMS and be taken directly to the exam,
**so that** I don't have to navigate to a separate website or remember a URL.

**Acceptance Criteria:**
- LTI launch opens the StuPath student exam interface.
- Student identity is established via LTI; no separate login required.
- If the exam hasn't started yet, student sees a waiting screen with instructions.

### US-ST-02 — Exam Setup (Consent, Modality, Devices)
**As a** student,
**I want to** read the exam rules, consent to recording, choose my exam mode, and set up my mic and camera with minimal steps,
**so that** I can get into the exam quickly without unnecessary friction.

**Acceptance Criteria:**
- Welcome screen shows exam instructions and recording consent checkbox. Consent must be accepted to proceed. Refusal prevents the exam from starting. Consent timestamp is stored.
- Setup screen presents modality selection (avatar / audio / text) and device configuration (mic, camera, test audio) together on one page.
- Camera and microphone are required in all modalities including text mode.

### US-ST-03 — Complete ID Verification
**As a** student,
**I want to** present my ID and face quickly so the exam can begin,
**so that** verification doesn't add unnecessary stress.

**Acceptance Criteria:**
- Clear instructions displayed (hold up ID → capture → show face → capture).
- System confirms successful capture with a checkmark.
- If capture fails, student can retry.
- Step is skipped entirely if ID check is disabled.

### US-ST-05 — Take the Examination
**As a** student,
**I want to** answer the AI's questions naturally using voice or text,
**so that** I can demonstrate my understanding of the material.

**Acceptance Criteria:**
- AI asks questions per the configured settings.
- AI generates follow-up questions based on my responses and the depth setting.
- The exam timer starts only after ID verification is complete (if enabled) and after the AI finishes asking the first question — not during setup.
- I can toggle whether the countdown timer is visible to me (my choice, not the instructor's).
- If a time limit is in place, I receive time reminders (every 5 minutes + at 2 minutes remaining) via the active modality, regardless of whether the visual timer is shown.
- If I remain silent beyond the delay response threshold, the AI escalates: prompt → rephrase → note non-response and advance.
- The session is recorded.

### US-ST-06 — Request a Break
**As a** student,
**I want to** request a break during the exam by saying or typing "break",
**so that** I can step away briefly if permitted.

**Acceptance Criteria:**
- If breaks are allowed: the AI **first asks to confirm** ("Would you like to take a break?"). Upon confirmation, the timer pauses and the student may step away. On return, the student must re-verify identity (show ID).
- If breaks are **not** allowed: the AI states that breaks are not permitted and **immediately moves forward with a deeper follow-up question or the next starting question** — not simply repeating the current question.

### US-ST-07a — Recover from Disconnection
**As a** student,
**I want the** system to automatically reconnect me if my internet drops during the exam,
**so that** a brief technical issue doesn't invalidate my session.

**Acceptance Criteria:**
- Auto-reconnection attempted for up to 60 seconds.
- If reconnected, exam resumes from where it left off.
- If reconnection fails, session is flagged as "interrupted" and partial recording is preserved.

### US-ST-07b — Retake an Examination
**As a** student,
**I want to** retake an exam if the instructor allows it,
**so that** I have a chance to improve my performance.

**Acceptance Criteria:**
- Retake button visible only if retakes remain.
- Each attempt is recorded as a separate submission.
- Instructor can see all attempts.

---

## 6. Epic: Grading & Review

### US-GR-01 — Review AI Evaluation
**As an** instructor,
**I want to** see the AI's evaluation of each student's exam against the rubric,
**so that** I have a starting point for my own assessment.

**Acceptance Criteria:**
- AI evaluation shows per-rubric-element notes and proposed grade range.
- AI integrity report is available alongside the evaluation.
- Data is read-only (instructor cannot modify AI outputs directly).

### US-GR-02 — Navigate Transcript to Video
**As an** instructor,
**I want to** click on any part of the transcript and jump to that moment in the video,
**so that** I can verify context around specific student responses.

**Acceptance Criteria:**
- Clickable words/events in the transcript.
- Video seeks to the timestamp of the selected word minus 2 seconds.
- Playback begins automatically.

### US-GR-03 — Complete the Rubric
**As an** instructor,
**I want to** fill in my own notes and scores for each rubric element,
**so that** the final grade reflects my professional judgment, not just AI analysis.

**Acceptance Criteria:**
- Instructor rubric is completely separate from AI rubric.
- **No "accept AI grade" button, no "apply all" shortcut, no automated transfer mechanism of any kind.** This is a stated moral preference from the product owner: the faculty member must manually engage with each element.
- Instructor can use standard browser copy/paste to transfer text from AI notes into their own fields, but the system must not provide any dedicated button or action to facilitate this.
- If the rubric uses fixed-point scoring, the instructor must select the exact point value. If the rubric uses range scoring, the instructor must enter a specific number within the range.
- Total score is calculated automatically from per-element scores.

### US-GR-04 — Submit Grade to LMS
**As an** instructor,
**I want to** finalize the grade and have it sent to the LMS gradebook,
**so that** I don't have to manually re-enter scores.

**Acceptance Criteria:**
- "Submit Grade" button sends the score via LTI AGS.
- Confirmation message shows success or failure.
- Grade appears in the LMS within 30 seconds.

### US-GR-05 — Edit Transcript
**As an** instructor,
**I want to** correct errors in the AI-generated transcript,
**so that** the record accurately reflects what the student said.

**Acceptance Criteria:**
- Inline editing of transcript text.
- Original AI transcript is preserved; edits saved separately.

### US-GR-06 — Receive Notification
**As an** instructor,
**I want to** be notified when an exam is complete and the AI evaluation is ready,
**so that** I know when to start grading.

**Acceptance Criteria:**
- In-app notification. Optional email (instructor-configurable).

### US-GR-07 — TA Assists with Grading
**As a** teaching assistant,
**I want to** access the grading dashboard and complete rubrics,
**so that** I can assist the instructor with large class workloads.

**Acceptance Criteria:**
- TA role established via LTI NRPS.
- Instructor enables/disables TA grading per course.
- TA-completed grades must be finalized by the instructor before LMS submission.

### US-SV-01 — Student Views Results
**As a** student,
**I want to** see my finalized grade and rubric feedback after the instructor publishes results,
**so that** I can learn from the feedback.

**Acceptance Criteria:**
- Results visible only after instructor publishes.
- Student sees: score, per-element rubric feedback, and transcript.
- Student does NOT see: AI evaluation or integrity report.

---

## 7. Epic: LTI Integration

### US-LT-01 — Configure LTI Tool in LMS
**As an** LMS administrator,
**I want to** register StuPath Avatar as an LTI 1.3 tool in my institution's LMS,
**so that** instructors and students can access it from within their courses.

**Acceptance Criteria:**
- StuPath provides a configuration URL, client ID, and deployment ID.
- Registration follows the standard LTI 1.3 registration flow.
- Documentation is provided for Blackboard, Canvas, Moodle, and Brightspace.

### US-LT-02 — Deep Link an Examination
**As an** instructor,
**I want to** select an examination from within the LMS assignment creation flow,
**so that** the assignment is linked directly to the StuPath exam.

**Acceptance Criteria:**
- Deep linking flow opens StuPath exam picker within the LMS.
- Selected exam is linked to the LMS assignment.
- Students see the exam when they open the assignment.

---

## 8. Use Case Diagrams (Textual)

### UC-01: Student Takes Oral Exam

**Primary Actor:** Student
**Preconditions:** Exam is published; student is enrolled; LTI launch is configured.

**Main Flow (lobby is 3–4 screens, not 7):**
1. Student clicks the assignment link in the LMS → LTI launches StuPath.
2. **Welcome screen:** Student reads instructions, checks recording consent checkbox, clicks Continue.
3. **Setup screen:** Student selects modality (avatar / audio / text), sets up microphone and camera, clicks Continue.
4. **(If ID check enabled)** Student presents ID card and face; system captures both.
5. **Ready screen:** Student reviews summary, sets timer visibility preference, clicks "Start Exam."
6. AI asks the first question. **The exam timer starts when the first question finishes being delivered.**
7. Student responds verbally or via text.
8. AI generates follow-up questions based on response and depth setting.
9. If student is silent beyond the delay response threshold, AI escalates: prompt → rephrase → note non-response and advance.
10. AI proceeds to the next starting question after follow-ups are exhausted.
11. If a time limit is in place, time reminders are delivered every 5 minutes + at 2 minutes remaining, via the active modality.
12. Exam ends (time expires or all questions completed).
13. System saves recording and queues transcription/evaluation. Instructor is notified.

**Alternative Flows:**
- **A1 (Break — allowed):** Student says/types "break" → AI asks to confirm → timer pauses → on return, student re-verifies (shows ID) → exam resumes.
- **A1b (Break — not allowed):** Student says/types "break" → AI declines and immediately asks a deeper or new question.
- **A2 (Connection Drop):** Auto-reconnect attempted for up to 60 seconds. If successful, exam resumes. If not, session flagged as "interrupted."
- **A3 (Device Failure):** System alerts student; event logged.
- **A4 (Lockdown Violation):** Warning displayed; event logged; repeated violations flagged in integrity report.
- **A5 (Consent Refused):** Student declines consent → exam does not start → message to contact instructor.

### UC-02: Instructor Grades Exam

**Primary Actor:** Instructor
**Preconditions:** Student has completed exam; AI evaluation is ready.

**Main Flow:**
1. Instructor opens the grading dashboard for the examination.
2. Instructor selects a student submission.
3. System displays: transcript (with pause notations), AI rubric evaluation, and integrity report.
4. Instructor reads the AI analysis.
5. Instructor clicks on transcript segments to review corresponding video.
6. Instructor fills in their own rubric notes and scores for each element. Work auto-saves continuously.
7. Instructor clicks "Finalize & Submit to LMS."
8. System sends the grade to the LMS via LTI AGS.

**Alternative Flows:**
- **A1 (Instructor disagrees with AI):** Instructor enters completely different notes/scores — system has no constraints on divergence.
- **A2 (Multiple attempts):** Instructor sees all attempts; selects which to grade or grades all.
