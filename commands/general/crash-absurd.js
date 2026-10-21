
const activeGroups = new Map()

const names = [
  'انا رخم و عمك',
  'رخامة و رخاخمةةععععع',
  'بطيييخ 🍉',
  'كنتلوب 🍈',
  'بطاطسسسسس 🥔',
  '🐤🐤🐤🐤🐤',
  'الجروب تحت إدارة البطيخ',
  'ممنوع دخول البطاطس',
  'احنا مين وجبناكم هنا',
  'تم الاستيلاء بواسطة الخيار 🥒',
  'قسم الرخامة المركزي',
  'PHANTOM دخل المطبخ 💀',
  'يا جدعان حد يلم البطيخ',
  'جاري تحميل العقل... 0%',
  'هذا الجروب برعاية الكنتلوب',
  '🗿🗿🗿🗿🗿'
]

const delay = ms =>
  new Promise(resolve => setTimeout(resolve, ms))

export default {
  name: 'كراش_عبثي',

  async execute({ sock, jid, commandName }) {
    if (!jid?.endsWith('@g.us')) {
      return { text: '😂 الأمر ده للجروبات بس!' }
    }

    if (commandName === 'كراش_ايقاف') {
      const state = activeGroups.get(jid)

      if (!state) {
        return { text: '🤷 مفيش عبث شغال!' }
      }

      state.stopped = true
      return { text: '🛑 تم طلب إيقاف العبث!' }
    }

    if (activeGroups.has(jid)) {
      return { text: '😂 العبث شغال بالفعل!' }
    }

    const state = { stopped: false }
    activeGroups.set(jid, state)

    await sock.sendMessage(jid, {
      text: '🐤🍉 بدأ العبث! اكتب !كراش_ايقاف للإيقاف.'
    })

    ;(async () => {
      let previousName = ''

      try {
        while (!state.stopped) {
          let name

          do {
            name = names[Math.floor(Math.random() * names.length)]
          } while (names.length > 1 && name === previousName)

          await sock.groupUpdateSubject(jid, name)
          previousName = name

          if (!state.stopped) {
            await delay(2000)
          }
        }
      } catch (err) {
        console.error('❌ Crash Absurd Error:', err)

        await sock.sendMessage(jid, {
          text: '🛑 وقف العبث؛ واتساب رفض تغيير الاسم أو حصل خطأ.'
        }).catch(() => {})
      } finally {
        if (activeGroups.get(jid) === state) {
          activeGroups.delete(jid)
        }
      }
    })()
  }
}

