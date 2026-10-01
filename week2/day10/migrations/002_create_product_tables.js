const postgresql = require('../database/postgresql');

async function up() {
  const query = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
      category VARCHAR(100) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      image_url VARCHAR(500),
      tags JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      total_amount NUMERIC(12, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      review_text TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_products_category
      ON products(category);

    CREATE INDEX IF NOT EXISTS idx_products_price
      ON products(price);

    CREATE INDEX IF NOT EXISTS idx_products_created_at
      ON products(created_at);

    CREATE INDEX IF NOT EXISTS idx_orders_user_id
      ON orders(user_id);

    CREATE INDEX IF NOT EXISTS idx_orders_created_at
      ON orders(created_at);

    CREATE INDEX IF NOT EXISTS idx_order_items_order_id
      ON order_items(order_id);

    CREATE INDEX IF NOT EXISTS idx_order_items_product_id
      ON order_items(product_id);

    CREATE INDEX IF NOT EXISTS idx_reviews_product_id
      ON reviews(product_id);

    CREATE INDEX IF NOT EXISTS idx_reviews_rating
      ON reviews(rating);
  `;

  await postgresql.query(query);

  console.log('Product and related tables created successfully');
}

async function down() {
  const query = `
    DROP TABLE IF EXISTS reviews CASCADE;
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
  `;

  await postgresql.query(query);

  console.log('Product and related tables dropped successfully');
}

module.exports = {
  up,
  down,
};