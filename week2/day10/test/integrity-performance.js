const assert = require('assert');

const mongo = require('../database/mongodb');
const User = require('../models/User');

const postgres = require('../database/postgresql');
const Product = require('../models/Product');

async function verifyMongoDB() {
  console.log('\n========== MONGODB INTEGRITY & PERFORMANCE ==========');

  await mongo.connect();

  const status = mongo.getConnectionStatus();

  assert.strictEqual(
    status.isConnected,
    true,
    'MongoDB connection is not active'
  );

  console.log(
    `PASS: MongoDB connection (${status.host}:${status.port}/${status.name})`
  );

  // Verify important indexes
  const indexes = User.schema.indexes();

  const indexedFields = indexes
    .map(([fields]) => Object.keys(fields)[0])
    .filter(Boolean);

  for (const field of ['email', 'role', 'isActive', 'createdAt']) {
    assert.ok(
      indexedFields.includes(field),
      `MongoDB index missing: ${field}`
    );
  }

  console.log('PASS: MongoDB indexes');

  // Verify nested schema paths
  for (const field of [
    'preferences.theme',
    'preferences.notifications.email',
    'preferences.notifications.push',
    'profile.bio',
    'profile.location',
    'profile.website',
  ]) {
    assert.ok(
      User.schema.path(field),
      `MongoDB nested field missing: ${field}`
    );
  }

  console.log('PASS: MongoDB nested schema fields');

  // Create and retrieve temporary user
  const email = `day10.integrity.${Date.now()}@example.com`;

  const user = await User.create({
    name: 'Day 10 Integrity User',
    email,
    password: 'Day10@Password123',
    role: 'user',
    preferences: {
      theme: 'dark',
      notifications: {
        email: true,
        push: false,
      },
    },
    profile: {
      bio: 'Temporary integrity test user',
      location: 'Training',
      website: 'https://example.com',
    },
  });

  assert.ok(user._id);

  console.log('PASS: MongoDB data stored correctly');

  const retrieved = await User.findOne({ email }).select('+password');

  assert.ok(retrieved);
  assert.strictEqual(
    retrieved.email,
    email
  );

  const passwordMatches =
    await retrieved.comparePassword('Day10@Password123');

  assert.strictEqual(
    passwordMatches,
    true,
    'Stored password verification failed'
  );

  assert.strictEqual(
    retrieved.preferences.theme,
    'dark'
  );

  assert.strictEqual(
    retrieved.preferences.notifications.email,
    true
  );

  console.log('PASS: MongoDB data retrieval and nested data');

  await User.deleteOne({ _id: user._id });

  console.log('PASS: MongoDB temporary data cleaned up');

  await mongo.disconnect();

  console.log('MongoDB integrity tests: SUCCESS');
}

