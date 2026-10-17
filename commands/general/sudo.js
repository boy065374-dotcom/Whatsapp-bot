export default {
  name: 'me',

  async execute({ sock, jid }) {
    let metadata;

    try {
      metadata = await sock.groupMetadata(jid);
    } catch (err) {
      console.log('❌ groupMetadata error:', err.message);

      await sock.sendMessage(jid, {
        text: '⚠️ تعذر الحصول على معلومات الجروب حاليًا.'
      });

      return;
    }

    const normalize = value =>
      value?.split('@')[0]?.split(':')[0];

    const botId = normalize(sock.user?.id);
    const botLid = normalize(sock.user?.lid);

    const bot = metadata.participants.find(p =>
      normalize(p.id) === botId ||
      normalize(p.id) === botLid ||
      normalize(p.phoneNumber) === botId
    );

    const isAdmin =
      bot?.admin === 'admin' ||
      bot?.admin === 'superadmin';

    /*
    if (!isAdmin) {
      await sock.sendMessage(jid, {
        text: '⚠️ الأمر ده متاح لأدمن البوت فقط.'
      });

      return;
    }
    */

    // 1. رسالة البداية
    await sock.sendMessage(jid, {
      text: [
        '> لم تكن مجرد لحظة عابرة...',
        '> بل كان تغييراً ترك أثراً في المكان',
        '*حين حضر فانتوم سكت* *الضجيج،*',
        '*وتغيرت القواعد دون أن يُقال الكثير*',
        '',
        '> أثرٌ يُكتب ولا يُمحى،',
        '> وبصمةٌ تبقى حتى بعد انتهاء الحكاية 🩸'
      ].join('\n')
    });

    let announcement = false;
    let renamed = false;
    let descriptionUpdated = false;

    // 2. تفعيل وضع الأدمن فقط
    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      announcement = true;
    } catch (err) {
      console.log('❌ Group setting error:', err.message);
    }

    // 3. تغيير اسم الجروب
    try {
      await sock.groupUpdateSubject(jid, '𝓿𝓸𝓲𝓭, 𝓹𝓱𝓪𝓷𝓽𝓸𝓶𝓟  • ♧');
      renamed = true;
    } catch (err) {
      console.log('❌ Group rename error:', err.message);
    }

    // 4. تغيير وصف الجروب
    const description = `بيقولوا الضࢪب ف الميت حࢪام...<<

و انا الحرام مش هوايتي...<<

هنا الاكشن و الاثاࢪه...<<

هنا الـ... بعنوان جديد...<<

الـ...×الكل مستمࢪ...<<

شد حيلك ؏لشان ٱٱٱل جاي تقيل  ??

نهاية ٱٱٱطفال ٱٱٱل مجال علي ايدي  ??

ف البداية ٱٱحب اٱٱقول كلمه بتو؏ مجال 2026

فانتوم فوق اي يا ... ........ .. ....

شويه ؏ـيال علي الكيب ؏ـيل ؏ـبطه بيغيظه ^

أنت ٱٱٱلي بتحدد مࢪلنتنا ليك نࢪضيك آو نأزيك(☆)

عـمر الخيانة مكانت مبدأ بس هتبدأ  (☆هبدأ)

يا ابني هتحاول تخيب هيحصل فيك ..ـك

هتهرب هتتجاب

خلصت كلام شيل الاقلام ♥︎

برعاية https://whatsapp.com/channel/0029VbE2uN5DDmFZ0BOL9k2k`;

    try {
      await sock.groupUpdateDescription(jid, description);
      descriptionUpdated = true;
    } catch (err) {
      console.log('❌ Group description error:', err.message);
    }

    // 5. تقرير النتيجة
    const status = value => value ? 'Yes' : 'No';

    await sock.sendMessage(jid, {
      text: [
        '> مزروف Phantom',
        '',
        `🔓 Only Admin Can Send Messages: ${status(announcement)}`,
        `📝 Group renamed: ${status(renamed)}`,
        `📄 Group description updated: ${status(descriptionUpdated)}`,
        'Mazrof: No',
        'Changed Group Picture: No',
        '',
        '🐤 PHANTOM X MAFIA 555'
      ].join('\n')
    });
  }
};
