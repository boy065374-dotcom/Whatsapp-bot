import settings from '../../config/settings.js'
import { db } from '../../database/groupSettings.js'
import {
  getCurrencyName,
  getBalance,
  addBalance,
  claimDaily,
  getTop,
  setCurrencyName,
  resetEconomySettings,
  transferBetweenGroups
} from '../../database/economy.js'

const REWARDS = {
  easy: 20000,
  normal: 40000,
  hard: 100000,
  very_hard: 250000,
  extreme: 500000,
  impossible: 1000000,
  very_impossible: 10000000,
  extra_impossible: 1000000000
}

function normalizeJid(jid = '') {
  return jid
    .replace(/:\d+(?=@)/, '')
    .replace(/@s\.whatsapp\.net$/, '')
}

function getSender(msg, jid) {
  return msg?.key?.participant || jid
}

async function isDeveloper(msg, jid, sock) {
  const owner = String(settings.owner || '').replace(/\D/g, '')

  const ids = [
    msg?.key?.participant,
    msg?.key?.participantAlt,
    msg?.key?.participantPn,
    msg?.key?.remoteJid,
    msg?.key?.remoteJidAlt,
    jid
  ].filter(Boolean)

  for (const id of ids) {
    const raw = String(id)

    if (raw.endsWith('@lid') && sock?.signalRepository?.lidMapping) {
      try {
        const pn = await sock.signalRepository.lidMapping.getPNForLID(raw)

        if (pn) {
          const number = String(pn)
            .split('@')[0]
            .replace(/\D/g, '')

          if (number === owner) return true
        }
      } catch {}
    }

    const number = raw
      .split('@')[0]
      .replace(/\D/g, '')

    if (
      number === owner ||
      number === owner.replace(/^20/, '0') ||
      number === owner.replace(/^0/, '20')
    ) {
      return true
    }
  }

  return false
}

function parseAmount(value) {
  if (!value) return null

  const normalized = String(value)
    .replace(/[٬,]/g, '')
    .replace(/٠/g, '0')
    .replace(/١/g, '1')
    .replace(/٢/g, '2')
    .replace(/٣/g, '3')
    .replace(/٤/g, '4')
    .replace(/٥/g, '5')
    .replace(/٦/g, '6')
    .replace(/٧/g, '7')
    .replace(/٨/g, '8')
    .replace(/٩/g, '9')

  if (!/^\d+$/.test(normalized)) return null

  const amount = Number(normalized)

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return null
  }

  return amount
}

async function getMentionTarget(msg, sock) {
  const context =
    msg?.message?.extendedTextMessage?.contextInfo ||
    msg?.message?.conversationMessage?.extendedTextMessage?.contextInfo ||
    msg?.message?.imageMessage?.contextInfo ||
    msg?.message?.videoMessage?.contextInfo ||
    msg?.message?.documentMessage?.contextInfo ||
    {}

  const mentions = context.mentionedJid || context.mentionedJidList || []

  let target = mentions?.[0] || null

  if (!target && msg?.key?.participant) {
    const participant = msg.key.participant

    if (participant.endsWith('@lid')) {
      target = participant
    }
  }

  if (
    target?.endsWith('@lid') &&
    sock?.signalRepository?.lidMapping?.getPNForLID
  ) {
    try {
      const pn = await sock.signalRepository.lidMapping.getPNForLID(target)

      if (pn) {
        target = pn
      }
    } catch {}
  }

  return target || null
}

function extractInviteCode(input) {
  const match = String(input || '').match(
    /chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i
  )

  return match?.[1] || String(input || '').trim()
}

async function getJoinedGroups(sock) {
  const groups = await sock.groupFetchAllParticipating()

  return new Map(
    Object.entries(groups || {}).map(([jid, info]) => [
      jid,
      info
    ])
  )
}

async function resolveJoinedGroup(sock, input) {
  if (!input) return null

  const joined = await getJoinedGroups(sock)

  if (input.endsWith('@g.us')) {
    return joined.has(input) ? input : null
  }

  const code = extractInviteCode(input)

  if (!code) return null

  try {
    if (typeof sock.groupGetInviteInfo !== 'function') {
      return null
    }

    const info = await sock.groupGetInviteInfo(code)

    if (info?.id && joined.has(info.id)) {
      return info.id
    }
  } catch {}

  return null
}

function formatNumber(number) {
  return Number(number).toLocaleString('en-US')
}

function formatDuration(ms) {
  const hours = Math.ceil(ms / (60 * 60 * 1000))
  return `${hours} ساعة`
}

