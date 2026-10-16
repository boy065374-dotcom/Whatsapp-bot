import { generateJoke } from '../../lib/ai.js'

export default {
  name: 'نكته',

  async execute({ sock, jid }) {
    try {
      const joke = await generateJoke()

      await sock.sendMessage(jid, {
        text: `╭━━━〔 😂 PHANTOM JOKE 〕━━━╮
┃
┃  🤖 Gemini جهّزلك النكتة...
┃
┃  ${joke}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃  👻 Gemini × PHANTOM
┃  ✨ استمتع 😂
┃
╰━━〔 PHANTOM AI 〕━━╯`
      })

    } catch (error) {
      console.error('❌ Joke Error:', error)

      await sock.sendMessage(jid, {
        text: `╭━━━〔 💀 PHANTOM JOKE 〕━━━╮
┃
┃  ⚠️ Gemini مش قادر يطلع
┃  النكتة دلوقتي 😂
┃
┃  🔄 جرّب الأمر تاني بعد شوية.
┃
╰━━〔 PHANTOM AI 〕━━╯`
      })
    }
  }
}
