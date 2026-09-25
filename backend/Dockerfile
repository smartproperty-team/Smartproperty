# ===========================================
# SmartProperty Backend - Dockerfile
# ===========================================
# Stages: base (all deps) -> dev | build -> prod-deps -> prod

FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# ---- Development: hot-reload ----
FROM base AS dev
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---- Compile TypeScript ----
FROM base AS build
WORKDIR /app
COPY . .
RUN npm run build

# ---- Runtime dependencies only ----
# Installed separately so the production image never carries the Nest CLI,
# Jest, ESLint or TypeScript. This repo is an npm workspace and the root
# lockfile is authoritative, so it is not present in this build context;
# `npm install --omit=dev` is used rather than `npm ci`, which requires one.
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# ---- Production ----
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

# Run unprivileged. node:20-alpine ships a `node` user already.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main"]
