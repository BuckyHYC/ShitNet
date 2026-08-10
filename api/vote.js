import { getRedis, readStats, sendOptions, STATS_KEY } from './_lib.js'

const CHOICES = ['like', 'dislike', 'dislike_cancel']

function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }
  return JSON.parse(req.body || '{}')
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

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

  const { choice } = body
  if (!CHOICES.includes(choice)) {
    res.status(400).json({ error: 'invalid choice' })
    return
  }

  try {
    if (choice === 'dislike_cancel') {
      const value = await getRedis().hincrby(STATS_KEY, 'dislikes', -1)
      if (value < 0) {
        await getRedis().hset(STATS_KEY, 'dislikes', 0)
      }
    } else {
      const field = choice === 'dislike' ? 'dislikes' : 'likes'
      await getRedis().hincrby(STATS_KEY, field, 1)
    }
    res.status(200).json(await readStats())
  } catch {
    res.status(503).json({ error: 'vote unavailable' })
  }
}
