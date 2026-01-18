/**
 * AAIA Session Manager
 * Manages isolated AAIA runtime sessions with FIAs and Mundos
 * 
 * @épica MCP-AAIA-SERVER-1.0.0
 * Follows pattern from PrologSessionManager
 */

import { l } from "../Logger";
import { 
    RunStateEnum, 
    IPercepto, 
    IEferencia, 
    IAAIAApp, 
    IFIAConfig,
    FIAParadigma 
} from "@alephscript/mcp-core-sdk";

// Re-export types from mcp-core-sdk for consumers
export { RunStateEnum, IPercepto, IEferencia, IAAIAApp, IFIAConfig, FIAParadigma };

// ============================================
// Demo apps for initial testing
// ============================================

const DEMO_APPS: Record<string, IAAIAApp> = {
    'demo-logica': {
        id: 'demo-logica',
        nombre: 'Demo Lógica',
        descripcion: 'FIA de paradigma lógico para pruebas',
        paradigmaPrincipal: 'logica',
        fias: [
            { nombre: 'LogicaFIA', paradigma: 'logica', clase: 'FIALogica' }
        ],
    },
    'demo-sbr': {
        id: 'demo-sbr',
        nombre: 'Demo SBR',
        descripcion: 'FIA de paradigma SBR (Sistema Basado en Reglas)',
        paradigmaPrincipal: 'sbr',
        fias: [
            { nombre: 'SBRFIA', paradigma: 'sbr', clase: 'FIASBR' }
        ],
    },
    'demo-situada': {
        id: 'demo-situada',
        nombre: 'Demo Situada',
        descripcion: 'FIA de paradigma situada para IoT',
        paradigmaPrincipal: 'situada',
        fias: [
            { nombre: 'SituadaFIA', paradigma: 'situada', clase: 'FIASituada' }
        ],
    },
};

// ============================================
// Internal session state (private types)
// ============================================

interface FIAState {
    index: number;
    nombre: string;
    paradigma: FIAParadigma;
    clase: string;
    runState: RunStateEnum;
}

interface MundoState {
    ciclo: number;
    modelo: Record<string, unknown>;
    ultimoPercepto?: IPercepto;
    ultimaEferencia?: IEferencia;
}

interface InternalAAIASession {
    id: string;
    appId: string;
    app: IAAIAApp;
    createdAt: Date;
    lastUsedAt: Date;
    mundoState: MundoState;
    fiasState: FIAState[];
}

// ============================================
// Public session types for MCP
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
    fias: FIAState[];
    mundo: MundoState;
}

// ============================================
// Session Manager
// ============================================

