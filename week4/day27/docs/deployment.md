# TaskPilot AI — Deployment Guide

## 1. Prerequisites

For Docker deployment:

- Docker Desktop.
- Docker Compose v2.
- A running Windows host with network access to the application.
- The existing Ollama/Day 25/Day 26 AI services, if AI functionality is required.

For Kubernetes deployment:

- A working Kubernetes cluster.
- `kubectl`.
- Kustomize support through `kubectl`.
- A default StorageClass or an appropriately configured PVC.
- Container images accessible to the cluster.

## 2. Required environment configuration

Never commit a real JWT secret or a production `.env` file.

Generate a random secret in PowerShell:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"