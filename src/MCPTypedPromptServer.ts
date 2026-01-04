#!/usr/bin/env node
/**
 * TypedPrompt MCP Server
 * Provides schema validation and ontology management capabilities to MCP clients
 * 
 * @épica TYPED-MCP-1.0.0 - MCPTypedPromptServer Implementation
 */

import { BaseMCPServer } from "./BaseMCPServer";
import { DEFAULT_TYPED_PROMPT_MCP_SERVER_CONFIG } from "./configs/DEFAULT_TYPED_PROMPT_MCP_SERVER_CONFIG";
import { TypedPromptBackendClient, createTypedPromptBackendClient } from "./clients";
import { l } from "./Logger";
import { z } from "zod";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp";
import Ajv from "ajv";

// ============================================
// Local type definitions (until core-sdk is rebuilt)
// These mirror the types in mcp-core-sdk/types/typed-prompts
// ============================================

export interface Schema {
	id: number;
	name: string;
	typeScript: string;
	jsonSchema: string;
	category?: string;
	labels?: string[];
	description?: string;
	libraryId?: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface Library {
	id: number;
	name: string;
	description?: string;
	category?: string;
	schemas?: Schema[];
	createdAt?: string;
	updatedAt?: string;
}

export interface ValidationError {
	path: string;
	message: string;
}

export interface ValidationReport {
	valid: boolean;
	errors: ValidationError[];
}

export class MCPTypedPromptServer extends BaseMCPServer {
	private backendClient: TypedPromptBackendClient;
	private ajv: Ajv;

	constructor() {
		super(DEFAULT_TYPED_PROMPT_MCP_SERVER_CONFIG);
		
		const backendUrl = process.env.TYPED_PROMPT_BACKEND_URL || 'http://localhost:3019/api';
		l.info("MCPTypedPromptServer: Creating TypedPromptBackendClient", { 
			TYPED_PROMPT_BACKEND_URL: process.env.TYPED_PROMPT_BACKEND_URL || '(not set, using default)',
			effectiveUrl: backendUrl 
		});
		
		this.backendClient = createTypedPromptBackendClient({ baseUrl: backendUrl });
		this.ajv = new Ajv({ allErrors: true, verbose: true });
		
		l.info("MCPTypedPromptServer initialized with backend client and AJV validator");
	}

	protected setupServerSpecifics(): void {
		this.setupTools();
		this.setupResources();
		this.setupPrompts();
		l.info("MCPTypedPromptServer tools, resources and prompts registered");
	}

	// ============================================
	// MCP Tools
	// ============================================

