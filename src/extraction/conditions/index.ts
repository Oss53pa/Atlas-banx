// ============================================================================
// ATLASBANX — Conditions extractor — public API
// ============================================================================

export { extractConditions } from './PdfConditionsExtractor';
export { extractLabelValuePairs } from './LabelValueExtractor';
export { matchRubrics, bestRegistryFieldForPair } from './RubricMatcher';
export {
  classifyPairs,
  sectionToCategory,
  cleanRubricLabel,
  customRubricKey,
  isCustomRubricKey,
  parseCustomRubricKey,
  REGISTRY_ACCEPT_SIMILARITY,
  CUSTOM_RUBRIC_PREFIX,
} from './RubricClassifier';
export type {
  RubricCategory,
  ClassifiedRubric,
  PairClassification,
  ClassificationResult,
} from './RubricClassifier';
export { detectSegment, detectEffectivePeriod } from './segmentDetector';
export type { SegmentDetection, PeriodDetection } from './segmentDetector';
export {
  normalizeRubricsWithAI,
  isAiNormalizationAvailable,
  parseSuggestions,
} from './aiRubricNormalizer';
export type { AiNormalizeItem, AiRubricSuggestion } from './aiRubricNormalizer';
export {
  proposeRubric,
  listRubricProposals,
  listApprovedRubrics,
  approveRubricProposal,
  rejectRubricProposal,
} from './rubricProposals';
export type { RubricProposal, ProposalStatus, ProposeRubricInput } from './rubricProposals';

export type {
  LabelValuePair,
  RubricMatch,
  ConditionsExtractionResult,
} from './types';

export type { ConditionsExtractionOptions } from './PdfConditionsExtractor';
