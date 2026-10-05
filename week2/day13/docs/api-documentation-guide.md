# API Documentation Guide

## Overview

Day 13 focuses on professional API documentation using OpenAPI and Swagger.

The implementation provides:

- OpenAPI 3.0 specification
- Swagger UI
- Documented API endpoints
- Request and response documentation
- Authentication documentation
- Security scheme documentation
- API examples
- Pagination documentation
- Error response documentation
- Postman collection generation
- Automated API testing
- Documentation validation

---

# Documentation Standards

## OpenAPI Specification

OpenAPI is used as the standard machine-readable API description format.

The project uses:

```text
OpenAPI Version: 3.0.0
```

The specification contains:

- API metadata
- Server definitions
- Security schemes
- Data schemas
- API tags
- Endpoint definitions
- Parameters
- Request bodies
- Responses
- Authentication requirements

---

## Swagger UI

Swagger UI provides an interactive web interface for exploring and testing the API.

Swagger UI URL:

```text
http://localhost:3003/api/v1/docs/
```

Swagger JSON URL:

```text
http://localhost:3003/api/v1/docs/swagger.json
```

Swagger UI allows developers to:

- Browse endpoints
- View request parameters
- View request bodies
- View responses
- View authentication requirements
- Test API endpoints interactively

---

# API Information

## API Title

```text
SDA Training API
```

## API Version

```text
1.0.0
```

## Description

```text
Advanced backend API documentation for the SDA training program
```

## License

```text
MIT
```

## Development Server

```text
http://localhost:3003/api/v1
```

## Production Server

```text
https://api.sda-training.com/v1
```

---

# API Tags

The API documentation is organized using the following tags:

```text
Authentication
Users
Documentation
```

## Authentication

Contains authentication and account-management endpoints.

## Users

Contains user-management endpoints.

## Documentation

Contains API documentation and health endpoints.

---

# Security Schemes

The OpenAPI specification defines two security schemes.

## Bearer Authentication

```text
Name: bearerAuth
Type: HTTP
Scheme: Bearer
Format: JWT
```

Usage:

```text
Authorization: Bearer <access-token>
```

Bearer authentication is used for protected endpoints.

---

## API Key Authentication

```text
Name: apiKey
Type: API Key
Location: Header
Header: X-API-Key
```

Example:

```text
X-API-Key: <api-key>
```

---

# API Schemas

The OpenAPI specification defines reusable schemas.

## User

User representation includes:

```text
id
name
email
role
isActive
avatar
createdAt
updatedAt
```

Example:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "user",
  "isActive": true,
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2026-10-06T00:00:00.000Z",
  "updatedAt": "2026-10-06T00:00:00.000Z"
}
```

---

## RegisterRequest

Registration request contains:

```text
name
email
password
```

Example:

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "StrongPass@123"
}
```

---

## LoginRequest

Login request contains:

```text
email
password
```

Example:

```json
{
  "email": "john.doe@example.com",
  "password": "StrongPass@123"
}
```

---

## TokenResponse

Authentication responses contain:

```text
accessToken
refreshToken
```

Example:

```json
{
  "accessToken": "<jwt-access-token>",
  "refreshToken": "<jwt-refresh-token>"
}
```

---

## Pagination

Pagination metadata contains:

```text
page
limit
total
pages
```

Example:

```json
{
  "page": 1,
  "limit": 10,
  "total": 25,
  "pages": 3
}
```

---

## Error

Standard error responses use:

```text
success
error.message
error.code
error.details
```

Example:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR"
  }
}
```

---

# API Endpoints

The Day 13 OpenAPI specification documents 8 paths.

## 1. Health Check

```text
GET /health
```

Returns the current API health status.

Example response:

```json
{
  "success": true,
  "message": "Day 13 API is healthy",
  "timestamp": "2026-10-06T00:00:00.000Z"
}
```

Response:

```text
200 OK
```

---

# Authentication API

Authentication endpoints are available under:

```text
/api/v1/auth
```

---

## 2. Register

```text
POST /api/v1/auth/register
```

### Description

Creates a new user account and returns access and refresh tokens.

### Request Body

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "StrongPass@123"
}
```

