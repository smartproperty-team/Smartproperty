# ===========================================
# SmartProperty Backend - Dockerfile
# ===========================================
# Multi-stage: deps → dev (with hot-reload) → build → prod

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies only (cached layer)
COPY package.json package-lock.json* ./
COPY scripts ./scripts
RUN npm install --legacy-peer-deps

# Development stage with hot-reload
FROM base AS dev
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Production build stage
FROM base AS build
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
