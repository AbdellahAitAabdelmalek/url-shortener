# syntax=docker/dockerfile:1

FROM node:26-alpine AS base
WORKDIR /app

# Workspace manifests only: the install layer stays cached until dependencies change.
FROM base AS manifests
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

FROM manifests AS build
RUN npm ci
COPY . .
RUN npm run build -w @url-shortener/web && npm run build -w @url-shortener/api

FROM manifests AS prod-deps
RUN npm ci --omit=dev --workspace=@url-shortener/api

FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    STATIC_DIR=/app/apps/web/dist
# Keeps the workspace layout so that Node resolves each dependency where npm installed it
# (nanoid 6 lives in apps/api/node_modules: the root one is the 3.x used by the web tooling).
COPY --from=prod-deps /app ./
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/apps/web/dist ./apps/web/dist
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/server.mjs"]
