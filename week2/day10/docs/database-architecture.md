# Day 10 — MongoDB & SQL Database Architecture

## Overview

Day 10 focuses on database development using both MongoDB and PostgreSQL.

The implementation demonstrates a hybrid database architecture in which different database technologies can be selected according to data structure, consistency, scalability, and application requirements.

The Day 10 implementation includes:

- MongoDB with Mongoose
- PostgreSQL with connection pooling
- MongoDB schema design
- PostgreSQL relational design
- Database indexing
- Query optimization
- Data relationships
- Database migrations
- Schema management
- Hybrid database architecture
- Connection monitoring

---

## Learning Objectives

- Master MongoDB document database and NoSQL concepts
- Implement PostgreSQL relational database with SQL
- Design hybrid database architecture for different use cases
- Optimize database performance with indexing and query optimization
- Implement database migrations and schema management

---

# MongoDB Fundamentals

## Document Model

MongoDB stores data as BSON documents inside collections.

The document-oriented model supports flexible structures and allows related data to be represented within documents where appropriate.

The main MongoDB concepts are:

```text
Database
   |
   +-- Collection
          |
          +-- Document
                 |
                 +-- Fields
```

## Query Language

MongoDB supports database operations including:

- Create
- Read
- Update
- Delete
- Aggregation

Aggregation pipelines can be used to transform and analyze document data.

## Indexing

MongoDB supports different indexing strategies, including:

- Single-field indexes
- Compound indexes
- Text indexes
- Geospatial indexes

Indexes improve query performance when they match commonly used query patterns.

## Schema Design

MongoDB schema design requires choosing between:

- Embedded documents
- Referenced documents

Embedded data can keep closely related information together.

References can be used when relationships or independently managed data are more appropriate.

## Performance

MongoDB performance depends on:

- Appropriate indexes
- Efficient query patterns
- Aggregation design
- Connection management
- Connection pooling
- Data modeling

---

# PostgreSQL Fundamentals

## Relational Model

PostgreSQL uses a relational data model based on:

- Tables
- Rows
- Columns
- Relationships
- Constraints

The Day 10 schema uses relationships between users, products, orders, order items, and reviews.

## SQL Language

PostgreSQL supports multiple categories of SQL operations.

### DDL

Data Definition Language is used for database structure and schema operations.

Examples include:

```sql
CREATE
ALTER
DROP
```

### DML

Data Manipulation Language is used to modify stored data.

Examples include:

```sql
INSERT
UPDATE
DELETE
```

### DQL

Data Query Language is used to retrieve data.

The primary operation is:

```sql
SELECT
```

### DCL

Data Control Language is used to control database permissions and access.

Examples include:

```sql
GRANT
REVOKE
```

## Advanced Features

PostgreSQL provides advanced database capabilities such as:

- Views
- Stored procedures
- Functions
- Triggers
- Transactions

## Performance

PostgreSQL performance can be improved through:

- Appropriate indexes
- Efficient queries
- Query planning
- `EXPLAIN`
- `EXPLAIN ANALYZE`
- Connection pooling
- Partitioning where appropriate

## ACID Properties

PostgreSQL provides transactional behavior based on ACID principles:

```text
Atomicity
Consistency
Isolation
Durability
```

---

# Hybrid Database Architecture

The Day 10 architecture uses both MongoDB and PostgreSQL concepts.

```text
                    Application
                         |
              +----------+----------+
              |                     |
              v                     v
          MongoDB              PostgreSQL
              |                     |
              v                     v
       Document Data          Relational Data
```

## Use Case Analysis

MongoDB is suitable for data that benefits from:

- Flexible document structures
- Rapid schema evolution
- Document-oriented access
- Nested data representation

PostgreSQL is suitable for data that benefits from:

- Strong relational relationships
- Structured schemas
- Constraints
- Transactions
- ACID guarantees

The database selected for a particular workload should depend on its data model and consistency requirements.

## Data Modeling

The two systems use different modeling approaches.

### MongoDB

```text
Document
  |
  +-- Embedded Fields
  |
  +-- Nested Objects
  |
  +-- Arrays
```

### PostgreSQL

```text
Table
  |
  +-- Columns
  |
  +-- Primary Key
  |
  +-- Foreign Keys
  |
  +-- Constraints
```

## Data Consistency

Database architecture should consider the required consistency model.

MongoDB-based application workflows may use eventual consistency where appropriate.

PostgreSQL transactions provide strong transactional consistency for relational operations.

The consistency model should be selected according to application requirements.

## Scalability

Database scaling can involve:

```text
Horizontal Scaling
Vertical Scaling
```

The appropriate approach depends on workload, data volume, query patterns, and operational requirements.

---

# MongoDB Implementation

## MongoDB Connection

The MongoDB connection layer is implemented in:

```text
week2/day10/database/mongodb.js
```

The connection module provides:

- Mongoose connection
- Connection pooling configuration
- Server-selection timeout
- Socket timeout
- Connection state tracking
- Connection error handling
- Disconnect handling
- Reconnection handling
- Connection status reporting

The default development connection is:

```text
mongodb://localhost:27017/sda-training
```

The connection string can be configured using:

```text
MONGODB_URI
```

## Connection Pooling

The Mongoose configuration uses a maximum connection pool size:

```text
maxPoolSize: 10
```

Timeout configuration is also used to prevent indefinite connection attempts.

## Connection Monitoring

The connection module monitors:

```text
error
disconnected
reconnected
```

and updates the connection state accordingly.

## MongoDB User Model

The User model is implemented in:

```text
week2/day10/models/User.js
```

The schema includes:

