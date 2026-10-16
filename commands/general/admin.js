import { DatabaseSync } from 'node:sqlite'
import settings from '../../config/settings.js'
import {
  getSettings,
  setSetting,
  resetSettings,
  lockCommand,
  unlockCommand,
  unlockAllCommands,
  getLockedCommands,
  addAutomodWord,
  removeAutomodWord,
  getAutomodWords,
  muteUser,
  unmuteUser
} from '../../database/groupSettings.js'

const db = new DatabaseSync(settings.dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS sub_admins (
    group_jid TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (group_jid, user_jid)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS warnings (
    group_jid TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (group_jid, user_jid)
  )
`)

const ADMIN_COMMANDS = new Set([
  `جماعي`,
  `رقي`,
  `طرد`,
  `كتم`,
  `فك_كتم`,
  `ترقيات`,
  `ازل`,
  `دعوة`,
  `تاغ`,

  `فتح`,
  `قفل`,
  `فتح_الكل`,
  `قفل_امر`,
  `فتح_امر`,
  `تغيير`,
  `شات_بوت`,
  `مود`,
  `مخفي`,
  `رسائل`,
  `طلبات`,
  `طلبات_الانضمام`,
  `تجديد_اللينك`,
  `ثبت`,
  `ستوري`,

  `ترحيب`,
  `تعيين_ترحيب`,
  `وداع`,
  `تعيين_وداع`,

  `تحذير`,
  `عدد_التحذيرات`,
  `حذف_تحذير`,

  `مراقبة_الكل`,
  `مراقبة_اعضاء`,
  `مراقبة_اعدادات`,
  `مراقبة_اشراف`,

  `نشاط`,
  `توب_رانك`,
  `الاوامر_المقفولة`,
  `تحديد_عملة`,
  `افتراضي`,
  `مسح`,

  `اوتومود`,
  `اوتومود_كلمات`,
  `منع_الروابط`,

  `ادمن_فرعي`,
  `حذف_ادمن_فرعي`,
  `ادمن_فرعي_قائمة`
])

function getTarget(msg) {
  const context =
    msg.message?.extendedTextMessage?.contextInfo

  const mentioned =
    context?.mentionedJid

  if (mentioned?.length) {
    return mentioned[0]
  }

  const quotedParticipant =
    context?.participant

  if (quotedParticipant) {
    return quotedParticipant
  }

  return null
}

async function getMetadata(sock, jid) {
  return await sock.groupMetadata(jid)
}

function normalizeJid(jid) {
  if (!jid) return ``

  const value = jid.trim()

  // إزالة device/session suffix مثل :31
  // مع الحفاظ على @lid أو @s.whatsapp.net
  return value.replace(/:(\d+)(?=@)/, ``)
}

function isAdmin(metadata, jid) {
  if (!jid) return false

  const normalized = normalizeJid(jid)

  const participant =
    metadata.participants.find(p => {
      const id = normalizeJid(p.id)
      return id === normalized
    })

  return !!participant?.admin
}

function getBotJid(sock) {
  return sock.user?.lid || sock.user?.id
}

function isSubAdmin(groupJid, userJid) {
  if (!groupJid || !userJid) return false

  const row = db.prepare(`
    SELECT 1
    FROM sub_admins
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `).get(
    groupJid,
    normalizeJid(userJid)
  )

  return !!row
}

function addSubAdmin(groupJid, userJid) {
  const result = db.prepare(`
    INSERT OR IGNORE INTO sub_admins
      (group_jid, user_jid, added_at)
    VALUES (?, ?, ?)
  `).run(
    groupJid,
    normalizeJid(userJid),
    Date.now()
  )

  return result.changes > 0
}

function removeSubAdmin(groupJid, userJid) {
  const result = db.prepare(`
    DELETE FROM sub_admins
    WHERE group_jid = ?
      AND user_jid = ?
  `).run(
    groupJid,
    normalizeJid(userJid)
  )

  return result.changes > 0
}

function getSubAdmins(groupJid) {
  return db.prepare(`
    SELECT user_jid
    FROM sub_admins
    WHERE group_jid = ?
    ORDER BY added_at
  `).all(groupJid).map(row => row.user_jid)
}

async function requireRealAdmin(sock, jid, msg) {
  if (!jid.endsWith(`@g.us`)) return false

  const sender =
    msg.key.participant ||
    msg.key.participantAlt ||
    sock.user?.id

  const metadata = await getMetadata(sock, jid)

  if (!isAdmin(metadata, sender)) {
    await sock.sendMessage(jid, {
      text:
`╭━━〔 🚫 PHANTOM ADMIN 〕━━╮
┃
┃  👑 الأمر ده للأدمن الحقيقي فقط.
┃  ⚠️ الـ Sub Admin مش مسموح له يدير صلاحيات الأعضاء.
┃
╰━━〔 ACCESS DENIED 〕━━╯`
    })

    return false
  }

  return true
}

async function requireAdmin(sock, jid, msg) {
  if (!jid.endsWith(`@g.us`)) {
    await sock.sendMessage(jid, {
      text: `╭━━〔 ⚠️ PHANTOM ADMIN 〕━━╮
┃
┃  ❌ الأمر ده للجروبات فقط.
┃  👥 استخدمه داخل جروب.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯`
    })

    return false
  }

  const sender =
  msg.key.participant ||
  msg.key.participantAlt ||
  sock.user?.id

  const metadata =
    await getMetadata(sock, jid)

  console.log(`\\n========== PHANTOM ADMIN DEBUG ==========`)
  console.log(`FROM ME:`, msg.key.fromMe)
  console.log(`PARTICIPANT:`, msg.key.participant)
  console.log(`PARTICIPANT ALT:`, msg.key.participantAlt)
  console.log(`BOT ID:`, sock.user?.id)
  console.log(`BOT LID:`, sock.user?.lid)
  console.log(`ADMINS:`)
  console.log(
    metadata.participants
      .filter(p => p.admin)
      .map(p => ({
        id: p.id,
        admin: p.admin
      }))
  )
  console.log(`==========================================\\n`)

  console.log(`ADMIN CHECK:`, {
    sender,
    normalizedSender: normalizeJid(sender),
    result: isAdmin(metadata, sender)
  })

  const senderIsAdmin = isAdmin(metadata, sender)
  const senderIsSubAdmin = isSubAdmin(jid, sender)

  if (!senderIsAdmin && !senderIsSubAdmin) {
    await sock.sendMessage(jid, {
      text: `╭━━〔 🚫 PHANTOM ADMIN 〕━━╮
┃
┃  👑 الأمر ده للأدمن أو الـ Sub Admin فقط.
┃  ⚠️ صلاحياتك غير كافية.
┃
╰━━〔 ACCESS DENIED 〕━━╯`
    })

    return false
  }

  const botJid = getBotJid(sock)

  console.log(`BOT ADMIN CHECK:`, {
    botJid,
    normalizedBotJid: normalizeJid(botJid),
    result: isAdmin(metadata, botJid)
  })

  if (botJid && !isAdmin(metadata, botJid)) {
    await sock.sendMessage(jid, {
      text:
        `╭━━〔 ⚠️ PHANTOM ADMIN 〕━━╮
┃
┃  🤖 لازم أكون أدمن في الجروب.
┃  🛡️ عشان أقدر أنفذ الأمر.
┃
╰━━〔 PERMISSION REQUIRED 〕━━╯`
    })

    return false
  }

  return true
}

function getWarningCount(groupJid, userJid) {
  const stmt = db.prepare(`
    SELECT count
    FROM warnings
    WHERE group_jid = ?
      AND user_jid = ?
    LIMIT 1
  `)

  const row =
    stmt.get(groupJid, userJid)

  return row?.count || 0
}

function addWarning(groupJid, userJid) {
  const current =
    getWarningCount(groupJid, userJid)

  const next = current + 1

  const stmt = db.prepare(`
    INSERT INTO warnings
      (group_jid, user_jid, count, updated_at)
    VALUES (?, ?, ?, ?)

    ON CONFLICT(group_jid, user_jid)
    DO UPDATE SET
      count = excluded.count,
      updated_at = excluded.updated_at
  `)

  stmt.run(
    groupJid,
    userJid,
    next,
    Date.now()
  )

  return next
}

function deleteWarnings(groupJid, userJid) {
  const stmt = db.prepare(`
    DELETE FROM warnings
    WHERE group_jid = ?
      AND user_jid = ?
  `)

  stmt.run(groupJid, userJid)
}

async function menu(sock, jid, msg) {
  await sock.sendMessage(jid, {
    react: {
      text: `👑`,
      key: msg.key
    }
  })

  await sock.sendMessage(jid, {
    text: `╭━━━〔 👑 PHANTOM ADMIN 〕━━━╮
┃
┃  ⚙️ مركز إدارة المجموعة
┃
┣━━〔 👥 إدارة الأعضاء 〕━━━━
┃
┃  📢 !جماعي
┃  👑 !رقي
┃  👢 !طرد
┃  👑 !ترقيات
┃  ⬇️ !ازل
┃  🔗 !دعوة
┃  📣 !تاغ
┃
┣━━〔 ⚙️ إعدادات المجموعة 〕
┃
┃  🔓 !فتح
┃  🔒 !قفل
┃  🔓 !فتح_الكل
┃  🔒 !قفل_امر
┃  🔓 !فتح_امر
┃  ✏️ !تغيير
┃  🤖 !شات_بوت
┃  🛡️ !مود
┃  👻 !مخفي
┃  💬 !رسائل
┃  📥 !طلبات
┃  📋 !طلبات_الانضمام
┃  ♻️ !تجديد_اللينك
┃  📌 !ثبت
┃  📸 !ستوري
┃
┣━━〔 👋 الترحيب والوداع 〕━━
┃
┃  👋 !ترحيب
┃  ✏️ !تعيين_ترحيب
┃  👋 !وداع
┃  ✏️ !تعيين_وداع
┃
┣━━〔 ⚠️ نظام التحذيرات 〕━━
┃
┃  ⚠️ !تحذير @عضو
┃  📊 !عدد_التحذيرات @عضو
┃  🗑️ !حذف_تحذير @عضو
┃
┣━━〔 🛡️ المراقبة 〕━━━━━━
┃
┃  👥 !مراقبة_الكل
┃  👤 !مراقبة_اعضاء
┃  ⚙️ !مراقبة_اعدادات
┃  🛡️ !مراقبة_اشراف
┃
┣━━〔 📊 أدوات إضافية 〕━━━━
┃
┃  📈 !نشاط
┃  🏆 !توب_رانك
┃  🔒 !الاوامر_المقفولة
┃  💰 !تحديد_عملة
┃  ♻️ !افتراضي
┃  🧹 !مسح
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💡 للمساعدة: !مساعدة
┃
╰━━〔 👻 PHANTOM SYSTEM 〕━━╯`
  })
}

export default {
  name: `ادارة`,

  async execute({
    sock,
    jid,
    msg,
    args,
    commandName
  }) {

    if (commandName === `ادارة`) {
      await menu(sock, jid, msg)
      return
    }

    if (!ADMIN_COMMANDS.has(commandName)) {
      return
    }

    if (!(await requireAdmin(sock, jid, msg))) {
      return
    }

    const metadata =
      await getMetadata(sock, jid)

    const target =
      getTarget(msg)


    // ===== PHANTOM EXTRA ADMIN COMMANDS =====

    if (commandName === `جماعي`) {
      const metadata = await sock.groupMetadata(jid)
      const participants = metadata.participants || []

      if (!participants.length) {
        await sock.sendMessage(jid, { text: `╭━━〔 📢 PHANTOM TAG 〕━━╮
┃
┃  ⚠️ مفيش أعضاء أعمل لهم منشن.
┃
╰━━〔 TAG SYSTEM 〕━━╯` })
        return
      }

      const mentions = participants.map(x => x.id).filter(Boolean)
      const lines = mentions.map(x => `@${x.split(`@`)[0]}`)

      await sock.sendMessage(jid, {
        text: `📢 منشن جماعي بواسطة PHANTOM\n\n${lines.join(` `)}`,
        mentions
      })
      return
    }

    if (commandName === `دعوة`) {
      const code = await sock.groupInviteCode(jid)

      await sock.sendMessage(jid, {
        text: `🔗 رابط دعوة الجروب:\nhttps://chat.whatsapp.com/${code}`
      })
      return
    }

    if (commandName === `تجديد_اللينك`) {
      const code = await sock.groupRevokeInvite(jid)
      const newCode = await sock.groupInviteCode(jid)

      await sock.sendMessage(jid, {
        text: `♻️ تم تجديد رابط دعوة الجروب بنجاح!\n\n🔗 الرابط الجديد:\nhttps://chat.whatsapp.com/${newCode}`
      })
      return
    }

    switch (commandName) {

      // =========================
      // ⚠️ التحذير
      // =========================

      case `تحذير`: {
        if (!target) {
          await sock.sendMessage(jid, {
            text:
              `╭━━〔 ⚠️ PHANTOM ADMIN 〕━━╮
┃
┃  👤 لازم تحدد العضو الأول.
┃  📌 اعمل Mention أو Reply على رسالته.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯\n\nمثال:\n!تحذير @العضو`
          })

          return
        }

        const count =
          addWarning(jid, target)

        if (count >= 5) {
          try {
            await sock.groupParticipantsUpdate(
              jid,
              [target],
              `remove`
            )

            deleteWarnings(jid, target)

            await sock.sendMessage(jid, {
              text: `🚨 تم طرد العضو تلقائيًا!

👤 العضو: @${target.split(`@`)[0]}

📊 وصل إلى 5/5 تحذيرات.
🧹 تم تصفير عداد التحذيرات.`,
              mentions: [target]
            })
          } catch (error) {
            console.error(`❌ Auto kick error:`, error)

            await sock.sendMessage(jid, {
              text: `❌ فشل طرد العضو تلقائيًا.

👤 العضو: @${target.split(`@`)[0]}

📊 التحذيرات: ${count}/5`,
              mentions: [target]
            })
          }

          break
        }

        await sock.sendMessage(jid, {
          text: `⚠️ تم إعطاء تحذير!

👤 العضو: @${target.split(`@`)[0]}

📊 عدد التحذيرات: ${count}/5

⚠️ متبقي ${5 - count} تحذيرات قبل الطرد.`,
          mentions: [target]
        })

        break
      }

      // =========================
      // 📊 عدد التحذيرات
      // =========================

      case `عدد_التحذيرات`: {
        if (!target) {
          await sock.sendMessage(jid, {
            text:
              `╭━━〔 👤 PHANTOM ADMIN 〕━━╮
┃
┃  👤 حدد العضو المطلوب.
┃  📌 Mention أو Reply.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯`
          })

          return
        }

        const count =
          getWarningCount(jid, target)

        await sock.sendMessage(jid, {
          text: `⚠️ سجل التحذيرات

👤 العضو: @${target.split(`@`)[0]}

📊 عدد التحذيرات: ${count}`,
          mentions: [target]
        })

        break
      }

      // =========================
      // 🗑️ حذف التحذيرات
      // =========================

      case `حذف_تحذير`: {
        if (!target) {
          await sock.sendMessage(jid, {
            text:
              `╭━━〔 👤 PHANTOM ADMIN 〕━━╮
┃
┃  👤 حدد العضو المطلوب.
┃  📌 Mention أو Reply.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯`
          })

          return
        }

        deleteWarnings(jid, target)

        await sock.sendMessage(jid, {
          text: `╭━━━〔 🗑️ PHANTOM WARNINGS 〕━━━╮
┃
┃  ✅ تم حذف جميع التحذيرات
┃  👤 العضو: @${target.split(`@`)[0]}
┃
╰━━〔 🛡️ MODERATION 〕━━╯`,
          mentions: [target]
        })

        break
      }

      // =========================
      // 👢 طرد
      // =========================

      case `كتم`: {
        const target = getTarget(msg)

        if (!target) {
          await sock.sendMessage(jid, {
            text: `⚠️ اعمل منشن للعضو أو اعمل Reply على رسالته.`
          })
          break
        }

        const result = muteUser(jid, target)

        await sock.sendMessage(jid, {
          text: result
            ? `🔇 تم كتم العضو بنجاح.`
            : `ℹ️ العضو مكتوم بالفعل.`
        })

        break
      }

      case `فك_كتم`: {
        const target = getTarget(msg)

        if (!target) {
          await sock.sendMessage(jid, {
            text: `⚠️ اعمل منشن للعضو أو اعمل Reply على رسالته.`
          })
          break
        }

        const result = unmuteUser(jid, target)

        await sock.sendMessage(jid, {
          text: result
            ? `🔊 تم فك الكتم عن العضو.`
            : `ℹ️ العضو مش مكتوم.`
        })

        break
      }

      case `طرد`: {
        if (!target) {
          await sock.sendMessage(jid, {
            text:
              `╭━━〔 👤 PHANTOM ADMIN 〕━━╮
┃
┃  👤 حدد العضو المطلوب.
┃  📌 Mention أو Reply.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯`
          })

          return
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          `remove`
        )

        await sock.sendMessage(jid, {
          text:
            `👢 تم طرد @${target.split(`@`)[0]}`,
          mentions: [target]
        })

        break
      }

      // =========================
      // 👑 ترقية
      // =========================

      case `رقي`: {
        if (!target) {
          await sock.sendMessage(jid, {
            text:
              `╭━━〔 👤 PHANTOM ADMIN 〕━━╮
┃
┃  👤 حدد العضو المطلوب.
┃  📌 Mention أو Reply.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯`
          })

          return
        }

        const metadata = await getMetadata(sock, jid)

        if (isAdmin(metadata, target)) {
          await sock.sendMessage(jid, {
            text: `╭━━━〔 👑 PHANTOM ADMIN 〕━━━╮
┃
┃  😂 العضو ده أدمن أصلًا.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯`,
            mentions: [target]
          })

          return
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          `promote`
        )

        await sock.sendMessage(jid, {
          text:
            `👑 تم ترقية @${target.split(`@`)[0]}`,
          mentions: [target]
        })

        break
      }

      // =========================
      // ⬇️ إزالة إشراف
      // =========================

      case `ازل`: {
        if (!target) {
          await sock.sendMessage(jid, {
            text:
              `╭━━〔 👑 PHANTOM ADMIN 〕━━╮
┃
┃  👑 حدد الأدمن المطلوب.
┃  📌 Mention أو Reply.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯`
          })

          return
        }

        const metadata = await getMetadata(sock, jid)

        if (!isAdmin(metadata, target)) {
          await sock.sendMessage(jid, {
            text: `╭━━━〔 👑 PHANTOM ADMIN 〕━━━╮
┃
┃  😂 العضو ده مش أدمن أصلًا.
┃
╰━━〔 ADMIN SYSTEM 〕━━╯`,
            mentions: [target]
          })

          return
        }

        await sock.groupParticipantsUpdate(
          jid,
          [target],
          `demote`
        )

        await sock.sendMessage(jid, {
          text:
            `⬇️ تم إزالة إشراف @${target.split(`@`)[0]}`,
          mentions: [target]
        })

        break
      }

      // =========================
      // 🔒 قفل
      // =========================

      case `قفل`: {
        await sock.groupSettingUpdate(
          jid,
          `announcement`
        )

        await sock.sendMessage(jid, {
          text:
            `🔒 تم قفل المجموعة.\n👑 الأدمن فقط يقدر يرسل.`
        })

        break
      }

      // =========================
      // 🔓 فتح
      // =========================

      case `فتح`: {
        await sock.groupSettingUpdate(
          jid,
          `not_announcement`
        )

        await sock.sendMessage(jid, {
          text:
            `🔓 تم فتح المجموعة.\n👥 الكل يقدر يرسل.`
        })

        break
      }

      // =========================
      // 👥 قائمة الأدمنز
      // =========================

      case `ترقيات`: {
        const admins =
          metadata.participants.filter(
            p => p.admin
          )

        const text =
          admins.length
            ? admins
                .map(
                  p =>
                    `👑 @${p.id.split(`@`)[0]}`
                )
                .join(`\n`)
            : `╭━━〔 👑 PHANTOM ADMIN 〕━━╮
┃
┃  ❌ مفيش أدمنز في المجموعة.
┃
╰━━〔 ADMIN LIST 〕━━╯`

        await sock.sendMessage(jid, {
          text:
            `👑 أدمنز المجموعة:\n\n${text}`,
          mentions:
            admins.map(p => p.id)
        })

        break
      }

      // =========================
      // 📢 تاغ جماعي
      // =========================

      case `تاغ`: {
        const participants =
          metadata.participants.map(
            p => p.id
          )

        const text =
          args.length
            ? args.join(` `)
            : `📢 منشن جماعي`

        await sock.sendMessage(jid, {
          text:
            `${text}\n\n` +
            participants
              .map(
                p =>
                  `@${p.split(`@`)[0]}`
              )
              .join(` `),
          mentions: participants
        })

        break
      }

      // =========================
      // 📊 نشاط
      // =========================

      case `نشاط`: {
        await sock.sendMessage(jid, {
          text: `📊 نشاط المجموعة

👥 الأعضاء: ${metadata.participants.length}

👑 الأدمنز: ${
            metadata.participants.filter(
              p => p.admin
            ).length
          }

🤖 PHANTOM: Online 🟢`
        })

        break
      }

      // =========================
      // 🚧 باقي الأوامر
      // =========================

      case `قفل_امر`: {
        const command = args[0]?.toLowerCase()

        if (!command) {
          await sock.sendMessage(jid, {
            text: `🔒 استخدم:\n!قفل_امر <الأمر>\n\nمثال:\n!قفل_امر ping`
          })
          break
        }

        const locked = lockCommand(jid, command)

        await sock.sendMessage(jid, {
          text: locked
            ? `🔒 تم قفل الأمر !${command}`
            : `🔒 الأمر !${command} مقفول أصلا.`
        })

        break
      }

      case `فتح_امر`: {
        const command = args[0]?.toLowerCase()

        if (!command) {
          await sock.sendMessage(jid, {
            text: `🔓 استخدم:\n!فتح_امر <الأمر>`
          })
          break
        }

        const unlocked = unlockCommand(jid, command)

        await sock.sendMessage(jid, {
          text: unlocked
            ? `🔓 تم فتح الأمر !${command}`
            : `🔓 الأمر !${command} مفتوح أصلا.`
        })

        break
      }

      case `فتح_الكل`: {
        const count = unlockAllCommands(jid)

        await sock.sendMessage(jid, {
          text: count
            ? `🔓 تم فتح ${count} أمر.`
            : `🔓 كل الأوامر مفتوحة أصلا.`
        })

        break
      }

      case `الاوامر_المقفولة`: {
        const locked = getLockedCommands(jid)

        await sock.sendMessage(jid, {
          text: locked.length
            ? `🔒 الأوامر المقفولة:\n\n${locked.map(x => `• !${x}`).join(`\n`)}`
            : `╭━━〔 🔓 PHANTOM LOCK 〕━━╮
┃
┃  ✅ مفيش أوامر مقفولة حاليًا.
┃  ⚡ كل الأوامر متاحة.
┃
╰━━〔 COMMANDS UNLOCKED 〕━━╯`
        })

        break
      }

      case `ترحيب`: {
        const value = args[0]?.toLowerCase()

        if (![`تشغيل`, `ايقاف`, `إيقاف`].includes(value)) {
          const settings = getSettings(jid)

          await sock.sendMessage(jid, {
            text:
`👋 حالة الترحيب: ${settings.welcome ? `🟢 تشغيل` : `🔴 إيقاف`}

استخدم:
!ترحيب تشغيل
!ترحيب ايقاف`
          })
          break
        }

        const enabled = value === `تشغيل`
        setSetting(jid, `welcome`, enabled ? 1 : 0)

        await sock.sendMessage(jid, {
          text: enabled
            ? `👋 تم تشغيل الترحيب 🟢`
            : `👋 تم إيقاف الترحيب 🔴`
        })

        break
      }

      case `وداع`: {
        const value = args[0]?.toLowerCase()

        if (![`تشغيل`, `ايقاف`, `إيقاف`].includes(value)) {
          const settings = getSettings(jid)

          await sock.sendMessage(jid, {
            text:
`👋 حالة الوداع: ${settings.goodbye ? `🟢 تشغيل` : `🔴 إيقاف`}

استخدم:
!وداع تشغيل
!وداع ايقاف`
          })
          break
        }

        const enabled = value === `تشغيل`
        setSetting(jid, `goodbye`, enabled ? 1 : 0)

        await sock.sendMessage(jid, {
          text: enabled
            ? `👋 تم تشغيل الوداع 🟢`
            : `👋 تم إيقاف الوداع 🔴`
        })

        break
      }

      case `تعيين_ترحيب`: {
        const message = args.join(` `)

        if (!message) {
          await sock.sendMessage(jid, {
            text:
`✏️ استخدم:
!تعيين_ترحيب <الرسالة>

المتغيرات:
{user} = العضو
{group} = اسم الجروب`
          })
          break
        }

        setSetting(jid, `welcome_text`, message)

        await sock.sendMessage(jid, {
          text: `✅ تم حفظ رسالة الترحيب.`
        })

        break
      }

      case `تعيين_وداع`: {
        const message = args.join(` `)

        if (!message) {
          await sock.sendMessage(jid, {
            text:
`✏️ استخدم:
!تعيين_وداع <الرسالة>

المتغيرات:
{user} = العضو
{group} = اسم الجروب`
          })
          break
        }

        setSetting(jid, `goodbye_text`, message)

        await sock.sendMessage(jid, {
          text: `✅ تم حفظ رسالة الوداع.`
        })

        break
      }

      case `شات_بوت`: {
        const value = args[0]?.toLowerCase()

        if (![`تشغيل`, `ايقاف`, `إيقاف`].includes(value)) {
          const settings = getSettings(jid)

          await sock.sendMessage(jid, {
            text:
`🤖 شات البوت: ${settings.bot_chat ? `🟢 تشغيل` : `🔴 إيقاف`}

استخدم:
!شات_بوت تشغيل
!شات_بوت ايقاف`
          })
          break
        }

        const enabled = value === `تشغيل`
        setSetting(jid, `bot_chat`, enabled ? 1 : 0)

        await sock.sendMessage(jid, {
          text: enabled
            ? `🤖 تم تشغيل البوت في الجروب 🟢`
            : `🤖 تم إيقاف البوت في الجروب 🔴`
        })

        break
      }

      case `مود`: {
        const value = args[0]?.toLowerCase()

        if (![`تشغيل`, `ايقاف`, `إيقاف`].includes(value)) {
          const settings = getSettings(jid)

          await sock.sendMessage(jid, {
            text:
`🛡️ وضع الحماية: ${settings.moderation ? `🟢 تشغيل` : `🔴 إيقاف`}

استخدم:
!مود تشغيل
!مود ايقاف`
          })
          break
        }

        const enabled = value === `تشغيل`
        setSetting(jid, `moderation`, enabled ? 1 : 0)

        await sock.sendMessage(jid, {
          text: enabled
            ? `🛡️ تم تشغيل وضع الحماية 🟢`
            : `🛡️ تم إيقاف وضع الحماية 🔴`
        })

        break
      }

      case `تحديد_عملة`: {
        const currency = args.join(` `).trim()

        if (!currency) {
          await sock.sendMessage(jid, {
            text: `💰 العملة الحالية: ${getSettings(jid).currency}

استخدم:
!تحديد_عملة <اسم العملة>`
          })
          break
        }

        setSetting(jid, `currency`, currency)

        await sock.sendMessage(jid, {
          text: `╭━━━〔 💰 PHANTOM ECONOMY 〕━━━╮
┃
┃  ✅ تم تحديد عملة الجروب
┃
┃  💰 العملة: ${currency}
┃
╰━━〔 ECONOMY SETTINGS 〕━━╯`
        })

        break
      }

      case `افتراضي`: {
        resetSettings(jid)

        await sock.sendMessage(jid, {
          text:
`♻️ تم إرجاع إعدادات الجروب للوضع الافتراضي.

🤖 البوت: تشغيل
👋 الترحيب: تشغيل
👋 الوداع: تشغيل
🛡️ المود: إيقاف
💰 العملة: points
🔓 الأوامر المقفولة: تم فتحها`
        })

        unlockAllCommands(jid)
        break
      }

      case `تغيير`: {
        const subject = args.join(` `).trim()

        if (!subject) {
          await sock.sendMessage(jid, {
            text: `✏️ استخدم:\n!تغيير <اسم الجروب>`
          })
          break
        }

        await sock.groupUpdateSubject(jid, subject)

        await sock.sendMessage(jid, {
          text: `✅ تم تغيير اسم الجروب إلى:\n${subject}`
        })

        break
      }

      case `مخفي`: {
        const argsText = args.join(` `).trim().toLowerCase()

        if (argsText === `تشغيل` || argsText === `on`) {
          await sock.groupToggleEphemeral(jid, 86400)
          await sock.sendMessage(jid, {
            text: `╭━━━〔 👻 PHANTOM EPHEMERAL 〕━━━╮
┃
┃  🟢 تم تشغيل الرسائل المؤقتة
┃  ⏱️ المدة: 24 ساعة
┃
╰━━〔 GROUP SETTINGS 〕━━╯`
          })
        } else if (argsText === `ايقاف` || argsText === `إيقاف` || argsText === `off`) {
          await sock.groupToggleEphemeral(jid, 0)
          await sock.sendMessage(jid, {
            text: `╭━━━〔 👻 PHANTOM EPHEMERAL 〕━━━╮
┃
┃  🔴 تم إيقاف الرسائل المؤقتة
┃
╰━━〔 GROUP SETTINGS 〕━━╯`
          })
        } else {
          await sock.sendMessage(jid, {
            text: `👻 استخدم:\n!مخفي تشغيل\n!مخفي ايقاف`
          })
        }

        break
      }

      case `طلبات`: {
        const argsText = args.join(` `).trim().toLowerCase()

        if (argsText === `تشغيل` || argsText === `on`) {
          await sock.groupSettingUpdate(jid, `locked`)
          await sock.sendMessage(jid, {
            text: `╭━━━〔 📥 PHANTOM JOIN 〕━━━╮
┃
┃  🟢 تم تفعيل التحكم في الانضمام
┃
╰━━〔 GROUP SETTINGS 〕━━╯`
          })
        } else if (argsText === `ايقاف` || argsText === `إيقاف` || argsText === `off`) {
          await sock.groupSettingUpdate(jid, `unlocked`)
          await sock.sendMessage(jid, {
            text: `╭━━━〔 📥 PHANTOM JOIN 〕━━━╮
┃
┃  🔴 تم إيقاف التحكم في الانضمام
┃
╰━━〔 GROUP SETTINGS 〕━━╯`
          })
        } else {
          await sock.sendMessage(jid, {
            text: `📥 استخدم:\n!طلبات تشغيل\n!طلبات ايقاف`
          })
        }

        break
      }

      case `طلبات_الانضمام`: {
        try {
          const requests = await sock.groupRequestParticipantsList(jid)

          if (!requests || requests.length === 0) {
            await sock.sendMessage(jid, {
              text: `╭━━━〔 📥 PHANTOM REQUESTS 〕━━━╮
┃
┃  ✅ مفيش طلبات انضمام معلقة حاليًا.
┃
╰━━〔 JOIN SYSTEM 〕━━╯`
            })
            break
          }

          const lines = requests.map((item, i) => {
            const id = item.jid || item.id || item.phone_number || `غير معروف`
            return `${i + 1}. @${String(id).split(`@`)[0]}`
          })

          const mentions = requests
            .map(item => item.jid || item.id)
            .filter(Boolean)

          await sock.sendMessage(jid, {
            text: `📥 طلبات الانضمام الحالية:\n\n${lines.join(`\n`)}`,
            mentions
          })
        } catch (err) {
          console.error(`❌ Join Requests Error:`, err)

          await sock.sendMessage(jid, {
            text: `❌ مقدرتش أجيب طلبات الانضمام دلوقتي.`
          })
        }

        break
      }

      case `ثبت`: {
        const quoted =
          msg?.message?.extendedTextMessage?.contextInfo?.stanzaId

        if (!quoted) {
          await sock.sendMessage(jid, {
            text: `📌 لازم ترد على الرسالة اللي عايز تثبتها ثم اكتب:\n!ثبت`
          })
          break
        }

        try {
          const quotedParticipant =
            msg.message.extendedTextMessage.contextInfo.participant || undefined

          await sock.sendMessage(jid, {
            pin: {
              type: 1,
              time: 86400,
              key: {
                remoteJid: jid,
                fromMe: false,
                id: quoted,
                participant: quotedParticipant
              }
            }
          })

          await sock.sendMessage(jid, {
            text: `╭━━━〔 📌 PHANTOM PIN 〕━━━╮
┃
┃  ✅ تم تثبيت الرسالة
┃  ⏱️ المدة: 24 ساعة
┃
╰━━〔 GROUP SYSTEM 〕━━╯`
          })
        } catch (err) {
          console.error(`❌ Pin Error:`, err)

          await sock.sendMessage(jid, {
            text: `❌ مقدرتش أثبت الرسالة. اتأكد إن البوت عنده صلاحية مشرف.`
          })
        }

        break
      }

      // =========================
      // 👑 SUB ADMIN
      // =========================

      case `ادمن_فرعي`: {
        if (!(await requireRealAdmin(sock, jid, msg))) {
          break
        }

        const target = getTarget(msg)

        if (!target) {
          await sock.sendMessage(jid, {
            text:
`╭━━〔 👑 PHANTOM SUB ADMIN 〕━━╮
┃
┃  ❌ لازم تعمل منشن للعضو.
┃
┃  الاستخدام:
┃  !ادمن_فرعي @العضو
┃
╰━━〔 SUB ADMIN SYSTEM 〕━━╯`
          })
          break
        }

        const added = addSubAdmin(jid, target)

        await sock.sendMessage(jid, {
          text: added
            ? `👑 تم تعيين @${target.split('@')[0]} كـ Sub Admin.`
            : `⚠️ العضو ده بالفعل Sub Admin.`,
          mentions: [target]
        })

        break
      }

      case `حذف_ادمن_فرعي`: {
        if (!(await requireRealAdmin(sock, jid, msg))) {
          break
        }

        const target = getTarget(msg)

        if (!target) {
          await sock.sendMessage(jid, {
            text:
`╭━━〔 👑 PHANTOM SUB ADMIN 〕━━╮
┃
┃  ❌ لازم تعمل منشن للعضو.
┃
┃  الاستخدام:
┃  !حذف_ادمن_فرعي @العضو
┃
╰━━〔 SUB ADMIN SYSTEM 〕━━╯`
          })
          break
        }

        const removed = removeSubAdmin(jid, target)

        await sock.sendMessage(jid, {
          text: removed
            ? `🗑️ تم حذف @${target.split('@')[0]} من Sub Admin.`
            : `⚠️ العضو مش موجود في قائمة Sub Admin.`,
          mentions: [target]
        })

        break
      }

      case `ادمن_فرعي_قائمة`: {
        const list = getSubAdmins(jid)

        await sock.sendMessage(jid, {
          text: list.length
            ? `╭━━〔 👑 SUB ADMINS 〕━━╮
┃
${list.map((x, i) => `┃  ${i + 1}. @${x.split('@')[0]}`).join(`\\n`)}
┃
╰━━〔 PHANTOM ADMIN SYSTEM 〕━━╯`
            : `╭━━〔 👑 SUB ADMINS 〕━━╮
┃
┃  📭 مفيش Sub Admins حاليًا.
┃
╰━━〔 PHANTOM ADMIN SYSTEM 〕━━╯`,
          mentions: list
        })

        break
      }

      case `اوتومود`: {
        const value = args[0]?.toLowerCase()

        if (![`تفعيل`, `تعطيل`].includes(value)) {
          const current = getSettings(jid)

          await sock.sendMessage(jid, {
            text:
`╭━━━〔 🛡️ PHANTOM AUTOMOD 〕━━━╮
┃
┃  الحالة: ${current.automod ? `🟢 مفعّل` : `🔴 معطّل`}
┃
┃  استخدم:
┃  !اوتومود تفعيل
┃  !اوتومود تعطيل
┃
╰━━〔 AUTOMOD SYSTEM 〕━━╯`
          })
          break
        }

        const enabled = value === `تفعيل`

        setSetting(
          jid,
          `automod`,
          enabled ? 1 : 0
        )

        await sock.sendMessage(jid, {
          text: enabled
            ? `🛡️ تم تفعيل AutoMod 🟢`
            : `🛡️ تم تعطيل AutoMod 🔴`
        })

        break
      }

      case `اوتومود_كلمات`: {
        const action = args[0]?.toLowerCase()
        const word = args.slice(1).join(` `).trim()

        if (action === `اضافة`) {
          if (!word) {
            await sock.sendMessage(jid, {
              text:
`🛡️ استخدم:
!اوتومود_كلمات اضافة <الكلمة>

مثال:
!اوتومود_كلمات اضافة سب`
            })
            break
          }

          const added = addAutomodWord(jid, word)

          await sock.sendMessage(jid, {
            text: added
              ? `✅ تمت إضافة الكلمة إلى قائمة AutoMod:

🚫 ${word}`
              : `⚠️ الكلمة موجودة بالفعل في قائمة AutoMod.`
          })

          break
        }

        if (action === `حذف`) {
          if (!word) {
            await sock.sendMessage(jid, {
              text:
`🛡️ استخدم:
!اوتومود_كلمات حذف <الكلمة>`
            })
            break
          }

          const removed = removeAutomodWord(jid, word)

          await sock.sendMessage(jid, {
            text: removed
              ? `🗑️ تم حذف الكلمة من قائمة AutoMod:

✅ ${word}`
              : `⚠️ الكلمة مش موجودة في القائمة.`
          })

          break
        }

        if (action === `قائمة`) {
          const words = getAutomodWords(jid)

          await sock.sendMessage(jid, {
            text: words.length
              ? `╭━━━〔 🚫 AUTO MOD WORDS 〕━━━╮
┃
┃  📋 الكلمات الممنوعة:
┃
${words.map((x, i) => `┃  ${i + 1}. ${x}`).join(`\n`)}
┃
╰━━〔 PHANTOM MODERATION 〕━━╯`
              : `╭━━━〔 🚫 AUTO MOD WORDS 〕━━━╮
┃
┃  📭 قائمة الكلمات فاضية.
┃
╰━━〔 PHANTOM MODERATION 〕━━╯`
          })

          break
        }

        await sock.sendMessage(jid, {
          text:
`🛡️ استخدم:
!اوتومود_كلمات اضافة <كلمة>
!اوتومود_كلمات حذف <كلمة>
!اوتومود_كلمات قائمة`
        })

        break
      }

      case `منع_الروابط`: {
        const value = args[0]?.toLowerCase()

        if (![`تفعيل`, `تعطيل`].includes(value)) {
          const current = getSettings(jid)

          await sock.sendMessage(jid, {
            text:
`╭━━━〔 🔗 PHANTOM LINK GUARD 〕━━━╮
┃
┃  الحالة: ${current.block_links ? `🟢 مفعّل` : `🔴 معطّل`}
┃
┃  استخدم:
┃  !منع_الروابط تفعيل
┃  !منع_الروابط تعطيل
┃
╰━━〔 LINK PROTECTION 〕━━╯`
          })
          break
        }

        const enabled = value === `تفعيل`

        setSetting(
          jid,
          `block_links`,
          enabled ? 1 : 0
        )

        await sock.sendMessage(jid, {
          text: enabled
            ? `🔗 تم تفعيل منع الروابط 🟢`
            : `🔗 تم تعطيل منع الروابط 🔴`
        })

        break
      }

      default: {
        await sock.sendMessage(jid, {
          text:
            `⚙️ الأمر !${commandName} موجود في نظام الإدارة 👑\n\n🚧 الوظيفة دي لسه هتتربط بإعدادات PHANTOM.`
        })
      }
    }
  }
}


export { requireAdmin }
