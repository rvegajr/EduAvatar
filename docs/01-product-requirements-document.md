# StuPath Avatar — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| **Product Name** | StuPath Avatar |
| **Version** | 1.0 (Draft) |
| **Date** | 2026-03-23 |
| **Status** | Draft |

---

## 1. Executive Summary

StuPath Avatar is an AI-powered oral examination platform designed for higher education. It addresses the scalability problem inherent in oral assessments: a single instructor cannot administer individual oral exams to large cohorts. StuPath Avatar provides an AI avatar that conducts, records, transcribes, and preliminarily evaluates oral examinations on behalf of the instructor, while keeping the instructor firmly in control of final grading decisions.

## 2. Problem Statement

Oral examinations are one of the most effective methods for assessing deep understanding, yet they are rarely used in higher education because:

- **Time cost**: A 15-minute oral exam for a 200-student class requires 50+ instructor-hours.
- **Scheduling complexity**: Coordinating individual time slots is logistically prohibitive.
- **Consistency**: Fatigue and implicit bias affect human examiners across many sessions.
- **Scalability**: There is no existing tool that automates the delivery of oral exams while preserving academic rigor.

## 3. Product Vision

Provide every instructor with a tireless, consistent, AI-driven examiner that scales oral assessments to any class size — while ensuring final academic judgment remains with the human instructor.

## 4. Target Users

### 4.1 Primary Users

| Persona | Description |
|---|---|
| **Instructor** | Faculty member or teaching assistant who creates examinations, configures settings, reviews AI evaluations, and assigns final grades. |
| **Student** | Enrolled learner who takes the oral examination through an avatar, audio, or text modality. |

### 4.2 Secondary Users

| Persona | Description |
|---|---|
| **LMS Administrator** | Configures the LTI 1.3 integration between StuPath Avatar and the institution's LMS. |
| **Institutional Admin** | Manages institution-level settings, licensing, and user provisioning. |

## 5. Product Goals & Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Reduce instructor time per exam cycle | Hours saved vs. manual oral exams | ≥ 80% reduction |
| Maintain academic integrity | Proctoring flag accuracy | ≥ 90% true-positive rate |
| High adoption rate | Instructor repeat usage after first exam | ≥ 70% |
| Student satisfaction | Post-exam survey score | ≥ 4.0 / 5.0 |
| LMS compatibility | Certified LTI 1.3 integrations | Blackboard, Canvas, Moodle, Brightspace D2L |

## 6. Key Features (High Level)

### 6.1 Instructor Features

- **Course Management** — Create, duplicate, and delete courses (collections of examinations).
- **Examination Builder** — Create, duplicate, and delete examinations; configure settings; upload course materials (Word, PDF).
- **Question Bank** — Define starting questions; configure random ordering and subset selection.
- **Rubric Management** — Create rubrics manually, upload from Excel, or generate with AI assistance; edit AI-generated rubrics.
- **Grading Dashboard** — Review AI-generated evaluations, transcripts, and recordings; assign final grades via rubric; navigate transcript-to-video with 2-second offset; edit transcripts to correct AI errors.
- **Notifications** — Receive alerts when students complete exams and when AI evaluations are ready.
- **Result Publishing** — Control when students can see their grades and feedback.
- **Accommodation Settings** — Configure per-student accommodations (extended time, break policies, etc.).

### 6.2 Student Features

- **Modality Selection** — Choose avatar (visual bot), audio-only, or text chat.
- **Device Configuration** — Select microphone and camera from available system devices. Mic and camera must remain active throughout the exam in all modalities (including text mode).
- **Examination Experience** — AI-delivered oral exam with time reminders (when a time limit is set), break requests, and adaptive follow-up questions. Timer starts after ID verification and first question delivery — not during setup.
- **Recording Consent** — Informed consent before exam recording begins.
- **ID Verification** — Present physical ID and face capture when required.
- **Browser Lockdown** — Enforced lockdown preventing window/tab switching (Respondus Lockdown Browser feature parity).
- **Session Resilience** — Automatic reconnection if connection drops during exam.
- **Result Viewing** — See grades and instructor feedback after results are published.

### 6.3 AI & Evaluation Features

- **Adaptive Questioning** — AI generates follow-up questions based on student responses; depth configurable 0–10.
- **Transcription** — Real-time speech-to-text with spelling/grammar normalization and pause notation.
- **Rubric-Based Evaluation** — AI maps transcript against rubric elements, proposes grade ranges, and provides per-element notes.
- **Integrity Analysis** — AI reports on pauses, gaze patterns, and evidence of external sources.

### 6.4 Integration Features

- **LTI 1.3** — Deep linking, grade passback, and roster sync with Blackboard, Canvas, Moodle, and Brightspace D2L.

## 7. Open Questions (Source Requirements Incomplete)

The following items in the source requirements document are truncated or ambiguous. They require stakeholder clarification before development begins.

