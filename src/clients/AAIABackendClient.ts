/**
 * AAIABackendClient - HTTP client for accessing AAIA Backend REST API
 * 
 * This client is used by MCPAAIAServer to access AAIA Runtime
 * without creating MCP → Backend → MCP cycles.
 * 
 * Target Port: 8007
 * 
 * Types imported from @alephscript/mcp-core-sdk (DRY)
 * 
 * @épica MCP-AAIA-SERVER-1.0.0
 * @épica AAIA-BACKEND-1.0.0 (types unification)
 * @fecha 2026-01-18
 */

import { l } from '../Logger';

// ============================================
// Re-export types from mcp-core-sdk (Single Source of Truth)
// ============================================

export {
    // Core Enums
    RunStateEnum,
    FIAParadigma,
    // Core Interfaces
    IPercepto,
    IEferencia,
    IFIAInfo,
    IMundoState,
    // Session Types
    AAIASessionMeta,
    // API Response Types (AAIA-prefixed to avoid collision with Prolog types)
    AAIACreateSessionResponse,
    AAIAListSessionsResponse,
    AAIAGetSessionResponse,
    AAIADestroySessionResponse,
    AAIAListFIAsResponse,
    AAIAStepFIAResponse,
    AAIAGetFIAStateResponse,
    AAIASendPerceptoResponse,
    AAIAGetMundoStateResponse,
    AAIAQueryMundoResponse,
    AAIAListAppsResponse,
    AAIAErrorResponse,
} from '@alephscript/mcp-core-sdk';

import type {
    AAIACreateSessionResponse,
    AAIAListSessionsResponse,
    AAIAGetSessionResponse,
    AAIADestroySessionResponse,
    AAIAListFIAsResponse,
    AAIAStepFIAResponse,
    AAIAGetFIAStateResponse,
    AAIASendPerceptoResponse,
    AAIAGetMundoStateResponse,
    AAIAQueryMundoResponse,
    AAIAListAppsResponse,
    AAIAErrorResponse,
    IPercepto,
    RunStateEnum,
} from '@alephscript/mcp-core-sdk';

// ============================================
// Client Config
// ============================================

export interface AAIABackendClientConfig {
    baseUrl: string;
    timeout?: number;
}

// ============================================
// Client Implementation
// ============================================

export class AAIABackendClient {
    private baseUrl: string;
    private timeout: number;

    constructor(config: AAIABackendClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.timeout = config.timeout || 10000;
        l.i('[AAIABackendClient] Initialized', { baseUrl: this.baseUrl, timeout: this.timeout });
    }

    // ============================================
    // Session API
    // ============================================

    async listSessions(): Promise<AAIAListSessionsResponse> {
        return this.fetch<AAIAListSessionsResponse>('/sessions');
    }

    async getSession(sessionId: string): Promise<AAIAGetSessionResponse> {
        return this.fetch<AAIAGetSessionResponse>(`/sessions/${sessionId}`);
    }

    async createSession(appId: string): Promise<AAIACreateSessionResponse> {
        return this.fetch<AAIACreateSessionResponse>('/sessions', {
            method: 'POST',
            body: JSON.stringify({ appId }),
        });
    }

    async destroySession(sessionId: string): Promise<AAIADestroySessionResponse> {
        return this.fetch<AAIADestroySessionResponse>(`/sessions/${sessionId}`, { 
            method: 'DELETE' 
        });
    }

    // ============================================
    // FIA API
    // ============================================

    async listFIAs(sessionId: string): Promise<AAIAListFIAsResponse> {
        return this.fetch<AAIAListFIAsResponse>(`/sessions/${sessionId}/fias`);
    }

    async getFIA(sessionId: string, fiaIndex: number): Promise<AAIAGetFIAStateResponse> {
        return this.fetch<AAIAGetFIAStateResponse>(`/sessions/${sessionId}/fias/${fiaIndex}`);
    }

