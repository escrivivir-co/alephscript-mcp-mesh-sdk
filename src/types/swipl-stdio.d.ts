/**
 * Type declarations for swipl-stdio module
 * Minimal declarations to satisfy TypeScript
 */
declare module 'swipl-stdio' {
    export interface Query {
        next(): Promise<Record<string, unknown> | null>;
        close(): Promise<void>;
    }

    export class Engine {
        constructor();
        call(query: string): Promise<boolean>;
        createQuery(query: string): Promise<Query>;
        query(query: string): AsyncIterable<Record<string, unknown>>;
        close(): Promise<void>;
    }
}
