const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'exchange.db'));

const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();

console.log('\n📊 DATABASE TABLES (' + tables.length + ' total):');
console.log('─'.repeat(60));
tables.forEach((t, i) => {
  console.log(`${(i + 1).toString().padStart(2)}. ${t.name}`);
});

db.close();