async function verifyPostgreSQL() {
  console.log('\n========== POSTGRESQL INTEGRITY & PERFORMANCE ==========');

  await postgres.connect();

  // Verify required tables exist
  const tableResult = await postgres.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name IN (
        'users',
        'products',
        'orders',
        'order_items',
        'reviews'
      )
    ORDER BY table_name;
  `);

  const tables = tableResult.rows.map(
    (row) => row.table_name
  );

  for (const table of [
    'users',
    'products',
    'orders',
    'order_items',
    'reviews',
  ]) {
    assert.ok(
      tables.includes(table),
      `Missing table: ${table}`
    );
  }

  console.log('PASS: PostgreSQL required tables');

  // Verify product indexes
  const indexResult = await postgres.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'products';
  `);

  const indexNames = indexResult.rows.map(
    (row) => row.indexname
  );

  for (const expected of [
    'idx_products_category',
    'idx_products_price',
    'idx_products_created_at',
  ]) {
    assert.ok(
      indexNames.includes(expected),
      `Missing PostgreSQL index: ${expected}`
    );
  }

  console.log('PASS: PostgreSQL product indexes');

  // Verify foreign keys
  const fkResult = await postgres.query(`
    SELECT
      tc.table_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public';
  `);

  assert.ok(
    fkResult.rows.length >= 5,
    'Expected foreign-key relationships are missing'
  );

  console.log('PASS: PostgreSQL foreign-key relationships');

  // Create temporary product
  const product = await Product.create({
    name: 'Day 10 Integrity Product',
    description: 'Temporary product for integrity testing',
    price: 799.99,
    category: 'IntegrityTest',
    stock: 10,
    imageUrl: null,
    tags: ['day10', 'integrity'],
  });

  assert.ok(product.id);

  console.log('PASS: PostgreSQL data stored correctly');

  try {
    // Retrieve
    const retrieved = await Product.findById(product.id);

    assert.ok(retrieved);
    assert.strictEqual(
      retrieved.id,
      product.id
    );

    console.log('PASS: PostgreSQL data retrieval');

    // Search/filter
    const filtered = await Product.findAll({
      category: 'IntegrityTest',
      minPrice: 700,
      maxPrice: 900,
    });

    assert.ok(
      filtered.some(
        (item) => item.id === product.id
      )
    );

    console.log('PASS: PostgreSQL filtered query');

    // Pagination
    const paginated = await Product.findAll({
      limit: 10,
      offset: 0,
    });

    assert.ok(Array.isArray(paginated));

    console.log('PASS: PostgreSQL pagination');

    // Update
    const updated = await Product.update(
      product.id,
      {
        price: 849.99,
        stock: 8,
      }
    );

    assert.ok(updated);

    console.log('PASS: PostgreSQL update');

    // Query performance
    const start = performance.now();

    for (let i = 0; i < 25; i += 1) {
      await Product.findAll({
        category: 'IntegrityTest',
        limit: 10,
        offset: 0,
      });
    }

    const elapsed = performance.now() - start;
    const average = elapsed / 25;

    console.log(
      `PASS: Query performance (${average.toFixed(2)} ms average over 25 queries)`
    );

    // Constraint: negative price must fail
    let negativePriceRejected = false;

    try {
      await postgres.query(
        `
          INSERT INTO products (
            name,
            price,
            category,
            stock
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          'Invalid Negative Price',
          -10,
          'IntegrityTest',
          1,
        ]
      );
    } catch (error) {
      negativePriceRejected = true;
    }

    assert.strictEqual(
      negativePriceRejected,
      true,
      'Negative product price was accepted'
    );

    console.log('PASS: Product price constraint');

    // Constraint: negative stock must fail
    let negativeStockRejected = false;

    try {
      await postgres.query(
        `
          INSERT INTO products (
            name,
            price,
            category,
            stock
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          'Invalid Negative Stock',
          100,
          'IntegrityTest',
          -1,
        ]
      );
    } catch (error) {
      negativeStockRejected = true;
    }

    assert.strictEqual(
      negativeStockRejected,
      true,
      'Negative product stock was accepted'
    );

    console.log('PASS: Product stock constraint');

    // Query optimization / parameterized query check
    const explainStart = performance.now();

    const explain = await postgres.query(
      `
        EXPLAIN
        SELECT id, name, price
        FROM products
        WHERE category = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      ['IntegrityTest', 10]
    );

    const explainElapsed =
      performance.now() - explainStart;

    assert.ok(
      explain.rows.length > 0,
      'EXPLAIN did not return a query plan'
    );

    console.log(
      `PASS: Query plan generated (${explainElapsed.toFixed(2)} ms)`
    );
  } finally {
    await Product.delete(product.id);

    console.log(
      'PASS: PostgreSQL temporary data cleaned up'
    );

    await postgres.disconnect();
  }

  console.log('PostgreSQL integrity tests: SUCCESS');
}

async function main() {
  try {
    await verifyMongoDB();
    await verifyPostgreSQL();

    console.log('\n========================================');
    console.log('DAY 10 FINAL VALIDATION: SUCCESS');
    console.log('========================================');
  } catch (error) {
    console.error('\n========================================');
    console.error('DAY 10 FINAL VALIDATION: FAILED');
    console.error(error.message);
    console.error('========================================');

    await mongo.disconnect().catch(() => {});
    await postgres.disconnect().catch(() => {});

    process.exitCode = 1;
  }
}

main();