#!/usr/bin/env bash

set -Eeuo pipefail

# TaskPilot AI — Final Demo Environment Setup
# This script does not start, stop or restart the AI support terminals.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../.." && pwd)"

COMPOSE_FILE="$REPO_ROOT/week4/day27/devops/docker-compose.yml"
ENV_FILE="$REPO_ROOT/week4/day27/devops/.env"
K8S_DIR="$REPO_ROOT/week4/day27/devops/k8s"

APP_URL="${TASKPILOT_URL:-http://localhost:8080}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

info() {
    printf "${CYAN}%s${NC}\n" "$1"
}

success() {
    printf "${GREEN}%s${NC}\n" "$1"
}

warning() {
    printf "${YELLOW}%s${NC}\n" "$1"
}

fail() {
    printf "${RED}%s${NC}\n" "$1" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 ||
        fail "Required command not found: $1"
}

info "TaskPilot AI — Final Demo Preparation"
info "====================================="

info "Checking prerequisites..."

for command_name in docker node python3 kubectl curl; do
    require_command "$command_name"
done

docker info >/dev/null 2>&1 ||
    fail "Docker is not running. Start Docker Desktop first."

docker compose version >/dev/null 2>&1 ||
    fail "Docker Compose plugin is unavailable."

success "Docker, Compose, Node.js, Python and kubectl are available."

# Validate Kubernetes manifests when this branch contains them.
if [[ -d "$K8S_DIR" ]]; then
    info "Rendering Kubernetes manifests..."
    kubectl kustomize "$K8S_DIR" >/dev/null
    success "Kubernetes manifests rendered successfully."
else
    warning "Day 27 Kubernetes files are not present in this checkout."
fi

# Do not rebuild or restart an application that is already available.
if curl --silent --fail --max-time 5 \
    "$APP_URL/health" >/dev/null; then

    success "TaskPilot is already responding at $APP_URL."
    success "Existing application containers will be left untouched."
    success "Demo environment is ready."
    exit 0
fi

# Starting TaskPilot requires the Day 27 project files and local .env.
if [[ ! -f "$COMPOSE_FILE" ]]; then
    fail "Day 27 Compose file is not present in this checkout. No files were changed. Run this setup from a repository checkout containing week4/day27."
fi

if [[ ! -f "$ENV_FILE" ]]; then
    fail "Day 27 devops/.env is missing. Configure it using devops/.env.example before starting the application."
fi

info "Validating Docker Compose configuration..."

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    config --quiet

info "Building and starting TaskPilot frontend and backend..."

docker compose \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE_FILE" \
    up -d --build backend frontend

info "Waiting for TaskPilot frontend health..."

for attempt in $(seq 1 30); do
    if curl --silent --fail --max-time 5 \
        "$APP_URL/health" >/dev/null; then

        success "TaskPilot is responding successfully."
        success "Demo environment setup complete."
        exit 0
    fi

    sleep 2
done

fail "TaskPilot did not become healthy. Inspect Docker Compose logs."