# Authentication & Authorization Guide

## Authentication Methods

- **JWT Tokens**: Stateless authentication with access and refresh tokens
- **OAuth2**: Third-party authentication with Google, Facebook, GitHub
- **Social Login**: Seamless authentication experience with social providers
- **Session Management**: Server-side session storage and management
- **Multi-Factor Authentication**: 2FA and MFA for enhanced security

## Authorization Patterns

- **RBAC**: Role-based access control with permissions
- **Resource Ownership**: User-specific resource access
- **Permission System**: Granular permission management
- **Role Hierarchy**: Admin, moderator, and user roles
- **Access Control**: Fine-grained access control

## JWT Authentication

JSON Web Tokens are used for stateless authentication.

### Access Tokens

Access tokens contain:

- User ID
- Email
- Role
- Issued-at timestamp
- Expiration timestamp
- JWT issuer
- JWT audience

The access token is sent using the HTTP `Authorization` header:

```text
Authorization: Bearer <access-token>
```

The implementation validates:

- JWT signature
- Token expiration
- Issuer
- Audience

### Refresh Tokens

Refresh tokens are used to generate a new access-token/refresh-token pair.

Refresh tokens contain:

- User ID
- Token type
- Issued-at timestamp
- Expiration timestamp
- JWT issuer
- JWT audience

The refresh token must contain:

```text
type: refresh
```

## Authentication Service

The authentication service provides:

```text
generateTokens()
verifyToken()
refreshToken()
hashPassword()
comparePassword()
validatePassword()
```

### Token Generation

The service generates:

```text
accessToken
refreshToken
```

The JWT configuration uses:

```text
issuer: sda-training-api
audience: sda-training-client
```

### Token Verification

Invalid or expired tokens are rejected.

Typical responses:

```text
401 Unauthorized
```

for:

- Missing access token
- Invalid token
- Expired token
- User not found
- Inactive user

## Password Security

Passwords are protected using `bcryptjs`.

### Password Requirements

Passwords must:

- Be at least 8 characters long
- Contain at least one uppercase letter
- Contain at least one lowercase letter
- Contain at least one number
- Contain at least one special character

Example valid password:

```text
StrongPass@123
```

### Password Hashing

Passwords are hashed using bcrypt with 12 salt rounds.

Plain-text passwords are not returned in authentication responses.

The password field is excluded from normal User queries and explicitly selected only when needed for authentication.

## Authentication Middleware

### `authenticate`

Protects routes that require an authenticated user.

Flow:

```text
Authorization Header
        ↓
Bearer Token
        ↓
JWT Verification
        ↓
User Lookup
        ↓
Active User Validation
        ↓
req.user
```

Example:

```javascript
router.get('/me', authenticate, handler);
```

### `authorize`

Checks whether an authenticated user has one of the specified roles.

Example:

```javascript
authorize('admin')
```

Users without the required role receive:

```text
403 Forbidden
```

### `optionalAuth`

Allows requests to continue when authentication is not present.

When a valid token is provided, the user is attached to:

```text
req.user
```

Invalid optional authentication does not block the request.

# OAuth2 & Social Login

The application supports OAuth2/social authentication for:

- Google
- Facebook
- GitHub

Passport.js is used for OAuth provider strategies.

## Google Authentication

Routes:

```text
GET /api/v1/auth/google
GET /api/v1/auth/google/callback
```

Requested scope:

```text
profile
email
```

Flow:

1. Redirect the user to Google.
2. Receive the OAuth callback.
3. Find the user by Google ID or email.
4. Link the Google ID when necessary.
5. Create a new user when no matching account exists.
6. Generate JWT access and refresh tokens.

New Google users use:

```text
role: user
isActive: true
```

## Facebook Authentication

Routes:

```text
GET /api/v1/auth/facebook
GET /api/v1/auth/facebook/callback
```

Profile information includes:

```text
id
emails
name
picture
```

Flow:

1. Redirect the user to Facebook.
2. Receive the OAuth callback.
3. Find the user by Facebook ID or email.
4. Link the Facebook ID when necessary.
5. Create a new user when no matching account exists.
6. Generate JWT access and refresh tokens.

## GitHub Authentication

Routes:

```text
GET /api/v1/auth/github
GET /api/v1/auth/github/callback
```

Requested scope:

```text
user:email
```

