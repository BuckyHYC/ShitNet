import { getRedis, PROJECTS, readStats, sendOptions, STATS_KEY } from './_lib.js'

function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }
  return JSON.parse(req.body || '{}')
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    sendOptions(res)
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }

  let body
  try {
    body = parseBody(req)
  } catch {
    res.status(400).json({ error: 'invalid json body' })
    return
  }

  const { project } = body
  if (!PROJECTS.includes(project)) {
    res.status(400).json({ error: 'invalid project' })
    return
  }

  try {
    await getRedis().hincrby(STATS_KEY, project, 1)
    res.status(200).json(await readStats())
  } catch {
    res.status(503).json({ error: 'click unavailable' })
  }
}
