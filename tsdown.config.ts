import { clientBundle } from '../../client/tsdown.client.ts'

// `hostPhase: true` puts the Node half (lib/index.js) in the Host pass, which
// is also where the root tsdown config runs the Typert generator:
// `lib/typert.host.js` and `lib/typert.remote-client.js` must exist before
// `tsc -b tsconfig.client.json` resolves the client half's
// `@deepseek-ai/dsh-extension-quota-monitor/remote` self-reference.
export default clientBundle(
  '@deepseek-ai/dsh-extension-quota-monitor',
  ['lib/types/index.js'],
  { hostPhase: true },
)
