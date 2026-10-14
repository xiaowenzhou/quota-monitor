/** Persisted provider key metadata; secrets live only in the credential seam. */
import { z } from 'zod';
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain';
export const managedProvider = z.object({
    refs: z.array(z.string()),
    labels: z.record(z.string(), z.string()),
    activeRef: z.string().optional(),
    selectedRef: z.string().optional(),
    mode: z.enum(['manual', 'quota', 'jev']),
    jevRef: z.string().optional(),
});
export const keyDomainSpec = defineDomain({
    name: 'quota_keys', version: 1, invalidRecords: 'backup-and-skip', layout: 'per-record',
    tables: { providers: domainTable(managedProvider) },
});
//# sourceMappingURL=key-domain.js.map