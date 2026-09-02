const Database = require('better-sqlite3');
const db = new Database('./data/exchange.db');

console.log('\n=== DATABASE TABLES ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => console.log('✓', t.name));

console.log('\n=== USER COUNT ===');
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log('Total users:', userCount.count);

console.log('\n=== SAMPLE USER ===');
const user = db.prepare('SELECT id, username, email FROM users WHERE username = ?').get('demo_user');
console.log(JSON.stringify(user, null, 2));

console.log('\n=== WALLET TABLES ===');
const ethWallets = db.prepare('SELECT COUNT(*) as count FROM user_ethereum_wallets').get();
const bscWallets = db.prepare('SELECT COUNT(*) as count FROM user_bsc_wallets').get();
const solWallets = db.prepare('SELECT COUNT(*) as count FROM user_solana_wallets').get();
const tronWallets = db.prepare('SELECT COUNT(*) as count FROM user_tron_wallets').get();
console.log('Ethereum wallets:', ethWallets.count);
console.log('BSC wallets:', bscWallets.count);
console.log('Solana wallets:', solWallets.count);
console.log('TRON wallets:', tronWallets.count);

console.log('\n=== TRANSACTION COUNT ===');
const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get();
console.log('Total transactions:', txCount.count);

db.close();
console.log('\n✓ Database check complete');