export default {
  name: 'بنك',

  async execute({
    sock,
    jid,
    msg,
    args,
    commandName
  }) {
    if (!jid?.endsWith('@g.us')) {
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🏦 PHANTOM BANK 〕━━━╮
┃
┃  ⚠️ نظام البنك متاح داخل
┃  👥 الجروبات فقط.
┃
╰━━〔 👻 PHANTOM 〕━━╯`
      })
      return
    }

    const sender = getSender(msg, jid)
    const currency = getCurrencyName(jid)

    if (commandName === 'بنك') {
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🏦 PHANTOM BANK 〕━━━╮
┃
┃  💰 مركز الاقتصاد
┃  👁️ العملة: ${currency}
┃
┣━━〔 💳 الحساب الشخصي 〕━━
┃
┃  💰 !رصيدي
┃  💵 !فلوسي
┃  🎁 !يومي
┃
┣━━〔 💸 التحويلات 〕━━━━━
┃
┃  💸 !تحويل @عضو <المبلغ>
┃  🌍 !تحويل_جروب <الرابط> <المبلغ>
┃
┣━━〔 🏆 المتصدرين 〕━━━━━
┃
┃  🏆 !توب_رانك
┃
┣━━〔 👑 أوامر المطور 〕━━
┃
┃  ➕ !اضافة_عملة @عضو <المبلغ>
┃  ✏️ !تسمية_العملة <الاسم>
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  🎮 العب واكسب ${currency}!
┃  ❓ !مساعدة
┃
╰━━〔 👻 PHANTOM ECONOMY 〕━━╯`
      })
      return
    }

    if (commandName === 'رصيدي' || commandName === 'فلوسي') {
      const balance = getBalance(jid, sender)

      await sock.sendMessage(jid, {
        text: `╭━━〔 💰 رصيدك 〕━━╮
┃
┃  👤 الحساب: أنت
┃  💰 الرصيد:
┃
┃  ✦ ${formatNumber(balance)} ${currency}
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
      })
      return
    }

    if (commandName === 'يومي') {
      const result = claimDaily(jid, sender, 50000)

      if (!result.claimed) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 ⏳ اليومية 〕━━╮
┃
┃  ⚠️ استلمت مكافأة اليوم بالفعل.
┃
┃  🕐 ارجع بعد حوالي:
┃  ${formatDuration(result.remaining)}
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      await sock.sendMessage(jid, {
        text: `╭━━〔 🎁 DAILY REWARD 〕━━╮
┃
┃  ✅ تم استلام المكافأة!
┃
┃  💰 المكافأة:
┃  ✦ +${formatNumber(result.amount)} ${currency}
┃
┃  🔥 ارجع بكرة لمكافأة جديدة!
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
      })
      return
    }

    if (commandName === 'توب_رانك') {
      const top = getTop(jid, 10)

      if (!top.length) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 🏆 TOP ECONOMY 〕━━╮
┃
┃  📭 لسه مفيش أرصدة
┃  في الجروب.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      const lines = top.map((row, index) => {
        const medals = ['🥇', '🥈', '🥉']
        const medal = medals[index] || `${index + 1}️⃣`

        return `${medal} @${row.user_jid.split('@')[0]} — ${formatNumber(row.balance)} ${currency}`
      })

      await sock.sendMessage(jid, {
        text: `╭━━〔 🏆 TOP ECONOMY 〕━━╮
┃
${lines.map(line => `┃  ${line}`).join('\n')}
┃
╰━━〔 💰 PHANTOM BANK 〕━━╯`,
        mentions: top.map(row => row.user_jid)
      })
      return
    }

    if (commandName === 'اضافة_عملة') {
      if (!isDeveloper(msg, jid, sock)) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 🔒 ACCESS DENIED 〕━━╮
┃
┃  ❌ الأمر ده متاح للمطور فقط.
┃
╰━━〔 👑 PHANTOM DEVELOPER 〕━━╯`
        })
        return
      }

      const target = await getMentionTarget(msg, sock)
      const amount = parseAmount(args[0])

      if (!target || !amount) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 ➕ إضافة عملة 〕━━╮
┃
┃  ❌ الاستخدام الصحيح:
┃
┃  !اضافة_عملة @عضو <المبلغ>
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      addBalance(jid, target, amount)

      await sock.sendMessage(jid, {
        text: `╭━━〔 👑 DEVELOPER BANK 〕━━╮
┃
┃  ✅ تمت إضافة العملة.
┃
┃  👤 العضو: @${target.split('@')[0]}
┃  💰 المبلغ:
┃  ✦ +${formatNumber(amount)} ${currency}
┃
╰━━〔 👻 PHANTOM 〕━━╯`,
        mentions: [target]
      })
      return
    }

    if (commandName === 'تسمية_العملة') {
      if (!isDeveloper(msg, jid, sock)) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 🔒 ACCESS DENIED 〕━━╮
┃
┃  ❌ الأمر ده متاح للمطور فقط.
┃
╰━━〔 👑 PHANTOM DEVELOPER 〕━━╯`
        })
        return
      }

      const name = args.join(' ').trim()

      if (!name) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 ✏️ تسمية العملة 〕━━╮
