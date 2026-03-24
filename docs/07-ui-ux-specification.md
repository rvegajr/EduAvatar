# StuPath Avatar — UI/UX Specification

| Field | Value |
|---|---|
| **Document** | UI/UX Specification |
| **Version** | 1.0 (Draft) |
| **Date** | 2026-03-23 |
| **Status** | Draft |

---

## 1. Design Principles

| Principle | Description |
|---|---|
| **Fewer steps, fewer decisions** | Combine related steps. Don't ask the user to make a choice unless it matters. Auto-save everywhere. |
| **Clarity over cleverness** | Every screen has one primary action. Labels are plain language, not jargon. |
| **Calm under pressure** | The student exam interface minimizes visual noise; time indicators are non-alarming until critical. Students are anxious — every extra screen adds stress. |
| **Instructor efficiency** | Grading workflows auto-save continuously; the only manual action is "Finalize & Submit." Exam setup lives in one tab, not spread across many. |
| **Accessibility first** | WCAG 2.1 AA compliance; keyboard navigation; screen reader support; color contrast ratios ≥ 4.5:1. |
| **Responsive** | Instructor dashboard works on desktop (primary) and tablet; student exam requires desktop with camera/mic. |

---

## 2. Information Architecture

### 2.1 Instructor App — Navigation Structure

```
├── Dashboard (home)
│   └── Course list (cards or table view)
│
├── Course Detail
│   ├── Exam list
│   ├── Roster (synced via LTI NRPS)
│   └── Course settings
│
├── Examination Detail
│   ├── Setup tab (settings, questions, materials — all exam configuration in one place)
│   ├── Rubric tab
│   ├── Accommodations tab
│   └── Grading tab (submissions list → individual grading)
│
├── Grading View
│   ├── Student submission list
│   └── Individual submission detail
│       ├── Transcript panel
│       ├── Video player
│       ├── AI Evaluation panel
│       ├── Integrity Report panel
│       └── Instructor Rubric panel
│
└── Account / Settings
```

### 2.2 Student App — Navigation Structure

```
├── Exam Lobby (4 steps max)
│   ├── Welcome (instructions + recording consent)
│   ├── Setup (modality selection + device setup)
│   ├── ID verification (if enabled — otherwise skipped)
│   └── Ready (summary + timer preference + start)
│
├── Exam Session
│   ├── Avatar / Audio / Text interaction area
│   ├── Timer (if shown, student-controlled)
│   ├── Break button
│   └── End Exam button
│
├── Exam Complete
│   └── Confirmation / thank-you screen
│
└── Results (after instructor publishes)
    ├── Grade + rubric feedback
    └── Transcript
```

---

## 3. Screen Specifications

### 3.1 Instructor: Dashboard

**Purpose:** Entry point; overview of all courses.

| Element | Description |
|---|---|
| Header | App logo, user name, institution name, account menu. |
| Course cards | Grid of cards showing course title, exam count, last modified date, and quick actions (open, duplicate, delete). |
| Create Course button | Prominent CTA in the top-right area. |
| Search/filter bar | Filter courses by title or date. |

**Wireframe Notes:**
- Responsive grid: 3 columns on desktop, 2 on tablet, 1 on mobile.
- Empty state: illustration + "Create your first course" CTA.

---

### 3.1b Instructor: Course Detail

**Purpose:** Manage a single course — its exams, roster, and settings.

| Element | Description |
|---|---|
| Course title | Editable inline. |
| Exam list | Table or card list of exams. Each row shows: title, status (draft/published), number of submissions, last modified. Actions per row: Open, Duplicate, Delete. |
| Create Exam button | Prominent CTA. Creates a new exam in draft status and opens it. |
| Roster | Student list synced via LTI NRPS. Read-only; shows name, email, enrollment status. |
| Course settings | Minimal: course-level defaults (if any). |

**Interaction Notes:**
- Duplicate creates a copy in draft status with a "(Copy)" suffix.
- Delete requires confirmation; warns if the exam has student submissions.

---

### 3.2 Instructor: Examination Detail — Setup Tab

**Purpose:** Build the exam — all configuration on one scrollable page.

**Design goal:** Everything needed to create an exam lives in one tab. No hunting across tabs for related settings. Sections are collapsible to reduce visual clutter; all sections are expanded by default on first visit.

| Section | Content |
|---|---|
| **Title & Status** | Exam title input, status toggle (draft/published). |
| **Questions** | Draggable list of starting questions with inline add/edit/delete. Count indicator: "5 questions in bank · AI will ask 3." Number of starting questions input, random order toggle. |
| **Materials** | Drag-and-drop upload area for Word/PDF files. File list with preview, rename, delete. These provide background context for the AI. |
| **Exam Rules** | Max time (number input + "unlimited" toggle). Retakes (number input, 0 = none). End process radio: "Hard stop" / "Complete current round." Allow breaks toggle. |
| **AI Behavior** | Depth of follow-up questions (slider 0–10 with labels: 0 = "No follow-ups", 5 = "Moderate", 10 = "Deep, complex"). Delay response time (seconds input with sensible default, e.g., 15s). |
| **Security** | ID check toggle. Browser lockdown toggle (on by default). |

