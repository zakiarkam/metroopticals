# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma engines on Alpine typically need openssl + libc compatibility
RUN apk add --no-cache openssl libc6-compat

# Copy package files + prisma schema early for caching
COPY package.json ./
COPY package-lock.json* ./
COPY prisma ./prisma
# Copy next.config.mjs if it exists (will be validated later)
COPY next.config.mjs* ./


# Install deps:
# - Use npm ci if package-lock.json exists
# - Otherwise fallback to npm install (will generate a lockfile inside image, but not in repo)
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copy remaining source
COPY . .

# Ensure next.config.mjs exists
RUN if [ ! -f next.config.mjs ]; then echo "ERROR: next.config.mjs not found"; exit 1; fi

# Generate Prisma client
RUN npx prisma generate

# Dummy envs for build time only
ENV RESEND_API_KEY=dummy_build_key \
    DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy \
    NEXTAUTH_SECRET=dummy_build_secret \
    NEXTAUTH_URL=http://localhost:3000

# Build Next.js
RUN npm run build

RUN node -p "JSON.stringify(require('./.next/required-server-files.json').config.images, null, 2)"
RUN node -e "const imgs=require('./.next/required-server-files.json').config.images; if(!imgs.domains || !imgs.domains.includes('storage.googleapis.com')) { console.error('Images config missing storage.googleapis.com'); process.exit(1);} console.log('OK images config');"

# Remove dev deps for smaller runtime
RUN npm prune --omit=dev


# Stage 2: Runtime (standalone)
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache dumb-init curl openssl libc6-compat iproute2

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# ✅ Copy standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
