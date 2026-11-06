# TaskPilot AI — API Reference

Base URL:

`http://127.0.0.1:5000/api`

All protected endpoints require:

`Authorization: Bearer <JWT_TOKEN>`

Requests containing JSON should use:

`Content-Type: application/json`

## 1. Authentication

### Register

`POST /auth/register`

Request:

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "a-strong-password"
}