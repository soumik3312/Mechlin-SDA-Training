const request = require('supertest');

const app =
  require('../server/app');

const User =
  require('../models/User');

async function runTests() {
  console.log(
    '\n========== DAY 13 API DOCUMENTATION TESTS ==========\n'
  );

  User.clearUsers();

  // --------------------------------------------------
  // 1. Health
  // --------------------------------------------------
  const health =
    await request(app)
      .get('/health')
      .expect(200);

  if (!health.body.success) {
    throw new Error(
      'Health endpoint failed'
    );
  }

  console.log(
    '1. Health endpoint: PASS'
  );

  // --------------------------------------------------
  // 2. Swagger JSON
  // --------------------------------------------------
  const swaggerJson =
    await request(app)
      .get('/api/v1/docs/swagger.json')
      .expect(200);

  if (
    swaggerJson.body.openapi !==
    '3.0.0'
  ) {
    throw new Error(
      'OpenAPI version validation failed'
    );
  }

  if (
    swaggerJson.body.info?.title !==
    'SDA Training API'
  ) {
    throw new Error(
      'OpenAPI title validation failed'
    );
  }

  const pathCount =
    Object.keys(
      swaggerJson.body.paths || {}
    ).length;

  if (pathCount < 8) {
    throw new Error(
      `Expected at least 8 documented paths, found ${pathCount}`
    );
  }

  console.log(
    `2. OpenAPI specification: PASS (${pathCount} paths)`
  );

  // --------------------------------------------------
  // 3. Swagger UI
  // --------------------------------------------------
  const swaggerUi =
    await request(app)
      .get('/api/v1/docs/')
      .expect(200);

 if (
  !swaggerUi.text.includes('swagger-ui') &&
  !swaggerUi.text.includes('SDA Training API Documentation')
) {
  throw new Error(
    'Swagger UI content missing'
  );
}

  console.log(
    '3. Swagger UI: PASS'
  );

  // --------------------------------------------------
  // 4. Register
  // --------------------------------------------------
  const register =
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Day13 Admin',
        email:
          'day13admin@example.com',
        password:
          'StrongPass@123'
      })
      .expect(201);

  const token =
    register.body.data.accessToken;

  if (!token) {
    throw new Error(
      'Registration did not return access token'
    );
  }

  const registeredUser =
    User.findByEmail(
      'day13admin@example.com'
    );

  registeredUser.role =
    'admin';

  console.log(
    '4. Registration: PASS'
  );

  // --------------------------------------------------
  // 5. Login
  // --------------------------------------------------
  const login =
    await request(app)
      .post('/api/v1/auth/login')
      .send({
        email:
          'day13admin@example.com',
        password:
          'StrongPass@123'
      })
      .expect(200);

  const authToken =
    login.body.data.accessToken;

  if (!authToken) {
    throw new Error(
      'Login did not return access token'
    );
  }

  console.log(
    '5. Login: PASS'
  );

  // --------------------------------------------------
  // 6. /me
  // --------------------------------------------------
  const me =
    await request(app)
      .get('/api/v1/auth/me')
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .expect(200);

  if (
    me.body.data.email !==
    'day13admin@example.com'
  ) {
    throw new Error(
      '/me returned wrong user'
    );
  }

  console.log(
    '6. Protected /me endpoint: PASS'
  );

  // --------------------------------------------------
  // 7. Users list
  // --------------------------------------------------
  const users =
    await request(app)
      .get('/api/v1/users')
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .expect(200);

  if (
    !users.body.data.users ||
    !users.body.data.pagination
  ) {
    throw new Error(
      'Users API response invalid'
    );
  }

  console.log(
    '7. Users list: PASS'
  );

  // --------------------------------------------------
  // 8. Get specific user
  // --------------------------------------------------
  const userId =
    registeredUser.id;

  const singleUser =
    await request(app)
      .get(
        `/api/v1/users/${userId}`
      )
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .expect(200);

  if (
    singleUser.body.data.id !==
    userId
  ) {
    throw new Error(
      'Specific user lookup failed'
    );
  }

  console.log(
    '8. Get user by ID: PASS'
  );

  // --------------------------------------------------
  // 9. Update user
  // --------------------------------------------------
  const updated =
    await request(app)
      .put(
        `/api/v1/users/${userId}`
      )
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .send({
        name: 'Day13 Updated User'
      })
      .expect(200);

  if (
    updated.body.data.name !==
    'Day13 Updated User'
  ) {
    throw new Error(
      'User update failed'
    );
  }

  console.log(
    '9. Update user: PASS'
  );

  // --------------------------------------------------
  // 10. Missing authentication
  // --------------------------------------------------
  const unauthorized =
    await request(app)
      .get('/api/v1/users')
      .expect(401);

  if (
    unauthorized.body.success !==
    false
  ) {
    throw new Error(
      'Unauthorized request was incorrectly accepted'
    );
  }

  console.log(
    '10. Authentication protection: PASS'
  );

  // --------------------------------------------------
  // 11. Invalid route
  // --------------------------------------------------
  const notFound =
    await request(app)
      .get('/api/v1/does-not-exist')
      .expect(404);

  if (
    notFound.body.error?.code !==
    'ROUTE_NOT_FOUND'
  ) {
    throw new Error(
      '404 handling failed'
    );
  }

  console.log(
    '11. 404 handling: PASS'
  );

  // --------------------------------------------------
  // 12. Refresh token
  // --------------------------------------------------
  const refreshToken =
    login.body.data.refreshToken;

  const refreshed =
    await request(app)
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken
      })
      .expect(200);

  if (
    !refreshed.body.data.accessToken
  ) {
    throw new Error(
      'Refresh token test failed'
    );
  }

  console.log(
    '12. Token refresh: PASS'
  );

  // --------------------------------------------------
  // 13. OpenAPI schemas
  // --------------------------------------------------
  const schemas =
    swaggerJson.body
      .components
      .schemas;

  const requiredSchemas = [
    'User',
    'RegisterRequest',
    'LoginRequest',
    'TokenResponse',
    'Pagination',
    'Error'
  ];

  for (
    const schemaName
    of requiredSchemas
  ) {
    if (!schemas[schemaName]) {
      throw new Error(
        `Missing schema: ${schemaName}`
      );
    }
  }

  console.log(
    '13. OpenAPI schemas: PASS'
  );

  // --------------------------------------------------
  // 14. Security schemes
  // --------------------------------------------------
  const securitySchemes =
    swaggerJson.body
      .components
      .securitySchemes;

  if (
    !securitySchemes.bearerAuth ||
    !securitySchemes.apiKey
  ) {
    throw new Error(
      'Security schemes missing'
    );
  }

  console.log(
    '14. Security schemes: PASS'
  );

  // --------------------------------------------------
  // 15. Postman generation
  // --------------------------------------------------
  require(
    '../scripts/generatePostmanCollection'
  );

  const fs = require('fs');

  const path = require('path');

  const collectionPath =
    path.resolve(
      __dirname,
      '../docs/postman-collection.json'
    );

  if (
    !fs.existsSync(collectionPath)
  ) {
    throw new Error(
      'Postman collection was not generated'
    );
  }

  const collection =
    JSON.parse(
      fs.readFileSync(
        collectionPath,
        'utf8'
      )
    );

  if (
    !Array.isArray(
      collection.item
    ) ||
    collection.item.length < 8
  ) {
    throw new Error(
      'Postman collection is incomplete'
    );
  }

  console.log(
    `15. Postman collection: PASS (${collection.item.length} requests)`
  );

  // --------------------------------------------------
  // Cleanup
  // --------------------------------------------------
  User.clearUsers();

  console.log(
    '\n============================================'
  );

  console.log(
    'DAY 13 API DOCUMENTATION TESTS: SUCCESS'
  );

  console.log(
    '============================================\n'
  );
}

runTests().catch((error) => {
  console.error(
    '\nDAY 13 API DOCUMENTATION TESTS: FAILED'
  );

  console.error(
    error.message
  );

  process.exit(1);
});