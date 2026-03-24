# StuPath Avatar — Non-Functional Requirements Specification

| Field | Value |
|---|---|
| **Document** | Non-Functional Requirements Specification |
| **Version** | 1.0 (Draft) |
| **Date** | 2026-03-23 |
| **Status** | Draft |

---

## 1. Overview

This document specifies the non-functional requirements (NFRs) for StuPath Avatar covering performance, scalability, reliability, security, privacy, accessibility, maintainability, and operational concerns.

---

## 2. Performance

| ID | Requirement | Target | Measurement |
|---|---|---|---|
| PF-001 | API response time for CRUD operations. | p95 < 200ms | Application performance monitoring (APM). |
| PF-002 | Page load time (initial, instructor dashboard). | < 2 seconds (LCP) | Lighthouse / Web Vitals. |
| PF-003 | Page load time (student exam lobby). | < 1.5 seconds (LCP) | Lighthouse / Web Vitals. |
| PF-004 | Avatar rendering frame rate. | ≥ 30 FPS on mid-range hardware | Client-side FPS counter. |
| PF-005 | Audio latency (student speech → AI response begins). | < 3 seconds | End-to-end timing instrumentation. |
| PF-005a | Silence escalation latency (delay timer expires → AI delivers escalation prompt). | < 1 second | End-to-end timing instrumentation. |
| PF-006 | Transcript generation after exam completion (using "anticipated" normalization — AI infers intended words, applies spelling/grammar/punctuation). | < 5 minutes for a 30-minute exam | Queue processing metrics. |
| PF-007 | AI evaluation generation after transcript is ready. | < 3 minutes | Queue processing metrics. |
| PF-008 | Video seek on transcript click. | < 500ms to begin playback | Client-side timing. |
| PF-009 | LTI launch to exam-ready screen. | < 3 seconds | End-to-end timing from LMS click. |
| PF-010 | Grade passback to LMS. | < 30 seconds | LTI AGS response timing. |

---

## 3. Scalability

| ID | Requirement | Target | Notes |
|---|---|---|---|
| SC-001 | Concurrent exam sessions. | 1,000 simultaneous sessions | Per deployment; scales horizontally. |
| SC-002 | Total registered users per institution. | 100,000+ | Database and auth layer must handle. |
| SC-003 | Total exams per institution. | 10,000+ | Efficient indexing and pagination. |
| SC-004 | File storage per institution. | 1 TB+ | Object storage (S3) is effectively unlimited. |
| SC-005 | AI evaluation queue throughput. | Process 500 evaluations/hour | Worker auto-scaling based on queue depth. |
| SC-006 | Horizontal scaling of application pods. | 2 → 20 pods in < 5 minutes | Kubernetes HPA configuration. |

---

## 4. Reliability & Availability

| ID | Requirement | Target | Notes |
|---|---|---|---|
| RL-001 | System uptime (excluding planned maintenance). | 99.9% (8.76 hours downtime/year) | Measured monthly. |
| RL-002 | Planned maintenance windows. | < 4 hours/month, scheduled off-peak | Communicated 72 hours in advance. |
| RL-003 | Recovery Time Objective (RTO). | < 1 hour | From incident detection to service restoration. |
| RL-004 | Recovery Point Objective (RPO). | < 5 minutes | Database point-in-time recovery. |
| RL-005 | Exam session resilience. | Auto-reconnect within 60 seconds on network interruption | Client reconnects WebSocket; session state preserved; partial recording saved if reconnection fails. |
| RL-006 | Data durability. | 99.999999999% (11 nines) | Provided by S3/GCS for recordings. |
| RL-007 | Database backups. | Automated daily full + continuous WAL archiving | Point-in-time restore capability. |
| RL-008 | Zero data loss on exam session. | Recording continues during brief disconnections; audio buffered locally | Client-side buffer + retry upload. |

---

## 5. Security