export class AAIASessionManager {
    private sessions: Map<string, InternalAAIASession> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;
    private readonly SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
    private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.startCleanupRoutine();
        l.info("AAIASessionManager initialized");
    }

    /**
     * Get available apps catalog
     */
    getAvailableApps(): IAAIAApp[] {
        return Object.values(DEMO_APPS);
    }

    /**
     * Create a new AAIA session with the specified app
     */
    async createSession(appId: string): Promise<AAIASessionDetail> {
        const app = DEMO_APPS[appId];
        if (!app) {
            throw new Error(`App not found: ${appId}. Available: ${Object.keys(DEMO_APPS).join(', ')}`);
        }

        const sessionId = `aaia_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        // Initialize FIA states
        const fiasState: FIAState[] = app.fias.map((fiaConfig, index) => ({
            index,
            nombre: fiaConfig.nombre,
            paradigma: fiaConfig.paradigma,
            clase: fiaConfig.clase,
            runState: RunStateEnum.STOP,
        }));

        // Initialize mundo state
        const mundoState: MundoState = {
            ciclo: 0,
            modelo: {},
        };

        const session: InternalAAIASession = {
            id: sessionId,
            appId,
            app,
            createdAt: new Date(),
            lastUsedAt: new Date(),
            mundoState,
            fiasState,
        };

        this.sessions.set(sessionId, session);
        l.info("Created AAIA session", { sessionId, appId, fiasCount: fiasState.length });

        return {
            sessionId,
            appId,
            appName: app.nombre,
            createdAt: session.createdAt.toISOString(),
            fias: fiasState,
            mundo: mundoState,
        };
    }

    /**
     * List all active sessions
     */
    listSessions(): AAIASessionInfo[] {
        const now = Date.now();
        return Array.from(this.sessions.values()).map((session) => {
            const ageMinutes = Math.floor((now - session.createdAt.getTime()) / 60000);
            return {
                sessionId: session.id,
                appId: session.appId,
                createdAt: session.createdAt.toISOString(),
                lastUsedAt: session.lastUsedAt.toISOString(),
                ageMinutes,
                fiasCount: session.fiasState.length,
                ciclo: session.mundoState.ciclo,
            };
        });
    }

    /**
     * Get FIAs for a session
     */
    getFIAs(sessionId: string): FIAState[] | null {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        session.lastUsedAt = new Date();
        return session.fiasState;
    }

    /**
     * Step a FIA (execute one reasoning cycle)
     */
    async stepFIA(sessionId: string, fiaIndex: number): Promise<{
        success: boolean;
        eferencia?: IEferencia;
        error?: string;
    }> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, error: `Session not found: ${sessionId}` };
        }

        const fia = session.fiasState[fiaIndex];
        if (!fia) {
            return { success: false, error: `FIA not found at index ${fiaIndex}` };
        }

        session.lastUsedAt = new Date();
        session.mundoState.ciclo++;
        
        // Simulate FIA step - in real implementation, this would call AAIAGallery runtime
        const eferencia: IEferencia = {
            tipo: 'estado',
            payload: {
                fiaIndex,
                nombre: fia.nombre,
                ciclo: session.mundoState.ciclo,
                simulated: true,
            },
            timestamp: new Date().toISOString(),
        };

        fia.runState = RunStateEnum.PLAY_STEP;
        session.mundoState.ultimaEferencia = eferencia;

        l.info("Stepped FIA", { 
            sessionId, 
            fiaIndex, 
            nombre: fia.nombre,
            ciclo: session.mundoState.ciclo,
        });

        return {
            success: true,
            eferencia,
        };
    }

    /**
     * Send a percepto to the mundo
     */
    async sendPercepto(sessionId: string, percepto: IPercepto): Promise<{
        success: boolean;
        processedBy?: number[];
        error?: string;
    }> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, error: `Session not found: ${sessionId}` };
        }

        session.lastUsedAt = new Date();
        session.mundoState.ultimoPercepto = percepto;
        session.mundoState.ciclo++;

        // Update mundo model with percepto payload
        session.mundoState.modelo = {
            ...session.mundoState.modelo,
            lastPercepto: percepto,
        };

        // Simulate all FIAs processing the percepto
        const processedBy = session.fiasState.map(fia => fia.index);

        l.info("Percepto sent to mundo", { 
            sessionId, 
            tipo: percepto.tipo, 
            processedBy,
            ciclo: session.mundoState.ciclo,
        });

        return {
            success: true,
            processedBy,
        };
    }

    /**
     * Query mundo state
     */
    queryMundo(sessionId: string): MundoState | null {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return null;
        }
        session.lastUsedAt = new Date();
        return session.mundoState;
    }

    /**
     * Set FIA run state
     */
    setFIAState(sessionId: string, fiaIndex: number, state: RunStateEnum): {
        success: boolean;
        previousState?: RunStateEnum;
        error?: string;
    } {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, error: `Session not found: ${sessionId}` };
        }

        const fia = session.fiasState[fiaIndex];
        if (!fia) {
            return { success: false, error: `FIA not found at index ${fiaIndex}` };
        }

        const previousState = fia.runState;
        fia.runState = state;
        session.lastUsedAt = new Date();

        l.info("FIA state changed", { sessionId, fiaIndex, previousState, newState: state });

        return { success: true, previousState };
    }

    /**
     * Destroy a session
     */
    destroySession(sessionId: string): boolean {
        const existed = this.sessions.has(sessionId);
        if (existed) {
            this.sessions.delete(sessionId);
            l.info("Destroyed AAIA session", { sessionId });
        }
        return existed;
    }

    /**
     * Cleanup expired sessions
     */
    private startCleanupRoutine(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [sessionId, session] of this.sessions.entries()) {
                if (now - session.lastUsedAt.getTime() > this.SESSION_TIMEOUT_MS) {
                    this.sessions.delete(sessionId);
                    l.info("Cleaned up expired AAIA session", { sessionId });
                }
            }
        }, this.CLEANUP_INTERVAL_MS);
    }

    /**
     * Stop cleanup routine
     */
    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
