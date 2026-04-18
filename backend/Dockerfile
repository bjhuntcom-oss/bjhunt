FROM oven/bun:1-slim AS base
WORKDIR /app

# Build-time arguments injected by CI / docker compose build
# - GIT_COMMIT: short SHA of the deployed commit (used by /api/health/version)
# - BUILD_TIMESTAMP: ISO 8601 build time
ARG GIT_COMMIT=unknown
ARG BUILD_TIMESTAMP=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
ENV BUILD_TIMESTAMP=${BUILD_TIMESTAMP}

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source
COPY src/ src/
COPY tsconfig.json ./

# Runtime
EXPOSE 3001
USER bun
CMD ["bun", "run", "src/index.ts"]
