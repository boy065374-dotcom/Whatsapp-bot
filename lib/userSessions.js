import fs from 'fs'
import path from 'path'

const BASE_DIR = path.resolve('./USR_sessions')

export function ensureUserSession(userId) {
  const safeId = String(userId).replace(/[^0-9A-Za-z_-]/g, '_')
  const dir = path.join(BASE_DIR, safeId)

  fs.mkdirSync(dir, { recursive: true })

  return dir
}

export function userSessionPath(userId) {
  return ensureUserSession(userId)
}

export function listUserSessions() {
  if (!fs.existsSync(BASE_DIR)) return []

  return fs.readdirSync(BASE_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
}

export function removeUserSession(userId) {
  const dir = userSessionPath(userId)

  fs.rmSync(dir, {
    recursive: true,
    force: true
  })
}
