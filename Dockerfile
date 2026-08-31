# ── Base ──────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# Install native build tools needed by better-sqlite3 / bufferutil
RUN apk add --no-cache python3 make g++

# ── Dependencies ──────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
# Honour allowScripts list from package.json
RUN npm ci --omit=dev

# ── Application ───────────────────────────────────────────────────────────────
FROM base AS app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure the SQLite data directory exists and is writable
RUN mkdir -p /app/data && chmod 750 /app/data

EXPOSE 4000

# Use non-root user for security
RUN addgroup -S atlasxgrp && adduser -S atlasxuser -G atlasxgrp
RUN chown -R atlasxuser:atlasxgrp /app/data
USER atlasxuser

CMD ["node", "src/server.js"]
