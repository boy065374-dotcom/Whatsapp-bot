
const tasks = new Map()

const sos = {
  name: 'كتكوت',

  async execute({ jid, args, commandName }) {
    if (commandName === 'خلاص') {
      const timer = tasks.get(jid)

      if (!timer) {
        return { text: '🐤 مفيش كتاكيت شغالة هنا.' }
      }

      clearInterval(timer)
      tasks.delete(jid)

      return { text: '🐤 خلاص! الكتاكيت وقفت.' }
    }

    if (tasks.has(jid)) {
      return { text: '🐤 الكتاكيت شغالة بالفعل!' }
    }

    let count = 0

    const timer = setInterval(() => {
      count++

      console.log(`[${jid}] 🐤🐤🐤🐤🐤 (${count}/10)`)

      if (count >= 10) {
        clearInterval(timer)
        tasks.delete(jid)
        console.log(`[${jid}] خلصت الكتاكيت 🐤`)
      }
    }, 2000)

    tasks.set(jid, timer)

    return { text: '🐤 بدأ تأثير الكتاكيت! 10 مرات.' }
  }
}

export default sos

