import { generateQuiz } from '../../lib/ai.js'
import {
  quizExists,
  saveQuiz
} from '../../database/quiz.js'
import {
  addBalance,
  getCurrencyName
} from '../../database/economy.js'

const activeQuizzes = new Map()

export default {
  name: 'لغز',

  async execute({ sock, jid }) {
    await sock.sendMessage(jid, {
      text: `╭━━━〔 🧩 PHANTOM QUIZ 〕━━━╮
┃
┃  🧠 جاري تجهيز فزورة جديدة...
┃  ⏳ لحظة بس!
┃
╰━━〔 PHANTOM GAMES 〕━━╯`
    })

    let quiz = null

    // نحاول كذا مرة لو Gemini رجّع فزورة موجودة
    for (let i = 0; i < 5; i++) {
      const generated = await generateQuiz()

      if (!quizExists(generated.question)) {
        quiz = generated
        break
      }
    }

    if (!quiz) {
      await sock.sendMessage(jid, {
        text: `╭━━━〔 ❌ PHANTOM QUIZ 〕━━━╮
┃
┃  ⚠️ مقدرتش أطلع فزورة جديدة
┃  دلوقتي.
┃
┃  🔄 جرّب الأمر تاني بعد شوية.
┃
╰━━〔 QUIZ SYSTEM 〕━━╯`
      })
      return
    }

    saveQuiz(quiz)

    activeQuizzes.set(jid, {
      question: quiz.question,
      answer: quiz.answer,
      userJid: null
    })

    const options = quiz.options
      .map((option, index) => `${index + 1}️⃣ ${option}`)
      .join('\n')

    await sock.sendMessage(jid, {
      text: `╭━━━〔 🧩 PHANTOM QUIZ 〕━━━╮
┃
┃  🧠 فزورة جديدة وصلت!
┃
┣━━〔 ❓ السؤال 〕━━━━━━━━
┃
┃  ${quiz.question}
┃
┣━━〔 🎯 الاختيارات 〕━━━━
┃
┃  ${options.replace(/\n/g, '\n┃  ')}
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💬 اكتب رقم الإجابة:
┃  1️⃣ أو 2️⃣ أو 3️⃣ أو 4️⃣
┃
╰━━〔 👻 PHANTOM GAMES 〕━━╯`
    })
  }
}

export async function handleQuizAnswer({ sock, jid, text, msg }) {
  const quiz = activeQuizzes.get(jid)

  if (!quiz) return false

  const answer = text.trim()
  const sender = msg?.key?.participant || jid
  quiz.userJid = sender

  const numbers = {
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3,
    '١': 0,
    '٢': 1,
    '٣': 2,
    '٤': 3
  }

  if (!(answer in numbers)) return false

  const selected = numbers[answer]

  activeQuizzes.delete(jid)

  if (selected === quiz.answer) {
    const reward = 100000

    // إجابة صحيحة = Hard
    // المكافأة تُضاف لصاحب الإجابة، وليس لأي شخص آخر.
    const sender = quiz.userJid

    if (sender) {
      addBalance(jid, sender, reward)
    }

    const currency = getCurrencyName(jid)

    await sock.sendMessage(jid, {
      text: `╭━━━〔 🏆 PHANTOM QUIZ 〕━━━╮
┃
┃  🎉 إجابة صحيحة!
┃
┃  🧠 دماغك اشتغلت صح 😎
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💰 المكافأة:
┃  +${reward.toLocaleString('en-US')} ${currency} 👁️
┃
╰━━〔 🏆 WINNER 〕━━╯`
    })
  } else {
    await sock.sendMessage(jid, {
      text: `╭━━━〔 ❌ PHANTOM QUIZ 〕━━━╮
┃
┃  ❌ إجابة غلط!
┃
┣━━〔 💡 الإجابة الصحيحة 〕━━
┃
┃  ${quiz.answer + 1}️⃣
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  🧩 مستني فزورة تانية؟
┃  👻 جرّب !لغز
┃
╰━━〔 PHANTOM GAMES 〕━━╯`
    })
  }

  return true
}
