Day 8 — Node.js Deep Dive & Architecture

Overview

Day 8 focuses on advanced Node.js server-side development, with emphasis on asynchronous programming, modular architecture, clustering, multi-service design, error handling, logging, and performance optimization.

The backend is organized so that the main Node.js application coordinates the HTTP server, Express routes, middleware, business services, and real-time communication.

Node.js Architecture

                         Client
                           |
                           v
                  +------------------+
                  |   HTTP / Socket  |
                  |      Server      |
                  +--------+---------+
                           |
              +------------+------------+
              |                         |
              v                         v
        Express API                Socket.IO
              |
       +------+------+
       |             |
       v             v
   Middleware      Routes
                     |
          +----------+----------+
          |          |          |
          v          v          v
        Users     Products    Orders
          |          |          |
          +----------+----------+
                     |
                     v
               Service Layer
                     |
          +----------+----------+
          |          |          |
          v          v          v
        User      Product      Order
       Service    Service     Service
                     |
                     v
             Notification Service

The main application entry point is week2/day8/server/index.js.

The application is divided into routes, middleware, services, and supporting modules so that each part has a clear responsibility.

Node.js Fundamentals

The implementation demonstrates core Node.js concepts including:

The event loop and non-blocking execution

Callbacks, Promises, and async/await

Event-driven programming

Modules and reusable components

Streams and buffers

Process and runtime management

Asynchronous programming allows I/O-bound operations to be handled without blocking the main execution flow.

Modular Architecture

The backend follows a service-oriented and modular structure:

week2/day8/
├── server/
│   ├── index.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── logger.js
│   │   └── performance.js
│   ├── routes/
│   │   ├── healthRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── productRoutes.js
│   │   └── userRoutes.js
│   └── services/
│       ├── notificationService.js
│       ├── orderService.js
│       ├── productService.js
│       └── userService.js
└── docs/
    └── nodejs-architecture.md

Routes handle HTTP requests, middleware handles cross-cutting concerns, and services contain business logic.

Multi-Service Application

The application is divided into independent service modules.

User Service

Handles user creation, authentication, lookup, updates, deletion, listing, JWT validation, logout, and session management.

Product Service

Handles product creation, lookup, updates, deletion, listing, filtering, searching, and stock management.

Order Service

Handles order creation, retrieval, user-specific orders, status updates, and cancellation.

Supported order states are:

pending
confirmed
processing
shipped
delivered
cancelled

Notification Service

Handles notification creation, retrieval, read status management, and deletion. It uses Node.js EventEmitter to support event-driven behavior.

Architecture Patterns

The Day 8 architecture introduces common backend patterns:

Event-Driven Architecture

EventEmitter is used to communicate service events without tightly coupling every component to the others.

Microservice-Oriented Structure

Business responsibilities are separated into focused services so that each service can evolve independently.

Dependency Injection

Dependencies should be passed into modules rather than created deep inside business logic, improving modularity and testability.

Factory Pattern

Factories can be used to create related objects or service instances through a common interface.

Observer Pattern

Components can subscribe to events and react when state changes or service events occur.

Node.js Clustering

The application uses the built-in cluster module to run multiple worker processes.

Primary Process
      |
      +---- Worker 1
      +---- Worker 2
      +---- Worker 3
      +---- ...
      +---- Worker N

The primary process determines the available CPU cores, creates worker processes, and can replace workers when they terminate.

Clustering allows Node.js applications to make better use of multiple CPU cores and provides a foundation for process-level scalability.

Error Handling

The application uses centralized error handling through errorHandler.js.

The error-handling layer provides a consistent response structure and handles application errors, validation-related errors, authentication errors, and unexpected errors.

Centralized handling keeps error logic out of individual route handlers and makes the API behavior more consistent.

Logging

Logging is implemented using Winston.

The logging layer records request and application information such as:

HTTP method and URL

Response status

Request duration

Client information

Timestamp

Error messages and stack traces

Logs are written to:

week2/day8/logs/error.log
week2/day8/logs/combined.log

Performance Monitoring

The application includes performance monitoring middleware to measure request processing time and runtime information.

The monitoring layer records:

Request method

Request URL

Response status

Request duration

Memory information

Timestamp

The backend also exposes health and metrics endpoints for runtime visibility:

GET /health
GET /health/metrics

The metrics endpoint provides process information, uptime, memory usage, Node.js version, platform, and architecture.

Middleware and Backend Protection

The Express application uses middleware for common backend concerns including:

Security headers through helmet

Cross-origin access through cors

Response compression through compression

API rate limiting through express-rate-limit

Authentication and role-based authorization

Request logging

Performance monitoring

This keeps security, observability, and request-processing concerns separate from business logic.

Real-Time Communication

Socket.IO is attached to the Node.js HTTP server to provide real-time communication.

The application supports events such as:

connection
join
user:update
order:create
disconnect

This allows clients and backend services to communicate through event-based real-time updates.

API and Service Flow

Incoming Request
       |
       v
Middleware
       |
       v
Authentication / Authorization
       |
       v
Route Handler
       |
       v
Service Layer
       |
       v
Business Logic
       |
       v
Response
       |
       v
Logging / Performance Monitoring

Best Practices

The Day 8 implementation follows these backend development practices:

Keep routes, middleware, and business logic separated.

Use asynchronous programming for I/O-bound operations.

Organize business logic into focused service modules.

Centralize error handling.

Use structured logging and performance monitoring.

Use clustering when process-level scaling is required.

Apply authentication and authorization to protected resources.

Keep security and request-processing concerns in middleware.

Use event-driven communication where loose coupling is useful.

Keep modules reusable, testable, and maintainable.

Summary

Day 8 establishes the Node.js backend architecture required for the Week 2 backend work. The implementation covers asynchronous server-side programming, modular and multi-service architecture, clustering, event-driven communication, centralized error handling, structured logging, performance monitoring, authentication middleware, and production-oriented backend practices.