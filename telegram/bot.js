import dotenv from 'dotenv'
dotenv.config({ path: './telegram/.env' })

import { Bot } from 'node-telegram-bot-api'
import { run } from 'node-telegram-bot-api/node'

import {
  installSubBot,
  getSubBots,
  deleteSubBot,
  setSubBotPrefix
} from '../subbots/manager.js'

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  throw new Error('❌ TELEGRAM_BOT_TOKEN غير موجود في telegram/.env')
}

const bot = new Bot(token)

await bot.api.setMyCommands([
  {
    command: 'start',
    description: 'فتح القائمة الرئيسية'
  },
  {
    command: 'help',
    description: 'عرض المساعدة'
  },
  {
    command: 'bot',
    description: 'تنصيب SubBot'
  },
  {
    command: 'status',
    description: 'عرض حالة الـSubBots'
  }
])

const waitingForPhone = new Set()
const waitingForPrefix = new Map()

function mainMenu() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '📊 الحالة',
            callback_data: 'status'
          },
          {
            text: '🤖 تنصيب بوت آخر',
            callback_data: 'install'
          }
        ],
        [
          {
            text: '🗑️ حذف الجلسة',
            callback_data: 'delete'
          }
        ]
      ]
    }
  }
}

async function showInstallMenu(ctx) {
  await ctx.reply(
    '🤖 اختيار رقم التنصيب',
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📱 رقمي',
              callback_data: 'install_my_number'
            }
          ],
          [
            {
              text: '👻 رقم PHANTOM',
              callback_data: 'phantom_number'
            }
          ]
        ]
      }
    }
  )
}

async function startInstall(ctx, phone) {
  await ctx.reply(
    `⏳ جاري تنصيب الـSubBot...\n\n📱 الرقم: ${phone}`
  )

  const result = await installSubBot(
    phone,
    async ({ type }) => {
      if (type === 'connected') {
        await ctx.reply(
          `✅ تم توصيل الـSubBot بنجاح!\n\n📱 الرقم: ${phone}\n🟢 الحالة: Online`
        )
      }
    }
  )

  if (!result.ok) {
    let error = '❌ فشل تنصيب الـSubBot.'

    if (result.error === 'already_installed') {
      error = '⚠️ الرقم ده عنده SubBot متثبت بالفعل.'
    }

    if (result.error === 'already_running') {
      error = '⚠️ الـSubBot ده شغال بالفعل.'
    }

    await ctx.reply(error)
    return
  }

  await ctx.reply(
    `🔑 Pairing Code:\n\n${result.code}\n\n📱 افتح واتساب:\nالأجهزة المرتبطة\n→ ربط جهاز\n→ الربط برقم الهاتف\n\nوأدخل الكود الظاهر فوق.`
  )
}

function statusText() {
  const bots = getSubBots()

  if (!bots.length) {
    return `📊 PHANTOM Status

🤖 SubBots المتصلة: 0

لا توجد SubBots متصلة حاليًا.`
  }

  return `📊 PHANTOM Status

🤖 SubBots المتصلة: ${bots.length}

${bots
  .map((phone, i) => `${i + 1}. 🟢 ${phone}`)
  .join('\n')}`
}

bot.command('start', async (ctx) => {
  await ctx.reply(
    `👻 PHANTOM Bot Manager\n\nاختار من القائمة:`,
    mainMenu()
  )
})

bot.command('help', async (ctx) => {
  await ctx.reply(
    `📚 PHANTOM Help

/start
فتح القائمة الرئيسية.

/help
عرض المساعدة.

/bot
تنصيب SubBot.

/status
عرض حالة الـSubBots.`
  )
})

bot.command('bot', async (ctx) => {
  await showInstallMenu(ctx)
})

bot.command('status', async (ctx) => {
  await ctx.reply(statusText())
})

bot.on('callback_query', async (ctx) => {
  const query = ctx.callbackQuery
  const chatId = query.message?.chat.id

  await ctx.answerCallbackQuery()

  if (!chatId) {
    return
  }

  if (query.data === 'status') {
    await ctx.reply(statusText())
    return
  }

  if (query.data === 'install') {
    await showInstallMenu(ctx)
    return
  }

  if (query.data === 'install_my_number') {
    waitingForPhone.add(chatId)

    await ctx.reply(
      `📱 ابعت رقم واتساب اللي عايز تنصّب عليه الـSubBot.

مثال:
201xxxxxxxxx

⚠️ اكتب الرقم بصيغة دولية ومن غير +`
    )

    return
  }

  if (query.data === 'phantom_number') {
    await ctx.reply(
      `👻 رقم PHANTOM

📱 01090950141

ضيف الرقم ده للمجموعات اللي عايز البوت يشتغل فيها، بدون التنصيب على رقمك.`
    )

    return
  }

  if (query.data === 'delete') {
    const bots = getSubBots()

    if (!bots.length) {
      await ctx.reply(
        '🗑️ مفيش جلسات متصلة حاليًا للحذف.'
      )
      return
    }

    await ctx.reply(
      '🗑️ اختار الجلسة اللي عايز تحذفها:',
      {
        reply_markup: {
          inline_keyboard: bots.map((phone) => [
            {
              text: `🗑️ ${phone}`,
              callback_data: `delete:${phone}`
            }
          ])
        }
      }
    )

    return
  }

  if (query.data?.startsWith('delete:')) {
    const phone = query.data.slice('delete:'.length)

    const result = await deleteSubBot(phone)

    if (!result.ok) {
      await ctx.reply(
        '❌ مقدرتش أحذف الجلسة.'
      )
      return
    }

    await ctx.reply(
      `✅ تم حذف الجلسة بنجاح.

📱 الرقم: ${phone}
🔴 الحالة: Offline`
    )

    return
  }
})

bot.on('message', async (ctx) => {
  const chatId = ctx.chat.id
  const text = ctx.message.text?.trim()

  if (waitingForPrefix.has(chatId)) {
    if (!text || text.startsWith('/')) {
      return
    }

    const phone = waitingForPrefix.get(chatId)

    if (Array.from(text).length !== 1) {
      await ctx.reply(
        '❌ الـPrefix لازم يكون حرف أو رمز واحد فقط.\n\nمثال: #'
      )
      return
    }

    if (['!', '.', '،', ','].includes(text)) {
      await ctx.reply(
        '❌ الـPrefix ده ممنوع.\n\nالممنوع: ! . ، ,'
      )
      return
    }

    setSubBotPrefix(phone, text)
    waitingForPrefix.delete(chatId)

    await ctx.reply(
      `✅ تم حفظ الـPrefix بنجاح!\n\n` +
      `📱 الرقم: ${phone}\n` +
      `📌 Prefix: ${text}\n\n` +
      `🔥 أوامر الـSubBot على واتساب أصبحت مثل:\n` +
      `${text}ping\n` +
      `${text}مساعدة`
    )

    return
  }

  if (!waitingForPhone.has(chatId)) {
    return
  }

  if (!text || text.startsWith('/')) {
    return
  }

  waitingForPhone.delete(chatId)

  const phone = text.replace(/\D/g, '')

  if (!phone) {
    await ctx.reply('❌ الرقم غير صالح.')
    return
  }

  await startInstall(ctx, phone)
})

bot.catch((error) => {
  console.error(
    '❌ Telegram error:',
    error
  )
})

console.log(
  '🤖 PHANTOM Telegram Installer: ON'
)

run(bot)
