import {
  registerNickname,
  changeNickname,
  deleteNickname,
  getNickname,
  getUserByNickname,
  getNicknames,
  countNicknames,
  resolveUser
} from './alkab.js'

const EMOJI = {
  success: '✅',
  error: '❌',
  register: '📝',
  change: '🔄',
  list: '📜',
  search: '🔎',
  delete: '🗑️',
  nickname: '🏷️',
  user: '👤',
  identity: '🪪',
  crown: '👑'
}

function getSender(msg) {
  return (
    msg?.key?.participant ||
    msg?.participant ||
    msg?.key?.remoteJid ||
    ''
  )
}

function getGroupJid(msg) {
  return msg?.key?.remoteJid || ''
}

function getText(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    ''
  ).trim()
}

function getReplyTarget(msg) {
  const context =
    msg?.message?.extendedTextMessage?.contextInfo ||
    msg?.message?.imageMessage?.contextInfo ||
    msg?.message?.videoMessage?.contextInfo ||
    msg?.message?.documentMessage?.contextInfo

  return (
    context?.participant ||
    context?.quotedMessage?.key?.participant ||
    context?.mentionedJid?.[0] ||
    null
  )
}

function formatUser(jid) {
  if (!jid) return 'غير معروف'
  return jid.split('@')[0]
}

async function react(sock, jid, key, emoji) {
  try {
    await sock.sendMessage(jid, {
      react: {
        text: emoji,
        key
      }
    })
  } catch {}
}

function success(text) {
  return `╭━━━〔 🏷️ PHANTOM ALKAB 〕━━━╮
┃
┃  ✅ ${text}
┃
╰━━〔 👻 PHANTOM SYSTEM 〕━━╯`
}

function error(text) {
  return `╭━━━〔 ⚠️ PHANTOM ALKAB 〕━━━╮
┃
┃  ❌ ${text}
┃
╰━━〔 PHANTOM SYSTEM 〕━━╯`
}