| ID | Requirement | Target | Notes |
|---|---|---|---|
| SE-001 | Data in transit encryption. | TLS 1.3 for HTTPS; DTLS for WebRTC | No unencrypted connections. |
| SE-002 | Data at rest encryption. | AES-256 | Database (RDS encryption), S3 (SSE-S3 or SSE-KMS). |
| SE-003 | Authentication. | LTI 1.3 OIDC + JWT (RS256 signed) | Token rotation enforced. |
| SE-004 | Authorization. | Role-based access control (RBAC) | Enforced at API middleware layer. |
| SE-005 | Session management. | Access token: 15 min; Refresh token: 7 days; idle timeout: 30 min | Refresh tokens are single-use (rotation). |
| SE-006 | Input validation. | All inputs validated server-side | Prevent SQL injection, XSS, CSRF. |
| SE-007 | File upload security. | Virus scan on upload; file type validation; max size enforced | Reject executables and unexpected MIME types. |
| SE-008 | Dependency management. | Automated vulnerability scanning (Dependabot/Snyk) | Critical vulnerabilities patched within 48 hours. |
| SE-009 | Penetration testing. | Annual third-party pen test | Findings remediated within 30 days (critical) / 90 days (medium). |
| SE-010 | Audit logging. | All authentication, authorization, and data access events logged | Logs retained ≥ 1 year; tamper-resistant. |
| SE-011 | Secrets management. | No secrets in code; use Vault or cloud KMS | Secrets rotated quarterly. |
| SE-012 | Rate limiting. | Per-endpoint limits (see API spec) | Prevents brute force and abuse. |

---

## 6. Privacy & Compliance

| ID | Requirement | Standard | Notes |
|---|---|---|---|
| PR-001 | FERPA compliance. | FERPA | Student education records protected; no disclosure without consent. |
| PR-002 | Data minimization. | FERPA / GDPR principles | Collect only data necessary for exam function. |
| PR-003 | ID verification data retention. | 90 days max | Automatically purged after retention period. |
| PR-004 | Recording retention. | Configurable (default 1 year) | Institution sets policy; system enforces purge. |
| PR-005 | Right to data export. | FERPA | Students can request their exam data (transcript, recording). |
| PR-006 | Data processing agreements. | Required with all sub-processors | OpenAI, cloud providers, etc. |
| PR-007 | Data residency. | Configurable per institution | Architecture supports region-specific deployments. |
| PR-008 | Consent management. | Record student consent for recording | Consent screen before exam start; refusal prevents exam. |
| PR-009 | COPPA applicability. | Not applicable | Platform is for higher education (18+). |

---

## 7. Accessibility

| ID | Requirement | Standard | Notes |
|---|---|---|---|
| AC-001 | WCAG 2.1 Level AA conformance. | WCAG 2.1 | All instructor and student interfaces. |
| AC-002 | Keyboard-only operation. | WCAG 2.1.1 | All functionality reachable without mouse. |
| AC-003 | Screen reader compatibility. | ARIA 1.1 | Tested with NVDA, JAWS, VoiceOver. |
| AC-004 | Color contrast. | WCAG 1.4.3 | Minimum 4.5:1 for normal text, 3:1 for large text and UI. |
| AC-005 | Text resizing. | WCAG 1.4.4 | Content reflows at 200% zoom without horizontal scrolling. |
| AC-006 | Captions for AI speech. | WCAG 1.2.4 | Real-time transcript serves as captions in all modalities. |
| AC-007 | Reduced motion support. | WCAG 2.3.3 | Respect `prefers-reduced-motion`; disable avatar animations. |
| AC-008 | Focus indicators. | WCAG 2.4.7 | Visible focus ring on all interactive elements. |
| AC-009 | Error identification. | WCAG 3.3.1 | Form errors clearly described and associated with fields. |
| AC-010 | Alternative to voice input. | Text modality | Students who cannot use voice can select text modality. |
| AC-011 | Timer visibility is student-controlled. | Student preference | Students who find countdown timers anxiety-inducing can hide the visual timer while still receiving auditory/text time reminders. |

---

## 8. Maintainability

