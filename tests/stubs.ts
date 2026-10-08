import { Context, Service } from '@deepseek-ai/cordis'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'

/**
 * Stub seams for the quota monitor's Host tests.
 *
 * `sessionQuery` serves an in-memory corpus and `storageDomain` an in-memory
 * table, so a fold round exercises the real code path without touching disk.
 * Both are deliberately minimal: a test that needs more should state what it
 * needs rather than making the stubs grow toward the real services.
 */

/** One session the stub query serves. */
export interface StubSession {
  id: string
  events: SessionEvent[]
}

/** Records the stub domain keeps, so a test can assert what was persisted. */
export interface StubDomainState {
  records: Map<string, unknown>
  closed: boolean
}

/**
 * The URL a stub fetch was called with, for every form `fetch` accepts.
 * @param input - the first `fetch` argument.
 * @returns the request URL as text.
 */
export function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

/** The stub session-query service. */
export class StubSessionQuery extends Service {
  sessions: StubSession[] = []
  /** Session ids whose read must throw, driving the per-session failure path. */
  unreadable = new Set<string>()

  constructor(ctx: Context) {
    super(ctx, 'sessionQuery')
  }

  async listSessions(): Promise<Array<{ header: { id: SessionId } }>> {
    return this.sessions.map(session => ({ header: { id: session.id as SessionId } }))
  }

  async readSession(id: SessionId): Promise<{ events: readonly SessionEvent[] }> {
    if (this.unreadable.has(id)) throw new Error(`stub: session ${id} is unreadable`)
    const session = this.sessions.find(entry => entry.id === id)
    if (session === undefined) throw new Error(`stub: session ${id} does not exist`)
    return { events: session.events }
  }
}

/** The stub storage-domain facility. */
export class StubStorageDomain extends Service {
  readonly state: StubDomainState = { records: new Map(), closed: false }
  /** Set to make every `put` throw, driving the fail-soft persistence path. */
  failWrites = false

  constructor(ctx: Context) {
    super(ctx, 'storageDomain')
  }

  async open(): Promise<{ table(): unknown; close(): Promise<void> }> {
    const { state } = this
    const failing = () => this.failWrites
    const table = {
      entries: () => state.records.entries(),
      get: (key: string) => state.records.get(key),
      async put(key: string, value: unknown) {
        if (failing()) throw new Error('stub: storage is read-only')
        state.records.set(key, value)
      },
      async delete(key: string) {
        state.records.delete(key)
      },
    }
    return {
      table: () => table,
      async close() {
        state.closed = true
      },
    }
  }
}

/** Handles the tests use to drive the stubs. */
export interface StubSeams {
  sessionQuery: StubSessionQuery
  storageDomain: StubStorageDomain
}

/**
 * Install both stub seams on a context.
 * @param ctx - the test context.
 * @returns handles for driving the stubs.
 */
export function installStubSeams(ctx: Context): StubSeams {
  const sessionQuery = new StubSessionQuery(ctx)
  const storageDomain = new StubStorageDomain(ctx)
  return { sessionQuery, storageDomain }
}
