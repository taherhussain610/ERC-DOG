const Database = require('better-sqlite3');
const db = new Database('./data/exchange.db');

console.log('Checking ERC-1155 tables...\n');

const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name LIKE 'erc1155%'
`).all();

if (tables.length === 0) {
  console.log('❌ No ERC-1155 tables found');
} else {
  console.log('✓ Found ERC-1155 tables:');
  tables.forEach(t => {
    console.log(`  - ${t.name}`);
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
    console.log(`    Rows: ${count.count}`);
  });
}

db.close();
