# Day 9 — Express.js & Middleware

## Overview

Day 9 focuses on mastering Express.js and middleware architecture. The implementation covers modular route handlers, custom authentication and validation middleware, centralized error handling, logging, security, rate limiting, compression, and performance monitoring.

The application follows separation of concerns so that middleware, route handlers, and service logic remain modular and maintainable.

---

## Learning Objectives

- Master Express.js framework and middleware architecture
- Implement custom middleware for authentication, validation, and logging
- Build robust error handling and validation systems
- Create modular route handlers with proper separation of concerns
- Optimize Express applications for production use

---

# Express.js Fundamentals

## Middleware

Express middleware participates in the request/response lifecycle.

Middleware can:

- Inspect incoming requests
- Modify requests and responses
- Perform authentication and authorization
- Validate request data
- Log requests
- Measure performance
- Handle application-wide concerns
- Decide whether execution should continue

Middleware execution order is important because middleware runs in the order in which it is registered.

## Routing

Express routing maps HTTP methods and URL paths to route handlers.

The application organizes routes by resource:

```text
/api/users
/api/products
/api/orders
```

Routes can work with:

- Route parameters
- Query strings
- Request bodies
- Authentication information

## Templates

Express supports view engines and template rendering.

The Day 9 implementation is primarily API-focused and returns JSON responses instead of using server-rendered views.

## Static Files

Express can serve static assets and can also work with external content delivery systems such as CDNs.

The Day 9 implementation focuses on backend API architecture.

## Security

The application includes multiple security-oriented controls:

- CORS
- Helmet
- Rate limiting
- Input validation
- Authentication
- Authorization

---

# Middleware Architecture

The Day 9 application uses several categories of middleware.

## Application Middleware

Application-level middleware is registered globally and applies across the application.

The application includes:

- Helmet
- CORS
- Compression
- Rate limiting
- Morgan logging
- Custom request logging
- Performance monitoring
- JSON body parsing
- URL-encoded body parsing
- Validation middleware

## Router Middleware

Router-level middleware applies only to selected route groups.

Examples include:

- Authentication middleware
- Authorization middleware
- Validation middleware

This allows protected resources and administrative operations to use only the middleware they require.

## Error Middleware

Error-handling middleware processes errors passed from routes and other middleware.

The error handler is registered after the routes.

## Third-party Middleware

The application uses:

- `cors`
- `helmet`
- `compression`
- `express-rate-limit`
- `morgan`
- `express-validator`

## Custom Middleware

The application contains custom middleware for:

- Authentication
- Authorization
- Validation
- Request logging
- Performance monitoring
- Centralized error handling

---

# Application Architecture

The application follows a layered architecture:

```text
Client
  |
  v
Express Application
  |
  v
Middleware Layer
  |
  v
Route Layer
  |
  v
Service Layer
  |
  v
Application Data
```

The main application is:

```text
week2/day9/server/app.js
```

The application is responsible for:

- Configuring middleware
- Registering routes
- Providing health checks
- Handling unknown routes
- Connecting errors to the centralized error handler

---

# Project Structure

```text
week2/day9/
├── server/
│   ├── app.js
│   ├── controllers/
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── logger.js
│   │   ├── performance.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── productRoutes.js
│   │   └── orderRoutes.js
│   └── services/
│       ├── userService.js
│       ├── productService.js
│       └── orderService.js
├── docs/
│   └── express-architecture.md
├── logs/
└── test/
```

The structure follows separation of concerns:

- Routes handle HTTP requests and responses.
- Middleware handles cross-cutting concerns.
- Services contain application and business operations.
- `app.js` coordinates the Express request pipeline.

---

# Task 1 — Express Application with Middleware

The Express application is implemented in:

```text
week2/day9/server/app.js
```

The application configures the middleware stack, routes, health checks, 404 handling, and centralized error handling.

## Security Middleware

Helmet is configured near the beginning of the middleware stack.

Its purpose is to provide security-related HTTP headers.

## CORS

CORS controls cross-origin requests.

The frontend origin can be configured using:

```text
FRONTEND_URL
```

The development default is:

```text
http://localhost:3000
```

The application also supports credentials and the required HTTP methods and headers.

## Compression

The `compression` middleware is enabled to reduce HTTP response payload sizes.

