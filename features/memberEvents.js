import {
  db,
  getSettings,
  ensureGroup
} from '../database/groupSettings.js'

db.exec(`
  CREATE TABLE IF NOT EXISTS member_history (
    group_jid TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    join_count INTEGER NOT NULL DEFAULT 0,
    left_before INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (group_jid, user_jid)
  )
`)

const processedEvents = new Map()

function extractJid(value) {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    return (
      value.id ||
      value.jid ||
      value.participant ||
      value.user ||
      null
    )
  }

  return null
}

function normalizeJid(jid) {
  const value = extractJid(jid)

  if (!value) return null

  return String(value).split(':')[0]
}

function wasProcessed(eventId) {
  if (!eventId) return false

  const now = Date.now()
  const time = processedEvents.get(eventId)

  if (time && now - time < 60000) {
    return true
  }

  processedEvents.set(eventId, now)

  for (const [id, timestamp] of processedEvents) {
    if (now - timestamp > 60000) {
      processedEvents.delete(id)
    }
  }

  return false
}

function getHistory(groupJid, userJid) {
  if (!groupJid || !userJid) return null

  return db.prepare(`
    SELECT *
    FROM member_history
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `).get(String(groupJid), String(userJid))
}

function recordJoin(groupJid, userJid) {
  const now = Date.now()
  const history = getHistory(groupJid, userJid)

  if (!history) {
    db.prepare(`
      INSERT INTO member_history
      (
        group_jid,
        user_jid,
        first_seen,
        last_seen,
        join_count,
        left_before
      )
      VALUES (?, ?, ?, ?, 1, 0)
    `).run(
      String(groupJid),
      String(userJid),
      now,
      now
    )

    return {
      count: 1,
      returning: false
    }
  }

  const count = history.join_count + 1

  db.prepare(`
    UPDATE member_history
    SET
      last_seen = ?,
      join_count = ?,
      left_before = 0
    WHERE group_jid = ?
      AND user_jid = ?
  `).run(
    now,
    count,
    String(groupJid),
    String(userJid)
  )

  return {
    count,
    returning: history.left_before === 1
  }
}

function recordLeave(groupJid, userJid) {
  if (!userJid) return

  const now = Date.now()
  const history = getHistory(groupJid, userJid)

  if (!history) {
    db.prepare(`
      INSERT INTO member_history
      (
        group_jid,
        user_jid,
        first_seen,
        last_seen,
        join_count,
        left_before
      )
      VALUES (?, ?, ?, ?, 0, 1)
    `).run(
      String(groupJid),
      String(userJid),
      now,
      now
    )

    return
  }

  db.prepare(`
    UPDATE member_history
    SET
      last_seen = ?,
      left_before = 1
    WHERE group_jid = ?
      AND user_jid = ?
  `).run(
    now,
    String(groupJid),
    String(userJid)
  )
}

function replacePlaceholders(text, user, count) {
  return String(text || '')
    .replaceAll('{user}', `@${user.split('@')[0]}`)
    .replaceAll('{count}', String(count))
}

async function sendWelcome({
  sock,
  jid,
  user,
  groupName,
  count,
  returning,
  customText
}) {
  const mention = `@${user.split('@')[0]}`

  if (customText) {
    await sock.sendMessage(jid, {
      text: replacePlaceholders(customText, user, count),
      mentions: [user]
    })

    return
  }

  const text = returning
    ? `╭━━━〔 🔄 PHANTOM WELCOME BACK 〕━━━╮
┃
┃  🔄 نورت تاني يا ${mention}!
┃
┃  👥 الجروب: ${groupName}
┃  🔢 عدد مرات دخولك: ${count}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  👻 PHANTOM BOT
┃
╰━━〔 WELCOME BACK 〕━━╯`
    : `╭━━━〔 👋 PHANTOM WELCOME 〕━━━╮
┃
┃  👋 أهلاً بيك يا ${mention}!
┃
┃  👥 الجروب: ${groupName}
┃  🔢 أول دخول ليك للجروب
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  👻 PHANTOM BOT
┃
╰━━〔 WELCOME 〕━━╯`

  await sock.sendMessage(jid, {
    text,
    mentions: [user]
  })
}

async function sendGoodbye({
  sock,
  jid,
  user,
  customText
}) {
  const mention = `@${user.split('@')[0]}`

  const text = customText
    ? replacePlaceholders(customText, user, 0)
    : `╭━━━〔 👋 PHANTOM GOODBYE 〕━━━╮
┃
┃  👋 مع السلامة يا ${mention}!
┃
┃  🚪 خرج من الجروب بنفسه.
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💫 نتمنى نشوفك تاني
┃  👻 PHANTOM BOT
┃
╰━━〔 SEE YOU AGAIN 〕━━╯`

  await sock.sendMessage(jid, {
    text,
    mentions: [user]
  })
}

export function registerMemberEvents(sock) {
  sock.ev.on('group-participants.update', async update => {
    const {
      id,
      author,
      participants,
      action
    } = update

    if (!id?.endsWith('@g.us')) return
    if (action !== 'add' && action !== 'remove') return

    if (wasProcessed(update.id)) return

    try {
      ensureGroup(id)

      const settings = getSettings(id)

      const metadata = await sock.groupMetadata(id)
      const groupName = metadata.subject || 'الجروب'

      const botJid = normalizeJid(sock.user?.id)
      const eventAuthor = normalizeJid(author)

      for (const participant of participants || []) {
        const user = normalizeJid(participant)

        if (!user) {
          console.warn(
            '⚠️ Smart Member Events: participant بدون JID:',
            participant
          )
          continue
        }

        if (action === 'add') {
          const result = recordJoin(id, user)

          if (!settings.welcome) continue

          await sendWelcome({
            sock,
            jid: id,
            user,
            groupName,
            count: result.count,
            returning: result.returning,
            customText: settings.welcome_text
          })

          continue
        }

        recordLeave(id, user)

        if (!settings.goodbye) continue

        const botRemoved =
          botJid &&
          eventAuthor &&
          eventAuthor === botJid

        const adminRemoved =
          eventAuthor &&
          eventAuthor !== user &&
          !botRemoved

        if (botRemoved || adminRemoved) {
          continue
        }

        await sendGoodbye({
          sock,
          jid: id,
          user,
          customText: settings.goodbye_text
        })
      }
    } catch (err) {
      console.error('❌ خطأ في Smart Member Events:', err)
    }
  })
}
