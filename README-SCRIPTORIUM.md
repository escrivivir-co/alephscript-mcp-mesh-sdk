# mcp-mesh-sdk — Integración con ALEPH Scriptorium

> **Submódulo**: mcp-mesh-sdk  
> **Padre directo**: MCPGallery  
> **Rama de integración**: `integration/beta/scriptorium`  
> **Fecha**: 2025-12-30

---

## 🎯 Propósito

Este submódulo contiene la **mesh de servidores MCP** que exponen herramientas invocables desde VS Code Copilot Chat.

Cada servidor hereda de `BaseMCPServer` (mcp-core-sdk) y se registra en `.vscode/mcp.json`.

---

## 🗺️ Servidores MCP Disponibles

| Servidor | Puerto | Script | Descripción |
|----------|--------|--------|-------------|
| **DevOpsServer** | 3003 | `npm start` | Servidor principal de DevOps (default) |
| **MCPLauncherServer** | 3050 | `npm run start:launcher` | Orquestador que puede lanzar otros servidores |
| **MCPWikiBrowserServer** | 3002 | `npm run start:wiki` | Navegador de Wikipedia |
| **MCPStateMachineServer** | 3004 | `npm run start:state` | Máquina de estados X+1 |
| **MCPPrologServer** | 3006 | `npm run start:prolog` | Motor de inferencia Prolog (requiere SWI-Prolog) |

---

## 📦 Dependencias del Sistema

Algunos servidores requieren software adicional instalado en el sistema operativo.

### SWI-Prolog (requerido para MCPPrologServer)

El servidor Prolog utiliza `swipl-stdio` que requiere **SWI-Prolog** instalado y accesible en el PATH.

#### Windows

```powershell
# Opción 1: winget (recomendado)
winget install SWI-Prolog.SWI-Prolog

# Opción 2: Descargar instalador
# https://www.swi-prolog.org/download/stable/bin/

# Verificar instalación
where swipl
# Debería mostrar: C:\Program Files\swipl\bin\swipl.exe
```

**Nota para Git Bash/MINGW64**: Añadir al PATH manualmente:
```bash
export PATH="$PATH:/c/Program Files/swipl/bin"
```

Para hacerlo permanente, añadir la línea anterior a `~/.bashrc` o `~/.bash_profile`.

#### macOS

```bash
# Homebrew
brew install swi-prolog

# Verificar
which swipl
```

#### Linux (Debian/Ubuntu)

```bash
# APT
sudo apt-get update
sudo apt-get install swi-prolog

# Verificar
which swipl
```

#### Linux (Fedora/RHEL)

```bash
sudo dnf install pl
# o
sudo yum install pl
```

#### Docker

Si prefieres no instalar SWI-Prolog globalmente:

```bash
# Imagen oficial
docker run -it swipl/swipl:stable swipl --version
```

### Verificación de Dependencias

Script para verificar todas las dependencias del sistema:

```bash
# Desde MCPGallery/mcp-mesh-sdk/
echo "=== Verificando dependencias del sistema ==="
echo -n "Node.js: " && node --version
echo -n "npm: " && npm --version
echo -n "SWI-Prolog: " && (swipl --version 2>/dev/null || echo "NO INSTALADO")
echo "============================================="
```

### Tabla de Dependencias por Servidor

| Servidor | Node.js | SWI-Prolog | Notas |
|----------|---------|------------|-------|
| DevOpsServer | ✅ | ❌ | — |
| MCPLauncherServer | ✅ | ❌ | — |
| MCPWikiBrowserServer | ✅ | ❌ | — |
| MCPStateMachineServer | ✅ | ❌ | — |
| **MCPPrologServer** | ✅ | ✅ | Versión ≥9.0 recomendada |

---

## 🚀 Arranque

### Modo Simple (un servidor)

```bash
cd MCPGallery/mcp-mesh-sdk
npm install
npm start  # Arranca DevOpsServer en :3003
```

### Modo Orquestado (Launcher + otros)

```bash
# Terminal 1: Launcher (orquestador)
npm run start:launcher  # Puerto 3050

# Luego desde Copilot Chat:
# Invocar tool "launch_all_servers" del Launcher
```

### Servidores Individuales

```bash
npm run start:wiki    # WikiBrowser en :3002
npm run start:state   # StateMachine en :3004
npm run start:prolog  # PrologServer en :3006 (requiere SWI-Prolog)
```

---

## 🔧 Tools del Launcher (puerto 3050)

| Tool | Descripción |
|------|-------------|
| `launch_mcp_server` | Arranca un servidor por ID |
| `stop_mcp_server` | Detiene un servidor |
| `restart_mcp_server` | Reinicia un servidor |
| `get_server_status` | Estado de uno o todos los servidores |
| `launch_all_servers` | Arranca XPlus1 + Wiki |
| `generate_vscode_mcp_config` | Genera .vscode/mcp.json dinámicamente |

