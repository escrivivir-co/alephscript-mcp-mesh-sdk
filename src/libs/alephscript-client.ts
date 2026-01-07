/**
 * AlephScriptClient - Re-export from @alephscript/mcp-core-sdk
 * 
 * This file previously contained a stub implementation.
 * Now it re-exports the real AlephScriptClient from the core SDK
 * for backward compatibility with existing imports.
 * 
 * @package @alephscript/mcp-mesh-sdk
 * @module libs/alephscript-client
 * @épica CHANNELS-SDK-1.0.0
 */

// Re-export from core SDK (the real implementation)
export { AlephScriptClient } from '@alephscript/mcp-core-sdk';

// NOTE: Room protocol types are defined inline in DevOpsRoomPlugin
// to avoid dependency on updated mcp-core-sdk package.
// Once the package is updated, these can be exported from here:
// export {
//     BaseRoomManager,
//     IRoomCapability,
//     IRoomManager,
//     IRoomManagerConfig,
//     ICapabilityContext,
//     RoomProtocolEvent,
// } from '@alephscript/mcp-core-sdk';