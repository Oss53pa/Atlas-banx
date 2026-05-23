// ============================================================================
// Vendored from @atlas-studio/proph3t-client (v0.1.0, MIT) — Atlas Studio.
// Federation client for Atlas Studio satellite apps. The local app keeps its
// LLM/agent; this client taps the shared core:
//   - recall()          → cross-app user memory (episodic + semantic)
//   - searchKnowledge() → SYSCOHADA/OHADA/CGI RAG
//   - runTool()         → 197 centrally maintained tools
//   - logAudit()        → chained SHA-256 audit (OHADA-grade)
// The core never receives the user message — only the enrichment queries.
// ============================================================================

import { makeHttpContext, postEdge, type HttpContext } from './http';
import type {
  AuditEntry,
  KnowledgeHit,
  LogAuditParams,
  MemoryHit,
  Proph3tClientOptions,
  RecallParams,
  RunToolParams,
  SearchKnowledgeParams,
  ToolResult,
} from './types';

export class Proph3tClient {
  private readonly ctx: HttpContext;
  private readonly product: string;
  private readonly societyId?: string;

  constructor(opts: Proph3tClientOptions) {
    this.ctx = makeHttpContext(opts);
    this.product = opts.product;
    this.societyId = opts.societyId;
  }

  /** App id this client was created with. */
  get appId(): string {
    return this.product;
  }

  // ──────────────────────────────────────────────────────────────────────
  // 1. MEMORY — cross-app recall
  // ──────────────────────────────────────────────────────────────────────

  async recall(params: RecallParams): Promise<MemoryHit[]> {
    const scope = params.scope ?? 'both';
    const limit = params.limit ?? 5;
    const promises: Promise<MemoryHit[]>[] = [];
    if (scope === 'episodic' || scope === 'both') {
      promises.push(
        this.runToolRaw<MemoryHit[]>('recall_similar_cases', {
          query: params.query,
          scope: 'episodic',
          k: limit,
          app_id: this.product,
        }),
      );
    }
    if (scope === 'semantic' || scope === 'both') {
      promises.push(
        this.runToolRaw<MemoryHit[]>('recall_similar_cases', {
          query: params.query,
          scope: 'semantic',
          k: limit,
          app_id: this.product,
        }),
      );
    }
    const results = await Promise.allSettled(promises);
    return results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .slice(0, limit);
  }

  /** Save an episodic memory (an event that happened). */
  async remember(event: {
    eventType: string;
    eventData: Record<string, unknown>;
    occurredAt?: string;
  }): Promise<{ id: string }> {
    return this.runToolRaw('save_episodic_memory', {
      event_type: event.eventType,
      event_data: event.eventData,
      occurred_at: event.occurredAt ?? new Date().toISOString(),
      app_id: this.product,
      society_id: this.societyId,
    });
  }

  /** Save a semantic memory (a fact about the user/tenant). */
  async rememberFact(fact: {
    subject: string;
    fact: string;
    source: string;
    confidence?: number;
    scope?: 'user' | 'tenant' | 'global';
  }): Promise<{ id: string }> {
    return this.runToolRaw('save_semantic_memory', {
      subject: fact.subject,
      fact: fact.fact,
      source: fact.source,
      confidence: fact.confidence ?? 0.8,
      scope: fact.scope ?? 'user',
      scope_id: this.societyId,
      app_id: this.product,
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. KNOWLEDGE — central RAG (SYSCOHADA, OHADA, CGI, doctrine)
  // ──────────────────────────────────────────────────────────────────────

  async searchKnowledge(params: SearchKnowledgeParams): Promise<KnowledgeHit[]> {
    const result = await this.runToolRaw<{ hits?: KnowledgeHit[] } | KnowledgeHit[]>(
      'search_app_knowledge',
      {
        query: params.query,
        scope_id: params.scope ?? this.product,
        source_type: params.sourceType,
        top_k: params.topK ?? 5,
      },
    );
    if (Array.isArray(result)) return result;
    return result.hits ?? [];
  }

  /** Search documents the current tenant has uploaded. */
  async searchDocuments(query: string, topK = 5): Promise<KnowledgeHit[]> {
    const result = await this.runToolRaw<{ hits?: KnowledgeHit[] } | KnowledgeHit[]>(
      'search_tenant_documents',
      {
        query,
        app_id: this.product,
        society_id: this.societyId,
        top_k: topK,
      },
    );
    if (Array.isArray(result)) return result;
    return result.hits ?? [];
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. TOOLS — call any of the 197 central tools by name
  // ──────────────────────────────────────────────────────────────────────

  async runTool<TData = unknown, TArgs = Record<string, unknown>>(
    params: RunToolParams<TArgs>,
  ): Promise<ToolResult<TData>> {
    return postEdge<ToolResult<TData>>(this.ctx, 'proph3t-tool-direct', {
      tool_name: params.name,
      args: { ...params.args, app_id: this.product, society_id: this.societyId },
    });
  }

  /** Lower-level helper that unwraps the ToolResult and returns just the result. */
  private async runToolRaw<TData = unknown>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<TData> {
    const r = await postEdge<ToolResult<TData>>(this.ctx, 'proph3t-tool-direct', {
      tool_name: name,
      args: { ...args, app_id: this.product, society_id: this.societyId },
    });
    return r.result;
  }

  // ──────────────────────────────────────────────────────────────────────
  // 4. AUDIT — write to the chained SHA-256 audit log
  // ──────────────────────────────────────────────────────────────────────

  async logAudit(params: LogAuditParams): Promise<AuditEntry> {
    return this.runToolRaw<AuditEntry>('audit_trail_write', {
      action: params.action,
      subject_type: params.subjectType,
      subject_id: params.subjectId,
      content: { ...params.content, app_id: this.product },
    });
  }
}
