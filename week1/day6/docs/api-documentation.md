# API Documentation

## Overview

The Advanced Dashboard API provides REST endpoints for accessing users, revenue, and order data, along with WebSocket support for real-time updates.

## Base URL

`https://api.dashboard.com/v1`

## Authentication

All API requests require authentication via JWT token in the `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

---

# Endpoints

## Users

### GET /users

Retrieve all users with pagination and filtering.

### Parameters

| Parameter | Type    | Required | Default     | Description                  |
| --------- | ------- | -------- | ----------- | ---------------------------- |
| `page`    | integer | No       | 1           | Page number                  |
| `limit`   | integer | No       | 10          | Items per page               |
| `search`  | string  | No       | -           | Search query                 |
| `sort`    | string  | No       | `createdAt` | Sort field                   |
| `order`   | string  | No       | -           | Sort order (`asc` or `desc`) |

### Request

```http
GET /users?page=1&limit=10&search=John&sort=createdAt&order=desc
Authorization: Bearer <jwt_token>
```

### Response

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_123",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "admin",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

---

### POST /users

Create a new user.

### Request Body

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "user",
  "password": "securepassword"
}
```

### Request

```http
POST /users
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

# Revenue

## GET /revenue

Retrieve revenue data with time range filtering.

### Parameters

| Parameter     | Type   | Required | Description                                     |
| ------------- | ------ | -------- | ----------------------------------------------- |
| `startDate`   | string | Yes      | Start date in ISO format                        |
| `endDate`     | string | Yes      | End date in ISO format                          |
| `granularity` | string | No       | Data granularity (`daily`, `weekly`, `monthly`) |

### Request

```http
GET /revenue?startDate=2024-01-01&endDate=2024-01-31&granularity=daily
Authorization: Bearer <jwt_token>
```

### Response

```json
{
  "success": true,
  "data": {
    "total": 45678.90,
    "change": 12.5,
    "trend": "up",
    "data": [
      {
        "date": "2024-01-01",
        "revenue": 1234.56,
        "transactions": 45
      }
    ]
  }
}
```

---

# Orders

## GET /orders

Retrieve order data with filtering and sorting.

### Parameters

| Parameter   | Type   | Required | Description         |
| ----------- | ------ | -------- | ------------------- |
| `status`    | string | No       | Order status filter |
| `dateRange` | string | No       | Date range filter   |
| `sort`      | string | No       | Sort field          |

### Request

```http
GET /orders?status=completed&dateRange=2024-01-01,2024-01-31&sort=createdAt
Authorization: Bearer <jwt_token>
```

### Response

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_123",
        "customerId": "customer_456",
        "total": 99.99,
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "summary": {
      "total": 100,
      "completed": 85,
      "pending": 10,
      "cancelled": 5
    }
  }
}
```

---

# Error Responses

## 400 Bad Request

Returned when the request contains invalid parameters.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## 401 Unauthorized

Returned when authentication is missing or invalid.

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

## 404 Not Found

Returned when the requested resource does not exist.

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

## 500 Internal Server Error

Returned when an unexpected server error occurs.

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

# Rate Limiting

The API applies the following rate limits:

* **1000 requests per hour per IP**
* **100 requests per minute per user**
* Rate-limit headers are included in API responses.

---

# WebSocket Events

## Connection

Connect to the WebSocket server using:

```javascript
const ws = new WebSocket('wss://api.dashboard.com/ws');
```

## Events

The WebSocket connection supports the following events:

| Event          | Description            |
| -------------- | ---------------------- |
| `connected`    | Connection established |
| `disconnected` | Connection lost        |
| `dataUpdate`   | Real-time data update  |
| `error`        | Error occurred         |

## Example Usage

```javascript
ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'dataUpdate') {
    updateDashboard(data.payload);
  }
};
```