Flow:

1. Redirect the user to GitHub.
2. Receive the OAuth callback.
3. Find the user by GitHub ID or email.
4. Link the GitHub ID when necessary.
5. Create a new user when no matching account exists.
6. Generate JWT access and refresh tokens.

## OAuth Provider Fields

The Day 12 User model supports:

```text
googleId
facebookId
githubId
```

These fields allow social accounts to be linked to application users.

OAuth users may not have a local password because authentication is handled by the external provider.

# RBAC System

The application supports three roles:

```text
admin
moderator
user
```

RBAC controls which operations each role can perform.

## Permission Definitions

Permissions follow the format:

```text
resource:action
```

Available permissions:

```text
users:read
users:write
users:delete

products:read
products:write
products:delete

orders:read
orders:write
orders:delete

analytics:read
analytics:write

system:read
system:write
system:delete
```

## Permission Matrix

### Users

```text
users:read
  admin
  moderator

users:write
  admin

users:delete
  admin
```

### Products

```text
products:read
  admin
  moderator
  user

products:write
  admin
  moderator

products:delete
  admin
```

### Orders

```text
orders:read
  admin
  moderator
  user

orders:write
  admin
  moderator
  user

orders:delete
  admin
```

### Analytics

```text
analytics:read
  admin
  moderator

analytics:write
  admin
```

### System

```text
system:read
  admin

system:write
  admin

system:delete
  admin
```

## RBAC Middleware

The implementation provides:

```text
hasPermission()
requirePermission()
requireAnyPermission()
requireAllPermissions()
requireOwnership()
requireRole()
```

### `hasPermission`

Checks whether a user has a specific permission.

Example:

```javascript
hasPermission(req.user, 'products:read');
```

Returns:

```text
true
```

or:

```text
false
```

### `requirePermission`

Requires a specific permission.

Example:

```javascript
requirePermission('products:write')
```

Unauthenticated users receive:

```text
401 Unauthorized
```

Users without the required permission receive:

```text
403 Forbidden
```

### `requireAnyPermission`

Allows access when the user has at least one of the supplied permissions.

Example:

```javascript
requireAnyPermission(
  'users:read',
  'products:read'
)
```

### `requireAllPermissions`

Requires every supplied permission.

Example:

```javascript
requireAllPermissions(
  'products:read',
  'products:write'
)
```

### `requireRole`

Restricts a route to one or more roles.

Example:

```javascript
requireRole('admin')
```

Multiple roles:

```javascript
requireRole('admin', 'moderator')
```

### `requireOwnership`

Restricts access to resources owned by the authenticated user.

The default ownership field is:

```text
userId
```

Administrators can access any resource.

Non-admin users cannot access another user's resource.

Unauthorized access returns:

```text
403 Forbidden
```

# Authentication Routes

All authentication endpoints are available under:

```text
/api/v1/auth
```

## Register

```text
POST /api/v1/auth/register
```

Example request:

```json
{
  "name": "Day12 Test User",
  "email": "day12test@example.com",
  "password": "StrongPass@123"
}
```

Successful registration returns:

```text
201 Created
```

The response contains:

```text
user
accessToken
refreshToken
```

New users default to:

```text
role: user
```

## Login

```text
POST /api/v1/auth/login
```

Example request:

```json
{
  "email": "day12test@example.com",
  "password": "StrongPass@123"
}
```

Successful login returns:

```text
200 OK
```

The response contains:

```text
user
accessToken
refreshToken
```

Invalid credentials return:

```text
401 Unauthorized
```

## Refresh Token

```text
POST /api/v1/auth/refresh
```

Example request:

```json
{
  "refreshToken": "<refresh-token>"
}
```

A successful refresh generates a new access-token/refresh-token pair.

Invalid refresh tokens are rejected.

## Logout

```text
POST /api/v1/auth/logout
```

Authentication is required.

The current implementation uses stateless JWT authentication and returns a successful logout response.

In a production implementation, refresh-token revocation or token blacklisting should be added.

## Current User

```text
GET /api/v1/auth/me
```

Requires:

```text
Authorization: Bearer <access-token>
```

Returns:

```text
id
name
email
role
avatar
isActive
lastLogin
createdAt
```

## Change Password

```text
PUT /api/v1/auth/change-password
```

Requires authentication.

Example request:

