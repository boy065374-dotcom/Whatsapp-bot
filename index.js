import 'dotenv/config'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion
} from '@oxidezap/baileyrs'

import pino from 'pino'
import fs from 'fs'
import settings from './config/settings.js'
import ping from './commands/general/ping.js'
import help from './commands/general/help.js'
import bot from './commands/general/bot.js'
import potato from './commands/general/potato.js'
import joke from './commands/general/joke.js'
import edittest from './commands/general/edittest.js'
import dice from './commands/general/dice.js'
import quiz, { handleQuizAnswer } from './commands/general/quiz.js'
import rps from './commands/general/rps.js'
import games from './commands/general/games.js'
import security from './commands/general/security.js'
import admin, { requireAdmin } from './commands/general/admin.js'
import economy from './commands/general/economy.js'
import phantomCommand from './commands/general/phantom.js'
import alkab from './Alkab/alkab-cmd.js'
import {
  isCommandLocked,
  getSettings,
  hasAutomodWord,
  isMuted,
  addPrivateBlock,
  removePrivateBlock,
  isPrivateBlocked
} from './database/groupSettings.js'
import { handleWelcome } from './handlers/welcome.js'
import owner from './commands/general/owner.js'
import install from './commands/general/install.js'
import desert from './commands/general/desert.js'
import sudo from './commands/general/sudo.js'
import { detectAntiBot, sendUnknownAlert } from './security/antiBot.js'
import absurd from './commands/general/absurd.js'
import { startSavedSubBots } from './subbots/manager.js'
import absurdReply from './commands/general/absurdReply.js'
import test from './commands/general/test.js';

const PHONE_NUMBER = '201090950141'

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
commands.set(edittest.name, edittest)
commands.set('حذف_لقب', alkab)
commands.set(owner.name, owner)
commands.set(install.name, install)
commands.set(desert.name.toLowerCase(), desert)
commands.set('me', sudo)
commands.set('عبث', absurd)
commands.set(absurdReply.name, absurdReply)

const adminCommands = [
  'جماعي',
  'رقي',
  'طرد',
  'كتم',
  'فك_كتم',
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
  'مسح',
  'اوتومود',
  'اوتومود_كلمات',
  'منع_الروابط',
  'ادمن_فرعي',
  'حذف_ادمن_فرعي',
  'ادمن_فرعي_قائمة'
]

for (const name of adminCommands) {
  commands.set(name, admin)
}

const PHANTOM_GROUP_NAME =
  settings.groupName || 'PHANTOM X MAFIA 555'

const PHANTOM_BANNER =
  settings.banner || './assets/banner.png'

async function getPhantomGroupLink(sock, jid) {
  try {
    if (!jid || !jid.endsWith('@g.us')) return ''

    const code = await sock.groupInviteCode(jid)

    return code
      ? `https://chat.whatsapp.com/${code}`
      : ''
  } catch {
    return ''
  }
}

async function phantomBrandText(sock, jid, text = '') {
  return text + "\n\n📢 Updates:\nhttps://whatsapp.com/channel/0029VbE2uN5DDmFZ0BOL9k2k"
}

function installPhantomBranding(sock) {
  if (sock.__phantomBrandingInstalled) return

  sock.__phantomBrandingInstalled = true

  const originalSendMessage =
    sock.sendMessage.bind(sock)

  sock.sendMessage = async (
    jid,
    content,
    options = {}
  ) => {
    // الريأكشنات والـ protocol messages تفضل كما هي
    if (
      content?.react ||
      content?.protocolMessage
    ) {
      return originalSendMessage(
        jid,
        content,
        options
      )
    }

    try {
      // الرسائل النصية:
      // رسالة واحدة فقط = البانر + النص
      if (content?.text === 'تست تست') {
    return originalSendMessage(jid, content, options)
}

if (typeof content?.text === 'string') {
        const brandedText =
          await phantomBrandText(
            sock,
            jid,
            content.text
          )

        return originalSendMessage(
          jid,
          {
            image: {
              url: PHANTOM_BANNER
            },
            caption: brandedText,
            ...(content.mentions
              ? {
                  mentions:
                    content.mentions
                }
              : {})
          },
          options
        )
      }

      // الميديا:
      // الميديا نفسها تُرسل مرة واحدة
      // مع Branding في الـcaption
      if (
        content?.image ||
        content?.video ||
        content?.document ||
        content?.audio
      ) {
        const mediaContent = {
          ...content
        }

        const originalCaption =
          typeof mediaContent.caption === 'string'
            ? mediaContent.caption
            : ''

        mediaContent.caption =
          await phantomBrandText(
            sock,
            jid,
            originalCaption
          )

        return originalSendMessage(
          jid,
          mediaContent,
          options
        )
      }

      return originalSendMessage(
        jid,
        content,
        options
      )
    } catch (err) {
      console.error(
        '❌ PHANTOM Branding Error:',
        err
      )

      return originalSendMessage(
        jid,
        content,
        options
      )
    }
  }

  console.log('🎨 PHANTOM Branding: ON')
}

