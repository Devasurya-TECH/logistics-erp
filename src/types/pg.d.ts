declare module 'pg' {
    export class Pool {
        constructor(config?: Record<string, unknown>);
        query(queryText: string, values?: unknown[]): Promise<{
            rowCount: number;
            rows: any[];
        }>;
        end(): Promise<void>;
    }
}
