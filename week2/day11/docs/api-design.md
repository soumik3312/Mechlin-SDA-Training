# REST API Design Guide

## API Design Principles

### Resource-Based URLs

The API uses nouns to represent resources:

- `/api/v1/users`
- `/api/v1/products`
- `/api/v1/orders`
- `/api/v1/analytics`

Actions are represented through HTTP methods rather than verbs in URLs.

### HTTP Methods

- `GET` retrieves resources
- `POST` creates resources
- `PUT` represents complete replacement
- `PATCH` represents partial updates
- `DELETE` removes resources

### HTTP Status Codes

The API uses meaningful HTTP status codes:

- `200 OK` for successful retrieval/update
- `201 Created` for successful creation
- `204 No Content` for successful deletion
- `400 Bad Request` for validation errors
- `404 Not Found` for missing resources
- `429 Too Many Requests` for rate limiting
- `500 Internal Server Error` for unexpected failures

### Content Negotiation

The API supports version selection through the request path and
the `Accept` header.

Example:

`Accept: application/json; version=v1`

JSON is the default response format.

### Pagination

Collection endpoints support:

- `limit`
- `offset`

Example:

`GET /api/v1/products?limit=10&offset=0`

Responses include pagination information.

## API Versioning

The API uses URL-based versioning:

`/api/v1/...`

The versioning middleware also supports version information in the
`Accept` header.

Supported versions:

- `v1`
- `v2`

Unsupported versions return a `400 Bad Request` response.

## Caching

The API combines HTTP and application-level caching.

HTTP caching uses:

`Cache-Control: public, max-age=<seconds>`

Application caching uses Redis through the Day 11 cache service.

Cache responses expose:

- `X-Cache: HIT`
- `X-Cache: MISS`

This makes cache behavior observable during testing.

## Rate Limiting

The API provides multiple rate-limiting policies:

- General API limiter
- Strict limiter for sensitive endpoints
- Login limiter
- API-key based limiter

The general API limiter allows up to 100 requests per 15-minute
window per client.

Exceeding a configured limit returns:

`429 Too Many Requests`

## Security

The API includes:

- Helmet security headers
- CORS configuration
- Input validation using `express-validator`
- Rate limiting
- Centralized error handling
- `x-powered-by` header disabled

## Performance Optimization

The API includes:

- Response compression
- Redis caching
- Database query optimization from previous work
- Connection pooling from previous work
- Pagination
- Response timing can be measured during testing

## Error Handling

Errors use a consistent response structure:

```json
{
  "success": false,
  "error": {
    "message": "Resource not found",
    "code": "RESOURCE_NOT_FOUND"
  }
}