| # | Source Text (truncated) | What's Missing | Recommended Action |
|---|---|---|---|
| OQ-1 | "Retakes - The instructor can allow additional…" | Sentence is cut off. Does this mean additional attempts? Is there a cap? Can the instructor choose which attempt counts? | Clarify retake policy: max retakes, which attempt is graded, cool-down period between attempts. |
| OQ-2 | "End Process - Instructor may determine to allow the AI to complete it's round of questions,…" | Sentence is cut off. What is the alternative to completing the round? Immediate hard stop? | Confirm two options (hard stop vs. complete round) or identify additional end-process behaviors. |
| OQ-3 | "Accommodation Settings - The instructor needs to be able to set special attributes for specific students. This may include…" | List of accommodation types is missing. | Define the full set of per-student overrides: extended time, modified depth, break permissions, alternative modality, custom delay response time, exemption from ID check, etc. |
| OQ-4 | Depth of questions scale (0–10): "We will need to adjust prompting to determine what these arbitrary numbers mean." | The mapping from integer depth values to AI prompting behavior is undefined. | Conduct prompt-engineering experiments to define each level; document the resulting prompt templates and their calibration criteria. |
| OQ-5 | Time visibility: "This can be shown to students or turned off at the student's choice." | Is this purely the student's choice, or can the instructor force the timer to be visible/hidden? | Clarify whether instructor can override student preference (e.g., "always show" / "student choice" / "always hide"). |
| OQ-6 | Delay response time: "the amount of silence or non-answer the AI questioner will wait before escalating the silence." | What does "escalating" mean? Prompt the student? Ask again? Move to the next question? | Define the escalation sequence (e.g., gentle nudge → rephrase → skip). |
| OQ-7 | Break return verification: "The student will have to verify (show ID) on return." | Does this mean showing the physical ID card again, showing their face, or both? | Clarify whether re-verification is full (ID card + face) or partial (face only). |

---

## 8. Scope & Boundaries

### In Scope (v1.0)

- Full instructor and student workflows as described above.
- LTI 1.3 integration with the four listed LMS platforms.
- AI avatar, audio, and text modalities.
- Browser lockdown (web-based, Respondus Lockdown Browser feature parity).
- Rubric creation (manual, Excel upload, AI-generated).
- Depth calibration prompt engineering (mapping the 0–10 scale to concrete AI questioning behavior).

### Out of Scope (v1.0)

- Native mobile applications.
- Proctoring via third-party hardware (e.g., biometric scanners).
- Real-time multi-student group oral exams.
- Automated grade submission without instructor review (by design — described in the source as "a matter of moral preference"; this is a non-negotiable design constraint).
- Languages other than English (internationalization deferred to v2.0).

## 9. Assumptions & Constraints

| # | Assumption / Constraint |
|---|---|
| A1 | Students have access to a modern web browser (Chrome, Firefox, Edge, Safari) with camera and microphone. |
| A2 | Institutions have an existing LMS that supports LTI 1.3 (Advantage). |
| A3 | Internet bandwidth is sufficient for real-time video/audio streaming. |
| C1 | Final grading authority must always rest with the instructor — no "accept AI grade" button. The instructor must manually copy/paste any AI analysis and select exact point values. This is a moral preference stated by the product owner. |
| C2 | All recordings and transcripts must comply with FERPA and institutional data policies. |
| C3 | The system must be accessible per WCAG 2.1 AA standards. |
| C4 | The exam timer does not start during setup. Time begins after ID verification (if enabled) and after the AI finishes asking the first question. |
| C5 | Students control whether the countdown timer is visible to them (student preference, not instructor setting). |

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI transcription inaccuracy in noisy environments | Medium | High | Provide transcript editing; log confidence scores; use "anticipated" normalization to infer intended words. |
| Depth calibration is subjective (0–10 scale) | High | Medium | Iterative prompt-engineering with faculty testers; document calibration criteria per level. |
| LTI certification delays with specific LMS vendors | Medium | Medium | Prioritize Canvas and Blackboard; stagger others. |
| Student resistance to AI examiner | Medium | Medium | Offer text modality as low-anxiety alternative; conduct UX research. |
| Browser lockdown circumvention | Low | High | Layered detection (focus events, process monitoring); flag rather than block. Conduct Respondus feature-parity analysis. |
| Data privacy regulatory changes | Low | High | Architecture supports regional data residency; legal review cadence. |
| Silence escalation behavior confuses students | Medium | Medium | User-test escalation prompts; make escalation sequence configurable. |

## 11. Release Strategy

| Phase | Milestone | Target |
|---|---|---|
| Alpha | Core exam flow (create → take → review) with Canvas LTI | Q3 2026 |
| Beta | All four LMS integrations; rubric engine; integrity analysis; depth calibration complete | Q4 2026 |
| GA 1.0 | Full feature set; accessibility audit complete; load-tested | Q1 2027 |

## 12. Approval & Stakeholders

| Role | Name | Sign-off |
|---|---|---|
| Product Owner | _TBD_ | ☐ |
| Engineering Lead | _TBD_ | ☐ |
| UX Lead | _TBD_ | ☐ |
| Academic Advisor | _TBD_ | ☐ |
