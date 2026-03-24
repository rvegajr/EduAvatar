# StuPath Avatar — Deployment Guide

## Prerequisites

| Dependency | Minimum Version | Notes |
|---|---|---|
| Node.js | 20 LTS | Runtime for API and web build |
| PostgreSQL | 16 | Primary data store |
| Redis | 7 | Caching, rate limiting, audit streams, pub/sub |
| S3-compatible storage | — | AWS S3, MinIO, or DigitalOcean Spaces |
| Docker | 24+ | Container builds and local development |
| Kubernetes | 1.28+ | Optional — production orchestration |

---

## Environment Variables

Create a `.env` file in the repository root (see `.env.example`). All values are required unless noted otherwise.

### Core

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | API server port | `3001` |
| `APP_URL` | Public URL of the web app (CORS origin) | `https://app.stupath.com` |
| `API_URL` | Public URL of the API | `https://app.stupath.com/api` |

### Database

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/stupath?schema=public` |

### Redis

| Variable | Description | Example |
|---|---|---|
| `REDIS_URL` | Redis connection string | `redis://:password@redis:6379` |

### Storage (S3)

| Variable | Description | Example |
|---|---|---|
| `S3_ENDPOINT` | S3-compatible endpoint URL | `https://s3.amazonaws.com` |
| `S3_BUCKET` | Bucket name | `stupath-avatar` |
| `S3_ACCESS_KEY` | Access key ID | — |
| `S3_SECRET_KEY` | Secret access key | — |
| `S3_REGION` | Bucket region | `us-east-1` |

### Authentication & LTI

| Variable | Description | Example |
|---|---|---|
| `JWT_SECRET` | Secret for signing JWTs | (random 64-char string) |
| `JWT_EXPIRATION` | Token TTL | `24h` |
| `LTI_PLATFORM_URL` | LMS platform URL | `https://canvas.example.edu` |
| `LTI_CLIENT_ID` | LTI 1.3 client ID | — |
| `LTI_DEPLOYMENT_ID` | LTI deployment ID | — |
| `LTI_AUTH_ENDPOINT` | OIDC auth endpoint on the LMS | — |
| `LTI_TOKEN_ENDPOINT` | OAuth2 token endpoint on the LMS | — |
| `LTI_KEYSET_ENDPOINT` | JWKS endpoint on the LMS | — |
| `LTI_PRIVATE_KEY_PATH` | Path to RSA private key for tool signing | `/secrets/lti-private.pem` |

### AI Services

| Variable | Description | Example |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key for evaluation and avatar | — |
| `OPENAI_MODEL` | Model identifier | `gpt-4o` |
| `DEEPGRAM_API_KEY` | Speech-to-text API key | — |

### Data Retention

| Variable | Description | Example |
|---|---|---|
| `RETENTION_RECORDINGS_DAYS` | Days to retain session recordings | `365` |
| `RETENTION_ID_IMAGES_DAYS` | Days to retain ID verification images | `90` |
| `RETENTION_SOFT_DELETE_DAYS` | Days before hard-deleting soft-deleted entities | `90` |

### Monitoring

| Variable | Description | Example |
|---|---|---|
| `SENTRY_DSN` | Sentry error tracking DSN | `https://abc@sentry.io/123` |
| `PROMETHEUS_ENABLED` | Enable Prometheus metrics endpoint | `true` |

---

## Docker Deployment

### Local Development

```bash
# Build and start all services
docker compose up --build

# Run in detached mode
docker compose up -d
```

The default `docker-compose.yml` starts:

- **api** — NestJS API on port 3001
- **web** — Next.js app on port 3000
- **postgres** — PostgreSQL 16 on port 5432
- **redis** — Redis 7 on port 6379
- **minio** — S3-compatible storage on port 9000 (console on 9001)

### Production Docker Build

```dockerfile
# API
docker build -t stupath-api -f apps/api/Dockerfile .

# Web
docker build -t stupath-web -f apps/web/Dockerfile .
```

---

## Database Migrations

StuPath uses Prisma for database schema management.

```bash
# Apply all pending migrations (production)
npx prisma migrate deploy

# Create a new migration during development
npx prisma migrate dev --name <migration-name>

# Reset the database (development only — destroys data)
npx prisma migrate reset

# Generate the Prisma client after schema changes
npx prisma generate
```