let pairingBlockedUntil = 0

async function startPHANTOM() {
  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(
    settings.sessionDir
  )

  let waVersion

  try {
    const latest =
      await fetchLatestBaileysVersion()

    waVersion = latest.version

    console.log(
      `📡 WA Version: ${waVersion.join('.')}`
    )

    console.log(
      `🟢 Latest: ${
        latest.isLatest
          ? 'YES'
          : 'NO'
      }`
    )
  } catch (err) {
    console.log(
      '⚠️ فشل جلب WA Version — هنستخدم الافتراضي.'
    )
  }

  const sock = makeWASocket({
    auth: state,
    ...(waVersion
      ? { version: waVersion }
      : {}),
    logger: pino({
      level: 'silent'
    }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    syncFullHistory: false
  })

  installPhantomBranding(sock)

  sock.ev.on(
    'creds.update',
    saveCreds
  )

  let pairingRequested = false

  sock.ev.on(
    'connection.update',
    async ({
      connection,
      qr,
      lastDisconnect
    }) => {
      if (connection === 'connecting') {
        console.log(
          '🔄 جاري الاتصال بواتساب...'
        )
      }

      if (
        qr &&
        !state.creds.registered &&
        !pairingRequested &&
        Date.now() >= pairingBlockedUntil
      ) {
        pairingRequested = true

        try {
          const code =
            await sock.requestPairingCode(
              PHONE_NUMBER
            )

          console.log('')
          console.log(
            '╔══════════════════════════════╗'
          )
          console.log(
            '║     👻 PHANTOM PAIRING       ║'
          )
          console.log(
            '╠══════════════════════════════╣'
          )
          console.log(
            `║     🔑 CODE: ${code}       ║`
          )
          console.log(
            '╚══════════════════════════════╝'
          )
          console.log('')
          console.log(
            '📱 واتساب > الأجهزة المرتبطة'
          )
          console.log(
            '🔗 ربط جهاز > الربط برقم الهاتف'
          )
          console.log(
            '⌨️ أدخل الكود الظاهر فوق'
          )
          console.log('')

        } catch (err) {
        const errorCode = err?.serverCode ?? err?.cause?.serverCode
        if (errorCode === 429) {
          pairingBlockedUntil = Date.now() + 60 * 1000
          console.error('⏳ خطأ 429: إيقاف طلبات Pairing Code لمدة دقيقة واحدة.')
        }
        pairingRequested = false
        console.error('❌ فشل إنشاء Pairing Code:')
        console.error(err)
      }
      }

      if (connection === 'open') {
        console.log(
          '✅ PHANTOM متصل بواتساب!'
        )
      }

      if (connection === 'close') {
        const statusCode =
          lastDisconnect
            ?.error
            ?.output
            ?.statusCode

        const errorMessage =
          lastDisconnect
            ?.error
            ?.message ||
          lastDisconnect
            ?.error
            ?.output
            ?.payload
            ?.message ||
          ''

        console.log(
          '🔎 PHANTOM DISCONNECT DEBUG:',
          {
            statusCode,
            name:
              lastDisconnect
                ?.error
                ?.name,
            message:
              lastDisconnect
                ?.error
                ?.message,
            output:
              lastDisconnect
                ?.error
                ?.output,
            stack:
              lastDisconnect
                ?.error
                ?.stack
          }
        )

        const isRealLogout =
          statusCode ===
            DisconnectReason.loggedOut &&
          (
            errorMessage
              .toLowerCase()
              .includes('logged out') ||
            errorMessage
              .toLowerCase()
              .includes('device removed') ||
            errorMessage
              .toLowerCase()
              .includes(
                'connection failure'
              ) === false
          )

        if (isRealLogout) {
          console.log(
            '❌ جلسة PHANTOM اتعمل لها Logout فعلي.'
          )

          console.log(
            '🛑 مش هحذف session تلقائيًا.'
          )

          return
        }

        console.log(
          `⚠️ اتصال واتساب اتقفل (status: ${
            statusCode ?? 'unknown'
          })`
        )

        if (statusCode === 440) {
          console.log(
            '⚠️ WhatsApp أغلق جلسة الاتصال (440).'
          )

          console.log(
            '🔄 إعادة الاتصال بعد 5 ثواني...'
          )
        } else {
          console.log(
            '🔄 إعادة الاتصال بعد 5 ثواني...'
          )
        }

        setTimeout(() => {
          startPHANTOM().catch(
            err => {
              console.error(
                '❌ فشل إعادة الاتصال:',
                err
              )
            }
          )
        }, 5000)
      }
    }
  )

  sock.ev.on(
    'messages.update',
    updates => {
      if (!sock.__pingAckTimes) {
        sock.__pingAckTimes =
          new Map()
      }

      for (
        const { key, update }
        of updates
      ) {
        if (
          !key?.fromMe ||
          !key?.id
        ) {
          continue
        }

        const status =
          update?.status

        if (
          status !== undefined &&
          !sock.__pingAckTimes.has(
            key.id
          )
        ) {
          sock.__pingAckTimes.set(
            key.id,
            Date.now()
          )

          setTimeout(() => {
            sock.__pingAckTimes
              ?.delete(key.id)
          }, 30000)
        }
      }
    }
  )

  sock.ev.on(
    'messages.upsert',
    async ({ messages }) => {
      const msg = messages?.[0]

      if (!msg?.message) return

      // 🛡️ Prevent duplicate processing
      if (!sock.__processedMessages) {
        sock.__processedMessages =
          new Set()
      }

      const messageId =
        msg.key?.id

      if (messageId) {
        if (
          sock.__processedMessages
            .has(messageId)
        ) {
          return
        }

        sock.__processedMessages
          .add(messageId)

        setTimeout(() => {
          sock.__processedMessages
            ?.delete(messageId)
        }, 60000)
      }

      const jid =
        msg.key.remoteJid

      const text =
        msg.message.conversation ||
        msg.message
          .extendedTextMessage
          ?.text ||
        ''

      // 🔇 PHANTOM MUTE
      if (
        jid?.endsWith('@g.us') &&
        !msg.key?.fromMe
      ) {
        const sender =
          msg.key?.participant

        if (
          sender &&
          isMuted(jid, sender)
        ) {
          try {
            await sock.sendMessage(
              jid,
              {
                delete: msg.key
              }
            )
          } catch (err) {
            console.error(
              '❌ Mute Delete Error:',
              err
            )
          }

          return
        }
      }

      // 🛡️ PHANTOM AutoMod
      if (
        jid?.endsWith('@g.us') &&
        !msg.key?.fromMe &&
        text
      ) {
        const groupSettings =
          getSettings(jid)

        if (
          groupSettings.automod
        ) {
          const hasBadWord =
            hasAutomodWord(
              jid,
              text
            )

          const hasLink =
            /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/)/i
              .test(text)

          const blocked =
            hasBadWord ||
            (
              groupSettings.block_links &&
              hasLink
            )

          if (blocked) {
            try {
              await sock.sendMessage(
                jid,
                {
                  delete: msg.key
                }
              )

              await sock.sendMessage(
                jid,
                {
                  text: hasBadWord
                    ? `╭━━〔 🛡️ PHANTOM AUTOMOD 〕━━╮

┃
┃  🚫 تم حذف رسالة تحتوي على كلمة ممنوعة.
┃  ⚠️ التزم بقوانين المجموعة.
┃
╰━━〔 AUTOMOD SYSTEM 〕━━╯`
                    : `╭━━〔 🔗 PHANTOM LINK GUARD 〕━━╮

┃
┃  🚫 تم حذف الرابط.
┃  ⚠️ الروابط ممنوعة في هذه المجموعة.
┃
╰━━〔 LINK PROTECTION 〕━━╯`
                }
              )
            } catch (err) {
              console.error(
                '❌ AutoMod Delete Error:',
                err
              )
            }

            return
          }
        }
      }

      // 👻 PHANTOM Anti-Bot
      if (
        false &&
        jid?.endsWith('@g.us') &&
        !msg.key?.fromMe
      ) {
        const detection =
          detectAntiBot(msg)

        if (
          detection.status ===
          'UNKNOWN'
        ) {
          const sender =
            msg.key?.participant ||
            msg.key?.remoteJid ||
            ''

          try {
            await sendUnknownAlert({
              sock,
              jid,
              user: sender
            })
          } catch (err) {
            console.error(
              '❌ Anti-Bot Alert Error:',
              err
            )
          }
        }
      }

      if (
        await handleQuizAnswer({
          sock,
          jid,
          text,
          msg
        })
      ) {
        return
      }

      if (text.trim() === test.name) {
        try {
          await test.execute({
            sock,
            msg,
            jid,
            args: [],
            text,
            commandName: test.name
          })
        } catch (err) {
          console.error('❌ خطأ في أمر تست:', err)
        }
        return
      }

      if (
        !text.startsWith(
          settings.prefix
        )
      ) {
        return
      }

      const args = text
        .slice(
          settings.prefix.length
        )
        .trim()
        .split(/\s+/)

      const commandName =
        args.shift()?.toLowerCase()

      if (!commandName) return

      const sender =
        msg.key?.participant ||
        msg.key?.remoteJid ||
        ''

      // 👑 PHANTOM PRIVATE BLOCK
      if (
        commandName === 'بلوك_خاص' ||
        commandName === 'فك_بلوك'
      ) {
        const isAdmin =
          await requireAdmin(
            sock,
            jid,
            msg
          )

        if (!isAdmin) return

        const contextInfo =
          msg.message
            ?.extendedTextMessage
            ?.contextInfo ||
          msg.message
            ?.imageMessage
            ?.contextInfo ||
          msg.message
            ?.videoMessage
            ?.contextInfo ||
          msg.message
            ?.documentMessage
            ?.contextInfo ||
          {}

        const mentionedJid =
          contextInfo
            .mentionedJid?.[0] ||
          null

        if (!mentionedJid) {
          await sock.sendMessage(
            jid,
            {
              text: `╭━━━〔 ⚠️ PHANTOM 〕━━━╮

┃
┃  ❌ لازم تعمل منشن للشخص.
┃
┃  مثال:
┃  👉 !${commandName} @منشن
┃
╰━━〔 PHANTOM SYSTEM 〕━━╯`
            }
          )

          return
        }

        if (
          commandName ===
          'بلوك_خاص'
        ) {
          const added =
            addPrivateBlock(
              mentionedJid
            )

          await sock.sendMessage(
            jid,
            {
              text: added
                ? `╭━━━〔 🔒 PRIVATE BLOCK 〕━━━╮

┃
┃  🔒 تم حظر المستخدم من أوامر PHANTOM.
┃
┃  👤 @${mentionedJid.split('@')[0]}
┃
╰━━〔 PHANTOM SECURITY 〕━━━╯`
                : `╭━━━〔 ℹ️ PHANTOM 〕━━━╮

┃
┃  ℹ️ المستخدم عليه Private Block بالفعل.
┃
┃  👤 @${mentionedJid.split('@')[0]}
┃
╰━━〔 PHANTOM SECURITY 〕━━━╯`,
              mentions: [
                mentionedJid
              ]
            }
          )

          return
        }

        const removed =
          removePrivateBlock(
            mentionedJid
          )

        await sock.sendMessage(
          jid,
          {
            text: removed
              ? `╭━━━〔 🔓 PRIVATE UNBLOCK 〕━━━╮

┃
┃  🔓 تم فك الحظر عن المستخدم.
┃
┃  👤 @${mentionedJid.split('@')[0]}
┃
╰━━〔 PHANTOM SECURITY 〕━━━╯`
              : `╭━━━〔 ℹ️ PHANTOM 〕━━━╮

┃
┃  ℹ️ المستخدم مش عليه Private Block أصلًا.
┃
┃  👤 @${mentionedJid.split('@')[0]}
┃
╰━━〔 PHANTOM SECURITY 〕━━━╯`,
            mentions: [
              mentionedJid
            ]
          }
        )

        return
      }

      // 🔒 Private Block Check
      if (
        isPrivateBlocked(sender)
      ) {
        await sock.sendMessage(
          jid,
          {
            text: `╭━━━〔 🔒 PRIVATE BLOCK 〕━━━╮

┃
┃  ❌ أنت محظور من استخدام أوامر PHANTOM.
┃
┃  👑 فك الحظر يتم بواسطة الأدمن فقط.
┃
╰━━〔 PHANTOM SECURITY 〕━━━╯`
          }
        )

        return
      }

      const command =
        commands.get(commandName)

      console.log(
        `🧪 COMMAND DEBUG: ${commandName} | found=${!!command} | jid=${jid}`
      )

      const adminBypass =
        new Set([
          'ادارة',
          'قفل_امر',
          'فتح_امر',
          'فتح_الكل',
          'الاوامر_المقفولة'
        ])

      if (
        jid?.endsWith('@g.us') &&
        !adminBypass.has(
          commandName
        ) &&
        isCommandLocked(
          jid,
          commandName
        )
      ) {
        await sock.sendMessage(
          jid,
          {
            text: `╭━━━〔 🔒 PHANTOM LOCK 〕━━━╮

┃
┃  🔒 الأمر مقفول حاليًا
┃
┃  📌 الأمر:
┃  👉 !${commandName}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  ⚙️ تم قفل الأمر بواسطة
┃  🛡️ إعدادات الجروب
┃
╰━━〔 PHANTOM SECURITY 〕━━╯`
          }
        )

        return
      }

      if (
        jid?.endsWith('@g.us') &&
        commandName !== 'ادارة'
      ) {
        const groupSettings =
          getSettings(jid)

        if (
          !groupSettings.bot_chat
        ) {
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

        function levenshtein(
          a,
          b
        ) {
          const dp =
            Array.from(
              {
                length:
                  a.length + 1
              },
              () =>
                Array(
                  b.length + 1
                ).fill(0)
            )

          for (
            let i = 0;
            i <= a.length;
            i++
          ) {
            dp[i][0] = i
          }

          for (
            let j = 0;
            j <= b.length;
            j++
          ) {
            dp[0][j] = j
          }

          for (
            let i = 1;
            i <= a.length;
            i++
          ) {
            for (
              let j = 1;
              j <= b.length;
              j++
            ) {
              dp[i][j] =
                Math.min(
                  dp[i - 1][j] + 1,
                  dp[i][j - 1] + 1,
                  dp[i - 1][j - 1] +
                    (
                      a[i - 1] ===
                      b[j - 1]
                        ? 0
                        : 1
                    )
                )
            }
          }

          return dp[a.length][b.length]
        }

        const availableCommands =
          [...commands.keys()]

        let closest = null
        let closestDistance =
          Infinity

        for (
          const name
          of availableCommands
        ) {
          const distance =
            levenshtein(
              commandName,
              name
            )

          if (
            distance <
            closestDistance
          ) {
            closestDistance =
              distance

            closest = name
          }
        }

        const maxDistance =
          commandName.length <= 4
            ? 1
            : commandName.length <= 7
              ? 2
              : 3

        let text

        if (
          closest &&
          closestDistance <=
            maxDistance
        ) {
          text = `╭━━━〔 👻 PHANTOM 〕━━━╮

┃
┃  👋 عامل إيه يا ${mention} 😂🔥
┃
┃  ❌ الأمر مش موجود
┃  🔎 !${commandName}
┃
┣━━〔 💡 اقتراح 〕━━━━━━━━
┃
┃  👀 يمكن تقصد:
┃  👉 ${settings.prefix}${closest}
┃
┃  🔥 جرّبه كده!
┃
╰━━〔 PHANTOM SYSTEM 〕━━╯`
        } else {
          text = `╭━━━〔 👻 PHANTOM 〕━━━╮

┃
┃  👋 عامل إيه يا ${mention} 😂🔥
┃
┃  ❌ الأمر مش موجود
┃  🔎 ${settings.prefix}${commandName}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💡 اكتب !مساعدة
┃  👀 وشوف كل الأوامر المتاحة
┃
╰━━〔 PHANTOM SYSTEM 〕━━╯`
        }

        await sock.sendMessage(
          jid,
          {
            text,
            mentions:
              sender
                ? [sender]
                : []
          }
        )

        return
      }

      try {
        const result =
          await command.execute({
            sock,
            msg,
            jid,
            args,
            text,
            commandName
          })

        if (result?.text) {
          await sock.sendMessage(
            jid,
            {
              text: result.text,
              mentions:
                result.mentions ||
                []
            }
          )
        }

        if (result?.image) {
          await sock.sendMessage(
            jid,
            {
              image:
                result.image,
              caption:
                result.caption ||
                '',
              mentions:
                result.mentions ||
                []
            }
          )
        }

        if (result?.video) {
          await sock.sendMessage(
            jid,
            {
              video:
                result.video,
              caption:
                result.caption ||
                '',
              mentions:
                result.mentions ||
                []
            }
          )
        }
      } catch (err) {
        console.error(
          `❌ خطأ في الأمر ${commandName}:`,
          err
        )
      }
    }
  )
}

startPHANTOM().catch(console.error)
startSavedSubBots().catch(console.error)
