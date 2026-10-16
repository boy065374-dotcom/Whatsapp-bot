import fs from 'fs'
import settings from '../../config/settings.js'

const messages = [
  `╭━━━〔 👻 PHANTOM BOT 〕━━━╮
┃
┃  🤍 أهلاً بيك في Phantom
┃
┃  بوت بسيط، سريع، ومتواضع
┃  لكن عنده كل اللي تحتاجه 😎
┃
┣━━〔 ✨ المميزات 〕━━━━━━
┃
┃  👥 إدارة الأعضاء
┃  👑 أدوات الإشراف
┃  ⚙️ إدارة المجموعة
┃  🎮 ألعاب وتسلية
┃  🛡️ حماية و AutoMod
┃  ⚡ Shortcuts
┃  🖼️ صور ووسائط
┃  📁 إدارة الملفات
┃
┣━━━━━━━━━━━━━━━━━━━━
┃  🚫 لا يوجد أمر تنصيب
┃  🤖 Simple • Fast • Humble
┃
┃  💡 للمساعدة: !مساعدة
╰━━〔 PHANTOM SYSTEM 〕━━╯`,

  `╭━━━〔 😏 WHAT'S UP BRO? 〕━━━╮
┃
┃  👻 PHANTOM موجود معاك!
┃
┃  جاهز للإدارة؟
┃  🎮 جاهز للعب؟
┃  🛡️ محتاج حماية؟
┃
┃  متقلقش... كله موجود 😎
┃
┣━━〔 🔥 PHANTOM FEATURES 〕━━
┃
┃  👥 Members
┃  👑 Admin Tools
┃  ⚙️ Group Management
┃  🎮 Games & Fun
┃  🛡️ AutoMod
┃  ⚡ Shortcuts
┃  🖼️ Media
┃  📁 Files
┃
┃  🚫 No Install Command
┃
┃  🤍 استمتع بالبوت
┃  ❓ !مساعدة
╰━━〔 👻 PHANTOM 〕━━╯`,

  `╭━━━〔 🤔 WHAT TO DO? 〕━━━╮
┃
┃  أهلاً بيك مع Phantom Bot 👻
┃
┃  🎮 عايز تلعب؟
┃  └─ عندي ألعاب 😎
┃
┃  🛡️ عايز حماية؟
┃  └─ موجود 🔥
┃
┃  👑 عايز إدارة؟
┃  └─ تحت أمرك
┃
┃  😂 عايز تتسلى؟
┃  └─ ليه لأ؟
┃
┣━━〔 ✨ كل ده موجود 〕━━━
┃
┃  👥 إدارة الأعضاء
┃  👑 الإشراف
┃  ⚙️ إدارة المجموعة
┃  🎮 الألعاب
┃  🛡️ الحماية و AutoMod
┃  ⚡ Shortcuts
┃  🖼️ الوسائط
┃  📁 الملفات
┃
┃  ❓ للمزيد: !مساعدة
╰━━〔 PHANTOM BOT 〕━━╯`,

  `╭━━━〔 👻 PHANTOM IS HERE! 〕━━━╮
┃
┃  ⚡ SYSTEM ONLINE
┃
┃  بوت بسيط.
┃  سريع.
┃  ومتواضع 🤍
┃
┣━━〔 🚀 FEATURES 〕━━━━━━
┃
┃  🎮 Games
┃  🛡️ AutoMod
┃  👑 Admin Tools
┃  👥 Members Management
┃  ⚡ Shortcuts
┃  🖼️ Media
┃  📁 Files
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  🚫 لا يوجد أمر تنصيب
┃
┃  👻 PHANTOM جاهز للخدمة
┃
┃  اكتب !مساعدة
┃  وشوف كل اللي عندنا 😎
╰━━〔 SYSTEM ONLINE 〕━━╯`,

  `╭━━━〔 🔥 PHANTOM BOT 〕━━━╮
┃
┃  إيه الأخبار يا معلم؟ 👻
┃
┃  أنا Phantom،
┃  جاهز للألعاب والإدارة
┃  والتسلية 😎
┃
┣━━〔 ✨ عندي إيه؟ 〕━━━━━
┃
┃  👥 إدارة الأعضاء
┃  👑 إدارة الإشراف
┃  ⚙️ إدارة المجموعة
┃  🎮 ألعاب وتسلية
┃  🛡️ حماية و AutoMod
┃  ⚡ Shortcuts
┃  🖼️ صور ووسائط
┃  📁 إدارة الملفات
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  🤖 بسيط • سريع • متواضع
┃  🚫 بدون أمر تنصيب
┃
┃  💡 اكتب !مساعدة للمزيد
╰━━〔 PHANTOM X MAFIA 555 〕━━╯`
]

export default {
  name: 'بوت',

  async execute({ sock, jid, msg }) {
    const groupLink = settings.groupLink
      ? `\n\n🔗 ${settings.groupLink}`
      : ''

    const randomMessage =
      messages[Math.floor(Math.random() * messages.length)]

    await sock.sendMessage(jid, {
      image: fs.readFileSync('./assets/file_000000001434820d86fdd94ef16a02b0.png'),
      caption: randomMessage + groupLink
    })

    await sock.sendMessage(jid, {
      react: {
        text: '👋',
        key: msg.key
      }
    })
  }
}