Always run `npx prisma migrate deploy` as part of your CI/CD pipeline before starting the API container.

---

## Kubernetes Deployment

A set of Kubernetes manifests is provided in `k8s/`. The deployment consists of:

| Resource | File | Description |
|---|---|---|
| Namespace | `namespace.yaml` | `stupath` namespace |
| API Deployment | `api-deployment.yaml` | 2–10 replicas, resource limits, health probes |
| Web Deployment | `web-deployment.yaml` | 2–6 replicas, Next.js standalone output |
| Services | `api-service.yaml`, `web-service.yaml` | ClusterIP services |
| Ingress | `ingress.yaml` | TLS-terminated ingress with path-based routing |
| ConfigMap | `configmap.yaml` | Non-secret environment variables |
| Secrets | `secrets.yaml` | Sensitive values (create from `.env`) |
| HPA | `hpa.yaml` | Horizontal Pod Autoscaler targeting 70% CPU |
| CronJob | `data-retention-cron.yaml` | Nightly data retention tasks |

### Quick Start

```bash
# Create the namespace and apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/

# Verify pods are running
kubectl get pods -n stupath

# Check API health
kubectl exec -n stupath deploy/api -- curl -s localhost:3001/api/v1/health
```

---

## SSL / TLS Configuration

### With a Reverse Proxy (recommended)

Terminate TLS at nginx, Caddy, or a cloud load balancer. Example nginx snippet:

```nginx
server {
    listen 443 ssl http2;
    server_name app.stupath.com;

    ssl_certificate     /etc/ssl/certs/stupath.crt;
    ssl_certificate_key /etc/ssl/private/stupath.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for exam sessions
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### With Kubernetes

Use cert-manager with a Let's Encrypt ClusterIssuer:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
```

The provided `ingress.yaml` includes a `cert-manager.io/cluster-issuer` annotation that automatically provisions and renews certificates.

---

## Monitoring

### Prometheus Metrics

When `PROMETHEUS_ENABLED=true`, the API exposes a `/metrics` endpoint with:

- HTTP request duration and count (by method, route, status)
- WebSocket connection count
- Active exam sessions gauge
- Queue job counts (waiting, active, completed, failed)
- Node.js process metrics (memory, CPU, event loop lag)

### Grafana Dashboard

Import the provided dashboard from `monitoring/grafana-dashboard.json` into your Grafana instance. It includes panels for:

- Request rate and latency (p50, p95, p99)
- Error rate by endpoint
- Active WebSocket connections
- Queue throughput and backlog
- Database connection pool utilization
- Pod resource usage (CPU, memory)

### Sentry Error Tracking

Set the `SENTRY_DSN` environment variable to enable automatic error capture. The integration:

- Captures all unhandled exceptions with full stack traces
- Attaches request context (URL, headers, user ID)
- Tracks performance via transaction sampling (configure `SENTRY_TRACES_SAMPLE_RATE`, default `0.1`)

### Health Checks

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health` | Basic liveness probe — returns 200 if the process is running |
| `GET /api/v1/health/ready` | Readiness probe — verifies database and Redis connectivity |

---

## Backup Strategy

### Database

- **Automated daily backups** using `pg_dump` or your managed PostgreSQL provider's snapshot feature.
- Retain at least **30 days** of daily backups and **12 months** of monthly backups.
- Test restore procedures quarterly.

```bash
# Manual backup
pg_dump $DATABASE_URL --format=custom --file=backup-$(date +%Y%m%d).dump

# Restore
pg_restore --dbname=$DATABASE_URL backup-20260324.dump
```

### S3 Storage

- Enable **versioning** on the S3 bucket to protect against accidental deletions.
- Configure a **lifecycle policy** to transition older versions to Glacier after 90 days.
- For critical data, enable **cross-region replication** to a secondary bucket.

### Redis

- Redis data is ephemeral by design (rate limits, cache). Persistent data (audit logs) should be periodically exported to the database or a log aggregation service.
- If using Redis persistence, configure AOF with `appendfsync everysec`.

### Disaster Recovery

- **RTO target**: 4 hours
- **RPO target**: 1 hour
- Maintain infrastructure-as-code (Terraform / Pulumi) so the full stack can be reproduced from scratch.
- Document the recovery runbook and rehearse it at least twice per year.
