/**
 * TypedPromptBackendClient - HTTP client for accessing TypedPromptsEditor Backend REST API
 * 
 * This client is used by MCPTypedPromptServer to access SQLite-persisted schemas
 * and libraries without creating MCP → Backend → MCP cycles.
 * 
 * SAFE endpoints only (no MCP invocation):
 * - GET /schemas, POST /schemas, GET /schemas/:id
 * - GET /libraries, POST /libraries, GET /libraries/:id
 * - POST /convert (TypeScript → JSON Schema)
 * - POST /validate
 * 
 * @épica TYPED-MCP-1.0.0
 * @fecha 2026-01-04
 */

import { l } from '../Logger';

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

export interface CreateSchemaRequest {
	name: string;
	typeScript: string;
	jsonSchema: string;
	category?: string;
	labels?: string[];
	description?: string;
	libraryId?: number;
}

export interface CreateLibraryRequest {
	name: string;
	description?: string;
	category?: string;
}

export interface TypedPromptBackendClientConfig {
	baseUrl: string;
	timeout?: number;
}

export interface ApiError {
	error: string;
}

export class TypedPromptBackendClient {
	private baseUrl: string;
	private timeout: number;

	constructor(config: TypedPromptBackendClientConfig) {
		this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
		this.timeout = config.timeout || 10000;
		l.i('[TypedPromptBackendClient] Initialized', { baseUrl: this.baseUrl, timeout: this.timeout });
	}

	// ============================================
	// Schemas API (SQLite)
	// ============================================

	/**
	 * Get all schemas, optionally filtered
	 */
	async getAllSchemas(libraryId?: number, category?: string): Promise<Schema[]> {
		const params = new URLSearchParams();
		if (libraryId) params.set('libraryId', String(libraryId));
		if (category) params.set('category', category);
		
		const query = params.toString();
		const url = query ? `/schemas?${query}` : '/schemas';
		
		const response = await this.fetch<{ schemas: Schema[] }>(url);
		return response.schemas || [];
	}

	/**
	 * Get schema by ID
	 */
	async getSchema(id: number): Promise<{ success: boolean; schema?: Schema; error?: string }> {
		try {
			const schema = await this.fetch<Schema>(`/schemas/${id}`);
			return { success: true, schema };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Create a new schema
	 */
	async createSchema(input: CreateSchemaRequest): Promise<{ success: boolean; schema?: Schema; error?: string }> {
		try {
			const schema = await this.fetch<Schema>('/schemas', {
				method: 'POST',
				body: JSON.stringify(input),
			});
			return { success: true, schema };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Update an existing schema
	 */
	async updateSchema(id: number, input: Partial<CreateSchemaRequest>): Promise<{ success: boolean; schema?: Schema; error?: string }> {
		try {
			const schema = await this.fetch<Schema>(`/schemas/${id}`, {
				method: 'PUT',
				body: JSON.stringify(input),
			});
			return { success: true, schema };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Delete a schema by ID
	 */
	async deleteSchema(id: number): Promise<{ success: boolean; error?: string }> {
		try {
			await this.fetch(`/schemas/${id}`, { method: 'DELETE' });
			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	// ============================================
	// Libraries API (SQLite)
	// ============================================

	/**
	 * Get all libraries
	 */
	async getAllLibraries(): Promise<Library[]> {
		const response = await this.fetch<{ libraries: Library[] }>('/libraries');
		return response.libraries || [];
	}

	/**
	 * Get library by ID
	 */
	async getLibrary(id: number): Promise<{ success: boolean; library?: Library; error?: string }> {
		try {
			const library = await this.fetch<Library>(`/libraries/${id}`);
			return { success: true, library };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Create a new library
	 */
	async createLibrary(input: CreateLibraryRequest): Promise<{ success: boolean; library?: Library; error?: string }> {
		try {
			const library = await this.fetch<Library>('/libraries', {
				method: 'POST',
				body: JSON.stringify(input),
			});
			return { success: true, library };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	/**
	 * Delete a library by ID
	 */
	async deleteLibrary(id: number): Promise<{ success: boolean; error?: string }> {
		try {
			await this.fetch(`/libraries/${id}`, { method: 'DELETE' });
			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	// ============================================
	// Conversion API
	// ============================================

	/**
	 * Convert TypeScript interface to JSON Schema
	 */
	async convertInterface(typescript: string, name?: string): Promise<{ success: boolean; jsonSchema?: string; error?: string }> {
		try {
			const result = await this.fetch<{ jsonSchema: string }>('/convert', {
				method: 'POST',
				body: JSON.stringify({ typescript, name }),
			});
			return { success: true, jsonSchema: result.jsonSchema };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}

	// ============================================
	// Validation API
	// ============================================

	/**
	 * Validate a message against a schema
	 */
	async validateMessage(schemaId: number, message: string): Promise<{ success: boolean; valid: boolean; report: ValidationReport; error?: string }> {
		try {
			const result = await this.fetch<{ valid: boolean; report: ValidationReport }>('/validate', {
				method: 'POST',
				body: JSON.stringify({ schemaId, message }),
			});
			return { success: true, valid: result.valid, report: result.report };
		} catch (error: any) {
			return { 
				success: false, 
				valid: false, 
				report: { valid: false, errors: [{ path: '', message: error.message }] },
				error: error.message 
			};
		}
	}

	// ============================================
	// Health Check
	// ============================================

	/**
	 * Check if the backend is healthy
	 */
	async healthCheck(): Promise<{ healthy: boolean; message: string }> {
		try {
			await this.fetch('/health');
			return { healthy: true, message: 'Backend is healthy' };
		} catch (error: any) {
			return { healthy: false, message: error.message };
		}
	}

	// ============================================
	// Private Helpers
	// ============================================

	private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(url, {
				...options,
				headers: {
					'Content-Type': 'application/json',
					...options.headers,
				},
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				let errorMessage = `HTTP ${response.status}`;
				try {
					const errorBody = await response.json() as ApiError;
					if (errorBody.error) {
						errorMessage = errorBody.error;
					}
				} catch {
					// Ignore JSON parse errors
				}
				throw new Error(errorMessage);
			}

			// Handle empty responses (204 No Content)
			if (response.status === 204) {
				return {} as T;
			}

			return await response.json() as T;
		} catch (error: any) {
			clearTimeout(timeoutId);
			
			if (error.name === 'AbortError') {
				throw new Error(`Request timeout after ${this.timeout}ms`);
			}
			
			throw error;
		}
	}
}

// ============================================
// Factory Function
// ============================================

export function createTypedPromptBackendClient(config: TypedPromptBackendClientConfig): TypedPromptBackendClient {
	return new TypedPromptBackendClient(config);
}