┃
┃  ❌ اكتب اسم العملة.
┃
┃  💡 مثال:
┃  !تسمية_العملة عملات الأشباح
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      if (name.length > 40) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 ⚠️ اسم العملة 〕━━╮
┃
┃  الاسم طويل جدًا.
┃
┃  📏 الحد الأقصى: 40 حرف.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      setCurrencyName(jid, name)

      await sock.sendMessage(jid, {
        text: `╭━━〔 👑 CURRENCY UPDATED 〕━━╮
┃
┃  ✅ تم تغيير اسم العملة.
┃
┃  👁️ الاسم الجديد:
┃  ${name}
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
      })
      return
    }

    if (commandName === 'تحويل') {
      const target = await getMentionTarget(msg, sock)
      const amount = parseAmount(args[0])

      if (!target || !amount) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 💸 تحويل العملة 〕━━╮
┃
┃  ❌ الاستخدام الصحيح:
┃
┃  !تحويل @عضو <المبلغ>
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      if (target === sender) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 😂 تحويل 〕━━╮
┃
┃  ❌ مينفعش تحول لنفسك!
┃
┃  💡 اختار عضو تاني.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      const balance = getBalance(jid, sender)

      if (balance < amount) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 💸 تحويل مرفوض 〕━━╮
┃
┃  ❌ رصيدك مش كافي.
┃
┃  💰 رصيدك:
┃  ${formatNumber(balance)} ${currency}
┃
┃  💸 المطلوب:
┃  ${formatNumber(amount)} ${currency}
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      if (!removeAndAdd(jid, sender, target, amount)) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 ⚠️ TRANSFER ERROR 〕━━╮
┃
┃  ❌ فشل التحويل.
┃  🔄 حاول تاني.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      await sock.sendMessage(jid, {
        text: `╭━━〔 💸 TRANSFER COMPLETE 〕━━╮
┃
┃  ✅ تم التحويل بنجاح!
┃
┃  👤 إلى: @${target.split('@')[0]}
┃  💰 المبلغ:
┃  ✦ ${formatNumber(amount)} ${currency}
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`,
        mentions: [target]
      })
      return
    }

    if (commandName === 'تحويل_جروب') {
      const input = args[0]
      const amount = parseAmount(args[1])

      if (!input || !amount) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 🌍 تحويل بين الجروبات 〕━━╮
┃
┃  ❌ الاستخدام الصحيح:
┃
┃  !تحويل_جروب <رابط الجروب> <المبلغ>
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      const targetGroup = await resolveJoinedGroup(sock, input)

      if (!targetGroup) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 🌍 تحويل جروب 〕━━╮
┃
┃  ❌ الجروب الهدف مش موجود
┃  ضمن الجروبات اللي PHANTOM
┃  منضم ليها.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      if (targetGroup === jid) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 ⚠️ تحويل جروب 〕━━╮
┃
┃  ❌ ده نفس الجروب الحالي.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      const targetCurrency = getCurrencyName(targetGroup)

      if (targetCurrency !== currency) {
        await sock.sendMessage(jid, {
          text: `╭━━〔 ⚠️ CURRENCY MISMATCH 〕━━╮
┃
┃  ❌ العملة مختلفة بين الجروبين.
┃
┃  👁️ هنا:
┃  ${currency}
┃
┃  👁️ الهدف:
┃  ${targetCurrency}
┃
┃  💡 لازم العملة تكون متطابقة.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
        return
      }

      try {
        transferBetweenGroups(
          jid,
          targetGroup,
          sender,
          amount,
          currency
        )

        await sock.sendMessage(jid, {
          text: `╭━━〔 🌍 GROUP TRANSFER 〕━━╮
┃
┃  ✅ تم تحويل العملة بنجاح!
┃
┃  💰 المبلغ:
┃  ✦ ${formatNumber(amount)} ${currency}
┃
┃  🏦 الجروب الهدف:
┃  موجود ضمن جروبات PHANTOM
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
        })
      } catch (err) {
        if (err.message === 'INSUFFICIENT_BALANCE') {
          await sock.sendMessage(jid, {
            text: `╭━━〔 💸 تحويل مرفوض 〕━━╮
┃
┃  ❌ رصيدك مش كافي للتحويل.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
          })
        } else {
          console.error('Economy group transfer error:', err)

          await sock.sendMessage(jid, {
            text: `╭━━〔 ⚠️ SYSTEM ERROR 〕━━╮
┃
┃  ❌ حصل خطأ أثناء التحويل.
┃  🔄 حاول تاني.
┃
╰━━〔 👻 PHANTOM BANK 〕━━╯`
          })
        }
      }

      return
    }
  }
}

function removeAndAdd(groupJid, from, to, amount) {
  db.exec('BEGIN IMMEDIATE')

  try {
    const result = db.prepare(`
      UPDATE economy_accounts
      SET balance = balance - ?
      WHERE group_jid = ?
        AND user_jid = ?
        AND balance >= ?
    `).run(amount, groupJid, from, amount)

    if (result.changes === 0) {
      throw new Error('INSUFFICIENT_BALANCE')
    }

    db.prepare(`
      INSERT OR IGNORE INTO economy_accounts
      (group_jid, user_jid, balance, daily_claim, created_at)
      VALUES (?, ?, 0, 0, ?)
    `).run(groupJid, to, Date.now())

    db.prepare(`
      UPDATE economy_accounts
      SET balance = balance + ?
      WHERE group_jid = ?
        AND user_jid = ?
    `).run(amount, groupJid, to)

    db.exec('COMMIT')
  } catch (err) {
    try {
      db.exec('ROLLBACK')
    } catch {}

    throw err
  }

  return true
}
