export default {
  name: 'edittest',

  async execute({ sock, jid }) {
    try {
      const sent = await sock.sendMessage(jid, {
        text: `╭━━━〔 🧪 PHANTOM EDIT TEST 〕━━━╮
┃
┃  ⏳ جاري اختبار تعديل الرسائل...
┃
┃  ⚡ الحالة : TESTING
┃
╰━━〔 PHANTOM SYSTEM 〕━━╯`
      })

      await new Promise(resolve => setTimeout(resolve, 3000))

      await sock.sendMessage(jid, {
        text: `╭━━━〔 🧪 PHANTOM EDIT TEST 〕━━━╮
┃
┃  ✅ تم تعديل الرسالة بنجاح!
┃
┃  🟢 الحالة : SUCCESS
┃  ⚡ Edit System : ONLINE
┃
╰━━〔 PHANTOM SYSTEM 〕━━╯`,
        edit: sent.key
      })

      console.log('✅ EDIT TEST: نجح')
    } catch (e) {
      console.log('❌ EDIT TEST: فشل:', e?.message || e)
    }
  }
}
