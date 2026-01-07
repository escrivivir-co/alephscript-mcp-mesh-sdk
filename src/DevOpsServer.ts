import { DevOpsServer } from "./DevOpsServerImpl";
import { Logger as l } from "./Logger";
// TODO: SocketIoMesh will be added when MCP-CHANNELS-1.0.0 is complete
// import { SocketIoMesh } from "@alephscript/mcp-core-sdk";
import { UIServer } from "./web/server";
/**
 * CLI entry point - run as standalone MCP server
 */
async function main() {

    try {


        /*
        const uiServer = new UIServer();
        await uiServer.start();
        console.log("✅ UI Server started on http://localhost:3011");
        */

        // const zeusServer = new UIServer();
        // await zeusServer.start();
        // console.log("✅ UI Server started on http://localhost:3011");

        /*
        console.log("🚀 Starting SocketIoMesh...");
        const smesh = new SocketIoMesh();
        await smesh.init();
        console.log("✅ SocketIoMesh started.");

        */

        const server = new DevOpsServer({});
		l.i("MCPBasicStateMachineServer Server instance created, starting...");
        await server.start();

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