**Interaction Notes:**
- All fields auto-save with debounce (500ms) and a subtle "Saved" indicator.
- Timer visibility is a student preference — not shown here, to avoid instructor confusion.
- Sections collapse to their headers so instructors can focus on one area at a time.

---

### 3.3 Instructor: Rubric Tab

**Purpose:** Build or import a rubric.

| Element | Description |
|---|---|
| Rubric table | Spreadsheet-like grid; column headers (achievement levels) and row headers (elements) are editable. |
| Cell editor | Click a cell to open an inline editor with description text area and points (fixed or range). |
| Toolbar | Buttons: Add Row, Add Column, Delete Row, Delete Column (with limits: max 5 cols, 12 rows). |
| AI Generate | Button opens a modal: "Generate rubric from exam questions and materials?" → confirm → AI fills the table. |
| Excel Upload | Button opens file picker → parse → preview modal → confirm to import. |
| Scoring toggle | Global or per-row toggle between fixed points and point range. |

---

### 3.4 Instructor: Grading View — Submission Detail

**Purpose:** Review a student's exam and assign a grade.

**Layout:** Three-column layout on desktop.

| Column | Content |
|---|---|
| **Left (40%)** | Transcript panel: scrollable transcript with speaker labels, timestamps, pause notations. Each word/phrase is clickable (links to video). |
| **Center (30%)** | Video player: exam recording; syncs with transcript clicks (seeks to timestamp − 2 seconds). Below the video: AI Evaluation summary and Integrity Report (collapsible sections). |
| **Right (30%)** | Instructor Rubric: rubric grid pre-filled with AI suggestions in a read-only "AI" sub-column; instructor fills their own notes + point values in editable fields. "Finalize Grade" button at bottom. |

**Navigation Bar (top):**
- Student name and attempt number.
- Previous / Next student buttons for sequential grading.
- Progress indicator (e.g., "5 of 32 graded").

**Interaction Notes:**
- Clicking a transcript word highlights it and the video seeks to `word.start_time_ms - 2000`.
- AI suggestions are displayed in a muted/italicized style to visually distinguish them from instructor input.
- "Edit Transcript" link enables inline correction of transcription errors; original is preserved.
- No "Accept AI Grade" button; instructor must manually enter or copy/paste each score.
- Total score auto-calculates as instructor fills in rubric scores.
- Work auto-saves continuously (no manual "Save Draft" button — one less decision for the instructor).
- Single CTA: "Finalize & Submit to LMS." Confirmation dialog before submission. Status badge updates automatically (Draft → Finalized).

---

### 3.5 Student: Exam Lobby

**Purpose:** Prepare the student for the exam with the fewest possible steps.

**Design goal:** Minimize pre-exam friction. Students are already anxious — every extra screen adds stress. Combine related steps; keep each screen focused.

**Step-by-step flow (wizard pattern):**

| Step | Screen |
|---|---|
| 1. Welcome | Exam title, duration, number of questions, rules (lockdown, breaks). Below the rules: recording consent checkbox ("This exam will be recorded. Your instructor will review the recording. I understand and consent."). Must be checked to proceed. "Continue" button. |
| 2. Setup | Top section: three large cards for modality selection (Avatar, Audio, Text). Bottom section (appears after selection): camera preview, microphone level meter, device dropdowns, "Test Audio" button. Camera and mic required in all modalities. "Continue" button. |
| 3. ID Verification (if enabled) | Simple two-step capture: "Hold up your ID → Capture → Show your face → Capture." Green checkmarks on success. Retry on failure. Skipped entirely if ID check is disabled. |
| 4. Ready | Brief summary of selections. Timer preference toggle: "Show countdown timer?" (default: on, with note that time reminders are always given). "Start Exam" button (large, centered, primary color). |

---

### 3.6 Student: Exam Session — Avatar Mode

**Purpose:** The live examination experience with a 3D avatar.

| Element | Position | Description |
|---|---|---|
| Avatar viewport | Center (60% width) | 3D avatar with lip-sync animation; speaks questions aloud. |
| Transcript area | Bottom (scrollable) | Running transcript of the conversation (AI questions + student responses). |
| Timer | Top-right | Countdown timer (visible or hidden per student preference); turns amber at 5 min, red at 2 min. Student can toggle visibility via a small eye icon. Timer does not appear until the first question is delivered. Hidden entirely when exam has no time limit. |
| Status indicator | Top-left | Green dot = recording; mic level meter. |
| Break button | Bottom-right | "Request Break" button — **only visible when breaks are allowed** in settings. Students can still say or type "break" in any mode, and the AI will respond appropriately even without the button. |
| End Exam | Bottom-right | "End Exam" button with confirmation dialog. |

