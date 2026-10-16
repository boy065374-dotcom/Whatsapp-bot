export default {
    name: 'تست',
    async execute({ sock, msg, jid }) {
        await sock.sendMessage(
            jid,
            { text: 'تست تست' },
            { quoted: msg }
        )
    }
}
