const OWNER_JID = '201090950141@s.whatsapp.net'

const suspiciousMessageTypes = new Set([
  'protocolMessage',
  'senderKeyDistributionMessage',
  'messageContextInfo'
])

function getMessageType(message = {}) {
  return Object.keys(message).find(
    key => key !== 'messageContextInfo'
  ) || null
}

function getText(msg) {
  return (
    msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    ''
  )
}

function detectAntiBot(msg) {
  const message = msg?.message

  if (!message) {
    return {
      status: 'UNKNOWN',
      score: 0,
      reasons: ['لا توجد بيانات رسالة كافية']
    }
  }

  const reasons = []
  let score = 0

  const jid =
    msg?.key?.participant ||
    msg?.key?.remoteJid ||
    ''

  const text = getText(msg)
  const messageType = getMessageType(message)

  // PHANTOM نفسه
  if (msg?.key?.fromMe) {
    return {
      status: 'USER',
      score: 0,
      reasons: ['رسالة صادرة من PHANTOM']
    }
  }

  // Owner JID — مستثنى من Anti-Bot
  if (jid === OWNER_JID) {
    return {
      status: 'USER',
      score: 0,
      reasons: ['Owner JID']
    }
  }

  // رسائل خاصة بالنظام
  if (
    messageType &&
    suspiciousMessageTypes.has(messageType)
  ) {
    score += 2
    reasons.push(
      `نوع رسالة غير اعتيادي: ${messageType}`
    )
  }

  // JID غير متوقع
  if (!jid) {
    score += 2
    reasons.push('لا يوجد JID للمرسل')
  }

  // التحقق من وجود محتوى مفهوم
  const hasKnownContent =
    Boolean(text) ||
    Boolean(message.imageMessage) ||
    Boolean(message.videoMessage) ||
    Boolean(message.audioMessage) ||
    Boolean(message.documentMessage) ||
    Boolean(message.stickerMessage)

  if (!hasKnownContent) {
    score += 1
    reasons.push('محتوى الرسالة غير معروف')
  }

  // علامات Metadata غير المعتادة
  if (
    message?.senderKeyDistributionMessage &&
    !text
  ) {
    score += 1
    reasons.push('رسالة نظامية بدون نص')
  }

  /*
   * لا نعتبر:
   * pong
   * !ping
   * hi
   *
   * دليلًا على Bot.
   */

  let status = 'USER'

  if (score >= 4) {
    status = 'BOT'
  } else if (score >= 2) {
    status = 'UNKNOWN'
  }

  return {
    status,
    score,
    reasons,
    jid,
    text,
    messageType
  }
}

async function sendUnknownAlert({
  sock,
  jid,
  user
}) {
  const mention = user
    ? `@${user.split('@')[0]}`
    : '@الشخص'

  const result = await sock.sendMessage(jid, {
    text: `╭━━━━━━━━━━━━━━━━━━╮
┃ 👻? PHANTOM AntiBots ?👻 ┃
╰━━━━━━━━━━━━━━━━━━╯

┌─────────────────────────────┐
│ لم يتم التعرف على البوت من  │
│ هذه الرسالة.                │
│                             │
│ هل تريد طرد هذا الشخص؟      │
│                             │
│ إذا نعم: !طرد ${mention}     │
│ إذا لا: فلا تنفذ شيء.       │
│                             │
│ للتجاهل، رد على هذه الرسالة │
│ بـ: !حذف                    │
└─────────────────────────────┘

╭━━━━━━━━━━━━━━━━━━╮
┃ 👻? PHANTOM AntiBots ?👻 ┃
╰━━━━━━━━━━━━━━━━━━╯`,
    mentions: user ? [user] : []
  })

  return result
}

export {
  detectAntiBot,
  sendUnknownAlert
}

export default {
  detectAntiBot,
  sendUnknownAlert
}
