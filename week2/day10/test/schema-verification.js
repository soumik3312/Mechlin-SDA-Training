const db = require('../database/postgresql');

async function verifySchema() {
  try {
    await db.connect();

    console.log('\n========== DAY 10 POSTGRESQL SCHEMA VERIFICATION ==========');

    console.log('\n--- TABLES ---');

    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.table(tables.rows);

    console.log('\n--- COLUMNS ---');

    const columns = await db.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    console.table(columns.rows);

    console.log('\n--- INDEXES ---');

    const indexes = await db.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    console.table(indexes.rows);

    console.log('\n--- FOREIGN KEYS ---');

    const foreignKeys = await db.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name;
    `);

    console.table(foreignKeys.rows);

    console.log('\nSchema verification: SUCCESS');
  } catch (error) {
    console.error('\nSchema verification: FAILED');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await db.disconnect().catch(() => {});
  }
}

verifySchema();