	private setupTools(): void {
		// Tool: Validate message against schema
		this.server.tool(
			"typed_validate_message",
			"Validate a JSON message against a schema",
			{
				schemaId: z.number().describe("ID of the schema to validate against"),
				message: z.string().describe("JSON message to validate"),
			},
			async ({ schemaId, message }) => {
				const result = await this.handleValidateMessage(schemaId, message);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Convert TypeScript interface to JSON Schema
		this.server.tool(
			"typed_convert_interface",
			"Convert a TypeScript interface definition to JSON Schema",
			{
				typescript: z.string().describe("TypeScript interface definition"),
				name: z.string().optional().describe("Name for the generated schema"),
			},
			async ({ typescript, name }) => {
				const result = await this.handleConvertInterface(typescript, name);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: List available schemas
		this.server.tool(
			"typed_list_schemas",
			"List all available schemas, optionally filtered by library",
			{
				libraryId: z.number().optional().describe("Filter by library ID"),
				category: z.string().optional().describe("Filter by category"),
			},
			async ({ libraryId, category }) => {
				const result = await this.handleListSchemas(libraryId, category);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Get schema by ID
		this.server.tool(
			"typed_get_schema",
			"Get a schema by its ID",
			{
				schemaId: z.number().describe("ID of the schema to retrieve"),
			},
			async ({ schemaId }) => {
				const result = await this.handleGetSchema(schemaId);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Create a new schema
		this.server.tool(
			"typed_create_schema",
			"Create a new schema from TypeScript and JSON Schema definitions",
			{
				name: z.string().describe("Name of the schema"),
				typescript: z.string().describe("TypeScript interface definition"),
				jsonSchema: z.string().describe("JSON Schema definition"),
				category: z.string().optional().describe("Category for organization"),
				libraryId: z.number().optional().describe("Library to add schema to"),
			},
			async ({ name, typescript, jsonSchema, category, libraryId }) => {
				const result = await this.handleCreateSchema(name, typescript, jsonSchema, category, libraryId);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: List libraries
		this.server.tool(
			"typed_list_libraries",
			"List all available schema libraries",
			{},
			async () => {
				const result = await this.handleListLibraries();
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);

		// Tool: Suggest ontology based on use case
		this.server.tool(
			"typed_suggest_ontology",
			"Suggest existing ontologies/schemas based on a use case description",
			{
				useCase: z.string().describe("Description of the use case"),
				domain: z.string().optional().describe("Domain context (e.g., Teatro, IoT, ARG)"),
				constraints: z.array(z.string()).optional().describe("Constraints to consider"),
			},
			async ({ useCase, domain, constraints }) => {
				const result = await this.handleSuggestOntology(useCase, domain, constraints);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
				};
			}
		);
	}

	// ============================================
	// MCP Resources
	// ============================================

	private setupResources(): void {
		// Resource: Schema by ID (dynamic template)
		this.server.resource(
			"typed-prompt-schema",
			new ResourceTemplate("typed-prompt://schemas/{id}", { list: undefined }),
			{
				description: "Get schema details by ID",
				mimeType: "application/json",
			},
			async (uri, { id }) => {
				const schemaId = parseInt(id as string, 10);
				if (isNaN(schemaId)) {
					return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ error: "Invalid schema ID" }) }] };
				}
				const result = await this.handleGetSchema(schemaId);
				return {
					contents: [{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify(result, null, 2),
					}],
				};
			}
		);

		// Resource: Library by ID (dynamic template)
		this.server.resource(
			"typed-prompt-library",
			new ResourceTemplate("typed-prompt://libraries/{id}", { list: undefined }),
			{
				description: "Get library details by ID",
				mimeType: "application/json",
			},
			async (uri, { id }) => {
				const libraryId = parseInt(id as string, 10);
				if (isNaN(libraryId)) {
					return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ error: "Invalid library ID" }) }] };
				}
				const result = await this.backendClient.getLibrary(libraryId);
				return {
					contents: [{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify(result, null, 2),
					}],
				};
			}
		);

		// Resource: All schemas list
		this.server.resource(
			"typed-prompt-schemas-list",
			"typed-prompt://schemas",
			{
				description: "Get list of all schemas",
				mimeType: "application/json",
			},
			async (uri) => {
				const result = await this.handleListSchemas();
				return {
					contents: [{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify(result, null, 2),
					}],
				};
			}
		);
	}

	// ============================================
	// MCP Prompts
	// ============================================

