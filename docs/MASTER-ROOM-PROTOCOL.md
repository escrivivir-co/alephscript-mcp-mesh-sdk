# MASTER-ROOM Protocol — Socket.IO Communication for MCP Servers

> **Épica**: CHANNELS-SDK-1.0.0  
> **Estado**: ✅ Implementado (Fase 1: DevOpsServer)

---

## Overview

El protocolo MASTER-ROOM permite que los servidores MCP expongan capabilities via Socket.IO, habilitando comunicación bidireccional con agentes, UIs y otros clientes.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SocketIoMesh (3010)                          │
│                     /runtime namespace                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  DevOps_ROOM   │  │  Prolog_ROOM   │  │   Wiki_ROOM    │   │
│  │  (MASTER)      │  │  (MASTER)      │  │  (MASTER)      │   │
│  │                │  │                │  │                │   │
│  │ GET_STATUS     │  │ GET_SESSIONS   │  │ SEARCH_WIKI    │   │
│  │ GET_PLUGINS    │  │ QUERY_KB       │  │ GET_ARTICLE    │   │
│  │ GET_TASKS      │  │ ASSERT_FACT    │  │                │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│           ▲                  ▲                  ▲               │
│           │                  │                  │               │
│           └──────────────────┼──────────────────┘               │
│                              │                                  │
│                     ┌────────┴────────┐                        │
│                     │   Subscribers    │                        │
│                     │ @ox, Zeus UI,    │                        │
│                     │ Arrakis panels   │                        │
│                     └─────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Core Components

| Componente | Paquete | Descripción |
|------------|---------|-------------|
| `AlephScriptClient` | `@alephscript/mcp-core-sdk` | Cliente Socket.IO con helpers para rooms |
| `BaseRoomManager` | `@alephscript/mcp-core-sdk` | Clase abstracta para implementar MASTER |
| `room-protocol.ts` | `@alephscript/mcp-core-sdk` | Tipos y enums del protocolo |
| `DevOpsRoomPlugin` | `@alephscript/mcp-mesh-sdk` | Implementación para DevOpsServer |

### Protocol Events

```typescript
enum RoomProtocolEvent {
    // Registro
    CLIENT_REGISTER = 'CLIENT_REGISTER',
    CLIENT_SUSCRIBE = 'CLIENT_SUSCRIBE',
    
    // Master protocol
    MAKE_MASTER = 'MAKE_MASTER',
    RELEASE_MASTER = 'RELEASE_MASTER',
    
    // Capability discovery
    GET_CAPABILITIES = 'GET_CAPABILITIES',
    SET_CAPABILITIES = 'SET_CAPABILITIES',
    
    // Room lifecycle
    ROOM_JOINED = 'room_joined',
    ROOM_LEFT = 'room_left',
}
```

---

## Usage

### 1. Create a Room Manager (Server Side)

```typescript
import { BaseRoomManager, IRoomManagerConfig } from '@alephscript/mcp-core-sdk';

class MyServerRoomManager extends BaseRoomManager {
    constructor() {
        const config: IRoomManagerConfig = {
            roomId: 'MyServer_ROOM',
            masterName: 'MyServer',
            meshConfig: {
                url: 'http://localhost:3010',
                namespace: '/runtime',
            }
        };
        super(config);
        this.setupCapabilities();
    }

    private setupCapabilities() {
        this.registerCapability(
            { id: 'GET_DATA', description: 'Get some data' },
            async (input, ctx) => {
                return { data: 'Hello from ' + ctx.requesterName };
            }
        );
    }
}

// Activate
const manager = new MyServerRoomManager();
await manager.registerAsMaster(['GET_DATA']);
```

### 2. Subscribe and Query (Client Side)

```typescript
import { AlephScriptClient } from '@alephscript/mcp-core-sdk';

const client = new AlephScriptClient('AgentX', 'http://localhost:3010', '/runtime');

client.initTriggersDefinition.push(() => {
    // Register
    client.io.emit('CLIENT_REGISTER', { usuario: 'AgentX', sesion: 'session-123' });
    
    // Subscribe to room
    client.io.emit('CLIENT_SUSCRIBE', { room: 'MyServer_ROOM' });
    
    // Request data
    client.room('GET_DATA', { query: 'info' }, 'MyServer_ROOM');
    
    // Listen for response
    client.io.on('SET_DATA', (response) => {
        console.log('Received:', response);
    });
});
```

---

## MCP Tools Integration

El `DevOpsRoomPlugin` expone las siguientes MCP tools:

| Tool | Description |
|------|-------------|
| `devops_room_get_capabilities` | List capabilities exposed by DevOps Room |
| `devops_room_invoke` | Invoke a capability on the DevOps Room |
| `devops_room_status` | Get status of the DevOps Room connection |

### Example: Agent Invocation

```
@ox invoke devops_room_get_capabilities

→ {
    "roomId": "DevOps_ROOM",
    "capabilities": [
        { "id": "GET_SERVER_STATUS", "description": "Get current status of all MCP servers" },
        { "id": "GET_PLUGIN_LIST", "description": "List all installed DevOps plugins" },
        ...
    ]
}
```

---

## DevOps Room Capabilities

| Capability | Description | Input | Output |
|------------|-------------|-------|--------|
| `GET_SERVER_STATUS` | Get status of MCP servers | — | `{ servers: [], timestamp }` |
| `GET_PLUGIN_LIST` | List installed plugins | — | `{ plugins: [], count }` |
| `GET_TASK_LIST` | List VS Code tasks | — | `{ tasks: [] }` |
| `GET_AGENT_LIST` | List Scriptorium agents | — | `{ agents: [] }` |
| `GET_ROOM_MEMBERS` | List room members | — | `{ members: [], count }` |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SOCKET_MESH_URL` | `http://localhost:3010` | URL of Socket.IO mesh server |
| `DEVOPS_ROOM_PLUGIN_ENABLED` | `true` | Enable/disable room plugin |

---

## Roadmap

### Phase 1: DevOpsServer ✅
- [x] BaseRoomManager in mcp-core-sdk
- [x] DevOpsRoomPlugin in mcp-mesh-sdk
- [x] MCP tools for room protocol
- [x] Re-export AlephScriptClient from core

### Phase 2: Other Servers (Planned)
- [ ] PrologRoomPlugin
- [ ] WikiRoomPlugin
- [ ] StateMachineRoomPlugin

### Phase 3: Cross-Room Communication (Future)
- [ ] Room-to-room forwarding
- [ ] Capability aggregation
- [ ] Event pub/sub across rooms

---

## Related Files

| File | Package | Purpose |
|------|---------|---------|
| [room-protocol.ts](../mcp-core-sdk/src/types/room-protocol.ts) | core | Type definitions |
| [BaseRoomManager.ts](../mcp-core-sdk/src/client/BaseRoomManager.ts) | core | Abstract manager |
| [AlephScriptClient.ts](../mcp-core-sdk/src/client/AlephScriptClient.ts) | core | Socket.IO client |
| [DevOpsRoomPlugin.ts](./src/plugins/DevOpsRoomPlugin.ts) | mesh | Plugin implementation |
| [DevOpsServerImpl.ts](./src/DevOpsServerImpl.ts) | mesh | Server integration |

---

## Testing

```bash
# Start Socket.IO mesh
npm run start:launcher  # Port 3010

# Start DevOps Server with Room Plugin
npm run start:devops    # Port 3003

# Check room registration
curl http://localhost:3010/rooms
# → Should show DevOps_ROOM with MASTER registered
```

---

**Last Updated**: 2026-01-05  
**Épica**: CHANNELS-SDK-1.0.0
