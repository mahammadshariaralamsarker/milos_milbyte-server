# NestJS + Prisma + Docker Setup

Production-ready starter for:

- NestJS 11
- Prisma ORM
- PostgreSQL (Docker)

## 1. Local setup (without Docker app container)

Start only PostgreSQL in Docker:

```bash
docker compose up -d postgres
```

Install dependencies and generate Prisma client:

```bash
npm install
npm run prisma:generate
```

Push schema to DB and run app:

```bash
npm run prisma:db:push
npm run start:dev
```

## 2. Full Docker setup (app + db)

```bash
npm run docker:start
```

Stop and remove containers and volume:

```bash
npm run docker:down
```

## 3. Useful Prisma commands

```bash
npm run prisma:generate
npm run prisma:db:push
npm run prisma:migrate:dev
npm run prisma:migrate:deploy
npm run prisma:studio
```

## 4. Environment

Copy `.env.example` to `.env` if needed. Default values are already set for local development:

- `PORT=3000`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/milos_milbyte?schema=public`

When running inside Docker Compose, the app uses:

- `postgresql://postgres:postgres@postgres:5432/milos_milbyte?schema=public`

For subscription emails, configure these SMTP variables in your environment:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (optional)

## 5. API endpoints

- `GET /` returns app status message
- `GET /health` checks API + database connection

## 6. Swagger docs

- OpenAPI JSON + UI is available at `GET /docs`
- Local URL: `http://localhost:3000/docs`

// admin token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzgyNjg2ODEsImV4cCI6MTc3ODM1NTA4MX0.xfIG4cPQEaBGqqkQVi8HgktZpLrSPmX_RRFQuAxB6b8

// client token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImVtYWlsIjoiam9obkBnbWFpbC5jb20iLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzc4MjY4ODg5LCJleHAiOjE3NzgzNTUyODl9.yGKn0o225bMIkWOJcKd1rs0L3RotYNs40IVTom0WD-Q