### Required Fields

```text
name
email
password
```

### Successful Response

```text
201 Created
```

Example:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user",
      "isActive": true,
      "avatar": null
    },
    "accessToken": "<jwt-access-token>",
    "refreshToken": "<jwt-refresh-token>"
  }
}
```

---

## 3. Login

```text
POST /api/v1/auth/login
```

### Description

Authenticates an existing user and returns JWT access and refresh tokens.

### Request Body

```json
{
  "email": "john.doe@example.com",
  "password": "StrongPass@123"
}
```

### Successful Response

```text
200 OK
```

Example:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "user"
    },
    "accessToken": "<jwt-access-token>",
    "refreshToken": "<jwt-refresh-token>"
  }
}
```

### Invalid Credentials

```text
401 Unauthorized
```

---

## 4. Refresh Token

```text
POST /api/v1/auth/refresh
```

### Request Body

```json
{
  "refreshToken": "<refresh-token>"
}
```

### Successful Response

```text
200 OK
```

Returns a new access-token/refresh-token pair.

---

## 5. Logout

```text
POST /api/v1/auth/logout
```

### Authentication

Requires:

```text
Authorization: Bearer <access-token>
```

### Successful Response

```text
200 OK
```

Example:

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 6. Current User

```text
GET /api/v1/auth/me
```

### Authentication

Requires:

```text
Authorization: Bearer <access-token>
```

### Successful Response

```text
200 OK
```

Example:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "user",
    "isActive": true,
    "avatar": null
  }
}
```

---

# Users API

User endpoints are available under:

```text
/api/v1/users
```

The user-management API requires authentication and appropriate permissions.

---

## 7. Get Users

```text
GET /api/v1/users
```

### Authentication

Requires:

```text
Authorization: Bearer <access-token>
```

### Permission

```text
users:read
```

### Query Parameters

#### `page`

Page number.

```text
type: integer
minimum: 1
default: 1
```

Example:

```text
?page=1
```

#### `limit`

Number of records per page.

```text
type: integer
minimum: 1
maximum: 100
default: 10
```

Example:

```text
?limit=10
```

#### `role`

Filter by role:

```text
user
admin
moderator
```

Example:

```text
?role=admin
```

#### `isActive`

Filter by active status.

Example:

```text
?isActive=true
```

#### `search`

Search by name or email.

Example:

```text
?search=john
```

### Example Request

```text
GET /api/v1/users?page=1&limit=10
```

### Successful Response

```text
200 OK
```

Example:

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "user",
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### Unauthorized

```text
401 Unauthorized
```

### Forbidden

```text
403 Forbidden
```

---

## 8. Get User by ID

```text
GET /api/v1/users/{id}
```

### Authentication

Requires:

```text
Authorization: Bearer <access-token>
```

### Permission

```text
users:read
```

### Path Parameter

```text
id
```

Example:

```text
GET /api/v1/users/550e8400-e29b-41d4-a716-446655440000
```

### Successful Response

```text
200 OK
```

### User Not Found

```text
404 Not Found
```

---

## Update User

```text
PUT /api/v1/users/{id}
```

### Authentication

Requires:

```text
Authorization: Bearer <access-token>
```

### Permission

```text
users:write
```

### Request Body

Supported fields include:

```text
name
email
role
isActive
```

Example:

```json
{
  "name": "Updated User",
  "email": "updated@example.com"
}
```

### Successful Response

```text
200 OK
```

Example:

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated User",
    "email": "updated@example.com",
    "role": "user",
    "isActive": true
  }
}
```

---

## Delete User

```text
DELETE /api/v1/users/{id}
```

### Authentication

Requires:

