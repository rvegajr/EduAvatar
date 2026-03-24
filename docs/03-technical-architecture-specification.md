# StuPath Avatar — Technical Architecture Specification

| Field | Value |
|---|---|
| **Document** | Technical Architecture Specification |
| **Version** | 1.0 (Draft) |
| **Date** | 2026-03-23 |
| **Status** | Draft |

---

## 1. Overview

This document describes the proposed system architecture for StuPath Avatar, including component decomposition, technology stack recommendations, infrastructure topology, and integration patterns.

---

## 2. Architecture Principles

| Principle | Rationale |
|---|---|
| **Modular Monolith → Microservices** | Start with a well-structured modular monolith for speed; decompose into services as scale demands. |
| **API-First** | All UI and LMS integrations consume the same REST/GraphQL API. |
| **Event-Driven Processing** | Exam recordings, transcription, and AI evaluation are processed asynchronously via a message queue. |
| **Data Sovereignty** | Architecture supports deploying in institution-preferred cloud regions to satisfy FERPA and GDPR. |
| **Horizontal Scalability** | Stateless application tier behind a load balancer; state lives in managed databases and object storage. |

---

## 3. High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client Tier                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐  │
│  │ Instructor │  │  Student   │  │  LMS (Blackboard, Canvas,  │  │
│  │  Web App   │  │  Web App   │  │  Moodle, Brightspace D2L)  │  │
│  └─────┬──────┘  └─────┬──────┘  └────────────┬───────────────┘  │
│        │               │                       │                 │
└────────┼───────────────┼───────────────────────┼─────────────────┘
         │               │                       │
         ▼               ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                 │
│                   (TLS termination, rate limiting)                │
└──────────────────────────────┬───────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  Application    │ │  LTI 1.3 Service │ │  Media / WebRTC      │
│  Server         │ │  (Auth, Deep     │ │  Service             │
│  (REST API)     │ │   Link, Grades)  │ │  (Signaling, TURN)   │
└────────┬────────┘ └────────┬─────────┘ └──────────┬───────────┘
         │                   │                      │
         ▼                   ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Message Queue (async jobs)                 │
│              (Transcription, AI Eval, Recording Processing)      │
└──────────────────────────────┬───────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│  AI Orchestrator│ │  Transcription   │ │  Recording           │
│  (LLM calls,   │ │  Worker          │ │  Processor           │
│   rubric eval)  │ │  (Speech-to-Text)│ │  (Encoding, Storage) │
└────────┬────────┘ └────────┬─────────┘ └──────────┬───────────┘
         │                   │                      │
         ▼                   ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Data Tier                                │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │ Postgres │  │ Object Store │  │   Redis     │  │ Vector   │  │
