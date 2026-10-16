import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import pino from 'pino'
import { handlePhantomMessage } from '../lib/phantomMessageHandler.js'

import makeWASocket, {
  useMultiFileAuthState,
  Browsers,
  fetchLatestWaWebVersion
} from '@oxidezap/baileyrs'

const ROOT = './subbots/sessions'

fs.mkdirSync(ROOT, { recursive: true })

const sockets = new Map()

const PREFIX_FILE = './subbots/prefixes.json'

function loadPrefixes() {
  try {
    if (!fs.existsSync(PREFIX_FILE)) return {}
    return JSON.parse(fs.readFileSync(PREFIX_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function savePrefixes(data) {
  fs.mkdirSync(path.dirname(PREFIX_FILE), { recursive: true })
  fs.writeFileSync(PREFIX_FILE, JSON.stringify(data, null, 2))
}

const prefixes = loadPrefixes()

export function getSubBotPrefix(phone) {
  phone = normalizePhone(phone)
  return prefixes[phone] || '!'
}

export function setSubBotPrefix(phone, prefix) {
  phone = normalizePhone(phone)
  prefixes[phone] = prefix
  savePrefixes(prefixes)

  const sock = sockets.get(phone)
  if (sock) {
    sock.__phantomPrefix = prefix
  }

  return prefix
}

export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function getSessionDir(phone) {
  return path.join(ROOT, normalizePhone(phone))
}

export function formatRemaining(ms) {
  const seconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000))

  if (seconds < 60) {
    return `${seconds} ثانية`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return remainingSeconds
    ? `${minutes} دقيقة و ${remainingSeconds} ثانية`
    : `${minutes} دقيقة`
  }

export function explainError(error) {
  if (!error) return 'خطأ غير معروف.'

  if (typeof error === 'string') {
    return error
  }

  return (
    error?.message ||
    error?.data?.message ||
    error?.output?.payload?.message ||
    String(error)
  )
}

export async function installSubBot(input, notify = () => {}) {
  console.log('🚀 SUBBOT INSTALL FUNCTION STARTED')

  let phone
  let ownerJid

  if (typeof input === 'object' && input !== null) {
    phone = input.phone
    ownerJid = input.ownerJid

    if (typeof input.notify === 'function') {
      notify = input.notify
    }
  } else {
    phone = input
  }

  phone = normalizePhone(phone)

  if (!phone) {
    return {
      ok: false,
      type: 'invalid_phone',
      error: 'invalid_phone'
    }
  }

  if (sockets.has(phone)) {
    return {
      ok: false,
      type: 'already_connected',
      error: 'already_running'
    }
  }

  const sessionDir = getSessionDir(phone)

  fs.mkdirSync(sessionDir, { recursive: true })

  const { state, saveCreds } =
    await useMultiFileAuthState(sessionDir)

  if (state.creds.registered) {
    return {
      ok: false,
      type: 'already_installed',
      error: 'already_installed',
      phone
    }
  }

  let version

  try {
    const latest = await fetchLatestWaWebVersion()

    version = latest.version

    console.log(
      `🌐 SubBot WhatsApp Web: ${version.join('.')}`
    )
  } catch (error) {
    console.log(
      '⚠️ Failed to fetch WhatsApp Web version:',
      explainError(error)
    )
  }

  console.log(`🔌 SUBBOT CREATING SOCKET | phone=${phone}`)

  const sock = makeWASocket({

    auth: state,

    ...(version ? { version } : {}),

    logger: pino({
      level: 'silent'
    }),

    printQRInTerminal: false,

    browser: Browsers.ubuntu('Chrome'),

    markOnlineOnConnect: false,

    connectTimeoutMs: 60000,

    defaultQueryTimeoutMs: 60000,

    keepAliveIntervalMs: 25000,

    syncFullHistory: false
  })

  console.log(`✅ SUBBOT SOCKET CREATED | phone=${phone}`)

  sock.__phantomPrefix = getSubBotPrefix(phone)

  console.log(
    `📌 SUBBOT PREFIX | phone=${phone} | prefix=${sock.__phantomPrefix}`
  )

  sockets.set(phone, sock)

  sock.ev.on(
    'creds.update',
    saveCreds
  )

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(
      `📨 SUBBOT EVENT | phone=${phone} | type=${type} | count=${messages?.length || 0}`
    )

    for (const msg of messages || []) {
      if (!msg?.message) continue

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        ''

      console.log(
        `💬 SUBBOT MESSAGE | ${text || '[media/non-text]'} | fromMe=${msg.key?.fromMe}`
      )

      try {
        await handlePhantomMessage({
          sock,
          msg
        })
      } catch (error) {
        console.error(
          `❌ SUBBOT HANDLER ERROR: ${explainError(error)}`
        )
      }
    }
  })

  sock.ev.on(
    'connection.update',
    async ({
      connection,
      lastDisconnect
    }) => {

      if (connection === 'open') {

        console.log(
          `✅ SubBot connected: ${phone}`
        )

        try {
          await notify({
            type: 'connected',
            phone
          })

          await notify({
            type: 'success',
            phone
          })
        } catch (error) {
          console.error(
            '❌ Notify error:',
            explainError(error)
          )
        }
      }

      if (connection === 'close') {

        const error =
          lastDisconnect?.error

        console.log(
          `⚠️ SubBot disconnected: ${phone}`,
          explainError(error)
        )

        sockets.delete(phone)

        try {
          await notify({
            type: 'error',
            phone,
            error
          })
        } catch {}
      }
    }
  )

  await new Promise(resolve =>
    setTimeout(resolve, 1500)
  )

  try {

    const code =
      await sock.requestPairingCode(phone)

    return {
      ok: true,
      phone,
      code
    }

  } catch (error) {

    sockets.delete(phone)

    try {
      sock.ws?.close?.()
    } catch {}

    try {
      await notify({
        type: 'error',
        phone,
        error
      })
    } catch {}

    return {
      ok: false,
      type: 'pairing_failed',
      error: 'pairing_failed',
      details: explainError(error)
    }
  }
}


export async function startSavedSubBots() {
  const phones = getSavedSubBots()

  if (!phones.length) {
    console.log('📂 No saved SubBots found.')
    return
  }

  console.log(`🚀 Starting ${phones.length} saved SubBot(s)...`)

  for (const phone of phones) {
    if (sockets.has(phone)) continue

    const sessionDir = getSessionDir(phone)

    try {
      const { state, saveCreds } =
        await useMultiFileAuthState(sessionDir)

      if (!state.creds.registered) {
        console.log(`⚠️ SubBot session is not registered: ${phone}`)
        continue
      }

      let version

      try {
        const latest = await fetchLatestWaWebVersion()
        version = latest.version

        console.log(
          `🌐 SubBot WhatsApp Web: ${version.join('.')}`
        )
      } catch (error) {
        console.log(
          `⚠️ Failed to fetch WA version for ${phone}:`,
          explainError(error)
        )
      }

      console.log(`🔌 SUBBOT RESTORE SOCKET | phone=${phone}`)

      const sock = makeWASocket({
        auth: state,
        ...(version ? { version } : {}),
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        markOnlineOnConnect: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        syncFullHistory: false
      })

      sock.__phantomPrefix = getSubBotPrefix(phone)

      sockets.set(phone, sock)

      sock.ev.on('creds.update', saveCreds)

      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        console.log(
          `📨 SUBBOT EVENT | phone=${phone} | type=${type} | count=${messages?.length || 0}`
        )

        for (const msg of messages || []) {
          if (!msg?.message) continue

          try {
            await handlePhantomMessage({
              sock,
              msg
            })
          } catch (error) {
            console.error(
              `❌ SUBBOT HANDLER ERROR: ${explainError(error)}`
            )
          }
        }
      })

      sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
          console.log(`✅ Saved SubBot connected: ${phone}`)
        }

        if (connection === 'close') {
          const error = lastDisconnect?.error

          console.log(
            `⚠️ Saved SubBot disconnected: ${phone}`,
            explainError(error)
          )

          sockets.delete(phone)
        }
      })

    } catch (error) {
      console.error(
        `❌ Failed to restore SubBot ${phone}:`,
        explainError(error)
      )

      sockets.delete(phone)
    }
  }
}

export function getSubBot(phone) {
  return sockets.get(
    normalizePhone(phone)
  )
}

export function getSubBots() {
  return [...sockets.keys()]
}

export function getSavedSubBots() {
  if (!fs.existsSync(ROOT)) {
    return []
  }

  return fs
    .readdirSync(ROOT, {
      withFileTypes: true
    })
    .filter(entry =>
      entry.isDirectory()
    )
    .map(entry =>
      normalizePhone(entry.name)
    )
    .filter(Boolean)
}

export async function deleteSubBot(phone) {

  phone = normalizePhone(phone)

  const sock =
    sockets.get(phone)

  if (sock) {

    try {
      sock.ws?.close?.()
    } catch {}

    sockets.delete(phone)
  }

  const sessionDir =
    getSessionDir(phone)

  if (!fs.existsSync(sessionDir)) {

    return {
      ok: false,
      error: 'session_not_found'
    }
  }

  try {

    fs.rmSync(
      sessionDir,
      {
        recursive: true,
        force: true
      }
    )

    return {
      ok: true,
      phone
    }

  } catch (error) {

    return {
      ok: false,
      error: 'delete_failed',
      details: explainError(error)
    }
  }
}
