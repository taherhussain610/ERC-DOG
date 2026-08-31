"use strict";
/**
 * Database migration runner for the AtlasX Exchange.
 *
 * Usage:
 *   const { runMigrations } = require("./src/db/migrations");
 *   runMigrations(db);   // db is a better-sqlite3 Database instance
 *
 * Convention
 * ----------
 * Each migration is an object with:
 *   id      — monotonically increasing integer (never reuse or skip)
 *   name    — short human-readable description
 *   up(db)  — function that modifies the schema (runs inside a transaction)
 *
 * The runner maintains a `schema_migrations` table. A migration is only
 * executed once. Failures abort the migration transaction and re-throw.
 */

const MIGRATIONS = [
  {
    id: 1,
    name: "add_trc1155_contracts_table",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS trc1155_contracts (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          contract_address TEXT    NOT NULL UNIQUE,
          name             TEXT    NOT NULL,
          symbol           TEXT,
          network          TEXT    NOT NULL DEFAULT 'ethereum',
          rpc_url          TEXT,
          added_by         INTEGER NOT NULL,
          is_verified      INTEGER NOT NULL DEFAULT 0,
          created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(added_by) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS trc1155_tokens (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          contract_id  INTEGER NOT NULL,
          token_id     TEXT    NOT NULL,
          name         TEXT,
          description  TEXT,
          uri          TEXT,
          metadata     TEXT,
          total_supply TEXT,
          token_type   TEXT    NOT NULL DEFAULT 'fungible',
          created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
          UNIQUE(contract_id, token_id),
          FOREIGN KEY(contract_id) REFERENCES trc1155_contracts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS trc1155_transactions (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id          INTEGER NOT NULL,
          contract_id      INTEGER NOT NULL,
          token_id         TEXT    NOT NULL,
          transaction_type TEXT    NOT NULL,
          from_address     TEXT,
          to_address       TEXT,
          amount           TEXT    NOT NULL,
          tx_hash          TEXT,
          status           TEXT    NOT NULL DEFAULT 'pending',
          created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id)     REFERENCES users(id)              ON DELETE CASCADE,
          FOREIGN KEY(contract_id) REFERENCES trc1155_contracts(id)  ON DELETE CASCADE
        );
      `);
    },
  },
  {
    id: 2,
    name: "add_governance_proposals_table",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS governance_proposals (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          proposer_id   INTEGER NOT NULL,
          title         TEXT    NOT NULL,
          description   TEXT    NOT NULL,
          target        TEXT,
          calldata      TEXT,
          status        TEXT    NOT NULL DEFAULT 'active',
          votes_for     REAL    NOT NULL DEFAULT 0,
          votes_against REAL    NOT NULL DEFAULT 0,
          quorum        REAL    NOT NULL DEFAULT 0,
          created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
          closes_at     TEXT    NOT NULL,
          executed_at   TEXT,
          FOREIGN KEY(proposer_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS governance_votes (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          proposal_id INTEGER NOT NULL,
          voter_id    INTEGER NOT NULL,
          support     INTEGER NOT NULL,  -- 1=for, 0=against
          weight      REAL    NOT NULL DEFAULT 1,
          created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
          UNIQUE(proposal_id, voter_id),
          FOREIGN KEY(proposal_id) REFERENCES governance_proposals(id) ON DELETE CASCADE,
          FOREIGN KEY(voter_id)    REFERENCES users(id)                ON DELETE CASCADE
        );
      `);
    },
  },
];

/**
 * Run all pending migrations against `db`.
 * @param {import("better-sqlite3").Database} db
 */
function runMigrations(db) {
  // Ensure migrations tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT    NOT NULL,
      applied_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedIds = new Set(
    db.prepare("SELECT id FROM schema_migrations").all().map((r) => r.id)
  );

  const pending = MIGRATIONS.filter((m) => !appliedIds.has(m.id));
  if (pending.length === 0) return;

  for (const migration of pending) {
    const runMigration = db.transaction(() => {
      migration.up(db);
      db.prepare("INSERT INTO schema_migrations (id, name) VALUES (?, ?)").run(
        migration.id,
        migration.name
      );
    });

    try {
      runMigration();
      console.log(`✓ Migration ${migration.id}: ${migration.name}`);
    } catch (err) {
      console.error(`✗ Migration ${migration.id} (${migration.name}) failed:`, err.message);
      throw err;
    }
  }
}

module.exports = { runMigrations, MIGRATIONS };
