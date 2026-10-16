export default {
  name: 'me',

  async execute({ sock, jid, message }) {
    let metadata

    try {
      metadata = await sock.groupMetadata(jid)
    } catch (err) {
      console.log('❌ groupMetadata error:', err.message)

      await sock.sendMessage(jid, {
        text: '⚠️ تعذر الحصول على معلومات الجروب حاليًا.'
      })

      return
    }

    const normalize = value =>
      value?.split('@')[0]?.split(':')[0]

    const botId = normalize(sock.user?.id)
    const botLid = normalize(sock.user?.lid)

    const bot = metadata.participants.find(p =>
      normalize(p.id) === botId ||
      normalize(p.id) === botLid ||
      normalize(p.phoneNumber) === botId
    )

    const isAdmin =
      bot?.admin === 'admin' ||
      bot?.admin === 'superadmin'

    console.log('🤖 Bot:', sock.user)
    console.log('👤 Participant:', bot)
    console.log('👑 Is admin:', isAdmin)

    if (!isAdmin) {
      await sock.sendMessage(jid, {
        text: 'Not an admin... excused.'
      })
      return
    }

    const start = Date.now()

    try {
      await sock.groupSettingUpdate(jid, 'announcement')

      await sock.sendMessage(jid, {
        text: '_*sudo = Super User Do*_'
      })

      const mentioned =
        message?.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

      const mentionedSet = new Set(mentioned)

      const targets = metadata.participants
        .filter(p => {
          const isBot =
            normalize(p.id) === botId ||
            normalize(p.id) === botLid ||
            normalize(p.phoneNumber) === botId

          const isMentioned =
            mentionedSet.has(p.id) ||
            mentionedSet.has(p.lid) ||
            mentionedSet.has(p.phoneNumber)

          return !isBot && !isMentioned
        })
        .map(p => p.id)

      const kickStart = Date.now()

      if (targets.length) {
        await sock.groupParticipantsUpdate(
          jid,
          targets,
          'remove'
        )
      }

      const kickSpeed = Date.now() - kickStart
      const ping = Date.now() - start

      await sock.sendMessage(jid, {
        text:
`> تم الزرف بنجاح! 😈🔥 معلومات:

*سرعة الطرد: ${kickSpeed}ms* ⚡
*ping: ${ping}ms* 📡

> منورنا يا مزروف 🐤💀`
      })

    } catch (err) {
      console.log('❌ me execution error:', err.message)

      await sock.sendMessage(jid, {
        text: `⚠️ حصل خطأ أثناء تنفيذ الأمر:\n${err.message}`
      })
    }
  }
}
