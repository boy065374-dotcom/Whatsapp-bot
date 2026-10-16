import fs from 'fs'

export default {
  name: 'بطاطس',

  async execute({ sock, jid }) {
    await sock.sendMessage(jid, {
      image: fs.readFileSync('./assets/potato.jpg'),
      caption: `╭━━━〔 🥔 PHANTOM POTATO 〕━━━╮
┃
┃  🥔 بطاطسسسسس!
┃
┃  💀 البطاطساية وصلت
┃  😂 محدش طلبها بس عادي
┃
╰━━〔 🥔 PHANTOM GAMES 〕━━╯`
    })
  }
}
