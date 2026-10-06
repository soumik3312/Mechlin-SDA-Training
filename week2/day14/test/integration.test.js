const request = require('supertest');

const app =
  require('../server/app');

const {
  store,
  resetStore
} = require('../models/store');

async function runTests() {
  console.log(
    '\n========== DAY 14 INTEGRATION TESTS ==========\n'
  );

  await resetStore();

  // --------------------------------------------------
  // 1. Health
  // --------------------------------------------------
  const health =
    await request(app)
      .get('/health')
      .expect(200);

  if (
    health.body.status !==
    'healthy'
  ) {
    throw new Error(
      'Health check failed'
    );
  }

  console.log(
    '1. Health check: PASS'
  );

  // --------------------------------------------------
  // 2. Metrics
  // --------------------------------------------------
  const metrics =
    await request(app)
      .get('/metrics')
      .expect(200);

  if (
    typeof metrics.body.uptime !==
    'number'
  ) {
    throw new Error(
      'Metrics endpoint failed'
    );
  }

  console.log(
    '2. Monitoring metrics: PASS'
  );

  // --------------------------------------------------
  // 3. Register
  // --------------------------------------------------
  const email =
    `e2e_${Date.now()}@example.com`;

  const register =
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name:
          'Integration Test User',
        email,
        password:
          'StrongPass@123'
      })
      .expect(201);

  if (
    !register.body.success ||
    !register.body.data.accessToken
  ) {
    throw new Error(
      'Registration failed'
    );
  }

  console.log(
    '3. User registration: PASS'
  );

  // --------------------------------------------------
  // 4. Login
  // --------------------------------------------------
  const login =
    await request(app)
      .post('/api/v1/auth/login')
      .send({
        email,
        password:
          'StrongPass@123'
      })
      .expect(200);

  const token =
    login.body.data.accessToken;

  if (!token) {
    throw new Error(
      'Login token missing'
    );
  }

  console.log(
    '4. User login: PASS'
  );

  // --------------------------------------------------
  // 5. Current user
  // --------------------------------------------------
  const me =
    await request(app)
      .get('/api/v1/auth/me')
      .set(
        'Authorization',
        `Bearer ${token}`
      )
      .expect(200);

  if (
    me.body.data.email !==
    email
  ) {
    throw new Error(
      'Authenticated user mismatch'
    );
  }

  console.log(
    '5. JWT authentication: PASS'
  );

  // --------------------------------------------------
  // 6. Browse products
  // --------------------------------------------------
  const products =
    await request(app)
      .get('/api/v1/products')
      .set(
        'Authorization',
        `Bearer ${token}`
      )
      .expect(200);

  if (
    !Array.isArray(
      products.body.data.products
    )
  ) {
    throw new Error(
      'Products response invalid'
    );
  }

  const product =
    products.body.data.products[0];

  console.log(
    '6. Product browsing: PASS'
  );

  // --------------------------------------------------
  // 7. Get specific product
  // --------------------------------------------------
  const specificProduct =
    await request(app)
      .get(
        `/api/v1/products/${product.id}`
      )
      .set(
        'Authorization',
        `Bearer ${token}`
      )
      .expect(200);

  if (
    specificProduct.body.data.id !==
    product.id
  ) {
    throw new Error(
      'Specific product lookup failed'
    );
  }

  console.log(
    '7. Product detail: PASS'
  );

  // --------------------------------------------------
  // 8. Create order
  // --------------------------------------------------
  const order =
    await request(app)
      .post('/api/v1/orders')
      .set(
        'Authorization',
        `Bearer ${token}`
      )
      .send({
        items: [
          {
            productId:
              product.id,
            quantity: 2
          }
        ],

        shippingAddress: {
          street:
            '123 Test Street',
          city:
            'Test City',
          state:
            'West Bengal',
          zipCode:
            '700001',
          country:
            'India'
        }
      })
      .expect(201);

  if (
    !order.body.data.id ||
    order.body.data.items
      .length !== 1
  ) {
    throw new Error(
      'Order creation failed'
    );
  }

  console.log(
    '8. Order creation: PASS'
  );

  // --------------------------------------------------
  // 9. Get orders
  // --------------------------------------------------
  const orders =
    await request(app)
      .get('/api/v1/orders')
      .set(
        'Authorization',
        `Bearer ${token}`
      )
      .expect(200);

  if (
    orders.body.data.orders
      .length !== 1
  ) {
    throw new Error(
      'Order retrieval failed'
    );
  }

  console.log(
    '9. User orders: PASS'
  );

  // --------------------------------------------------
  // 10. Analytics
  // --------------------------------------------------
  const analytics =
    await request(app)
      .get(
        '/api/v1/analytics?timeRange=30d'
      )
      .set(
        'Authorization',
        `Bearer ${token}`
      )
      .expect(200);

  if (
    analytics.body.data.orders !==
    1
  ) {
    throw new Error(
      'Analytics order count failed'
    );
  }

  if (
    analytics.body.data.revenue <=
    0
  ) {
    throw new Error(
      'Analytics revenue failed'
    );
  }

  console.log(
    '10. Analytics: PASS'
  );

  // --------------------------------------------------
  // 11. Missing authentication
  // --------------------------------------------------
  const authError =
    await request(app)
      .get('/api/v1/products')
      .expect(401);

  if (
    authError.body.error?.code !==
    'TOKEN_REQUIRED'
  ) {
    throw new Error(
      'Authentication error failed'
    );
  }

  console.log(
    '11. Authentication error handling: PASS'
  );

  // --------------------------------------------------
  // 12. Authorization
  // --------------------------------------------------
  const authorizationError =
    await request(app)
      .get('/api/v1/users')
      .set(
        'Authorization',
        `Bearer ${token}`
      )
      .expect(403);

  if (
    authorizationError.body.error?.code !==
    'INSUFFICIENT_PERMISSIONS'
  ) {
    throw new Error(
      'Authorization error failed'
    );
  }

  console.log(
    '12. Authorization error handling: PASS'
  );

  // --------------------------------------------------
  // 13. Validation
  // --------------------------------------------------
  const validationError =
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Invalid',
        email:
          'invalid-email',
        password: '123'
      })
      .expect(400);

  if (
    validationError.body.success !==
    false ||
    !validationError.body.error.details
  ) {
    throw new Error(
      'Validation error failed'
    );
  }

  console.log(
    '13. Validation error handling: PASS'
  );

  // --------------------------------------------------
  // 14. Concurrent requests
  // --------------------------------------------------
  const concurrentRequests =
    Array.from(
      { length: 10 },
      () =>
        request(app)
          .get(
            '/api/v1/products'
          )
          .set(
            'Authorization',
            `Bearer ${token}`
          )
    );

  const concurrentResponses =
    await Promise.all(
      concurrentRequests
    );

  concurrentResponses.forEach(
    (response) => {
      if (response.status !== 200) {
        throw new Error(
          'Concurrent request failed'
        );
      }
    }
  );

  console.log(
    '14. Concurrent requests: PASS'
  );

  // --------------------------------------------------
  // 15. Response performance
  // --------------------------------------------------
  const start =
    Date.now();

  await request(app)
    .get('/api/v1/products')
    .set(
      'Authorization',
      `Bearer ${token}`
    )
    .expect(200);

  const duration =
    Date.now() - start;

  if (duration >= 1000) {
    throw new Error(
      `Response too slow: ${duration}ms`
    );
  }

  console.log(
    `15. Response performance: PASS (${duration}ms)`
  );

  // --------------------------------------------------
  // 16. Metrics after traffic
  // --------------------------------------------------
  const finalMetrics =
    await request(app)
      .get('/metrics')
      .expect(200);

  if (
    finalMetrics.body.requestMetrics
      === undefined
  ) {
    throw new Error(
      'Request metrics missing'
    );
  }

  if (
    finalMetrics.body.requestCount <
    10
  ) {
    throw new Error(
      'Request count unexpectedly low'
    );
  }

  console.log(
    '16. Request monitoring: PASS'
  );

  // --------------------------------------------------
  // 17. Data flow verification
  // --------------------------------------------------
  const storedOrders =
    store.orders.filter(
      (item) =>
        item.userId ===
        me.body.data.id
    );

  if (
    storedOrders.length !==
    1
  ) {
    throw new Error(
      'Data synchronization failed'
    );
  }

  console.log(
    '17. Data synchronization: PASS'
  );

  console.log(
    '\n============================================'
  );

  console.log(
    'DAY 14 INTEGRATION TESTS: SUCCESS'
  );

  console.log(
    '============================================\n'
  );
}

runTests().catch(
  (error) => {
    console.error(
      '\nDAY 14 INTEGRATION TESTS: FAILED'
    );

    console.error(
      error.message
    );

    process.exit(1);
  }
);