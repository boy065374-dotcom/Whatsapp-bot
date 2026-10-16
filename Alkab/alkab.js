import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('./Alkab/alkab.db')

/*
 * 👻 PHANTOM ALKAB
 * Database Layer
 *
 * المسؤول عن:
 * - تسجيل الألقاب
 * - تغيير الألقاب
 * - حذف الألقاب
 * - البحث عن المستخدم باللقب
 * - البحث عن لقب المستخدم
 * - عرض ألقاب الجروب
 * - منع تكرار اللقب داخل نفس الجروب
 */

db.exec(`
  CREATE TABLE IF NOT EXISTS alkab (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    group_jid TEXT NOT NULL,

    user_jid TEXT NOT NULL,

    nickname TEXT NOT NULL,

    nickname_key TEXT NOT NULL,

    created_at INTEGER NOT NULL,

    updated_at INTEGER NOT NULL,

    UNIQUE(group_jid, user_jid),

    UNIQUE(group_jid, nickname_key)
  );

  CREATE INDEX IF NOT EXISTS idx_alkab_group
  ON alkab(group_jid);

  CREATE INDEX IF NOT EXISTS idx_alkab_nickname
  ON alkab(group_jid, nickname_key);

  CREATE INDEX IF NOT EXISTS idx_alkab_user
  ON alkab(group_jid, user_jid);
`)

/* =========================
   Helpers
========================= */

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeNickname(value) {
  return normalizeText(value)
    .replace(/\s+/g, ' ')
}

function nicknameKey(value) {
  return normalizeNickname(value).toLocaleLowerCase('ar')
}

function now() {
  return Date.now()
}

/* =========================
   Register
========================= */

export function registerNickname(groupJid, userJid, nickname) {
  groupJid = normalizeText(groupJid)
  userJid = normalizeText(userJid)
  nickname = normalizeNickname(nickname)

  if (!groupJid || !userJid || !nickname) {
    return {
      ok: false,
      error: 'INVALID_DATA'
    }
  }

  const key = nicknameKey(nickname)

  const existingNickname = db.prepare(`
    SELECT *
    FROM alkab
    WHERE group_jid = ?
      AND nickname_key = ?
    LIMIT 1
  `).get(groupJid, key)

  if (existingNickname) {
    return {
      ok: false,
      error: 'NICKNAME_TAKEN',
      existing: existingNickname
    }
  }

  const existingUser = db.prepare(`
    SELECT *
    FROM alkab
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `).get(groupJid, userJid)

  if (existingUser) {
    return {
      ok: false,
      error: 'USER_ALREADY_REGISTERED',
      existing: existingUser
    }
  }

  const timestamp = now()

  db.prepare(`
    INSERT INTO alkab (
      group_jid,
      user_jid,
      nickname,
      nickname_key,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    groupJid,
    userJid,
    nickname,
    key,
    timestamp,
    timestamp
  )

  return {
    ok: true,
    nickname,
    userJid
  }
}

/* =========================
   Change nickname
========================= */

export function changeNickname(
  groupJid,
  userJid,
  oldNickname,
  newNickname
) {
  groupJid = normalizeText(groupJid)
  userJid = normalizeText(userJid)
  oldNickname = normalizeNickname(oldNickname)
  newNickname = normalizeNickname(newNickname)

  if (!groupJid || !userJid || !oldNickname || !newNickname) {
    return {
      ok: false,
      error: 'INVALID_DATA'
    }
  }

  const oldKey = nicknameKey(oldNickname)
  const newKey = nicknameKey(newNickname)

  const current = db.prepare(`
    SELECT *
    FROM alkab
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `).get(groupJid, userJid)

  if (!current) {
    return {
      ok: false,
      error: 'USER_NOT_REGISTERED'
    }
  }

  if (current.nickname_key !== oldKey) {
    return {
      ok: false,
      error: 'OLD_NICKNAME_MISMATCH',
      current
    }
  }

  if (oldKey === newKey) {
    return {
      ok: false,
      error: 'SAME_NICKNAME',
      current
    }
  }

  const taken = db.prepare(`
    SELECT *
    FROM alkab
    WHERE group_jid = ?
      AND nickname_key = ?
    LIMIT 1
  `).get(groupJid, newKey)

  if (taken) {
    return {
      ok: false,
      error: 'NICKNAME_TAKEN',
      existing: taken
    }
  }

  db.prepare(`
    UPDATE alkab
    SET
      nickname = ?,
      nickname_key = ?,
      updated_at = ?
    WHERE group_jid = ?
      AND user_jid = ?
  `).run(
    newNickname,
    newKey,
    now(),
    groupJid,
    userJid
  )

  return {
    ok: true,
    oldNickname: current.nickname,
    newNickname
  }
}

/* =========================
   Delete nickname
========================= */

export function deleteNickname(groupJid, userJid) {
  groupJid = normalizeText(groupJid)
  userJid = normalizeText(userJid)

  const current = db.prepare(`
    SELECT *
    FROM alkab
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `).get(groupJid, userJid)

  if (!current) {
    return {
      ok: false,
      error: 'USER_NOT_REGISTERED'
    }
  }

  db.prepare(`
    DELETE FROM alkab
    WHERE group_jid = ?
      AND user_jid = ?
  `).run(groupJid, userJid)

  return {
    ok: true,
    nickname: current.nickname
  }
}

/* =========================
   Get nickname by user
========================= */

export function getNickname(groupJid, userJid) {
  return db.prepare(`
    SELECT *
    FROM alkab
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `).get(
    normalizeText(groupJid),
    normalizeText(userJid)
  ) || null
}

/* =========================
   Get user by nickname
========================= */

export function getUserByNickname(groupJid, nickname) {
  const key = nicknameKey(nickname)

  return db.prepare(`
    SELECT *
    FROM alkab
    WHERE group_jid = ?
      AND nickname_key = ?
    LIMIT 1
  `).get(
    normalizeText(groupJid),
    key
  ) || null
}

/* =========================
   Check nickname
========================= */

export function isNicknameTaken(groupJid, nickname) {
  const key = nicknameKey(nickname)

  return !!db.prepare(`
    SELECT 1
    FROM alkab
    WHERE group_jid = ?
      AND nickname_key = ?
    LIMIT 1
  `).get(
    normalizeText(groupJid),
    key
  )
}

/* =========================
   List all nicknames
========================= */

export function getNicknames(groupJid) {
  return db.prepare(`
    SELECT
      user_jid,
      nickname,
      created_at,
      updated_at
    FROM alkab
    WHERE group_jid = ?
    ORDER BY nickname COLLATE NOCASE ASC
  `).all(
    normalizeText(groupJid)
  )
}

/* =========================
   Count nicknames
========================= */

export function countNicknames(groupJid) {
  const result = db.prepare(`
    SELECT COUNT(*) AS count
    FROM alkab
    WHERE group_jid = ?
  `).get(
    normalizeText(groupJid)
  )

  return Number(result?.count || 0)
}

/* =========================
   Resolve user
   nickname OR JID
========================= */

export function resolveUser(groupJid, input) {
  input = normalizeText(input)

  if (!input) {
    return null
  }

  const byNickname = getUserByNickname(groupJid, input)

  if (byNickname) {
    return byNickname
  }

  const byJid = db.prepare(`
    SELECT *
    FROM alkab
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `).get(
    normalizeText(groupJid),
    input
  )

  return byJid || null
}

/* =========================
   Export database
========================= */

export { db }
