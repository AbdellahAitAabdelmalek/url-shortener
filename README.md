# URL Shortener

Turn a long link into a short one that redirects to the original URL.

## Getting started

### Run the app (Docker only)

```sh
docker compose up --build
```

Open http://localhost:4000. The API serves the built front-end, so everything runs on a single origin.

Ports can be changed if they are already in use: `APP_PORT=8080 DB_PORT=5434 docker compose up --build`.

### Develop locally

Requirements: Node.js 26 (`nvm use`) and Docker (for PostgreSQL).

```sh
npm install
cp .env.example .env
docker compose up -d db   # PostgreSQL on port 5433
npm run dev               # api on http://localhost:4000, web on http://localhost:5173
```

In development, Vite proxies `/api` to the API.

### Run the tests

The API tests run against a real PostgreSQL database (`url_shortener_test`, created on the first start of the `db` container):

```sh
docker compose up -d db
npm test
```

## Project structure

```
apps/
  api/        Fastify + TypeScript: REST API and redirections
  web/        React + Vite + TypeScript: the shortening form
packages/
  shared/     Zod schemas shared by api and web (the API contract)
```

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run dev`       | Start api and web in watch mode    |
| `npm run lint`      | Lint and format check (Biome)      |
| `npm run format`    | Apply lint fixes and formatting    |
| `npm run typecheck` | Type-check every workspace         |
| `npm test`          | Run every workspace's tests        |
| `npm run build`     | Build every workspace              |
