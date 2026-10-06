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
    STATIC_DIR=/app/public
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/web/dist ./public
USER node
EXPOSE 4000
CMD ["node", "dist/server.mjs"]