---

## 🧠 Tools del Prolog Server (puerto 3006)

El servidor Prolog expone herramientas para inferencia lógica y gestión de sesiones.

| Tool | Descripción |
|------|-------------|
| `prolog_create_session` | Crea una nueva sesión Prolog con ID y obraId |
| `prolog_list_sessions` | Lista todas las sesiones activas |
| `prolog_destroy_session` | Destruye una sesión y libera recursos |
| `prolog_assert_fact` | Añade un hecho a la base de conocimiento |
| `prolog_query` | Ejecuta una consulta Prolog |
| `prolog_consult_file` | Carga un archivo .pl en la sesión |
| `prolog_get_templates` | Lista plantillas Prolog disponibles |

### Ejemplo de Uso

```typescript
// 1. Crear sesión
prolog_create_session({ sessionId: "teatro-01", obraId: "demo" })

// 2. Añadir hechos
prolog_assert_fact({ sessionId: "teatro-01", fact: "agente(ox, meta, oraculo)" })
prolog_assert_fact({ sessionId: "teatro-01", fact: "handoff(aleph, ox, consulta)" })

// 3. Consultar
prolog_query({ sessionId: "teatro-01", query: "agente(X, meta, Y)." })
// → { results: [{ X: "ox", Y: "oraculo" }] }

// 4. Cargar archivo externo
prolog_consult_file({ sessionId: "teatro-01", filePath: "/path/to/rules.pl" })

// 5. Destruir sesión
prolog_destroy_session({ sessionId: "teatro-01" })
```

### Características

- **Aislamiento de sesiones**: Cada sesión tiene su propia base de conocimiento
- **Caché de archivos**: Los archivos consultados se cachean para evitar recargas
- **Timeout automático**: Sesiones inactivas >1 hora se destruyen automáticamente
- **Reglas dinámicas**: Soporta `assert` de hechos y reglas simples

---

## 📡 Registro en VS Code

Los servidores se registran en `.vscode/mcp.json`:

```jsonc
{
  "servers": {
    "devops-mcp-server": {
      "type": "http",
      "url": "http://localhost:3003"
    }
  }
}
```

---

## 🔗 Vinculación con Scriptorium

| Recurso | Ubicación |
|---------|-----------|
| Plugin | `.github/plugins/mcp-presets/` |
| README padre | `MCPGallery/README-SCRIPTORIUM.md` |
| mcp.json ALEPH | `ALEPH/.vscode/mcp.json` |

---

---

## 🛠️ Template: Crear Nuevo Servidor MCP

> **DRY**: Para gestión de presets y asignación a agentes, ver [mcp-presets.agent.md](../../.github/plugins/mcp-presets/agents/mcp-presets.agent.md)

### Paso 1: Crear la Configuración

Crear archivo en `src/configs/DEFAULT_MI_SERVIDOR_CONFIG.ts`:

```typescript
import { BaseMCPServerConfig } from "../MCPServerConfig";

export const DEFAULT_MI_SERVIDOR_CONFIG: BaseMCPServerConfig = {
    id: "mi-servidor-mcp",              // ID único (kebab-case)
    name: "Mi Servidor MCP",            // Nombre legible
    script: "src/MiServidorMCP.ts",     // Ruta al script TypeScript
    port: 30XX,                         // Puerto único (30XX disponible)
    description: "Descripción del servidor",
    autoRestart: true,                  // Auto-reinicio en fallo
    healthCheckInterval: 30000,         // Health check cada 30s
    url: "http://localhost",
    version: "1.0.0",
    capabilitiesCheck: {
        tools: true,                    // ¿Expone tools?
        resources: true,                // ¿Expone resources?
        prompts: false,                 // ¿Expone prompts?
    },
    features: {
        enableManagers: true,
        enableWebConsole: false,
        enableHealthChecks: true,
    },
};
```

### Paso 2: Exportar desde el Índice

Añadir en `src/configs/index.ts`:

```typescript
export * from "./DEFAULT_MI_SERVIDOR_CONFIG";
```

### Paso 3: Registrar en el Launcher

En `src/MCPLauncherServer.ts`, añadir a `CONFIGS_BASE_MCP_SERVER`:

```typescript
import { DEFAULT_MI_SERVIDOR_CONFIG } from "./configs";

export const CONFIGS_BASE_MCP_SERVER = {
    // ... existentes ...
    "mi-servidor-mcp": DEFAULT_MI_SERVIDOR_CONFIG,
};
```

### Paso 4: Implementar el Servidor

Crear `src/MiServidorMCP.ts`:

