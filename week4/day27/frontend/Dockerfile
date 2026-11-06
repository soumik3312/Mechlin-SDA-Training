# syntax=docker/dockerfile:1

# Build the React application.
FROM node:22.23.2-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Official NGINX unprivileged image.
# It runs as UID 101 and listens on port 8080.
FROM nginx/nginx-unprivileged:alpine3.24

COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s \
    --timeout=5s \
    --start-period=10s \
    --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1