## Rate Limiting

The API uses `express-rate-limit`.

Configuration:

```text
Window: 15 minutes
Maximum: 100 requests per IP
```

The limiter is applied to:

```text
/api/
```

Requests beyond the configured limit receive HTTP `429`.

## Logging

Request logging is implemented using:

- Morgan
- Custom request logging middleware
- Winston error logging

## Performance Monitoring

Custom performance middleware measures request processing time and records runtime information.

## Body Parsing

JSON request bodies are supported with a maximum size of `10mb`.

URL-encoded request bodies are also supported with a maximum size of `10mb`.

## Validation Middleware

The application registers validation middleware and uses route-level validation rules for incoming data.

## Health Check

The application provides:

```text
GET /health
```

The health endpoint returns:

- Service status
- Timestamp
- Process uptime
- Memory usage
- Node.js version

## API Routes

The application registers:

```text
/api/users
/api/products
/api/orders
```

## 404 Handling

Unknown routes return a structured `404` response containing the requested path.

## Error Handling

The centralized error handler is registered after the routes.

---

# Task 2 — Custom Middleware

## Authentication Middleware

Authentication is implemented in:

```text
week2/day9/server/middleware/auth.js
```

The middleware:

1. Reads the `Authorization` header.
2. Checks for the `Bearer` authentication scheme.
3. Extracts the JWT.
4. Verifies the token.
5. Stores the decoded information in `req.user`.
6. Passes execution to the next middleware or route.

Expected format:

```text
Authorization: Bearer <JWT_TOKEN>
```

Requests without authentication are rejected with HTTP `401`.

Invalid JWTs are rejected with HTTP `401`.

Expired JWTs are rejected with HTTP `401`.

## Authorization Middleware

The same module provides:

```js
authorize(...roles)
```

This middleware checks whether the authenticated user has an allowed role.

For example:

```js
authorize('admin')
```

restricts a route to administrative users.

Authenticated users without the required role receive HTTP `403`.

## Optional Authentication

The middleware also includes:

```js
optionalAuth
```

This allows requests to continue without authentication while still attaching decoded user information when a valid token is supplied.

---

# Validation Middleware

Validation is implemented in:

```text
week2/day9/server/middleware/validation.js
```

The implementation uses `express-validator`.

## Validation Error Handling

Validation failures are converted into structured error information.

Example:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Valid email is required"
      }
    ]
  }
}
```

## User Validation

User validation checks:

- Name length
- Email format
- Password length
- Password complexity
- Allowed role

Allowed roles:

```text
user
admin
moderator
```

## Login Validation

Login validation checks:

- Email format
- Required password

## Product Validation

Product validation checks:

- Product name
- Description
- Price
- Category
- Stock

## Order Validation

Order validation checks:

- At least one order item
- Product UUID
- Positive item quantity
- Shipping address
- Street
- City
- ZIP code

## ID Validation

Route IDs are validated as UUID values.

## Pagination Validation

Pagination validation checks:

- Page
- Limit
- Sort field
- Sort order

Supported sort fields:

```text
createdAt
updatedAt
name
price
```

Supported order values:

```text
asc
desc
```

---

# Request Logging Middleware

Request logging is implemented in:

```text
week2/day9/server/middleware/logger.js
```

The middleware records:

- HTTP method
- Request URL
- HTTP status code
- Request duration
- IP address
- User agent
- Timestamp
- User ID when available

---

# Performance Middleware

Performance monitoring is implemented in:

```text
week2/day9/server/middleware/performance.js
```

The middleware measures request processing time and records:

- HTTP method
- Request URL
- Response status
- Duration
- Memory usage
- Timestamp

---

# Task 3 — Route Handlers

The application uses modular route files.

Each resource has its own router.

## User Routes

Implemented in:

```text
week2/day9/server/routes/userRoutes.js
```

### Public Routes

```text
POST /api/users/register
POST /api/users/login
```

### Protected Routes

```text
GET    /api/users/profile
PUT    /api/users/profile
DELETE /api/users/profile
POST   /api/users/logout
```

### Administrative Routes

```text
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

Authentication, authorization, and validation middleware are applied where required.

---

## Product Routes

Implemented in:

```text
week2/day9/server/routes/productRoutes.js
```