```json
{
  "currentPassword": "StrongPass@123",
  "newPassword": "NewStrongPass@456"
}
```

Flow:

1. Verify the current password.
2. Validate the new password.
3. Hash the new password.
4. Save the updated password.

Invalid current passwords are rejected.

Weak new passwords are rejected.

# Environment Variables

Recommended configuration:

```text
JWT_SECRET=<strong-secret>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

MONGODB_URI=<mongodb-connection-string>

GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_CALLBACK_URL=/api/v1/auth/google/callback

FACEBOOK_APP_ID=<facebook-app-id>
FACEBOOK_APP_SECRET=<facebook-app-secret>
FACEBOOK_CALLBACK_URL=/api/v1/auth/facebook/callback

GITHUB_CLIENT_ID=<github-client-id>
GITHUB_CLIENT_SECRET=<github-client-secret>
GITHUB_CALLBACK_URL=/api/v1/auth/github/callback
```

Never commit real credentials or secrets to source control.

# Security Best Practices

## Password Security

- Strong password requirements
- bcrypt hashing
- 12 salt rounds
- Password comparison before authentication
- No plain-text passwords in API responses

## Token Security

- Short-lived access tokens
- Refresh-token support
- Token expiration
- JWT signature verification
- Issuer validation
- Audience validation
- Secure token storage on the client
- Token rotation/revocation for production systems

## Input Validation

Authentication requests validate required fields and password strength.

## Rate Limiting

Authentication routes use rate limiting to help protect against brute-force attempts.

## Security Middleware

The application uses:

```text
Helmet
CORS
Morgan logging
Rate limiting
```

# Error Handling

Authentication and authorization errors use structured responses.

Example:

```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials",
    "code": "INTERNAL_SERVER_ERROR"
  }
}
```

Common authentication/authorization status codes:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
500 Internal Server Error
```

# Authentication Flow

## Registration Flow

```text
Client
  ↓
POST /register
  ↓
Validate input
  ↓
Validate password
  ↓
Check existing user
  ↓
Hash password
  ↓
Create user
  ↓
Generate JWT tokens
  ↓
Return user + tokens
```

## Login Flow

```text
Client
  ↓
POST /login
  ↓
Find active user
  ↓
Compare password
  ↓
Update lastLogin
  ↓
Generate JWT tokens
  ↓
Return user + tokens
```

## Protected Request Flow

```text
Client
  ↓
Bearer Access Token
  ↓
JWT Verification
  ↓
User Lookup
  ↓
Active User Check
  ↓
Authorization / RBAC
  ↓
Protected Resource
```

## Token Refresh Flow

```text
Client
  ↓
Refresh Token
  ↓
Verify Refresh Token
  ↓
Validate Token Type
  ↓
Find Active User
  ↓
Generate New Token Pair
  ↓
Return Tokens
```

## OAuth Flow

```text
Client
  ↓
Social Login Endpoint
  ↓
OAuth Provider
  ↓
Callback Endpoint
  ↓
Find or Create User
  ↓
Generate JWT Tokens
  ↓
Authenticated User
```

# Testing & Validation

## Authentication Testing

The following scenarios were tested successfully:

- JWT authentication
- OAuth module loading
- Password validation
- User registration
- Login
- Protected `/me` endpoint
- Token refresh
- Logout
- Missing-token rejection
- Invalid JWT rejection
- Invalid credentials rejection
- Duplicate registration rejection
- Change-password validation

## Authorization Testing

The following scenarios were tested successfully:

- RBAC permission matrix
- Permission checks
- Role checks
- Permission definitions
- Ownership middleware implementation
- Access-control middleware

## Final Integration Validation

```text
1. Health check: PASS
2. Password validation: PASS
3. User registration: PASS
4. Login: PASS
5. JWT protected /me: PASS
6. Missing token rejection: PASS
7. Invalid JWT rejection: PASS
8. Invalid credentials rejection: PASS
9. Refresh token: PASS
10. Logout: PASS
11. Change-password validation: PASS
12. Duplicate user rejection: PASS
13. RBAC permission matrix: PASS
14. OAuth module loading: PASS
```

Final result:

```text
DAY 12 AUTHENTICATION VALIDATION: SUCCESS
```

# Unit Tests

Run:

```powershell
node week2/day12/test/auth-tests.js
```

The unit test suite validates:

```text
Password validation
Password hashing
Password comparison
JWT token generation
JWT verification
RBAC permission matrix
Permission definitions
Role middleware
```

Expected result:

```text
DAY 12 UNIT TESTS: SUCCESS
```

# Security Validation

The implementation verifies that:

- Weak passwords are rejected.
- Passwords are hashed before storage.
- Invalid credentials are rejected.
- Missing access tokens are rejected.
- Invalid JWTs are rejected.
- Protected routes require authentication.
- Role restrictions return forbidden responses.
- Duplicate users cannot be registered.
- OAuth provider identifiers are supported.
- Authentication endpoints are rate limited.

# Project Structure

```text
week2/day12/
│
├── docs/
│   └── authentication-guide.md
│
├── middleware/
│   ├── apiVersioning.js
│   ├── auth.js
│   ├── errorHandler.js
│   ├── oauth.js
│   ├── rateLimiting.js
│   └── rbac.js
│
├── models/
│   └── User.js
│
├── routes/
│   └── authRoutes.js
│
├── server/
│   ├── app.js
│   └── index.js
│
└── test/
    └── auth-tests.js
