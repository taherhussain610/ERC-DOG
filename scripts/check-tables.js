const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'exchange.db');
const db = new Database(dbPath);

try {
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
  console.log('✅ Database Tables:', tables.length);
  tables.forEach(t => console.log('  -', t.name));
  
  // Count users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('\n📊 Users:', userCount.count);
  
  // Count transactions
  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
  console.log('📊 Transactions:', txCount.count);
  
  console.log('\n✅ Database is operational');
} catch (error) {
  console.error('❌ Database error:', error.message);
} finally {
  db.close();
}
