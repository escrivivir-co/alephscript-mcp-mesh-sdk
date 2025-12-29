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
npm run start:wiki   # WikiBrowser en :3002
npm run start:state  # StateMachine en :3004
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

## 📝 Changelog de Integración

| Fecha | Cambio |
|-------|--------|
| 2025-12-30 | Crear README-SCRIPTORIUM.md |
| 2025-12-30 | Añadir scripts start:launcher, start:wiki, start:state |
| 2025-12-30 | Corregir ruta mcp-core-sdk en package.json |
