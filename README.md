# URL Shortener

Turn a long link into a short one that redirects to the original URL.

## Getting started

Requirements: Node.js 26 (see `.nvmrc`) and Docker.

_To be completed._

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
| `npm run lint`      | Lint and format check (Biome)      |
| `npm run format`    | Apply lint fixes and formatting    |
| `npm run typecheck` | Type-check every workspace         |
| `npm test`          | Run every workspace's tests        |
| `npm run build`     | Build every workspace              |
