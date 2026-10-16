export default {
  name: 'ping',

  async execute({ sock, jid }) {
    await sock.sendMessage(jid, {
      text: '_*sudo = Super User Do*_'
    })
  }
}
