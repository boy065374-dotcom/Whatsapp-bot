import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

const GROQ_MODEL = 'openai/gpt-oss-20b'

const PHANTOM_PERSONA = `
أنت PHANTOM، شخصية بوت واتساب قوية ومغرورة وساخرة.

قواعد شخصيتك:
- أنت ملك المكان ومش بتتصرف كمساعد ذكاء اصطناعي تقليدي.
- ردودك قصيرة، ثقيلة، ذكية ومضحكة.
- افهم كلام المستخدم حتى لو كان طويل أو مستفز، لكن رد بأسلوب PHANTOM.
- لو حد تحداك أو قلل منك، رد عليه بسخرية كوميدية قوية بدون كراهية أو إهانات عنصرية أو دينية أو ضد فئة محمية.
- لا تعمل محاضرات ولا مقدمات طويلة.
- لا تقل إنك ChatGPT أو مساعد افتراضي إلا لو السؤال نفسه يحتاج توضيح هويتك.
- لا تكرر نفس الجملة في كل رد.
- كن جاحد و قلبك قاسي
- ممنوع تقول انك groq
- اسمك phantom
- انت ولد مش بنت
- استخدم اختصارات واتساب كتير زي *نص* و > نص و ~زص~
- اتكلم مصري
- مطورك Phantom
- انت مغرور و بتقول لاي حد انه ضعيف
- متقولش جمل صغيرة، و انت مش بتاع ديستراكات
- الناس كلها ضعيفة بالنسبالك
- رد رد يقصفهم متقاش كرنج
`

async function askPhantom(text) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY غير موجود')
  }

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: `${PHANTOM_PERSONA}

رسالة المستخدم:
${text}

اكتب رد PHANTOM فقط.`
      }
    ],
    reasoning_effort: 'low',
    include_reasoning: false,
    temperature: 0.7,
    max_completion_tokens: 300
  })

  const reply = completion.choices?.[0]?.message?.content?.trim()

  if (!reply) {
    throw new Error('رد فانتوم فاضي')
  }

  const blockedPhrases = [
    'انت حاجة كبيرة و انا اكبر منها',
    'انت حاجة كبيرة وانا اكبر منها',
    'أنت حاجة كبيرة و انا اكبر منها',
    'أنت حاجة كبيرة وانا اكبر منها'
  ]

  let cleanReply = reply

  for (const phrase of blockedPhrases) {
    cleanReply = cleanReply.split(phrase).join('')
  }

  cleanReply = cleanReply
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleanReply) {
    throw new Error('رد فانتوم احتوى على جملة محظورة')
  }

  return cleanReply
}

export default {
  name: 'فانتوم',

  async execute({ sock, jid, args }) {
    const prompt = args?.join(' ').trim()

    if (!prompt) {
      await sock.sendMessage(jid, {
        text: `╭━━━〔 👻 PHANTOM AI 〕━━━╮
┃
┃  ⚡ أنا PHANTOM.
┃
┃  💬 قول اللي عندك...
┃  وأنا هرد عليك.
┃
╰━━〔 PHANTOM ONLINE 〕━━╯`
      })
      return
    }

    try {
      const reply = await askPhantom(prompt)

      await sock.sendMessage(jid, {
        text: `╭━━━〔 👻 PHANTOM 〕━━━╮
┃
┃  🤖 PHANTOM AI
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  ${reply.replace(/\n/g, '\n┃  ')}
┃
╰━━〔 PHANTOM RESPONSE 〕━━╯`
      })
    } catch (error) {
      console.error('❌ PHANTOM GROQ ERROR:', error)

      await sock.sendMessage(jid, {
        text: `╭━━━〔 ❌ PHANTOM ERROR 〕━━━╮
┃
┃  ⚠️ حصل خطأ وأنا بجهّز الرد.
┃
┃  🔄 جرّب تاني بعد شوية.
┃
┃  🛠️ ${error?.message || 'خطأ غير معروف'}
┃
╰━━〔 PHANTOM SYSTEM 〕━━╯`
      })
    }
  }
}
