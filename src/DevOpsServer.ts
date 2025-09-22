import { DevOpsServer } from "./DevOpsServerImpl";
import { Logger as l } from "./Logger";
import { SocketIoMesh } from "@alephscript/mcp-core-sdk";
import { UIServer } from "./web/UIServer";
/**
 * CLI entry point - run as standalone MCP server
 */
async function main() {

    try {

        console.log("🚀 Starting SocketIoMesh...");
        const smesh = new SocketIoMesh();
        await smesh.init();
        console.log("✅ SocketIoMesh started.");

        const server = new DevOpsServer({});
		l.i("MCPBasicStateMachineServer Server instance created, starting...");
        await server.start();

        const uiServer = new UIServer();
        await uiServer.start();
        console.log("✅ UI Server started on http://localhost:3011");

        // Keep process alive
        process.on("SIGINT", () => {
            console.log("\n🔄 Shutting down AS_MCP_MESH_SDK...");
            server.shutdown().then(() => {
                process.exit(0);
            });
        });

        process.on("SIGTERM", () => {
            console.log("\n🔄 Shutting down AS_MCP_MESH_SDK...");
            server.shutdown().then(() => {
                process.exit(0);
            });
        });
    } catch (error) {
        console.error("❌ Failed to start AS_MCP_MESH_SDK:", error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main();
}
