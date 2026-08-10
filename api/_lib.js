import { kv } from '@vercel/kv'

export const STATS_KEY = 'shitnet:stats'
export const VOTERS_KEY = 'shitnet:voters'
export const PROJECTS = ['morontown', 'next_bad_idea', 'mystery_slot']

export function emptyStats() {
  return {
    likes: 0,
    dislikes: 0,
    projectClicks: {
      morontown: 0,
      next_bad_idea: 0,
      mystery_slot: 0,
    },
  }
}

function toCount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

export function normalizeStats(raw) {
  const stats = emptyStats()
  if (!raw || typeof raw !== 'object') {
    return stats
  }
  stats.likes = toCount(raw.likes)
  stats.dislikes = toCount(raw.dislikes)
  for (const project of PROJECTS) {
    stats.projectClicks[project] = toCount(raw[project])
  }
  return stats
}

export async function readStats() {
  const raw = await kv.hgetall(STATS_KEY)
  return normalizeStats(raw)
}
