import {
  generateWAMessageFromContent,
  proto
} from '@oxidezap/baileyrs'

export default {
  name: 'ping',

  async execute({ sock, jid }) {
    if (!sock.__pingAckTimes) {
      sock.__pingAckTimes = new Map()
    }

    const start = Date.now()

    const sent = await sock.sendMessage(jid, {
      text: `╭━━━〔 👻 PHANTOM 〕━━━╮
┃
┃  🏓 PONG!
┃
┃  ⚡ الحالة : متصل
┃  📡 WhatsApp : ...ms
┃
╰━━〔 SYSTEM ONLINE 〕━━╯`
    })

    const messageId = sent?.key?.id

    if (!messageId) return

    let ackAt = null
    const deadline = Date.now() + 10000

    while (Date.now() < deadline) {
      ackAt = sock.__pingAckTimes.get(messageId)

      if (ackAt) break

      await new Promise(resolve => setTimeout(resolve, 10))
    }

    const latency = ackAt ? ackAt - start : null

    const edited = generateWAMessageFromContent(
      jid,
      {
        protocolMessage: {
          key: sent.key,
          type: proto.Message.ProtocolMessage.Type.MESSAGE_EDIT,
          editedMessage: {
            extendedTextMessage: {
              text: `╭━━━〔 👻 PHANTOM 〕━━━╮
┃
┃  🏓 PONG!
┃
┃  ⚡ الحالة : متصل
┃  📡 WhatsApp : ${latency === null ? 'Timeout' : `${latency}ms`}
┃
╰━━〔 SYSTEM ONLINE 〕━━╯`
            }
          },
          timestampMs: Date.now()
        }
      },
      {}
    )

    await sock.relayMessage(
      jid,
      edited.message,
      {
        messageId: edited.key.id
      }
    )

    sock.__pingAckTimes.delete(messageId)
  }
}
