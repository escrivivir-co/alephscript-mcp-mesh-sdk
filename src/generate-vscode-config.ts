#!/usr/bin/env tsx
/**
 * VS Code MCP Configuration Generator
 *
 * Standalone script to generate .vscode/mcp.json configuration
 * for connecting VS Code to running MCP servers
 */

import { MCPDriverAdapter } from "@/drivers";
import { l } from "./Logger";

interface GenerateConfigOptions {
    outputPath?: string;
    includeDescription?: boolean;
    check?: boolean;
}

/**
 * Generate VS Code MCP configuration
 */
export async function generateVSCodeConfig(
    mcpDriver: MCPDriverAdapter,
    options: GenerateConfigOptions = {}
) {
    const {
        outputPath = ".vscode/mcp.json",
        includeDescription = true,
        check = false,
    } = options;

    console.log("\n🔧 VS Code MCP Configuration Generator");
    l.i("=====================================");

    try {
        // Initialize MCP Driver
        l.i("📡 Connecting to MCP Service Launcher...");

        if (check) {
            // Just check status
            l.i("\n📊 Checking MCP servers status...");
            const statusResult = await mcpDriver.executeTool(
                "mcp-service-launcher",
                "get_server_status",
                {}
            );

            if (statusResult.success) {
                l.i("✅ Server status retrieved successfully");
                l.i(JSON.stringify(statusResult, null, 2));
            } else {
                l.e("❌ Failed to get server status");
            }
            return;
        }

        // Generate configuration
        l.i(`\n🛠️  Generating VS Code MCP configuration...`);
        const toolResult: any = await mcpDriver.executeTool(
            "mcp-service-launcher",
            "generate_vscode_mcp_config",
            {
                includeDescription,
                outputPath,
            }
        );

        let configElement = toolResult && Array.isArray(toolResult) ? toolResult.pop() : null;

        if (!configElement) {
            configElement = { success: false };
        }

        configElement = JSON.parse(configElement.text);
        if (configElement?.success) {
            l.i(`✅ Configuration generated successfully!`);
            l.i(`📁 Saved to: ${configElement.outputPath}`);

            // Show setup instructions
            if (configElement.instructions) {
                l.i("\n" + "=".repeat(50));
                l.i("🎯 VS Code Setup Instructions");
                l.i("=".repeat(50));

                l.i("\n📋 Quick Setup:");
                configElement.instructions.quickCommands?.forEach(
                    (cmd: string) => {
                        l.i(`   • ${cmd}`);
                    }
                );

                l.i("\n💡 Next Steps:");
                l.i("   1. Open VS Code in this workspace");
                l.i("   2. Install Model Context Protocol extension");
                l.i(
                    '   3. Use Ctrl+Shift+P → "MCP: Connect to Server"'
                );
                l.i("   4. Select from available servers");
                l.i("   5. Start using MCP tools!");

                l.i("\n📄 Configuration preview:");
                l.i(JSON.stringify(configElement.configFile, null, 2));
            }
        } else {
            l.e("❌ Failed to generate configuration:");
            l.d("SCODEconfigResult", configElement.error);
            console.log("SCODEconfigResult", configElement);
            process.exit(1);
        }
    } catch (error) {
        l.e("❌ Error:", error);
        l.i("\n💡 Make sure the MCP Service Launcher is running:");
        l.i("   npm run launcher:x-plus-1");
        process.exit(1);
    }
}

/**
 * Parse command line arguments
 */
function parseArgs(): GenerateConfigOptions {
    const args = process.argv.slice(2);
    const options: GenerateConfigOptions = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--output":
            case "-o":
                options.outputPath = args[++i];
                break;
            case "--no-description":
                options.includeDescription = false;
                break;
            case "--check":
            case "-c":
                options.check = true;
                break;
            case "--help":
            case "-h":
                showHelp();
                process.exit(0);
                break;
            default:
                l.e(`Unknown argument: ${arg}`);
                showHelp();
                process.exit(1);
        }
    }

    return options;
}

/**
 * Show help information
 */
function showHelp() {
    l.i(`
🔧 VS Code MCP Configuration Generator

Usage: npx tsx scripts/generate-vscode-config.ts [options]

Options:
  -o, --output <path>     Output path for mcp.json (default: .vscode/mcp.json)
  --no-description        Don't include descriptions in config
  -c, --check             Just check server status, don't generate config
  -h, --help              Show this help

Examples:
  # Generate default configuration
  npx tsx scripts/generate-vscode-config.ts

  # Generate to custom path
  npx tsx scripts/generate-vscode-config.ts -o my-config/mcp.json

  # Check server status only
  npx tsx scripts/generate-vscode-config.ts --check

Note: Make sure MCP servers are running before generating configuration.
`);
}

/**
 * Main entry point
 */
async function main() {
    try {
        const options = parseArgs();
        await generateVSCodeConfig(new MCPDriverAdapter(), options);
    } catch (error) {
        l.e("❌ Script failed:", error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}
