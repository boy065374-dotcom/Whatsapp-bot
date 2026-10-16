import welcome from '../commands/welcome/welcome.js'
import {
  getSettings
} from '../database/groupSettings.js'

export async function handleWelcome({ sock, update }) {
  const { id, participants, action } = update

  if (!id?.endsWith('@g.us')) return

  const settings = getSettings(id)

  try {
    const metadata = await sock.groupMetadata(id)
    const groupName = metadata.subject

    if (action === 'add' && settings.welcome) {
      for (const user of participants || []) {
        await welcome.execute({
          sock,
          jid: id,
          user,
          group: groupName,
          customText: settings.welcome_text
        })
      }
    }

    if (action === 'remove' && settings.goodbye) {
      for (const user of participants || []) {
        const mention = user

        const text = settings.goodbye_text ||
`╭━━━〔 👋 PHANTOM GOODBYE 〕━━━╮
┃
┃  👋 مع السلامة!
┃
┃  👤 @${mention.split('@')[0]}
┃  🚪 خرج من الجروب.
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💫 نتمنى نشوفك تاني
┃  👻 PHANTOM BOT
┃
╰━━〔 SEE YOU AGAIN 〕━━╯`

        await sock.sendMessage(id, {
          text,
          mentions: [user]
        })
      }
    }
  } catch (err) {
    console.error('❌ خطأ في Welcome/Goodbye Handler:', err)
  }
}