```text
Authorization: Bearer <access-token>
```

### Permission

```text
users:delete
```

### Successful Response

```text
200 OK
```

Example:

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### User Not Found

```text
404 Not Found
```

---

# Authentication and Authorization

Protected endpoints use bearer-token authentication.

Example:

```text
Authorization: Bearer <jwt-access-token>
```

The authorization flow is:

```text
Client
  ↓
Access Token
  ↓
JWT Verification
  ↓
User Lookup
  ↓
Authentication
  ↓
Permission Check
  ↓
Protected Endpoint
```

---

# Error Documentation

The API uses structured error responses.

## 400 Bad Request

Used when request data is invalid.

Example:

```json
{
  "success": false,
  "error": {
    "message": "Name, email and password are required",
    "code": "VALIDATION_ERROR"
  }
}
```

---

## 401 Unauthorized

Used when authentication is missing or invalid.

Example:

```json
{
  "success": false,
  "error": {
    "message": "Access token is required",
    "code": "TOKEN_REQUIRED"
  }
}
```

---

## 403 Forbidden

Used when the authenticated user does not have the required permissions.

Example:

```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions",
    "code": "INSUFFICIENT_PERMISSIONS"
  }
}
```

---

## 404 Not Found

Used when the requested resource or route does not exist.

Example:

```json
{
  "success": false,
  "error": {
    "message": "Route not found: GET /api/v1/does-not-exist",
    "code": "ROUTE_NOT_FOUND"
  }
}
```

---

## 500 Internal Server Error

Used for unexpected server errors.

---

# Pagination Documentation

Collection endpoints support pagination.

Example:

```text
GET /api/v1/users?page=1&limit=10
```

Pagination response:

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

Pagination provides:

- Current page
- Items per page
- Total items
- Total pages

---

# API Versioning

The documented API version is:

```text
v1
```

Base path:

```text
/api/v1
```

Examples:

```text
/api/v1/auth/login
/api/v1/auth/register
/api/v1/users
```

Versioning allows future API versions to be introduced without breaking existing clients.

---

# OpenAPI Structure

The project generates the OpenAPI specification using:

```javascript
swagger-jsdoc
```

Main specification file:

```text
week2/day13/docs/openapi.js
```

The specification contains:

```text
openapi
info
servers
tags
components
securitySchemes
schemas
security
paths
```

---

# Automated Documentation Generation

OpenAPI documentation is generated from source-code annotations.

Swagger annotations use:

```text
@swagger
```

Example:

```javascript
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     description: Authenticate a user and return JWT tokens.
 */
```

The Swagger generator scans the configured route files and builds the OpenAPI document automatically.

---

# Route Documentation Standards

Each documented endpoint should contain:

- Endpoint path
- HTTP method
- Summary
- Description
- Tags
- Authentication requirements
- Parameters
- Request body
- Responses
- Error responses
- Examples where appropriate

---

# Documentation Accuracy

Documentation must match actual API behavior.

The Day 13 implementation validates this by executing the documented API endpoints and comparing the expected behavior.

Validated areas include:

```text
Health endpoint
Authentication endpoints
Users endpoints
Authentication requirements
HTTP status codes
OpenAPI schemas
Security schemes
Swagger UI
Postman collection
```

---

# Postman Collection

A Postman collection is automatically generated from the OpenAPI specification.

Generator:

```text
week2/day13/scripts/generatePostmanCollection.js
```

Generated collection:

```text
week2/day13/docs/postman-collection.json
```

The collection uses:

```text
base_url
jwt_token
```

as variables.

---

# Postman Variables

## `base_url`

Development API base URL:

```text
http://localhost:3003/api/v1
```

## `jwt_token`

Stores the JWT access token used for authenticated requests.

Example:

```text
Bearer {{jwt_token}}
```

---

# Postman Collection Structure

The generated collection contains:

```text
Authentication requests
User requests
Request methods
URLs
Headers
Authentication configuration
Query parameters
Request bodies
```

