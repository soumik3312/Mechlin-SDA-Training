const mongoose = require('mongoose');

const mongo = require('../database/mongodb');
const User = require('../models/User');
const postgres = require('../database/postgresql');
const Product = require('../models/Product');

const testEmail = `day10.test.${Date.now()}@example.com`;

async function testMongoUserModel() {
  console.log('\n========== MONGODB USER MODEL ==========');

  await mongo.connect();

  const schema = User.schema;

  // Required top-level fields
  const requiredFields = ['name', 'email', 'password'];

  for (const field of requiredFields) {
    if (!schema.path(field)?.isRequired) {
      throw new Error(`Required field missing: ${field}`);
    }
  }

  // Nested preference fields
  const nestedFields = [
    'preferences.theme',
    'preferences.notifications.email',
    'preferences.notifications.push',
  ];

  for (const field of nestedFields) {
    if (!schema.path(field)) {
      throw new Error(`Nested field missing: ${field}`);
    }
  }

  console.log('PASS: User schema fields');

  // Index verification
  const indexes = schema.indexes();
  const indexFields = indexes.map(([fields]) => Object.keys(fields)[0]);

  for (const field of ['email', 'role', 'isActive', 'createdAt']) {
    if (!indexFields.includes(field)) {
      throw new Error(`Expected index missing: ${field}`);
    }
  }

  console.log('PASS: User indexes');

  // Valid document
  const user = new User({
    name: 'Day 10 Test User',
    email: testEmail,
    password: 'TestPassword123!',
    role: 'user',
  });

  await user.validate();

  console.log('PASS: Valid User validation');

  // Invalid role
  const invalidUser = new User({
    name: 'Invalid Role User',
    email: `invalid.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    role: 'invalid-role',
  });

  try {
    await invalidUser.validate();
    throw new Error('Invalid role was accepted');
  } catch (error) {
    if (error.name !== 'ValidationError') {
      throw error;
    }
  }

  console.log('PASS: Invalid role rejected');

  // Save user and test password hashing
  await user.save();

  if (!user.password || user.password === 'TestPassword123!') {
    throw new Error('Password was not hashed');
  }

  console.log('PASS: Password hashing');

  const passwordMatches = await user.comparePassword('TestPassword123!');

  if (!passwordMatches) {
    throw new Error('Password comparison failed');
  }

  console.log('PASS: Password comparison');

  await User.deleteOne({ _id: user._id });

  console.log('PASS: Temporary MongoDB user cleaned up');

  await mongo.disconnect();

  console.log('MongoDB User model tests: SUCCESS');
}

async function testPostgreSQLProductModel() {
  console.log('\n========== POSTGRESQL PRODUCT MODEL ==========');

  await postgres.connect();

  // Create temporary product
  const created = await Product.create({
    name: 'Day 10 Test Product',
    description: 'Temporary product for Day 10 model testing',
    price: 999.99,
    category: 'testing',
    stock: 25,
    image_url: 'https://example.com/test-product.jpg',
    tags: ['day10', 'test'],
  });

  if (!created?.id) {
    throw new Error('Product creation did not return an id');
  }

  const productId = created.id;

  console.log('PASS: Product creation');
  console.log('Created Product ID:', productId);

  try {
    // Find by ID
    const found = await Product.findById(productId);

    if (!found) {
      throw new Error('Created product could not be found');
    }

    console.log('PASS: Product findById');

    // Find all
    const list = await Product.findAll({
      category: 'testing',
    });

    if (!Array.isArray(list)) {
      throw new Error('Product findAll did not return an array');
    }

    console.log('PASS: Product findAll');

    // Update
    const updated = await Product.update(productId, {
      stock: 20,
      price: 1099.99,
    });

    if (!updated) {
      throw new Error('Product update failed');
    }

    console.log('PASS: Product update');

    // Stats
    const stats = await Product.getStats();

    if (!stats) {
      throw new Error('Product stats query failed');
    }

    console.log('PASS: Product statistics');

    // Category stats
    const categoryStats = await Product.getCategoryStats();

    if (!Array.isArray(categoryStats)) {
      throw new Error('Category statistics did not return an array');
    }

    console.log('PASS: Product category statistics');
  } finally {
    // Always clean up temporary product
    await Product.delete(productId);
    console.log('PASS: Temporary PostgreSQL product cleaned up');

    await postgres.disconnect();
  }

  console.log('PostgreSQL Product model tests: SUCCESS');
}

async function main() {
  try {
    await testMongoUserModel();
    await testPostgreSQLProductModel();

    console.log('\n========================================');
    console.log('DAY 10 MODEL VERIFICATION: SUCCESS');
    console.log('========================================');
  } catch (error) {
    console.error('\n========================================');
    console.error('DAY 10 MODEL VERIFICATION: FAILED');
    console.error(error.message);
    console.error('========================================');

    try {
      await mongo.disconnect();
    } catch (_) {}

    try {
      await postgres.disconnect();
    } catch (_) {}

    process.exitCode = 1;
  }
}

main();