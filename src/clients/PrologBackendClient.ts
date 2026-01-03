/**
 * PrologBackendClient - HTTP client for accessing PrologEditor Backend REST API
 * 
 * This client is used by MCPPrologServer to access SQLite-persisted data
 * without creating MCP → Backend → MCP cycles.
 * 
 * SAFE endpoints only (no MCP invocation):
 * - GET /rules, POST /rules, DELETE /rules/:id
 * - GET /sdk-templates, GET /template/:name
 * - GET /telemetry/status
 * 
 * @épica PROLOG-CLIENT-GEN-1.0.0
 * @fecha 2026-01-03
 */

import type {
  Rule,
  RuleInput,
  RuleCreatedResponse,
  Template,
  TemplateContentResponse,
  TelemetryStatus,
} from '@alephscript/mcp-core-sdk/types/prolog';

import { l } from '../Logger';

export interface PrologBackendClientConfig {
  baseUrl: string;
  timeout?: number;
}

export interface ApiError {
  error: string;
}

export class PrologBackendClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: PrologBackendClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 10000;
    l.i('[PrologBackendClient] Initialized', { baseUrl: this.baseUrl, timeout: this.timeout });
  }

  // ============================================
  // Rules API (SQLite)
  // ============================================

  /**
   * Get all rules from database
   */
  async getAllRules(): Promise<Rule[]> {
    const response = await this.fetch<Rule[]>('/rules');
    return response;
  }

  /**
   * Get rules filtered by app name
   */
  async getRulesByApp(app: string): Promise<Rule[]> {
    const response = await this.fetch<Rule[]>(`/rules/${encodeURIComponent(app)}`);
    return response;
  }

  /**
   * Create a new rule in database
   */
  async createRule(rule: RuleInput): Promise<RuleCreatedResponse> {
    const response = await this.fetch<RuleCreatedResponse>('/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    });
    return response;
  }

  /**
   * Delete a rule by ID
   */
  async deleteRule(id: number): Promise<void> {
    await this.fetch(`/rules/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // Templates API (Local SDK)
  // ============================================

  /**
   * List available SDK templates
   */
  async getSdkTemplates(): Promise<Template[]> {
    const response = await this.fetch<Template[]>('/sdk-templates');
    return response;
  }

  /**
   * Get template content by name
   */
  async getTemplateContent(templateName: string): Promise<TemplateContentResponse> {
    const response = await this.fetch<TemplateContentResponse>(
      `/template/${encodeURIComponent(templateName)}`
    );
    return response;
  }

  // ============================================
  // Telemetry API (Status only - no MCP)
  // ============================================

  /**
   * Get telemetry status
   */
  async getTelemetryStatus(): Promise<TelemetryStatus[]> {
    const response = await this.fetch<TelemetryStatus[]>('/telemetry/status');
    return response;
  }

  // ============================================
  // Health Check
  // ============================================

  /**
   * Check if backend is available
   */
  async isHealthy(): Promise<boolean> {
    const url = `${this.baseUrl}/rules`;
    l.d('[PrologBackendClient] isHealthy() checking...', { url });
    try {
      await this.fetch<unknown>('/rules', { method: 'HEAD' });
      l.i('[PrologBackendClient] isHealthy() = TRUE');
      return true;
    } catch (error: any) {
      l.e('[PrologBackendClient] isHealthy() = FALSE', { 
        error: error.message,
        url,
        statusCode: error.statusCode || 'N/A'
      });
      return false;
    }
  }

  // ============================================
  // Internal Fetch Wrapper
  // ============================================

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const method = options.method || 'GET';
    
    l.d('[PrologBackendClient] fetch()', { method, url });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      l.d('[PrologBackendClient] fetch() response', { 
        status: response.status, 
        ok: response.ok,
        url 
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Unknown error' })) as ApiError;
        throw new PrologBackendError(
          response.status,
          errorBody.error || `HTTP ${response.status}`,
          url
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // Handle HEAD requests (no body)
      if (method === 'HEAD') {
        l.d('[PrologBackendClient] HEAD request successful, no body to parse');
        return undefined as T;
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      l.e('[PrologBackendClient] fetch() CAUGHT ERROR', {
        errorName: (error as Error).name,
        errorMessage: (error as Error).message,
        url,
        method
      });
      
      if (error instanceof PrologBackendError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        l.e('[PrologBackendClient] Request TIMEOUT after', { timeout: this.timeout });
        throw new PrologBackendError(408, 'Request timeout', url);
      }

      throw new PrologBackendError(
        0,
        `Network error: ${(error as Error).message}`,
        url
      );
    }
  }
}

/**
 * Error class for PrologBackend API errors
 */
export class PrologBackendError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly url: string
  ) {
    super(`PrologBackend Error [${statusCode}]: ${message} (${url})`);
    this.name = 'PrologBackendError';
  }

  get isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  get isTimeout(): boolean {
    return this.statusCode === 408;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * Default configuration factory
 */
export function createPrologBackendClient(
  baseUrl = process.env.PROLOG_BACKEND_URL || 'http://localhost:8000/api'
): PrologBackendClient {
  return new PrologBackendClient({ baseUrl });
}
