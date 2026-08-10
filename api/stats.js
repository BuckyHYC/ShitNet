import { readStats } from './_lib.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }

  try {
    res.status(200).json(await readStats())
  } catch {
    res.status(503).json({ error: 'stats unavailable' })
  }
}
