import {
  installSubBot,
  formatRemaining,
  explainError,
  normalizePhone
} from '../../subbots/manager.js'

function getSender(msg, jid) {
  return (
    msg?.key?.participant ||
    msg?.key?.remoteJid ||
    jid
  )
}

function getPhoneFromSender(sender) {
  if (!sender) return ''

  return normalizePhone(
    sender
      .replace('@s.whatsapp.net', '')
      .replace('@g.us', '')
  )
}

export default {
  name: 'تنصيب',

  async execute({ sock, jid, msg, args }) {
    const sender = getSender(msg, jid)

    let phone = normalizePhone(args?.[0])

    // لا نحول LID إلى رقم هاتف
    if (!phone && String(sender || '').endsWith('@s.whatsapp.net')) {
      phone = getPhoneFromSender(sender)
    }

    if (!phone) {
      return {
        text:
`❌ مش قادر أحدد رقم الهاتف.

استخدم:
!تنصيب 201xxxxxxxxx`
      }
    }

    const notify = async event => {
      if (event.type === 'success') {
        await sock.sendMessage(jid, {
          text:
`*⧗⟬〔 𝐏𝐇𝐀𝐍𝐓𝐎𝐌 ͝ 𝑺𝑼𝑪𝑪𝑬𝑺𝑺 〕⟭⧗*

*⌞ ✅ ⌝ تـم تـوصيل الـبوت الـفرعي بـنجاح!*

*👤 الـمستخدم:* @${phone}

*🤖 الـبوت:* PHANTOM SubBot

*📱 الرقم:* ${phone}

🚀 الجلسة محفوظة، والبوت الفرعي هيحاول يرجع يتصل تلقائيًا بعد إعادة التشغيل.`,
          mentions: [`${phone}@s.whatsapp.net`]
        })

        return
      }

      if (event.type === 'expired') {
        await sock.sendMessage(jid, {
          text:
`*‘ ⏰ EXPIRED ’*

انتهت صلاحية رمز التنصيب.

اطلب رمزًا جديدًا باستخدام:
!تنصيب`
        })

        return
      }

      if (event.type === 'error') {
        await sock.sendMessage(jid, {
          text:
`*⧗⟬〔 𝐏𝐇𝐀𝐍𝐓𝐎𝐌 ͝ 𝑬𝑹𝑹𝑶𝑹 〕⟭⧗*

❌ فشل اتصال البوت الفرعي.

السبب:
${explainError(event.error)}`
        })
      }
    }

    const result = await installSubBot({
      phone,
      ownerJid: sender,
      notify
    })

    if (!result.ok) {
      if (result.type === 'cooldown') {
        return {
          text:
`يرجى الانتظار [${formatRemaining(result.remaining)}] :❌:`
        }
      }

      if (result.type === 'pending') {
        return {
          text:
`*⧗⟬〔 𝐏𝐇𝐀𝐍𝐓𝐎𝐌 ͝ 𝑬𝑹𝑹𝑶𝑹 〕⟭⧗*

@${phone}، ⚠︎ جلسة معلقة.

استعمل رمز التنصيب الحالي أو انتظر انتهائه.`,
          mentions: [`${phone}@s.whatsapp.net`]
        }
      }

      if (result.type === 'already_connected') {
        return {
          text:
`✅ البوت الفرعي للرقم ${phone} متصل بالفعل.`
        }
      }

      if (result.type === 'already_installed') {
        return {
          text:
`⚠️ الرقم ${phone} عنده SubBot مثبت بالفعل.

لو الجلسة موجودة، البوت هيحاول تشغيلها تلقائيًا.`
        }
      }

      if (result.type === 'invalid_phone') {
        return {
          text:
`❌ رقم الهاتف غير صالح.

مثال:
!تنصيب 201xxxxxxxxx`
        }
      }

      return {
        text:
`*⧗⟬〔 𝐏𝐇𝐀𝐍𝐓𝐎𝐌 ͝ 𝑬𝑹𝑹𝑶𝑹 〕⟭⧗*

الخطأ:
${explainError(result.error)}`
      }
    }

    return {
      text:
`*𝐏𝐇𝐀𝐍𝐓𝐎𝐌 ͝ 𝑩𝑶𝑻 - 𝑪𝑶𝑫𝑬 𝑴𝑨𝑫𝑬 🍀*

« 🎚️ خـطـوات الـربـط »

➊⌬ ➜ افتح واتساب.
➋⌬ ➜ ادخل على النقاط الثلاث ⋮
➌⌬ ➜ اختر الأجهزة المرتبطة.
➍⌬ ➜ اختر الربط برقم الهاتف.
➎⌬ ➜ استخدم الكود التالي.

*🚫 نصيحة: لا تستخدم رقمك الأساسي.*

🔐 الكود:
*${result.code}*

⏰ صلاحية الرمز: دقيقتان.

📋 انسخ الكود كما هو ثم أدخله في واتساب.`
    }
  }
}

