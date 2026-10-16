import { db } from './groupSettings.js'

db.exec(`
  CREATE TABLE IF NOT EXISTS economy_accounts (
    group_jid TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    daily_claim INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (group_jid, user_jid)
  );

  CREATE TABLE IF NOT EXISTS economy_settings (
    group_jid TEXT PRIMARY KEY,
    currency_name TEXT NOT NULL DEFAULT 'عيون الأشباح'
  );

  CREATE TABLE IF NOT EXISTS economy_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_group_jid TEXT NOT NULL,
    to_group_jid TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`)

export function ensureEconomy(groupJid) {
  db.prepare(`
    INSERT OR IGNORE INTO economy_settings
    (group_jid)
    VALUES (?)
  `).run(groupJid)
}

export function getCurrencyName(groupJid) {
  ensureEconomy(groupJid)

  return db.prepare(`
    SELECT currency_name
    FROM economy_settings
    WHERE group_jid = ?
  `).get(groupJid)?.currency_name || 'عيون الأشباح'
}

export function setCurrencyName(groupJid, name) {
  ensureEconomy(groupJid)

  db.prepare(`
    UPDATE economy_settings
    SET currency_name = ?
    WHERE group_jid = ?
  `).run(name, groupJid)
}

export function ensureAccount(groupJid, userJid) {
  ensureEconomy(groupJid)

  db.prepare(`
    INSERT OR IGNORE INTO economy_accounts
    (group_jid, user_jid, balance, daily_claim, created_at)
    VALUES (?, ?, 0, 0, ?)
  `).run(groupJid, userJid, Date.now())
}

export function getBalance(groupJid, userJid) {
  ensureAccount(groupJid, userJid)

  return Number(
    db.prepare(`
      SELECT balance
      FROM economy_accounts
      WHERE group_jid = ? AND user_jid = ?
    `).get(groupJid, userJid)?.balance || 0
  )
}

export function addBalance(groupJid, userJid, amount) {
  ensureAccount(groupJid, userJid)

  db.prepare(`
    UPDATE economy_accounts
    SET balance = balance + ?
    WHERE group_jid = ? AND user_jid = ?
  `).run(amount, groupJid, userJid)
}

export function removeBalance(groupJid, userJid, amount) {
  ensureAccount(groupJid, userJid)

  const result = db.prepare(`
    UPDATE economy_accounts
    SET balance = balance - ?
    WHERE group_jid = ?
      AND user_jid = ?
      AND balance >= ?
  `).run(amount, groupJid, userJid, amount)

  return result.changes > 0
}

export function claimDaily(groupJid, userJid, amount = 50000) {
  ensureAccount(groupJid, userJid)

  const account = db.prepare(`
    SELECT daily_claim
    FROM economy_accounts
    WHERE group_jid = ? AND user_jid = ?
  `).get(groupJid, userJid)

  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  if (account?.daily_claim && now - account.daily_claim < day) {
    return {
      claimed: false,
      remaining: day - (now - account.daily_claim)
    }
  }

  db.prepare(`
    UPDATE economy_accounts
    SET balance = balance + ?,
        daily_claim = ?
    WHERE group_jid = ? AND user_jid = ?
  `).run(amount, now, groupJid, userJid)

  return {
    claimed: true,
    amount
  }
}

export function getTop(groupJid, limit = 10) {
  ensureEconomy(groupJid)

  return db.prepare(`
    SELECT user_jid, balance
    FROM economy_accounts
    WHERE group_jid = ?
      AND balance > 0
    ORDER BY balance DESC
    LIMIT ?
  `).all(groupJid, limit)
}

export function transferBetweenGroups(
  fromGroup,
  toGroup,
  userJid,
  amount,
  currency
) {
  db.exec('BEGIN IMMEDIATE')

  try {
    ensureAccount(fromGroup, userJid)
    ensureAccount(toGroup, userJid)

    const removed = db.prepare(`
      UPDATE economy_accounts
      SET balance = balance - ?
      WHERE group_jid = ?
        AND user_jid = ?
        AND balance >= ?
    `).run(amount, fromGroup, userJid, amount)

    if (removed.changes === 0) {
      throw new Error('INSUFFICIENT_BALANCE')
    }

    db.prepare(`
      UPDATE economy_accounts
      SET balance = balance + ?
      WHERE group_jid = ?
        AND user_jid = ?
    `).run(amount, toGroup, userJid)

    db.prepare(`
      INSERT INTO economy_transfers
      (from_group_jid, to_group_jid, user_jid, amount, currency, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      fromGroup,
      toGroup,
      userJid,
      amount,
      currency,
      Date.now()
    )

    db.exec('COMMIT')

    return true
  } catch (err) {
    try {
      db.exec('ROLLBACK')
    } catch {}

    throw err
  }
}

export function resetEconomySettings(groupJid) {
  ensureEconomy(groupJid)

  db.prepare(`
    UPDATE economy_settings
    SET currency_name = 'عيون الأشباح'
    WHERE group_jid = ?
  `).run(groupJid)
}
