# StuPath Avatar

AI-powered oral examination platform for higher education. StuPath Avatar hosts and delivers engaging oral examinations to students via an AI avatar, evaluates the results, and provides transcripts, recordings, and evaluations to instructors.

## Prerequisites

- **Node.js** 20+
- **Docker** (for local development services)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/stupath-avatar.git
cd stupath-avatar

# Copy environment variables
cp .env.example .env

# Start local services (Postgres, Redis, MinIO)
npm run docker:up

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start all apps in development mode
npm run dev
```

The web app will be available at `http://localhost:3000` and the API at `http://localhost:3001`.

## Architecture

This is a monorepo managed with [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) and [Turborepo](https://turbo.build/repo).

```
stupath-avatar/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # NestJS API server (port 3001)
├── packages/
│   ├── db/           # Prisma schema, migrations, and client
│   └── shared/       # Shared TypeScript types and utilities
├── docker/           # Docker Compose and Dockerfiles
└── docs/             # Project documentation
```

## Available Scripts

| Script              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start all apps in development mode               |
| `npm run build`     | Build all apps and packages                      |
| `npm run lint`      | Lint all apps and packages                       |
| `npm run test`      | Run tests across all apps and packages           |
| `npm run db:generate` | Generate Prisma client                         |
| `npm run db:migrate`  | Run database migrations                        |
| `npm run db:seed`     | Seed the database                              |
| `npm run docker:up`   | Start local Docker services (Postgres, Redis, MinIO) |
| `npm run docker:down` | Stop local Docker services                     |

## Local Services

| Service  | Port(s)     | Credentials                        |
| -------- | ----------- | ---------------------------------- |
| Postgres | 5432        | `stupath` / `stupath`              |
| Redis    | 6379        | —                                  |
| MinIO    | 9000, 9001  | `minioadmin` / `minioadmin`        |

MinIO console is accessible at `http://localhost:9001`.

## CI/CD

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push to `main`/`develop` and on pull requests to `main`:

1. **Lint & Test** — installs dependencies, runs linting and tests against real Postgres and Redis service containers.
2. **Build** — builds all workspaces via Turborepo.
3. **Docker** — builds and pushes Docker images to GHCR (only on push to `main`).

## License

Proprietary — All rights reserved.
