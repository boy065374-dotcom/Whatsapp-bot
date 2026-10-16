import settings from '../config/settings.js'
import { getSubBotPrefix } from '../subbots/manager.js'

import ping from '../commands/general/ping.js'
import help from '../commands/general/help.js'
import bot from '../commands/general/bot.js'
import potato from '../commands/general/potato.js'
import joke from '../commands/general/joke.js'
import edittest from '../commands/general/edittest.js'
import dice from '../commands/general/dice.js'
import quiz, { handleQuizAnswer } from '../commands/general/quiz.js'
import rps from '../commands/general/rps.js'
import games from '../commands/general/games.js'
import security from '../commands/general/security.js'
import admin from '../commands/general/admin.js'
import economy from '../commands/general/economy.js'
import phantomCommand from '../commands/general/phantom.js'
import alkab from '../Alkab/alkab-cmd.js'
import owner from '../commands/general/owner.js'
import desert from '../commands/general/desert.js'
import sudo from '../commands/general/sudo.js'

import {
  isCommandLocked,
  getSettings
} from '../database/groupSettings.js'

const commands = new Map()

commands.set(ping.name, ping)
commands.set(phantomCommand.name, phantomCommand)
commands.set(help.name, help)
commands.set(bot.name, bot)
commands.set(potato.name, potato)
commands.set(joke.name, joke)
commands.set(dice.name, dice)
commands.set(quiz.name, quiz)
commands.set(rps.name, rps)

commands.set('ورق', rps)
commands.set('مقص', rps)

commands.set(games.name, games)
commands.set(security.name, security)
commands.set(admin.name, admin)
commands.set(economy.name, economy)

commands.set('رصيدي', economy)
commands.set('فلوسي', economy)
commands.set('يومي', economy)
commands.set('تحويل', economy)
commands.set('تحويل_جروب', economy)
commands.set('توب_رانك', economy)
commands.set('تسمية_العملة', economy)
commands.set('اضافة_عملة', economy)

commands.set('القاب', alkab)
commands.set('سجل', alkab)
commands.set('سجلني', alkab)
commands.set('تغيير_لقب', alkab)
commands.set('لقبي', alkab)
commands.set('حذف_لقب', alkab)

commands.set(edittest.name, edittest)
commands.set(owner.name, owner)
commands.set(desert.name.toLowerCase(), desert)
commands.set('me', sudo)

const adminCommands = [
  'جماعي',
  'رقي',
  'طرد',
  'ترقيات',
  'ازل',
  'دعوة',
  'تاغ',
  'فتح',
  'قفل',
  'فتح_الكل',
  'قفل_امر',
  'فتح_امر',
  'تغيير',
  'شات_بوت',
  'مود',
  'مخفي',
  'رسائل',
  'طلبات',
  'طلبات_الانضمام',
  'تجديد_اللينك',
  'ثبت',
  'ستوري',
  'ترحيب',
  'تعيين_ترحيب',
  'وداع',
  'تعيين_وداع',
  'تحذير',
  'عدد_التحذيرات',
  'حذف_تحذير',
  'مراقبة_الكل',
  'مراقبة_اعضاء',
  'مراقبة_اعدادات',
  'مراقبة_اشراف',
  'نشاط',
  'الاوامر_المقفولة',
  'تحديد_عملة',
  'افتراضي',
  'مسح'
]

for (const name of adminCommands) {
  commands.set(name, admin)
}

const adminBypass = new Set([
  'ادارة',
  'قفل_امر',
  'فتح_امر',
  'فتح_الكل',
  'الاوامر_المقفولة'
])

function levenshtein(a, b) {
  const dp = Array.from(
    { length: a.length + 1 },
    () => Array(b.length + 1).fill(0)
  )

  for (let i = 0; i <= a.length; i++) {
    dp[i][0] = i
  }

  for (let j = 0; j <= b.length; j++) {
    dp[0][j] = j
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] +
          (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }

  return dp[a.length][b.length]
}

