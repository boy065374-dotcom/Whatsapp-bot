const absurdReply = {
  name: 'عبث_رد',

  async execute({ args }) {
    if (args.join(' ') === 'عندنا مانكا') {
      return {
        text: 'هات حتة 🐤'
      }
    } else {
      return {
        text: 'ليه طب 🐤'
      }
    }
  }
}

export default absurdReply
