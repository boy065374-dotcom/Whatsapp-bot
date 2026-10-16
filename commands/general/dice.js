import { addBalance, getCurrencyName } from '../../database/economy.js'

export default {
  name: 'نرد',

  async execute({ sock, jid, msg }) {
    const number = Math.floor(Math.random() * 6) + 1
    const sender = msg?.key?.participant || jid

    const reward = 20000
    addBalance(jid, sender, reward)

    const currency = getCurrencyName(jid)

    await sock.sendMessage(jid, {
      text: `╭━━━〔 🎲 PHANTOM DICE 〕━━━╮
┃
┃  🎲 نتيجة رمية النرد
┃
┃  🎯 الرقم : *${number}*
┃
┣━━━━━━━━━━━━━━━━━━━━
┃  🎉 مبروك! كسبت الجولة
┃  💰 المكافأة : +${reward.toLocaleString('en-US')} ${currency}
┃
╰━━〔 👻 PHANTOM GAMES 〕━━╯`
    })

    await sock.sendMessage(jid, {
      react: {
        text: '🎲',
        key: msg.key
      }
    })
  }
}
