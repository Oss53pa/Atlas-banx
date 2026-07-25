// ============================================================================
// ATLASBANX - Groq Provider
// Implémentation du provider pour Groq (inférence LPU ultra-rapide).
// Groq expose une API compatible OpenAI (/openai/v1/chat/completions), on
// réutilise donc le même schéma de requête/réponse que le provider OpenAI.
// ============================================================================

import { BaseAIProvider } from './BaseAIProvider';
import {
  AIProviderType,
  AIProviderConfig,
  AIModel,
  AI_MODELS,
  AIErrorCode,
} from '../types';

const DEFAULT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Provider pour Groq (modèles open-weight servis sur LPU).
 * API compatible OpenAI : même corps de requête et même structure de réponse.
 */
export class GroqProvider extends BaseAIProvider {
  readonly name = 'Groq';
  readonly type: AIProviderType = 'groq';
  readonly models: AIModel[] = AI_MODELS.groq;

  private endpoint: string;

  constructor(config: AIProviderConfig) {
    super({
      ...config,
      provider: 'groq',
    });
    this.endpoint = this.resolveEndpoint(config.baseUrl);
  }

  // ============================================================================
  // Configuration Override
  // ============================================================================

  configure(config: AIProviderConfig): void {
    super.configure(config);
    this.endpoint = this.resolveEndpoint(config.baseUrl);
  }

  /**
   * Autorise un baseUrl personnalisé (proxy d'entreprise) tout en gardant le
   * chemin OpenAI-compatible. Sans baseUrl, on cible l'endpoint Groq public.
   */
  private resolveEndpoint(baseUrl?: string): string {
    if (!baseUrl || baseUrl.trim() === '') return DEFAULT_GROQ_URL;
    const trimmed = baseUrl.trim().replace(/\/$/, '');
    if (trimmed.includes('/chat/completions')) return trimmed;
    return `${trimmed}/chat/completions`;
  }

  // ============================================================================
  // Connection Test
  // ============================================================================

  async testConnection(): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.callAPI(
        [{ role: 'user', content: 'Réponds simplement "OK" pour valider la connexion.' }],
        { maxTokens: 10 }
      );
      return { valid: true };
    } catch (error) {
      if (error instanceof GroqAPIError) {
        return { valid: false, error: error.userMessage };
      }
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      return { valid: false, error: message };
    }
  }

  // ============================================================================
  // Core API Implementation
  // ============================================================================

  protected async callAPI(
    messages: Array<{ role: string; content: string }>,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    // Validate API key
    if (!this.config.apiKey || this.config.apiKey.trim() === '') {
      throw new GroqAPIError('Clé API non configurée', 'AUTH');
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout ?? DEFAULT_TIMEOUT_MS
    );

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: options?.maxTokens ?? this.config.maxTokens ?? 4000,
          temperature: options?.temperature ?? this.config.temperature ?? 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json() as GroqResponse;

      // Validate response structure
      if (!data.choices || data.choices.length === 0) {
        throw new GroqAPIError('Réponse API invalide', 'INVALID_REQUEST');
      }

      return {
        content: data.choices[0]?.message?.content || '',
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GroqAPIError('Délai d\'attente dépassé', 'TIMEOUT');
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new GroqAPIError('Impossible de contacter l\'API Groq', 'NETWORK');
      }

      // Re-throw GroqAPIError as-is
      if (error instanceof GroqAPIError) {
        throw error;
      }

      // Wrap unknown errors
      throw new GroqAPIError(
        error instanceof Error ? error.message : 'Erreur inconnue',
        'UNKNOWN'
      );
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async handleErrorResponse(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({})) as {
      error?: { message?: string; type?: string; code?: string };
    };
    const errorMessage = errorData?.error?.message || response.statusText;

    // Map HTTP status codes to error types (identique au schéma OpenAI)
    switch (response.status) {
      case 401:
        throw new GroqAPIError(errorMessage, 'AUTH', response.status);
      case 429: {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
        throw new GroqAPIError(errorMessage, 'RATE_LIMIT', response.status, retryAfter);
      }
      case 400:
        if (errorData?.error?.code === 'context_length_exceeded') {
          throw new GroqAPIError(errorMessage, 'CONTEXT_LENGTH', response.status);
        }
        throw new GroqAPIError(errorMessage, 'INVALID_REQUEST', response.status);
      case 500:
      case 502:
      case 503:
      case 504:
        throw new GroqAPIError(errorMessage, 'SERVER', response.status);
      default:
        throw new GroqAPIError(errorMessage, 'UNKNOWN', response.status);
    }
  }
}

// ============================================================================
// Groq-specific Error Class
// ============================================================================

export class GroqAPIError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly statusCode?: number,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'GroqAPIError';
  }

  get isRetryable(): boolean {
    return ['NETWORK', 'RATE_LIMIT', 'TIMEOUT', 'SERVER'].includes(this.code);
  }

  get userMessage(): string {
    switch (this.code) {
      case 'NETWORK':
        return 'Erreur de connexion. Vérifiez votre accès internet.';
      case 'AUTH':
        return 'Clé API Groq invalide ou expirée. Vérifiez vos paramètres (console.groq.com).';
      case 'RATE_LIMIT':
        return `Limite d'appels Groq atteinte. Réessayez dans ${this.retryAfter || 60} secondes.`;
      case 'TIMEOUT':
        return 'Délai d\'attente dépassé. L\'opération a pris trop de temps.';
      case 'INVALID_REQUEST':
        return 'Requête invalide. Vérifiez le modèle sélectionné.';
      case 'CONTEXT_LENGTH':
        return 'Le contexte dépasse la limite du modèle. Réduisez la taille des données.';
      case 'SERVER':
        return 'Erreur serveur Groq. Réessayez dans quelques instants.';
      default:
        return 'Une erreur inattendue s\'est produite.';
    }
  }
}

// ============================================================================
// Types
// ============================================================================

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
