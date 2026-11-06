# syntax=docker/dockerfile:1

FROM node:22.23.2-bookworm-slim

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5000 \
    CAPSTONE_DATA_DIR=/app/data

WORKDIR /app

# Install only production dependencies from the committed lockfile.
COPY --chown=node:node package.json package-lock.json ./

# Prepare persistent data storage and grant ownership to the runtime user.
RUN mkdir -p /app/data \
    && chown -R node:node /app

USER node

RUN npm ci --omit=dev \
    && npm cache clean --force

# Copy application source without development files.
COPY --chown=node:node src ./src

EXPOSE 5000

# Verify that the API is responding.
HEALTHCHECK --interval=30s \
    --timeout=5s \
    --start-period=15s \
    --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:5000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]