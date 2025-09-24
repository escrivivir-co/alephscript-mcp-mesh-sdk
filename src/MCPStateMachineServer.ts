import { l } from "./Logger";
import { MCPStateMachineServer } from "./MCPStateMachineServerImpl";

/**
 * CLI entry point - run as standalone MCP server
 */
async function main() {

    try {
        const server = new MCPStateMachineServer();
		l.i("MCPBasicStateMachineServer Server instance created, starting... with bot support. 1");
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