const alkabCommands = {
  name: 'القاب',

  commands: [
    'القاب',
    'سجل',
    'سجلني',
    'تغيير_لقب',
    'لقبي',
    'حذف_لقب'
  ],

  async execute({ commandName, args = [], msg, sock }) {
    const jid = getGroupJid(msg)
    const sender = getSender(msg)

    if (!jid.endsWith('@g.us')) {
      return {
        text: error('الأوامر دي متاحة داخل الجروبات فقط.')
      }
    }

    /* =========================
       !سجلني <لقب>
    ========================= */

    if (commandName === 'سجلني') {
      await react(sock, jid, msg.key, EMOJI.register)

      const nickname = args.join(' ').trim()

      if (!nickname) {
        return {
          text: error(`اكتب اللقب اللي عايز تسجله.

💡 مثال:
!سجلني لوفي`)
        }
      }

      const result = registerNickname(
        jid,
        sender,
        nickname
      )

      if (!result.ok) {
        if (result.error === 'NICKNAME_TAKEN') {
          return {
            text: error(`اللقب \`${nickname}\` مأخوذ بالفعل.`)
          }
        }

        if (result.error === 'USER_ALREADY_REGISTERED') {
          return {
            text: error('أنت مسجل بالفعل في نظام الألقاب.')
          }
        }

        return {
          text: error('تعذر تسجيل اللقب.')
        }
      }

      await react(sock, jid, msg.key, EMOJI.success)

      return {
        text: success(
          `تم تسجيل لقبك بنجاح! 🏆

🏷️ اللقب:
\`${result.nickname}\``
        )
      }
    }

    /* =========================
       !لقبي
    ========================= */

    if (commandName === 'لقبي') {
      await react(sock, jid, msg.key, EMOJI.identity)

      const result = getNickname(jid, sender)

      if (!result) {
        return {
          text: error('أنت مش مسجل في نظام الألقاب.')
        }
      }

      return {
        text: `╭━━━〔 🪪 PHANTOM IDENTITY 〕━━━╮
┃
┃  👤 هويتك في PHANTOM
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  👤 المستخدم:
┃  \`${formatUser(sender)}\`
┃
┃  🏷️ اللقب:
┃  \`${result.nickname}\`
┃
╰━━〔 👻 PHANTOM ALKAB 〕━━╯`
      }
    }

    /* =========================
       !سجل <رد> <لقب>
    ========================= */

    if (commandName === 'سجل') {
      await react(sock, jid, msg.key, EMOJI.register)

      const target = getReplyTarget(msg)

      if (!target) {
        return {
          text: error(
            'لازم تعمل *Reply* على رسالة الشخص اللي عايز تسجله.'
          )
        }
      }

      const nickname = args.join(' ').trim()

      if (!nickname) {
        return {
          text: error(
            `اكتب اللقب بعد الرد على الشخص.

💡 مثال:
!سجل لوفي`
          )
        }
      }

      const result = registerNickname(
        jid,
        target,
        nickname
      )

      if (!result.ok) {
        if (result.error === 'NICKNAME_TAKEN') {
          return {
            text: error(`اللقب \`${nickname}\` مأخوذ بالفعل.`)
          }
        }

        if (result.error === 'USER_ALREADY_REGISTERED') {
          return {
            text: error('المستخدم ده عنده لقب مسجل بالفعل.')
          }
        }

        return {
          text: error('تعذر تسجيل اللقب.')
        }
      }

      await react(sock, jid, msg.key, EMOJI.success)

      return {
        text: success(
          `تم تسجيل اللقب بنجاح! 🏆

👤 المستخدم:
\`${formatUser(target)}\`

🏷️ اللقب:
\`${result.nickname}\``
        )
      }
    }

    /* =========================
       !تغيير_لقب <القديم> <الجديد>
    ========================= */

    if (commandName === 'تغيير_لقب') {
      await react(sock, jid, msg.key, EMOJI.change)

      if (args.length < 2) {
        return {
          text: error(
            `استخدم الأمر بالشكل ده:

\`!تغيير_لقب <اللقب الحالي> <اللقب الجديد>\``
          )
        }
      }

      const oldNickname = args.shift()
      const newNickname = args.join(' ').trim()

      const user = getUserByNickname(
        jid,
        oldNickname
      )

      if (!user) {
        return {
          text: error(
            `اللقب \`${oldNickname}\` غير مسجل.`
          )
        }
      }

      if (user.user_jid !== sender) {
        return {
          text: error(
            `اللقب \`${oldNickname}\` مش مسجل عليك.`
          )
        }
      }

      const result = changeNickname(
        jid,
        sender,
        oldNickname,
        newNickname
      )

      if (!result.ok) {
        if (result.error === 'NICKNAME_TAKEN') {
          return {
            text: error(
              `اللقب \`${newNickname}\` مأخوذ بالفعل.`
            )
          }
        }

        if (result.error === 'SAME_NICKNAME') {
          return {
            text: error(
              'اللقب الجديد مطابق للقب الحالي.'
            )
          }
        }

        return {
          text: error('تعذر تغيير اللقب.')
        }
      }

      await react(sock, jid, msg.key, EMOJI.success)

      return {
        text: success(
          `تم تغيير لقبك بنجاح! 🔄

🏷️ القديم:
\`${result.oldNickname}\`

🏷️ الجديد:
\`${result.newNickname}\``
        )
      }
    }

    /* =========================
       !القاب
    ========================= */

    if (commandName === 'القاب') {
      await react(sock, jid, msg.key, EMOJI.list)

      const list = getNicknames(jid)
      const count = countNicknames(jid)

      if (!list.length) {
        return {
          text: `╭━━━〔 📜 PHANTOM ALKAB 〕━━━╮
┃
┃  🏷️ ألقاب الجروب
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  📭 لا يوجد ألقاب مسجلة حاليًا.
┃
┃  💡 استخدم:
┃  !سجلني <لقب>
┃
╰━━〔 PHANTOM SYSTEM 〕━━╯`
        }
      }

      const lines = list.map(
        (item, index) =>
          `${index + 1}. 🏷️ \`${item.nickname}\``
      )

      return {
        text: `╭━━━〔 📜 PHANTOM ALKAB 〕━━━╮
┃
┃  🏷️ ألقاب الجروب
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  ${lines.join('\n┃  ')}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  📊 الإجمالي:
┃  \`${count}\` لقب
┃
╰━━〔 👻 PHANTOM ALKAB 〕━━╯`
      }
    }

    /* =========================
       !حذف_لقب <اللقب>
    ========================= */

    if (commandName === 'حذف_لقب') {
      await react(sock, jid, msg.key, EMOJI.delete)

      const nickname = args.join(' ').trim()

      if (!nickname) {
        return {
          text: error(
            'اكتب اللقب اللي عايز تحذفه.'
          )
        }
      }

      const user = getUserByNickname(
        jid,
        nickname
      )

      if (!user) {
        return {
          text: error(
            `اللقب \`${nickname}\` غير مسجل.`
          )
        }
      }

      if (user.user_jid !== sender) {
        return {
          text: error(
            'مينفعش تحذف لقب مستخدم تاني من الأمر ده.'
          )
        }
      }

      const result = deleteNickname(
        jid,
        sender
      )

      if (!result.ok) {
        return {
          text: error('تعذر حذف اللقب.')
        }
      }

      await react(sock, jid, msg.key, EMOJI.success)

      return {
        text: success(
          `تم حذف لقبك بنجاح! 🗑️

🏷️ اللقب المحذوف:
\`${result.nickname}\``
        )
      }
    }

    return {
      text: error('الأمر غير معروف.')
    }
  }
}

export default alkabCommands
