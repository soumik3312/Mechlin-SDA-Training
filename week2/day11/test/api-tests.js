const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost:3001';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function main() {
  console.log(
    '\n========== DAY 11 AUTOMATED API TESTS =========='
  );

  // Health
  const health = await request('/health');

  assert.strictEqual(health.statusCode, 200);
  console.log('PASS: Health endpoint');

  // API root
  const apiRoot = await request('/api/v1/');

  assert.strictEqual(apiRoot.statusCode, 200);

  const rootData = JSON.parse(apiRoot.body);

  assert.strictEqual(
    rootData.data.version,
    '1.0.0'
  );

  console.log('PASS: API root');

  // Users
  const users = await request('/api/v1/users');

  assert.strictEqual(users.statusCode, 200);
  assert.strictEqual(
    users.headers['x-api-version'],
    'v1'
  );

  console.log('PASS: Versioned users endpoint');

  // Pagination
  const paginated = await request(
    '/api/v1/users?limit=1&offset=0'
  );

  assert.strictEqual(paginated.statusCode, 200);

  const paginationData =
    JSON.parse(paginated.body);

  assert.ok(
    paginationData.pagination
  );

  assert.strictEqual(
    paginationData.pagination.limit,
    1
  );

  console.log('PASS: Pagination');

  // Product cache
  const cachePath =
    `/api/v1/products?automatedTest=${Date.now()}`;

  const firstProduct =
    await request(cachePath);

  assert.strictEqual(
    firstProduct.statusCode,
    200
  );

  assert.strictEqual(
    firstProduct.headers['x-cache'],
    'MISS'
  );

  assert.ok(
    firstProduct.headers['cache-control']
      .includes('max-age=60')
  );

  assert.ok(
    firstProduct.headers.etag
  );

  console.log(
    'PASS: HTTP caching headers'
  );

  const secondProduct =
    await request(cachePath);

  assert.strictEqual(
    secondProduct.statusCode,
    200
  );

  assert.strictEqual(
    secondProduct.headers['x-cache'],
    'HIT'
  );

  assert.strictEqual(
    firstProduct.body,
    secondProduct.body
  );

  console.log(
    'PASS: Redis cache HIT/MISS behavior'
  );

  // Product creation
  const newProduct = JSON.stringify({
    name: 'Automated Day 11 Product',
    description:
      'Product created during API testing.',
    price: 999.99,
    category: 'automated-test',
    stock: 5,
  });

  const createdProduct =
    await request('/api/v1/products', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(
          newProduct
        ),
      },

      body: newProduct,
    });

  assert.strictEqual(
    createdProduct.statusCode,
    201
  );

  console.log('PASS: Product creation');

  // Validation
  const invalidProduct =
    JSON.stringify({
      name: 'A',
      description: 'bad',
      price: -10,
      category: '',
      stock: -1,
    });

  const validation =
    await request('/api/v1/products', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(
          invalidProduct
        ),
      },

      body: invalidProduct,
    });

  assert.strictEqual(
    validation.statusCode,
    400
  );

  console.log(
    'PASS: Input validation'
  );

  // Not found
  const notFound =
    await request(
      '/api/v1/products/does-not-exist'
    );

  assert.strictEqual(
    notFound.statusCode,
    404
  );

  const notFoundData =
    JSON.parse(notFound.body);

  assert.strictEqual(
    notFoundData.success,
    false
  );

  console.log(
    'PASS: 404 error handling'
  );

  // Unsupported API version
  const unsupported =
    await request('/api/v3/products');

  assert.strictEqual(
    unsupported.statusCode,
    400
  );

  console.log(
    'PASS: API version validation'
  );

  // Header-based versioning
  const headerVersion =
    await request('/api/v1/users', {
      headers: {
        Accept:
          'application/json; version=v1',
      },
    });

  assert.strictEqual(
    headerVersion.statusCode,
    200
  );

  assert.strictEqual(
    headerVersion.headers['x-api-version'],
    'v1'
  );

  console.log(
    'PASS: Accept-header API versioning'
  );

  // Rate limiting
  let successfulRequests = 0;
  let rateLimitedRequests = 0;

  for (let i = 0; i < 101; i += 1) {
    const response = await request(
      `/api/v1/analytics/health?rateTest=${i}`
    );

    if (response.statusCode === 200) {
      successfulRequests += 1;
    }

    if (response.statusCode === 429) {
      rateLimitedRequests += 1;
    }
  }

  assert.ok(
    rateLimitedRequests >= 1,
    'Rate limiter did not return 429'
  );

  console.log(
    `PASS: Rate limiting (${successfulRequests} successful, ${rateLimitedRequests} rate-limited)`
  );

  // Performance
  const performanceStart =
    process.hrtime.bigint();

  await request('/api/v1/analytics/health');

  const performanceEnd =
    process.hrtime.bigint();

  const responseTimeMs =
    Number(
      performanceEnd - performanceStart
    ) / 1_000_000;

  assert.ok(
    responseTimeMs < 1000,
    'Response took longer than 1000 ms'
  );

  console.log(
    `PASS: API response performance (${responseTimeMs.toFixed(2)} ms)`
  );

  console.log(
    '\n========================================'
  );

  console.log(
    'DAY 11 AUTOMATED API TESTS: SUCCESS'
  );

  console.log(
    '========================================\n'
  );
}

main().catch((error) => {
  console.error(
    '\nDAY 11 AUTOMATED API TESTS: FAILED'
  );

  console.error(error.message);

  process.exitCode = 1;
});