```

# Current Implementation Status

## JWT Authentication

```text
PASS
```

Implemented:

- Access tokens
- Refresh tokens
- JWT verification
- Expiration handling
- Issuer validation
- Audience validation
- Authentication middleware
- Optional authentication
- Role authorization

## Password Security

```text
PASS
```

Implemented:

- bcrypt hashing
- 12 salt rounds
- Password strength validation
- Password comparison
- Protected password selection

## OAuth2

```text
PASS
```

Implemented:

- Google strategy
- Facebook strategy
- GitHub strategy
- Passport initialization
- Provider account linking
- Social user creation

Actual provider login requires valid provider credentials.

## RBAC

```text
PASS
```

Implemented:

- Admin role
- Moderator role
- User role
- Permission definitions
- Permission checks
- Any-permission checks
- All-permission checks
- Ownership checks
- Role checks

# Concepts Covered

## JWT

Stateless token-based authentication.

## OAuth2

Authorization framework used for third-party authentication.

## Social Login

Authentication through:

```text
Google
Facebook
GitHub
```

## RBAC

Role-based access control using:

```text
admin
moderator
user
```

## Resource Ownership

Restricts access to resources belonging to the authenticated user.

## Permission System

Provides granular access control using resource/action permissions.

## Token Security

Includes:

- Expiration
- Signature validation
- Issuer validation
- Audience validation
- Refresh tokens

## Rate Limiting

Provides protection against excessive authentication requests.

## Audit Logging

Request logging is provided through the application's logging middleware.

# Session Management & MFA

Session management and multi-factor authentication are included as Day 12 concepts.

The current implementation primarily uses stateless JWT authentication rather than server-side session storage.

Full 2FA/MFA flows are not part of the implemented authentication test flow.

These capabilities can be added as a future authentication enhancement.

# Production Recommendations

Before production deployment:

- Use a strong `JWT_SECRET`
- Store secrets in environment variables
- Never commit OAuth credentials
- Use HTTPS
- Use secure client-side token storage
- Use short-lived access tokens
- Rotate and revoke refresh tokens
- Configure provider callback URLs
- Monitor failed authentication attempts
- Add audit/security event logging
- Add refresh-token revocation or blacklisting

# Day 12 Final Status

```text
JWT Authentication      : PASS
Password Security       : PASS
Registration            : PASS
Login                   : PASS
Protected Routes        : PASS
Token Refresh           : PASS
Logout                  : PASS
OAuth Module            : PASS
RBAC                    : PASS
Permission Checks       : PASS
Validation              : PASS
Authentication Testing  : PASS
```

```text
DAY 12: AUTHENTICATION & RBAC
IMPLEMENTATION STATUS: COMPLETE
VALIDATION STATUS: SUCCESS
```

# Next Steps

1. Commit the completed Day 12 implementation.

```powershell
git add package.json package-lock.json week2/day12
git commit -m "Complete Day 12: Authentication & RBAC"
```

2. Push the feature branch.

```powershell
git push -u origin feature/day12-authentication-rbac
```

3. Create the Day 12 pull request using:

```text
Base: develop
Compare: feature/day12-authentication-rbac
```

4. Proceed to Day 13: API Documentation.