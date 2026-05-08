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

## 5. API endpoints

- `GET /` returns app status message
- `GET /health` checks API + database connection

## 6. Swagger docs

- OpenAPI JSON + UI is available at `GET /docs`
- Local URL: `http://localhost:3000/docs`

// admin token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3NzgxMDMyNTUsImV4cCI6MTc3ODE4OTY1NX0.t5u4Bz9FmekG_akXtjh32Iea0CUxsPTi0vHXLUj38y8

// client token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImVtYWlsIjoiam9obkBnbWFpbC5jb20iLCJyb2xlIjoiQ0xJRU5UIiwiaWF0IjoxNzc4MTAzMzY0LCJleHAiOjE3NzgxODk3NjR9.pvHKVPQUGxr4LXsxTddi-RzKBgkr4z-3yV6OEgy6Ki8
