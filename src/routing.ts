/** Jev receives anonymous quota/health metadata only, never prompts or credentials. */
import { isRecord } from './parse.ts'
import type { QuotaRoutingConfig } from './config.ts'

export interface RouteCandidate {
  ref: string
  headroom: number
  resetAt?: string
}

/** An invalid, low-confidence or failed decision always leaves the local choice authoritative. */
export async function chooseWithJev(
  candidates: readonly RouteCandidate[], key: string, config: QuotaRoutingConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<string | undefined> {
  if (candidates.length < 2) return candidates[0]?.ref
  const choices = Object.fromEntries(candidates.map((item, i) => [`key_${i}`, {
    headroom: item.headroom, ...item.resetAt === undefined ? {} : { resetAt: item.resetAt },
  }]))
  try {
    const response = await fetchImpl('https://openrouter.ai/api/alpha/decisions', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(config.jevTimeoutMs),
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.jevModel, state: { candidates: choices }, questions: {
        route: { type: 'choice', instructions: 'Choose a healthy key with the most available quota. Consider earlier quota resets when headroom is similar.',
          criteria: Object.fromEntries(Object.keys(choices).map(id => [id, `Select candidate ${id} from state.candidates`])),
        },
      } }),
    })
    if (!response.ok) return undefined
    const body: unknown = await response.json()
    if (!isRecord(body) || !isRecord(body.answers) || !isRecord(body.answers.route)) return undefined
    const answer = body.answers.route
    if (typeof answer.confidence !== 'number' || !Number.isFinite(answer.confidence)
      || answer.confidence < config.jevMinConfidence || answer.confidence > 1) return undefined
    const index = Object.keys(choices).indexOf(String(answer.choice))
    return candidates[index]?.ref
  } catch { return undefined }
}
