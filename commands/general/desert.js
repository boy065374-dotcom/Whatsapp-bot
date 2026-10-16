const desert = {
  name: 'Desert',

  async execute({ args }) {
    if (!args[0]) {
      return {
        text:
`╭━━━〔 🏜️ DESERT 〕━━━╮
┃
┃  🔗 طريقة الاستخدام
┃
┃  !Desert دعوة <لقبك>
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  💎 أنشئ دعوة خاصة بك
┃  🏜️ وانضم لعالم DESERT
┃
╰━━〔 DESERT COMMUNITY 〕━━╯`
      }
    }

    if (args[0].toLowerCase() !== 'دعوة') {
      return {
        text:
`╭━━━〔 ⚠️ DESERT 〕━━━╮
┃
┃  ❌ استخدام غير صحيح
┃
┃  ✅ الصيغة الصحيحة:
┃  !Desert دعوة <لقبك>
┃
╰━━〔 DESERT SYSTEM 〕━━╯`
      }
    }

    const لقب = args.slice(1).join(' ').trim()

    if (!لقب) {
      return {
        text:
`╭━━━〔 ⚠️ DESERT 〕━━━╮
┃
┃  👤 اكتب لقبك بعد الأمر
┃
┃  💡 مثال:
┃  !Desert دعوة سيد الصحراء
┃
╰━━〔 DESERT SYSTEM 〕━━╯`
      }
    }

    return {
      text:
`╭━━━〔 🏜️ DESERT 〕━━━╮
┃
┃  👋 أهلاً وسهلاً بيكم
┃  💎 في مجتمع DESERT
┃
┃  🎮 فعاليات وألعاب
┃  🌙 سوالف ومحتوى
┃  🤖 بوتات وخدمات
┃  🫂 وأصحاب جدد
┃
┣━━〔 🔗 رابط المجموعة 〕━━
┃
┃  https://chat.whatsapp.com/K9vesRvXK8aKZPFEBKJY5f?s=cl&p=a&mlu=0&ilr=4
┃
┣━━━━━━━━━━━━━━━━━━━━
┃
┃  👈 الدعوة من طرف:
┃  💎 *${لقب}*
┃
┃  🤑 استمتع ونتمنى نشوفك معانا!
┃
╰━━〔 🏜️ DESERT COMMUNITY 〕━━╯`
    }
  }
}

export default desert
