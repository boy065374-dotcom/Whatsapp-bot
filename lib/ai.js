const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = 'openai/gpt-oss-20b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function groq(prompt, temperature = 0.8, maxTokens = 300) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY غير موجود')
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_completion_tokens: maxTokens
    }),
    signal: AbortSignal.timeout(10000)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content?.trim()

  if (!text) {
    throw new Error('Groq رجّع رد فاضي')
  }

  return text
}

export async function generateQuiz() {
  const text = await groq(
    `اعمل سؤال مسابقة عربي قصير وممتع.

الشروط:
- السؤال يكون واضح.
- 4 اختيارات.
- اختيار واحد صحيح فقط.
- ممنوع شرح طويل.
- أرجع JSON فقط بالشكل التالي:
{
  "question": "السؤال",
  "options": ["اختيار 1", "اختيار 2", "اختيار 3", "اختيار 4"],
  "answer": 0
}

answer هو رقم الاختيار الصحيح من 0 إلى 3.`,
    0.7,
    250
  )

  const clean = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const quiz = JSON.parse(clean)

  if (
    typeof quiz.question !== 'string' ||
    !Array.isArray(quiz.options) ||
    quiz.options.length !== 4 ||
    !Number.isInteger(quiz.answer) ||
    quiz.answer < 0 ||
    quiz.answer > 3
  ) {
    throw new Error('صيغة المسابقة غير صالحة')
  }

  return quiz
}

export async function generateJoke() {
  return await groq(
    `اعمل نكتة عربية مصرية قصيرة جدًا ومضحكة.

الشروط:
- باللهجة المصرية.
- سطر أو سطرين فقط.
- بدون مقدمات.
- بدون شرح.
- بدون إيموجيات كثيرة.
- تكون نكتة فعلًا وليست معلومة أو نصيحة.`,
    1.0,
    120
  )
}
