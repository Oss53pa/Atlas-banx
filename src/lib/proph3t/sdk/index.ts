// ============================================================================
// Vendored from @atlas-studio/proph3t-client (v0.1.0, MIT) — Atlas Studio.
// Public surface of the federation client. Not published to npm; vendored so
// the single-file Vercel build resolves without a file: link.
// ============================================================================

export { Proph3tClient } from './client';
export { Proph3tError } from './types';
export type {
  Proph3tAppId,
  Proph3tClientOptions,
  RecallParams,
  MemoryHit,
  SearchKnowledgeParams,
  KnowledgeHit,
  RunToolParams,
  ToolResult,
  LogAuditParams,
  AuditEntry,
} from './types';