Endpoints include:

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
PATCH  /api/products/:id/stock
```

Product management routes require the appropriate authentication and authorization.

---

## Order Routes

Implemented in:

```text
week2/day9/server/routes/orderRoutes.js
```

Endpoints include:

```text
POST  /api/orders
GET   /api/orders/my-orders
GET   /api/orders/:id
GET   /api/orders
PATCH /api/orders/:id/status
POST  /api/orders/:id/cancel
```

Order creation and personal order access require authentication.

Administrative order listing and status changes require appropriate authorization.

---

# Route Error Handling

Route handlers use asynchronous operations and pass failures to centralized error handling:

```js
try {
  // operation
} catch (error) {
  next(error);
}
```

This keeps error management consistent throughout the API.

---

# Task 4 — Service Layer

Business operations are separated from route handlers into service modules.

## User Service

Implemented in:

```text
week2/day9/server/services/userService.js
```

Responsibilities include:

- User creation
- User authentication
- User retrieval
- User updates
- User deletion
- User listing
- JWT generation
- Logout

Passwords are hashed using `bcryptjs`.

JWTs are handled using `jsonwebtoken`.

Unique identifiers are generated using `uuid`.

## Product Service

Implemented in:

```text
week2/day9/server/services/productService.js
```

Responsibilities include:

- Product creation
- Product retrieval
- Product listing
- Product updates
- Product deletion
- Stock updates
- Filtering
- Searching
- Pagination

## Order Service

Implemented in:

```text
week2/day9/server/services/orderService.js
```

Responsibilities include:

- Order creation
- Order retrieval
- User order retrieval
- Order listing
- Order status updates
- Order cancellation

Supported order statuses:

```text
pending
confirmed
processing
shipped
delivered
cancelled
```

---

# Task 5 — Error Handling

Centralized error handling is implemented in:

```text
week2/day9/server/middleware/errorHandler.js
```

The implementation uses Winston and a custom `AppError` class.

## AppError

The application error contains:

- Error message
- HTTP status code
- Operational error flag
- Optional details
- Stack trace

## Handled Error Types

The error handler supports:

- Application errors
- Mongoose cast errors
- Duplicate-key errors
- Mongoose validation errors
- JWT errors
- Expired tokens
- Rate-limit errors
- Unexpected errors

## Error Logging

Errors are logged with:

- Error message
- Stack trace
- URL
- HTTP method
- IP address
- User agent
- User ID when available

## Error Response

The application uses a common JSON structure:

```json
{
  "success": false,
  "error": {
    "message": "Error message"
  }
}
```

Validation failures may additionally include:

```json
{
  "details": []
}
```

During development, stack information may also be returned for debugging.

---

# Request Processing Flow

The application request pipeline is:

```text
Incoming Request
      |
      v
Helmet / Security
      |
      v
CORS
      |
      v
Compression
      |
      v
Rate Limiting
      |
      v
Morgan / Request Logger
      |
      v
Performance Monitoring
      |
      v
Body Parsing
      |
      v
Authentication
      |
      v
Authorization
      |
      v
Validation
      |
      v
Route Handler
      |
      v
Service Layer
      |
      v
Response
      |
      v
Central Error Handler
```

Not every route uses every middleware. Authentication, authorization, and validation are applied according to route requirements.

---

# Authentication Flow

```text
Client
  |
  | POST /api/users/login
  v
User Route
  |
  v
User Service
  |
  | Validate credentials
  v
JWT Token
  |
  v
Client
  |
  | Authorization: Bearer <token>
  v
Authentication Middleware
  |
  v
JWT Validation
  |
  v
Authorization Middleware
  |
  v
Protected Route
  |
  v
Service Layer
  |
  v
