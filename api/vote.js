import { getRedis, readStats, STATS_KEY, VOTERS_KEY } from './_lib.js'

const VOTE_SCRIPT = `
local current = redis.call('hget', KEYS[1], ARGV[1])
local requested = ARGV[2]

local function readCount(field)
  return tonumber(redis.call('hget', KEYS[2], field) or '0')
end

local function writeCount(field, value)
  redis.call('hset', KEYS[2], field, value)
end

if requested == 'none' then
  if current then
    writeCount(current, readCount(current) - 1)
    redis.call('hdel', KEYS[1], ARGV[1])
  end
elseif current == requested then
  writeCount(requested, readCount(requested) - 1)
  redis.call('hdel', KEYS[1], ARGV[1])
else
  if current then
    writeCount(current, readCount(current) - 1)
  end
  writeCount(requested, readCount(requested) + 1)
  redis.call('hset', KEYS[1], ARGV[1], requested)
end

return 1
`

function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }
  return JSON.parse(req.body || '{}')
}

export default async function handler(req, res) {
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

  const { clientId, choice } = body
  if (typeof clientId !== 'string' || clientId.length < 1 || clientId.length > 128) {
    res.status(400).json({ error: 'invalid clientId' })
    return
  }

  let requested
  if (choice === 'like' || choice === 'dislike') {
    requested = choice
  } else if (choice === null || choice === undefined) {
    requested = 'none'
  } else {
    res.status(400).json({ error: 'invalid choice' })
    return
  }

  try {
    await getRedis().eval(
      VOTE_SCRIPT,
      [VOTERS_KEY, STATS_KEY],
      [clientId, requested],
    )
    res.status(200).json(await readStats())
  } catch {
    res.status(503).json({ error: 'vote unavailable' })
  }
}
