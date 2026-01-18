/**
 * AAIA Session Manager - Thin Client
 * 
 * Delegates to AAIA Backend (port 8007) as Source of Truth.
 * This MCP Server is a thin client that exposes MCP tools
 * but all logic lives in the Backend.
 * 
 * @épica MCP-AAIA-SERVER-1.0.0
 * @épica AAIA-BACKEND-1.0.0 (refactor)
 * @fecha 2026-01-18
 */

import { l } from "../Logger";
import { 
    createAAIABackendClient,
    AAIABackendClient,
    RunStateEnum, 
    IPercepto, 
    IEferencia, 
    IFIAInfo,
    IMundoState,
    FIAParadigma,
} from "../clients/AAIABackendClient";

// Re-export types for consumers
export { RunStateEnum, IPercepto, IEferencia, IFIAInfo, IMundoState, FIAParadigma };

// ============================================
// Public session types for MCP (compatible)
// ============================================

export interface AAIASessionInfo {
    sessionId: string;
    appId: string;
    createdAt: string;
    lastUsedAt: string;
    ageMinutes: number;
    fiasCount: number;
    ciclo: number;
}

export interface AAIASessionDetail {
    sessionId: string;
    appId: string;
    appName: string;
    createdAt: string;
    fias: IFIAInfo[];
    mundo: IMundoState;
}

export interface IAAIAApp {
    id: string;
    nombre: string;
    descripcion?: string;
    paradigmaPrincipal: FIAParadigma;
    fias: Array<{ nombre: string; paradigma: FIAParadigma; clase: string }>;
}

// ============================================
// Session Manager - Thin Client to Backend
// ============================================

export class AAIASessionManager {
    private client: AAIABackendClient;
    private backendUrl: string;

    constructor(backendUrl = 'http://localhost:8007/api') {
        this.backendUrl = backendUrl;
        this.client = createAAIABackendClient(backendUrl);
        l.i("AAIASessionManager initialized (thin client)", { backendUrl });
    }

    /**
     * Get available apps catalog from Backend
     */
    async getAvailableApps(): Promise<IAAIAApp[]> {
        try {
            const response = await this.client.listApps();
            return response.apps.map(app => ({
                id: app.id,
                nombre: app.nombre,
                descripcion: app.descripcion,
                paradigmaPrincipal: app.paradigmaPrincipal as FIAParadigma,
                fias: [], // Apps list doesn't include FIA details
            }));
        } catch (error) {
            l.e("Failed to get available apps", { error });
            throw error;
        }
    }

    /**
     * Create a new AAIA session
     */
    async createSession(appId: string): Promise<AAIASessionDetail> {
        l.i("Creating session via Backend", { appId });
        
        const response = await this.client.createSession(appId);
        
        if (!response.success) {
            throw new Error(response.error || `Failed to create session for app: ${appId}`);
        }

        // Get full session details
        const sessionDetail = await this.client.getSession(response.sessionId);
        
        return {
            sessionId: response.sessionId,
            appId,
            appName: sessionDetail.session.appId, // Use appId as name for now
            createdAt: sessionDetail.session.createdAt,
            fias: sessionDetail.fias,
            mundo: sessionDetail.mundo,
        };
    }

    /**
     * List all active sessions
     */
    async listSessions(): Promise<AAIASessionInfo[]> {
        const response = await this.client.listSessions();
        
        return response.sessions.map(session => ({
            sessionId: session.sessionId,
            appId: session.appId,
            createdAt: session.createdAt,
            lastUsedAt: session.lastUsedAt,
            ageMinutes: session.ageMinutes,
            fiasCount: session.fiasCount,
            ciclo: 0, // Ciclo is now in mundo.modelo
        }));
    }

    /**
     * Get FIAs for a session
     */
    async getFIAs(sessionId: string): Promise<IFIAInfo[] | null> {
        try {
            const response = await this.client.listFIAs(sessionId);
            return response.fias;
        } catch (error) {
            l.e("Failed to get FIAs", { sessionId, error });
            return null;
        }
    }

    /**
     * Step a FIA (execute one reasoning cycle)
     */
    async stepFIA(sessionId: string, fiaIndex: number): Promise<{
        success: boolean;
        eferencia?: IEferencia;
        error?: string;
    }> {
        try {
            const response = await this.client.stepFIA(sessionId, fiaIndex);
            
            return {
                success: response.success,
                eferencia: response.eferencia,
            };
        } catch (error) {
            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Send a percepto to the mundo
     */
    async sendPercepto(sessionId: string, percepto: IPercepto): Promise<{
        success: boolean;
        processedBy?: number[];
        error?: string;
    }> {
        try {
            const response = await this.client.sendPercepto(sessionId, percepto);
            
            return {
                success: response.success,
                processedBy: response.processedBy,
            };
        } catch (error) {
            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Query mundo state
     */
    async queryMundo(sessionId: string): Promise<IMundoState | null> {
        try {
            const response = await this.client.getMundoState(sessionId);
            return response.mundo;
        } catch (error) {
            l.e("Failed to query mundo", { sessionId, error });
            return null;
        }
    }

    /**
     * Set FIA run state
     */
    async setFIAState(sessionId: string, fiaIndex: number, state: RunStateEnum): Promise<{
        success: boolean;
        previousState?: RunStateEnum;
        error?: string;
    }> {
        try {
            let response;
            if (state === RunStateEnum.PLAY) {
                response = await this.client.startFIA(sessionId, fiaIndex);
            } else if (state === RunStateEnum.STOP) {
                response = await this.client.stopFIA(sessionId, fiaIndex);
            } else {
                // For other states, use start (Backend will handle appropriately)
                response = await this.client.startFIA(sessionId, fiaIndex);
            }

            return {
                success: response.success,
                previousState: response.state?.runState,
            };
        } catch (error) {
            return {
                success: false,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Destroy a session
     */
    async destroySession(sessionId: string): Promise<boolean> {
        try {
            const response = await this.client.destroySession(sessionId);
            return response.success;
        } catch (error) {
            l.e("Failed to destroy session", { sessionId, error });
            return false;
        }
    }

    /**
     * Stop cleanup routine (no-op for thin client)
     */
    stopCleanup(): void {
        // Backend handles cleanup
        l.d("Cleanup is handled by Backend");
    }
}
