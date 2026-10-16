import { DatabaseSync } from 'node:sqlite'
import settings from '../config/settings.js'

const db = new DatabaseSync(settings.dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS group_settings (
    group_jid TEXT PRIMARY KEY,
    bot_chat INTEGER NOT NULL DEFAULT 1,
    moderation INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    messages INTEGER NOT NULL DEFAULT 1,
    welcome INTEGER NOT NULL DEFAULT 1,
    goodbye INTEGER NOT NULL DEFAULT 1,
    currency TEXT NOT NULL DEFAULT 'points',
    automod INTEGER NOT NULL DEFAULT 0,
    block_links INTEGER NOT NULL DEFAULT 0,
    welcome_text TEXT,
    goodbye_text TEXT
  );

  CREATE TABLE IF NOT EXISTS automod_words (
    group_jid TEXT NOT NULL,
    word TEXT NOT NULL,
    PRIMARY KEY (group_jid, word)
  );

  CREATE TABLE IF NOT EXISTS locked_commands (
    group_jid TEXT NOT NULL,
    command TEXT NOT NULL,
    PRIMARY KEY (group_jid, command)
  );

  CREATE TABLE IF NOT EXISTS muted_users (
    group_jid TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    muted_at INTEGER NOT NULL,
    PRIMARY KEY (group_jid, user_jid)
  );

  CREATE TABLE IF NOT EXISTS private_blocks (
    user_jid TEXT PRIMARY KEY,
    blocked_at INTEGER NOT NULL
  );
`)

export function ensureGroup(jid) {
  db.prepare(`
    INSERT OR IGNORE INTO group_settings
    (group_jid)
    VALUES (?)
  `).run(jid)
}

export function getSettings(jid) {
  ensureGroup(jid)

  return db.prepare(`
    SELECT *
    FROM group_settings
    WHERE group_jid = ?
  `).get(jid)
}

export function setSetting(jid, key, value) {
  ensureGroup(jid)

  const allowed = new Set([
    'bot_chat',
    'moderation',
    'hidden',
    'messages',
    'welcome',
    'goodbye',
    'currency',
    'automod',
    'block_links',
    'welcome_text',
    'goodbye_text'
  ])

  if (!allowed.has(key)) {
    throw new Error(`Invalid setting: ${key}`)
  }

  db.prepare(`
    UPDATE group_settings
    SET ${key} = ?
    WHERE group_jid = ?
  `).run(value, jid)
}

export function resetSettings(jid) {
  db.prepare(`
    INSERT INTO group_settings
    (group_jid)
    VALUES (?)
    ON CONFLICT(group_jid)
    DO UPDATE SET
      bot_chat = 1,
      moderation = 0,
      hidden = 0,
      messages = 1,
      welcome = 1,
      goodbye = 1,
      currency = 'points',
      automod = 0,
      block_links = 0,
      welcome_text = NULL,
      goodbye_text = NULL
  `).run(jid)
}

export function lockCommand(jid, command) {
  ensureGroup(jid)

  const result = db.prepare(`
    INSERT OR IGNORE INTO locked_commands
    (group_jid, command)
    VALUES (?, ?)
  `).run(jid, command)

  return result.changes > 0
}

export function unlockCommand(jid, command) {
  const result = db.prepare(`
    DELETE FROM locked_commands
    WHERE group_jid = ?
      AND command = ?
  `).run(jid, command)

  return result.changes > 0
}

export function unlockAllCommands(jid) {
  const result = db.prepare(`
    DELETE FROM locked_commands
    WHERE group_jid = ?
  `).run(jid)

  return result.changes
}

export function isCommandLocked(jid, command) {
  return !!db.prepare(`
    SELECT 1
    FROM locked_commands
    WHERE group_jid = ?
      AND command = ?
    LIMIT 1
  `).get(jid, command)
}

export function getLockedCommands(jid) {
  return db.prepare(`
    SELECT command
    FROM locked_commands
    WHERE group_jid = ?
    ORDER BY command
  `).all(jid).map(row => row.command)
}

export function addAutomodWord(jid, word) {
  ensureGroup(jid)

  const cleanWord = String(word || '').trim().toLowerCase()

  if (!cleanWord) {
    return false
  }

  const result = db.prepare(`
    INSERT OR IGNORE INTO automod_words
    (group_jid, word)
    VALUES (?, ?)
  `).run(jid, cleanWord)

  return result.changes > 0
}

export function removeAutomodWord(jid, word) {
  const cleanWord = String(word || '').trim().toLowerCase()

  if (!cleanWord) {
    return false
  }

  const result = db.prepare(`
    DELETE FROM automod_words
    WHERE group_jid = ?
      AND word = ?
  `).run(jid, cleanWord)

  return result.changes > 0
}

export function getAutomodWords(jid) {
  return db.prepare(`
    SELECT word
    FROM automod_words
    WHERE group_jid = ?
    ORDER BY word
  `).all(jid).map(row => row.word)
}

export function hasAutomodWord(jid, text) {
  const words = getAutomodWords(jid)
  const normalizedText = String(text || '').toLowerCase()

  return words.some(word => normalizedText.includes(word))
}

export function muteUser(jid, userJid) {
  const result = db.prepare(`
    INSERT OR IGNORE INTO muted_users
    (group_jid, user_jid, muted_at)
    VALUES (?, ?, ?)
  `).run(jid, userJid, Date.now())

  return result.changes > 0
}

export function unmuteUser(jid, userJid) {
  const result = db.prepare(`
    DELETE FROM muted_users
    WHERE group_jid = ?
      AND user_jid = ?
  `).run(jid, userJid)

  return result.changes > 0
}

export function isMuted(jid, userJid) {
  return !!db.prepare(`
    SELECT 1
    FROM muted_users
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `).get(jid, userJid)
}

export { db }


export function addPrivateBlock(userJid) {
  const result = db.prepare(`
    INSERT OR IGNORE INTO private_blocks
    (user_jid, blocked_at)
    VALUES (?, ?)
  `).run(userJid, Date.now())

  return result.changes > 0
}

export function removePrivateBlock(userJid) {
  const result = db.prepare(`
    DELETE FROM private_blocks
    WHERE user_jid = ?
  `).run(userJid)

  return result.changes > 0
}

export function isPrivateBlocked(userJid) {
  return !!db.prepare(`
    SELECT 1
    FROM private_blocks
    WHERE user_jid = ?
    LIMIT 1
  `).get(userJid)
}
