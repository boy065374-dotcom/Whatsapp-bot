const owner = {
  name: 'اونر',

  async execute({ sock, jid, msg }) {
    await sock.sendMessage(jid, {
      react: {
        text: '⚡️',
        key: msg.key
      }
    })

    const ownerNumber = '201090950141'
    const ownerJid = `${ownerNumber}@s.whatsapp.net`

    return {
      text: `╭━━━〔 👑 PHANTOM OWNER 〕━━━╮
┃
┃  👑 مالك البوت
┃
┃  👤 الأونر:
┃  @${ownerNumber}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  ⚡ PHANTOM SYSTEM
┃  🛡️ Official Owner
┃
╰━━〔 👻 PHANTOM BOT 〕━━╯`,
      mentions: [ownerJid]
    }
  }
}

export default owner