The Day 13 validation generated:

```text
10 requests
```

successfully.

---

# Swagger UI Usage

Open:

```text
http://localhost:3003/api/v1/docs/
```

Swagger UI allows the developer to:

1. Select an endpoint.
2. Review its description.
3. Review parameters.
4. Review request body requirements.
5. Review response schemas.
6. Review authentication requirements.
7. Execute the endpoint interactively.

For protected endpoints, provide the JWT bearer token.

---

# Swagger JSON

The raw OpenAPI specification is available at:

```text
http://localhost:3003/api/v1/docs/swagger.json
```

This endpoint returns:

```text
Content-Type: application/json
```

The specification contains:

```text
OpenAPI version: 3.0.0
Title: SDA Training API
Documented paths: 8
```

---

# API Testing Integration

Day 13 includes an automated API testing suite.

Test file:

```text
week2/day13/test/api-tests.js
```

The test suite validates both API behavior and documentation.

---

# Testing Workflow

```text
OpenAPI Specification
        ↓
Swagger UI
        ↓
Postman Collection
        ↓
Automated API Tests
        ↓
Documentation Validation
```

---

# Documentation Validation Tests

The following tests were completed successfully:

```text
1. Health endpoint: PASS
2. OpenAPI specification: PASS
3. Swagger UI: PASS
4. Registration: PASS
5. Login: PASS
6. Protected /me endpoint: PASS
7. Users list: PASS
8. Get user by ID: PASS
9. Update user: PASS
10. Authentication protection: PASS
11. 404 handling: PASS
12. Token refresh: PASS
13. OpenAPI schemas: PASS
14. Security schemes: PASS
15. Postman collection: PASS
```

Final result:

```text
DAY 13 API DOCUMENTATION TESTS: SUCCESS
```

---

# API Testing Results

## Health

```text
PASS
```

## Authentication

```text
Registration: PASS
Login: PASS
Protected /me: PASS
Token refresh: PASS
```

## Authorization

```text
Authentication protection: PASS
```

## Users

```text
Users list: PASS
Get user by ID: PASS
Update user: PASS
```

## Error Handling

```text
404 handling: PASS
```

## Documentation

```text
OpenAPI specification: PASS
Swagger UI: PASS
OpenAPI schemas: PASS
Security schemes: PASS
```

## Postman

```text
Postman collection: PASS
10 requests generated
```

---

# Automated Documentation Benefits

The implementation provides:

- Consistent documentation
- Machine-readable API specification
- Interactive API testing
- Reusable schemas
- Centralized security definitions
- Automatic route documentation
- Postman collection generation
- Documentation validation
- Easier API maintenance
- Better developer collaboration

---

# Documentation Best Practices

## Completeness

Document:

- All endpoints
- Parameters
- Request bodies
- Responses
- Error conditions
- Authentication requirements

## Accuracy

Documentation must match actual API behavior.

API changes should be reflected in the OpenAPI specification.

## Clarity

Use:

- Clear endpoint names
- Meaningful summaries
- Detailed descriptions
- Consistent response structures
- Practical examples

## Consistency

Use the same format for:

```text
Endpoints
Parameters
Request bodies
Responses
Errors
Authentication
```

## Versioning

Clearly identify API versions:

```text
v1
```

Future versions should be documented separately.

---

# Example API Usage

## Register

```powershell
$register = Invoke-RestMethod `
  -Uri "http://localhost:3003/api/v1/auth/register" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{
    name = "John Doe"
    email = "john@example.com"
    password = "StrongPass@123"
  } | ConvertTo-Json)
```

---

## Login

```powershell
$login = Invoke-RestMethod `
  -Uri "http://localhost:3003/api/v1/auth/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{
    email = "john@example.com"
    password = "StrongPass@123"
  } | ConvertTo-Json)

$token = $login.data.accessToken
```

---

## Get Current User