| ID | Requirement | Target | Notes |
|---|---|---|---|
| MT-001 | Code coverage (unit tests). | ≥ 80% | Measured by CI; blocking on PR if below threshold. |
| MT-002 | Code coverage (integration tests). | ≥ 60% | Key flows (exam session, grading, LTI launch). |
| MT-003 | End-to-end test suite. | Critical paths covered | Exam creation → student take → grading → LTI passback. |
| MT-004 | Code style enforcement. | Automated (ESLint, Prettier) | Pre-commit hooks + CI checks. |
| MT-005 | Documentation. | API docs auto-generated (OpenAPI 3.0) | Swagger UI available in staging/dev. |
| MT-006 | Dependency updates. | Automated weekly (Dependabot) | Security patches prioritized. |
| MT-007 | Database migrations. | Versioned, reversible migrations | Using a migration framework (e.g., Prisma Migrate, Alembic). |
| MT-008 | Feature flags. | Feature flag system for progressive rollout | New features gated by flags in production. |

---

## 9. Observability

| ID | Requirement | Target | Notes |
|---|---|---|---|
| OB-001 | Structured logging. | JSON format with correlation IDs | Shipped to centralized logging (ELK, CloudWatch). |
| OB-002 | Application metrics. | Prometheus-compatible metrics endpoint | Request rate, latency, error rate, queue depth. |
| OB-003 | Dashboards. | Grafana dashboards for key metrics | Separate dashboards for API, AI workers, media, LTI. |
| OB-004 | Alerting. | PagerDuty/Opsgenie integration | Alerts on: error rate spike, latency degradation, queue backlog, disk/CPU thresholds. |
| OB-005 | Distributed tracing. | OpenTelemetry traces across services | Trace exam session from LTI launch to grade submission. |
| OB-006 | Error tracking. | Sentry (or equivalent) | Automatic capture of unhandled exceptions with context. |
| OB-007 | Uptime monitoring. | External synthetic checks every 60 seconds | Monitors LTI endpoints, API health, and WebSocket connectivity. |

---

## 10. Compatibility

| ID | Requirement | Target | Notes |
|---|---|---|---|
| CP-001 | Browser support. | Chrome (latest 2), Firefox (latest 2), Edge (latest 2), Safari (latest 2) | WebRTC required for avatar/audio mode. |
| CP-002 | Operating system. | Windows 10+, macOS 12+, ChromeOS, Ubuntu 22+ | For students and instructors. |
| CP-003 | Minimum bandwidth. | 2 Mbps upload, 5 Mbps download | For video + audio streaming. |
| CP-004 | LMS versions. | Canvas (current), Blackboard Learn Ultra, Moodle 4.x, Brightspace 2024+ | LTI 1.3 Advantage required. |
| CP-005 | Screen resolution. | Minimum 1280×720 | Responsive layout handles larger screens. |

---

## 11. Internationalization (Future — v2.0)

| ID | Requirement | Notes |
|---|---|---|
| I18-001 | UI text externalized for translation. | All strings in resource files from day one. |
| I18-002 | RTL layout support. | CSS logical properties used throughout. |
| I18-003 | Date/time localization. | Use ISO 8601 internally; display per user locale. |
| I18-004 | Multi-language AI examinations. | Requires multilingual STT/TTS and LLM prompts. |

---

## 12. Deployment & Operations

| ID | Requirement | Target | Notes |
|---|---|---|---|
| DO-001 | CI/CD pipeline. | Fully automated build → test → deploy | GitHub Actions or equivalent. |
| DO-002 | Deployment strategy. | Rolling updates with zero downtime | Kubernetes rolling deployment. |
| DO-003 | Rollback capability. | < 5 minutes to rollback to previous version | Kubernetes revision history + database migration rollback. |
| DO-004 | Infrastructure as Code. | 100% of infrastructure defined in code | Terraform or Pulumi. |
| DO-005 | Environment parity. | Dev ≈ Staging ≈ Production | Same container images; config differs via environment variables. |
| DO-006 | Disaster recovery. | Documented and tested DR plan | DR drill annually; cross-region failover for production. |