- Name
- Email
- Password
- Role
- Avatar
- Active status
- Last login
- Preferences
- Profile
- Created timestamp
- Updated timestamp

## User Roles

Supported roles are:

```text
user
admin
moderator
```

## User Preferences

The model supports:

```text
Theme:
  light
  dark

Notifications:
  email
  push
```

## User Profile

The profile can contain:

- Bio
- Location
- Website

## MongoDB Indexes

The User schema defines indexes for:

```text
email
role
isActive
createdAt
```

These indexes support common lookup and filtering operations.

## Virtual Field

The User model provides a `fullName` virtual derived from the user's name.

## Password Security

Passwords are not selected by default.

Before saving a user, the password is hashed using `bcryptjs`.

The model also provides:

```js
comparePassword(candidatePassword)
```

for password verification.

## JWT Authentication

The model provides:

```js
generateAuthToken()
```

which generates a JWT containing:

```text
userId
email
role
```

The JWT secret and expiration can be configured through environment variables.

## Credential Lookup

The User model provides:

```js
findByCredentials(email, password)
```

which:

1. Locates the active user.
2. Loads the protected password field.
3. Compares the supplied password.
4. Returns the authenticated user when the credentials are valid.

## User Statistics

The User model also provides:

```js
getUserStats()
```

using a MongoDB aggregation pipeline to group users by role and count active users.

---

# PostgreSQL Implementation

## PostgreSQL Connection

The PostgreSQL connection layer is implemented in:

```text
week2/day10/database/postgresql.js
```

The connection module provides:

- PostgreSQL connection pooling
- Connection testing
- Query execution
- Client access
- Pool error handling
- Connection status
- Graceful disconnection

## Connection Pool

The PostgreSQL pool uses:

```text
Maximum connections: 20
Idle timeout: 30000 ms
Connection timeout: 2000 ms
```

Environment variables can configure:

```text
POSTGRES_USER
POSTGRES_HOST
POSTGRES_DB
POSTGRES_PASSWORD
POSTGRES_PORT
```

The development defaults use:

```text
Host: localhost
Port: 5432
Database: sda_training
User: postgres
```

## Query Execution

The connection module provides:

```js
query(text, params)
```

Queries use parameterized values to keep application-generated SQL separated from input values.

Query execution time and returned row counts can be recorded for monitoring.

---

# PostgreSQL Product Model

The Product model is implemented in:

```text
week2/day10/models/Product.js
```

The model supports:

- Product creation
- Product lookup
- Product listing
- Product updates
- Product deletion
- Product statistics
- Category statistics

## Product Filtering

The model supports filtering by:

```text
category
minimum price
maximum price
search text
```

## Product Search

Search operations can use PostgreSQL `ILIKE` for case-insensitive matching against:

```text
name
description
```

## Sorting

Product results can be sorted using allowed fields such as:

```text
id
name
price
category
stock
created_at
updated_at
```

Sorting supports:

```text
ASC
DESC
```

## Pagination

Queries can use:

```text
LIMIT
OFFSET
```

for paginated result sets.

## Product Statistics

The model provides aggregate statistics including:

```text
total products
average price
minimum price
maximum price
total stock
```

## Category Statistics

Category-level statistics include:

```text
category
product count
average price
total stock
```

---

# Relational Schema

The PostgreSQL migration layer defines relational tables for:

```text
users
products
orders
order_items
reviews
```

Relationships include:

```text
User
 |
 +---- Orders
        |
        +---- Order Items
                 |
                 +---- Product

Product
 |
 +---- Reviews
```

Foreign keys maintain relationships between the tables.

---

# Database Migrations

Database migrations are implemented in:

```text
week2/day10/migrations/
```

The migrations provide schema creation and rollback operations.

## Users Migration

The first migration creates the `users` table with:

- UUID primary key
- Name
- Email
- Password hash
- Role
- Avatar
- Active status
- Last login
- Preferences
- Profile
- Created timestamp
- Updated timestamp

The migration also creates indexes for:

```text
email
role
is_active
created_at
```

## Product and Related Tables Migration

The second migration creates:

```text
products
orders
order_items
reviews
```

The schema uses UUID identifiers and foreign-key relationships.

## Database Constraints

The schema uses constraints for:

- Primary keys
- Unique email addresses
- Valid user roles
- Non-negative product prices
- Non-negative stock
- Positive order quantities
- Valid review ratings
- Foreign-key relationships

## Migration Rollback

Each migration provides:

```js
up()
down()
```

The `up()` function creates the required schema.

The `down()` function removes the schema created by that migration.

This provides a basic mechanism for controlled schema management.

---

# Indexing Strategy

Indexing is important for database performance.

## MongoDB

The User model uses indexes for:

```text
email
role
isActive
createdAt
```

## PostgreSQL

The migration schema creates indexes for:

```text
users.email
users.role
users.is_active
users.created_at

products.category
products.price
products.created_at

orders.user_id
orders.created_at

order_items.order_id
order_items.product_id

reviews.product_id
reviews.rating
```

Indexes should be designed around actual query patterns rather than added without considering write and storage costs.

---

# Query Optimization

## MongoDB

MongoDB query performance can be improved through:

- Appropriate indexes
- Efficient filters
- Aggregation pipelines
- Suitable document design
- Connection management

## PostgreSQL

PostgreSQL query performance can be improved through:

- Proper indexes
- Parameterized queries
- Efficient joins
- Query planning
- `EXPLAIN`
- `EXPLAIN ANALYZE`
- Connection pooling

---

# Connection Management

Both databases use dedicated connection modules.

```text
Application
    |
    +---- MongoDB Connection
    |
    +---- PostgreSQL Pool
```

This keeps database connection logic