Response
```

This separates authentication from authorization and business operations.

---

# Security Practices

## Helmet

Provides security-related HTTP headers.

## CORS

Controls cross-origin access to the API.

## Rate Limiting

Limits excessive API requests by IP address.

## Input Validation

Rejects invalid and malformed request data before business operations.

## Authentication

JWT Bearer tokens protect private API resources.

## Authorization

Role-based access control restricts administrative operations.

## Password Protection

Passwords are hashed using `bcryptjs` and are not returned in API responses.

---

# Logging

The application generates:

```text
week2/day9/logs/error.log
week2/day9/logs/combined.log
```

Request logs include:

- Method
- URL
- Status
- Duration
- IP
- User agent
- Timestamp

Error logs include application error details and stack traces.

---

# Performance

Performance monitoring records request duration and runtime memory information.

The implementation also uses:

- HTTP response compression
- Rate limiting
- Request logging
- Runtime performance measurement
- Memory monitoring
- Modular middleware

---

# Route Organization

Routes are separated by resource:

```text
userRoutes.js
productRoutes.js
orderRoutes.js
```

Each route should clearly define:

- HTTP method
- Endpoint path
- Required middleware
- Validation
- Service operation
- Success response
- Error propagation

This keeps the API modular and maintainable.

---

# Production-Oriented Practices

The Day 9 implementation demonstrates:

- Separation of concerns
- Modular route organization
- Custom middleware
- Centralized error management
- Input validation and sanitization
- Authentication
- Authorization
- Security headers
- CORS configuration
- Rate limiting
- HTTP compression
- Structured logging
- Performance monitoring
- Service-layer separation

---

# Testing & Validation

The Day 9 implementation was validated through:

## Middleware Testing

- Authentication middleware
- Invalid authentication
- Validation middleware
- Error handling middleware
- Performance middleware
- Logging middleware

## Route Testing

- Health endpoint
- User registration
- User login
- Authenticated profile
- Role-based authorization
- User listing
- Product listing
- Product creation
- Product retrieval
- Product stock update
- Order creation
- Order retrieval
- User order retrieval
- Order status update
- Not-found handling
- Unknown routes
- Rate limiting

The expected API behavior includes:

```text
Health check                → 200
Validation error            → 400
Missing authentication      → 401
Invalid token               → 401
User registration           → 201
User login                  → 200
Authenticated profile       → 200
Insufficient permissions    → 403
Admin user list             → 200
Product list                → 200
Product creation            → 201
Product retrieval           → 200
Stock update                → 200
Order creation              → 201
Order retrieval             → 200
Order listing               → 200
Order status update         → 200
Not found                   → 404
Unknown route               → 404
Rate limiting               → 429
```

---

# Middleware Best Practices

## Order Matters

Middleware execution order is critical.

Security middleware should be placed early in the request pipeline.

Body parsing should happen before routes that depend on request body data.

Authentication, authorization, and validation should be applied where required.

Error-handling middleware should be registered after routes.

## Centralized Error Handling

Routes should pass errors to the centralized error handler:

```js
next(error);
```

This ensures consistent error responses.

## Security First

Security middleware should be configured early.

Protected resources should require authentication and authorization.

## Performance

Middleware should have focused responsibilities and avoid unnecessary processing.

Compression, rate limiting, logging, and performance monitoring should not contain business logic.

## Logging

Logs should contain enough contextual information to identify and troubleshoot failures.

---

# Documentation Structure

The Day 9 architecture documentation covers:

```text
Application Structure
Middleware Architecture
Authentication
Authorization
Validation
Error Handling
Logging
Performance Monitoring
Security
Route Organization
Service Layer
Request Flow
Testing
Best Practices
```

This provides a single reference for the Express.js architecture implemented during Day 9.

---

# Success Criteria

By the end of Day 9, the application should demonstrate:

- Express.js mastery
- Middleware architecture
- Custom middleware implementation
- Comprehensive error handling
- Input validation and sanitization
- Authentication
- Authorization
- Modular route handlers
- Security controls
- Performance-oriented middleware

---

# Next Steps

1. Commit the Day 9 implementation:

```text
Complete Day 9: Express & Middleware
```

2. Create a pull request for review.

3. Prepare for Day 10 by reviewing MongoDB and SQL/database concepts.

4. Update the daily training progress summary.

---

# Resources

- [Express.js Documentation](https://expressjs.com/)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [Express Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

# Conclusion

Day 9 establishes a modular Express.js backend with a middleware-driven request pipeline.

The implementation separates middleware, routes, and services while providing:

- Validation
- Authentication
- Authorization
- Centralized error handling
- Logging
- Security
- Rate limiting
- Compression
- Performance monitoring

This provides the backend foundation required for the database and API work that follows in the training program.