```powershell
$headers = @{
  Authorization = "Bearer $token"
}

Invoke-RestMethod `
  -Uri "http://localhost:3003/api/v1/auth/me" `
  -Method Get `
  -Headers $headers
```

---

## Get Users

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3003/api/v1/users?page=1&limit=10" `
  -Method Get `
  -Headers $headers
```

---

# Development Commands

## Start API

```powershell
node week2/day13/server/index.js
```

## Generate Postman Collection

```powershell
node week2/day13/scripts/generatePostmanCollection.js
```

## Run API Tests

```powershell
node week2/day13/test/api-tests.js
```

## Syntax Check

```powershell
node --check week2/day13/docs/openapi.js
node --check week2/day13/middleware/swagger.js
node --check week2/day13/routes/authRoutes.js
node --check week2/day13/routes/userRoutes.js
node --check week2/day13/server/app.js
node --check week2/day13/server/index.js
node --check week2/day13/scripts/generatePostmanCollection.js
node --check week2/day13/test/api-tests.js
```

---

# Project Structure

```text
week2/day13/
│
├── docs/
│   ├── api-documentation-guide.md
│   ├── openapi.js
│   └── postman-collection.json
│
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   ├── rbac.js
│   └── swagger.js
│
├── models/
│   └── User.js
│
├── routes/
│   ├── authRoutes.js
│   └── userRoutes.js
│
├── scripts/
│   └── generatePostmanCollection.js
│
├── server/
│   ├── app.js
│   └── index.js
│
└── test/
    └── api-tests.js
```

---

# Current Implementation Status

## OpenAPI

```text
PASS
```

Implemented:

- OpenAPI 3.0.0
- API metadata
- Servers
- Tags
- Security schemes
- Reusable schemas
- Documented paths

## Swagger UI

```text
PASS
```

Interactive documentation is available at:

```text
/api/v1/docs/
```

## Swagger JSON

```text
PASS
```

Available at:

```text
/api/v1/docs/swagger.json
```

## Postman Collection

```text
PASS
```

Generated successfully with:

```text
10 requests
```

## API Testing

```text
PASS
```

All 15 Day 13 API documentation tests passed.

---

# Day 13 Success Criteria

```text
✅ OpenAPI Mastery
   Comprehensive OpenAPI specification

✅ Swagger UI
   Interactive documentation interface

✅ Postman Collection
   Automated testing collection generated from OpenAPI

✅ API Testing
   Comprehensive automated test suite

✅ Documentation Standards
   Professional and structured API documentation
```

---

# Documentation Checklist

```text
✅ All major endpoints documented
✅ Authentication requirements documented
✅ Request examples documented
✅ Response examples documented
✅ Error responses documented
✅ Pagination documented
✅ Security schemes documented
✅ Reusable schemas documented
✅ Swagger UI available
✅ Swagger JSON available
✅ Postman collection generated
✅ API testing integrated
✅ Documentation accuracy validated
```

---

# Day 13 Final Status

```text
OpenAPI Specification      : PASS
Swagger UI                 : PASS
Swagger JSON               : PASS
API Route Documentation    : PASS
Authentication Docs        : PASS
Error Documentation        : PASS
Pagination Documentation   : PASS
Security Documentation     : PASS
Postman Collection         : PASS
API Testing                : PASS
Documentation Validation   : PASS
```

```text
DAY 13: API DOCUMENTATION
IMPLEMENTATION STATUS: COMPLETE
VALIDATION STATUS: SUCCESS
```

---

# Next Steps

1. Commit the completed Day 13 implementation.

```powershell
git add package.json package-lock.json week2/day13
git commit -m "Complete Day 13: API Documentation"
```

2. Push the feature branch.

```powershell
git push -u origin feature/day13-api-documentation
```

3. Create the pull request using:

```text
Base: develop
Compare: feature/day13-api-documentation
```

4. Prepare for Day 14: Integration Review.