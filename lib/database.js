import fs from 'fs'

const file = './database/groups.json'

function load() {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '{}')
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function save(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

export function getGroup(jid) {
  const db = load()

  if (!db[jid]) {
    db[jid] = {
      prefix: '!',
      welcome: {
        enabled: false,
        message: 'أهلاً {user} 👋 نورت {group}!'
      },
      goodbye: {
        enabled: false,
        message: 'مع السلامة {user} 👋'
      },
      automod: {
        enabled: false,
        words: []
      },
      aiAutomod: false,
      muted: [],
      warnings: {},
      locked: false
    }

    save(db)
  }

  return db[jid]
}

export function updateGroup(jid, changes) {
  const db = load()

  db[jid] = {
    ...getGroup(jid),
    ...changes
  }

  save(db)
  return db[jid]
}