**Interaction Notes:**
- Student speaks into mic; real-time transcription shows their words appearing.
- After student finishes speaking (silence detection per delay_response_seconds), AI processes and asks the next question.
- If student is silent beyond the threshold, AI escalates: prompt → rephrase → note non-response and advance.
- Avatar animates while speaking; idle animation while listening.
- When student says/types "break": if allowed, AI asks "Would you like to take a break?" and waits for confirmation before pausing. If not allowed, AI declines and immediately asks a deeper or new question.
- Browser lockdown: full-screen enforced; exiting full-screen triggers a warning overlay. Lockdown replicates Respondus Lockdown Browser features (no new tabs, no app switching, no copy/paste, no right-click, VM detection).

---

### 3.7 Student: Exam Session — Audio Mode

Same as avatar mode but the avatar viewport is replaced by:
- A large centered waveform visualization showing the AI speaking.
- A speaker icon indicates AI is active; a microphone icon indicates student's turn.

### 3.8 Student: Exam Session — Text Mode

| Element | Position | Description |
|---|---|---|
| Chat window | Center (80% width) | Chat-style interface; AI messages on the left, student messages on the right. |
| Text input | Bottom | Text area + Send button. Student submits answer by pressing Send or Enter. |
| Timer | Top-right | Same as avatar mode. |
| Camera feed | Small PiP (top-left) | Student's camera in a small picture-in-picture window (still recording). Microphone remains active and recording throughout the session even though the student types responses — per source requirement that mic and camera must be active in all modalities. |
| Break button | Bottom-right | Same as avatar mode. |
| End Exam | Bottom-right | Same as avatar mode. |

---

### 3.9 Student: Exam Complete

**Purpose:** Confirm the exam is over.

| Element | Description |
|---|---|
| Confirmation message | "Your examination is complete. Thank you." |
| Summary | Duration, number of questions answered. |
| Next steps | "Your instructor will review your submission. You may close this window." |

---

## 4. Design System Tokens (Proposed)

### 4.1 Color Palette

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | #2563EB (blue-600) | Primary actions, links. |
| `--color-primary-hover` | #1D4ED8 (blue-700) | Hover state. |
| `--color-success` | #16A34A (green-600) | Confirmations, saved indicators. |
| `--color-warning` | #D97706 (amber-600) | Time warnings (5 min). |
| `--color-danger` | #DC2626 (red-600) | Errors, critical time (2 min). |
| `--color-neutral-bg` | #F8FAFC (slate-50) | Page backgrounds. |
| `--color-neutral-border` | #E2E8F0 (slate-200) | Borders, dividers. |
| `--color-text-primary` | #0F172A (slate-900) | Body text. |
| `--color-text-secondary` | #64748B (slate-500) | Labels, metadata. |

### 4.2 Typography

| Token | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `--font-heading-lg` | Inter | 24px | 700 | Page titles. |
| `--font-heading-md` | Inter | 18px | 600 | Section headers. |
| `--font-body` | Inter | 14px | 400 | Body text. |
| `--font-caption` | Inter | 12px | 400 | Timestamps, metadata. |
| `--font-mono` | JetBrains Mono | 13px | 400 | Transcript text, code. |

### 4.3 Spacing

- Base unit: 4px.
- Standard increments: 4, 8, 12, 16, 24, 32, 48, 64.

### 4.4 Component Library

Recommended base: **shadcn/ui** (React) or **Radix UI** primitives — unstyled, accessible, composable.

---

## 5. Accessibility Requirements

| Requirement | Standard | Notes |
|---|---|---|
| Color contrast | WCAG 2.1 AA (4.5:1 text, 3:1 UI) | All color tokens verified. |
| Keyboard navigation | Full operability | Tab order, focus rings, Escape to close modals. |
| Screen reader | ARIA labels on all interactive elements | Live regions for transcript updates and time warnings. |
| Focus management | Focus trapped in modals and dialogs | Focus returns to trigger element on close. |
| Motion | Prefers-reduced-motion | Disable avatar animation and waveform if user prefers reduced motion. |
| Text scaling | Up to 200% zoom without layout break | Responsive layout handles zoom. |
| Captions | AI speech captioned in real-time | Transcript serves as live caption in all modalities. |

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Target |
|---|---|---|
| Mobile | < 640px | Not primary target; student exam requires desktop. |
| Tablet | 640–1024px | Instructor dashboard (limited); student lobby. |
| Desktop | 1024–1440px | Primary experience for both instructor and student. |
| Wide | > 1440px | Extended grading view with wider panels. |
