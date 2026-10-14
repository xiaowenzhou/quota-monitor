/** Persisted provider key metadata; secrets live only in the credential seam. */
import { z } from 'zod';
export declare const managedProvider: z.ZodObject<{
    refs: z.ZodArray<z.ZodString>;
    labels: z.ZodRecord<z.ZodString, z.ZodString>;
    activeRef: z.ZodOptional<z.ZodString>;
    selectedRef: z.ZodOptional<z.ZodString>;
    mode: z.ZodEnum<{
        manual: "manual";
        quota: "quota";
        jev: "jev";
    }>;
    jevRef: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ManagedProvider = z.infer<typeof managedProvider>;
export declare const keyDomainSpec: {
    name: string;
    version: number;
    invalidRecords: "backup-and-skip";
    layout: "per-record";
    tables: {
        providers: import("@deepseek-ai/dsh-storage-domain").DomainTableSpec<string, {
            refs: string[];
            labels: Record<string, string>;
            mode: "manual" | "quota" | "jev";
            activeRef?: string | undefined;
            selectedRef?: string | undefined;
            jevRef?: string | undefined;
        }>;
    };
};
//# sourceMappingURL=key-domain.d.ts.map