    async stepFIA(sessionId: string, fiaIndex: number): Promise<AAIAStepFIAResponse> {
        return this.fetch<AAIAStepFIAResponse>(`/sessions/${sessionId}/fias/${fiaIndex}/step`, {
            method: 'POST'
        });
    }

    async startFIA(sessionId: string, fiaIndex: number): Promise<AAIAGetFIAStateResponse> {
        return this.fetch<AAIAGetFIAStateResponse>(`/sessions/${sessionId}/fias/${fiaIndex}/start`, {
            method: 'POST'
        });
    }

    async stopFIA(sessionId: string, fiaIndex: number): Promise<AAIAGetFIAStateResponse> {
        return this.fetch<AAIAGetFIAStateResponse>(`/sessions/${sessionId}/fias/${fiaIndex}/stop`, {
            method: 'POST'
        });
    }

    async setFIAState(sessionId: string, fiaIndex: number, state: RunStateEnum): Promise<AAIAGetFIAStateResponse> {
        return this.fetch<AAIAGetFIAStateResponse>(`/sessions/${sessionId}/fias/${fiaIndex}/state`, {
            method: 'PUT',
            body: JSON.stringify({ state })
        });
    }

    // ============================================
    // Mundo API
    // ============================================

    async getMundoState(sessionId: string): Promise<AAIAGetMundoStateResponse> {
        return this.fetch<AAIAGetMundoStateResponse>(`/sessions/${sessionId}/mundo`);
    }

    async queryMundo(sessionId: string, query: string): Promise<AAIAQueryMundoResponse> {
        return this.fetch<AAIAQueryMundoResponse>(`/sessions/${sessionId}/mundo/query`, {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }

    // ============================================
    // Percepto API
    // ============================================

    async sendPercepto(sessionId: string, percepto: IPercepto): Promise<AAIASendPerceptoResponse> {
        return this.fetch<AAIASendPerceptoResponse>(`/sessions/${sessionId}/percepto`, {
            method: 'POST',
            body: JSON.stringify(percepto)
        });
    }

    // ============================================
    // Apps API
    // ============================================

    async listApps(): Promise<AAIAListAppsResponse> {
        return this.fetch<AAIAListAppsResponse>('/apps');
    }

    // ============================================
    // Private Helper
    // ============================================

    private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const method = options.method || 'GET';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            clearTimeout(timeoutId);

            l.d(`[AAIABackendClient] ${method} ${endpoint} -> ${response.status}`);

            if (!response.ok) {
                let errorData: AAIAErrorResponse = { error: response.statusText };
                try {
                    errorData = await response.json() as AAIAErrorResponse;
                } catch {
                    // ignore parse error
                }
                throw new AAIABackendError(response.status, errorData.message || errorData.error, url);
            }

            if (response.status === 204) {
                return { success: true } as T;
            }

            return await response.json() as T;
        } catch (error) {
            clearTimeout(timeoutId);
            
            l.e('[AAIABackendClient] fetch() error', {
                errorName: (error as Error).name,
                errorMessage: (error as Error).message,
                url,
                method
            });
            
            if (error instanceof AAIABackendError) {
                throw error;
            }

            if ((error as Error).name === 'AbortError') {
                throw new AAIABackendError(408, 'Request timeout', url);
            }

            throw new AAIABackendError(0, `Network error: ${(error as Error).message}`, url);
        }
    }
}

// ============================================
// Error Class
// ============================================

export class AAIABackendError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly url: string
    ) {
        super(`AAIABackend Error [${statusCode}]: ${message} (${url})`);
        this.name = 'AAIABackendError';
    }

    get isNetworkError(): boolean { return this.statusCode === 0; }
    get isTimeout(): boolean { return this.statusCode === 408; }
    get isNotFound(): boolean { return this.statusCode === 404; }
    get isServerError(): boolean { return this.statusCode >= 500; }
}

// ============================================
// Factory
// ============================================

export function createAAIABackendClient(baseUrl = 'http://localhost:8007/api'): AAIABackendClient {
    return new AAIABackendClient({ baseUrl });
}
