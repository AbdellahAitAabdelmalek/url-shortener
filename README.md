# URL Shortener

Turn a long link into a short one that redirects to the original URL.

## How to run the project locally

With Docker only:

```sh
docker compose up --build
```

Then open http://localhost:4000. If a port is taken: `APP_PORT=8080 DB_PORT=5434 docker compose up --build`.

For development (Node.js 26 and Docker):

```sh
nvm use
npm install
cp .env.example .env
docker compose up -d db   # PostgreSQL
npm run dev               # web on http://localhost:5173, API on http://localhost:4000
```

## Main technical choices

- **Monorepo**: `apps/api` (Fastify), `apps/web` (React, Vite, TanStack Query, shadcn/ui) and `packages/shared`.
- **One contract**: the Zod schemas of `packages/shared` validate the form, the API requests and, in the web app, the API responses. TypeScript types are inferred from them.
- **PostgreSQL with Drizzle**: readable SQL, versioned migrations applied at startup.
- **Short codes**: 7 random characters (nanoid) from a 57-character alphabet without look-alikes (0/O, 1/l/I): 57⁷ ≈ 1.95 × 10¹² codes. Being random, they cannot be guessed by incrementing, unlike sequential ids. A unique constraint catches collisions and the code is regenerated.
- **One link per URL**: URLs are normalized, then unique in the database. `stoik.com`, `HTTPS://STOIK.COM` and `https://stoik.com:443/` all become `https://stoik.com/`, so they share one link. Shortening a URL again returns its existing link with a 200, including under concurrent requests.
- **302, not 301**: browsers cache a 301 for good, so a link could no longer be disabled, nor its clicks counted.
- **Security**: only `http://` and `https://` links to a domain name are accepted (`javascript:`, `data:`, `file:`, localhost, IP addresses and credentials in the URL are rejected), link creation is rate limited, and security headers are set (Helmet).
- **Single origin**: Fastify serves the API, the redirections and the built front-end. One container, no CORS.

## Assumptions and shortcuts

- **Internal tool**: no authentication, and anyone with a short link can follow it. This is also why one URL gives one link.
- **Duplicates**: only spellings of the very same URL share a link (see the normalization above). URLs that may show the same page but differ get different links, since only the target site knows whether they are equivalent. For example, each of these pairs gives two links:
  - `https://stoik.com/blog` and `https://stoik.com/blog/` (trailing slash)
  - `https://stoik.com/?q=cyber&page=2` and `https://stoik.com/?page=2&q=cyber` (parameter order)
  - `https://stoik.com/faq#pricing` and `https://stoik.com/faq#contact` (fragment)
- **Links are permanent**: no expiration, edition or deletion.