	private setupPrompts(): void {
		// Prompt: Study use case
		this.server.prompt(
			"study_case",
			"Analyze a use case and propose an ontology structure",
			{
				context: z.string().describe("Context of the use case"),
				requirements: z.string().optional().describe("List of requirements"),
			},
			async ({ context, requirements }) => {
				return {
					messages: [{
						role: "user",
						content: {
							type: "text",
							text: `Analyze this use case and propose a TypeScript interface structure:

Context: ${context}

Requirements:
${requirements || "No specific requirements provided"}

Please provide:
1. Main entities identified
2. TypeScript interfaces for each entity
3. JSON Schema equivalent
4. Suggested validation rules`,
						},
					}],
				};
			}
		);

		// Prompt: Suggest ontology
		this.server.prompt(
			"suggest_ontology",
			"Search existing ontologies and suggest relevant ones",
			{
				domain: z.string().describe("Domain to search in"),
				constraints: z.string().optional().describe("Constraints to apply"),
			},
			async ({ domain, constraints }) => {
				// Get available schemas for context
				const schemas = await this.handleListSchemas();
				
				return {
					messages: [{
						role: "user",
						content: {
							type: "text",
							text: `Find relevant ontologies for this domain:

Domain: ${domain}
Constraints: ${constraints || "None"}

Available schemas in the system:
${JSON.stringify(schemas.schemas?.map((s: Schema) => ({ id: s.id, name: s.name, category: s.category })) || [], null, 2)}

Please suggest which schemas are most relevant and explain why.`,
						},
					}],
				};
			}
		);

		// Prompt: Install in agent
		this.server.prompt(
			"install_in_agent",
			"Guide for installing a schema in an agent's recipe",
			{
				agentId: z.string().describe("Agent identifier"),
				schemaId: z.string().describe("Schema ID to install"),
			},
			async ({ agentId, schemaId }) => {
				const schema = await this.handleGetSchema(parseInt(schemaId, 10));
				
				return {
					messages: [{
						role: "user",
						content: {
							type: "text",
							text: `Install this schema in agent ${agentId}:

Schema: ${JSON.stringify(schema, null, 2)}

Please provide:
1. The validationSchema block to add to the agent's recipe
2. Example of valid input message
3. Example of valid output message
4. Integration test to verify`,
						},
					}],
				};
			}
		);
	}

	// ============================================
	// Handler Methods
	// ============================================

	private async handleValidateMessage(schemaId: number, message: string): Promise<{ success: boolean; valid: boolean; report: ValidationReport; error?: string }> {
		try {
			// Get schema from backend
			const schemaResult = await this.backendClient.getSchema(schemaId);
			if (!schemaResult.schema) {
				return {
					success: false,
					valid: false,
					report: { valid: false, errors: [{ path: "", message: `Schema ${schemaId} not found` }] },
					error: `Schema ${schemaId} not found`,
				};
			}

			// Parse JSON Schema
			let jsonSchema: object;
			try {
				jsonSchema = JSON.parse(schemaResult.schema.jsonSchema);
			} catch (e) {
				return {
					success: false,
					valid: false,
					report: { valid: false, errors: [{ path: "", message: "Invalid JSON Schema in database" }] },
					error: "Invalid JSON Schema in database",
				};
			}

			// Parse message
			let messageObj: unknown;
			try {
				messageObj = JSON.parse(message);
			} catch (e) {
				return {
					success: true,
					valid: false,
					report: { valid: false, errors: [{ path: "", message: "Invalid JSON message" }] },
				};
			}

			// Validate with AJV
			const validate = this.ajv.compile(jsonSchema);
			const valid = validate(messageObj);

			const errors = validate.errors?.map((e) => ({
				path: e.instancePath || "/",
				message: e.message || "Validation error",
			})) || [];

			return {
				success: true,
				valid: valid as boolean,
				report: { valid: valid as boolean, errors },
			};
		} catch (error: any) {
			l.e("handleValidateMessage error", { schemaId, error: error.message });
			return {
				success: false,
				valid: false,
				report: { valid: false, errors: [{ path: "", message: error.message }] },
				error: error.message,
			};
		}
	}

	private async handleConvertInterface(typescript: string, name?: string): Promise<{ success: boolean; jsonSchema?: string; error?: string }> {
		try {
			// Use backend's conversion endpoint
			const result = await this.backendClient.convertInterface(typescript, name);
			return result;
		} catch (error: any) {
			l.e("handleConvertInterface error", { error: error.message });
			return {
				success: false,
				error: error.message,
			};
		}
	}