│  │ (primary │  │ (S3-compat.  │  │  (cache,    │  │   DB     │  │
│  │  DB)     │  │  recordings) │  │   sessions) │  │(embeddings│  │
│  └──────────┘  └──────────────┘  └─────────────┘  └──────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Descriptions

### 4.1 Client Tier

| Component | Description |
|---|---|
| **Instructor Web App** | SPA (React/Next.js) for course, exam, rubric, and grading management. |
| **Student Web App** | SPA for taking examinations; renders 3D avatar (Three.js / Ready Player Me), handles audio/text modes, manages WebRTC streams. |
| **LMS** | External systems that launch StuPath via LTI 1.3. |

### 4.2 Application Server (API)

- **Framework**: Node.js (NestJS) or Python (FastAPI/Django) — to be decided.
- **Responsibilities**: Authentication, authorization, CRUD for courses/exams/rubrics, orchestrating exam sessions, serving transcript/grading data.
- **Auth**: JWT-based sessions; LTI launch tokens validated per IMS Security Framework 1.0.

### 4.3 LTI 1.3 Service

- Implements the LTI 1.3 Advantage spec:
  - **Core Launch** — OIDC-based login initiation and resource link launch.
  - **Deep Linking** — Instructor selects/creates exams from within the LMS.
  - **Assignment and Grade Services (AGS)** — Posts scores back to the LMS gradebook.
  - **Names and Role Provisioning Services (NRPS)** — Syncs enrolled students and roles.
- Library: `ltijs` (Node.js) or `pylti1p3` (Python).

### 4.4 Media / WebRTC Service

- **Signaling Server**: WebSocket-based signaling for peer connection setup.
- **Session Reconnection**: Server tracks last event ID per session; on reconnect, client sends `session:reconnect` with `lastEventId` and server replays missed events.
- **TURN/STUN**: Deployed or cloud-managed relay for NAT traversal.
- **Recording**: Server-side composite recording (student camera + avatar) via media server (e.g., LiveKit, Janus, or MediaSoup). Camera and microphone are active in all modalities (including text mode).
- **Avatar Rendering**: Client-side 3D avatar driven by TTS lip-sync; rendered via WebGL.

### 4.5 AI Orchestrator

- **LLM Integration**: Calls to OpenAI GPT-4 (or equivalent) for:
  - Generating follow-up questions based on student responses.
  - Evaluating transcripts against rubrics.
  - Generating integrity analysis reports.
  - Generating draft rubrics from course materials.
- **Prompt Management**: Versioned prompt templates stored in the database; depth parameter (0–10) maps to prompt variants. **Note:** The source requirements state "We will need to adjust prompting to determine what these arbitrary numbers mean." A calibration effort is required to define each depth level's behavior (number of follow-ups, complexity of probing). This mapping should be developed iteratively with faculty testers and documented alongside the prompt templates.
- **Silence Escalation**: Monitors the delay response timer and drives the escalation sequence (prompt → rephrase → advance) via the active modality (avatar speech, audio, or text).
- **Speech-to-Text**: OpenAI Whisper or cloud STT (Google, AWS Transcribe) for real-time transcription. Post-processing applies "anticipated" normalization — inferring intended words and applying spelling, grammar, and punctuation corrections. Pauses are annotated as `[pause X seconds]`.
- **Text-to-Speech**: Cloud TTS for avatar/audio voice output.
- **Embeddings**: Course materials are chunked, embedded, and stored in a vector database for RAG-based question generation.

### 4.6 Message Queue

- **Technology**: RabbitMQ, Amazon SQS, or Redis Streams.
- **Queues**:
  - `transcription` — Audio chunks for STT processing.
  - `ai-evaluation` — Completed transcripts for rubric evaluation.
  - `recording-processing` — Raw recordings for encoding and storage.
  - `notification` — Exam completion and evaluation-ready notifications to instructors.

### 4.7 Data Tier

| Store | Purpose | Technology |
|---|---|---|
| **Primary Database** | Relational data (users, courses, exams, rubrics, grades, transcripts) | PostgreSQL 16+ |
| **Object Storage** | Exam recordings (video/audio), uploaded materials (PDF, Word), ID images | S3-compatible (AWS S3, MinIO, GCS) |
| **Cache** | Session state, rate limiting, real-time exam state | Redis |
| **Vector Database** | Course material embeddings for RAG | pgvector extension or Pinecone |

---

## 5. Technology Stack Recommendation

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 19 + Next.js 15 | SSR for SEO (marketing pages), SPA for app; large ecosystem. |
| 3D Avatar | Three.js + Ready Player Me SDK | Web-native 3D rendering; avatar customization. |
| Backend API | NestJS (TypeScript) | Strong typing, modular architecture, LTI library support. |
| Real-time | WebSocket (Socket.IO) + WebRTC | Bi-directional comms for exam session + media streaming. |
| AI/ML | OpenAI API (GPT-4, Whisper, TTS) | Best-in-class language and speech models. |
| Database | PostgreSQL + pgvector | Mature relational DB with vector search extension. |
| Queue | Redis Streams or RabbitMQ | Lightweight async processing. |
| Object Storage | AWS S3 / GCS | Durable, scalable blob storage. |
| Infrastructure | Docker + Kubernetes | Container orchestration for horizontal scaling. |
| CI/CD | GitHub Actions | Automated testing and deployment pipelines. |
| Monitoring | Prometheus + Grafana + Sentry | Metrics, dashboards, and error tracking. |

---

## 6. Deployment Architecture

### 6.1 Environments

| Environment | Purpose |
|---|---|
| **Development** | Local Docker Compose for developers. |
| **Staging** | Cloud-hosted Kubernetes cluster mirroring production; used for QA and LTI certification testing. |
| **Production** | Multi-AZ Kubernetes cluster with auto-scaling; managed database and object storage. |

### 6.2 Scaling Strategy

| Component | Scaling Approach |
|---|---|
| Application Server | Horizontal pod autoscaler (HPA) based on CPU/request rate. |
| Media Service | Scale by number of concurrent exam sessions; GPU nodes for avatar rendering if server-side. |
| AI Workers | Queue-depth-based autoscaling; burst capacity for post-exam evaluation waves. |
| Database | Vertical scaling + read replicas; connection pooling via PgBouncer. |
| Object Storage | Managed service auto-scaling (S3/GCS). |

---

## 7. Security Architecture

| Concern | Approach |
|---|---|
| **Authentication** | LTI 1.3 OIDC launch for LMS users; JWT access + refresh tokens for direct login. |
| **Authorization** | Role-based access control (RBAC): institution admin, instructor, student. |
| **Data at Rest** | AES-256 encryption for database and object storage. |
| **Data in Transit** | TLS 1.3 for all connections; DTLS for WebRTC media. |
| **PII Handling** | ID images and recordings encrypted; access logged; retention policies configurable per institution. |
| **FERPA Compliance** | Data residency controls; audit logging; data deletion upon request. |
| **Browser Lockdown** | Client-side implementation replicating Respondus Lockdown Browser features: full-screen enforcement, new tab/window prevention, app-switching detection, copy/paste/print-screen disabled, right-click disabled, VM detection. All lockdown events logged server-side. |

---

## 8. Infrastructure Diagram (Cloud)

```
┌─────────────────────────── AWS / GCP ───────────────────────────┐
│                                                                  │
│  ┌──────────────┐     ┌──────────────────────────────────────┐   │
│  │  CloudFront  │────▶│  ALB / Cloud Load Balancer           │   │
│  │  (CDN)       │     └──────────────┬───────────────────────┘   │
│  └──────────────┘                    │                           │
│                        ┌─────────────┼─────────────┐             │
│                        ▼             ▼             ▼             │
│                   ┌─────────┐  ┌──────────┐  ┌──────────┐       │
│                   │ App Pod │  │ LTI Pod  │  │ Media Pod│       │
│                   │ (×N)    │  │ (×N)     │  │ (×N)     │       │
│                   └────┬────┘  └────┬─────┘  └────┬─────┘       │
│                        │            │              │             │
│  ┌─────────────────────┼────────────┼──────────────┼──────────┐  │
│  │                Kubernetes Cluster (EKS/GKE)                │  │
│  └─────────────────────┼────────────┼──────────────┼──────────┘  │
│                        │            │              │             │
│  ┌─────────┐    ┌──────┴──┐   ┌────┴────┐   ┌────┴────┐        │
│  │ Redis   │    │ Postgres│   │   S3    │   │ Queue   │        │
│  │ Cluster │    │ (RDS)   │   │ Bucket  │   │ (SQS)   │        │
│  └─────────┘    └─────────┘   └─────────┘   └─────────┘        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Key Technical Decisions (Open)

| Decision | Options | Status |
|---|---|---|
| Backend language | TypeScript (NestJS) vs. Python (FastAPI) | Open |
| Media server | LiveKit vs. Janus vs. MediaSoup | Open |
| Avatar framework | Ready Player Me vs. custom Three.js vs. 2D animated | Open |
| LLM provider | OpenAI vs. Anthropic vs. self-hosted open-source | Open |
| Browser lockdown approach | Custom JS-based (Respondus feature parity) vs. Respondus API integration vs. hybrid | Open — source requires "duplicating Respondus settings" |
| Hosting provider | AWS vs. GCP vs. Azure | Open |
