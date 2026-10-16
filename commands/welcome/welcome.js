export default {
  name: 'welcome',

  async execute({ sock, jid, user, group, customText }) {
    const mention = user

    const text = customText
      ? customText
          .replaceAll('{user}', `@${mention.split('@')[0]}`)
          .replaceAll('{group}', group || 'الجروب')
      : `╭━━━〔 👻 PHANTOM WELCOME 〕━━━╮
┃
┃  🎉 أهلاً وسهلاً!
┃
┃  👤 @${mention.split('@')[0]}
┃  ✨ نورتنا وانضميت لينا!
┃
┣━━〔 🏠 ${group || 'الجروب'} 〕━━
┃
┃  🎮 لعب ومرح
┃  😂 ضحك وسوالف
┃  🤖 بوتات وخدمات
┃
┣━━〔 📚 محتاج مساعدة؟ 〕━━
┃
┃  ❓ اكتب: !مساعدة
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💫 نتمنى تستمتع معانا!
┃  👻 PHANTOM BOT
┃
╰━━〔 🤍 WELCOME TO PHANTOM 〕━━╯`

    await sock.sendMessage(jid, {
      text,
      mentions: [user]
    })
  }
}