```typescript
import { BaseMCPServer } from "./BaseMCPServer";
import { DEFAULT_MI_SERVIDOR_CONFIG } from "./configs/DEFAULT_MI_SERVIDOR_CONFIG";
import { z } from "zod";

export class MiServidorMCP extends BaseMCPServer {
    constructor() {
        super(DEFAULT_MI_SERVIDOR_CONFIG);
    }

    /**
     * Implementar tools, resources y prompts específicos
     */
    protected setupServerSpecifics(): void {
        this.setupTools();
        this.setupResources();
        this.setupPrompts();
    }

    private setupTools(): void {
        // Tool de ejemplo
        this.server.tool(
            "mi_tool",                          // Nombre del tool
            "Descripción de lo que hace",       // Descripción
            {                                   // Schema de parámetros (Zod)
                param1: z.string().describe("Parámetro requerido"),
                param2: z.number().optional().describe("Parámetro opcional"),
            },
            async ({ param1, param2 }) => {     // Handler
                // Lógica del tool
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({ success: true, param1 }, null, 2)
                    }]
                };
            }
        );
    }

    private setupResources(): void {
        // Resource de ejemplo
        this.server.resource(
            "mi-resource",                      // ID del resource
            "mi-servidor://data/ejemplo",       // URI
            {
                description: "Datos de ejemplo",
                mimeType: "application/json",
            },
            async () => ({
                contents: [{
                    uri: "mi-servidor://data/ejemplo",
                    mimeType: "application/json",
                    text: JSON.stringify({ data: "ejemplo" }, null, 2)
                }]
            })
        );
    }

    private setupPrompts(): void {
        // Prompt de ejemplo
        this.server.prompt(
            "mi-prompt",
            "Prompt para guiar al usuario",
            {
                contexto: z.string().optional().describe("Contexto adicional")
            },
            async ({ contexto }) => ({
                messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `🎯 **Mi Servidor MCP**\n\nContexto: ${contexto || "ninguno"}`
                    }
                }]
            })
        );
    }
}

// CLI entry point
async function main() {
    console.log("🚀 Starting Mi Servidor MCP on port 30XX");
    try {
        const server = new MiServidorMCP();
        await server.start();
        console.log("✅ Mi Servidor MCP ready");

        process.on("SIGINT", async () => {
            await server.shutdown();
            process.exit(0);
        });
    } catch (error) {
        console.error("❌ Failed to start:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export default MiServidorMCP;
```

### Paso 5: Añadir Script en package.json

```json
{
  "scripts": {
    "start:mi-servidor": "tsx src/MiServidorMCP.ts"
  }
}
```

### Paso 6: (Opcional) Arranque Automático

Para incluir en `launch_all_servers`, añadir en `src/configs/app.config.ts`:

```typescript
export const DEFAULT_APP_CONFIG: AppConfig = {
    mcp: {
        servers: {
            // ... existentes ...
            "mi-servidor-mcp": DEFAULT_MI_SERVIDOR_CONFIG,
        },
    },
}
```

### Paso 7: Registrar en VS Code

Añadir en `.vscode/mcp.json` (o generar con tool `generate_vscode_mcp_config`):

```jsonc
{
  "servers": {
    "mi-servidor-mcp": {
      "type": "http",
      "url": "http://localhost:30XX"
    }
  }
}
```

---

## 📋 Puertos Reservados

| Rango | Uso |
|-------|-----|
| 3001 | XPlus1 (deprecated) |
| 3002 | Wiki Browser |
| 3003 | DevOps Server |
| 3004 | State Machine |
| 3005 | *Disponible* |
| 3006 | Prolog Server |
| 3007-3049 | *Disponibles* |
| 3050 | Launcher (orquestador) |

---

## 📖 Referencias DRY

| Tema | Fuente de Verdad |
|------|-----------------|
| Presets MCP | [mcp-presets.agent.md](../../.github/plugins/mcp-presets/agents/mcp-presets.agent.md) |
| Esquema PresetModel | [mcp-presets.instructions.md](../../.github/plugins/mcp-presets/instructions/mcp-presets.instructions.md) |
| Catálogo Zeus | [MCPGallery/README-SCRIPTORIUM.md](../README-SCRIPTORIUM.md) |
| Plugin Manifest | [manifest.md](../../.github/plugins/mcp-presets/manifest.md) |
| Asignación a Agentes | [agent-assignments.json](../../ARCHIVO/PLUGINS/MCP_PRESETS/agent-assignments.json) |

---

## 📝 Changelog de Integración

| Fecha | Cambio |
|-------|--------|
| 2026-01-02 | Añadir template completo para crear nuevo servidor MCP |
| 2026-01-02 | Añadir tabla de puertos reservados |
| 2026-01-02 | Añadir referencias DRY a plugin mcp-presets |
| 2025-12-30 | Crear README-SCRIPTORIUM.md |
| 2025-12-30 | Añadir scripts start:launcher, start:wiki, start:state |
| 2025-12-30 | Corregir ruta mcp-core-sdk en package.json |
