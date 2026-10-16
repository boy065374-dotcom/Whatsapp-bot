import {
  addBalance,
  getCurrencyName
} from '../../database/economy.js'

const choices = {
  حجر: '🪨',
  ورق: '📄',
  مقص: '✂️'
}

const keys = Object.keys(choices)

export default {
  name: 'حجر',

  async execute({ sock, jid, args, commandName, msg }) {
    const userChoice = commandName

    if (!userChoice || !choices[userChoice]) {
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🎮 PHANTOM RPS 〕━━━╮
┃
┃  🪨 حجر • 📄 ورق • ✂️ مقص
┃
┣━━〔 ⚡ طريقة اللعب 〕━━━━
┃
┃  🪨 !حجر
┃  📄 !ورق
┃  ✂️ !مقص
┃
╰━━〔 PHANTOM GAMES 〕━━╯`
      })
      return
    }

    const botChoice =
      keys[Math.floor(Math.random() * keys.length)]

    if (userChoice === botChoice) {
      await sock.sendMessage(jid, {
        text: `╭━━━〔 🤝 PHANTOM RPS 〕━━━╮
┃
┃  🤝 تعادل!
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  👤 أنت      : ${choices[userChoice]} ${userChoice}
┃  👻 PHANTOM : ${choices[botChoice]} ${botChoice}
┃
┃  ⚖️ محدش كسب الجولة.
┃
╰━━〔 DRAW 〕━━╯`
      })
      return
    }

    const won =
      (userChoice === 'حجر' && botChoice === 'مقص') ||
      (userChoice === 'ورق' && botChoice === 'حجر') ||
      (userChoice === 'مقص' && botChoice === 'ورق')

    if (won) {
      const sender = msg?.key?.participant || jid
      const reward = 40000
      addBalance(jid, sender, reward)

      const currency = getCurrencyName(jid)

      await sock.sendMessage(jid, {
        text: `╭━━━〔 🏆 PHANTOM RPS 〕━━━╮
┃
┃  🎉 كسبت الجولة!
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  👤 أنت      : ${choices[userChoice]} ${userChoice}
┃  👻 PHANTOM : ${choices[botChoice]} ${botChoice}
┃
┣━━〔 💰 المكافأة 〕━━━━━━
┃
┃  +${reward.toLocaleString('en-US')} ${currency} 👁️
┃
╰━━〔 🏆 WINNER 〕━━╯`
      })
      return
    }

    await sock.sendMessage(jid, {
      text: `╭━━━〔 💀 PHANTOM RPS 〕━━━╮
┃
┃  😂 الجولة راحت عليك!
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  👤 أنت      : ${choices[userChoice]} ${userChoice}
┃  👻 PHANTOM : ${choices[botChoice]} ${botChoice}
┃
┃  👻 PHANTOM كسب الجولة.
┃  🔥 حاول تاني لو عندك أمل.
┃
╰━━〔 GAME OVER 〕━━╯`
    })
  }
}