	private async handleListSchemas(libraryId?: number, category?: string): Promise<{ success: boolean; count: number; schemas: Schema[]; error?: string }> {
		try {
			const schemas = await this.backendClient.getAllSchemas(libraryId, category);
			return {
				success: true,
				count: schemas.length,
				schemas,
			};
		} catch (error: any) {
			l.e("handleListSchemas error", { error: error.message });
			return {
				success: false,
				count: 0,
				schemas: [],
				error: error.message,
			};
		}
	}

	private async handleGetSchema(schemaId: number): Promise<{ success: boolean; schema?: Schema; error?: string }> {
		try {
			const schema = await this.backendClient.getSchema(schemaId);
			return schema;
		} catch (error: any) {
			l.e("handleGetSchema error", { schemaId, error: error.message });
			return {
				success: false,
				error: error.message,
			};
		}
	}

	private async handleCreateSchema(
		name: string,
		typescript: string,
		jsonSchema: string,
		category?: string,
		libraryId?: number
	): Promise<{ success: boolean; schema?: Schema; error?: string }> {
		try {
			const result = await this.backendClient.createSchema({
				name,
				typeScript: typescript,
				jsonSchema,
				category,
				libraryId,
			});
			return result;
		} catch (error: any) {
			l.e("handleCreateSchema error", { name, error: error.message });
			return {
				success: false,
				error: error.message,
			};
		}
	}

	private async handleListLibraries(): Promise<{ success: boolean; count: number; libraries: Library[]; error?: string }> {
		try {
			const libraries = await this.backendClient.getAllLibraries();
			return {
				success: true,
				count: libraries.length,
				libraries,
			};
		} catch (error: any) {
			l.e("handleListLibraries error", { error: error.message });
			return {
				success: false,
				count: 0,
				libraries: [],
				error: error.message,
			};
		}
	}

	private async handleSuggestOntology(
		useCase: string,
		domain?: string,
		constraints?: string[]
	): Promise<{ success: boolean; suggestions: Array<{ schemaId: number; name: string; relevance: number; reason: string }>; error?: string }> {
		try {
			// Get all schemas and filter by relevance
			const schemasResult = await this.handleListSchemas();
			if (!schemasResult.success) {
				return {
					success: false,
					suggestions: [],
					error: schemasResult.error,
				};
			}

			// Simple keyword matching for suggestions
			const useCaseLower = useCase.toLowerCase();
			const domainLower = domain?.toLowerCase() || "";
			
			const suggestions = schemasResult.schemas
				.map((schema) => {
					let relevance = 0;
					const reasons: string[] = [];

					// Check name match
					if (schema.name.toLowerCase().includes(useCaseLower.split(" ")[0])) {
						relevance += 30;
						reasons.push("Name matches use case");
					}

					// Check category match
					if (schema.category && domainLower && schema.category.toLowerCase().includes(domainLower)) {
						relevance += 40;
						reasons.push("Category matches domain");
					}

					// Check labels match
					if (schema.labels && schema.labels.some((label: string) => useCaseLower.includes(label.toLowerCase()))) {
						relevance += 20;
						reasons.push("Labels match use case keywords");
					}

					// Check description match
					if (schema.description && useCaseLower.split(" ").some((word) => schema.description?.toLowerCase().includes(word))) {
						relevance += 10;
						reasons.push("Description contains relevant keywords");
					}

					return {
						schemaId: schema.id,
						name: schema.name,
						relevance,
						reason: reasons.join("; ") || "No specific match found",
					};
				})
				.filter((s) => s.relevance > 0)
				.sort((a, b) => b.relevance - a.relevance)
				.slice(0, 5);

			return {
				success: true,
				suggestions,
			};
		} catch (error: any) {
			l.e("handleSuggestOntology error", { useCase, error: error.message });
			return {
				success: false,
				suggestions: [],
				error: error.message,
			};
		}
	}
}

// ============================================
// Main Entry Point
// ============================================

if (require.main === module) {
	const server = new MCPTypedPromptServer();
	server.start().catch((error) => {
		console.error("Failed to start MCPTypedPromptServer:", error);
		process.exit(1);
	});
}

export default MCPTypedPromptServer;