export async function handlePhantomMessage({ sock, msg }) {
  if (!msg?.message) return

  const jid = msg.key.remoteJid

  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    ''

  if (await handleQuizAnswer({ sock, jid, text, msg })) {
    return
  }

  const phone =
    sock.__phantomPrefix !== undefined
      ? String(sock.__phantomPrefix)
      : null

  const prefix =
    phone !== null
      ? phone
      : getSubBotPrefix(sock.user?.id?.split(':')[0] || '')

  if (!text.startsWith(prefix)) {
    return
  }

  const args = text
    .slice(prefix.length)
    .trim()
    .split(/\s+/)

  const commandName = args.shift()?.toLowerCase()

  if (!commandName) return

  let command = commands.get(commandName)

  if (!command && commandName === 'تنصيب') {
    try {
      const module = await import('../commands/general/install.js')
      command = module.default

      if (command?.name) {
        commands.set(command.name, command)
      }
    } catch (error) {
      console.error('❌ Failed to load install command:', error)
    }
  }

  if (
    jid?.endsWith('@g.us') &&
    !adminBypass.has(commandName) &&
    isCommandLocked(jid, commandName)
  ) {
    await sock.sendMessage(jid, {
      text:
`╭━━━〔 🔒 PHANTOM LOCK 〕━━━╮
┃
┃  🔒 الأمر مقفول حاليًا
┃
┃  📌 الأمر:
┃  👉 ${prefix}${commandName}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  ⚙️ تم قفل الأمر بواسطة
┃  🛡️ إعدادات الجروب
╰━━〔 PHANTOM SECURITY 〕━━╯`
    })

    return
  }

  if (
    jid?.endsWith('@g.us') &&
    commandName !== 'ادارة'
  ) {
    const groupSettings = getSettings(jid)

    if (!groupSettings.bot_chat) {
      return
    }
  }

  if (!command) {
    const sender =
      msg.key.participant ||
      msg.key.remoteJid

    const mention = sender
      ? `@${sender.split('@')[0]}`
      : 'يا معلم'

    const availableCommands = [...commands.keys()]

    let closest = null
    let closestDistance = Infinity

    for (const name of availableCommands) {
      const distance = levenshtein(commandName, name)

      if (distance < closestDistance) {
        closestDistance = distance
        closest = name
      }
    }

    const maxDistance =
      commandName.length <= 4
        ? 1
        : commandName.length <= 7
          ? 2
          : 3

    let responseText

    if (closest && closestDistance <= maxDistance) {
      responseText =
`╭━━━〔 👻 PHANTOM 〕━━━╮
┃
┃  👋 عامل إيه يا ${mention} 😂🔥
┃
┃  ❌ الأمر مش موجود
┃  🔎 ${prefix}${commandName}
┃
┣━━〔 💡 اقتراح 〕━━━━━━━━
┃
┃  👀 يمكن تقصد:
┃  👉 ${settings.prefix}${closest}
┃
┃  🔥 جرّبه كده!
╰━━〔 PHANTOM SYSTEM 〕━━╯`
    } else {
      responseText =
`╭━━━〔 👻 PHANTOM 〕━━━╮
┃
┃  👋 عامل إيه يا ${mention} 😂🔥
┃
┃  ❌ الأمر مش موجود
┃  🔎 ${settings.prefix}${commandName}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💡 اكتب ${prefix}مساعدة
┃  👀 وشوف كل الأوامر المتاحة
╰━━〔 PHANTOM SYSTEM 〕━━╯`
    }

    await sock.sendMessage(jid, {
      text: responseText,
      mentions: sender ? [sender] : []
    })

    return
  }

  try {
    const result = await command.execute({
      sock,
      msg,
      jid,
      args,
      text,
      commandName
    })

    if (result?.text) {
      await sock.sendMessage(jid, {
        text: result.text,
        mentions: result.mentions || []
      })
    }

    if (result?.image) {
      await sock.sendMessage(jid, {
        image: result.image,
        caption: result.caption || '',
        mentions: result.mentions || []
      })
    }

    if (result?.video) {
      await sock.sendMessage(jid, {
        video: result.video,
        caption: result.caption || '',
        mentions: result.mentions || []
      })
    }
  } catch (err) {
    console.error(`❌ خطأ في الأمر ${commandName}:`, err)
  }
}
